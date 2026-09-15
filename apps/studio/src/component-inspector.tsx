import { BehaviorEditor } from "./behavior-editor.tsx";
import { InstanceInspector } from "./instance-inspector.tsx";
import { AccessibilityInsight } from "./accessibility-insight.tsx";
import { MotionInspector } from "./motion-inspector.tsx";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getStudioCatalogRecipe, inspectTypedValue, isStudioTokenCompatible, parseJson } from "../../../modules/ads-core/src/index.ts";
import type { JsonObject, JsonValue, StudioCategory, StudioComponent, StudioComponentEdit, StudioVisualProperty, TypeExpression } from "../../../modules/ads-core/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import type { Locale } from "./locales.ts";
import { Select, Button, Field, IconButton, Section, TextInput, copy } from "./ui.tsx";
import { Icon } from "./icons.tsx";
import { AppearanceRules } from "./appearance-rules.tsx";
import { useFormDraft } from "./form-drafts.tsx";
import { TokenVisual } from "./token-visual.tsx";
import { colorHex, hexColor, object } from "./ui-utils.ts";
import { StudioSlider } from "./studio-slider.tsx";

const rows = (value: unknown): JsonObject[] => Array.isArray(value) ? value.filter(object) : [];
const VISUAL: readonly StudioVisualProperty[] = ["background", "color", "borderColor", "borderWidth", "borderRadius", "fontSize", "opacity"];
const COLOR = new Set<StudioVisualProperty>(["background", "color", "borderColor"]);
export function inspectorNumber(text: string, min = 0, max = 4096): number | null {
  const value = text.trim() ? Number(text) : NaN;
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}
export function movedChildren(component: StudioComponent, partId: string, direction: -1 | 1): string[] | null {
  const part = component.parts.find(item => item.id === partId);
  if (!part?.parent) return null;
  const children = component.parts.filter(item => item.parent === part.parent).map(item => item.id), index = children.indexOf(partId), to = index + direction;
  if (to < 0 || to >= children.length) return null;
  [children[index], children[to]] = [children[to]!, children[index]!]; return children;
}
export function inspectorSource(state: StudioState, component: StudioComponent, partId: string, category: StudioCategory) {
  const project = state.plan?.project ?? state.project, document = project?.documents[component.id]?.document;
  const design = category === "Web" ? component.web : component.mobile, sourceDesign = project?.documents[design.id]?.document;
  const rule = rows(sourceDesign?.appearance).find(item => item.targetPartRef === partId && object(item.variants) && !Object.keys(item.variants).length && object(item.states) && !Object.keys(item.states).length);
  return { document, sourcePart: rows(document?.parts).find(item => item.id === partId), design, sourceDesign,
    declarations: object(rule?.declarations) ? rule.declarations : {}, values: object(document?.publicContract) ? rows(document.publicContract.values) : [] };
}

