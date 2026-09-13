import type { Diagnostic, JsonObject, JsonValue } from "./contracts.ts";
import { CODE, DOMAIN_PROFILE, MAX_DOCUMENT_BYTES, MAX_STRUCTURE_DIAGNOSTICS } from "./constants.ts";
import { canonicalJson, parseJson } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import type { ContentReportSink, DomainReport } from "./domain-contracts.ts";
import { contentPointer, inspectRecordContent } from "./content-validation.ts";
import { inspectDocumentStructure, inspectRecordStructure } from "./structural-validation.ts";
import type { StructuralReport, StructuralShape } from "./structural-contracts.ts";
import { CATALOG_RECORDS, DOCUMENT_RECORDS } from "./generated/catalog-metadata.ts";
import { inspectTypeExpression, inspectTypedValue } from "./type-validation.ts";
import { KernelError } from "./kernel-error.ts";

const MAX_DOMAIN_STEPS = 65_536;
const MAX_TYPED_WORK_UNITS = 8 * MAX_DOCUMENT_BYTES;

class DomainBudgetError extends Error {}

class DomainBuilder implements ContentReportSink {
  readonly sourceRef: string;
  readonly unresolved = new Set<string>();
  readonly unhandled = new Set<string>();
  readonly handledPaths = new Map<string, Set<string>>();
  readonly declarations = new Map<string, boolean>();
  readonly diagnostics: Diagnostic[] = [];
  valid = true;
  complete = false;
  #steps = 0;
  #typedWork = 0;
  #truncated = false;

  constructor(sourceRef: string) { this.sourceRef = sourceRef; }

