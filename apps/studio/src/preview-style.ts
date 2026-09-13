import type { StudioStyle } from "../../../modules/ads-core/src/index.ts";

/** Only inherited text properties cross the Part boundary; explicit leaf values win. */
export function inheritPreviewText(root: StudioStyle, part: StudioStyle): StudioStyle {
  return {
    ...(root.color === undefined ? {} : { color: root.color }),
    ...(root.fontSize === undefined ? {} : { fontSize: root.fontSize }),
    ...part,
  };
}

export function closeActionSize(category: "Web" | "Mobile", declaredHeight = 0): { minWidth: number; minHeight: number } {
  const minimum = category === "Web" ? 44 : 48;
  return { minWidth: minimum, minHeight: Math.max(minimum, declaredHeight) };
}
