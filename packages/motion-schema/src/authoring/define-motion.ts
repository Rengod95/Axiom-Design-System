import {
  CSSGrammarValidator,
  validateTokenBinding,
  type EffectiveCSSPropertyEntry,
} from "@axiom/css-property-profile";
import { createResolvedTokenManifestIndex, digestResolvedTokenManifest, validateTokenDomainType, type ResolvedTokenEntry } from "@axiom/tokens";

import {
  MOTION_DIAGNOSTIC_CODE,
  MOTION_FALLBACK_SOURCE,
  MOTION_IDENTIFIER_MAXIMUM_LENGTH,
  MOTION_IDENTIFIER_PATTERN,
  MOTION_PROFILE_ID,
  MOTION_SCHEMA_VERSION,
  MOTION_SERIALIZER_ID_PATTERN,
  MOTION_TEMPLATE_TOKEN_VARIABLE,
  MOTION_TOKEN_ID_PATTERN,
  MOTION_TRANSITION_TOKEN_DOMAIN,
} from "../constants.js";
import type {
  CSSDeclarationValue,
  CSSValueTemplate,
  MotionIR,
  MotionKeyframe,
  MotionPhase,
  MotionSegment,
  MotionTrack,
  TokenReference,
} from "../generated/reference-contracts.js";
import {
  MotionAuthoringError,
  type DefinedMotion,
  type MotionAuthoringInput,
  type MotionAuthoringPort,
  type MotionDefinition,
  type MotionDiagnostic,
  type MotionKeyframeAuthoring,
  type MotionPhaseAuthoring,
  type MotionTokenSerializer,
  type MotionTrackAuthoring,
  type MotionValue,
} from "./contracts.js";
import { hasValidMotionAuthorityShapes, isClosedAppearanceAuthority } from "./authority-validation.js";

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Captures only JSON-safe authoring values before the normalizer freezes its result. */
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
};

/** Copies already-validated JSON data without retaining caller object identity. */
const cloneJson = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((entry) => cloneJson(entry)) as T;
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.keys(value as object).map((key) => [key, cloneJson((value as Record<string, unknown>)[key])])) as T;
  return value;
};

/** Identifies plain records at the untyped source boundary. */
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Produces a stable Motion diagnostic without exposing CSS-profile internals. */
const diagnostic = (
  code: MotionDiagnostic["code"],
  message: string,
  property?: string,
  tokenId?: string,
  target?: string,
): MotionDiagnostic => ({
  code,
  severity: "error",
  phase: "motionAuthoring",
  message,
  source: MOTION_FALLBACK_SOURCE,
  ...(property === undefined ? {} : { property }),
  ...(tokenId === undefined ? {} : { tokenId }),
  ...(target === undefined ? {} : { target }),
});

/** Builds a warning while retaining the same location shape as validation failures. */
const warning = (code: MotionDiagnostic["code"], message: string, property?: string): MotionDiagnostic => ({
  ...diagnostic(code, message, property),
  severity: "warning",
});

/** Rejects source graphs whose reads could execute code or whose values cannot be serialized as JSON. */
const isSafeJsonData = (value: unknown, seen = new Set<object>()): boolean => {
  if (value === null || ["string", "boolean"].includes(typeof value)) return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) return false;
  if (Array.isArray(value) && (Object.keys(value).length !== value.length || Object.getOwnPropertyNames(value).some((key) => key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key)))) return false;
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const valid = Object.getOwnPropertySymbols(value).length === 0
    && Object.entries(descriptors).every(([key, descriptor]) => (Array.isArray(value) && key === "length") || (descriptor.enumerable && descriptor.get === undefined && descriptor.set === undefined && isSafeJsonData(descriptor.value, seen)));
  seen.delete(value);
  return valid;
};

/** Rejects accessor-backed authority data while allowing explicit executable serializer and digest ports. */
const hasOnlyDataDescriptors = (value: unknown, seen = new Set<object>()): boolean => {
  if (value === null || typeof value !== "object" || seen.has(value)) return true;
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((descriptor) => descriptor.get !== undefined || descriptor.set !== undefined)) return false;
  return Object.values(descriptors).every((descriptor) => hasOnlyDataDescriptors(descriptor.value, seen));
};

/** Checks the exact closed-key rule used by every N16 source object decoder. */
const hasExactKeys = (value: UnknownRecord, required: readonly string[], optional: readonly string[] = []): boolean => {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.getOwnPropertyNames(value).every((key) => allowed.has(key));
};

/** Validates the common identifier grammar without inferring Recipe applicability. */
const isIdentifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= MOTION_IDENTIFIER_MAXIMUM_LENGTH && MOTION_IDENTIFIER_PATTERN.test(value);

