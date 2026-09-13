import { useEffect, useState } from "react";
import { STUDIO_EXTENDED_STYLE_TYPES } from "../../../modules/ads-core/src/index.ts";
import type { FoundationTokenType, JsonValue, StudioCategory, StudioComponent, StudioVisualProperty } from "../../../modules/ads-core/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import type { Locale } from "./locales.ts";
import { useFormDraft } from "./form-drafts.tsx";
import { Button, Field, Section, copy } from "./ui.tsx";
import { TokenValueEditor, defaultTokenValue } from "./token-value-editor.tsx";
import { object } from "./ui-utils.ts";

const PROPERTIES: Record<string, [string, string]> = {
  typography: ["타이포그래피 세트", "Typography set"], fontFamily: ["글꼴", "Font family"], fontWeight: ["글자 굵기", "Font weight"], lineHeight: ["행간", "Line height"], letterSpacing: ["자간", "Letter spacing"],
  boxShadow: ["그림자", "Shadow"], backgroundImage: ["그라디언트 채움", "Gradient fill"], border: ["테두리 세트", "Border set"], borderStyle: ["테두리 스타일", "Border style"], transition: ["전환 세트", "Transition set"], transitionDuration: ["전환 시간", "Transition duration"], transitionTimingFunction: ["전환 곡선", "Transition curve"],
  background: ["배경색", "Background color"], color: ["글자색", "Text color"], borderRadius: ["모서리 반경", "Corner radius"], opacity: ["불투명도", "Opacity"],
};
export function AppearanceRules({ state, controller, component, partId, category, locale }: { state: StudioState; controller: StudioController; component: StudioComponent; partId: string; category: StudioCategory; locale: Locale }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const [condition, setCondition] = useState<"base" | "outlined" | "disabled" | "pressed">("base"), [property, setProperty] = useState("typography");
  const [dirty, setDirty] = useState(false), [binding, setBinding] = useState("literal"), [valid, setValid] = useState(true), [epoch, setEpoch] = useState(0);
  const [value, setValue] = useState<JsonValue>(defaultTokenValue("typography"));
  const project = state.plan?.project ?? state.project, design = category === "Web" ? component.web : component.mobile;
  const document = project?.documents[design.id]?.document;
  const rules = Array.isArray(document?.appearance) ? document.appearance.filter(object) : [];
  const rule = rules.find(rule => rule.targetPartRef === partId && object(rule.variants) && object(rule.states) && (condition === "base" ? !Object.keys(rule.variants).length && !Object.keys(rule.states).length : condition === "outlined" ? rule.variants.variant === "outlined" : rule.states[condition] === true));
  const declared = object(rule?.declarations) ? rule.declarations[property] : undefined;
  const type: FoundationTokenType = STUDIO_EXTENDED_STYLE_TYPES[property] ?? (property === "background" || property === "color" ? "color" : property === "opacity" ? "number" : "dimension");
  const compatible = state.projection?.foundation.tokens.filter(token => token.type === type) ?? [];
  useEffect(() => {
    if (dirty) return;
    const tokenId = object(declared) && typeof declared.tokenRef === "string" ? declared.tokenRef : null;
    setBinding(tokenId ?? "literal"); setValue(tokenId ? compatible.find(token => token.id === tokenId)?.value ?? defaultTokenValue(type) : declared ?? defaultTokenValue(type));
  }, [declared, type, dirty, state.selection]);
  const reset = () => { setDirty(false); setValid(true); setEpoch(n => n + 1); controller.clearInputError(); };
  const apply = (next: JsonValue | null = binding === "literal" ? value : { tokenRef: binding }) => {
    controller.component([{ componentId: component.id, edit: { kind: "appearance-rule", category, partId, condition, property: property as StudioVisualProperty, value: next } }]);
    if (controller.getSnapshot().error) return false; setDirty(false); return true;
  };
  useFormDraft({ id: "appearance-rules", label: t("타이포그래피·효과·상태 규칙", "Typography, effects and state rules"), dirty, valid: binding !== "literal" || valid, apply: () => apply(), reset });
  return <Section title={t("타이포그래피·효과·상태", "Typography, effects and states")} defaultOpen={false}><div data-draft-form="appearance-rules" className="form-stack">
    <Field label={t("규칙 범위", "Rule scope")}><select aria-label={t("규칙 범위", "Rule scope")} data-testid="appearance-rule-condition" disabled={dirty} value={condition} onChange={event => setCondition(event.target.value as typeof condition)}>{[["base", t("기본", "Base")], ["outlined", "Outlined"], ...component.catalog || component.archetype === "button" ? [["disabled", t("비활성", "Disabled")], ["pressed", t("누름", "Pressed")]] : []].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
    <Field label={t("편집할 속성", "Property")}><select data-testid="appearance-rule-property" aria-label={t("편집할 속성", "Property")} disabled={dirty} value={property} onChange={event => { setProperty(event.target.value); setEpoch(n => n + 1); }}>{Object.entries(PROPERTIES).map(([id, labels]) => <option key={id} value={id}>{t(...labels)}</option>)}</select></Field>
    <Field label={t("토큰 연결", "Token binding")}><select aria-label={t("토큰 연결", "Token binding")} data-testid="appearance-rule-binding" value={binding} onChange={event => { setBinding(event.target.value); setDirty(true); }}><option value="literal">{t("직접 값", "Literal")}</option>{compatible.map(token => <option key={token.id} value={token.id}>{token.name}</option>)}</select></Field>
    {binding === "literal" && <TokenValueEditor key={`${property}/${condition}/${epoch}`} locale={locale} type={type} value={value} onChange={next => { setValue(next); setDirty(true); }} onValidityChange={next => { setValid(next); if (!next) setDirty(true); }} />}
    <div className="form-actions"><Button data-testid="appearance-rule-apply" tone="primary" disabled={!valid && binding === "literal"} onClick={() => apply()}>{t("규칙 반영", "Apply rule")}</Button>{dirty && <Button onClick={reset}>{t("입력 초기화", "Reset input")}</Button>}</div>
    {declared !== undefined && <Button tone="subtle" data-testid="appearance-rule-reset" disabled={dirty} onClick={() => apply(null)}>{t("규칙 제거 · 상속 복원", "Remove rule · restore inheritance")}</Button>}
    <p className="field-hint">{t("복합 세트보다 개별 속성의 값이 우선합니다. 네이티브에서 지원되지 않는 효과는 내보내기에서 안내합니다.", "Individual declarations refine composite sets. Export reports effects without a native mapping.")}</p>
  </div></Section>;
}
