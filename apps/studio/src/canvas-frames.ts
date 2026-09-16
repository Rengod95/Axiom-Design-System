import { getStudioCatalogEntry, studioCatalogPresentation } from "../../../modules/ads-core/src/index.ts";
import type { StudioCategory, StudioComponent } from "../../../modules/ads-core/src/index.ts";
import type { Rect } from "./canvas-geometry.ts";

/** Default workspace arrangement is a view projection; saved frames always take precedence. */
export function canvasFrames(components: StudioComponent[], category: StudioCategory): Record<string, Rect> {
  const sizes = components.map(component => {
    if (component.catalog?.reference) return { width: category === "Mobile" ? 390 : 640, height: 520 };
    const entry = component.catalog && getStudioCatalogEntry(component.catalog.catalogId);
    const presentation = entry && component.catalog ? studioCatalogPresentation(entry, component.catalog.semantic.kind) : undefined;
    return { width: presentation ? category === "Mobile" ? Math.min(presentation.width, 320) : presentation.width : category === "Web" ? 360 : 320, height: presentation?.height ?? (component.archetype === "card" ? 260 : 224) };
  });
  const frames: Record<string, Rect> = {};
  let rowY = 0;
  for (let index = 0; index < components.length; index += 2) {
    let rowX = 0;
    for (let column = 0; column < 2; column++) {
      const component = components[index + column], size = sizes[index + column];
      if (!component || !size) continue;
      const saved = (category === "Web" ? component.web : component.mobile).editorFrame;
      frames[component.id] = saved ? { ...saved, height: saved.height ?? 260 } : { ...size, x: rowX, y: rowY };
      rowX += size.width + 72;
    }
    rowY += Math.max(sizes[index]!.height, sizes[index + 1]?.height ?? 0) + 84;
  }
  return frames;
}