/** Constructs a closed Token reference instead of forwarding user-supplied object identity. */
const decodeToken = (value: unknown): TokenReference | undefined =>
  isRecord(value) && hasExactKeys(value, ["kind", "path"]) && value["kind"] === "token" && typeof value["path"] === "string" && MOTION_TOKEN_ID_PATTERN.test(value["path"])
    ? { kind: "token", path: value["path"] }
    : undefined;

/** Constructs one closed CSS value and makes templates require at least one Token part. */
const decodeValue = (value: unknown): CSSDeclarationValue | undefined => {
  if (typeof value === "string" && /\S/.test(value)) return { kind: "css", value };
  if (isRecord(value) && hasExactKeys(value, ["kind", "value"]) && value["kind"] === "css" && typeof value["value"] === "string" && /\S/.test(value["value"])) return { kind: "css", value: value["value"] };
  const token = decodeToken(value); if (token !== undefined) return token;
  if (!isRecord(value) || !hasExactKeys(value, ["kind", "parts"]) || value["kind"] !== "css-template" || !Array.isArray(value["parts"]) || value["parts"].length === 0) return undefined;
  const parts = value["parts"].map((part) => typeof part === "string" ? part : decodeToken(part));
  return parts.some((part) => part === undefined) || !parts.some((part) => isTokenReference(part)) ? undefined : { kind: "css-template", parts: parts as unknown as CSSValueTemplate["parts"] };
};

/** Decodes and bounds one closed N16 segment position. */
const decodeAt = (value: unknown): MotionSegment["at"] | undefined => {
  if (!isRecord(value) || typeof value["kind"] !== "string") return undefined;
  if (value["kind"] === "afterPrevious" && hasExactKeys(value, ["kind"])) return { kind: "afterPrevious" };
  if ((value["kind"] === "absolute" || value["kind"] === "overlapPrevious") && hasExactKeys(value, ["kind", "seconds"]) && typeof value["seconds"] === "number" && Number.isFinite(value["seconds"]) && (value["kind"] === "absolute" ? value["seconds"] >= 0 : value["seconds"] > 0)) return { kind: value["kind"], seconds: value["seconds"] };
  return undefined;
};

/** Decodes a closed transition and applies the spring bounds owned by the N16 schema. */
const decodeTransition = (value: unknown): MotionSegment["transition"] | undefined => {
  if (!isRecord(value) || typeof value["type"] !== "string") return undefined;
  if (value["type"] === "tween" && hasExactKeys(value, ["type", "duration", "easing"], ["delay"])) {
    const duration = decodeToken(value["duration"]); const easing = decodeToken(value["easing"]); const delay = value["delay"] === undefined ? undefined : decodeToken(value["delay"]);
    return duration === undefined || easing === undefined || (value["delay"] !== undefined && delay === undefined) ? undefined : { type: "tween", duration, easing, ...(delay === undefined ? {} : { delay }) };
  }
  if (value["type"] !== "spring" || !hasExactKeys(value, ["type"], ["duration", "bounce", "stiffness", "damping", "mass"])) return undefined;
  const duration = value["duration"] === undefined ? undefined : decodeToken(value["duration"]); const bounce = value["bounce"]; const forces = [value["stiffness"], value["damping"], value["mass"]];
  if ((value["duration"] !== undefined && duration === undefined) || (bounce !== undefined && (typeof bounce !== "number" || !Number.isFinite(bounce) || bounce < 0 || bounce > 1)) || forces.some((item) => item !== undefined && (typeof item !== "number" || !Number.isFinite(item) || item <= 0))) return undefined;
  return { type: "spring", ...(duration === undefined ? {} : { duration }), ...(bounce === undefined ? {} : { bounce }), ...(value["stiffness"] === undefined ? {} : { stiffness: value["stiffness"] as number }), ...(value["damping"] === undefined ? {} : { damping: value["damping"] as number }), ...(value["mass"] === undefined ? {} : { mass: value["mass"] as number }) };
};

/** Decodes shorthand or explicit keyframes into exact offset-bearing values. */
const decodeKeyframes = (value: unknown): readonly MotionKeyframe[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const explicit = value.every((entry) => isRecord(entry) && hasExactKeys(entry, ["offset", "value"]));
  if (!explicit && value.some((entry) => isRecord(entry) && Object.hasOwn(entry, "offset"))) return undefined;
  if (!explicit && value.length !== 2) return undefined;
  const entries = explicit ? value.map((entry) => ({ offset: (entry as UnknownRecord)["offset"], value: (entry as UnknownRecord)["value"] })) : value.map((entry, index) => ({ offset: index, value: entry }));
  const result = entries.map((entry) => typeof entry.offset === "number" && Number.isFinite(entry.offset) ? { offset: entry.offset, value: decodeValue(entry.value) } : undefined);
  if (result.some((entry) => entry?.value === undefined)) return undefined;
  return result.map((entry) => ({ offset: entry!.offset, value: entry!.value! }));
};