  tick(): void { if (++this.#steps > MAX_DOMAIN_STEPS) throw new DomainBudgetError("Domain inspection exceeded its work limit."); }

  chargeType(type: unknown, value?: unknown, includesValue = false): void {
    this.tick();
    // Charge repeated declaration work across defaults/choices, not merely each API call.
    this.#typedWork += canonicalJson(type, MAX_DOCUMENT_BYTES).length;
    if (includesValue) this.#typedWork += canonicalJson(value, MAX_DOCUMENT_BYTES).length;
    if (this.#typedWork > MAX_TYPED_WORK_UNITS) throw new DomainBudgetError("Repeated typed-value inspection exceeded its shared work limit.");
  }

  handled(type: string, path: string): void {
    const paths = this.handledPaths.get(type) ?? new Set<string>();
    paths.add(path);
    this.handledPaths.set(type, paths);
  }

  covers(type: string, path: string): boolean {
    const paths = this.handledPaths.get(type);
    if (!paths) return false;
    for (let ancestor = path; ; ancestor = ancestor.slice(0, ancestor.lastIndexOf("/"))) {
      if (paths.has(ancestor)) return true;
      if (!ancestor) return false;
    }
  }

  add(diagnostic: Diagnostic): void {
    if (diagnostic.severity === "error") this.valid = false;
    if (this.diagnostics.filter(item => item.severity === diagnostic.severity).length < MAX_STRUCTURE_DIAGNOSTICS) this.diagnostics.push(diagnostic);
    else this.#truncated = true;
  }

  merge(report: { valid: boolean; diagnostics: Diagnostic[] }): void {
    this.valid = this.valid && report.valid;
    for (const diagnostic of report.diagnostics) {
      if (diagnostic.code === CODE.DOMAIN_UNVERIFIED) this.unresolved.add("AdditionalTypedField");
      this.add(diagnostic);
    }
  }

  error(path: string, message: string): void { this.add({ code: CODE.DOMAIN_INVALID, severity: "error", phase: "document", sourceRef: this.sourceRef, path, message }); }

  unverified(type: string, path: string, message: string): void {
    this.unresolved.add(type);
    this.add({ code: CODE.DOMAIN_UNVERIFIED, severity: "warning", phase: "document", sourceRef: this.sourceRef, path, message });
  }

  finish(base: StructuralReport): DomainReport {
    const unresolved = new Set(base.unverifiedTypes);
    if (this.complete) for (const type of this.handledPaths.keys()) if (!this.unhandled.has(type)) unresolved.delete(type);
    for (const type of this.unresolved) unresolved.add(type);
    const diagnostics = base.diagnostics.filter(diagnostic => !(diagnostic.code === CODE.STRUCTURE_UNVERIFIED && diagnostic.path !== undefined
      && [...this.handledPaths.keys()].some(type => this.covers(type, diagnostic.path!))));
    diagnostics.push(...this.diagnostics);
    // Errors remain visible even when a document produced many earlier unknown-type warnings.
    diagnostics.sort((a, b) => Number(b.severity === "error") - Number(a.severity === "error"));
    const unique = diagnostics.filter((item, index) => diagnostics.findIndex(other => other.code === item.code && other.path === item.path && other.message === item.message) === index);
    const truncated = this.#truncated || unique.length > MAX_STRUCTURE_DIAGNOSTICS;
    const bounded = unique.slice(0, truncated ? MAX_STRUCTURE_DIAGNOSTICS - 1 : MAX_STRUCTURE_DIAGNOSTICS);
    if (truncated) bounded.push({ code: CODE.STRUCTURE_LIMIT, severity: "warning", phase: "document", sourceRef: this.sourceRef, path: "", message: "Further domain diagnostics were omitted; validity still includes every checked error." });
    return { profile: DOMAIN_PROFILE, valid: base.valid && this.valid, diagnostics: bounded, checkedRecords: base.checkedRecords, unverifiedTypes: [...unresolved].sort() };
  }
}

function declaration(type: JsonValue, path: string, report: DomainBuilder): boolean {
  const previous = report.declarations.get(path);
  if (previous !== undefined) return previous;
  if (report.covers("TypeExpr", path)) return true;
  report.chargeType(type);
  const result = inspectTypeExpression(type, report.sourceRef, path);
  report.handled("TypeExpr", path);
  report.declarations.set(path, result.valid);
  report.merge(result);
  if (result.diagnostics.some(item => item.code === CODE.TYPE_UNSUPPORTED)) report.unresolved.add("TypeExpr");
  return result.valid;
}

function typedDefault(type: JsonValue, value: JsonValue, path: string, report: DomainBuilder): void {
  report.chargeType(type, value, true);
  report.handled("TypedValue", path);
  report.merge(inspectTypedValue(type, value, report.sourceRef, path));
}

function recordTypes(name: string, value: JsonObject, path: string, report: DomainBuilder): void {
  if (name === "RecordTypeExpr") declaration(value, path, report);
  if (name !== "ValuePort" && name !== "PolicyDefinition") return;
  const field = name === "ValuePort" ? "type" : "configurationType";
  if (!Object.hasOwn(value, field)) return;
  const type = value[field]!;
  if (!declaration(type, contentPointer(path, field), report)) return;
  const defaultField = name === "ValuePort" ? "defaultValue" : "default";
  if (Object.hasOwn(value, defaultField)) typedDefault(type, value[defaultField]!, contentPointer(path, defaultField), report);
  if (name === "PolicyDefinition" && Array.isArray(value.allowedChoices)) {
    const choicesPath = contentPointer(path, "allowedChoices");
    report.handled("TypedValue", choicesPath);
    value.allowedChoices.forEach((choice, index) => typedDefault(type, choice, contentPointer(choicesPath, String(index)), report));
  }
}

function walkShape(shape: StructuralShape, value: JsonValue, path: string, report: DomainBuilder): void {
  report.tick();
  switch (shape.kind) {
    case "record": walkRecord(shape.name, value, path, report); break;
    case "array":
      if (Array.isArray(value)) {
        if (!value.length) unresolvedShape(shape.items, path, report);
        value.forEach((item, index) => walkShape(shape.items, item, contentPointer(path, String(index)), report));
      }
      break;
    case "map":
      if (isObject(value)) {
        if (!Object.keys(value).length) unresolvedShape(shape.values, path, report);
        for (const [key, item] of Object.entries(value)) walkShape(shape.values, item, contentPointer(path, key), report);
      }
      break;
    case "opaque":
      if (shape.name === "TypeExpr") declaration(value, path, report);
      if (!report.covers(shape.name, path)) report.unhandled.add(shape.name);
      break;
    case "union": unresolvedShape(shape, path, report); break;
    case "scalar":
    case "enum": break;
  }
}

function unresolvedShape(shape: StructuralShape, path: string, report: DomainBuilder): void {
  if (shape.kind === "opaque" && !report.covers(shape.name, path)) report.unhandled.add(shape.name);
  if (shape.kind === "union") for (const option of shape.options) unresolvedShape(option, path, report);
}

function walkRecord(name: string, value: JsonValue, path: string, report: DomainBuilder): void {
  report.tick();
  if (!Object.hasOwn(CATALOG_RECORDS, name) || !isObject(value)) return;
  inspectRecordContent(name, value, path, report);
  recordTypes(name, value, path, report);
  for (const field of CATALOG_RECORDS[name]!.fields) if (Object.hasOwn(value, field.name)) walkShape(field.shape, value[field.name]!, contentPointer(path, field.name), report);
}

function inspect(value: JsonValue, sourceRef: string | undefined, recordName?: string): DomainReport {
  let reference = typeof sourceRef === "string" && sourceRef.trim() ? sourceRef : "memory:document";
  let base: StructuralReport = { profile: "foundation-structural", valid: true, diagnostics: [], checkedRecords: [], unverifiedTypes: [] };
  let report = new DomainBuilder(reference);
  try {
    if (sourceRef !== undefined && (typeof sourceRef !== "string" || !sourceRef.trim())) throw new KernelError(CODE.DOMAIN_INVALID, "A nonblank source identity is required.");
    const input = parseJson(canonicalJson(value, MAX_DOCUMENT_BYTES), MAX_DOCUMENT_BYTES);
    if (sourceRef === undefined && isObject(input) && isValidId(input.id)) reference = input.id;
    report = new DomainBuilder(reference);
    base = recordName === undefined ? inspectDocumentStructure(input, reference) : inspectRecordStructure(recordName, input, reference);
    if (recordName !== undefined) walkRecord(recordName, input, "", report);
    else if (isObject(input)) {
      walkRecord("DocumentEnvelope", input, "", report);
      const kind = input.kind;
      if (typeof kind === "string" && Object.hasOwn(DOCUMENT_RECORDS, kind)) walkRecord(DOCUMENT_RECORDS[kind]!, input, "", report);
    }
    report.complete = true;
  } catch (error) {
    if (error instanceof DomainBudgetError) {
      report.error("", error.message);
      report.unverified("DomainWorkLimit", "", "Inspection stopped at the shared work limit; unchecked constraints are not certified.");
    } else if (error instanceof KernelError) report.add({ ...error.toDiagnostic(), sourceRef: reference });
    else throw error;
  }
  return report.finish(base);
}

/** Inspect known catalog structure and ADR-0012 constraints without executing opaque data or mutating input. */
export function inspectDocumentDomain(document: JsonValue, sourceRef?: string): DomainReport { return inspect(document, sourceRef); }

/** Record-level counterpart for known contracts that have no complete document-body mapping yet. */
export function inspectRecordDomain(recordName: string, value: JsonValue, sourceRef?: string): DomainReport { return inspect(value, sourceRef, recordName); }
