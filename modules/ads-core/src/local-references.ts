import type { Diagnostic, DocumentEntry, JsonObject, JsonValue } from "./contracts.ts";
import type { LocalEntity, LocalReference, LocalReferenceReport } from "./graph-contracts.ts";
import type { StructuralShape } from "./structural-contracts.ts";
import { CODE, DOCUMENT_KINDS, MAX_STRUCTURE_DIAGNOSTICS, STRUCTURAL_PROFILE } from "./constants.ts";
import { canonicalJson } from "./canonical-json.ts";
import { inspectDocument, isObject, isValidId } from "./documents.ts";
import { inspectDocumentStructure } from "./structural-validation.ts";
import { CATALOG_RECORDS, DOCUMENT_RECORDS } from "./generated/catalog-metadata.ts";

const NESTED_KINDS = new Set(["part", "slot", "value", "event", "variant", "token", "themeAxis", "themeSet", "textBlock", "inlineRun"]);
interface Owner { document: JsonObject; id: string; revision: string; profiled: boolean; selected: boolean; current: boolean }
interface PendingReference { report: LocalReference; localOwner?: string }

function pointer(key: string): string { return key.replaceAll("~", "~0").replaceAll("/", "~1"); }

/**
 * Inspect declared catalog paths only. Query mode also exposes known legacy
 * nested identities as unverified; mutation owners never upgrade their targets.
 */