/** Decodes one phase in fixed key order and never copies source object members to output. */
const decodePhase = (value: unknown): MotionPhase | undefined => {
  if (!isRecord(value) || typeof value["phase"] !== "string" || !["enter", "exit", "stateChange"].includes(value["phase"]) || !Array.isArray(value["sequence"]) || value["sequence"].length === 0) return undefined;
  const stateChange = value["phase"] === "stateChange";
  if (!hasExactKeys(value, stateChange ? ["phase", "state", "sequence"] : ["phase", "sequence"])) return undefined;
  const sequence = value["sequence"].map((segment) => {
    if (!isRecord(segment) || !hasExactKeys(segment, ["at", "tracks", "transition"]) || !Array.isArray(segment["tracks"]) || segment["tracks"].length === 0) return undefined;
    const at = decodeAt(segment["at"]); const transition = decodeTransition(segment["transition"]);
    const tracks = segment["tracks"].map((track) => isRecord(track) && hasExactKeys(track, ["property", "allowDiscrete", "keyframes"]) && typeof track["property"] === "string" && typeof track["allowDiscrete"] === "boolean" ? { property: track["property"], allowDiscrete: track["allowDiscrete"], keyframes: decodeKeyframes(track["keyframes"]) } : undefined);
    return at === undefined || transition === undefined || tracks.some((track) => track?.keyframes === undefined) ? undefined : { at, transition, tracks: tracks.map((track) => ({ property: track!.property, allowDiscrete: track!.allowDiscrete, keyframes: track!.keyframes! })) };
  });
  if (sequence.some((segment) => segment === undefined)) return undefined;
  if (!stateChange) return { phase: value["phase"] as "enter" | "exit", sequence: sequence as unknown as MotionPhase["sequence"] };
  const state = value["state"];
  if (!isRecord(state) || !hasExactKeys(state, ["name", "from", "to"]) || !isIdentifier(state["name"]) || !["boolean", "string"].includes(typeof state["from"]) || !["boolean", "string"].includes(typeof state["to"]) || (typeof state["from"] === "string" && !isIdentifier(state["from"])) || (typeof state["to"] === "string" && !isIdentifier(state["to"]))) return undefined;
  return { phase: "stateChange", state: { name: state["name"], from: state["from"] as boolean | string, to: state["to"] as boolean | string }, sequence: sequence as unknown as MotionPhase["sequence"] };
};

/** Decodes the entire source object before semantic validation, including reduced-motion ownership. */
const decodeDefinition = (value: unknown): MotionDefinition | undefined => {
  if (!isSafeJsonData(value) || !isRecord(value) || !hasExactKeys(value, ["id", "recipeId", "slot", "phases", "reducedMotion"]) || !isIdentifier(value["id"]) || !isIdentifier(value["recipeId"]) || !isIdentifier(value["slot"]) || !Array.isArray(value["phases"]) || value["phases"].length === 0 || !isRecord(value["reducedMotion"])) return undefined;
  const phases = value["phases"].map(decodePhase); if (phases.some((phase) => phase === undefined)) return undefined;
  const reduced = value["reducedMotion"];
  if (reduced["strategy"] === "disable" && hasExactKeys(reduced, ["strategy"])) return { id: value["id"], recipeId: value["recipeId"], slot: value["slot"], phases: phases as unknown as MotionDefinition["phases"], reducedMotion: { strategy: "disable" } };
  if (reduced["strategy"] !== "replace" || !hasExactKeys(reduced, ["strategy", "phases"]) || !Array.isArray(reduced["phases"]) || reduced["phases"].length === 0) return undefined;
  const replacements = reduced["phases"].map(decodePhase); if (replacements.some((phase) => phase === undefined)) return undefined;
  return { id: value["id"], recipeId: value["recipeId"], slot: value["slot"], phases: phases as unknown as MotionDefinition["phases"], reducedMotion: { strategy: "replace", phases: replacements as unknown as MotionDefinition["phases"] } };
};

/** Distinguishes the governed required reduced-motion failure from other closed-source failures. */
const hasInvalidReducedMotion = (value: unknown): boolean =>
  isSafeJsonData(value) && isRecord(value) && (() => {
    const reduced = value["reducedMotion"];
    if (!isRecord(reduced)) return true;
    if (reduced["strategy"] === "disable") return !hasExactKeys(reduced, ["strategy"]);
    return reduced["strategy"] !== "replace"
      || !hasExactKeys(reduced, ["strategy", "phases"])
      || !Array.isArray(reduced["phases"])
      || reduced["phases"].length === 0
      || reduced["phases"].some((phase) => decodePhase(phase) === undefined);
  })();

