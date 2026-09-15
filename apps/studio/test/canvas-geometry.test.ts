import assert from "node:assert/strict";
import test from "node:test";
import { canvasPoint, fitBounds, intersects, unionBounds, zoomAt } from "../src/canvas-geometry.ts";

test("wheel zoom preserves the pointer's document coordinate at arbitrary pan and at zoom limits", () => {
  const view = { x: -320, y: 78, zoom: 0.7 }, pointer = { x: 563, y: 299 };
  for (const level of [0.01, 0.2, 1, 3, 100]) {
    const next = zoomAt(view, level, pointer), before = canvasPoint(pointer, view), after = canvasPoint(pointer, next);
    assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
    assert.ok(next.zoom >= 0.1 && next.zoom <= 4);
  }
});
test("fit includes negative-positioned objects and does not scale toolbar geometry", () => {
  const bounds = unionBounds([{ x: -400, y: 50, width: 300, height: 240 }, { x: 200, y: -60, width: 420, height: 500 }])!;
  const view = fitBounds(bounds, { width: 800, height: 600 });
  assert.ok(bounds.x * view.zoom + view.x >= 63.99);
  assert.ok((bounds.x + bounds.width) * view.zoom + view.x <= 736.01);
  assert.equal(intersects(bounds, { x: -500, y: 0, width: 101, height: 100 }), true);
  assert.equal(intersects(bounds, { x: 900, y: 0, width: 20, height: 20 }), false);
});
