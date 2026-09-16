import { getFoundationRoleDefaultValue } from "../../../modules/ads-core/src/index.ts";
import type { FoundationTokenType, JsonValue } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Button, copy } from "./ui.tsx";
import { defaultTokenValue } from "./token-value-editor.tsx";

export function TokenSuggestions({ type, domain, roleId, locale, onChoose }: { type: FoundationTokenType; domain: string; roleId?: string; locale: Locale; onChoose(value: JsonValue): void }) {
  const color = (hex: string): JsonValue => ({ colorSpace: "srgb", components: [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255), alpha: 1 });
  const choices: { label: string; value: JsonValue }[] = type === "color" ? ["#8dfc52", "#2563eb", "#c52c40", "#ffffff", "#171717"].map(hex => ({ label: hex, value: color(hex) }))
    : type === "dimension" ? roleId === "border.width" ? [0, 1, 2, 3, 4].map(value => ({ label: `${value} px`, value: { value, unit: "px" } })) : (roleId?.startsWith("radius.") || domain.toLowerCase().includes("radius") ? [0, .125, .25, .5, .75, 1.25] : roleId === "typography.tracking" ? [-.025, 0, .025, .05, .1] : roleId === "typography.size" ? [.75, .875, 1, 1.25, 1.5, 2] : [.25, .5, .75, 1, 1.5, 2]).map(value => ({ label: `${value} rem`, value: { value, unit: "rem" } }))
    : type === "duration" ? [0, 100, 150, 200, 300, 500].map(value => ({ label: `${value} ms`, value: { value, unit: "ms" } }))
    : type === "fontWeight" ? [400, 500, 600, 700].map(value => ({ label: String(value), value }))
    : type === "fontFamily" ? ["Geist", "SUIT", "ui-monospace"].map(value => ({ label: value, value: [value, value === "ui-monospace" ? "monospace" : "sans-serif"] }))
    : type === "number" ? (roleId === "opacity.level" || domain.toLowerCase().includes("opacity") ? [0, .4, .64, 1] : roleId === "layer.order" ? [0, 10, 100, 1000] : [1, 1.25, 1.5, 1.75, 2]).map(value => ({ label: String(value), value }))
    : type === "cubicBezier" ? [{ label: "Standard", value: [.2, 0, 0, 1] }, { label: "Ease out", value: [0, 0, .2, 1] }, { label: "Linear", value: [0, 0, 1, 1] }]
    : [{ label: copy(locale, "기본 규격 사용", "Use the purpose default"), value: getFoundationRoleDefaultValue(roleId ?? "") ?? defaultTokenValue(type) }];
  return <div className="value-suggestions"><span className="field-hint">{copy(locale, "빠른 시작", "Quick values")}</span><div className="suggestion-chips">{choices.map(choice => <Button size="sm" key={choice.label} onClick={() => onChoose(choice.value)}>{type === "color" && <span className="suggestion-swatch" style={{ background: choice.label }} />}{choice.label}</Button>)}</div></div>;
}
