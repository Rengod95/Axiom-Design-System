import assert from "node:assert/strict";
import { test } from "node:test";
import { canvasPoint } from "../src/canvas-geometry.ts";
import { drawingMoved, drawingRect } from "../src/canvas-drawing.ts";

test("drawing inside a nested parent preserves local geometry at every canvas zoom", () => {
  for (const zoom of [.1, .5, 1, 2, 4]) {
    const view = { x: -240, y: 83, zoom }, origin = { x: 170, y: 210 };
    const screen = (x: number, y: number) => ({ x: x * zoom + view.x, y: y * zoom + view.y });
    const start = canvasPoint(screen(200, 250), view), end = canvasPoint(screen(320, 330), view);
    const rect = drawingRect(start, end, origin, { snap: false, square: false });
    for (const [field, expected] of Object.entries({ x: 30, y: 40, width: 120, height: 80 })) assert.ok(Math.abs(rect[field as keyof typeof rect] - expected) < 1e-9);
  }
});

test("reverse and constrained drawing keep a stable origin and bounded sizes", () => {
  assert.deepEqual(drawingRect({ x: 200, y: 180 }, { x: 104, y: 140 }, { x: 80, y: 64 }, { snap: true, square: true }), { x: 24, y: 24, width: 96, height: 96 });
  assert.deepEqual(drawingRect({ x: -40, y: -40 }, { x: 8000, y: 8000 }, { x: 0, y: 0 }, { snap: false, square: false }), { x: 0, y: 0, width: 4096, height: 4096 });
  assert.equal(drawingMoved({ x: 0, y: 0 }, { x: 5, y: 0 }, .5), false);
  assert.equal(drawingMoved({ x: 0, y: 0 }, { x: 2, y: 0 }, 2), true);
});
