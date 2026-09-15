import { TokenUsage } from "./token-relationships.tsx";
import { TokenVisual } from "./token-visual.tsx";
import { FoundationExpressionEditor } from "./foundation-expression-editor.tsx";
import { TokenSuggestions } from "./token-suggestions.tsx";
import { useEffect, useMemo, useState } from "react";
import { inspectFoundationAuthoring } from "../../../modules/ads-core/src/index.ts";
import type { FoundationAuthoringProjection, FoundationTokenRow, FoundationTokenType, FoundationTokenValue, JsonValue, StudioCategory } from "../../../modules/ads-core/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import type { Locale } from "./locales.ts";
import { Select, Button, EmptyState, Field, Section, TextInput, copy } from "./ui.tsx";
import { useFormDraft, useDraftRegistry } from "./form-drafts.tsx";
import { TOKEN_TYPES, TokenValueEditor, defaultTokenValue, tokenValueSummary } from "./token-value-editor.tsx";
import type { TokenCreationContext } from "./token-atlas.tsx";

const valueMode = (value?: FoundationTokenValue): "literal" | "alias" | "expression" => value && ("composite" in value || "ref" in value && value.ref.path !== undefined) ? "expression" : value && "ref" in value ? "alias" : "literal";
const emptyExpression = (): FoundationTokenValue => ({ ref: { id: "", expectedKind: "token" } });

interface Props {
  state: StudioState; controller: StudioController; locale: Locale; tokenId: string | null; creating: boolean;
  onCreated(id: string): void; onCancel(): void; onSelectComponent(id: string, partId?: string, category?: StudioCategory): void;
  onDirtyChange?(dirty: boolean): void;
  externalDirty?: boolean;
  creationContext?: TokenCreationContext;
}
export function FoundationInspector(props: Props) {
  const project = props.state.plan?.project ?? props.state.project;
  const model = useMemo(() => project ? inspectFoundationAuthoring(project, props.state.selection) : null, [project, props.state.selection]);
  const token = model?.tokens.find(item => item.id === props.tokenId);
  if (!model) return null;
  if (!props.creating && !token) return <EmptyState icon="token" title={copy(props.locale, "토큰을 선택하세요", "Select a token")} description={copy(props.locale, "목록에서 토큰을 선택하면 값과 분류, 사용처를 편집할 수 있습니다.", "Select a token to edit its value, classification and references.")} />;
  return <TokenInspectorForm key={props.creating ? `new-token/${JSON.stringify(props.creationContext ?? {})}` : token!.id} {...props} model={model} token={props.creating ? undefined : token} />;
}

