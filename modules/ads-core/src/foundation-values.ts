import type { JsonObject, JsonValue } from "./contracts.ts";
import type { FoundationTokenType } from "./foundation-contracts.ts";
import { FOUNDATION_CODES, FOUNDATION_COLOR_SPACES } from "./foundation-constants.ts";
import { FoundationCheck, fields, own, pointer, record } from "./foundation-internal.ts";

const WEIGHTS = new Set(["thin", "hairline", "extra-light", "ultra-light", "light", "normal", "regular", "book", "medium", "semi-bold", "demi-bold", "bold", "extra-bold", "ultra-bold", "black", "heavy", "extra-black", "ultra-black"]);
const STROKES = new Set(["solid", "dashed", "dotted", "double", "groove", "ridge", "outset", "inset"]);
const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const range = (value: unknown, min: number, max: number): boolean => numeric(value) && value >= min && value <= max;

/** Internal: consumes a detached bounded JSON snapshot, never the caller's object. */
export function checkFoundationValue(type: FoundationTokenType, value: JsonValue | undefined, path: string, check: FoundationCheck): void {
  check.step(path);
  if (typeof value === "string" && /^\{[^{}]+\}$/.test(value) || record(value) && (own(value, "$ref") || own(value, "ref") || own(value, "tokenRef"))) {
    check.error(path, "Nested DTCG/property aliases are not executable in this authoring profile; use a whole-token ADS ref.", FOUNDATION_CODES.UNSUPPORTED); return;
  }
  const invalid = (message: string): void => check.error(path, message, FOUNDATION_CODES.VALUE);
  const object = (required: readonly string[], optional: readonly string[] = []): JsonObject | undefined => {
    if (!record(value)) { invalid(`Expected a ${type} object.`); return; }
    fields(value, required, optional, path, check); return value;
  };
  const child = (item: JsonObject, key: string, expected: FoundationTokenType): void => checkFoundationValue(expected, item[key], pointer(path, key), check);
  switch (type) {
    case "number": if (!numeric(value)) invalid("Expected a finite number."); return;
    case "fontFamily":
      if (!(typeof value === "string" || Array.isArray(value) && value.every(item => typeof item === "string" && !/^\{[^{}]+\}$/.test(item)))) invalid("Expected a font name or an ordered array of font names."); return;
    case "fontWeight": if (!(range(value, 1, 1000) || typeof value === "string" && WEIGHTS.has(value))) invalid("Expected a font weight in [1,1000] or an exact DTCG weight alias."); return;
    case "dimension": case "duration": {
      const item = object(["value", "unit"]); if (!item) return;
      if (!numeric(item.value)) check.error(pointer(path, "value"), "Expected a finite numeric value.", FOUNDATION_CODES.VALUE);
      const units = type === "dimension" ? ["px", "rem"] : ["ms", "s"];
      if (typeof item.unit !== "string" || !units.includes(item.unit)) check.error(pointer(path, "unit"), `Expected an explicit ${units.join(" or ")} unit.`, FOUNDATION_CODES.VALUE);
      return;
    }
    case "cubicBezier":
      if (!(Array.isArray(value) && value.length === 4 && value.every(numeric) && range(value[0], 0, 1) && range(value[2], 0, 1))) invalid("Expected four finite coordinates; x coordinates must be in [0,1]."); return;
    case "color": {
      const item = object(["colorSpace", "components"], ["alpha", "hex"]); if (!item) return;
      if (typeof item.colorSpace !== "string" || !FOUNDATION_COLOR_SPACES.includes(item.colorSpace)) { check.error(pointer(path, "colorSpace"), "Expected one of the fourteen DTCG 2025.10 color spaces.", FOUNDATION_CODES.VALUE); return; }
      if (!Array.isArray(item.components) || item.components.length !== 3) check.error(pointer(path, "components"), "Expected exactly three color components.", FOUNDATION_CODES.VALUE);
      else item.components.forEach((component, index) => {
        if (component === "none") return;
        const space = item.colorSpace;
        let min = 0, max = 1, exclusive = false;
        if (space === "hsl" || space === "hwb") { max = index === 0 ? 360 : 100; exclusive = index === 0; }
        if (space === "lab" || space === "oklab") { min = index === 0 ? 0 : -Infinity; max = index === 0 ? space === "lab" ? 100 : 1 : Infinity; }
        if (space === "lch" || space === "oklch") { max = index === 0 ? space === "lch" ? 100 : 1 : index === 1 ? Infinity : 360; exclusive = index === 2; }
        if (!range(component, min, max) || exclusive && component === max) check.error(pointer(pointer(path, "components"), String(index)), "Color component is outside its declared space range.", FOUNDATION_CODES.VALUE);
      });
      if (own(item, "alpha") && !range(item.alpha, 0, 1)) check.error(pointer(path, "alpha"), "Alpha must be a number in [0,1].", FOUNDATION_CODES.VALUE);
      if (own(item, "hex") && !(typeof item.hex === "string" && /^#[0-9a-fA-F]{6}$/.test(item.hex))) check.error(pointer(path, "hex"), "Hex fallback must contain exactly six hexadecimal digits.", FOUNDATION_CODES.VALUE);
      return;
    }
    case "strokeStyle": {
      if (typeof value === "string") { if (!STROKES.has(value)) invalid("Unknown stroke style."); return; }
      const item = object(["dashArray", "lineCap"]); if (!item) return;
      if (!Array.isArray(item.dashArray)) check.error(pointer(path, "dashArray"), "Expected an array of dimensions.", FOUNDATION_CODES.VALUE);
      else item.dashArray.forEach((part, index) => checkFoundationValue("dimension", part, pointer(pointer(path, "dashArray"), String(index)), check));
      if (typeof item.lineCap !== "string" || !["round", "butt", "square"].includes(item.lineCap)) check.error(pointer(path, "lineCap"), "Unknown line cap.", FOUNDATION_CODES.VALUE);
      return;
    }
    case "border": {
      const item = object(["color", "width", "style"]); if (!item) return;
      child(item, "color", "color"); child(item, "width", "dimension"); child(item, "style", "strokeStyle"); return;
    }
    case "transition": {
      const item = object(["duration", "delay", "timingFunction"]); if (!item) return;
      child(item, "duration", "duration"); child(item, "delay", "duration"); child(item, "timingFunction", "cubicBezier"); return;
    }
    case "shadow": {
      if (Array.isArray(value)) { value.forEach((part, index) => { if (Array.isArray(part)) check.error(pointer(path, String(index)), "Shadow arrays cannot contain nested arrays.", FOUNDATION_CODES.VALUE); else checkFoundationValue("shadow", part, pointer(path, String(index)), check); }); return; }
      const item = object(["color", "offsetX", "offsetY", "blur", "spread"], ["inset"]); if (!item) return;
      child(item, "color", "color"); for (const key of ["offsetX", "offsetY", "blur", "spread"]) child(item, key, "dimension");
      if (own(item, "inset") && typeof item.inset !== "boolean") check.error(pointer(path, "inset"), "Inset must be boolean.", FOUNDATION_CODES.VALUE); return;
    }
    case "gradient": {
      if (!Array.isArray(value)) { invalid("Expected an array of gradient stops."); return; }
      value.forEach((part, index) => {
        const at = pointer(path, String(index)); check.step(at);
        if (!record(part)) { check.error(at, "Expected a literal gradient stop; nested aliases are unsupported.", FOUNDATION_CODES.VALUE); return; }
        fields(part, ["color", "position"], [], at, check);
        checkFoundationValue("color", part.color, pointer(at, "color"), check);
        if (!numeric(part.position)) check.error(pointer(at, "position"), "Expected a finite stop position.", FOUNDATION_CODES.VALUE);
        else if (!range(part.position, 0, 1)) check.warning(pointer(at, "position"), "DTCG rendering clamps this stop position to [0,1]; its original value is preserved.");
      }); return;
    }
    case "typography": {
      const item = object(["fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight"]); if (!item) return;
      child(item, "fontFamily", "fontFamily"); child(item, "fontSize", "dimension"); child(item, "fontWeight", "fontWeight"); child(item, "letterSpacing", "dimension"); child(item, "lineHeight", "number"); return;
    }
  }
}
