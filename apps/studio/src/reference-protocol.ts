import type { StudioComponent, StudioDesign } from "../../../modules/ads-core/src/index.ts";

export interface ReferencePartBox { id: string; x: number; y: number; width: number; height: number }
export interface ReferenceEdits { component: StudioComponent; design: StudioDesign }
export type ReferenceMount = (element: HTMLElement, sourceRow: number, options: { theme: "light" | "dark" }) => () => void;
export function referenceEnvelope(value: unknown): value is { channel: "axiom-reference"; nonce: string; type: string; [key: string]: unknown } {
  return typeof value === "object" && value !== null && "channel" in value && value.channel === "axiom-reference" && "nonce" in value && typeof value.nonce === "string" && "type" in value && typeof value.type === "string";
}
export function referenceBoxes(value: unknown): ReferencePartBox[] | null {
  if (!Array.isArray(value) || value.length > 256) return null;
  return value.every(box => box && typeof box.id === "string" && box.id.length <= 128 && [box.x, box.y, box.width, box.height].every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 32768) && box.width >= 0 && box.height >= 0) ? value : null;
}
