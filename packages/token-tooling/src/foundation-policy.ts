import {
  isTokenJsonObject,
  type ParsedDtcgDocument,
  type ParsedDtcgToken,
  type ResolvedTokenManifest,
  type TokenJsonValue,
} from "@axiom/tokens";

import {
  ASPECT_RATIO_DECIMAL_PRECISION,
  FOUNDATION_POLICY_DIAGNOSTIC_CODE,
  FOUNDATION_POLICY_ERROR_MESSAGE,
} from "./constants.js";
import {
  parseSrgbHex,
  validateOklchColorValue,
} from "./oklch-color.js";

export interface FoundationColorScale {
  readonly palette: string;
  readonly shades: readonly number[];
}

export interface FoundationCommonColor {
  readonly name: string;
  readonly hex: string;
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

export interface FoundationAspectRatio {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly origin: "wanted" | "axiom-portrait-inverse" | "axiom-custom";
  readonly description: string;
}

export interface FoundationSemanticVocabulary {
  readonly sizeScale: {
    readonly core: readonly string[];
    readonly extensions: readonly string[];
    readonly excludedLongForms: readonly string[];
  };
  readonly orderedScaleFamilies: readonly {
    readonly path: string;
    readonly coverage: "core";
  }[];
  readonly extendedScaleFamilies: readonly {
    readonly path: string;
    readonly labels: readonly string[];
    readonly rationale: string;
  }[];
  readonly removedPaths: readonly string[];
}

export interface FoundationTokenPolicy {
  readonly schemaVersion: "0.1";
  readonly semanticVocabularyRegistry: "semantic-token-vocabulary";
  readonly colorProfile: {
    readonly canonicalColorSpace: "oklch";
    readonly fallback: "hex";
    readonly gamutMapping: "oklch-chroma-reduction";
    readonly componentPrecision: {
      readonly lightness: number;
      readonly chroma: number;
      readonly hue: number;
    };
  };
  readonly commonColors: readonly FoundationCommonColor[];
  readonly rootFontSizePx: number;
  readonly authoredDimensionUnits: readonly string[];
  readonly derivedCssUnits: readonly string[];
  readonly forbiddenPrimitiveSegments: readonly string[];
  readonly colorScales: readonly FoundationColorScale[];
  readonly aspectRatios: readonly FoundationAspectRatio[];
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

const tokenMap = (
  document: ParsedDtcgDocument,
): ReadonlyMap<string, ParsedDtcgToken> =>
  new Map(document.tokens.map((token) => [token.id, token]));

const closeTo = (left: number, right: number): boolean =>
  Math.abs(left - right) <= Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right));

const dimension = (
  token: ParsedDtcgToken | undefined,
): { readonly value: number; readonly unit: string } | undefined => {
  if (token?.dtcgType !== "dimension" || !isTokenJsonObject(token.value)) return undefined;
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
  for (const commonColor of policy.commonColors) {
    const tokenId = `color.primitive.common.${commonColor.name}`;
    required.add(tokenId);
    const token = tokens.get(tokenId);
    if (token === undefined) {
      pushMissing(diagnostics, tokenId);
      continue;
    }
    if (
      token.dtcgType !== "color" ||
      !isTokenJsonObject(token.value) ||
      token.value["hex"] !== commonColor.hex ||
      token.value["alpha"] !== 1
    ) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_SCALE,
        message: `Common color Token '${tokenId}' must be opaque and use its registered hex fallback '${commonColor.hex}'.`,
        tokenId,
      });
    }
  }
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
      } else if (!isTokenJsonObject(token.value) || token.value["alpha"] !== 1) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_PROFILE,
          message: `Color scale Token '${tokenId}' must be opaque.`,
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

const nestedColorValues = (value: TokenJsonValue): readonly TokenJsonValue[] => {
  if (Array.isArray(value)) return value.flatMap(nestedColorValues);
  if (!isTokenJsonObject(value)) return [];
  if (
    "colorSpace" in value ||
    "components" in value ||
    "hex" in value
  ) return [value];
  return Object.values(value).flatMap(nestedColorValues);
};

