import { useMemo, useState } from "react";
import { FOUNDATION_STARTER_DOMAINS, foundationStarterTokens } from "../../../modules/ads-core/src/index.ts";
import type { FoundationStarterOptions } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Button, Field, copy } from "./ui.tsx";

export const DEFAULT_STARTER: FoundationStarterOptions = { domains: FOUNDATION_STARTER_DOMAINS.map(domain => domain.id), accent: "#8dfc52", fontFamily: "Geist", density: "comfortable" };
export const DOMAIN_LABELS: Record<string, [string, string]> = {
  color: ["색상", "Color"], spacing: ["간격", "Spacing"], sizing: ["크기", "Sizing"], radius: ["모서리", "Radius"], border: ["테두리", "Border"], shadow: ["그림자", "Shadow"], typography: ["타이포그래피", "Typography"], motion: ["모션", "Motion"], opacity: ["불투명도", "Opacity"], gradient: ["그라디언트", "Gradient"], layer: ["레이어", "Layer"],
};
export function StarterOptions({ locale, value, onChange, compact = false }: { locale: Locale; value: FoundationStarterOptions; onChange(value: FoundationStarterOptions): void; compact?: boolean }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  return <div className={`starter-options ${compact ? "compact" : ""}`}>
    <div className="form-columns"><Field label={t("브랜드 색상", "Brand color")}><div className="accent-options">{["#5b50d6", "#2563eb", "#147d4f", "#c52c40", "#252e3c"].map(color => <button type="button" key={color} aria-label={color} aria-pressed={value.accent === color} style={{ background: color }} onClick={() => onChange({ ...value, accent: color })} />)}<input type="color" aria-label={t("사용자 브랜드 색상", "Custom brand color")} value={value.accent ?? "#5b50d6"} onChange={event => onChange({ ...value, accent: event.target.value })} /></div></Field>
      <Field label={t("기본 글꼴", "Base font")}><div className="choice-chips">{["SUIT", "Geist"].map(font => <Button key={font} aria-pressed={value.fontFamily === font} onClick={() => onChange({ ...value, fontFamily: font })}>{font}</Button>)}</div></Field>
      <Field label={t("기본 밀도", "Default density")}><div className="choice-chips">{(["comfortable", "compact"] as const).map(density => <Button key={density} aria-pressed={value.density === density} onClick={() => onChange({ ...value, density })}>{density === "comfortable" ? t("여유롭게", "Comfortable") : t("촘촘하게", "Compact")}</Button>)}</div></Field></div>
    <Field label={t("포함할 도메인", "Included domains")} hint={t("선택한 도메인의 기본값과 의미값을 함께 만듭니다.", "Create primitive scales and semantic aliases together.")}><div className="domain-options">{FOUNDATION_STARTER_DOMAINS.map(domain => <label key={domain.id}><input type="checkbox" checked={value.domains.includes(domain.id)} onChange={event => onChange({ ...value, domains: event.target.checked ? [...value.domains, domain.id] : value.domains.filter(id => id !== domain.id) })} /><span>{t(...DOMAIN_LABELS[domain.id]!)}</span><small>{domain.types.join(" · ")}</small></label>)}</div></Field>
  </div>;
}
export function FoundationStarterPanel({ locale, disabled, onApply }: { locale: Locale; disabled: boolean; onApply(options: FoundationStarterOptions): boolean }) {
  const [options, setOptions] = useState(DEFAULT_STARTER), [applied, setApplied] = useState(false);
  const tokens = useMemo(() => options.domains.length ? foundationStarterTokens(options) : [], [options]);
  const t = (ko: string, en: string) => copy(locale, ko, en);
  return <section className="starter-panel" aria-label={t("기본 토큰 템플릿", "Foundation starter template")}><div className="section-heading"><h2>{t("시스템의 기본값부터 준비하세요", "Start with a complete foundation")}</h2><p>{t("반복되는 숫자와 이름 대신, 검토 가능한 기본 세트를 적용하고 프로젝트에 맞게 조정하세요.", "Apply a reviewable set of defaults, then shape it for your product.")}</p></div><StarterOptions locale={locale} value={options} onChange={next => { setOptions(next); setApplied(false); }} /><div className="template-preview"><span className="badge">Primitive {tokens.filter(token => token.tier === "primitive").length}</span><span aria-hidden="true">→</span><span className="badge">Semantic {tokens.filter(token => token.tier === "semantic").length}</span><span className="badge">Light / Dark</span></div><div className="form-actions"><Button tone="primary" data-testid="apply-foundation-template" disabled={disabled || !tokens.length} onClick={() => setApplied(onApply(options))}>{t("선택한 기본 토큰 추가", "Add selected foundation tokens")}</Button><p className="field-hint">{t("기존 이름·값·테마는 유지합니다. 추가 내용은 공통 변경 검토에서 저장합니다.", "Existing names, values and themes are preserved. Save additions through the shared review.")}</p></div>{applied && <p className="form-success" role="status">{t("기본 토큰이 변경안에 추가되었습니다. 도메인에서 살펴보세요.", "The template joined your proposal. Explore it by domain.")}</p>}</section>;
}