/** Preserves a direct Token reference only when it has the closed serialized shape. */
const isTokenReference = (value: unknown): value is TokenReference =>
  isRecord(value) && value["kind"] === "token" && typeof value["path"] === "string";

/** Retains a CSS template only when every part is source-safe CSS or a Token reference. */
const isTemplate = (value: unknown): value is CSSValueTemplate =>
  isRecord(value) && value["kind"] === "css-template" && Array.isArray(value["parts"])
    && value["parts"].length > 0 && value["parts"].every((part) => typeof part === "string" || isTokenReference(part));

/** Converts the documented raw CSS convenience form into the closed N16 declaration value. */
const normalizeValue = (value: MotionValue): CSSDeclarationValue | undefined => {
  if (typeof value === "string") return { kind: "css", value };
  if (isTokenReference(value) || isTemplate(value)) return value;
  if (isRecord(value) && value.kind === "css" && typeof value.value === "string") {
    return { kind: "css", value: value.value };
  }
  return undefined;
};

/** Extracts all direct or templated Token references in serialized order. */
const referencesIn = (value: CSSDeclarationValue): readonly TokenReference[] => {
  if (isTokenReference(value)) return [value];
  if (!isTemplate(value)) return [];
  return value.parts.flatMap((part) => isTokenReference(part) ? [part] : []);
};

/** Renders a template with a synthetic CSS variable so grammar checks do not resolve Tokens. */
const grammarValue = (value: CSSDeclarationValue): string | undefined => {
  if (isRecord(value) && value.kind === "css" && typeof value.value === "string") return value.value;
  if (isTemplate(value)) return value.parts.map((part) => typeof part === "string" ? part : MOTION_TEMPLATE_TOKEN_VARIABLE).join("");
  return undefined;
};

/** Finds a property by its canonical profile name without accepting aliases as motion shorthands. */
const propertyFor = (
  input: MotionAuthoringInput,
  propertyName: string,
): EffectiveCSSPropertyEntry | undefined =>
  input.propertyRegistry.properties.find((entry) => entry.name === propertyName);

/** Validates one referenced Token in every resolved context and returns its stable identity. */
const resolveToken = (
  input: MotionAuthoringInput,
  reference: TokenReference,
): { readonly entries: readonly ResolvedTokenEntry[]; readonly domain: string; readonly dtcgType: string } | undefined => {
  const index = createResolvedTokenManifestIndex(input.resolvedTokenManifest);
  if (index.diagnostics.length > 0) return undefined;
  const indexed = index.find(reference.path);
  const first = indexed?.entries[0];
  if (indexed === undefined || first === undefined || indexed.entries.length !== input.resolvedTokenManifest.contexts.length) return undefined;
  if (indexed.entries.some((entry) => entry.domain !== first.domain || entry.dtcgType !== first.dtcgType)) return undefined;
  if (validateTokenDomainType({ id: reference.path, domain: first.domain, tier: first.tier }, first.dtcgType, input.tokenDomainRegistry.domains).length > 0) return undefined;
  return { entries: indexed.entries, domain: first.domain, dtcgType: first.dtcgType };
};

/** Selects a registered Token serializer when a direct Token must satisfy property grammar in every context. */
const serializerFor = (
  input: MotionAuthoringInput,
  domain: string,
): MotionTokenSerializer | undefined => {
  const domainDefinition = input.tokenDomainRegistry.domains.find((entry) => entry.id === domain && entry.root === domain);
  return input.serializers.find((serializer) => domainDefinition?.cssSerializers.includes(serializer.id));
};

/** Maps public CSS-profile token policy diagnostics into stable N16 Motion diagnostics. */
const mapBindingDiagnostic = (message: string, property: string): MotionDiagnostic =>
  diagnostic(MOTION_DIAGNOSTIC_CODE.TOKEN_BINDING_MISMATCH, message, property);

