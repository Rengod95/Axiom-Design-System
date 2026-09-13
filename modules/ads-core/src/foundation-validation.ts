import type { JsonObject, JsonValue } from "./contracts.ts";
import type { FoundationDocument, FoundationReport, FoundationTokenType, FoundationTokenValue } from "./foundation-contracts.ts";
import { FOUNDATION_CODES, FOUNDATION_RESOLVER_ID, FOUNDATION_RESOLVER_VERSION, FOUNDATION_TOKEN_TYPES } from "./foundation-constants.ts";
import { FoundationCheck, fields, nonblank, own, pointer, record, stableId } from "./foundation-internal.ts";
import { checkFoundationValue } from "./foundation-values.ts";
import { checkAliasCycles, evaluateFoundation } from "./foundation-evaluation.ts";
import { STUDIO_SCHEMA_VERSION, STUDIO_SOURCE_PROFILE } from "./studio-constants.ts";

const tokenType = (value: unknown): value is FoundationTokenType => typeof value === "string" && (FOUNDATION_TOKEN_TYPES as readonly string[]).includes(value);

function tokenValue(value: JsonValue | undefined, type: FoundationTokenType, path: string, tokens: ReadonlyMap<string, JsonObject>, check: FoundationCheck): void {
  check.step(path);
  if (!record(value) || Object.keys(value).length !== 1 || own(value, "literal") === own(value, "ref")) { check.error(path, "Token value must contain exactly one literal or ref."); return; }
  if (own(value, "literal")) { checkFoundationValue(type, value.literal, pointer(path, "literal"), check); return; }
  if (!record(value.ref)) { check.error(pointer(path, "ref"), "Expected a token Ref.", FOUNDATION_CODES.ALIAS); return; }
  fields(value.ref, ["id", "expectedKind"], [], pointer(path, "ref"), check);
  if (!stableId(value.ref.id) || value.ref.expectedKind !== "token") { check.error(pointer(path, "ref"), "Expected a stable token ID and expectedKind token.", FOUNDATION_CODES.ALIAS); return; }
  const target = tokens.get(value.ref.id);
  if (!target) check.error(pointer(path, "ref"), "Alias target is missing from this Foundation.", FOUNDATION_CODES.ALIAS);
  else if (!record(target.typeRef) || target.typeRef.id !== type) check.error(pointer(path, "ref"), "Alias target has a different token type.", FOUNDATION_CODES.ALIAS);
}

