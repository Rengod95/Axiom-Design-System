import type { StudioCategory, StudioComponent, StudioStyle } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Button, copy } from "./ui.tsx";

/** Report only a computable opaque authored pair, not inferred compositing or AT certification. */
export function authoredContrast(foreground: string | undefined, background: string | undefined): number | null {
  const luminance = (value: string | undefined) => {
    const match = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*1\)$/.exec(value ?? "");
    if (!match) return null;
    const channels = match.slice(1).map(channel => { const c = Number(channel) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
    return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722;
  };
  const a = luminance(foreground), b = luminance(background); return a === null || b === null ? null : (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
export function AccessibilityInsight({ component, category, partId, locale, onSelect }: { component: StudioComponent; category: StudioCategory; partId: string; locale: Locale; onSelect?(id: string): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en), design = category === "Web" ? component.web : component.mobile;
  let part = component.parts.find(part => part.id === partId); const ancestry = [];
  while (part) { ancestry.unshift(part); part = component.parts.find(candidate => candidate.id === part!.parent); }
  const style = Object.assign({}, ...ancestry.map(part => design.parts[part.id]?.base ?? {})) as StudioStyle;
  const contrast = style.backgroundImage ? null : authoredContrast(style.color, style.background);
  return <div className="a11y-insight"><div className="property-group"><span className="field-label">{t("선택한 Part · 텍스트 대비", "Selected Part · text contrast")}</span><output data-testid="authored-contrast">{contrast === null ? t("합성 배경은 별도 확인 필요", "Composite background needs a separate check") : `${contrast.toFixed(2)} : 1`}</output><p className="field-hint">{t("저장된 불투명 색상 쌍의 계산값입니다. 실제 글자 크기·상태·배경을 함께 확인하세요.", "Calculated from authored opaque colors. Check actual type size, state and background together.")}</p></div><div className="property-group"><span className="field-label">{t("읽기 순서", "Reading order")}</span><ol className="reading-order">{component.parts.map((part, index) => <li key={part.id}><Button size="sm" tone="subtle" aria-pressed={part.id === partId} onClick={() => onSelect?.(part.id)}>{index + 1}. {part.name}</Button></li>)}</ol><p className="field-hint">{t("Part의 앞/뒤 순서와 부모를 바꾸면 읽기 순서도 함께 갱신됩니다.", "Moving or reparenting Parts updates the reading order with the structure.")}</p></div></div>;
}
