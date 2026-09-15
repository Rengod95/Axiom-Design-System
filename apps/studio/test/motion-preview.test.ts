import test from "node:test";
import assert from "node:assert/strict";
import { MotionPreview } from "../src/motion-preview.ts";
import type { ResolvedStudioMotion } from "../../../modules/ads-core/src/index.ts";

const track: ResolvedStudioMotion = { id: "motion.1", targetPartRef: "part.1", trigger: "enter", property: "opacity", keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 1 }], durationMs: 240, delayMs: 20, easing: "linear", interruption: "finish-then-next", reducedAlternative: { kind: "snap", value: .8 } };
function surface() {
  const calls: { frames: Keyframe[]; options: KeyframeAnimationOptions; animation: { playState: string; currentTime: number; onfinish: (() => void) | null; cancel(): void; pause(): void; play(): void } }[] = [];
  const target = { dataset: { partId: "part.1" }, animate(frames: Keyframe[], options: KeyframeAnimationOptions) { const animation = { playState: "running", currentTime: 0, onfinish: null as (() => void) | null, cancel() { this.playState = "idle"; }, pause() { this.playState = "paused"; }, play() { this.playState = "running"; } }; calls.push({ frames, options, animation }); return animation; } };
  return { root: { querySelectorAll: () => [target] } as unknown as Element, calls };
}
test("motion finish queue keeps one pending replay; seek and reset cancel pending work and handles", () => {
  const { root, calls } = surface(), player = new MotionPreview();
  player.play(root, [track]); player.play(root, [track]); player.play(root, [track]); assert.equal(calls.length, 1);
  calls[0]!.animation.playState = "finished"; calls[0]!.animation.onfinish?.(); assert.equal(calls.length, 2);
  player.seek(120); assert.equal(player.time, 120); assert.equal(calls[1]!.animation.playState, "paused"); player.resume(); assert.equal(calls[1]!.animation.playState, "running"); player.reset(); assert.ok(calls.every(call => call.animation.playState === "idle")); assert.equal(player.time, 0);
});
test("reduced motion uses its alternative with no delay, and snap interruption reaches the new endpoint immediately", () => {
  const { root, calls } = surface(), player = new MotionPreview();
  player.play(root, [track], true); assert.equal(calls[0]!.options.duration, 0); assert.equal(calls[0]!.options.delay, 0); assert.deepEqual(calls[0]!.frames.map(frame => frame.opacity), [.8, .8]); player.reset();
  player.play(root, [track]); player.play(root, [{ ...track, interruption: "snap" }]); assert.equal(calls.at(-1)!.options.duration, 0); assert.deepEqual(calls.at(-1)!.frames.map(frame => frame.opacity), [1, 1]); player.reset();
});