const validateColorProfile = (
  document: ParsedDtcgDocument,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  for (const token of document.tokens) {
    for (const color of nestedColorValues(token.value)) {
      const issues = validateOklchColorValue(
        color,
        policy.colorProfile.componentPrecision,
      );
      const profileIssues = issues.filter(
        (issue) => issue !== "invalid-hex" && issue !== "fallback-mismatch",
      );
      const fallbackIssues = issues.filter(
        (issue) => issue === "invalid-hex" || issue === "fallback-mismatch",
      );
      if (profileIssues.length > 0) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_PROFILE,
          message: `Color value in '${token.id}' violates the canonical OKLCH profile: ${profileIssues.join(", ")}.`,
          tokenId: token.id,
        });
      }
      if (fallbackIssues.length > 0) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_FALLBACK,
          message: `Color value in '${token.id}' has an invalid sRGB hex fallback: ${fallbackIssues.join(", ")}.`,
          tokenId: token.id,
        });
      }
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

const semanticFamilyEntries = (
  document: ParsedDtcgDocument,
  familyPath: string,
  allowVariantDescendants: boolean,
): {
  readonly labels: ReadonlySet<string>;
  readonly invalidDescendantIds: readonly string[];
} => {
  const prefix = `${familyPath}.`;
  const labels = new Set<string>();
  const invalidDescendantIds: string[] = [];
  for (const token of document.tokens) {
    if (!token.id.startsWith(prefix)) continue;
    const suffix = token.id.slice(prefix.length);
    const [label, descendant] = suffix.split(".");
    if (label === undefined || label.length === 0) continue;
    if (!allowVariantDescendants && descendant !== undefined) {
      invalidDescendantIds.push(token.id);
      continue;
    }
    labels.add(label);
  }
  return { labels, invalidDescendantIds };
};

const validateSemanticVocabularyCoverage = (
  document: ParsedDtcgDocument,
  vocabulary: FoundationSemanticVocabulary,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  const extendedLabels = new Map(
    vocabulary.extendedScaleFamilies.map((family) => [family.path, family.labels]),
  );
  for (const family of vocabulary.orderedScaleFamilies) {
    const allowed = [
      ...vocabulary.sizeScale.core,
      ...(extendedLabels.get(family.path) ?? []),
    ];
    const { labels: actual, invalidDescendantIds } = semanticFamilyEntries(
      document,
      family.path,
      family.path.startsWith("typography.semantic."),
    );
    for (const tokenId of invalidDescendantIds) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SEMANTIC_SCALE,
        message: `Scalar semantic family '${family.path}' requires exact scale leaves; '${tokenId}' is not a registered leaf.`,
        tokenId,
      });
    }
    for (const label of allowed) {
      if (!actual.has(label)) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SEMANTIC_SCALE,
          message: `Ordered semantic family '${family.path}' is missing required scale label '${label}'.`,
          tokenId: `${family.path}.${label}`,
        });
      }
    }
    for (const label of actual) {
      if (!allowed.includes(label)) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SEMANTIC_SCALE,
          message: `Ordered semantic family '${family.path}' cannot use unregistered scale label '${label}'.`,
          tokenId: `${family.path}.${label}`,
        });
      }
    }
  }
  for (const family of vocabulary.extendedScaleFamilies) {
    const allowed = new Set([
      ...vocabulary.sizeScale.core,
      ...family.labels,
    ]);
    const { labels: actual, invalidDescendantIds } = semanticFamilyEntries(
      document,
      family.path,
      false,
    );
    for (const tokenId of invalidDescendantIds) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SEMANTIC_SCALE,
        message: `Extended semantic family '${family.path}' requires exact scale leaves; '${tokenId}' is not a registered leaf.`,
        tokenId,
      });
    }
    for (const label of actual) {
      if (!allowed.has(label)) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SEMANTIC_SCALE,
          message: `Extended semantic family '${family.path}' cannot use unregistered scale label '${label}'.`,
          tokenId: `${family.path}.${label}`,
        });
      }
    }
    for (const label of family.labels) {
      if (!vocabulary.sizeScale.extensions.includes(label)) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SEMANTIC_SCALE,
          message: `Extended label '${label}' for '${family.path}' is not registered by the semantic size scale.`,
          tokenId: `${family.path}.${label}`,
        });
      } else if (!actual.has(label)) {
        diagnostics.push({
          code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SEMANTIC_SCALE,
          message: `Extended semantic family '${family.path}' is missing registered label '${label}'.`,
          tokenId: `${family.path}.${label}`,
        });
      }
    }
  }
  return diagnostics;
};

