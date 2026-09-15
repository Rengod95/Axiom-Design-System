import type { Point, Rect } from "./canvas-geometry.ts";
import { snap } from "./canvas-geometry.ts";

export type DrawingTool = "box" | "frame" | "text";

/** Document-space geometry shared by the rubber band and the committed element. */
export function drawingRect(start: Point, end: Point, origin: Point, options: { snap: boolean; square: boolean }): Rect {
  let dx = end.x - start.x, dy = end.y - start.y;
  if (options.square) { const length = Math.max(Math.abs(dx), Math.abs(dy)); dx = (dx < 0 ? -1 : 1) * length; dy = (dy < 0 ? -1 : 1) * length; }
  return {
    x: Math.max(0, Math.min(4096, snap(Math.min(start.x, start.x + dx) - origin.x, options.snap))),
    y: Math.max(0, Math.min(4096, snap(Math.min(start.y, start.y + dy) - origin.y, options.snap))),
    width: Math.max(1, Math.min(4096, snap(Math.abs(dx), options.snap))),
    height: Math.max(1, Math.min(4096, snap(Math.abs(dy), options.snap))),
  };
}

export function drawingMoved(start: Point, end: Point, zoom: number): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) * zoom >= 4;
}
