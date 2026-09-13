import type { FoundationTokenRow } from "../../../modules/ads-core/src/index.ts";
import { colorHex, object } from "./ui-utils.ts";
import { Icon } from "./icons.tsx";

export function TokenSpecimen({ token, domain = "" }: { token: FoundationTokenRow; domain?: string | undefined }) {
  const value = token.resolvedValue, type = token.typeRef.id;
  if (type === "color") return <i className="specimen-color" style={{ background: colorHex(value) ?? "transparent" }} aria-hidden="true" />;
  if (type === "shadow" && object(value)) return <i className="specimen-shadow" aria-hidden="true" style={{ boxShadow: `0 ${object(value.offsetY) ? Number(value.offsetY.value) : 2}px ${object(value.blur) ? Number(value.blur.value) : 8}px ${colorHex(value.color) ?? "#00000030"}` }} />;
  if (type === "fontFamily" || type === "fontWeight" || type === "typography") return <span className="specimen-type" aria-hidden="true" style={{ fontWeight: type === "fontWeight" && typeof value === "number" ? value : 500 }}>Aa</span>;
  if (type === "dimension" && object(value)) return domain === "radius" ? <i className="specimen-radius" aria-hidden="true" style={{ borderRadius: Math.min(Number(value.value), 18) }} /> : <i className="specimen-measure" aria-hidden="true" style={{ width: Math.min(48, Math.max(4, Number(value.value))) }} />;
  if (type === "gradient" && Array.isArray(value)) return <i className="specimen-color" aria-hidden="true" style={{ background: `linear-gradient(110deg, ${value.filter(object).map(stop => `${colorHex(stop.color) ?? "transparent"} ${Number(stop.position) * 100}%`).join(", ")})` }} />;
  return <Icon name="token" size={20} />;
}