/** Validates one keyframe value's kind, grammar, and all direct/template Token bindings. */
const validateValue = (
  input: MotionAuthoringInput,
  grammar: CSSGrammarValidator,
  property: EffectiveCSSPropertyEntry,
  value: CSSDeclarationValue,
): readonly MotionDiagnostic[] => {
  const diagnostics: MotionDiagnostic[] = [];
  const allowedKind = value.kind === "css" ? "css" : value.kind === "token" ? "token" : "css-template";
  if (!property.policy.valueKinds.includes(allowedKind)) {
    diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_VALUE_KIND, `Property '${property.name}' does not allow '${allowedKind}' Motion values.`, property.name));
    return diagnostics;
  }
  const rendered = grammarValue(value);
  if (rendered !== undefined) {
    const grammarResult = grammar.validate(property.name, rendered);
    if (!grammarResult.valid) diagnostics.push(...grammarResult.diagnostics.map((item) => diagnostic(MOTION_DIAGNOSTIC_CODE.GRAMMAR_MISMATCH, item.message, property.name)));
  }
  for (const reference of referencesIn(value)) {
    const resolved = resolveToken(input, reference);
    if (resolved === undefined) {
      diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.TOKEN_DOMAIN_MISMATCH, `Token '${reference.path}' must resolve with one identity in every context.`, property.name, reference.path));
      continue;
    }
    const mode = value.kind === "token" ? "direct" : "template";
    const binding = validateTokenBinding(input.propertyRegistry, { property: property.name, mode, domain: resolved.domain });
    diagnostics.push(...binding.map((item) => mapBindingDiagnostic(item.message, property.name)));
    if (value.kind === "token") {
      const serializer = serializerFor(input, resolved.domain);
      if (serializer === undefined) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.TOKEN_DOMAIN_MISMATCH, `Token '${reference.path}' has no registered CSS serializer.`, property.name, reference.path));
      else for (const entry of resolved.entries) {
        let serialized: string;
        try { serialized = serializer.serialize(entry); } catch { diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORITY, "Motion Token serializer threw while validating a direct Token.", property.name, reference.path)); continue; }
        const result = grammar.validate(property.name, serialized);
        if (!result.valid) diagnostics.push(...result.diagnostics.map((item) => diagnostic(MOTION_DIAGNOSTIC_CODE.GRAMMAR_MISMATCH, item.message, property.name, reference.path)));
      }
    }
  }
  return diagnostics;
};

/** Validates and expands a source keyframe union into exact offset-bearing Motion keyframes. */
const normalizeKeyframes = (
  input: MotionAuthoringInput,
  grammar: CSSGrammarValidator,
  track: MotionTrackAuthoring,
  property: EffectiveCSSPropertyEntry,
): { readonly keyframes: readonly MotionKeyframe[]; readonly diagnostics: readonly MotionDiagnostic[] } => {
  const entries = track.keyframes as readonly unknown[];
  const explicit = entries.every((entry) => isRecord(entry) && typeof entry["offset"] === "number" && "value" in entry);
  const shorthand = entries.every((entry) => !isRecord(entry) || !("offset" in entry));
  const diagnostics: MotionDiagnostic[] = [];
  if (!explicit && !shorthand) return { keyframes: [], diagnostics: [diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_KEYFRAME_OFFSET, "Motion keyframes cannot mix shorthand values and explicit offsets.", property.name)] };
  if (shorthand && entries.length !== 2) return { keyframes: [], diagnostics: [diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_KEYFRAME_OFFSET, "Motion shorthand requires exactly two values.", property.name)] };
  if (explicit && entries.length < 3) return { keyframes: [], diagnostics: [diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_KEYFRAME_OFFSET, "Explicit Motion keyframes require at least three offsets.", property.name)] };
  const normalized = (explicit
    ? entries.map((entry) => ({ offset: (entry as MotionKeyframeAuthoring).offset, value: (entry as MotionKeyframeAuthoring).value }))
    : entries.map((entry, index) => ({ offset: index, value: entry as MotionValue })))
    .map((entry) => ({ offset: entry.offset, value: normalizeValue(entry.value) }));
  for (let index = 0; index < normalized.length; index += 1) {
    const entry = normalized[index];
    const previous = normalized[index - 1];
    if (entry?.value === undefined || !Number.isFinite(entry.offset) || entry.offset < 0 || entry.offset > 1 || (previous !== undefined && previous.offset >= entry.offset)) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_KEYFRAME_OFFSET, "Motion offsets must be finite, strictly ascending values in [0, 1].", property.name));
  }
  if (normalized[0]?.offset !== 0 || normalized.at(-1)?.offset !== 1) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_KEYFRAME_OFFSET, "Motion keyframes must start at offset 0 and end at offset 1.", property.name));
  for (const entry of normalized) if (entry?.value !== undefined) diagnostics.push(...validateValue(input, grammar, property, entry.value));
  return { keyframes: normalized.filter((entry): entry is MotionKeyframe => entry.value !== undefined), diagnostics };
};

