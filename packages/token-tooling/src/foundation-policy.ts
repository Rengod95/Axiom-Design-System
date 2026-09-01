import type {
  ParsedDtcgDocument,
  ParsedDtcgToken,
  ResolvedTokenManifest,
  TokenJsonValue,
} from "@axiom/tokens";

import {
  FOUNDATION_POLICY_DIAGNOSTIC_CODE,
  FOUNDATION_POLICY_ERROR_MESSAGE,
} from "./constants.js";

export interface FoundationColorScale {
  readonly palette: string;
  readonly shades: readonly number[];
}

export interface FoundationScaleStep {
  readonly name: string;
  readonly valuePx: number;
}

export interface FoundationTypographyFamily {
  readonly path: string;
  readonly sizePx: number;
}

export interface FoundationContrastPair {
  readonly foreground: string;
  readonly background: string;
  readonly minimumRatio: number;
}

export interface FoundationTokenPolicy {
  readonly schemaVersion: "0.1";
  readonly rootFontSizePx: number;
  readonly authoredDimensionUnits: readonly string[];
  readonly derivedCssUnits: readonly string[];
  readonly forbiddenPrimitiveSegments: readonly string[];
  readonly colorScales: readonly FoundationColorScale[];
  readonly spaceScale: {
    readonly baseUnitPx: number;
    readonly steps: readonly FoundationScaleStep[];
  };
  readonly dimensionDomainUnits: Readonly<Record<string, readonly string[]>>;
  readonly typography: {
    readonly bodyBasePx: number;
    readonly bodyMinimumPx: number;
    readonly fontSizePx: readonly number[];
    readonly weightVariants: Readonly<Record<string, number>>;
    readonly families: readonly FoundationTypographyFamily[];
  };
  readonly contrastPairs: readonly FoundationContrastPair[];
}

export interface FoundationPolicyDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly tokenId?: string;
  readonly context?: Readonly<Record<string, string>>;
}

export class TokenFoundationPolicyError extends Error {
  readonly diagnostics: readonly FoundationPolicyDiagnostic[];

  constructor(diagnostics: readonly FoundationPolicyDiagnostic[]) {
    super(FOUNDATION_POLICY_ERROR_MESSAGE);
    this.name = "TokenFoundationPolicyError";
    this.diagnostics = diagnostics;
  }
}

const isRecord = (
  value: TokenJsonValue,
): value is Readonly<Record<string, TokenJsonValue>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const tokenMap = (
  document: ParsedDtcgDocument,
): ReadonlyMap<string, ParsedDtcgToken> =>
  new Map(document.tokens.map((token) => [token.id, token]));

const closeTo = (left: number, right: number): boolean =>
  Math.abs(left - right) <= Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right));

const dimension = (
  token: ParsedDtcgToken | undefined,
): { readonly value: number; readonly unit: string } | undefined => {
  if (token?.dtcgType !== "dimension" || !isRecord(token.value)) return undefined;
  const value = token.value["value"];
  const unit = token.value["unit"];
  return typeof value === "number" && typeof unit === "string" ? { value, unit } : undefined;
};

const pushMissing = (
  diagnostics: FoundationPolicyDiagnostic[],
  tokenId: string,
): void => {
  diagnostics.push({
    code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.MISSING_REQUIRED_TOKEN,
    message: `Required foundation Token '${tokenId}' is missing.`,
    tokenId,
  });
};

const validatePrimitiveNames = (
  document: ParsedDtcgDocument,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const forbidden = new Set(policy.forbiddenPrimitiveSegments);
  return document.tokens.flatMap((token) => {
    if (token.tier !== "primitive") return [];
    const segment = token.id.split(".").slice(2).find((entry) => forbidden.has(entry));
    return segment === undefined
      ? []
      : [{
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.SEMANTIC_PRIMITIVE_NAME,
          message: `Primitive Token '${token.id}' contains semantic segment '${segment}'.`,
          tokenId: token.id,
        }];
  });
};

