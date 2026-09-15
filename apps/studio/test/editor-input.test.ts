import test from "node:test";
import assert from "node:assert/strict";
import { DraftRegistry } from "../src/draft-registry.ts";
import { pinchViewport, wheelViewport } from "../src/canvas-input.ts";

test("review flushes valid forms, preflights invalid input, and reset releases all pending local forms", () => {
  const registry = new DraftRegistry(); let applies = 0, focuses = 0, resets = 0;
  registry.set({ id: "token", label: "Token", dirty: true, valid: true, apply: () => { applies++; return true; }, focus: () => focuses++, reset: () => resets++ });
  registry.set({ id: "part", label: "Part", dirty: true, valid: false, apply: () => { applies++; return true; }, focus: () => focuses++, reset: () => resets++ });
  assert.equal(registry.flush(), false); assert.equal(applies, 0); assert.equal(focuses, 1); registry.resetAll(); assert.equal(resets, 2);
  registry.remove("part"); assert.equal(registry.flush(), true); assert.equal(applies, 1); assert.equal(registry.getSnapshot().length, 0); assert.equal(registry.flush(), true); assert.equal(applies, 1);
});
test("rejected apply stays focusable and retryable without hiding its draft", () => {
  const registry = new DraftRegistry(); let accept = false;
  registry.set({ id: "a", label: "A", dirty: true, valid: true, apply: () => accept, focus() {}, reset() {} });
  assert.equal(registry.flush(), false); assert.equal(registry.getSnapshot().length, 1); accept = true; assert.equal(registry.flush(), true); assert.equal(registry.getSnapshot().length, 0);
});
test("trackpad control-wheel preserves the anchor; scroll units and two-finger pan+pinch are normalized", () => {
  const view = { x: 30, y: 40, zoom: 1 }, anchor = { x: 240, y: 160 }, event = { deltaX: 0, deltaY: -30, deltaMode: 0, ctrlKey: true, metaKey: false, shiftKey: false };
  const next = wheelViewport(view, event, anchor, 800); assert.ok(next.zoom > 1); assert.ok(Math.abs((anchor.x - view.x) / view.zoom - (anchor.x - next.x) / next.zoom) < 1e-9);
  const line = wheelViewport(view, { ...event, ctrlKey: false, deltaY: 2, deltaMode: 1 }, anchor, 800); assert.equal(line.y, 8);
  const pinch = pinchViewport(view, [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 20, y: 10 }, { x: 220, y: 10 }]); assert.equal(pinch.zoom, 2); assert.equal(pinch.y, 90);
});
