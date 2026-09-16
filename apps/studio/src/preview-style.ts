import { studioLengthPixels } from "../../../modules/ads-core/src/index.ts";
import type { StudioLength, StudioStyle } from "../../../modules/ads-core/src/index.ts";

/** Only inherited text properties cross the Part boundary; explicit leaf values win. */
export function inheritPreviewText(root: StudioStyle, part: StudioStyle): StudioStyle {
  return {
    ...(root.color === undefined ? {} : { color: root.color }),
    ...(root.fontSize === undefined ? {} : { fontSize: root.fontSize }),
    ...part,
  };
}

export function closeActionSize(category: "Web" | "Mobile", declaredHeight: StudioLength = 0): { minWidth: number; minHeight: StudioLength } {
  const minimum = category === "Web" ? 44 : 48;
  return { minWidth: minimum, minHeight: studioLengthPixels(declaredHeight) >= minimum ? declaredHeight : minimum };
}
