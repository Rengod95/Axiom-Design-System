/** The canvas receives hex sRGB backgrounds. Unknown/translucent paint must inherit Studio appearance. */
export function previewBackgroundLuminance(background: string | undefined): number | null {
  if (!background) return null;
  const match = /^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/iu.exec(background.trim());
  if (!match) return null;
  const value = match[1]!;
  const hex = value.length <= 4 ? [...value].map(channel => channel.repeat(2)).join("") : value;
  // No underlying paint is available to composite transparency against.
  if (hex.length === 8 && hex.slice(6).toLowerCase() !== "ff") return null;
  const channels = [0, 2, 4].map(index => {
    const srgb = parseInt(hex.slice(index, index + 2), 16) / 255;
    return srgb <= .04045 ? srgb / 12.92 : ((srgb + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0]! + .7152 * channels[1]! + .0722 * channels[2]!;
}

export function referenceThemeForBackground(background: string | undefined): "light" | "dark" | null {
  const luminance = previewBackgroundLuminance(background);
  if (luminance === null) return null;
  // Contrast crossover: (L + .05) / .05 === 1.05 / (L + .05).
  return luminance >= Math.sqrt(.0525) - .05 ? "light" : "dark";
}
