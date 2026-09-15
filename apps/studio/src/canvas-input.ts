import { zoomAt } from "./canvas-geometry.ts";
import type { Point, Viewport } from "./canvas-geometry.ts";

export function wheelViewport(view: Viewport, event: { deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }, point: Point, pageHeight: number): Viewport {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageHeight : 1;
  const dx = event.deltaX * unit, dy = event.deltaY * unit;
  if (event.ctrlKey || event.metaKey) return zoomAt(view, view.zoom * Math.exp(-Math.max(-500, Math.min(500, dy)) * .008), point);
  return { ...view, x: view.x - (event.shiftKey && !dx ? dy : dx), y: view.y - (event.shiftKey && !dx ? 0 : dy) };
}
export function pinchViewport(view: Viewport, start: readonly [Point, Point], current: readonly [Point, Point]): Viewport {
  const center = (points: readonly [Point, Point]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
  const distance = (points: readonly [Point, Point]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const origin = center(start), next = center(current), zoomed = zoomAt(view, view.zoom * distance(current) / Math.max(1, distance(start)), origin);
  return { ...zoomed, x: zoomed.x + next.x - origin.x, y: zoomed.y + next.y - origin.y };
}