/** Validates timing Token identities without resolving the references placed in Motion IR. */
const validateTransition = (input: MotionAuthoringInput, transition: MotionSegment["transition"]): readonly MotionDiagnostic[] => {
  const references: Array<[TokenReference, string]> = [];
  if (transition.type === "tween") {
    references.push([transition.duration, MOTION_TRANSITION_TOKEN_DOMAIN.DURATION]);
    references.push([transition.easing, MOTION_TRANSITION_TOKEN_DOMAIN.EASING]);
    if (transition.delay !== undefined) references.push([transition.delay, MOTION_TRANSITION_TOKEN_DOMAIN.DURATION]);
  } else if (transition.duration !== undefined) references.push([transition.duration, MOTION_TRANSITION_TOKEN_DOMAIN.DURATION]);
  const diagnostics: MotionDiagnostic[] = [];
  for (const [reference, expectedDomain] of references) {
    const resolved = resolveToken(input, reference);
    if (resolved === undefined || resolved.domain !== expectedDomain) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.TOKEN_DOMAIN_MISMATCH, `Transition Token '${reference.path}' must use the '${expectedDomain}' Domain.`, undefined, reference.path));
  }
  if (transition.type === "spring" && ((transition.bounce !== undefined && (!Number.isFinite(transition.bounce) || transition.bounce < 0 || transition.bounce > 1)) || [transition.stiffness, transition.damping, transition.mass].some((value) => value !== undefined && (!Number.isFinite(value) || value <= 0)))) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORING_SHAPE, "Spring values violate the N16 finite bounce or positive physics bounds."));
  return diagnostics;
};

/** Validates a state transition against the supplied canonical registry rather than lifecycle aliases. */
const validateState = (input: MotionAuthoringInput, phase: MotionPhaseAuthoring): readonly MotionDiagnostic[] => {
  if (phase.phase !== "stateChange") return [];
  const state = input.canonicalStateRegistry.states.find((entry) => entry.id === phase.state.name);
  if (state === undefined || state.axis !== "state" || !state.usage.includes("motion")) return [diagnostic(MOTION_DIAGNOSTIC_CODE.UNKNOWN_STATE, `Motion state '${phase.state.name}' is not a registered motion state.`)];
  const valid = state.valueType === "boolean"
    ? typeof phase.state.from === "boolean" && typeof phase.state.to === "boolean"
    : state.values?.includes(phase.state.from as never) === true && state.values?.includes(phase.state.to as never) === true;
  return valid ? [] : [diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_STATE_VALUE, `Motion state '${state.id}' has invalid from/to values.`)];
};

/** Normalizes one ordered source phase and retains any non-fatal capability warnings. */
const normalizePhase = (
  input: MotionAuthoringInput,
  grammar: CSSGrammarValidator,
  phase: MotionPhaseAuthoring,
): { readonly phase: MotionPhase; readonly diagnostics: readonly MotionDiagnostic[] } => {
  const diagnostics = [...validateState(input, phase)];
  const sequence: MotionSegment[] = [];
  for (const sourceSegment of phase.sequence) {
    const tracks: MotionTrack[] = [];
    for (const sourceTrack of sourceSegment.tracks) {
      const property = propertyFor(input, sourceTrack.property);
      if (property === undefined) { diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY, `Unknown Motion property '${sourceTrack.property}'.`, sourceTrack.property)); continue; }
      if (property.policy.motion === "not-animatable") { diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.NOT_ANIMATABLE, `Property '${property.name}' is not animatable.`, property.name)); continue; }
      if (property.policy.motion === "discrete" && !sourceTrack.allowDiscrete) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.DISCRETE_OPT_IN_REQUIRED, `Discrete property '${property.name}' requires allowDiscrete: true.`, property.name));
      if (property.policy.motion === "discrete" && sourceTrack.allowDiscrete) diagnostics.push(warning(MOTION_DIAGNOSTIC_CODE.DISCRETE_OPT_IN_ACCEPTED, `Discrete property '${property.name}' accepted explicit opt-in.`, property.name));
      if (property.policy.motion === "unknown") diagnostics.push(warning(MOTION_DIAGNOSTIC_CODE.UNKNOWN_CAPABILITY, `Property '${property.name}' requires backend capability validation.`, property.name));
      const keyframes = normalizeKeyframes(input, grammar, sourceTrack, property);
      diagnostics.push(...keyframes.diagnostics);
      if (keyframes.keyframes.length >= 2) tracks.push({ property: property.name, allowDiscrete: sourceTrack.allowDiscrete, keyframes: keyframes.keyframes as unknown as MotionTrack["keyframes"] });
    }
    diagnostics.push(...validateTransition(input, sourceSegment.transition));
    if (tracks.length > 0) sequence.push({ at: sourceSegment.at, tracks: tracks as unknown as MotionSegment["tracks"], transition: sourceSegment.transition });
  }
  const normalized = phase.phase === "stateChange"
    ? { phase: phase.phase, state: phase.state, sequence: sequence as unknown as MotionPhase["sequence"] }
    : { phase: phase.phase, sequence: sequence as unknown as MotionPhase["sequence"] };
  return { phase: normalized as MotionPhase, diagnostics };
};