function TokenInspectorForm({ state, controller, locale, creating, creationContext, model, token, onCreated, onCancel, onSelectComponent, onDirtyChange, externalDirty = false }: Props & { model: FoundationAuthoringProjection; token: FoundationTokenRow | undefined }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const registry = useDraftRegistry();
  const initialType = token?.typeRef.id ?? creationContext?.type ?? "color", initialPrefix = creationContext?.namePrefix?.replace(/\.+$/u, "");
  const [name, setName] = useState(token?.name ?? (initialPrefix ? `${initialPrefix}.` : "")), [description, setDescription] = useState(token?.description ?? "");
  const [type, setType] = useState<FoundationTokenType>(initialType);
  const [value, setValue] = useState<JsonValue>(token && "literal" in token.value ? token.value.literal : token?.resolvedValue ?? defaultTokenValue(initialType));
  const [mode, setMode] = useState<"literal" | "alias" | "expression">(valueMode(token?.value)), [alias, setAlias] = useState(token?.aliasTarget ?? "");
  const [domain, setDomain] = useState(token ? token.domain ?? "" : creationContext?.domain ?? ""), [tier, setTier] = useState(token ? token.tier ?? "" : creationContext?.tier ?? ""), [valueValid, setValueValid] = useState(true);
  const [dirty, setDirty] = useState(false), [deleting, setDeleting] = useState(false), [replacement, setReplacement] = useState(""), [duplicateName, setDuplicateName] = useState("");
  const [expression, setExpression] = useState<FoundationTokenValue>(token?.value ?? emptyExpression()), [expressionValid, setExpressionValid] = useState(true);
  const [deprecated, setDeprecated] = useState(token?.deprecated !== undefined && token.deprecated !== false), [deprecationReason, setDeprecationReason] = useState(typeof token?.deprecated === "string" ? token.deprecated : "");
  const [scope, setScope] = useState("base");
  const [overrideAlias, setOverrideAlias] = useState("");
  const [editorEpoch, setEditorEpoch] = useState(0);
  const disabled = state.busy || state.retryable || state.candidate !== null || model.foundationId !== null && state.pendingBuffers.includes(model.foundationId);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (dirty || !token) return;
    setDeprecated(token.deprecated !== undefined && token.deprecated !== false); setDeprecationReason(typeof token.deprecated === "string" ? token.deprecated : "");
    setName(token.name); setDescription(token.description ?? ""); setDomain(token.domain ?? ""); setTier(token.tier ?? "");
    if (scope === "base") { setMode(valueMode(token.value)); setExpression(token.value); setExpressionValid(true); setAlias(token.aliasTarget ?? ""); setValue("literal" in token.value ? token.value.literal : token.resolvedValue ?? defaultTokenValue(token.typeRef.id)); }
    else {
      const [axisId, context] = JSON.parse(scope) as [string, string];
      const axis = model.axes.find(item => item.id === axisId);
      if (!axis?.contexts.includes(context)) { setScope("base"); setEditorEpoch(epoch => epoch + 1); return; }
      const map = axis.overrides && Object.hasOwn(axis.overrides, context) ? axis.overrides[context] : undefined;
      const override = map && Object.hasOwn(map, token.id) ? map[token.id] : undefined;
      setMode(valueMode(override)); setExpression(override ?? emptyExpression()); setExpressionValid(true);
      setOverrideAlias(override && "ref" in override ? override.ref.id : "");
      setValue(override && "literal" in override ? override.literal : token.resolvedValue ?? defaultTokenValue(token.typeRef.id));
    }
  }, [token, dirty, scope, model.axes]);
  const compatible = model.tokens.filter(item => item.id !== token?.id && item.typeRef.id === type);
  const chosenContext = scope === "base" ? undefined : (() => { try { const parsed = JSON.parse(scope) as [string, string]; return { axisId: parsed[0], context: parsed[1] }; } catch { return undefined; } })();
  const changeScope = (next: string) => {
    setScope(next); setDirty(false); setEditorEpoch(value => value + 1);
    if (next === "base" || !token) { if (token) { setMode(valueMode(token.value)); setExpression(token.value); setExpressionValid(true); setAlias(token.aliasTarget ?? ""); setValue("literal" in token.value ? token.value.literal : token.resolvedValue ?? defaultTokenValue(type)); } return; }
    const [axisId, context] = JSON.parse(next) as [string, string];
    const axis = model.axes.find(item => item.id === axisId), map = axis?.overrides && Object.hasOwn(axis.overrides, context) ? axis.overrides[context] : undefined;
    const override = map && Object.hasOwn(map, token.id) ? map[token.id] : undefined;
    setMode(valueMode(override)); setExpression(override ?? emptyExpression()); setExpressionValid(true);
    setOverrideAlias(override && "ref" in override ? override.ref.id : "");
    setValue(override && "literal" in override ? override.literal : token.resolvedValue ?? defaultTokenValue(type));
  };
  const applied = (action: () => string[]) => { const ids = action(); if (!controller.getSnapshot().error) setDirty(false); return ids; };
  const editValue: FoundationTokenValue = mode === "expression" ? expression : mode === "literal" ? { literal: value } : { ref: { id: chosenContext ? overrideAlias : alias, expectedKind: "token" } };
  const invalidValue = mode === "expression" ? !expressionValid : mode === "literal" ? !valueValid : !(chosenContext ? overrideAlias : alias);
  const apply = () => {
    if (disabled || !name.trim() || invalidValue) return;
    if (creating) {
      const ids = applied(() => controller.foundation({ kind: "token-create", name, type, value: editValue, ...(description ? { description } : {}), ...(domain ? { domain } : {}), ...(tier ? { tier } : {}) }));
      if (ids[0] && !controller.getSnapshot().error) onCreated(ids[0]);
    } else if (token) {
      if (chosenContext) applied(() => controller.foundation({ kind: "theme-override-set", ...chosenContext, id: token.id, value: editValue }));
      else applied(() => controller.foundation([{ kind: "token-update", id: token.id, name, description: description || null, domain: domain || null, tier: tier || null, deprecated: deprecated ? deprecationReason.trim() || true : token.deprecated === undefined ? null : false }, { kind: "token-expression", id: token.id, value: editValue }]));
    }
  };
  const resetForm = () => { setDirty(false); setValueValid(true); changeScope(scope); setEditorEpoch(epoch => epoch + 1); controller.clearInputError(); if (creating) onCancel(); };
  useFormDraft({ id: "foundation-token", label: t("토큰 속성", "Token properties"), dirty,
    valid: !!name.trim() && !invalidValue,
    apply: () => { apply(); return !controller.getSnapshot().error; }, reset: resetForm });
  const selectClassification = (category: "domain" | "tier") => <Field label={category === "domain" ? t("도메인", "Domain") : t("계층", "Tier")}><Select disabled={disabled} aria-label={category === "domain" ? t("도메인", "Domain") : t("계층", "Tier")} value={category === "domain" ? domain : tier} onChange={event => { (category === "domain" ? setDomain : setTier)(event.target.value); setDirty(true); }}><option value="">{t("미분류", "Unassigned")}</option>{(category === "domain" ? model.domains : model.tiers).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>;
  const definition = <Section title={t("정의", "Definition")} defaultOpen={creating}><Field layout="row" label={t("이름", "Name")}><TextInput label={t("토큰 이름", "Token name")} data-testid="foundation-token-name" aria-invalid={!name.trim()} value={name} onCommit={next => { setName(next); setDirty(true); }} />{!name.trim() && <small className="field-error">{t("이름을 입력하세요.", "Enter a name.")}</small>}</Field><Field label={t("설명", "Description")}><TextInput label={t("토큰 설명", "Token description")} value={description} multiline onCommit={next => { setDescription(next); setDirty(true); }} /></Field>
        {creating && <Field layout="row" label={t("값 유형", "Value type")}><Select aria-label={t("값 유형", "Value type")} data-testid="foundation-token-type" value={type} onChange={event => { const next = event.target.value as FoundationTokenType; setType(next); setValue(defaultTokenValue(next)); setMode("literal"); setAlias(""); setValueValid(true); setDirty(true); }}>{TOKEN_TYPES.map(item => <option key={item}>{item}</option>)}</Select></Field>}<div className="value-grid">{selectClassification("domain")}{selectClassification("tier")}</div></Section>;
  return <div className="foundation-inspector compact-token-inspector" data-draft-form="foundation-token"><header className="inspector-title inspector-token-context"><h2 title={token?.name}>{creating ? t("토큰 만들기", "Create token") : token!.name.split(".").at(-1)}</h2><span className="field-hint" title={token?.name}>{creating ? initialPrefix ?? type : `${type} · ${token!.references.length} ${t("참조", "references")}`}</span></header>
    <div className="inspector-material"><TokenVisual type={type} name={name} value={mode === "literal" ? value : mode === "alias" ? model.tokens.find(item => item.id === (chosenContext ? overrideAlias : alias))?.resolvedValue : token?.resolvedValue} domain={model.domains.find(item => item.id === domain)?.name ?? ""} locale={locale} interactive /><span className="field-hint">{dirty ? t("미반영 견본", "Draft specimen") : t("현재 테마의 견본", "Current theme specimen")}</span></div>
    <fieldset disabled={disabled} className="plain-fieldset">
      {!creating && <Field layout="row" label={t("편집 범위", "Editing scope")}><Select data-testid="foundation-token-scope" aria-label={t("편집 범위", "Editing scope")} disabled={dirty} value={scope} onChange={event => changeScope(event.target.value)}><option value="base">{t("기본 토큰", "Base token")}</option>{model.axes.flatMap(axis => axis.contexts.map(context => <option key={`${axis.id}/${context}`} value={JSON.stringify([axis.id, context])}>{axis.name ?? axis.id} / {context}</option>))}</Select>{dirty && <small className="field-hint">{t("범위를 바꾸기 전에 입력을 반영하거나 되돌리세요.", "Apply or reset your form before switching scope.")}</small>}</Field>}
      {creating && scope === "base" && definition}
      <Section title={chosenContext ? t("테마 값", "Theme value") : t("값", "Value")}><Field layout="row" label={t("값의 출처", "Value source")}><Select aria-label={t("값의 출처", "Value source")} value={mode} onChange={event => { const next = event.target.value as "literal" | "alias" | "expression"; setMode(next); if (next === "expression" && valueMode(expression) === "literal") setExpression(emptyExpression()); setExpressionValid(true); setDirty(true); }}><option value="literal">{t("직접 값", "Literal value")}</option><option value="alias">{t("다른 토큰 참조", "Alias to a token")}</option><option value="expression">{t("속성·복합 참조", "Property / composite binding")}</option></Select></Field>
        {mode === "expression" ? <FoundationExpressionEditor key={`${scope}/${editorEpoch}`} value={expression} tokens={model.tokens} {...(token ? { ownerId: token.id } : {})} locale={locale} onChange={next => { setExpression(next); setDirty(true); }} onValidityChange={valid => { setExpressionValid(valid); if (!valid) setDirty(true); }} /> : mode === "alias" ? <Field label={t("참조할 토큰", "Referenced token")} hint={t("같은 유형의 토큰만 선택할 수 있습니다. 순환 참조는 반영 시 검사합니다.", "Choose the same type. Applying checks for cycles.")}><Select aria-label={t("참조할 토큰", "Referenced token")} value={chosenContext ? overrideAlias : alias} onChange={event => { (chosenContext ? setOverrideAlias : setAlias)(event.target.value); setDirty(true); }}><option value="">{t("토큰 선택", "Choose a token")}</option>{compatible.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field> : <TokenValueEditor key={`${type}/${scope}/${editorEpoch}`} type={type} value={value} onChange={next => { setValue(next); setDirty(true); }} onValidityChange={valid => { setValueValid(valid); if (!valid) setDirty(true); }} locale={locale} disabled={disabled} />}
        {mode === "literal" && <TokenSuggestions type={type} domain={model.domains.find(item => item.id === domain)?.name ?? ""} locale={locale} onChoose={next => { setValue(next); setValueValid(true); setDirty(true); setEditorEpoch(epoch => epoch + 1); }} />}
        {chosenContext && token && <Button tone="subtle" disabled={disabled || dirty} onClick={() => { applied(() => controller.foundation({ kind: "theme-override-remove", ...chosenContext, id: token.id })); if (!controller.getSnapshot().error) changeScope("base"); }}>{t("테마 재정의 제거", "Remove theme override")}</Button>}
      </Section>
      {!creating && scope === "base" && definition}
      {!creating && scope === "base" && <Section title={t("사용 상태", "Lifecycle")} defaultOpen={false}><label className="check-row"><input type="checkbox" checked={deprecated} onChange={event => { setDeprecated(event.target.checked); setDirty(true); }} />{t("사용 중단 예정", "Deprecated")}</label><p className="field-hint">{t("기존 연결은 유지됩니다. 대체할 토큰이나 변경 이유를 안내하세요.", "Existing bindings remain active. Describe a replacement or migration reason.")}</p>{deprecated && <Field label={t("전환 안내", "Migration guidance")}><TextInput label={t("사용 중단 안내", "Deprecation guidance")} value={deprecationReason} multiline onCommit={next => { setDeprecationReason(next); setDirty(true); }} /></Field>}</Section>}
      <div className="inspector-actions"><Button tone="primary" data-testid="foundation-token-apply" disabled={disabled || !name.trim() || invalidValue} onClick={apply}>{creating ? t("토큰 만들기", "Create token") : t("미리보기에 반영", "Apply to preview")}</Button>{creating && <Button onClick={onCancel}>{t("취소", "Cancel")}</Button>}{dirty && !creating && <Button disabled={disabled} onClick={resetForm}>{t("입력 되돌리기", "Reset form")}</Button>}</div>
    </fieldset>
    {!creating && token && <><Section title={t("해석 결과와 출처", "Resolved value and origin")} defaultOpen={false}><p className="token-summary">{tokenValueSummary(token.resolvedValue)}</p><ol className="provenance-list">{token.aliasChain.map(id => <li key={id}>{model.tokens.find(item => item.id === id)?.name ?? id}</li>)}</ol>{token.overrideTrace.map((trace, i) => <p className="field-hint" key={i}>{model.axes.find(axis => axis.id === trace.axisId)?.name ?? trace.axisId} / {trace.context}</p>)}<details><summary>{t("안정 ID", "Stable identity")}</summary><code>{token.id}</code></details></Section>
      <Section title={t("이 토큰의 사용", "Token usage")} defaultOpen={false}>{(state.plan?.project ?? state.project) && <TokenUsage model={model} token={token} components={state.projection?.components ?? []} project={(state.plan?.project ?? state.project)!} locale={locale} onSelect={id => { if (registry.flush()) onCreated(id); }} onSelectComponent={onSelectComponent} />}</Section>
      <Section title={t("관리", "Manage")} defaultOpen={false}><Field label={t("복제 이름", "Duplicate name")}><TextInput label={t("복제 이름", "Duplicate name")} value={duplicateName} placeholder={`${token.name} ${t("복사", "copy")}`} disabled={disabled} onCommit={setDuplicateName} /></Field><Button icon="copy" disabled={disabled || dirty} onClick={() => { const ids = applied(() => controller.foundation({ kind: "token-duplicate", id: token.id, name: duplicateName.trim() || `${token.name} ${t("복사", "copy")}` })); if (ids[0] && !controller.getSnapshot().error) onCreated(ids[0]); }}>{t("토큰 복제", "Duplicate token")}</Button><Button tone="danger" icon="trash" disabled={disabled || dirty} onClick={() => setDeleting(!deleting)}>{t("토큰 삭제…", "Delete token…")}</Button>
        {deleting && <div className="manager-form"><p>{t("삭제는 검토할 변경안에 포함됩니다. 사용 중이면 같은 유형의 대체 토큰이 필요합니다.", "Deletion joins the reviewed proposal. A used token needs a replacement of the same type.")}</p><Field label={t("대체 토큰", "Replacement token")}><Select aria-label={t("대체 토큰", "Replacement token")} disabled={disabled} value={replacement} onChange={event => setReplacement(event.target.value)}><option value="">{t("대체 없음", "No replacement")}</option>{compatible.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Button tone="danger" data-testid="foundation-token-delete" disabled={disabled || dirty || token.inUse && !replacement} onClick={() => { applied(() => controller.foundation({ kind: "token-delete", id: token.id, ...(replacement ? { replacementId: replacement } : {}) })); if (!controller.getSnapshot().error) onCancel(); }}>{t("삭제 변경안 만들기", "Propose deletion")}</Button></div>}
      </Section></>}
    {state.error && state.diagnostics.length > 0 && <div className="inline-error" role="alert"><p>{t("변경을 반영하지 못했습니다. 입력을 수정해 다시 시도하세요.", "The change was not applied. Edit your input and try again.")}</p>{state.diagnostics.filter(item => item.severity === "error").slice(0, 5).map((item, i) => <p key={i}><code>{item.path}</code> {item.message}</p>)}</div>}
  </div>;
}
