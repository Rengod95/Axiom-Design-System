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
  else check.caught(error);
}

/** Flat explicit-type tokens and whole-token aliases only; unsupported input is never partially imported. */
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
    const tokens: JsonObject[] = [];
    const names = new Map<string, string>();
    for (const [key, item] of Object.entries(source)) {
      const path = pointer("", key); check.step(path);
      if (key === "$description") { if (typeof item !== "string") check.error(path, "Description must be a string."); continue; }
      if (key === "$extensions") { if (!record(item)) check.error(path, "Extensions must be an object."); continue; }
      if (!exchangeName(key) || !record(item) || !own(item, "$value")) { check.error(path, "Only flat named tokens are imported; group inheritance, root tokens and resolver documents remain preserved but unsupported.", FOUNDATION_CODES.EXCHANGE); continue; }
      for (const field of Object.keys(item)) if (!["$value", "$type", "$description", "$extensions"].includes(field)) check.error(pointer(path, field), "This token feature cannot be imported without loss.", FOUNDATION_CODES.EXCHANGE);
      if (typeof item.$type !== "string" || !(FOUNDATION_TOKEN_TYPES as readonly string[]).includes(item.$type)) check.error(pointer(path, "$type"), "This import requires an explicit supported type on every token.", FOUNDATION_CODES.EXCHANGE);
      if (own(item, "$description") && typeof item.$description !== "string") check.error(pointer(path, "$description"), "Description must be a string.");
      if (own(item, "$extensions") && !record(item.$extensions)) check.error(pointer(path, "$extensions"), "Extensions must be an object.");
      const tokenId: unknown = createId();
      if (!stableId(tokenId)) { check.error(path, "ID service did not produce a stable token ID."); continue; }
      names.set(key, tokenId);
      const token: JsonObject = { id: tokenId, name: key, typeRef: { id: item.$type ?? null }, value: { literal: item.$value! } };
      if (own(item, "$description")) token.description = item.$description!;
      if (own(item, "$extensions")) token.extensions = item.$extensions!;
      tokens.push(token);
    }
    for (const token of tokens) {
      const sourceToken = source[token.name as string] as JsonObject;
      if (typeof sourceToken.$value === "string" && /^\{[^{}]+\}$/.test(sourceToken.$value)) {
        const target = names.get(sourceToken.$value.slice(1, -1));
        if (!target) check.error(pointer(pointer("", token.name as string), "$value"), "Alias target is missing or requires an unsupported grouped/property reference.", FOUNDATION_CODES.EXCHANGE);
        else token.value = { ref: { id: target, expectedKind: "token" } };
      }
    }
    if (!check.valid) return result;
    const sourceDigest: unknown = digest(text);
    if (typeof sourceDigest !== "string" || !/^[a-f0-9]{64}$/.test(sourceDigest)) { check.error("", "Digest service must return a lowercase SHA-256 digest."); return result; }
    const document: JsonObject = { id, name, kind: "foundation", schemaVersion: STUDIO_SCHEMA_VERSION, revision, studioProfile: { ...STUDIO_SOURCE_PROFILE }, tokens, domains: [], tiers: [], themeAxes: [], themeSets: [], policies: [], resolutionOrder: [], originalSources: [{ format: EXCHANGE_FORMAT, formatVersion: EXCHANGE_VERSION, uri, originalText: text, digest: sourceDigest }] };
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
      if (!exchangeName(token.name) || used.has(token.name)) check.error("/tokens", "Authored exchange requires unique flat DTCG names.", FOUNDATION_CODES.EXCHANGE);
      used.add(token.name); names.set(token.id, token.name);
    }
    for (const token of document.tokens) {
      const allowed = new Set(["id", "name", "typeRef", "value", "description", "extensions"]);
      for (const key of Object.keys(token)) if (!allowed.has(key)) check.error(pointer(pointer("/tokens", token.id), key), "Unknown token field has no lossless DTCG mapping.", FOUNDATION_CODES.EXCHANGE);
      const value: JsonValue = "literal" in token.value ? token.value.literal : `{${names.get(token.value.ref.id)!}}`;
      const item: JsonObject = { $type: token.typeRef.id as FoundationTokenType, $value: value };
      if (token.description !== undefined) item.$description = token.description;
      if (token.extensions !== undefined) item.$extensions = token.extensions;
      output[token.name] = item;
    }
    if (own(document, "description")) { if (typeof document.description !== "string") check.error("/description", "Description must be a string."); else output.$description = document.description; }
    if (document.extensions !== undefined) output.$extensions = document.extensions;
    if (check.valid) { result.text = canonicalJson(output, MAX_DOCUMENT_BYTES); result.valid = true; }
  } catch (error) { caught(check, error); }
  return result;
}
