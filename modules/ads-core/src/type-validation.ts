import { CODE, DIAGNOSTIC_PHASES, MAX_STRUCTURE_DIAGNOSTICS } from "./constants.ts";
import type { Diagnostic, JsonValue } from "./contracts.ts";
import type { TypeExpression, TypeValidationReport } from "./type-contracts.ts";
import { snapshotTypeInput, TypeBudget, TypeInputError, typePointer } from "./type-input.ts";
import validateGenerated from "./generated/type-expression.ts";

interface SchemaError {
  instancePath: string; keyword: string; message?: string;
  params: { missingProperty?: string; additionalProperty?: string; allowedValues?: unknown[] };
}
interface SchemaValidator { (value: JsonValue): boolean; errors?: SchemaError[] | null }
const validateSchema = validateGenerated as unknown as SchemaValidator;
const object = (value: JsonValue): value is Record<string, JsonValue> => value !== null && typeof value === "object" && !Array.isArray(value);

class TypeReport {
  readonly diagnostics: Diagnostic[] = [];
  valid = true;
  private truncated = false;
  private readonly sourceRef: string;
  constructor(sourceRef: string) { this.sourceRef = sourceRef; }
  add(code: string, path: string, message: string): void {
    this.valid = false;
    this.push(code, "error", path, message);
  }
  warning(path: string): void {
    this.push(CODE.DOMAIN_UNVERIFIED, "warning", path, "Additional record value is preserved without type interpretation.");
  }
  private push(code: string, severity: Diagnostic["severity"], path: string, message: string): void {
    if (this.diagnostics.length >= MAX_STRUCTURE_DIAGNOSTICS - 1) { this.truncated = true; return; }
    this.diagnostics.push({ code, severity, phase: DIAGNOSTIC_PHASES[code] ?? "document", sourceRef: this.sourceRef, path, message });
  }
  finish(): TypeValidationReport {
    if (this.truncated) this.diagnostics.push({ code: CODE.STRUCTURE_LIMIT, severity: "warning", phase: "document", sourceRef: this.sourceRef, path: "", message: "Further type/value diagnostics were omitted; validity still reflects all enforced constraints." });
    return { valid: this.valid, diagnostics: this.diagnostics };
  }
}

function declaration(value: JsonValue, path: string, report: TypeReport, budget: TypeBudget): TypeExpression | undefined {
  if (!validateSchema(value)) {
    for (const error of validateSchema.errors ?? []) {
      let at = path + error.instancePath;
      const property = error.params.missingProperty ?? error.params.additionalProperty;
      if (property !== undefined) at = typePointer(at, property);
      const unsupported = error.keyword === "enum" && error.instancePath.endsWith("/kind") && error.params.allowedValues?.includes("boolean");
      report.add(unsupported ? CODE.TYPE_UNSUPPORTED : CODE.TYPE_INVALID, at, unsupported ? "This TypeExpr kind is unsupported by the closed domain profile." : `Type declaration ${at || "/"}: ${error.message ?? error.keyword}.`);
    }
    return undefined;
  }
  const checked = value as unknown as TypeExpression;
  const visit = (type: TypeExpression, at: string): void => {
    budget.step(at);
    if (type.kind === "record") {
      type.required.forEach((key, index) => {
        budget.step(typePointer(at, "required"));
        if (!Object.hasOwn(type.fields, key)) report.add(CODE.TYPE_INVALID, typePointer(typePointer(at, "required"), String(index)), "A required field must be declared in fields.");
      });
      for (const [key, child] of Object.entries(type.fields)) visit(child, typePointer(typePointer(at, "fields"), key));
    } else if (type.kind === "list") visit(type.items, typePointer(at, "items"));
    else if (type.kind === "nullable") visit(type.inner, typePointer(at, "inner"));
  };
  visit(checked, path);
  return report.valid ? checked : undefined;
}

function match(type: TypeExpression, value: JsonValue, path: string, report: TypeReport, budget: TypeBudget, enums: Map<TypeExpression, Set<string>>): void {
  budget.step(path);
  const fail = (message: string): void => report.add(CODE.VALUE_INVALID, path, message);
  switch (type.kind) {
    case "boolean": case "string": case "number":
      if (typeof value !== type.kind) fail(`Expected a JSON ${type.kind}; implicit coercion is forbidden.`);
      return;
    case "enum": {
      let values = enums.get(type);
      if (!values) { values = new Set(); for (const item of type.values) { budget.step(path); values.add(item); } enums.set(type, values); }
      if (typeof value !== "string" || !values.has(value)) fail("Expected an exact declared enum string.");
      return;
    }
    case "nullable":
      if (value !== null) match(type.inner, value, path, report, budget, enums);
      return;
    case "list":
      if (!Array.isArray(value)) { fail("Expected an array of the declared item type."); return; }
      value.forEach((item, index) => match(type.items, item, typePointer(path, String(index)), report, budget, enums));
      return;
    case "record":
      if (!object(value)) { fail("Expected a JSON record."); return; }
      for (const key of type.required) {
        budget.step(path);
        if (!Object.hasOwn(value, key)) report.add(CODE.VALUE_INVALID, typePointer(path, key), "A required value is missing; nullable does not imply optional.");
      }
      for (const [key, item] of Object.entries(value)) {
        budget.step(path);
        if (Object.hasOwn(type.fields, key)) match(type.fields[key]!, item, typePointer(path, key), report, budget, enums);
        else if (type.additionalFields === "reject") report.add(CODE.VALUE_INVALID, typePointer(path, key), "This record rejects undeclared additional fields.");
        else report.warning(typePointer(path, key));
      }
  }
}

function inspect(type: unknown, sourceRef: string, path: string, supplied?: { value: unknown }): TypeValidationReport {
  const report = new TypeReport(sourceRef);
  const budget = new TypeBudget();
  try {
    const copiedType = snapshotTypeInput(type, path, budget);
    const checkedType = declaration(copiedType, path, report, budget);
    if (checkedType && supplied) {
      const copiedValue = snapshotTypeInput(supplied.value, path, budget);
      match(checkedType, copiedValue, path, report, budget, new Map());
    }
  } catch (error) {
    if (error instanceof TypeInputError) report.add(error.code, error.path, error.message);
    else report.add(CODE.JSON_INVALID, path, "The supplied value could not be inspected as plain JSON data.");
  }
  return report.finish();
}

/** Public unknown-input boundary, including declaration semantics beyond JSON Schema. */
export function inspectTypeExpression(type: unknown, sourceRef = "memory:type", path = ""): TypeValidationReport {
  return inspect(type, sourceRef, path);
}

/** Public unknown-input boundary. No values, defaults or extra fields are modified. */
export function inspectTypedValue(type: unknown, value: unknown, sourceRef = "memory:value", path = ""): TypeValidationReport {
  return inspect(type, sourceRef, path, { value });
}
