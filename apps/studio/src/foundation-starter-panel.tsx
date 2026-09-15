import { useId, useMemo, useState } from "react";
import { FOUNDATION_STARTER_DOMAINS, FOUNDATION_STARTER_TEMPLATES, foundationStarterTokens } from "../../../modules/ads-core/src/index.ts";
import type { FoundationStarterOptions, FoundationStarterTemplateId, FoundationStarterToken, JsonObject } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Icon } from "./icons.tsx";
import type { IconName } from "./icons.tsx";
import { Button, Field, Select, copy } from "./ui.tsx";

export const DEFAULT_STARTER: FoundationStarterOptions = { domains: FOUNDATION_STARTER_DOMAINS.map(domain => domain.id), accent: "#8dfc52", fontFamily: "Geist", density: "comfortable" };
export const DOMAIN_LABELS: Record<string, [string, string]> = {
  color: ["색상", "Color"], spacing: ["간격", "Spacing"], sizing: ["크기", "Sizing"], radius: ["모서리", "Radius"], border: ["테두리", "Border"], shadow: ["그림자", "Shadow"], typography: ["타이포그래피", "Typography"], motion: ["모션", "Motion"], opacity: ["불투명도", "Opacity"], gradient: ["그라디언트", "Gradient"], layer: ["레이어", "Layer"],
};
const DOMAIN_DETAILS: Record<string, { icon: IconName; examples: [string, string] }> = {
  color: { icon: "palette", examples: ["팔레트 · 표면 · 텍스트", "Palette · surface · text"] }, spacing: { icon: "align", examples: ["간격 · 인셋 · 여백", "Gap · inset · spacing"] }, sizing: { icon: "fit", examples: ["아이콘 · 컨트롤 · 터치", "Icon · control · touch"] }, radius: { icon: "component", examples: ["컨트롤 · 표면 · 팝오버", "Control · surface · overlay"] }, border: { icon: "grid", examples: ["선 두께 · 스타일", "Stroke width · style"] }, shadow: { icon: "layers", examples: ["높이 · 그림자", "Elevation · shadow"] }, typography: { icon: "type", examples: ["글꼴 · 크기 · 텍스트 역할", "Font · scale · text roles"] }, motion: { icon: "play", examples: ["지속 시간 · 이징", "Duration · easing"] }, opacity: { icon: "eye", examples: ["비활성 · 약하게 · 불투명", "Disabled · muted · opaque"] }, gradient: { icon: "palette", examples: ["브랜드 채우기", "Brand fill"] }, layer: { icon: "layers", examples: ["기본 · 오버레이 · 알림", "Base · overlay · toast"] },
};

function templateColor(token: FoundationStarterToken | undefined): string | undefined {
  const value = token?.literal as JsonObject | undefined;
  return value && Array.isArray(value.components) ? `rgb(${(value.components as number[]).map(value => Math.round(value * 255)).join(" ")})` : undefined;
}

/** Preview follows the same aliases and theme overrides as the proposed editable blueprint. */
function StarterPreview({ tokens, locale }: { tokens: FoundationStarterToken[]; locale: Locale }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const t = (ko: string, en: string) => copy(locale, ko, en), byName = new Map(tokens.map(token => [token.name, token]));
  const chain = (name: string) => { const path: FoundationStarterToken[] = []; let token = byName.get(name); while (token && !path.includes(token)) { path.push(token); token = byName.get(theme === "dark" && token.darkAlias ? token.darkAlias : token.alias ?? ""); } return path; };
  const color = (name: string) => templateColor(chain(name).at(-1));
  const action = chain("action.primary.background"), radius = chain("radius.control").at(-1)?.literal as JsonObject | undefined;
  const padding = chain("spacing.control").at(-1)?.literal as JsonObject | undefined, type = chain("typography.body").at(-1)?.literal as JsonObject | undefined;
  return <div className="starter-preview" data-testid="starter-template-preview">
    <div className="starter-preview-heading"><strong>{t("선택한 구조 미리보기", "Preview this structure")}</strong><div className="segmented segmented-filled" role="group" aria-label={t("템플릿 미리보기 테마", "Template preview theme")}><Button size="sm" tone="subtle" aria-pressed={theme === "light"} onClick={() => setTheme("light")} icon="sun">Light</Button><Button size="sm" tone="subtle" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")} icon="moon">Dark</Button></div></div>
    <div className="starter-preview-body"><div className="starter-preview-specimen" style={{ background: color("surface.canvas"), color: color("text.primary") }}><span style={{ color: color("text.secondary") }}>{t("프로젝트 기본값", "Project defaults")}</span><span className="starter-preview-type" style={{ fontFamily: Array.isArray(type?.fontFamily) ? (type.fontFamily as string[]).join(", ") : undefined, fontSize: typeof (type?.fontSize as JsonObject | undefined)?.value === "number" ? Number((type!.fontSize as JsonObject).value) : undefined }}>{t("의미가 있는 디자인", "Design with meaning")}</span><span className="starter-preview-action" style={{ background: color("action.primary.background"), color: color("action.primary.foreground"), borderRadius: typeof radius?.value === "number" ? Math.min(radius.value, 24) : undefined, paddingBlock: typeof padding?.value === "number" ? Math.min(padding.value, 16) : undefined }}>{t("주요 액션", "Primary action")}</span></div>
      <div className="starter-preview-explanation"><p><strong>Primitive</strong>{t("원본 색·숫자·규격", "Original colors, numbers and scales")}</p><Icon name="arrow" /><p><strong>Semantic</strong>{t("쓰임새를 이름으로 표현하는 참조", "References named for their purpose")}</p>{action.length > 0 && <ol className="starter-alias-chain" aria-label={t("주요 액션 토큰 연결", "Primary action token chain")}>{action.slice().reverse().map(token => <li key={token.name}><i style={{ background: color(token.name) }} aria-hidden="true" /><code>{token.name}</code></li>)}</ol>}</div>
    </div>
  </div>;
}

