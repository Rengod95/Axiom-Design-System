import type { FoundationTokenRow } from "../../../modules/ads-core/src/index.ts";
import { object } from "./ui-utils.ts";
import { Icon } from "./icons.tsx";
import { specimenColor, specimenDimension, specimenShadow, specimenTypography } from "./token-visual.tsx";

export function TokenSpecimen({ token, domain = "" }: { token: FoundationTokenRow; domain?: string | undefined }) {
  const value = token.resolvedValue, type = token.typeRef.id;
  if (type === "color") return <i className="specimen-color" style={{ background: specimenColor(value) ?? "transparent" }} aria-hidden="true" />;
  if (type === "shadow") return <i className="specimen-shadow" aria-hidden="true" style={{ boxShadow: specimenShadow(value) }} />;
  if (type === "fontFamily" || type === "fontWeight" || type === "typography") { const style = specimenTypography(type, value); return <span className="specimen-type" aria-hidden="true" style={{ fontFamily: style.fontFamily, fontWeight: style.fontWeight }}>Aa</span>; }
  if (type === "dimension" && object(value)) return domain === "radius" ? <i className="specimen-radius" aria-hidden="true" style={{ borderRadius: Math.min(Math.max(0, specimenDimension(value)), 18) }} /> : <i className="specimen-measure" aria-hidden="true" style={{ width: Math.min(48, Math.max(4, specimenDimension(value))) }} />;
  if (type === "gradient" && Array.isArray(value)) return <i className="specimen-color" aria-hidden="true" style={{ background: `linear-gradient(110deg, ${value.filter(object).map(stop => `${specimenColor(stop.color) ?? "transparent"} ${Number(stop.position) * 100}%`).join(", ")})` }} />;
  return <Icon name="token" size={20} />;
}
