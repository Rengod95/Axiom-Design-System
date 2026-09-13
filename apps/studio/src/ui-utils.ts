import type { JsonObject, JsonValue } from "../../../modules/ads-core/src/index.ts";

export function object(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
export function colorHex(value: unknown): string | null {
  if (!object(value) || value.colorSpace !== "srgb" || !Array.isArray(value.components) || value.components.length !== 3 || !value.components.every(channel => typeof channel === "number" && Number.isFinite(channel) && channel >= 0 && channel <= 1)) return null;
  return `#${value.components.map(channel => Math.round(Number(channel) * 255).toString(16).padStart(2, "0")).join("")}`;
}
export function hexColor(hex: string, previous: JsonValue): JsonObject | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const components = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return { ...(object(previous) ? previous : {}), colorSpace: "srgb", components, alpha: object(previous) && typeof previous.alpha === "number" ? previous.alpha : 1 };
}
export function downloadText(name: string, text: string, type = "application/json"): void { downloadBlob(name, new Blob([text], { type })); }
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.rel = "noopener"; document.body.append(anchor); anchor.click(); anchor.remove();
  // The browser may consume the URL after the initiating click returns.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export function editingTarget(target: EventTarget | null): boolean { return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)); }