/** Editing a template only stages its choices; mutation belongs to the explicit apply action. */
export function StarterOptions({ locale, value, onChange, compact = false }: { locale: Locale; value: FoundationStarterOptions; onChange(value: FoundationStarterOptions): void; compact?: boolean }) {
  const t = (ko: string, en: string) => copy(locale, ko, en), id = useId();
  const selected = FOUNDATION_STARTER_TEMPLATES.find(template => template.id === (value.template ?? "essentials"))!;
  const allTokens = useMemo(() => foundationStarterTokens({ ...value, domains: FOUNDATION_STARTER_DOMAINS.map(domain => domain.id) }), [value]);
  const choose = (template: FoundationStarterTemplateId) => { const next = FOUNDATION_STARTER_TEMPLATES.find(item => item.id === template)!; onChange({ ...value, template, ...(!value.accent || value.accent.toLowerCase() === selected.accent ? { accent: next.accent } : {}) }); };
  return <div className={`starter-options ${compact ? "compact" : ""}`}>
    <fieldset className="starter-template-picker"><legend>{t("토큰 구조 선택", "Choose a token architecture")}</legend>
      {compact ? <Select aria-label={t("토큰 템플릿", "Token template")} value={selected.id} onChange={event => choose(event.target.value as FoundationStarterTemplateId)}>{FOUNDATION_STARTER_TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</Select> : <div className="starter-template-grid">{FOUNDATION_STARTER_TEMPLATES.map(template => <label className="starter-template-choice" key={template.id} data-selected={selected.id === template.id}><input type="radio" name={`starter-template-${id}`} value={template.id} checked={selected.id === template.id} onChange={() => choose(template.id)} /><span><strong>{template.name}</strong><small>{t(template.summary[0], template.summary[1])}</small></span></label>)}</div>}
      <div className="starter-template-reference"><span>{selected.architecture}</span><a href={selected.source} target="_blank" rel="noreferrer">{t("공식 구조 참고", "Architecture reference")}<Icon name="arrow" size={12} /></a></div><p className="field-hint">{t("공식 구조를 참고해 만든 편집 가능한 Axiom 템플릿입니다. 원본 라이브러리의 전체 토큰이나 색상 알고리즘을 복제하지 않습니다.", "Editable Axiom adaptations of the documented architectures, not complete upstream token sets or color algorithms.")}</p>
    </fieldset>
    {!compact && <StarterPreview tokens={allTokens.filter(token => value.domains.includes(token.domain))} locale={locale} />}
    <div className="form-columns starter-customization"><Field label={t("브랜드 색상", "Brand color")}><div className="accent-options">{["#8dfc52", "#2563eb", "#147d4f", "#c52c40", "#6750a4"].map(color => <button type="button" key={color} aria-label={color} aria-pressed={value.accent?.toLowerCase() === color} style={{ background: color }} onClick={() => onChange({ ...value, accent: color })} />)}<input type="color" aria-label={t("사용자 브랜드 색상", "Custom brand color")} value={value.accent ?? selected.accent} onChange={event => onChange({ ...value, accent: event.target.value })} /></div></Field>
      <Field label={t("기본 글꼴", "Base font")}><div className="choice-chips">{["Geist", "SUIT"].map(font => <Button key={font} aria-pressed={value.fontFamily === font} onClick={() => onChange({ ...value, fontFamily: font })}>{font}</Button>)}</div></Field><Field label={t("기본 밀도", "Default density")}><div className="choice-chips">{(["comfortable", "compact"] as const).map(density => <Button key={density} aria-pressed={value.density === density} onClick={() => onChange({ ...value, density })}>{density === "comfortable" ? t("보통", "Comfortable") : t("촘촘하게", "Compact")}</Button>)}</div></Field></div>
    <fieldset className="starter-domains"><legend>{t("포함할 도메인", "Included domains")}<span>{value.domains.length} / {FOUNDATION_STARTER_DOMAINS.length}</span></legend><div className="starter-domain-heading"><p className="field-hint">{t("각 도메인은 필요한 기본값과 역할을 함께 포함합니다.", "Each domain includes its own scales and semantic roles.")}</p><Button size="sm" tone="subtle" onClick={() => onChange({ ...value, domains: value.domains.length === FOUNDATION_STARTER_DOMAINS.length ? [] : FOUNDATION_STARTER_DOMAINS.map(domain => domain.id) })}>{value.domains.length === FOUNDATION_STARTER_DOMAINS.length ? t("모두 해제", "Clear all") : t("모두 선택", "Select all")}</Button></div>
      <div className="starter-domain-grid">{FOUNDATION_STARTER_DOMAINS.map(domain => { const tokens = allTokens.filter(token => token.domain === domain.id), detail = DOMAIN_DETAILS[domain.id]!; return <label className="starter-domain-choice" key={domain.id} data-selected={value.domains.includes(domain.id)}><input type="checkbox" aria-label={t(...DOMAIN_LABELS[domain.id]!)} checked={value.domains.includes(domain.id)} onChange={event => onChange({ ...value, domains: event.target.checked ? [...value.domains, domain.id] : value.domains.filter(id => id !== domain.id) })} /><Icon name={detail.icon} /><span><strong>{t(...DOMAIN_LABELS[domain.id]!)}</strong><small>{t(...detail.examples)}</small></span><span className="starter-domain-count" aria-label={t(`${tokens.length}개 토큰`, `${tokens.length} tokens`)}>{tokens.length}</span></label>; })}</div>
      {!value.domains.length && <p className="starter-domain-empty" role="status">{t("추가하려면 도메인을 하나 이상 선택하세요.", "Select at least one domain to add a template.")}</p>}
    </fieldset>
  </div>;
}

/** Additive template application remains part of the shared review, save and Undo flow. */
export function FoundationStarterPanel({ locale, disabled, onApply }: { locale: Locale; disabled: boolean; onApply(options: FoundationStarterOptions): boolean }) {
  const [options, setOptions] = useState(DEFAULT_STARTER), [applied, setApplied] = useState(false);
  const tokens = useMemo(() => options.domains.length ? foundationStarterTokens(options) : [], [options]);
  const t = (ko: string, en: string) => copy(locale, ko, en);
  return <section className="starter-panel" aria-label={t("기본 토큰 템플릿", "Foundation starter template")}><div className="section-heading"><h2>{t("제품에 맞는 토큰 구조", "A token architecture for your product")}</h2><p>{t("구조를 비교하고, 필요한 도메인만 추가하세요.", "Compare architectures and add the domains you need.")}</p></div><StarterOptions locale={locale} value={options} onChange={next => { setOptions(next); setApplied(false); }} /><div className="template-preview"><span className="badge">Primitive {tokens.filter(token => token.tier === "primitive").length}</span><span aria-hidden="true">→</span><span className="badge">Semantic {tokens.filter(token => token.tier === "semantic").length}</span>{options.domains.includes("color") && <span className="badge">Light / Dark</span>}</div><div className="form-actions"><Button tone="primary" data-testid="apply-foundation-template" disabled={disabled || !tokens.length} onClick={() => setApplied(onApply(options))}>{t("선택한 토큰 추가", "Add selected tokens")}</Button><p className="field-hint">{t("기존 이름·값·테마와 바인딩은 유지합니다. 다른 템플릿을 추가해도 기존 역할은 교체하지 않습니다. 변경 검토에서 저장하세요.", "Existing values, themes and bindings stay intact. Adding another template does not replace existing roles. Save through the shared review.")}</p></div>{applied && <p className="form-success" role="status">{t("토큰이 변경안에 추가되었습니다. 도메인에서 살펴보세요.", "The template joined your proposal. Explore it by domain.")}</p>}</section>;
}