/** Internal: snapshot is JSON-safe. Returns a typed view only if every shape check succeeds. */
export function checkFoundationSnapshot(snapshot: JsonValue, check: FoundationCheck): FoundationDocument | undefined {
  if (!record(snapshot)) { check.error("", "Expected a Foundation document object."); return; }
  fields(snapshot, ["id", "name", "kind", "schemaVersion", "revision", "studioProfile", "tokens", "domains", "tiers", "themeAxes", "themeSets", "policies", "originalSources", "resolutionOrder"], ["metadata", "extensions", "description"], "", check);
  for (const key of ["id", "name", "revision"]) if (!nonblank(snapshot[key])) check.error(pointer("", key), "Expected a nonblank header string.");
  if (!stableId(snapshot.id)) check.error("/id", "Expected a stable Foundation ID.");
  if (snapshot.kind !== "foundation" || snapshot.schemaVersion !== STUDIO_SCHEMA_VERSION) check.error("/kind", "Executable Foundation requires kind foundation and the pinned schema version.");
  if (!record(snapshot.studioProfile) || snapshot.studioProfile.id !== STUDIO_SOURCE_PROFILE.id || snapshot.studioProfile.version !== STUDIO_SOURCE_PROFILE.version || Object.keys(snapshot.studioProfile).length !== 2) check.error("/studioProfile", "Expected the pinned Axiom Studio profile.");
  if (own(snapshot, "description") && typeof snapshot.description !== "string") check.error("/description", "Expected a description string.");
  for (const key of ["metadata", "extensions"]) if (own(snapshot, key) && !record(snapshot[key])) check.error(pointer("", key), "Expected an opaque JSON object.");
  const lists = ["tokens", "domains", "tiers", "themeAxes", "themeSets", "policies", "originalSources", "resolutionOrder"];
  for (const key of lists) if (!Array.isArray(snapshot[key])) check.error(pointer("", key), "Expected the required array.");
  if (!lists.every(key => Array.isArray(snapshot[key]))) return;
  const tokens = new Map<string, JsonObject>();
  const entities = new Set<string>([snapshot.id as string]);
  const identity = (item: JsonObject, path: string): void => {
    if (!stableId(item.id)) check.error(pointer(path, "id"), "Expected a stable ID.");
    else if (entities.has(item.id)) check.error(pointer(path, "id"), "Duplicate Foundation entity ID.");
    else entities.add(item.id);
  };
  for (const key of ["domains", "tiers", "policies", "originalSources"]) (snapshot[key] as JsonValue[]).forEach((item, index) => {
    const path = `/${key}/${index}`; check.step(path);
    if (!record(item)) check.error(path, "Expected a source/classification record.");
    else if (key === "domains" || key === "tiers") identity(item, path);
    if (key === "policies") check.error(path, "Policy execution is not supported by this authoring profile.", FOUNDATION_CODES.UNSUPPORTED);
  });
  const domainIds = new Set((snapshot.domains as JsonValue[]).filter(record).map(item => item.id));
  const tierIds = new Set((snapshot.tiers as JsonValue[]).filter(record).map(item => item.id));
  (snapshot.tokens as JsonValue[]).forEach((item, index) => {
    const path = `/tokens/${index}`; check.step(path);
    if (!record(item)) { check.error(path, "Expected a token record."); return; }
    fields(item, ["id", "name", "typeRef", "value"], ["domain", "tier", "description", "metadata", "extensions"], path, check);
    identity(item, path);
    if (stableId(item.id)) tokens.set(item.id, item);
    if (!nonblank(item.name)) check.error(pointer(path, "name"), "Expected a nonblank token name.");
    if (!record(item.typeRef) || !tokenType(item.typeRef.id) || Object.keys(item.typeRef).length !== 1) check.error(pointer(path, "typeRef"), "Expected one of the thirteen DTCG types.");
    if (own(item, "description") && typeof item.description !== "string") check.error(pointer(path, "description"), "Expected a description string.");
    for (const key of ["metadata", "extensions"]) if (own(item, key) && !record(item[key])) check.error(pointer(path, key), "Expected an opaque JSON object.");
    if (own(item, "domain") && (!stableId(item.domain) || !domainIds.has(item.domain))) check.error(pointer(path, "domain"), "Unknown token domain.");
    if (own(item, "tier") && (!stableId(item.tier) || !tierIds.has(item.tier))) check.error(pointer(path, "tier"), "Unknown token tier.");
  });
  (snapshot.tokens as JsonValue[]).forEach((item, index) => { if (record(item) && record(item.typeRef) && tokenType(item.typeRef.id)) tokenValue(item.value, item.typeRef.id, `/tokens/${index}/value`, tokens, check); });
  const axes = new Map<string, JsonObject>();
  (snapshot.themeAxes as JsonValue[]).forEach((item, index) => {
    const path = `/themeAxes/${index}`; check.step(path);
    if (!record(item)) { check.error(path, "Expected a ThemeAxis record."); return; }
    fields(item, ["id", "contexts", "scope"], ["default", "overrides"], path, check);
    identity(item, path); if (stableId(item.id)) axes.set(item.id, item);
    if (!Array.isArray(item.contexts) || item.contexts.length === 0 || !item.contexts.every(nonblank) || new Set(item.contexts).size !== item.contexts.length) check.error(pointer(path, "contexts"), "Expected a nonempty list of unique context names.");
    if (own(item, "default") && (!nonblank(item.default) || !Array.isArray(item.contexts) || !item.contexts.includes(item.default))) check.error(pointer(path, "default"), "Default must name a declared context.");
    if (!record(item.scope) || item.scope.id !== snapshot.id || item.scope.expectedKind !== "foundation" || own(item.scope, "version") || own(item.scope, "revision") && item.scope.revision !== snapshot.revision) check.error(pointer(path, "scope"), "Axis scope must refer to this Foundation and, if pinned, its current revision.");
    else fields(item.scope, ["id", "expectedKind"], ["revision"], pointer(path, "scope"), check);
    if (own(item, "overrides")) {
      if (!record(item.overrides)) { check.error(pointer(path, "overrides"), "Expected context-to-token override maps."); return; }
      for (const [context, map] of Object.entries(item.overrides)) {
        const at = pointer(pointer(path, "overrides"), context); check.step(at);
        if (!Array.isArray(item.contexts) || !item.contexts.includes(context)) check.error(at, "Override context is not declared.");
        if (!record(map)) { check.error(at, "Expected a map of token IDs to values."); continue; }
        for (const [id, value] of Object.entries(map)) {
          const token = tokens.get(id);
          if (!token) check.error(pointer(at, id), "Override targets an unknown token.");
          else if (record(token.typeRef) && tokenType(token.typeRef.id)) tokenValue(value, token.typeRef.id, pointer(at, id), tokens, check);
        }
      }
    }
  });
  const order = snapshot.resolutionOrder as JsonValue[];
  if (order.length !== axes.size || new Set(order).size !== order.length || !order.every(item => typeof item === "string" && axes.has(item))) check.error("/resolutionOrder", "Resolution order must list every axis exactly once.");
  (snapshot.themeSets as JsonValue[]).forEach((item, index) => {
    const path = `/themeSets/${index}`; check.step(path);
    if (!record(item)) { check.error(path, "Expected a ThemeSet record."); return; }
    fields(item, ["id", "contexts", "resolutionProfile"], [], path, check);
    identity(item, path);
    if (!record(item.contexts)) check.error(pointer(path, "contexts"), "Expected a complete context selection.");
    else {
      if (Object.keys(item.contexts).length !== axes.size) check.error(pointer(path, "contexts"), "ThemeSet must select every axis exactly once.");
      for (const [id, context] of Object.entries(item.contexts)) {
        const axis = axes.get(id);
        if (!axis || !Array.isArray(axis.contexts) || typeof context !== "string" || !axis.contexts.includes(context)) check.error(pointer(pointer(path, "contexts"), id), "Unknown axis or context in ThemeSet.");
      }
    }
    const profile = item.resolutionProfile;
    if (!record(profile) || profile.id !== FOUNDATION_RESOLVER_ID || profile.expectedKind !== "resolutionProfile" || profile.version !== FOUNDATION_RESOLVER_VERSION || Object.keys(profile).length !== 3) check.error(pointer(path, "resolutionProfile"), "Expected the pinned explicit-order resolver profile.");
  });
  if (!check.valid) return;
  const document = snapshot as unknown as FoundationDocument;
  checkAliasCycles(new Map(document.tokens.map(token => [token.id, token.value as FoundationTokenValue])), check, "/tokens");
  for (const theme of document.themeSets) evaluateFoundation(document, { themeSetId: theme.id }, check, false);
  if (document.themeAxes.every(axis => axis.default !== undefined)) evaluateFoundation(document, {}, check, false);
  return check.valid ? document : undefined;
}

/** Public boundary: plain JSON snapshot, 1 MiB/depth 64 and shared finite work budget. */
export function inspectFoundationDocument(document: unknown, sourceRef = "memory:foundation"): FoundationReport {
  const check = new FoundationCheck(sourceRef);
  try { checkFoundationSnapshot(check.snapshot(document), check); } catch (error) { check.caught(error); }
  return { valid: check.valid, diagnostics: check.diagnostics };
}