const validateColorScales = (
  tokens: ReadonlyMap<string, ParsedDtcgToken>,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  const required = new Set<string>();
  for (const scale of policy.colorScales) {
    for (const shade of scale.shades) {
      const tokenId = `color.primitive.${scale.palette}.${shade}`;
      required.add(tokenId);
      const token = tokens.get(tokenId);
      if (token === undefined) pushMissing(diagnostics, tokenId);
      else if (token.dtcgType !== "color") {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_SCALE,
          message: `Color scale Token '${tokenId}' must use the DTCG color type.`,
          tokenId,
        });
      }
    }
  }
  for (const token of tokens.values()) {
    if (token.id.startsWith("color.primitive.") && !required.has(token.id)) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_SCALE,
        message: `Color primitive '${token.id}' is outside the registered palette and shade scales.`,
        tokenId: token.id,
      });
    }
  }
  return diagnostics;
};

const validateSpaceScale = (
  tokens: ReadonlyMap<string, ParsedDtcgToken>,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  const required = new Set<string>();
  for (const step of policy.spaceScale.steps) {
    const tokenId = `space.primitive.scale.${step.name}`;
    required.add(tokenId);
    const value = dimension(tokens.get(tokenId));
    if (value === undefined) {
      pushMissing(diagnostics, tokenId);
      continue;
    }
    const valuePx = value.unit === "rem" ? value.value * policy.rootFontSizePx : value.value;
    if (
      !closeTo(valuePx, step.valuePx) ||
      !closeTo(step.valuePx % policy.spaceScale.baseUnitPx, 0)
    ) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SPACE_SCALE,
        message: `Space Token '${tokenId}' must resolve to ${step.valuePx}px on the ${policy.spaceScale.baseUnitPx}px grid.`,
        tokenId,
      });
    }
  }
  for (const token of tokens.values()) {
    if (token.id.startsWith("space.primitive.") && !required.has(token.id)) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SPACE_SCALE,
        message: `Space primitive '${token.id}' is outside the registered scale.`,
        tokenId: token.id,
      });
    }
  }
  return diagnostics;
};

const validateDimensionUnits = (
  document: ParsedDtcgDocument,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  const sourceUnits = new Set(policy.authoredDimensionUnits);
  for (const token of document.tokens) {
    if (token.tier !== "primitive" || token.dtcgType !== "dimension") continue;
    const value = dimension(token);
    if (value === undefined) continue;
    const domainUnits = policy.dimensionDomainUnits[token.domain];
    if (!sourceUnits.has(value.unit) || domainUnits === undefined || !domainUnits.includes(value.unit)) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_DIMENSION_UNIT,
        message: `Primitive Token '${token.id}' cannot use unit '${value.unit}' under its Domain unit policy.`,
        tokenId: token.id,
      });
    }
  }
  return diagnostics;
};

const validateTypography = (
  tokens: ReadonlyMap<string, ParsedDtcgToken>,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  for (const sizePx of policy.typography.fontSizePx) {
    const tokenId = `fontSize.primitive.scale.${sizePx}`;
    const value = dimension(tokens.get(tokenId));
    if (
      value === undefined ||
      value.unit !== "rem" ||
      !closeTo(value.value * policy.rootFontSizePx, sizePx)
    ) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_TYPOGRAPHY_SCALE,
        message: `Font-size Token '${tokenId}' must represent ${sizePx}px as rem.`,
        tokenId,
      });
    }
  }
  for (const [variant, weight] of Object.entries(policy.typography.weightVariants)) {
    const tokenId = `fontWeight.primitive.scale.${weight}`;
    const token = tokens.get(tokenId);
    if (token?.dtcgType !== "fontWeight" || token.value !== weight) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_TYPOGRAPHY_SCALE,
        message: `Weight variant '${variant}' requires '${tokenId}'.`,
        tokenId,
      });
    }
  }
  for (const family of policy.typography.families) {
    for (const variant of Object.keys(policy.typography.weightVariants)) {
      const tokenId = `typography.semantic.${family.path}.${variant}`;
      const token = tokens.get(tokenId);
      if (token === undefined) {
        pushMissing(diagnostics, tokenId);
        continue;
      }
      if (token.dtcgType !== "typography" || !isRecord(token.value)) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_TYPOGRAPHY_SCALE,
          message: `Typography Token '${tokenId}' must be a DTCG typography composite.`,
          tokenId,
        });
        continue;
      }
      const expectedSize = `{fontSize.semantic.${family.path}}`;
      const expectedWeight = `{fontWeight.semantic.${variant}}`;
      if (
        token.value["fontSize"] !== expectedSize ||
        token.value["fontWeight"] !== expectedWeight
      ) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_TYPOGRAPHY_SCALE,
          message: `Typography Token '${tokenId}' must reference its registered size and weight variant.`,
          tokenId,
        });
      }
    }
  }
  if (
    policy.typography.bodyBasePx < policy.typography.bodyMinimumPx ||
    !policy.typography.families.some(
      (entry) => entry.path === "body.base" && entry.sizePx === policy.typography.bodyBasePx,
    ) ||
    !policy.typography.families.some(
      (entry) => entry.path.startsWith("body.") && entry.sizePx === policy.typography.bodyMinimumPx,
    )
  ) {
    diagnostics.push({
      code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_TYPOGRAPHY_SCALE,
      message: "Typography policy must expose the registered body base and minimum sizes.",
    });
  }
  return diagnostics;
};

