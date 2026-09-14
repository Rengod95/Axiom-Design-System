import type { Diagnostic, JsonObject, JsonValue } from "./contracts.ts";
import type { FoundationResolution } from "./foundation-contracts.ts";
import { isObject, isValidId } from "./documents.ts";
import { isStudioTokenCompatible } from "./studio-style-values.ts";
import { STUDIO_ERROR } from "./studio-constants.ts";
import { KernelError } from "./kernel-error.ts";

export interface StudioMotionTrack {
  id: string; targetPartRef: string; trigger: "enter" | "exit" | "state";
  property: "opacity" | "translateY" | "scale";
  keyframes: { offset: number; value: number }[];
  timing: { kind: "tween"; duration: JsonValue; easing: JsonValue } | { kind: "spring"; stiffness: number; damping: number; mass: number };
  delay: JsonValue;
  interruption: "finish-then-next" | "replace-from-current" | "snap";
  reducedAlternative: { kind: "snap"; value: number };
}
export interface ResolvedStudioMotion extends Omit<StudioMotionTrack, "timing" | "delay"> { durationMs: number; delayMs: number; easing: string }
const keys = (value: JsonObject, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
const number = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

/** Spring simulation has fixed integration, finite budget and no executable user expressions. */
export function sampleStudioSpring(stiffness: number, damping: number, mass: number): { durationMs: number; samples: { offset: number; value: number }[] } {
  if (!number(stiffness, 1, 1000) || !number(damping, 1, 100) || !number(mass, .1, 10)) throw new Error("Spring parameters exceed the supported range.");
  const samples = [{ offset: 0, value: 0 }]; let position = 0, velocity = 0, steps = 0;
  for (; steps < 1200; steps++) {
    velocity += (-stiffness * (position - 1) - damping * velocity) / mass / 120;
    position += velocity / 120;
    if (!Number.isFinite(position) || Math.abs(position) > 100) throw new Error("The spring does not converge in the simulation budget.");
    if (steps % 4 === 3) samples.push({ offset: (steps + 1) / 120, value: position });
    if (Math.abs(position - 1) < .001 && Math.abs(velocity) < .001) { steps++; break; }
  }
  if (steps >= 1200) throw new Error("The spring must settle within ten seconds.");
  const seconds = steps / 120;
  return { durationMs: seconds * 1000, samples: [...samples.filter(sample => sample.offset < seconds).map(sample => ({ offset: sample.offset / seconds, value: sample.value })), { offset: 1, value: 1 }] };
}

export function inspectStudioMotion(document: JsonObject, add: (path: string, message: string) => void): void {
  if (!Array.isArray(document.motion) || document.motion.length > 16) { add("/motion", "Use at most 16 motion definitions."); return; }
  const parts = Array.isArray(document.parts) ? document.parts.filter(isObject) : [], seen = new Set<string>();
  for (const [index, value] of document.motion.entries()) {
    const fail = (message: string) => add(`/motion/${index}`, message);
    if (!isObject(value) || !keys(value, ["id", "targetPartRef", "trigger", "property", "keyframes", "timing", "delay", "interruption", "reducedAlternative"]) || !isValidId(value.id) || !parts.some(part => part.id === value.targetPartRef) || !["enter", "exit", "state"].includes(String(value.trigger)) || !["opacity", "translateY", "scale"].includes(String(value.property))) { fail("Invalid motion identity, target, trigger or typed property."); continue; }
    const key = `${value.targetPartRef}/${value.trigger}/${value.property === "opacity" ? "opacity" : "transform"}`;
    if (seen.has(key)) fail("One motion owns each target property channel per trigger."); seen.add(key);
    const range = value.property === "opacity" ? [0, 1] : value.property === "scale" ? [.01, 10] : [-4096, 4096];
    if (!Array.isArray(value.keyframes) || value.keyframes.length < 2 || value.keyframes.length > 32) fail("Use 2–32 ordered keyframes.");
    else { let previous = -1; for (const frame of value.keyframes) { if (!isObject(frame) || !keys(frame, ["offset", "value"]) || !number(frame.offset, 0, 1) || frame.offset <= previous || !number(frame.value, range[0]!, range[1]!)) fail("Keyframes require unique increasing offsets and bounded typed values."); if (isObject(frame) && typeof frame.offset === "number") previous = frame.offset; } if (!isObject(value.keyframes[0]) || value.keyframes[0].offset !== 0 || !isObject(value.keyframes.at(-1)) || (value.keyframes.at(-1) as JsonObject).offset !== 1) fail("Keyframes start at zero and end at one."); }
    if (!isObject(value.timing)) fail("Choose a typed tween or spring timing.");
    else if (value.timing.kind === "spring") { if (!keys(value.timing, ["kind", "stiffness", "damping", "mass"])) fail("Unknown spring field."); try { if (!number(value.timing.stiffness, 1, 1000) || !number(value.timing.damping, 1, 100) || !number(value.timing.mass, .1, 10)) throw new Error("Spring parameters must be finite numbers."); sampleStudioSpring(value.timing.stiffness, value.timing.damping, value.timing.mass); } catch (error) { fail(String(error)); } if (Array.isArray(value.keyframes) && value.keyframes.length !== 2) fail("Spring timing interpolates two endpoints."); }
    else if (value.timing.kind !== "tween" || !keys(value.timing, ["kind", "duration", "easing"])) fail("Invalid tween timing.");
    if (!["finish-then-next", "replace-from-current", "snap"].includes(String(value.interruption))) fail("Unsupported interruption policy.");
    if (!isObject(value.reducedAlternative) || !keys(value.reducedAlternative, ["kind", "value"]) || value.reducedAlternative.kind !== "snap" || !number(value.reducedAlternative.value, range[0]!, range[1]!)) fail("A reduced-motion snap value is required.");
  }
}
export function resolveStudioMotion(document: JsonObject, foundation: FoundationResolution, diagnostics: Diagnostic[], use: (tokenId: string, partId: string, path: string) => void = () => {}): ResolvedStudioMotion[] {
  const tokens = new Map(foundation.tokens.map(token => [token.id, token]));
  let currentPart = "", currentPath = "";
  const resolve = (source: JsonValue, type: string): JsonValue => {
    if (!isObject(source) || !Object.hasOwn(source, "tokenRef")) return source;
    const token = typeof source.tokenRef === "string" && tokens.get(source.tokenRef);
    if (Object.keys(source).length !== 1 || !token || token.type !== type) throw new Error(`Motion requires an existing ${type} token.`);
    if (!isStudioTokenCompatible(token, type === "duration" ? "motionDuration" : "motionEasing")) throw new KernelError(STUDIO_ERROR.tokenBinding, `Token ${token.name} belongs to ${token.bindingCategory}, which cannot bind motion timing. Choose a motion token or correct its domain purpose.`);
    for (const id of new Set([token.id, ...token.aliasChain])) use(id, currentPart, currentPath);
    return token.value;
  };
  const duration = (source: JsonValue): number => { const value = resolve(source, "duration"); if (!isObject(value) || !keys(value, ["value", "unit"]) || !["ms", "s"].includes(String(value.unit)) || !number(value.value, 0, value.unit === "s" ? 10 : 10000)) throw new Error("Motion duration must be between zero and ten seconds."); return Number(value.value) * (value.unit === "s" ? 1000 : 1); };
  const easing = (source: JsonValue): string => { const value = resolve(source, "cubicBezier"); if (!Array.isArray(value) || value.length !== 4 || value.some((numberValue, index) => !number(numberValue, index % 2 ? -100 : 0, index % 2 ? 100 : 1))) throw new Error("Motion easing requires four cubic-bezier coordinates."); return `cubic-bezier(${value.join(",")})`; };
  const result: ResolvedStudioMotion[] = [];
  for (const [index, track] of (document.motion as unknown as StudioMotionTrack[] ?? []).entries()) try {
    currentPart = track.targetPartRef; currentPath = `/motion/${index}`;
    const delayMs = duration(track.delay);
    if (track.timing.kind === "tween") result.push({ ...track, durationMs: duration(track.timing.duration), delayMs, easing: easing(track.timing.easing) });
    else { const spring = sampleStudioSpring(track.timing.stiffness, track.timing.damping, track.timing.mass), from = track.keyframes[0]!.value, to = track.keyframes.at(-1)!.value;
      result.push({ ...track, durationMs: spring.durationMs, delayMs, easing: "linear", keyframes: spring.samples.map(sample => ({ offset: sample.offset, value: track.property === "opacity" ? Math.max(0, Math.min(1, from + (to - from) * sample.value)) : from + (to - from) * sample.value })) });
    }
  } catch (error) { diagnostics.push({ code: error instanceof KernelError ? error.code : "STUDIO_MOTION_INVALID", severity: "error", phase: "document", sourceRef: String(document.id), path: `/motion/${index}`, message: error instanceof Error ? error.message : "Invalid motion." }); }
  return result;
}