export function inspectLocalReferences(documents: Record<string, DocumentEntry>, projectId: string, owners?: readonly string[]): LocalReferenceReport {
  const selected = owners === undefined ? undefined : new Set(owners);
  const diagnostics: Diagnostic[] = [];
  const entities: LocalEntity[] = [];
  const references: LocalReference[] = [];
  const index = new Map<string, LocalEntity[]>();
  const pending: PendingReference[] = [];
  const ownerData: Owner[] = [];
  let errors = false;
  let omitted = 0;
  const diagnostic = (code: string, owner: string, path: string, message: string, severity: Diagnostic["severity"] = "error"): void => {
    if (severity === "error") errors = true;
    if (diagnostics.length < MAX_STRUCTURE_DIAGNOSTICS - 1) diagnostics.push({ code, phase: "reference", severity, sourceRef: owner, path, message });
    else omitted += 1;
  };
  const add = (entity: LocalEntity, expose = true): void => {
    const existing = index.get(entity.id) ?? [];
    existing.push(entity);
    index.set(entity.id, existing);
    if (expose) entities.push(entity);
  };
  add({ id: projectId, kind: "project", ownerDocumentId: null, ownerRevision: null, path: "", source: "project-scope", validation: "unverified" });

  // Profile provenance alone cannot validate a damaged or incompatible source.
  for (const entry of Object.values(documents)) {
    if (!isObject(entry) || !isObject(entry.document)) continue;
    const document = entry.document;
    if (!isValidId(document.id) || typeof document.kind !== "string" || !isValidId(document.revision)) continue;
    const source = inspectDocument(entry.currentText ?? entry.originalText, entry.currentSourceUri ?? entry.sourceUri);
    let current = false;
    try { current = source.document !== undefined && canonicalJson(source.document) === canonicalJson(document); } catch { /* Inspection never adopts or repairs persisted bytes. */ }
    const profiled = entry.validationProfile === STRUCTURAL_PROFILE && current && inspectDocumentStructure(document as DocumentEntry["document"]).valid;
    const owner: Owner = { document, id: document.id, revision: document.revision, profiled, selected: selected === undefined || selected.has(document.id), current };
    ownerData.push(owner);
    add({ id: owner.id, kind: document.kind, ownerDocumentId: owner.id, ownerRevision: owner.revision, path: "", source: "document", validation: profiled ? "structural" : current ? "envelope-only" : "unverified" });
  }

  const nested = (owner: Owner, value: unknown, kind: string, path: string): void => {
    if (!isObject(value)) return;
    if (!isValidId(value.id)) {
      if (owner.selected) diagnostic(CODE.STRUCTURE_INVALID, owner.id, `${path}/id`, "A covered nested entity requires a valid stable identity.");
      return;
    }
    const entity: LocalEntity = { id: value.id, kind, ownerDocumentId: owner.id, ownerRevision: owner.revision, path, source: "nested", validation: owner.profiled ? "structural" : "unverified" };
    // Keep an unverified lookup in mutation mode, without claiming an indexed profile.
    add(entity, owners === undefined || owner.profiled);
  };
  const list = (value: unknown, action: (entry: JsonValue, index: number) => void): void => {
    if (Array.isArray(value)) value.forEach(action);
  };
  for (const owner of ownerData) {
    const document = owner.document;
    if (document.kind === "component") {
      list(document.parts, (value, position) => nested(owner, value, "part", `/parts/${position}`));
      list(document.slots, (value, position) => nested(owner, value, "slot", `/slots/${position}`));
      if (isObject(document.publicContract)) for (const [field, kind] of [["values", "value"], ["events", "event"], ["variants", "variant"]] as const) {
        list(document.publicContract[field], (value, position) => nested(owner, value, kind, `/publicContract/${field}/${position}`));
      }
    } else if (document.kind === "foundation") {
      for (const [field, kind] of [["tokens", "token"], ["themeAxes", "themeAxis"], ["themeSets", "themeSet"]] as const) list(document[field], (value, position) => nested(owner, value, kind, `/${field}/${position}`));
    } else if (document.kind === "text") {
      list(document.blocks, (value, position) => {
        nested(owner, value, "textBlock", `/blocks/${position}`);
        if (isObject(value)) list(value.inlines, (inline, inlinePosition) => nested(owner, inline, "inlineRun", `/blocks/${position}/inlines/${inlinePosition}`));
      });
    }
  }

  for (const collisions of index.values()) {
    if (collisions.length < 2) continue;
    for (const entity of collisions) if (entity.ownerDocumentId !== null && (selected === undefined || selected.has(entity.ownerDocumentId))) {
      diagnostic(CODE.ENTITY_DUPLICATE, entity.ownerDocumentId, `${entity.path}/id`, `Identity ${entity.id} occurs at multiple document or nested locations.`);
    }
  }

  const reference = (owner: Owner, value: unknown, path: string, expectedKind?: string, localOwner?: string): void => {
    const ref = expectedKind === undefined ? value : { id: value, expectedKind };
    if (!isObject(ref) || !isValidId(ref.id) || !isValidId(ref.expectedKind)
      || (ref.revision !== undefined && !isValidId(ref.revision))
      || (ref.version !== undefined && (typeof ref.version !== "string" || !ref.version.trim()))) {
      references.push({ ownerDocumentId: owner.id, path, id: isObject(ref) && typeof ref.id === "string" ? ref.id : "", expectedKind: isObject(ref) && typeof ref.expectedKind === "string" ? ref.expectedKind : "", status: "invalid" });
      diagnostic(CODE.REFERENCE_INVALID, owner.id, path, "A covered reference requires a valid identity, kind and optional source revision/public version.");
      return;
    }
    const report: LocalReference = { ownerDocumentId: owner.id, path, id: ref.id, expectedKind: ref.expectedKind, status: "unverified" };
    if (typeof ref.revision === "string") report.revision = ref.revision;
    if (typeof ref.version === "string") report.version = ref.version;
    references.push(report);
    pending.push(localOwner === undefined ? { report } : { report, localOwner });
  };
  const scalarRefs = (owner: Owner, value: JsonObject, field: string, kind: string, path: string, many = false): void => {
    if (!Object.hasOwn(value, field)) return;
    if (many) list(value[field], (item, position) => reference(owner, item, `${path}/${field}/${position}`, kind, owner.id));
    else if (value[field] !== null) reference(owner, value[field], `${path}/${field}`, kind, owner.id);
  };
  const visitRecord = (owner: Owner, value: unknown, name: string, path: string): void => {
    if (name === "Ref") { reference(owner, value, path); return; }
    if (!isObject(value)) return;
    if (owner.document.kind === "component") {
      if (name === "Part" && /^\/parts\/\d+$/.test(path)) scalarRefs(owner, value, "parent", "part", path);
      if (name === "Slot" && /^\/slots\/\d+$/.test(path)) scalarRefs(owner, value, "ownerPartRef", "part", path);
      if (name === "PublicContract" && path === "/publicContract") {
        scalarRefs(owner, value, "exposedSlots", "slot", path, true);
        scalarRefs(owner, value, "replaceableParts", "part", path, true);
      }
      if (name === "ValuePort" && /^\/publicContract\/values\/\d+$/.test(path)) scalarRefs(owner, value, "requestEventRef", "event", path);
      if (name === "TraitBinding" && /^\/traitBindings\/\d+$/.test(path)) scalarRefs(owner, value, "targetParts", "part", path, true);
      if (name === "MotionDefinition" && /^\/motion\/\d+$/.test(path)) scalarRefs(owner, value, "targetPartRef", "part", path);
    }
    const record = CATALOG_RECORDS[name];
    if (!record) return;
    for (const field of record.fields) {
      if (field.name === "metadata" || field.name === "extensions" || !Object.hasOwn(value, field.name)) continue;
      visitShape(owner, value[field.name], field.shape, `${path}/${pointer(field.name)}`);
    }
  };
  const visitShape = (owner: Owner, value: unknown, shape: StructuralShape, path: string): void => {
    if (shape.kind === "record") visitRecord(owner, value, shape.name, path);
    else if (shape.kind === "array") list(value, (item, position) => visitShape(owner, item, shape.items, `${path}/${position}`));
    else if (shape.kind === "map" && isObject(value)) for (const [key, item] of Object.entries(value)) visitShape(owner, item, shape.values, `${path}/${pointer(key)}`);
    // Union branch selection and unknown named payloads remain opaque here.
  };
  for (const owner of ownerData) if (owner.selected) {
    const record = typeof owner.document.kind === "string" ? DOCUMENT_RECORDS[owner.document.kind] : undefined;
    if (record) visitRecord(owner, owner.document, record, "");
  }

  for (const { report, localOwner } of pending) {
    const targets = index.get(report.id) ?? [];
    const fail = (status: LocalReference["status"], code: string, message: string): void => {
      report.status = status;
      diagnostic(code, report.ownerDocumentId, report.path, message);
    };
    if (targets.length > 1) { fail("ambiguous", CODE.ENTITY_DUPLICATE, "Reference identity has multiple targets; no target was selected."); continue; }
    const target = targets[0];
    if (!target) {
      if (DOCUMENT_KINDS.has(report.expectedKind) || NESTED_KINDS.has(report.expectedKind)) fail("missing", CODE.REFERENCE_MISSING, "Covered local reference target is missing.");
      else diagnostic(CODE.STRUCTURE_UNVERIFIED, report.ownerDocumentId, report.path, "External or unsupported identity kind requires a separate resolver.", "warning");
      continue;
    }
    report.resolvedTarget = { ...target };
    if (target.kind !== report.expectedKind) { fail("kind-mismatch", CODE.REFERENCE_KIND, `Expected ${report.expectedKind}, but the local identity is ${target.kind}.`); continue; }
    if (localOwner !== undefined && target.ownerDocumentId !== localOwner) { fail("owner-mismatch", CODE.REFERENCE_KIND, "The covered local relationship points outside its owning document."); continue; }
    if (report.revision !== undefined && report.revision !== target.ownerRevision) { fail("revision-mismatch", CODE.REFERENCE_REVISION, "Reference revision does not match the owning document's source revision."); continue; }
    if (target.source === "project-scope" && report.version !== undefined) { fail("revision-mismatch", CODE.REFERENCE_REVISION, "Live project scope has no public library version."); continue; }
    if (report.version !== undefined) {
      diagnostic(CODE.STRUCTURE_UNVERIFIED, report.ownerDocumentId, report.path, "Local identity does not resolve a public library version pin.", "warning");
    } else if (target.source !== "project-scope" && target.validation === "unverified") {
      diagnostic(CODE.STRUCTURE_UNVERIFIED, report.ownerDocumentId, report.path, "Target source is unvalidated or does not match its adopted data; identity cannot claim structural resolution.", "warning");
    } else report.status = "resolved";
  }

  // Part parent is the only cycle encoding enforced here. Multiple roots are allowed.
  for (const owner of ownerData) {
    if (!owner.selected || owner.document.kind !== "component") continue;
    const parents = new Map<string, { parent: string; path: string }>();
    list(owner.document.parts, (part, position) => {
      if (!isObject(part) || !isValidId(part.id) || !isValidId(part.parent)) return;
      const source = index.get(part.id);
      const target = index.get(part.parent);
      if (source?.length === 1 && target?.length === 1 && target[0]?.kind === "part" && target[0]?.ownerDocumentId === owner.id) parents.set(part.id, { parent: part.parent, path: `/parts/${position}/parent` });
    });
    const done = new Set<string>();
    for (const start of parents.keys()) {
      if (done.has(start)) continue;
      const trail: string[] = [];
      const positions = new Map<string, number>();
      let current: string | undefined = start;
      while (current !== undefined && !done.has(current)) {
        const position = positions.get(current);
        if (position !== undefined) {
          const cycle = trail.slice(position);
          const shown = cycle.slice(0, MAX_STRUCTURE_DIAGNOSTICS);
          diagnostic(CODE.STRUCTURE_CYCLE, owner.id, parents.get(current)!.path, `Part parent cycle (${cycle.length} identities): ${shown.join(" → ")}${shown.length < cycle.length ? " → …" : ` → ${current}`}.`);
          break;
        }
        positions.set(current, trail.length);
        trail.push(current);
        current = parents.get(current)?.parent;
      }
      for (const id of trail) done.add(id);
    }
  }
  if (omitted) diagnostics.push({ code: CODE.STRUCTURE_LIMIT, phase: "reference", severity: errors ? "error" : "warning", message: `${omitted} additional graph diagnostics omitted by the profile limit.` });
  return { valid: !errors, diagnostics, entities, references };
}