const colorComponents = (
  value: TokenJsonValue,
): readonly [number, number, number] | undefined => {
  if (!isRecord(value) || value["colorSpace"] !== "srgb" || !Array.isArray(value["components"])) {
    return undefined;
  }
  const components = value["components"];
  if (
    components.length !== 3 ||
    components.some((entry) => typeof entry !== "number")
  ) return undefined;
  return components as unknown as readonly [number, number, number];
};

const channelLuminance = (channel: number): number =>
  channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;

const luminance = (components: readonly [number, number, number]): number =>
  0.2126 * channelLuminance(components[0]) +
  0.7152 * channelLuminance(components[1]) +
  0.0722 * channelLuminance(components[2]);

const contrastRatio = (
  foreground: readonly [number, number, number],
  background: readonly [number, number, number],
): number => {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

const validateContrast = (
  manifest: ResolvedTokenManifest,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  for (const context of manifest.contexts) {
    const tokens = new Map(context.tokens.map((token) => [token.id, token.resolvedValue]));
    for (const pair of policy.contrastPairs) {
      const foreground = colorComponents(tokens.get(pair.foreground) as TokenJsonValue);
      const background = colorComponents(tokens.get(pair.background) as TokenJsonValue);
      if (foreground === undefined || background === undefined) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_CONTRAST,
          message: `Contrast pair '${pair.foreground}' / '${pair.background}' must resolve to sRGB colors.`,
          tokenId: pair.foreground,
          context: context.context,
        });
        continue;
      }
      const ratio = contrastRatio(foreground, background);
      if (ratio < pair.minimumRatio) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_CONTRAST,
          message: `Contrast pair '${pair.foreground}' / '${pair.background}' resolves to ${ratio.toFixed(2)}:1; minimum is ${pair.minimumRatio}:1.`,
          tokenId: pair.foreground,
          context: context.context,
        });
      }
    }
  }
  return diagnostics;
};

export const validateFoundationTokenPolicy = (
  document: ParsedDtcgDocument,
  manifest: ResolvedTokenManifest,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const tokens = tokenMap(document);
  return [
    ...validatePrimitiveNames(document, policy),
    ...validateColorScales(tokens, policy),
    ...validateSpaceScale(tokens, policy),
    ...validateDimensionUnits(document, policy),
    ...validateTypography(tokens, policy),
    ...validateContrast(manifest, policy),
  ];
};

export const assertFoundationTokenPolicy = (
  document: ParsedDtcgDocument,
  manifest: ResolvedTokenManifest,
  policy: FoundationTokenPolicy,
): void => {
  const diagnostics = validateFoundationTokenPolicy(document, manifest, policy);
  if (diagnostics.length > 0) throw new TokenFoundationPolicyError(diagnostics);
};
