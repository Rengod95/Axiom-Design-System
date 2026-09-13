import { TokenSuggestions } from "./token-suggestions.tsx";
import { useEffect, useMemo, useState } from "react";
import { inspectFoundationAuthoring } from "../../../modules/ads-core/src/index.ts";
import type { FoundationAuthoringProjection, FoundationTokenRow, FoundationTokenType, JsonValue } from "../../../modules/ads-core/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import type { Locale } from "./locales.ts";
import { Button, EmptyState, Field, Section, TextInput, copy } from "./ui.tsx";
import { useFormDraft } from "./form-drafts.tsx";
import { TOKEN_TYPES, TokenValueEditor, defaultTokenValue, tokenValueSummary } from "./token-value-editor.tsx";

interface Props {
  state: StudioState; controller: StudioController; locale: Locale; tokenId: string | null; creating: boolean;
  onCreated(id: string): void; onCancel(): void; onSelectComponent(id: string, partId?: string): void;
  onDirtyChange?(dirty: boolean): void;
  externalDirty?: boolean;
}
export function FoundationInspector(props: Props) {
  const project = props.state.plan?.project ?? props.state.project;
  const model = useMemo(() => project ? inspectFoundationAuthoring(project, props.state.selection) : null, [project, props.state.selection]);
  const token = model?.tokens.find(item => item.id === props.tokenId);
  if (!model) return null;
  if (!props.creating && !token) return <EmptyState icon="token" title={copy(props.locale, "토큰을 선택하세요", "Select a token")} description={copy(props.locale, "목록에서 토큰을 선택하면 값과 분류, 사용처를 편집할 수 있습니다.", "Select a token to edit its value, classification and references.")} />;
  return <TokenInspectorForm key={props.creating ? "new-token" : token!.id} {...props} model={model} token={props.creating ? undefined : token} />;
}

