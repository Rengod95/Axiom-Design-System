import type { Diagnostic, JsonObject, JsonValue } from "./contracts.ts";
import { ID_PATTERN, RESERVED_IDS } from "./constants.ts";
import { FOUNDATION_CODES, MAX_FOUNDATION_DIAGNOSTICS } from "./foundation-constants.ts";
import { TypeBudget, TypeInputError, snapshotTypeInput, typePointer } from "./type-input.ts";

export const pointer = typePointer;
export const record = (value: unknown): value is JsonObject => value !== null && typeof value === "object" && !Array.isArray(value);
export const nonblank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
export const stableId = (value: unknown): value is string => typeof value === "string" && ID_PATTERN.test(value) && !RESERVED_IDS.has(value);
export const own = (value: object, key: string): boolean => Object.hasOwn(value, key);
/** Foundation validates a token graph and declared themes within the unchanged document byte/depth limits. */
export const MAX_FOUNDATION_STEPS = 1_048_576;
export class FoundationCheck {
  readonly diagnostics: Diagnostic[] = [];
  readonly budget = new TypeBudget(MAX_FOUNDATION_STEPS);
  valid = true;
  readonly sourceRef: string;
  constructor(sourceRef: string) { this.sourceRef = sourceRef; }
  step(path: string): void { this.budget.step(path); }
  error(path: string, message: string, code: string = FOUNDATION_CODES.INVALID): void {
    this.valid = false;
    if (this.diagnostics.length < MAX_FOUNDATION_DIAGNOSTICS - 1) this.diagnostics.push({ code, phase: "document", severity: "error", message, sourceRef: this.sourceRef, path });
    else if (this.diagnostics.length === MAX_FOUNDATION_DIAGNOSTICS - 1) this.diagnostics.push({ code: FOUNDATION_CODES.LIMIT, phase: "document", severity: "error", message: "Further Foundation diagnostics were omitted.", sourceRef: this.sourceRef, path });
  }
  warning(path: string, message: string, code: string = FOUNDATION_CODES.UNSUPPORTED): void {
    if (this.diagnostics.length < MAX_FOUNDATION_DIAGNOSTICS - 1) this.diagnostics.push({ code, phase: "document", severity: "warning", message, sourceRef: this.sourceRef, path });
  }
  caught(error: unknown): void {
    if (error instanceof TypeInputError) this.error(error.path, error.message.replaceAll("Type inspection", "Foundation inspection"), error.code);
    else this.error("", "Unable to inspect plain JSON Foundation data.");
  }
  snapshot(value: unknown, path = ""): JsonValue { return snapshotTypeInput(value, path, this.budget); }
}

export function fields(value: JsonObject, required: readonly string[], optional: readonly string[], path: string, check: FoundationCheck): void {
  for (const key of required) if (!own(value, key)) check.error(pointer(path, key), `Missing required field ${key}.`, FOUNDATION_CODES.VALUE);
  for (const key of Object.keys(value)) {
    check.step(pointer(path, key));
    if (!required.includes(key) && !optional.includes(key)) check.error(pointer(path, key), `Unsupported value field ${key}.`, FOUNDATION_CODES.VALUE);
  }
}