/** Validates every closed authority and its digest before Motion reads any registry semantics. */
const validateAuthority = (input: MotionAuthoringInput): readonly MotionDiagnostic[] => {
  const diagnostics: MotionDiagnostic[] = [];
  const isDigest = (value: string): boolean => /^sha256:[a-f0-9]{64}$/.test(value);
  const safeAuthorities = isSafeJsonData(input.propertyRegistry)
    && isSafeJsonData(input.resolvedTokenManifest)
    && isSafeJsonData(input.tokenDomainRegistry)
    && isSafeJsonData(input.canonicalStateRegistry)
    && isSafeJsonData(input.conditionRegistry)
    && isSafeJsonData(input.appearance)
    && isSafeJsonData(input.expectedDigests);
  const shapesValid = safeAuthorities && hasValidMotionAuthorityShapes(input);
  let portValid = false;
  try {
    const authorityValues = {
      propertyRegistry: input.propertyRegistry,
      resolvedTokenManifest: input.resolvedTokenManifest,
      tokenDomainRegistry: input.tokenDomainRegistry,
      canonicalStateRegistry: input.canonicalStateRegistry,
      conditionRegistry: input.conditionRegistry,
      appearance: input.appearance,
    } as const;
    portValid = input.authorityValidation.validateBundle(authorityValues).length === 0;
  } catch {
    portValid = false;
  }
  const serializersValid = Array.isArray(input.serializers)
    && hasOnlyDataDescriptors(input.serializers)
    && input.serializers.every((serializer) => isRecord(serializer) && typeof serializer["id"] === "string" && MOTION_SERIALIZER_ID_PATTERN.test(serializer["id"]) && typeof serializer["serialize"] === "function")
    && new Set(input.serializers.map((serializer) => serializer.id)).size === input.serializers.length;
  if (!shapesValid || !portValid || !serializersValid) return [diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORITY, "Motion registries, manifest, Appearance, and serializers must be closed schema-valid authority data before digest comparison.")];
  const digestsValid = isRecord(input.expectedDigests) && Object.values(input.expectedDigests).every((value) => typeof value === "string" && isDigest(value));
  if (!digestsValid) return [diagnostic(MOTION_DIAGNOSTIC_CODE.PROFILE_MISMATCH, "Motion expected authority digests must use the canonical sha256 format.")];
  if (input.appearance.profile !== input.propertyRegistry.profile.id || input.appearance.profileInputDigest !== input.expectedDigests.profileInputDigest) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.APPEARANCE_APPLICABILITY_MISMATCH, "N22 Appearance profile identity must match the exact Motion profile authority."));
  if (input.propertyRegistry.profile.id !== MOTION_PROFILE_ID || input.propertyRegistry.profile.webrefInputDigest !== input.expectedDigests.profileInputDigest) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.PROFILE_MISMATCH, "Motion profile identity or input digest does not match the expected context."));
  try {
    const actual = {
      effectivePropertyRegistry: input.canonicalDigest.digestCanonicalJson(input.propertyRegistry as never),
      resolvedTokenManifest: digestResolvedTokenManifest(input.resolvedTokenManifest, input.canonicalDigest),
      tokenDomainRegistry: input.canonicalDigest.digestCanonicalJson(input.tokenDomainRegistry as never),
      canonicalStateRegistry: input.canonicalDigest.digestCanonicalJson(input.canonicalStateRegistry as never),
      conditionRegistryDigest: input.canonicalDigest.digestCanonicalJson(input.conditionRegistry as never),
    };
    if (Object.entries(actual).some(([key, value]) => value !== input.expectedDigests[key as keyof typeof actual])) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORITY, "Motion authority digest does not match the exact supplied input."));
    if (input.canonicalDigest.digestCanonicalJson(input.appearance) !== input.expectedDigests.appearanceIR) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.APPEARANCE_APPLICABILITY_MISMATCH, "N22 Appearance digest does not match the exact supplied artifact."));
    if (!isDigest(input.expectedDigests.conditionRegistryDigest) || input.canonicalDigest.digestCanonicalJson(input.conditionRegistry as never) !== input.expectedDigests.conditionRegistryDigest) diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.CONDITION_DIGEST_MISMATCH, "Condition Registry digest does not match the exact supplied registry."));
  } catch {
    diagnostics.push(diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORITY, "Motion canonical digest port rejected a validated authority."));
  }
  return diagnostics;
};

/** Checks source Recipe and Slot identity only after the N22 artifact itself has been authenticated. */
const validateAppearanceApplicability = (
  input: MotionAuthoringInput,
  definition: MotionDefinition,
): readonly MotionDiagnostic[] =>
  isClosedAppearanceAuthority(input.appearance, input.canonicalStateRegistry, input.conditionRegistry)
  && input.appearance.recipeId === definition.recipeId
  && input.appearance.slots.includes(definition.slot)
    ? []
    : [diagnostic(
      MOTION_DIAGNOSTIC_CODE.APPEARANCE_APPLICABILITY_MISMATCH,
      `Motion Recipe '${definition.recipeId}' and Slot '${definition.slot}' must be present in the authenticated N22 Appearance artifact.`,
      undefined,
      undefined,
      `${definition.recipeId}/${definition.slot}`,
    )];