function TokenInspectorForm({ state, controller, locale, creating, model, token, onCreated, onCancel, onSelectComponent, onDirtyChange, externalDirty = false }: Props & { model: FoundationAuthoringProjection; token: FoundationTokenRow | undefined }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const [name, setName] = useState(token?.name ?? ""), [description, setDescription] = useState(token?.description ?? "");
  const [type, setType] = useState<FoundationTokenType>(token?.typeRef.id ?? "color");
  const [value, setValue] = useState<JsonValue>(token && "literal" in token.value ? token.value.literal : token?.resolvedValue ?? defaultTokenValue("color"));
  const [mode, setMode] = useState<"literal" | "alias">(token?.aliasTarget ? "alias" : "literal"), [alias, setAlias] = useState(token?.aliasTarget ?? "");
  const [domain, setDomain] = useState(token?.domain ?? ""), [tier, setTier] = useState(token?.tier ?? ""), [valueValid, setValueValid] = useState(true);
  const [dirty, setDirty] = useState(false), [deleting, setDeleting] = useState(false), [replacement, setReplacement] = useState(""), [duplicateName, setDuplicateName] = useState("");
  const [scope, setScope] = useState("base");
  const [overrideAlias, setOverrideAlias] = useState("");
  const [editorEpoch, setEditorEpoch] = useState(0);
  const disabled = state.busy || state.retryable || state.candidate !== null || model.foundationId !== null && state.pendingBuffers.includes(model.foundationId);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (dirty || !token) return;
    setName(token.name); setDescription(token.description ?? ""); setDomain(token.domain ?? ""); setTier(token.tier ?? "");
    if (scope === "base") { setMode(token.aliasTarget ? "alias" : "literal"); setAlias(token.aliasTarget ?? ""); setValue("literal" in token.value ? token.value.literal : token.resolvedValue ?? defaultTokenValue(token.typeRef.id)); }
    else {
      const [axisId, context] = JSON.parse(scope) as [string, string];
      const axis = model.axes.find(item => item.id === axisId);
      if (!axis?.contexts.includes(context)) { setScope("base"); setEditorEpoch(epoch => epoch + 1); return; }
      const map = axis.overrides && Object.hasOwn(axis.overrides, context) ? axis.overrides[context] : undefined;
      const override = map && Object.hasOwn(map, token.id) ? map[token.id] : undefined;
      setMode(override && "ref" in override ? "alias" : "literal");
      setOverrideAlias(override && "ref" in override ? override.ref.id : "");
      setValue(override && "literal" in override ? override.literal : token.resolvedValue ?? defaultTokenValue(token.typeRef.id));
    }
  }, [token, dirty, scope, model.axes]);
  const compatible = model.tokens.filter(item => item.id !== token?.id && item.typeRef.id === type);
  const chosenContext = scope === "base" ? undefined : (() => { try { const parsed = JSON.parse(scope) as [string, string]; return { axisId: parsed[0], context: parsed[1] }; } catch { return undefined; } })();
  const changeScope = (next: string) => {
    setScope(next); setDirty(false); setEditorEpoch(value => value + 1);
    if (next === "base" || !token) { if (token) { setMode(token.aliasTarget ? "alias" : "literal"); setAlias(token.aliasTarget ?? ""); setValue("literal" in token.value ? token.value.literal : token.resolvedValue ?? defaultTokenValue(type)); } return; }
    const [axisId, context] = JSON.parse(next) as [string, string];
    const axis = model.axes.find(item => item.id === axisId), map = axis?.overrides && Object.hasOwn(axis.overrides, context) ? axis.overrides[context] : undefined;
    const override = map && Object.hasOwn(map, token.id) ? map[token.id] : undefined;
    setMode(override && "ref" in override ? "alias" : "literal");
    setOverrideAlias(override && "ref" in override ? override.ref.id : "");
    setValue(override && "literal" in override ? override.literal : token.resolvedValue ?? defaultTokenValue(type));
  };
  const applied = (action: () => string[]) => { const ids = action(); if (!controller.getSnapshot().error) setDirty(false); return ids; };
  const apply = () => {
    if (disabled || !name.trim() || mode === "literal" && !valueValid || mode === "alias" && !(chosenContext ? overrideAlias : alias)) return;
    if (creating) {
      const ids = applied(() => controller.foundation({ kind: "token-create", name, type, value: mode === "literal" ? { literal: value } : { ref: { id: alias, expectedKind: "token" } }, ...(description ? { description } : {}), ...(domain ? { domain } : {}), ...(tier ? { tier } : {}) }));
      if (ids[0] && !controller.getSnapshot().error) onCreated(ids[0]);
    } else if (token) {
      if (chosenContext) applied(() => controller.foundation({ kind: "theme-override-set", ...chosenContext, id: token.id, value: mode === "literal" ? { literal: value } : { ref: { id: overrideAlias, expectedKind: "token" } } }));
      else applied(() => controller.foundation([{ kind: "token-update", id: token.id, name, description: description || null, domain: domain || null, tier: tier || null }, mode === "literal" ? { kind: "token-literal", id: token.id, value } : { kind: "token-alias", id: token.id, targetId: alias }]));
    }
  };
  const resetForm = () => { setDirty(false); setValueValid(true); changeScope(scope); setEditorEpoch(epoch => epoch + 1); controller.clearInputError(); if (creating) onCancel(); };
  useFormDraft({ id: "foundation-token", label: t("토큰 속성", "Token properties"), dirty,
    valid: !!name.trim() && (mode === "literal" ? valueValid : !!(chosenContext ? overrideAlias : alias)),
    apply: () => { apply(); return !controller.getSnapshot().error; }, reset: resetForm });
  const selectClassification = (category: "domain" | "tier") => <Field label={category === "domain" ? t("도메인", "Domain") : t("계층", "Tier")} hint={category === "domain" ? t("토큰의 용도 분류", "What the token is used for") : t("기본값·의미값 등 추상화 계층", "Its level of abstraction")}><select disabled={disabled} aria-label={category === "domain" ? t("도메인", "Domain") : t("계층", "Tier")} value={category === "domain" ? domain : tier} onChange={event => { (category === "domain" ? setDomain : setTier)(event.target.value); setDirty(true); }}><option value="">{t("미분류", "Unassigned")}</option>{(category === "domain" ? model.domains : model.tiers).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>;
  return <div className="foundation-inspector" data-draft-form="foundation-token"><header className="inspector-title"><h2>{creating ? t("토큰 만들기", "Create token") : token!.name}</h2><p className="field-hint">{creating ? t("재사용할 값을 정의하세요.", "Define a reusable value.") : `${type} · ${token!.references.length} ${t("참조", "references")}`}</p></header>
    <fieldset disabled={disabled} className="plain-fieldset">
      {!creating && <Field label={t("편집 범위", "Editing scope")}><select data-testid="foundation-token-scope" aria-label={t("편집 범위", "Editing scope")} disabled={dirty} value={scope} onChange={event => changeScope(event.target.value)}><option value="base">{t("기본 토큰", "Base token")}</option>{model.axes.flatMap(axis => axis.contexts.map(context => <option key={`${axis.id}/${context}`} value={JSON.stringify([axis.id, context])}>{axis.name ?? axis.id} / {context}</option>))}</select>{dirty && <small className="field-hint">{t("범위를 바꾸기 전에 입력을 반영하거나 되돌리세요.", "Apply or reset your form before switching scope.")}</small>}</Field>}
      {scope === "base" && <Section title={t("정의", "Definition")}><Field label={t("이름", "Name")}><TextInput label={t("토큰 이름", "Token name")} data-testid="foundation-token-name" value={name} onCommit={next => { setName(next); setDirty(true); }} />{!name.trim() && <small className="field-error">{t("이름을 입력하세요.", "Enter a name.")}</small>}</Field><Field label={t("설명", "Description")}><TextInput label={t("토큰 설명", "Token description")} value={description} multiline onCommit={next => { setDescription(next); setDirty(true); }} /></Field>
        {creating && <Field label={t("값 유형", "Value type")}><select aria-label={t("값 유형", "Value type")} data-testid="foundation-token-type" value={type} onChange={event => { const next = event.target.value as FoundationTokenType; setType(next); setValue(defaultTokenValue(next)); setMode("literal"); setAlias(""); setValueValid(true); setDirty(true); }}>{TOKEN_TYPES.map(item => <option key={item}>{item}</option>)}</select></Field>}<div className="value-grid">{selectClassification("domain")}{selectClassification("tier")}</div></Section>}
      <Section title={chosenContext ? t("테마 값", "Theme value") : t("값", "Value")}><Field label={t("값의 출처", "Value source")}><select aria-label={t("값의 출처", "Value source")} value={mode} onChange={event => { setMode(event.target.value as "literal" | "alias"); setDirty(true); }}><option value="literal">{t("직접 값", "Literal value")}</option><option value="alias">{t("다른 토큰 참조", "Alias to a token")}</option></select></Field>
        {mode === "alias" ? <Field label={t("참조할 토큰", "Referenced token")} hint={t("같은 유형의 토큰만 선택할 수 있습니다. 순환 참조는 반영 시 검사합니다.", "Choose the same type. Applying checks for cycles.")}><select aria-label={t("참조할 토큰", "Referenced token")} value={chosenContext ? overrideAlias : alias} onChange={event => { (chosenContext ? setOverrideAlias : setAlias)(event.target.value); setDirty(true); }}><option value="">{t("토큰 선택", "Choose a token")}</option>{compatible.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field> : <TokenValueEditor key={`${type}/${scope}/${editorEpoch}`} type={type} value={value} onChange={next => { setValue(next); setDirty(true); }} onValidityChange={valid => { setValueValid(valid); if (!valid) setDirty(true); }} locale={locale} disabled={disabled} />}
        {mode === "literal" && <TokenSuggestions type={type} domain={model.domains.find(item => item.id === domain)?.name ?? ""} locale={locale} onChoose={next => { setValue(next); setValueValid(true); setDirty(true); setEditorEpoch(epoch => epoch + 1); }} />}
        {chosenContext && token && <Button tone="subtle" disabled={disabled || dirty} onClick={() => { applied(() => controller.foundation({ kind: "theme-override-remove", ...chosenContext, id: token.id })); if (!controller.getSnapshot().error) changeScope("base"); }}>{t("테마 재정의 제거", "Remove theme override")}</Button>}
      </Section>
      <div className="inspector-actions"><Button tone="primary" data-testid="foundation-token-apply" disabled={disabled || !name.trim() || mode === "literal" && !valueValid || mode === "alias" && !(chosenContext ? overrideAlias : alias)} onClick={apply}>{creating ? t("토큰 만들기", "Create token") : t("미리보기에 반영", "Apply to preview")}</Button>{creating && <Button onClick={onCancel}>{t("취소", "Cancel")}</Button>}{dirty && !creating && <Button disabled={disabled} onClick={resetForm}>{t("입력 되돌리기", "Reset form")}</Button>}</div>
    </fieldset>
    {!creating && token && <><Section title={t("해석 결과와 출처", "Resolved value and origin")}><p className="token-summary">{tokenValueSummary(token.resolvedValue)}</p><ol className="provenance-list">{token.aliasChain.map(id => <li key={id}>{model.tokens.find(item => item.id === id)?.name ?? id}</li>)}</ol>{token.overrideTrace.map((trace, i) => <p className="field-hint" key={i}>{model.axes.find(axis => axis.id === trace.axisId)?.name ?? trace.axisId} / {trace.context}</p>)}<details><summary>{t("안정 ID", "Stable identity")}</summary><code>{token.id}</code></details></Section>
      <Section title={`${t("사용처", "Usage")} · ${token.references.length}`}><p className="field-hint">{t("현재 Studio가 해석하는 참조 범위입니다.", "References understood by the current Studio profile.")}</p>{token.references.length === 0 && <p>{t("아직 사용되지 않습니다.", "Not used yet.")}</p>}{token.references.map((reference, index) => <div key={`${reference.documentId}/${reference.path}/${index}`} className="usage-link">{reference.componentId ? <Button tone="subtle" onClick={() => onSelectComponent(reference.componentId!, reference.partId)}>{state.projection?.components.find(item => item.id === reference.componentId)?.name ?? reference.componentId}{reference.partId ? ` / ${reference.partId.split(".").at(-1)}` : ""}</Button> : <span>{reference.ownerTokenId ? model.tokens.find(item => item.id === reference.ownerTokenId)?.name ?? reference.ownerTokenId : reference.context ?? reference.kind}</span>}<small className="field-hint">{reference.kind}</small></div>)}</Section>
      <Section title={t("관리", "Manage")} defaultOpen={false}><Field label={t("복제 이름", "Duplicate name")}><TextInput label={t("복제 이름", "Duplicate name")} value={duplicateName} placeholder={`${token.name} ${t("복사", "copy")}`} disabled={disabled} onCommit={setDuplicateName} /></Field><Button icon="copy" disabled={disabled || dirty} onClick={() => { const ids = applied(() => controller.foundation({ kind: "token-duplicate", id: token.id, name: duplicateName.trim() || `${token.name} ${t("복사", "copy")}` })); if (ids[0] && !controller.getSnapshot().error) onCreated(ids[0]); }}>{t("토큰 복제", "Duplicate token")}</Button><Button tone="danger" icon="trash" disabled={disabled || dirty} onClick={() => setDeleting(!deleting)}>{t("토큰 삭제…", "Delete token…")}</Button>
        {deleting && <div className="manager-form"><p>{t("삭제는 검토할 변경안에 포함됩니다. 사용 중이면 같은 유형의 대체 토큰이 필요합니다.", "Deletion joins the reviewed proposal. A used token needs a replacement of the same type.")}</p><Field label={t("대체 토큰", "Replacement token")}><select aria-label={t("대체 토큰", "Replacement token")} disabled={disabled} value={replacement} onChange={event => setReplacement(event.target.value)}><option value="">{t("대체 없음", "No replacement")}</option>{compatible.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Button tone="danger" data-testid="foundation-token-delete" disabled={disabled || dirty || token.inUse && !replacement} onClick={() => { applied(() => controller.foundation({ kind: "token-delete", id: token.id, ...(replacement ? { replacementId: replacement } : {}) })); if (!controller.getSnapshot().error) onCancel(); }}>{t("삭제 변경안 만들기", "Propose deletion")}</Button></div>}
      </Section></>}
    {state.error && state.diagnostics.length > 0 && <div className="inline-error" role="alert"><p>{t("변경을 반영하지 못했습니다. 입력을 수정해 다시 시도하세요.", "The change was not applied. Edit your input and try again.")}</p>{state.diagnostics.filter(item => item.severity === "error").slice(0, 5).map((item, i) => <p key={i}><code>{item.path}</code> {item.message}</p>)}</div>}
  </div>;
}
