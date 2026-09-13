import type { Diagnostic, JsonObject, JsonValue } from "./contracts.ts";
import { CODE, ID_PATTERN, MAX_STRUCTURE_DIAGNOSTICS, RESERVED_IDS, STRUCTURAL_PROFILE } from "./constants.ts";
import type { StructuralReport, StructuralShape } from "./structural-contracts.ts";
import { CATALOG_RECORDS, DOCUMENT_RECORDS } from "./generated/catalog-metadata.ts";
import * as generated from "./generated/catalog-structure.ts";

interface SchemaError { instancePath: string; keyword: string; message?: string; params: { missingProperty?: string } }
interface SchemaValidator { (value: JsonValue): boolean; errors?: SchemaError[] | null }
const validators = generated as unknown as Readonly<Record<string, SchemaValidator>>;
const pointer = (path: string, name: string): string => `${path}/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`;
const object = (value: JsonValue): value is JsonObject => value !== null && typeof value === "object" && !Array.isArray(value);

/** Keep bounded output without letting omitted warnings change enforced validity. */
class ReportBuilder {
  readonly records = new Set<string>();
  readonly unresolved = new Set<string>();
  readonly diagnostics: Diagnostic[] = [];
  private readonly seen = new Set<string>();
  private truncated = false;
  private readonly sourceRef: string;
  constructor(sourceRef: string) { this.sourceRef = sourceRef; }

  add(code: string, severity: Diagnostic["severity"], path: string, message: string): void {
    const key = `${code}\0${path}\0${message}`;
    if (this.seen.has(key)) return;
    if (this.diagnostics.length >= MAX_STRUCTURE_DIAGNOSTICS - 1) { this.truncated = true; return; }
    this.seen.add(key);
    this.diagnostics.push({ code, severity, phase: "document", sourceRef: this.sourceRef, path, message });
  }

  unverified(type: string, path: string, reason = "Its structure or meaning is not defined by this profile."): void {
    this.unresolved.add(type);
    this.add(CODE.STRUCTURE_UNVERIFIED, "warning", path, `Unverified ${type}: ${reason}`);
  }

  errors(errors: readonly SchemaError[]): void {
    for (const error of errors) {
      const path = error.params.missingProperty === undefined ? error.instancePath : pointer(error.instancePath, error.params.missingProperty);
      this.add(CODE.STRUCTURE_INVALID, "error", path, `Structural constraint ${path || "/"}: ${error.message ?? error.keyword}.`);
    }
  }

  finish(valid: boolean): StructuralReport {
    if (this.truncated) this.diagnostics.push({ code: CODE.STRUCTURE_LIMIT, severity: "warning", phase: "document", sourceRef: this.sourceRef, path: "", message: "Further structural diagnostics were omitted. Validity still reflects all enforced constraints." });
    return { profile: STRUCTURAL_PROFILE, valid, diagnostics: this.diagnostics, checkedRecords: [...this.records].sort(), unverifiedTypes: [...this.unresolved].sort() };
  }
}

function unresolvedShape(shape: StructuralShape, path: string, report: ReportBuilder): void {
  if (shape.kind === "opaque") report.unverified(shape.name, path);
  else if (shape.kind === "union") for (const option of shape.options) unresolvedShape(option, path, report);
}

