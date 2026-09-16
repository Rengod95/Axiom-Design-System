import type { StudioComponent, StudioDesign, StudioLength, StudioProjection, StudioStyle } from "../../ads-core/src/index.ts";
import { studioLengthPixels } from "../../ads-core/src/index.ts";
import { TARGET_CODE } from "./constants.ts";
import { TargetError } from "./target-error.ts";
import { inspectCatalogTarget } from "./catalog-capabilities.ts";
import type { TargetId } from "./contracts.ts";

const COLOR_PATTERN = /^rgba\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/;
const SAFE_SYMBOL = /^[A-Za-z][A-Za-z0-9_]*$/;
const LENGTH_PROPERTIES = new Set(["borderWidth", "borderRadius", "fontSize", "letterSpacing"]);

/** Convert a separate native projection; raw token data and the adopted source snapshot remain unchanged. */
export function nativeLengthProjection(projection: StudioProjection, rootFontSize: number): StudioProjection {
  const copy = structuredClone(projection);
  for (const component of copy.components) for (const design of [component.web, component.mobile]) {
    for (const part of Object.values(design.parts)) for (const style of [part.base, part.outlined, part.disabled, part.pressed, ...Object.values(part.combinations)]) {
      for (const [key, value] of Object.entries(style)) if (LENGTH_PROPERTIES.has(key)) Object.assign(style, { [key]: studioLengthPixels(value as StudioLength, rootFontSize) });
    }
    for (const layout of Object.values(design.layout)) for (const field of ["gap", "padding", "minHeight"] as const) layout[field] = studioLengthPixels(layout[field], rootFontSize);
  }
  for (const component of copy.components) {
    const root = component.parts.find(part => part.role === "root");
    if (component.archetype === "button" && root && studioLengthPixels(component.mobile.layout[root.id]?.minHeight ?? 0) < 44) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Native rem conversion would reduce the Button target below 44 logical units; increase its minimum height or root font basis", root.id);
  }
  return copy;
}

/** Stable identity determines exported identifiers; display names remain escaped data. */
export function componentSymbol(component: StudioComponent): string {
  const name = `Axiom_${component.id.replace(/[^A-Za-z0-9_]/g, "_")}`;
  if (!SAFE_SYMBOL.test(name)) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Component identity cannot map to a portable source identifier", component.id);
  return name;
}

/** Convert the explicitly selected sRGB projection without guessing color spaces. */
export function colorChannels(color: string): [number, number, number, number] {
  const match = COLOR_PATTERN.exec(color);
  if (!match) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Target requires an explicit sRGB rgba color");
  const values = match.slice(1).map(Number);
  if (values.some((value, index) => !Number.isFinite(value) || value < 0 || value > (index === 3 ? 1 : 255))) throw new TargetError(TARGET_CODE.UNSUPPORTED, "sRGB color is outside its representable range");
  return [values[0]! / 255, values[1]! / 255, values[2]! / 255, values[3]!];
}

/** Reject unsupported part structure and conversion before emitting any target files. */
export function inspectGeneratorProjection(projection: StudioProjection, target: TargetId): void {
  if (!projection.valid || !projection.foundation.valid || projection.components.length === 0) throw new TargetError(TARGET_CODE.INVALID, "Source project has no valid executable Studio projection");
  const symbols = new Set<string>();
  for (const component of projection.components) {
    if (component.archetype === "catalog") inspectCatalogTarget(component, target);
    const symbol = componentSymbol(component);
    if (symbols.has(symbol)) throw new TargetError(TARGET_CODE.INVALID, "Component identifiers collide in source output", component.id);
    symbols.add(symbol);
    const roots = component.parts.filter((part) => part.role === "root");
    if (roots.length !== 1 || !component.catalog && component.parts.some((part) => part.role !== "root" && part.parent !== roots[0]!.id)) throw new TargetError(TARGET_CODE.UNSUPPORTED, "This target profile requires one root with direct semantic parts", component.id);
    for (const design of [target === "react" ? component.web : component.mobile]) for (const part of component.parts) {
      const presentation = design.parts[part.id]; const layout = design.layout[part.id];
      if (!presentation) throw new TargetError(TARGET_CODE.INVALID, "Design lacks an expected part", part.id);
      for (const style of Object.values(presentation.combinations)) for (const [property, value] of Object.entries(style)) {
        const extended = ["fontFamily", "fontWeight", "lineHeight", "letterSpacing", "boxShadow", "backgroundImage", "borderStyle", "transitionDuration", "transitionTimingFunction", "transitionDelay"].includes(property);
        if (extended) { if (target !== "react") throw new TargetError(TARGET_CODE.UNSUPPORTED, "Extended token-bound paint needs a native mapping before output", part.id); continue; }
        if (["background", "color", "borderColor"].includes(property)) { if (typeof value !== "string") throw new TargetError(TARGET_CODE.INVALID, "Color declaration must be resolved", part.id); colorChannels(value); }
        else if (LENGTH_PROPERTIES.has(property)) { try { if (studioLengthPixels(value as StudioLength) < 0) throw new Error(); } catch { throw new TargetError(TARGET_CODE.UNSUPPORTED, "Visual length requires bounded px or rem", part.id); } }
        else if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Visual declaration cannot be represented", part.id);
      }
      if (layout && [layout.gap, layout.padding, layout.minHeight].some(value => studioLengthPixels(value) < 0)) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Layout requires nonnegative logical dimensions", part.id);
    }
  }
}

/** Resolve authored variant/state precedence without changing the component contract. */
export function partStyle(design: StudioDesign, partId: string, outlined = false, disabled = false, pressed = false): StudioStyle {
  const part = design.parts[partId];
  if (!part) throw new TargetError(TARGET_CODE.INVALID, "Missing design part", partId);
  const key = `${outlined ? "outlined" : "filled"}${disabled ? "-disabled" : pressed ? "-pressed" : ""}` as keyof typeof part.combinations;
  return { ...part.combinations[key] };
}

/** Produce a quoted literal accepted by Swift and Kotlin as well as JSON for the supported Unicode text. */
export function sourceLiteral(text: string, target: "swift" | "kotlin"): string {
  let result='"';
  for(const character of text){const code=character.codePointAt(0)!;
    if(code>=0xd800&&code<=0xdfff)throw new TargetError(TARGET_CODE.UNSUPPORTED,"Native source text contains an unpaired surrogate");
    if(character==='"')result+='\\"';else if(character==='\\')result+='\\\\';else if(character==='\n')result+='\\n';else if(character==='\r')result+='\\r';else if(character==='\t')result+='\\t';else if(character==='$'&&target==='kotlin')result+='\\$';
    else if(code<0x20||code===0x7f||code===0x2028||code===0x2029)result+=target==='swift'?`\\u{${code.toString(16)}}`:`\\u${code.toString(16).padStart(4,'0')}`;
    else result+=character;
  }
  return result+'"';
}
