import { readDtcgTokens, putDtcgToken, writeDtcgValue } from "./dtcg-format.ts";
import { resolveFoundationTokens } from "./foundation-resolution.ts";
import { composeFoundationExpressions } from "./foundation-evaluation.ts";
import { foundationPointerValue } from "./foundation-references.ts";
import type { FoundationDocument, FoundationSelection } from "./foundation-contracts.ts";
import type { JsonObject, JsonValue } from "./contracts.ts";
import type { FoundationExchangeExport, FoundationExchangeOptions, FoundationExchangeReport, FoundationTokenType } from "./foundation-contracts.ts";
import { FOUNDATION_CODES, FOUNDATION_TOKEN_TYPES } from "./foundation-constants.ts";
import { FoundationCheck, nonblank, own, pointer, record, stableId } from "./foundation-internal.ts";
import { checkFoundationSnapshot } from "./foundation-validation.ts";
import { canonicalJson, parseJson } from "./canonical-json.ts";
import { KernelError } from "./kernel-error.ts";
import { MAX_DOCUMENT_BYTES } from "./constants.ts";
import { STUDIO_SCHEMA_VERSION, STUDIO_SOURCE_PROFILE } from "./studio-constants.ts";

const EXCHANGE_FORMAT = "dtcg";
const EXCHANGE_VERSION = "2025.10" as const;
const exchangeName = (name: string): boolean => name.length > 0 && !name.startsWith("$") && !/[.{}]/.test(name);
function caught(check: FoundationCheck, error: unknown): void {
  if (error instanceof KernelError) check.error("", error.message, error.code);
  else if (error instanceof Error && error.constructor === Error) check.error("", error.message, FOUNDATION_CODES.EXCHANGE);
  else check.caught(error);
}

/** Group/type inheritance and stable value references; unsupported input is never partially imported. */
export function importDtcgFoundation(text: string, options: FoundationExchangeOptions): FoundationExchangeReport {
  const check = new FoundationCheck("memory:dtcg");
  const result: FoundationExchangeReport = { valid: false, diagnostics: check.diagnostics, originalText: typeof text === "string" ? text : "", formatVersion: EXCHANGE_VERSION };
  try {
    if (typeof text !== "string") { check.error("", "Expected original DTCG JSON text."); return result; }
    const source = check.snapshot(parseJson(text));
    if (!record(source)) { check.error("", "Expected a DTCG token object."); return result; }
    // Services are explicitly supplied by the trusted host, but accessor properties
    // in the option envelope are not executed merely to inspect the input.
    const descriptors = Object.getOwnPropertyDescriptors(options);
    const option = (key: string): unknown => descriptors[key] && "value" in descriptors[key]! ? descriptors[key]!.value : undefined;
    const id = option("id"), name = option("name"), revision = option("revision"), uri = option("sourceUri"), createId = option("createId"), digest = option("digest");
    if (!stableId(id) || !nonblank(name) || !nonblank(revision) || !nonblank(uri) || typeof createId !== "function" || typeof digest !== "function") { check.error("", "Expected valid import identity, source URI and explicit ID/digest services."); return result; }
    const { tokens, groups } = readDtcgTokens(source, createId as () => string, check);
    if (!check.valid) return result;
    const sourceDigest: unknown = digest(text);
    if (typeof sourceDigest !== "string" || !/^[a-f0-9]{64}$/.test(sourceDigest)) { check.error("", "Digest service must return a lowercase SHA-256 digest."); return result; }
    const document: JsonObject = { id, name, kind: "foundation", schemaVersion: STUDIO_SCHEMA_VERSION, revision, studioProfile: { ...STUDIO_SOURCE_PROFILE }, tokens: tokens as unknown as JsonValue, domains: [], tiers: [], themeAxes: [], themeSets: [], policies: [], resolutionOrder: [], originalSources: [{ format: EXCHANGE_FORMAT, formatVersion: EXCHANGE_VERSION, uri, originalText: text, digest: sourceDigest, ...(Object.keys(groups).length ? { groups } : {}) }] };
    if (own(source, "$description")) document.description = source.$description!;
    if (own(source, "$extensions")) document.extensions = source.$extensions!;
    const validated = checkFoundationSnapshot(check.snapshot(document), check);
    if (validated && check.valid) { result.document = validated; result.valid = true; }
  } catch (error) { caught(check, error); }
  return result;
}