interface Props {
  state: StudioState; controller: StudioController; component: StudioComponent; selectedPart: string | null; category: StudioCategory; locale: Locale;
  onSelectSource?: (id: string) => void;
  onSelectToken?: (id: string) => void; onSelectPart?: (id: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Property inputs retain invalid text; source plans still pass through one reviewed command path. */
export function ComponentInspector({ state, controller, component, selectedPart, category, locale, onSelectSource, onSelectToken, onSelectPart, onDirtyChange }: Props) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const part = component.parts.find(item => item.id === selectedPart) ?? component.parts.find(item => item.parent === null)!;
  const source = inspectorSource(state, component, part.id, category), layout = source.design.layout[part.id];
  const catalog = component.catalog, recipe = catalog ? getStudioCatalogRecipe(catalog.catalogId) : null;
  const [drafts, setDrafts] = useState<Record<string, string>>({}), draftRef = useRef(drafts);
  const [addingPart, setAddingPart] = useState(false), [partName, setPartName] = useState(""), [partRole, setPartRole] = useState("help");
  const [addingValue, setAddingValue] = useState(false), [valueName, setValueName] = useState(""), [valueType, setValueType] = useState("string"), [valueDefault, setValueDefault] = useState('""'), [ownership, setOwnership] = useState<"consumer" | "local">("consumer");
  const [customType, setCustomType] = useState('{"kind":"string"}'), [formError, setFormError] = useState<string | null>(null);
  const localDirty = Object.keys(drafts).length > 0 || addingPart || addingValue;
  useEffect(() => { onDirtyChange?.(localDirty); }, [localDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => { if (!state.plan && !state.error && !state.pendingBuffers.length) { draftRef.current = {}; setDrafts({}); setFormError(null); } }, [state.plan, state.error, state.pendingBuffers.length]);
  const keyFor = (key: string) => `${component.id}/${/^(part-|layout-|appearance-)/u.test(key) ? `${part.id}/${category}` : "component"}/${key}`;
  const hold = (key: string, text: string) => { draftRef.current = { ...draftRef.current, [keyFor(key)]: text }; setDrafts(draftRef.current); controller.inputError(); };
  const perform = (edits: StudioComponentEdit[]): boolean => {
    const before = controller.getSnapshot(); controller.component(edits.map(edit => ({ componentId: component.id, edit })));
    const after = controller.getSnapshot(), accepted = before !== after && !after.error;
    if (Object.keys(draftRef.current).length) controller.inputError();
    return accepted;
  };
  const commit = (key: string, text: string, edit: StudioComponentEdit): void => {
    const id = keyFor(key), before = draftRef.current;
    const next = { ...before }; delete next[id]; draftRef.current = next;
    if (!perform([edit])) { draftRef.current = { ...before, [id]: text }; controller.inputError(); }
    setDrafts(draftRef.current);
  };
  const textField = (key: string, label: string, value: string, make: (text: string) => StudioComponentEdit, multiline = false, testId = key): ReactNode => <Field key={key} label={label} layout="row">
    <TextInput label={label} data-testid={testId} value={drafts[keyFor(key)] ?? value} aria-invalid={Object.hasOwn(drafts, keyFor(key))} multiline={multiline} onCommit={text => commit(key, text, make(text))} />
    {Object.hasOwn(drafts, keyFor(key)) && <small role="status">{t("입력을 수정해 주세요. 이전 값은 보존됩니다.", "Correct this input. The previous value is preserved.")}</small>}
  </Field>;
  const numberField = (key: string, label: string, value: number, make: (number: number) => StudioComponentEdit, min = 0, max = 4096, testId = key): ReactNode => {
    const change = (text: string) => { const parsed = inspectorNumber(text, min, max); if (parsed === null) hold(key, text); else if (parsed !== value || Object.hasOwn(drafts, keyFor(key))) commit(key, text, make(parsed)); };
    const slider = max === 1 || key === "motion-duration" || key === "appearance-borderRadius-value";
    return <Field key={key} label={label} layout="row">
    {slider ? <StudioSlider label={label} sliderLabel={key === "appearance-opacity-value" ? t("불투명도 슬라이더", "Opacity slider") : undefined} locale={locale} testId={testId} value={drafts[keyFor(key)] ?? String(value)} invalid={Object.hasOwn(drafts, keyFor(key))} min={min} max={key === "appearance-borderRadius-value" ? 128 : max} step={max === 1 ? .01 : 1} variant={key === "motion-duration" ? "ruler" : "value"} onChange={change} /> : <TextInput label={label} data-testid={testId} inputMode="decimal" value={drafts[keyFor(key)] ?? String(value)} aria-invalid={Object.hasOwn(drafts, keyFor(key))} onCommit={change} />}
    {Object.hasOwn(drafts, keyFor(key)) && <small role="status">{t(`${min}–${max} 사이 숫자를 입력하세요.`, `Enter a number from ${min} to ${max}.`)}</small>}
  </Field>;
  };
  const selectField = (key: string, label: string, value: string, options: readonly { value: string; label: string; disabled?: boolean }[], make: (value: string) => StudioComponentEdit): ReactNode => <Field key={key} label={label} layout="row">
    <Select aria-label={label} data-testid={key} value={drafts[keyFor(key)] ?? value} aria-invalid={Object.hasOwn(drafts, keyFor(key))} onChange={event => commit(key, event.currentTarget.value, make(event.currentTarget.value))}>{options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</Select>
  </Field>;
  const options = (values: readonly string[]) => values.map(value => ({ value, label: value }));
  const sampleLabels = { label: t("레이블", "Label"), title: t("제목", "Title"), body: t("본문", "Body"), actionLabel: t("동작 레이블", "Action label"), closeLabel: t("닫기 레이블", "Close label") };
  const samples: (keyof StudioComponent["sampleContent"])[] = component.archetype === "button" ? ["label"] : component.archetype === "card" ? ["title", "body", "actionLabel"] : component.archetype === "toast" ? ["body", "closeLabel"] : ["label", "title", "body", "actionLabel", "closeLabel"];
  const fieldLabels = { gap: t("간격 · px", "Gap · px"), padding: t("안쪽 여백 · px", "Padding · px"), minHeight: t("최소 높이 · px", "Min height · px") };
  const visualLabels: Partial<Record<StudioVisualProperty, string>> = { background: t("배경", "Background"), color: t("글자색", "Text color"), borderColor: t("테두리색", "Border color"), borderWidth: t("테두리 두께", "Border width"), borderRadius: t("모서리 반경", "Corner radius"), fontSize: t("글자 크기", "Font size"), opacity: t("불투명도", "Opacity") };
  const resolve = (value: JsonValue | undefined) => object(value) && typeof value.tokenRef === "string" ? state.projection?.foundation.tokens.find(token => token.id === value.tokenRef)?.value : value;
  const appearance = (property: StudioVisualProperty): ReactNode => {
    const declared = source.declarations[property], tokenId = object(declared) && typeof declared.tokenRef === "string" ? declared.tokenRef : null;
    const type = COLOR.has(property) ? "color" : property === "opacity" ? "number" : "dimension";
    const bound = tokenId ?? (declared === undefined ? "inherited" : "literal");
    const root = component.parts.find(item => item.parent === null)!;
    const rootValue = inspectorSource(state, component, root.id, category).declarations[property];
    const value = resolve(declared) ?? resolve(rootValue) ?? (type === "color" ? { colorSpace: "srgb", components: [0, 0, 0], alpha: property === "background" ? 0 : 1 } : type === "number" ? 1 : { value: property === "fontSize" ? 14 : 0, unit: "px" });
    const change = (next: JsonValue): StudioComponentEdit => ({ kind: "appearance", category, partId: part.id, property, value: next });
    const bindingKey = `appearance-${property}-binding`, valueKey = `appearance-${property}-value`;
    const label = visualLabels[property] ?? property, tokens = state.projection?.foundation.tokens.filter(token => isStudioTokenCompatible(token, property)) ?? [];
    const currentToken = tokenId ? state.projection?.foundation.tokens.find(token => token.id === tokenId) : undefined;
    const unclassified = tokens.filter(token => !token.bindingCategory || token.bindingCategory === "unrestricted");
    return <div className={`property-group appearance-property appearance-${property}`} key={`${part.id}/${property}`}>
      <div className="property-binding-row"><span className="field-label">{label}</span><span className="binding-specimen"><TokenVisual type={type} value={value} domain={property === "borderRadius" ? "radius" : property === "opacity" ? "opacity" : ""} locale={locale} /></span>
        <Select aria-label={label} title={tokens.find(token => token.id === bound)?.name} data-testid={bindingKey} value={drafts[keyFor(bindingKey)] ?? bound} aria-invalid={Object.hasOwn(drafts, keyFor(bindingKey))} onChange={event => commit(bindingKey, event.currentTarget.value, change(event.currentTarget.value === "literal" ? value : { tokenRef: event.currentTarget.value }))}>
          {declared === undefined && <option value="inherited" disabled>{t("상속", "Inherited")}</option>}<option value="literal">{t("직접 값", "Literal")}</option>
          {tokenId && !tokens.some(token => token.id === tokenId) && <option value={tokenId} disabled>{currentToken?.name ?? tokenId} · {t("연결 수정 필요", "Repair binding")}</option>}
          {tokens.filter(token => !unclassified.includes(token)).map(token => <option key={token.id} value={token.id} title={token.name}>{token.name.startsWith(`${type}.`) ? token.name.slice(type.length + 1) : token.name}</option>)}
          {unclassified.length > 0 && <optgroup label={t("용도 미제한 · 유형 기준", "Unrestricted purpose · by type")}>{unclassified.map(token => <option key={token.id} value={token.id}>{token.name}</option>)}</optgroup>}
        </Select>{tokenId && <IconButton icon="link" label={t("연결된 토큰 열기", "Open linked token")} disabled={!onSelectToken} onClick={() => onSelectToken?.(tokenId)} />}
      </div>
      {bound === "literal" && (type === "color" ? <div className="property-color-row"><Field label={t("색", "Color")}><input type="color" aria-label={`${label} ${t("색 선택", "color picker")}`} value={colorHex(value) ?? "#000000"} onChange={event => { const next = hexColor(event.currentTarget.value, value); if (next) commit(valueKey, event.currentTarget.value, change(next)); }} /></Field><Field label="Hex"><TextInput label={`${label} Hex`} data-testid={valueKey} value={drafts[keyFor(valueKey)] ?? colorHex(value) ?? ""} aria-invalid={Object.hasOwn(drafts, keyFor(valueKey))} onCommit={text => { const next = hexColor(text, value); if (next) commit(valueKey, text, change(next)); else hold(valueKey, text); }} /></Field>{numberField(`appearance-${property}-alpha`, t("알파", "Alpha"), object(value) && typeof value.alpha === "number" ? value.alpha : 1, alpha => change({ ...(object(value) ? value : {}), alpha }), 0, 1)}</div>
        : <div className="property-literal-row">{numberField(valueKey, type === "number" ? "0–1" : "px", typeof value === "number" ? value : object(value) && typeof value.value === "number" ? value.value : 0, number => change(type === "number" ? number : { value: number, unit: "px" }), property === "fontSize" ? Number.MIN_VALUE : 0, type === "number" ? 1 : 4096)}</div>)}
    </div>;
  };
  const removePart = source.sourcePart?.required !== true && part.parent !== null && !component.parts.some(item => item.parent === part.id) && !rows(source.document?.slots).some(slot => slot.ownerPartRef === part.id);
  const valueEditor = (value: JsonObject): ReactNode => {
    const id = String(value.id), type = object(value.type) ? value.type : {}, current = value.defaultValue ?? null;
    const key = `value-${id}`, change = (next: JsonValue): StudioComponentEdit => ({ kind: "value-default", valueId: id, value: next });
    const required = !catalog || Boolean(recipe?.values.some(required => required.name === value.name));
    return <div className="property-group" key={id}><div className="property-row"><span>{String(value.name)} <small>{String(type.kind ?? "")}</small></span><Button tone="subtle" icon="trash" data-testid={`value-delete-${id}`} disabled={required} aria-label={t(`${String(value.name)} 삭제`, `Delete ${String(value.name)}`)} onClick={() => perform([{ kind: "value-delete", valueId: id }])} /></div>
      {type.kind === "boolean" ? selectField(key, String(value.name), String(current), options(["true", "false"]), selected => change(selected === "true"))
        : type.kind === "string" ? textField(key, String(value.name), String(current), change)
        : type.kind === "number" ? numberField(key, String(value.name), typeof current === "number" ? current : 0, change, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
        : type.kind === "enum" && Array.isArray(type.values) && type.values.every(item => typeof item === "string") ? selectField(key, String(value.name), String(current), options(type.values as string[]), change)
        : <Field label={t("기본값 JSON", "Default JSON")}><textarea aria-label={`${String(value.name)} JSON`} data-testid={key} className="json-editor json-value" value={drafts[keyFor(key)] ?? JSON.stringify(current, null, 2)} onChange={event => hold(key, event.currentTarget.value)} /><Button tone="secondary" onClick={() => { try { commit(key, drafts[keyFor(key)] ?? JSON.stringify(current), change(parseJson(drafts[keyFor(key)] ?? JSON.stringify(current)))); } catch { hold(key, drafts[keyFor(key)] ?? ""); } }}>{t("값 검토", "Preview value")}</Button></Field>}
    </div>;
  };
  const resetForm = () => { draftRef.current = {}; setDrafts({}); setAddingPart(false); setAddingValue(false); setFormError(null); controller.clearInputError(); };
  const applyForm = () => {
    if (Object.keys(draftRef.current).length) return false;
    if (addingPart) {
      if (!perform([{ kind: "part-add", parentId: part.id, name: partName, role: partRole }])) return false;
      setAddingPart(false); setPartName("");
    }
    if (addingValue) {
      try {
        const type = valueType === "custom" ? parseJson(customType) : { kind: valueType }, value = parseJson(valueDefault);
        if (!inspectTypedValue(type, value).valid || !perform([{ kind: "value-add", name: valueName, type: type as TypeExpression, value, ownership }])) return false;
        setAddingValue(false); setValueName("");
      } catch { return false; }
    }
    return true;
  };
  useFormDraft({ id: "component-properties", label: t("컴포넌트 속성", "Component properties"), dirty: localDirty,
    valid: !Object.keys(drafts).length && (!addingPart || !!partName.trim()) && (!addingValue || !!valueName.trim()), apply: applyForm, reset: resetForm });
  return <div className="component-property-editor" data-draft-form="component-properties">
    {localDirty && <div className="form-feedback" role="status"><p>{Object.keys(drafts).length ? t("입력값을 확인하세요. 마지막 정상 미리보기는 유지됩니다.", "Check the input. The last valid preview is retained.") : t("추가 중인 항목을 완료하거나 취소하세요.", "Complete or cancel the item being added.")}</p><Button data-testid="inspector-reset-input" onClick={resetForm}>{t("미반영 입력 초기화", "Reset uncommitted input")}</Button></div>}
    <Section title={t("요소", "Elements")}>
      <ul className="element-tree" aria-label={t("요소 구조", "Element tree")}>{(() => {
        const render = (parent: string | null, depth: number): ReactNode[] => component.parts.filter(item => item.parent === parent).flatMap(item => [<li key={item.id}><button type="button" aria-current={item.id === part.id} style={{ paddingInlineStart: 8 + depth * 12 }} onClick={() => onSelectPart?.(item.id)}><Icon name="component" size={14} /><span>{item.name}</span>{catalog?.slots.some(slot => slot.ownerPartRef === item.id) && <small>{t("콘텐츠", "Content")}</small>}</button></li>, ...render(item.id, depth + 1)]);
        return render(null, 0);
      })()}</ul>
      {catalog?.semantic.kind === "layout" && selectField("part-element", t("HTML 요소", "HTML element"), source.design.elements?.[part.id] ?? "div", [
        { value: "div", label: t("프레임 · div", "Frame · div") }, { value: "section", label: t("영역 · section", "Section · section") }, { value: "article", label: t("아티클 · article", "Article · article") }, { value: "header", label: "Header" }, { value: "footer", label: "Footer" }, { value: "span", label: t("인라인 텍스트 · span", "Inline text · span") }, { value: "p", label: t("본문 · p", "Paragraph · p") }, ...[1, 2, 3, 4, 5, 6].map(level => ({ value: `h${level}`, label: `${t("제목", "Heading")} ${level}` })), { value: "code", label: "Code" }
      ], element => ({ kind: "part-element", category, partId: part.id, element }))}
      {textField(`part-name/${part.id}`, t("이름", "Name"), part.name, name => ({ kind: "part-name", partId: part.id, name }), false, "part-name")}
      {catalog && <>{textField(`part-text/${part.id}`, t("텍스트", "Text"), part.text ?? "", text => ({ kind: "part-text", partId: part.id, text }), true, "part-text")}{part.parent && source.sourcePart?.required !== true && selectField("part-parent", t("상위 요소", "Parent element"), part.parent, component.parts.filter(item => item.id !== part.id).map(item => ({ value: item.id, label: item.name })), parentId => ({ kind: "part-parent", partId: part.id, parentId }))}</>}
      <details><summary>{t("기술 정보", "Technical details")}</summary><p className="field-hint">{part.role} · <code>{part.id}</code></p></details>
      <div className="button-row">{([-1, 1] as const).map(direction => <Button key={direction} tone="subtle" data-testid={`part-move-${direction === -1 ? "up" : "down"}`} disabled={!catalog || !movedChildren(component, part.id, direction)} onClick={() => { const childIds = movedChildren(component, part.id, direction); if (childIds && part.parent) perform([{ kind: "part-order", parentId: part.parent, childIds }]); }}>{direction === -1 ? t("앞으로", "Move earlier") : t("뒤로", "Move later")}</Button>)}<Button tone="danger" icon="trash" data-testid="part-delete" disabled={!removePart} onClick={() => { if (perform([{ kind: "part-delete", partId: part.id }])) onSelectPart?.(part.parent!); }}>{t("삭제", "Delete")}</Button></div>
      {recipe?.semantic.kind === "layout" && <div className="element-add-tools">{(["box", "frame", "text"] as const).map(element => <Button key={element} icon={element === "text" ? "type" : "plus"} data-testid={`element-add-${element}`} onClick={() => perform([{ kind: "element-add", parentId: part.id, element }])}>{element === "box" ? "Box" : element === "frame" ? "Frame" : "Text"}</Button>)}</div>}
      {catalog ? <><Button tone="subtle" icon="plus" data-testid="part-add" onClick={() => { setAddingPart(!addingPart); setFormError(null); if (!addingPart) { let index = 1; while (component.parts.some(item => item.role === `part${index}`)) index++; setPartRole(`part${index}`); } }}>{t("하위 요소 추가", "Add child element")}</Button>{addingPart && <div className="property-group"><Field label={t("새 요소 이름", "New element name")}><TextInput label={t("새 요소 이름", "New element name")} data-testid="part-add-name" value={partName} onCommit={setPartName} /></Field><Field label={t("코드 식별자", "Code identifier")}><TextInput label={t("코드 식별자", "Code identifier")} data-testid="part-add-role" value={partRole} onCommit={setPartRole} /></Field><Button data-testid="part-add-confirm" onClick={() => { if (perform([{ kind: "part-add", parentId: part.id, name: partName, role: partRole }])) { setAddingPart(false); setPartName(""); setFormError(null); } else setFormError(t("요소 이름과 식별자를 확인하세요.", "Check the element name and identifier.")); }}>{t("요소 추가", "Add element")}</Button></div>}</> : <p className="field-hint">{t("기본 컴포넌트의 의미 구조는 고정되어 있습니다.", "The builtin component keeps its required semantic structure.")}</p>}
      {catalog && <div className="content-area-settings"><strong className="field-label">{t("콘텐츠 영역", "Content area")}</strong><p className="field-hint">{t("이 요소가 받을 콘텐츠의 규칙입니다. 변형 옵션은 스타일과 상태에서 편집합니다.", "Defines content this element accepts. Variant options are edited in styles and states.")}</p>{(() => {
        const slot = catalog.slots.find(item => item.ownerPartRef === part.id);
        const required = recipe?.slots.some(item => item.required && item.role === part.role);
        return slot ? <><label className="check-row"><input type="checkbox" data-testid="content-required" checked={slot.min !== 0} disabled={required} onChange={event => perform([{ kind: "slot-update", slotId: String(slot.id), required: event.target.checked, multiple: slot.max === "unbounded" }])} />{t("콘텐츠 필수", "Content required")}</label><label className="check-row"><input type="checkbox" data-testid="content-multiple" checked={slot.max === "unbounded"} onChange={event => perform([{ kind: "slot-update", slotId: String(slot.id), required: slot.min !== 0, multiple: event.target.checked }])} />{t("여러 콘텐츠 허용", "Allow multiple items")}</label><p className="field-hint">{t("텍스트와 컴포넌트를 받는 영역입니다. 아래 인스턴스에서 재사용할 컴포넌트를 삽입하세요.", "This area accepts text and components. Insert a reusable component in Instances below.")}</p><Button tone="subtle" icon="trash" disabled={required} onClick={() => perform([{ kind: "slot-delete", slotId: String(slot.id) }])}>{t("콘텐츠 영역 해제", "Remove content area")}</Button></> : <Button data-testid="slot-add-optional" icon="plus" tone="subtle" onClick={() => perform([{ kind: "slot-add", partId: part.id, required: false, multiple: true }])}>{t("콘텐츠 영역으로 사용", "Use as content area")}</Button>;
      })()}</div>}
    </Section>
    {recipe?.semantic.kind === "layout" && <Section title={t("인스턴스", "Instances")}><InstanceInspector component={component} partId={part.id} state={state} controller={controller} locale={locale} {...(onSelectSource ? { onSelectSource } : {})} /></Section>}
    {layout && <Section title={t("레이아웃", "Layout")}>
      {recipe?.semantic.kind === "layout" && selectField("layout-mode", t("배치", "Layout mode"), layout.mode ?? "stack", [{ value: "stack", label: t("자동 레이아웃", "Auto layout") }, { value: "free", label: t("자유 배치", "Free position") }], value => ({ kind: "layout", category, partId: part.id, field: "mode", value }))}
      {part.parent && source.design.layout[part.parent]?.mode === "free" && <div className="element-position-grid">{(["x", "y"] as const).map(axis => numberField(`element-${axis}`, axis.toUpperCase(), layout.position?.[axis] ?? 0, value => ({ kind: "layout", category, partId: part.id, field: "position", value: { x: layout.position?.x ?? 0, y: layout.position?.y ?? 0, [axis]: value } }), -16384, 16384))}</div>}
      {catalog && <div className="inspector-size-grid">{(["width", "height"] as const).map(field => { const policy = layout[field] ?? { mode: "hug" }; return <div className="inspector-size-control" key={field}>{selectField(`layout-${field}`, field === "width" ? t("너비", "Width") : t("높이", "Height"), policy.mode, [{ value: "hug", label: t("콘텐츠 맞춤", "Hug") }, { value: "fill", label: t("채우기", "Fill") }, { value: "fixed", label: t("고정", "Fixed") }], mode => ({ kind: "layout", category, partId: part.id, field, value: mode === "fixed" ? { mode, value: 100 } : { mode } }))}{policy.mode === "fixed" && numberField(`layout-${field}-value`, "px", policy.value, value => ({ kind: "layout", category, partId: part.id, field, value: { mode: "fixed", value } }), 1)}</div>; })}</div>}
      <Field layout="row" label={t("방향", "Direction")}><div className="choice-control icon-choice" role="group" aria-label={t("레이아웃 방향", "Layout direction")} data-testid="layout-axis">{(["horizontal", "vertical"] as const).map(axis => <button key={axis} type="button" aria-label={axis === "horizontal" ? t("가로", "Row") : t("세로", "Column")} title={axis === "horizontal" ? t("가로", "Row") : t("세로", "Column")} aria-pressed={layout.axis === axis} onClick={() => commit("layout-axis", axis, { kind: "layout", category, partId: part.id, field: "axis", value: axis })}><Icon name={axis === "horizontal" ? "arrow" : "download"} /></button>)}</div></Field>
      {catalog && <Field layout="row" label={t("정렬", "Alignment")}><div className="choice-control icon-choice alignment-choice" role="group" aria-label={t("정렬", "Alignment")} data-testid="layout-alignment">{(["start", "center", "end", "stretch"] as const).map(alignment => { const label = alignment === "start" ? t("시작", "Start") : alignment === "center" ? t("가운데", "Center") : alignment === "end" ? t("끝", "End") : t("늘이기", "Stretch"); return <button key={alignment} type="button" className={`align-${alignment}`} aria-label={label} title={label} aria-pressed={(layout.alignment ?? "stretch") === alignment} onClick={() => commit("layout-alignment", alignment, { kind: "layout", category, partId: part.id, field: "alignment", value: alignment })}><span aria-hidden="true"><i /><i /><i /></span></button>; })}</div></Field>}
      <div className="dimension-controls inspector-layout-metrics">{(["gap", "minHeight"] as const).map(field => numberField(`layout-${field}`, fieldLabels[field], layout[field], value => ({ kind: "layout", category, partId: part.id, field, value })))}</div>
      <div className="uniform-padding-control"><span className="field-label">{t("안쪽 여백", "Padding")}</span><div className="padding-box">{numberField("layout-padding", "px", layout.padding, value => ({ kind: "layout", category, partId: part.id, field: "padding", value }))}<span className="padding-box-caption"><Icon name="link" size={12} />{t("모든 면", "All sides")}</span></div></div>
    </Section>}
    <Section title={t("채우기", "Fill")}>{appearance("background")}{appearance("opacity")}</Section>
    <Section title={t("텍스트", "Text")}>{appearance("color")}{appearance("fontSize")}</Section>
    <Section title={t("테두리와 모서리", "Border and corners")}>{appearance("borderColor")}{appearance("borderWidth")}{appearance("borderRadius")}</Section>

    <Section title={t("컴포넌트", "Component")} defaultOpen={false}>
      {textField("component-name", t("이름", "Name"), component.name, name => ({ kind: "name", name }))}
      {textField("component-purpose", t("목적", "Purpose"), component.purpose, purpose => ({ kind: "purpose", purpose }), true)}
    </Section>
    <Section title={t("콘텐츠", "Content")} defaultOpen={false}>{selectField("variant-default", t("기본 변형", "Default variant"), component.defaults.variant, options(["filled", "outlined"]), value => ({ kind: "variant-default", value: value as "filled" | "outlined" }))}{samples.map(field => textField(`sample-${field}`, sampleLabels[field], component.sampleContent[field], value => ({ kind: "sample-content", field, value }), field === "body"))}</Section>
    <AppearanceRules key={`${component.id}/${part.id}/${category}`} state={state} controller={controller} component={component} partId={part.id} category={category} locale={locale} />
    <Section title={t("공개 값", "Public values")} defaultOpen={false}>
      {source.values.map(valueEditor)}
      {!source.values.length && <p className="field-hint">{t("공개 값이 없습니다.", "No public values are defined.")}</p>}
      {catalog && <><Button icon="plus" tone="subtle" data-testid="value-add" onClick={() => { setAddingValue(!addingValue); setFormError(null); }}>{t("값 추가", "Add value")}</Button>{addingValue && <div className="property-group">
        <Field label={t("값 이름", "Value name")}><TextInput label={t("값 이름", "Value name")} data-testid="value-add-name" value={valueName} onCommit={setValueName} /></Field>
        <Field label={t("유형", "Type")}><Select aria-label={t("유형", "Type")} data-testid="value-add-type" value={valueType} onChange={event => { const type = event.currentTarget.value; setValueType(type); setValueDefault(type === "boolean" ? "false" : type === "number" ? "0" : '""'); }}>{["string", "boolean", "number", "custom"].map(type => <option key={type}>{type}</option>)}</Select></Field>
        {valueType === "custom" && <Field label={t("유형 JSON", "Type JSON")}><textarea className="json-editor json-value" aria-label={t("유형 JSON", "Type JSON")} value={customType} onChange={event => setCustomType(event.currentTarget.value)} /></Field>}
        <Field label={t("기본값 JSON", "Default JSON")}><TextInput label={t("기본값 JSON", "Default JSON")} data-testid="value-add-default" value={valueDefault} onCommit={setValueDefault} /></Field>
        <Field label={t("값 소유자", "Value owner")}><Select aria-label={t("값 소유자", "Value owner")} value={ownership} onChange={event => setOwnership(event.currentTarget.value as "consumer" | "local")}><option value="consumer">{t("사용 제품", "Consumer")}</option><option value="local">{t("컴포넌트 내부", "Component local")}</option></Select></Field>
        <Button data-testid="value-add-confirm" onClick={() => { try { const type = valueType === "custom" ? parseJson(customType) : { kind: valueType }, value = parseJson(valueDefault); if (!inspectTypedValue(type, value).valid) throw new Error("Invalid type or value"); if (perform([{ kind: "value-add", name: valueName, type: type as TypeExpression, value, ownership }])) { setAddingValue(false); setValueName(""); setFormError(null); } else setFormError(t("값의 이름과 계약을 확인하세요.", "Check the value name and contract.")); } catch { setFormError(t("유형에 맞는 기본값을 입력하세요.", "Enter a default that matches the selected type.")); } }}>{t("값 추가", "Add value")}</Button>
      </div>}</>}
    </Section>

    <Section title={t("접근성", "Accessibility")} defaultOpen={false}>
      {catalog ? <>{textField("a11y-label", t("접근 가능한 이름", "Accessible name"), String(catalog.accessibility.label ?? ""), value => ({ kind: "accessibility", field: "label", value }))}{textField("a11y-description", t("추가 설명", "Accessible description"), String(catalog.accessibility.description ?? ""), value => ({ kind: "accessibility", field: "description", value }), true)}<p className="field-hint">{t("레이블 편집은 실제 보조기기 검증을 대신하지 않습니다.", "Label editing does not establish assistive-technology verification.")}</p></> : <p className="field-hint">{t("기본 이름과 초점 계약을 유지합니다. 표시 레이블은 콘텐츠에서 편집하세요.", "Builtin naming and focus contracts remain fixed. Edit visible labels in Content.")}</p>}
    </Section>
    {catalog && source.document && <BehaviorEditor component={component} document={source.document} locale={locale} onEdit={edit => perform(Array.isArray(edit) ? edit : [edit])} />}
    {catalog && <MotionInspector key={`${component.id}/${part.id}`} state={state} controller={controller} component={component} partId={part.id} locale={locale} />}
    <Section title={t("기본 전환", "Default transition")} defaultOpen={false}>
      {numberField("motion-duration", t("지속 시간 · ms", "Duration · ms"), component.motion.durationMs, value => ({ kind: "motion", field: "durationMs", value }), 0, 10000)}
      {catalog && selectField("motion-easing", t("이징", "Easing"), component.motion.easing ?? "ease-out", options(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]), value => ({ kind: "motion", field: "easing", value }))}
      <p className="field-hint">{t("동작 줄이기 설정에서는 즉시 전환합니다.", "Reduced motion uses an immediate transition.")}</p>
    </Section>
    {formError && <p className="field-error" role="alert">{formError}</p>}
  </div>;
}