const validateRemovedSemanticPaths = (
  documents: readonly ParsedDtcgDocument[],
  vocabulary: FoundationSemanticVocabulary,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  for (const removedPath of vocabulary.removedPaths) {
    for (const document of documents) {
      for (const token of document.tokens) {
        if (token.id === removedPath || token.id.startsWith(`${removedPath}.`)) {
          diagnostics.push({
            code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.REMOVED_SEMANTIC_PATH,
            message: `Removed semantic path '${removedPath}' cannot be authored.`,
            tokenId: token.id,
          });
        }
      }
    }
  }
  return diagnostics;
};

const roundDecimal = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const validateAspectRatios = (
  tokens: ReadonlyMap<string, ParsedDtcgToken>,
  policy: FoundationTokenPolicy,
): readonly FoundationPolicyDiagnostic[] => {
  const diagnostics: FoundationPolicyDiagnostic[] = [];
  const required = new Set<string>();
  for (const ratio of policy.aspectRatios) {
    const tokenId = `aspectRatio.primitive.scale.${ratio.id}`;
    required.add(tokenId);
    const token = tokens.get(tokenId);
    if (token === undefined) {
      pushMissing(diagnostics, tokenId);
      continue;
    }
    const expectedValue = roundDecimal(
      ratio.width / ratio.height,
      ASPECT_RATIO_DECIMAL_PRECISION,
    );
    if (
      token.dtcgType !== "number" ||
      token.value !== expectedValue ||
      token.description !== ratio.description
    ) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_ASPECT_RATIO,
        message: `Aspect-ratio Token '${tokenId}' must equal ${ratio.width}:${ratio.height} (${expectedValue}) and use its registered description.`,
        tokenId,
      });
    }
  }
  for (const token of tokens.values()) {
    if (token.id.startsWith("aspectRatio.primitive.") && !required.has(token.id)) {
      diagnostics.push({
        code: FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_ASPECT_RATIO,
        message: `Aspect-ratio primitive '${token.id}' is outside the registered catalog.`,
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
      if (token.dtcgType !== "typography" || !isTokenJsonObject(token.value)) {
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
      (entry) => entry.path === "body.md" && entry.sizePx === policy.typography.bodyBasePx,
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
  if (
    !isTokenJsonObject(value) ||
    value["colorSpace"] !== "oklch" ||
    value["alpha"] !== 1 ||
    typeof value["hex"] !== "string"
  ) {
    return undefined;
  }
  try {
    return parseSrgbHex(value["hex"]);
  } catch {
    return undefined;
  }
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
          message: `Contrast pair '${pair.foreground}' / '${pair.background}' must resolve to opaque OKLCH colors with valid sRGB hex fallbacks.`,
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
  vocabulary: FoundationSemanticVocabulary,
  contextDocuments: readonly ParsedDtcgDocument[] = [],
): readonly FoundationPolicyDiagnostic[] => {
  const tokens = tokenMap(document);
  return [
    ...validatePrimitiveNames(document, policy),
    ...validateColorScales(tokens, policy),
    ...[document, ...contextDocuments].flatMap((source) =>
      validateColorProfile(source, policy)
    ),
    ...validateSpaceScale(tokens, policy),
    ...validateSemanticVocabularyCoverage(document, vocabulary),
    ...validateRemovedSemanticPaths([document, ...contextDocuments], vocabulary),
    ...validateAspectRatios(tokens, policy),
    ...validateDimensionUnits(document, policy),
    ...validateTypography(tokens, policy),
    ...validateContrast(manifest, policy),
  ];
};

export const assertFoundationTokenPolicy = (
  document: ParsedDtcgDocument,
  manifest: ResolvedTokenManifest,
  policy: FoundationTokenPolicy,
  vocabulary: FoundationSemanticVocabulary,
  contextDocuments: readonly ParsedDtcgDocument[] = [],
): void => {
  const diagnostics = validateFoundationTokenPolicy(
    document,
    manifest,
    policy,
    vocabulary,
    contextDocuments,
  );
  if (diagnostics.length > 0) throw new TokenFoundationPolicyError(diagnostics);
};