/** Returns a literal-preserving frozen source value without assigning compiler provenance. */
export const defineMotion = <const TDefinition extends MotionDefinition>(definition: TDefinition): TDefinition => {
  const decoded = decodeDefinition(definition);
  const invalidIdentifier = isSafeJsonData(definition) && isRecord(definition) && ([definition["id"], definition["recipeId"], definition["slot"]].some((value) => !isIdentifier(value)));
  if (decoded === undefined) throw new MotionAuthoringError(deepFreeze([diagnostic(hasInvalidReducedMotion(definition) ? MOTION_DIAGNOSTIC_CODE.REDUCED_MOTION_INVALID : invalidIdentifier ? MOTION_DIAGNOSTIC_CODE.INVALID_IDENTIFIER : MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORING_SHAPE, "Motion source must be closed JSON-safe data matching the N23 authoring contract.")]));
  return deepFreeze(cloneJson(definition));
};

/** Binds explicit authorities to deterministic N16 Motion normalization without runtime/backend imports. */
export const createMotionAuthoring = (input: MotionAuthoringInput): MotionAuthoringPort => {
  if (!hasOnlyDataDescriptors(input)) throw new MotionAuthoringError([diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORITY, "Motion authoring authorities cannot use accessors.")]);
  const rawAuthorities = {
    propertyRegistry: input.propertyRegistry,
    resolvedTokenManifest: input.resolvedTokenManifest,
    tokenDomainRegistry: input.tokenDomainRegistry,
    canonicalStateRegistry: input.canonicalStateRegistry,
    conditionRegistry: input.conditionRegistry,
    appearance: input.appearance,
    expectedDigests: input.expectedDigests,
  };
  if (!isSafeJsonData(rawAuthorities)) throw new MotionAuthoringError([diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORITY, "Motion authoring authorities must be closed JSON-safe data.")]);
  const authorities = deepFreeze(cloneJson(rawAuthorities));
  const capturedInput = Object.freeze({ ...input, ...authorities }) as MotionAuthoringInput;
  return Object.freeze({
  /** Validates one frozen source definition and returns exact N16 IR plus retained warnings. */
  defineMotion<const TDefinition extends MotionDefinition>(definition: TDefinition): DefinedMotion<TDefinition> {
    try {
    const captured = defineMotion(definition);
    const diagnostics = [...validateAuthority(capturedInput)];
    if (diagnostics.some((entry) => entry.severity === "error")) throw new MotionAuthoringError(deepFreeze(diagnostics));
    diagnostics.push(...validateAppearanceApplicability(capturedInput, captured));
    const grammar = new CSSGrammarValidator(capturedInput.propertyRegistry, { allowCustomPropertyReferences: true });
    const primary = captured.phases.map((phase) => normalizePhase(capturedInput, grammar, phase));
    diagnostics.push(...primary.flatMap((entry) => entry.diagnostics));
    const reducedResults = captured.reducedMotion.strategy === "disable" ? [] : captured.reducedMotion.phases.map((phase) => normalizePhase(capturedInput, grammar, phase));
    const reduced = captured.reducedMotion.strategy === "disable" ? { strategy: "disable" as const } : { strategy: "replace" as const, phases: reducedResults.map((entry) => entry.phase) };
    diagnostics.push(...reducedResults.flatMap((entry) => entry.diagnostics));
    if (diagnostics.some((entry) => entry.severity === "error")) throw new MotionAuthoringError(deepFreeze(diagnostics));
    const motion: MotionIR = deepFreeze({ schemaVersion: MOTION_SCHEMA_VERSION, profile: MOTION_PROFILE_ID, profileInputDigest: capturedInput.expectedDigests.profileInputDigest, conditionRegistryDigest: capturedInput.expectedDigests.conditionRegistryDigest, id: captured.id, recipeId: captured.recipeId, slot: captured.slot, phases: primary.map((entry) => entry.phase) as unknown as MotionIR["phases"], reducedMotion: reduced as MotionIR["reducedMotion"] });
    return deepFreeze({ definition: captured, motion, diagnostics });
    } catch (error) {
      if (error instanceof MotionAuthoringError) throw error;
      throw new MotionAuthoringError([diagnostic(MOTION_DIAGNOSTIC_CODE.INVALID_AUTHORITY, "Motion authoring authority validation failed.")], { cause: error });
    }
  },
  });
};
