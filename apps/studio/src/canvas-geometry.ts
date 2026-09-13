export interface Point { x: number; y: number }
export interface Viewport extends Point { zoom: number }
export interface Rect extends Point { width: number; height: number }
export const MIN_ZOOM = 0.1, MAX_ZOOM = 4;
export function clampZoom(value: number): number { return Number.isFinite(value) ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)) : 1; }
export function canvasPoint(point: Point, view: Viewport): Point { return { x: (point.x - view.x) / view.zoom, y: (point.y - view.y) / view.zoom }; }
/** Keep the world point underneath the pointer fixed when zoom changes. */
export function zoomAt(view: Viewport, zoom: number, pointer: Point): Viewport {
  const next = clampZoom(zoom), world = canvasPoint(pointer, view);
  return { zoom: next, x: pointer.x - world.x * next, y: pointer.y - world.y * next };
}
export function unionBounds(rectangles: Rect[]): Rect | null {
  if (!rectangles.length) return null;
  const x = Math.min(...rectangles.map(rect => rect.x)), y = Math.min(...rectangles.map(rect => rect.y));
  return { x, y, width: Math.max(...rectangles.map(rect => rect.x + rect.width)) - x, height: Math.max(...rectangles.map(rect => rect.y + rect.height)) - y };
}
export function fitBounds(bounds: Rect | null, size: { width: number; height: number }, padding = 64): Viewport {
  if (!bounds || size.width <= 0 || size.height <= 0) return { x: padding, y: padding, zoom: 1 };
  const zoom = clampZoom(Math.min((Math.max(size.width - padding * 2, 1)) / Math.max(bounds.width, 1), Math.max(size.height - padding * 2, 1) / Math.max(bounds.height, 1), 1));
  return { zoom, x: (size.width - bounds.width * zoom) / 2 - bounds.x * zoom, y: (size.height - bounds.height * zoom) / 2 - bounds.y * zoom };
}
export function intersects(a: Rect, b: Rect): boolean { return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y; }
export function snap(value: number, enabled: boolean, increment = 8): number { return enabled ? Math.round(value / increment) * increment : value; }