/** Authored export preserves aliases and extensions; it refuses themes or unknown data it cannot encode. */
export function exportFoundationDtcg(input: unknown, mode: "original" | "authored" = "authored", sourceRef = "memory:foundation"): FoundationExchangeExport {
  const check = new FoundationCheck(sourceRef);
  const result: FoundationExchangeExport = { valid: false, diagnostics: check.diagnostics, mode };
  try {
    const document = checkFoundationSnapshot(check.snapshot(input), check);
    if (!document) return result;
    if (mode === "original") {
      const originals = document.originalSources.filter(item => record(item) && item.format === EXCHANGE_FORMAT && item.formatVersion === EXCHANGE_VERSION && typeof item.originalText === "string");
      if (originals.length !== 1) check.error("/originalSources", "Choose a unique preserved DTCG source before exporting original bytes.", FOUNDATION_CODES.EXCHANGE);
      else { result.text = (originals[0] as JsonObject).originalText as string; result.valid = true; check.warning("/originalSources", "Original bytes are the imported source, not an export of subsequent ADS edits.", FOUNDATION_CODES.EXCHANGE); }
      return result;
    }
    if (mode !== "authored") { check.error("", "Unknown exchange export mode."); return result; }
    for (const key of ["domains", "tiers", "themeAxes", "themeSets", "policies"]) if ((document[key] as JsonValue[]).length > 0) check.error(pointer("", key), "This authored DTCG subset cannot encode classifications, policies or contextual resolution without loss.", FOUNDATION_CODES.EXCHANGE);
    const allowedDocument = new Set(["id", "name", "kind", "schemaVersion", "revision", "studioProfile", "tokens", "domains", "tiers", "themeAxes", "themeSets", "policies", "resolutionOrder", "originalSources", "description", "extensions"]);
    for (const key of Object.keys(document)) if (!allowedDocument.has(key)) check.error(pointer("", key), "Unknown ADS field has no lossless DTCG mapping.", FOUNDATION_CODES.EXCHANGE);
    const names = new Map<string, string>();
    const used = new Set<string>();
    const output: JsonObject = Object.create(null) as JsonObject;
    for (const token of document.tokens) {
      if (used.has(token.name)) check.error("/tokens", "Authored exchange requires unique DTCG paths.", FOUNDATION_CODES.EXCHANGE);
      used.add(token.name); names.set(token.id, token.name);
    }
    for (const token of document.tokens) {
      const allowed = new Set(["id", "name", "typeRef", "value", "description", "extensions", "deprecated"]);
      for (const key of Object.keys(token)) if (!allowed.has(key)) check.error(pointer(pointer("/tokens", token.id), key), "Unknown token field has no lossless DTCG mapping.", FOUNDATION_CODES.EXCHANGE);
      const value = writeDtcgValue(token.value, names);
      const item: JsonObject = { $type: token.typeRef.id as FoundationTokenType, $value: value };
      if (token.description !== undefined) item.$description = token.description;
      if (token.extensions !== undefined) item.$extensions = token.extensions;
      if (token.deprecated !== undefined) item.$deprecated = token.deprecated;
      putDtcgToken(output, token.name, item);
    }
    for (const original of document.originalSources) if (record(original) && record(original.groups)) for (const [path, metadata] of Object.entries(original.groups)) {
      if (!record(metadata)) continue;
      try { const group = foundationPointerValue(output, path); if (record(group) && !own(group, "$value")) for (const [key, value] of Object.entries(metadata)) if (["$type", "$description", "$deprecated", "$extensions"].includes(key)) Object.defineProperty(group, key, { value, enumerable: true, configurable: true, writable: true }); } catch { /* A removed or renamed group is not resurrected. */ }
    }
    if (own(document, "description")) { if (typeof document.description !== "string") check.error("/description", "Description must be a string."); else output.$description = document.description; }
    if (document.extensions !== undefined) output.$extensions = document.extensions;
    if (check.valid) { let id = 0; readDtcgTokens(output, () => `export.check.${++id}`, check); result.text = canonicalJson(output, MAX_DOCUMENT_BYTES); result.valid = check.valid; }
  } catch (error) { caught(check, error); }
  return result;
}

/** Explicit current-context snapshot for consumers; it never claims to preserve theme authoring. */
export function exportResolvedFoundationDtcg(input: unknown, selection: FoundationSelection = {}): FoundationExchangeExport {
  return exportSelectedFoundationDtcg(input, selection, "resolved");
}

/** A selected-context exchange is deliberately distinct from a lossless full-system export. */
export function exportSelectedFoundationDtcg(input: unknown, selection: FoundationSelection = {}, values: "resolved" | "references" = "references"): FoundationExchangeExport {
  const check = new FoundationCheck("memory:foundation");
  const result: FoundationExchangeExport = { valid: false, diagnostics: check.diagnostics, mode: "authored" };
  try {
    const output: JsonObject = Object.create(null);
    // Capture caller-owned inputs once so descriptor traps cannot change the selected theme
    // or authored expressions between resolution and reference serialization.
    const document = check.snapshot(input) as unknown as FoundationDocument;
    const selected = check.snapshot(selection, "/selection") as unknown as FoundationSelection;
    const resolution = resolveFoundationTokens(document, selected);
    result.diagnostics.push(...resolution.diagnostics);
    if (!resolution.valid) return result;
    if (values !== "resolved" && values !== "references") throw new Error("Unknown selected-context value mode.");
    const theme = selected.themeSetId === undefined ? undefined : document.themeSets.find(item => item.id === selected.themeSetId);
    const expressions = values === "references" ? composeFoundationExpressions(document, resolution.contexts, theme, check).values : undefined;
    if (!check.valid) return result;
    const names = new Map(document.tokens.map(token => [token.id, token.name]));
    for (const token of resolution.tokens) {
      const authored = document.tokens.find(item => item.id === token.id)!;
      putDtcgToken(output, token.name, { $type: token.type, $value: values === "resolved" ? token.value : writeDtcgValue(expressions!.get(token.id)!, names), ...(authored.description !== undefined ? { $description: authored.description } : {}), ...(authored.deprecated !== undefined ? { $deprecated: authored.deprecated } : {}), ...(authored.extensions ? { $extensions: authored.extensions } : {}) });
    }
    result.text = canonicalJson(output, MAX_DOCUMENT_BYTES);
    result.valid = true;
    result.diagnostics.push({ code: FOUNDATION_CODES.EXCHANGE, phase: "document", severity: "warning", path: "", sourceRef: "memory:foundation", message: `Selected context with ${values === "resolved" ? "resolved values" : "live value references"}; theme definitions, groups, classifications and Axiom authoring metadata are not included. Export ADS to preserve the editable system.` });
  } catch (error) { result.valid = false; caught(check, error); }
  return result;
}