/** Coverage follows known schema edges only; opaque values are never searched for ids or refs. */
function traceShape(shape: StructuralShape, value: JsonValue, path: string, report: ReportBuilder): void {
  switch (shape.kind) {
    case "record": traceRecord(shape.name, value, path, report); break;
    case "array":
      if (Array.isArray(value)) {
        if (!value.length) unresolvedShape(shape.items, path, report);
        value.forEach((item, index) => traceShape(shape.items, item, pointer(path, String(index)), report));
      }
      break;
    case "map":
      if (object(value)) {
        report.unverified(`MapKey<${shape.keyType}>`, path, "JSON object keys are strings; the named key-domain constraints are not interpreted.");
        if (!Object.keys(value).length) unresolvedShape(shape.values, path, report);
        for (const [key, item] of Object.entries(value)) traceShape(shape.values, item, pointer(path, key), report);
      }
      break;
    case "opaque": report.unverified(shape.name, path); break;
    case "scalar":
      if (shape.name === "record") report.unverified("record", path, "Only its JSON object container is checked; its contents remain opaque.");
      if (shape.name === "NamespacedId" || shape.name === "Kind" || shape.name === "Version") report.unverified(shape.name, path, "Only a nonblank string is checked; namespace, identity-kind or version meaning is not resolved.");
      break;
    case "union":
      // An unknown alternative cannot certify a known alternative by falling
      // through an always-valid schema. Report the unresolved union instead.
      unresolvedShape(shape, path, report);
      break;
    case "enum": break;
  }
}

function traceRecord(name: string, value: JsonValue, path: string, report: ReportBuilder, allowed?: ReadonlySet<string>): void {
  const record = CATALOG_RECORDS[name];
  if (!record) return;
  report.records.add(name);
  if (!object(value)) return;
  const fields = allowed ?? new Set(record.fields.map(field => field.name));
  for (const field of record.fields) if (Object.hasOwn(value, field.name)) traceShape(field.shape, value[field.name]!, pointer(path, field.name), report);
  for (const key of Object.keys(value)) if (!fields.has(key)) report.unverified("AdditionalField", pointer(path, key), "The field is preserved without interpretation.");
}

/** Internal parsed/canonical JSON boundary: this does not parse bytes or authorize a caller. */
export function inspectRecordStructure(recordName: string, value: JsonValue, sourceRef = "memory:record"): StructuralReport {
  const report = new ReportBuilder(sourceRef);
  if (!Object.hasOwn(CATALOG_RECORDS, recordName)) {
    report.add(CODE.STRUCTURE_INVALID, "error", "", "The requested record is not defined in the structural catalog.");
    report.unverified(recordName, "");
    return report.finish(false);
  }
  const validate = validators[`validate${recordName}`]!;
  const valid = validate(value);
  if (!valid) report.errors(validate.errors ?? []);
  traceRecord(recordName, value, "", report);
  return report.finish(valid);
}

function defaultSourceRef(value: JsonValue): string {
  const id = object(value) ? value.id : undefined;
  return typeof id === "string" && ID_PATTERN.test(id) && !RESERVED_IDS.has(id) ? id : "memory:document";
}

/** Inspect parsed JSON, including incomplete drafts; no byte parsing, execution or domain certification. */
export function inspectDocumentStructure(document: JsonValue, sourceRef = defaultSourceRef(document)): StructuralReport {
  const report = new ReportBuilder(sourceRef);
  const validate = validators.validateDocumentStructure!;
  const valid = validate(document);
  if (!valid) report.errors(validate.errors ?? []);
  const kind = object(document) && typeof document.kind === "string" ? document.kind : undefined;
  const name = kind !== undefined && Object.hasOwn(DOCUMENT_RECORDS, kind) ? DOCUMENT_RECORDS[kind] : undefined;
  const envelope = CATALOG_RECORDS.DocumentEnvelope!;
  const allowed = new Set([...envelope.fields.map(field => field.name), ...(name ? CATALOG_RECORDS[name]!.fields.map(field => field.name) : [])]);
  traceRecord("DocumentEnvelope", document, "", report, allowed);
  if (name) traceRecord(name, document, "", report, allowed);
  else report.unverified(kind === "registry" ? "RegistryDocument" : "UnknownDocumentBody", "", "No catalog body is available; only the common envelope is inspected.");
  report.unverified("SchemaVersionSemantics", "/schemaVersion", "Passing this profile does not certify the document's declared schema version or complete domain semantics.");
  return report.finish(valid);
}
