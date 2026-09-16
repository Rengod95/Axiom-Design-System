import { TokenUsage } from "./token-relationships.tsx";
import { TokenVisual } from "./token-visual.tsx";
import { FoundationExpressionEditor } from "./foundation-expression-editor.tsx";
import { TokenSuggestions } from "./token-suggestions.tsx";
import { useEffect, useMemo, useState } from "react";
import { getFoundationRole, getFoundationRoles, getFoundationRoleDefaultValue, inferFoundationRole, inspectFoundationAuthoring, foundationThemeGroups } from "../../../modules/ads-core/src/index.ts";
import type { FoundationAuthoringProjection, FoundationTokenRow, FoundationTokenType, FoundationTokenValue, JsonValue, StudioCategory } from "../../../modules/ads-core/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import type { Locale } from "./locales.ts";
import { Select, Button, EmptyState, Field, Section, TextInput, copy } from "./ui.tsx";
import { useFormDraft, useDraftRegistry } from "./form-drafts.tsx";
import { TokenValueEditor, defaultTokenValue, tokenValueSummary } from "./token-value-editor.tsx";
import { foundationRoleLabel } from "./foundation-role-labels.ts";
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
  const initialDomain = token?.domain ?? creationContext?.domain ?? model.domains.find(item => item.bindingCategory === "color")?.id ?? model.domains[0]?.id ?? "";
  const initialTier = token?.tier ?? creationContext?.tier ?? model.tiers.find(item => item.role === "semantic" || !model.authoringProfile && item.name.toLowerCase() === "semantic")?.id ?? model.tiers[0]?.id ?? "";
  const initialCategory = model.domains.find(item => item.id === initialDomain)?.bindingCategory;
  const initialRoles = initialCategory ? getFoundationRoles(initialCategory) : [];
  const initialRole = token ? token.role ? getFoundationRole(token.role) : initialCategory ? inferFoundationRole(token, initialCategory) : undefined : getFoundationRole(creationContext?.role ?? "") ?? initialRoles.find(item => item.id === (initialCategory === "color" && model.tiers.find(item => item.id === initialTier)?.name.toLowerCase() === "semantic" ? "color.surface" : initialCategory === "typography" ? "typography.style" : "")) ?? initialRoles.find(item => !creationContext?.type || item.type === creationContext.type);
  const initialType = token?.typeRef.id ?? initialRole?.type ?? creationContext?.type ?? "color", initialPrefix = creationContext?.namePrefix?.replace(/\.+$/u, "");
  const [name, setName] = useState(token?.name ?? (initialPrefix ? `${initialPrefix}.` : "")), [description, setDescription] = useState(token?.description ?? "");
  const [roleId, setRoleId] = useState(initialRole?.id ?? "");
  const [type, setType] = useState<FoundationTokenType>(initialType);
  const [value, setValue] = useState<JsonValue>(token && "literal" in token.value ? token.value.literal : token?.resolvedValue ?? getFoundationRoleDefaultValue(initialRole?.id ?? "") ?? defaultTokenValue(initialType));
  const [mode, setMode] = useState<"literal" | "alias" | "expression">(valueMode(token?.value)), [alias, setAlias] = useState(token?.aliasTarget ?? "");
  const [domain, setDomain] = useState(initialDomain), [tier, setTier] = useState(initialTier), [valueValid, setValueValid] = useState(true);
  const category = model.domains.find(item => item.id === domain)?.bindingCategory;
  const roles = category ? getFoundationRoles(category).filter(item => creating || item.type === type) : [];
  const role = roles.find(item => item.id === roleId);
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
    setRoleId(token.role ?? (initialCategory ? inferFoundationRole(token, initialCategory)?.id : undefined) ?? ""); setName(token.name); setDescription(token.description ?? ""); setDomain(token.domain ?? ""); setTier(token.tier ?? "");
    if (scope === "base") { setMode(valueMode(token.value)); setExpression(token.value); setExpressionValid(true); setAlias(token.aliasTarget ?? ""); setValue("literal" in token.value ? token.value.literal : token.resolvedValue ?? defaultTokenValue(token.typeRef.id)); }
    else {
      const override = scopedValue(scope) ?? token.value;
      if (scope.startsWith("group:") && !model.valueSets.some(group => `group:${group.id}` === scope)) { setScope("base"); return; }
      setMode(valueMode(override)); setExpression(override ?? emptyExpression()); setExpressionValid(true);
      setOverrideAlias(override && "ref" in override ? override.ref.id : "");
      setValue(override && "literal" in override ? override.literal : token.resolvedValue ?? defaultTokenValue(token.typeRef.id));
    }
  }, [token, dirty, scope, model.axes, model.valueSets]);
  const compatible = model.tokens.filter(item => {
    if (item.id === token?.id || item.typeRef.id !== type) return false;
    const targetCategory = model.domains.find(domain => domain.id === item.domain)?.bindingCategory;
    const targetRole = targetCategory ? inferFoundationRole(item, targetCategory) : undefined;
    return role ? targetRole ? role.references.includes(targetRole.id) : targetCategory === category : item.domain === domain;
  });
  const chosenGroup = scope.startsWith("group:") ? model.valueSets.find(group => `group:${group.id}` === scope) : undefined;
  const chosenContext = scope === "base" || chosenGroup ? undefined : (() => { try { const parsed = JSON.parse(scope) as [string, string]; return { axisId: parsed[0], context: parsed[1] }; } catch { return undefined; } })();
  const scopedValue = (key: string): FoundationTokenValue | undefined => {
    if (!token) return undefined;
    if (key.startsWith("group:")) return model.valueSets.find(group => `group:${group.id}` === key)?.values[token.id];
    try { const [axisId, context] = JSON.parse(key) as [string, string]; return model.axes.find(item => item.id === axisId)?.overrides?.[context]?.[token.id]; } catch { return undefined; }
  };
  const groupsForToken = model.valueSets.filter(group => !group.domain || group.domain === domain);
  const activeTheme = model.themeSets.find(theme => theme.id === state.selection.themeSetId) ?? model.themeSets[0];
  const activeGroups = activeTheme ? foundationThemeGroups({ themeAxes: model.axes, valueSets: model.valueSets, resolutionOrder: model.resolutionOrder }, activeTheme) : [];
  const affectedThemes = chosenGroup ? model.themeSets.filter(theme => foundationThemeGroups({ themeAxes: model.axes, valueSets: model.valueSets, resolutionOrder: model.resolutionOrder }, theme).some(group => group.id === chosenGroup.id)) : [];
  const changeScope = (next: string) => {
    setScope(next); setDirty(false); setEditorEpoch(value => value + 1);
    if (next === "base" || !token) { if (token) { setMode(valueMode(token.value)); setExpression(token.value); setExpressionValid(true); setAlias(token.aliasTarget ?? ""); setValue("literal" in token.value ? token.value.literal : token.resolvedValue ?? defaultTokenValue(type)); } return; }
    const override = scopedValue(next) ?? token.value;
    setMode(valueMode(override)); setExpression(override ?? emptyExpression()); setExpressionValid(true);
    setOverrideAlias(override && "ref" in override ? override.ref.id : "");
    setValue(override && "literal" in override ? override.literal : token.resolvedValue ?? defaultTokenValue(type));
  };
  const applied = (action: () => string[]) => { const ids = action(); if (!controller.getSnapshot().error) setDirty(false); return ids; };
  const editValue: FoundationTokenValue = mode === "expression" ? expression : mode === "literal" ? { literal: value } : { ref: { id: scope !== "base" ? overrideAlias : alias, expectedKind: "token" } };
  const invalidValue = (creating && !role) || (mode === "expression" ? !expressionValid : mode === "literal" ? !valueValid : !(scope !== "base" ? overrideAlias : alias));
  const apply = () => {
    if (!creating && !dirty || disabled || !name.trim() || name.endsWith(".") || invalidValue) return;
    if (creating) {
      const ids = applied(() => controller.foundation({ kind: "token-create", name, type, value: editValue, ...(description ? { description } : {}), ...(domain ? { domain } : {}), ...(tier ? { tier } : {}), ...(role ? { role: role.id } : {}) }));
      if (ids[0] && !controller.getSnapshot().error) onCreated(ids[0]);
    } else if (token) {
      if (chosenGroup) applied(() => controller.foundation({ kind: "value-set-value", id: chosenGroup.id, tokenId: token.id, value: editValue }));
      else if (chosenContext) applied(() => controller.foundation({ kind: "theme-override-set", ...chosenContext, id: token.id, value: editValue }));
      else applied(() => controller.foundation([{ kind: "token-update", id: token.id, name, description: description || null, domain: domain || null, tier: tier || null, ...(role ? { role: role.id } : {}), deprecated: deprecated ? deprecationReason.trim() || true : token.deprecated === undefined ? null : false }, { kind: "token-expression", id: token.id, value: editValue }]));
    }
  };
  const resetForm = () => { setDirty(false); setValueValid(true); changeScope(scope); setEditorEpoch(epoch => epoch + 1); controller.clearInputError(); if (creating) onCancel(); };
  useFormDraft({ id: "foundation-token", label: t("토큰 속성", "Token properties"), dirty,
    valid: !!name.trim() && !name.endsWith(".") && !invalidValue,
    apply: () => { apply(); return !controller.getSnapshot().error; }, reset: resetForm });
  const chooseRole = (id: string) => {
    const next = roles.find(item => item.id === id); if (!next) return;
    setRoleId(id); setDirty(true);
    if (creating) { setType(next.type); setValue(getFoundationRoleDefaultValue(id)!); setValueValid(true); setMode("literal"); setAlias(""); setEditorEpoch(epoch => epoch + 1); }
  };
  const selectClassification = (kind: "domain" | "tier") => <Field label={kind === "domain" ? t("도메인", "Domain") : t("레이어", "Layer")}><Select disabled={disabled} aria-label={kind === "domain" ? t("도메인", "Domain") : t("레이어", "Layer")} value={kind === "domain" ? domain : tier} onChange={event => {
    const next = event.target.value;
    if (kind === "tier") setTier(next);
    else {
      setDomain(next);
      const purpose = model.domains.find(item => item.id === next)?.bindingCategory;
      const candidate = purpose ? getFoundationRoles(purpose).find(item => creating || item.type === type) : undefined;
      setRoleId(candidate?.id ?? "");
      if (creating && candidate) { setType(candidate.type); setValue(getFoundationRoleDefaultValue(candidate.id)!); setMode("literal"); setValueValid(true); setEditorEpoch(epoch => epoch + 1); }
    }
    setDirty(true);
  }}>{(kind === "domain" ? model.domains.filter(item => creating || !item.allowedTypes || item.allowedTypes.includes(type)) : model.tiers).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>;
  const definition = <Section title={creating ? t("토큰 만들기", "Create token") : t("이름과 용도", "Name and purpose")} defaultOpen={creating}>
    <div className="value-grid">{selectClassification("domain")}{selectClassification("tier")}</div>
    <Field label={t("용도", "Purpose")}><Select aria-label={t("토큰 용도", "Token purpose")} data-testid="foundation-token-role" value={roleId} onChange={event => chooseRole(event.target.value)}>{!role && <option value="">{t("용도 선택", "Choose a purpose")}</option>}{roles.map(item => <option value={item.id} key={item.id}>{foundationRoleLabel(item, locale)}</option>)}</Select></Field>
    {!roles.length && <p className="field-error">{t("이 도메인의 작성 프로필을 먼저 설정하세요.", "Set this domain’s authoring profile before creating tokens.")}</p>}
    <Field layout="row" label={t("이름", "Name")}><TextInput label={t("토큰 이름", "Token name")} data-testid="foundation-token-name" aria-invalid={!name.trim() || name.endsWith(".")} value={name} placeholder={role ? role.id : t("토큰 이름", "Token name")} onCommit={next => { setName(next); setDirty(true); }} />{(!name.trim() || name.endsWith(".")) && <small className="field-hint">{t("그룹 뒤에 이 토큰의 이름을 입력하세요.", "Give this token a name within its group.")}</small>}</Field>
    <details className="optional-field"><summary>{t("설명 추가", "Add description")}</summary><Field label={t("설명", "Description")}><TextInput label={t("토큰 설명", "Token description")} value={description} multiline onCommit={next => { setDescription(next); setDirty(true); }} /></Field></details>
  </Section>;
  return <div className="foundation-inspector compact-token-inspector" data-draft-form="foundation-token"><header className="inspector-title inspector-token-context"><h2 title={token?.name}>{creating ? t("토큰 만들기", "Create token") : token!.name.split(".").at(-1)}</h2><span className="field-hint" title={token?.name}>{creating ? initialPrefix ?? (role ? foundationRoleLabel(role, locale) : "") : role ? foundationRoleLabel(role, locale) : t("용도 미분류", "Purpose unassigned")}</span>{!creating && <div className="foundation-inspector-context-path">{token!.name.split(".").slice(0, -1).join(" / ")}</div>}</header>
    <div className="inspector-material"><TokenVisual type={type} name={name} value={mode === "literal" ? value : mode === "alias" ? model.tokens.find(item => item.id === (scope !== "base" ? overrideAlias : alias))?.resolvedValue : token?.resolvedValue} domain={model.domains.find(item => item.id === domain)?.name ?? ""} locale={locale} interactive /><span className="field-hint">{dirty ? t("미반영 견본", "Draft specimen") : scope === "base" ? t("공통 기본값", "Shared base value") : t("선택한 범위의 값", "Value in this scope")}</span></div>
    <fieldset disabled={disabled} className="plain-fieldset">
      {!creating && <div className="foundation-edit-scope"><Field layout="row" label={t("수정 대상", "Edit scope")}><Select data-testid="foundation-token-scope" aria-label={t("편집 범위", "Editing scope")} disabled={dirty} value={scope} onChange={event => changeScope(event.target.value)}><option value="base">{t("공통 기본값", "Shared base")}</option>{groupsForToken.map(group => <option key={group.id} value={`group:${group.id}`}>{group.name}{activeGroups.some(item => item.id === group.id) ? t(" · 미리보기 테마에서 사용", " · preview theme") : ""}</option>)}{model.axes.filter(axis => axis.overrides && Object.keys(axis.overrides).length > 0).flatMap(axis => axis.contexts.map(context => <option key={`${axis.id}/${context}`} value={JSON.stringify([axis.id, context])}>{axis.name ?? axis.id} / {context}</option>))}</Select>{dirty && <small className="field-hint">{t("범위를 바꾸기 전에 입력을 반영하거나 되돌리세요.", "Apply or reset your form before switching scope.")}</small>}</Field><p>{scope === "base" ? t("이 토큰을 상속하는 모든 테마에 영향을 줍니다.", "Affects every theme that inherits this token.") : chosenGroup ? affectedThemes.length ? t(`${affectedThemes.map(theme => theme.name ?? theme.id).join(", ")} 테마에서 이 그룹을 함께 사용합니다.`, `This group is shared by ${affectedThemes.map(theme => theme.name ?? theme.id).join(", ")}.`) : t("아직 테마에 연결되지 않은 그룹입니다.", "This group is not connected to a theme yet.") : t("이 컨텍스트를 사용하는 테마에 적용됩니다.", "Applies to themes using this context.")}</p></div>}
      {creating && scope === "base" && definition}
      {chosenGroup && token && !Object.hasOwn(chosenGroup.values, token.id) && <p className="group-inherits-hint field-hint">{t("이 그룹은 현재 공통 기본값을 상속합니다. 값을 바꾸어 반영하면 이 그룹에만 재정의가 생깁니다.", "This group currently inherits the shared base. Applying an edit creates an override for this group only.")}</p>}
      <Section title={scope !== "base" ? t("테마 값", "Theme value") : t("값", "Value")}><Field layout="row" label={t("값의 출처", "Value source")}><Select aria-label={t("값의 출처", "Value source")} value={mode} onChange={event => { const next = event.target.value as "literal" | "alias" | "expression"; setMode(next); if (next === "expression" && valueMode(expression) === "literal") setExpression(emptyExpression()); setExpressionValid(true); setDirty(true); }}><option value="literal">{t("직접 값", "Literal value")}</option><option value="alias">{t("다른 토큰 참조", "Alias to a token")}</option><option value="expression">{t("속성·복합 참조", "Property / composite binding")}</option></Select></Field>
        {mode === "expression" ? <FoundationExpressionEditor key={`${scope}/${editorEpoch}`} value={expression} tokens={model.tokens} {...(token ? { ownerId: token.id } : {})} locale={locale} onChange={next => { setExpression(next); setDirty(true); }} onValidityChange={valid => { setExpressionValid(valid); if (!valid) setDirty(true); }} /> : mode === "alias" ? <Field label={t("참조할 토큰", "Referenced token")} hint={t("이 용도에 연결할 수 있는 토큰만 표시합니다. 연결을 바꾸어도 원천 값은 유지됩니다.", "Only compatible purposes are shown. Replacing a connection preserves its source value.")}><Select aria-label={t("참조할 토큰", "Referenced token")} value={scope !== "base" ? overrideAlias : alias} onChange={event => { (scope !== "base" ? setOverrideAlias : setAlias)(event.target.value); setDirty(true); }}><option value="">{t("토큰 선택", "Choose a token")}</option>{compatible.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field> : <TokenValueEditor key={`${type}/${scope}/${editorEpoch}`} type={type} value={value} numericRange={role?.type === "number" ? { min: role.minimum ?? 0, max: role.maximum ?? (role.id === "layer.order" ? 1000 : 3), step: role.integer ? 1 : .01 } : role?.id === "motion.delay" ? typeof value === "object" && value !== null && !Array.isArray(value) && value.unit === "s" ? { min: -2, max: 2, step: .01 } : { min: -2000, max: 2000, step: 10 } : undefined} onChange={next => { setValue(next); setDirty(true); }} onValidityChange={valid => { setValueValid(valid); if (!valid) setDirty(true); }} locale={locale} disabled={disabled} />}
        {mode === "literal" && <TokenSuggestions type={type} domain={model.domains.find(item => item.id === domain)?.name ?? ""} roleId={roleId} locale={locale} onChoose={next => { setValue(next); setValueValid(true); setDirty(true); setEditorEpoch(epoch => epoch + 1); }} />}
        {chosenGroup && token && <Button tone="subtle" disabled={disabled || dirty || !Object.hasOwn(chosenGroup.values, token.id)} onClick={() => { applied(() => controller.foundation({ kind: "value-set-value", id: chosenGroup.id, tokenId: token.id, value: null })); if (!controller.getSnapshot().error) changeScope("base"); }}>{t("그룹 재정의 제거 · 기본값 상속", "Remove group override · inherit base")}</Button>}
        {chosenContext && token && <Button tone="subtle" disabled={disabled || dirty} onClick={() => { applied(() => controller.foundation({ kind: "theme-override-remove", ...chosenContext, id: token.id })); if (!controller.getSnapshot().error) changeScope("base"); }}>{t("테마 재정의 제거", "Remove theme override")}</Button>}
      </Section>
      {!creating && scope === "base" && definition}
      {!creating && scope === "base" && <Section title={t("사용 상태", "Lifecycle")} defaultOpen={false}><label className="check-row"><input type="checkbox" checked={deprecated} onChange={event => { setDeprecated(event.target.checked); setDirty(true); }} />{t("사용 중단 예정", "Deprecated")}</label><p className="field-hint">{t("기존 연결은 유지됩니다. 대체할 토큰이나 변경 이유를 안내하세요.", "Existing bindings remain active. Describe a replacement or migration reason.")}</p>{deprecated && <Field label={t("전환 안내", "Migration guidance")}><TextInput label={t("사용 중단 안내", "Deprecation guidance")} value={deprecationReason} multiline onCommit={next => { setDeprecationReason(next); setDirty(true); }} /></Field>}</Section>}
      <div className="inspector-actions"><Button tone="primary" data-testid="foundation-token-apply" disabled={disabled || !creating && !dirty || !name.trim() || name.endsWith(".") || invalidValue} onClick={apply}>{creating ? t("토큰 만들기", "Create token") : t("변경안에 반영", "Apply to proposal")}</Button>{creating && <Button onClick={onCancel}>{t("취소", "Cancel")}</Button>}{dirty && !creating && <Button disabled={disabled} onClick={resetForm}>{t("입력 되돌리기", "Reset form")}</Button>}</div>
    </fieldset>
    {!creating && token && <><Section title={t("해석 결과와 출처", "Resolved value and origin")} defaultOpen={false}><p className="field-hint">DTCG · {type}</p><p className="token-summary">{tokenValueSummary(token.resolvedValue)}</p><ol className="provenance-list">{token.aliasChain.map(id => <li key={id}>{model.tokens.find(item => item.id === id)?.name ?? id}</li>)}</ol>{token.overrideTrace.map((trace, i) => <p className="field-hint" key={i}>{model.axes.find(axis => axis.id === trace.axisId)?.name ?? trace.axisId} / {trace.context}</p>)}<details><summary>{t("안정 ID", "Stable identity")}</summary><code>{token.id}</code></details></Section>
      <Section title={t("이 토큰의 사용", "Token usage")} defaultOpen={false}>{(state.plan?.project ?? state.project) && <TokenUsage model={model} token={token} components={state.projection?.components ?? []} project={(state.plan?.project ?? state.project)!} locale={locale} onSelect={id => { if (registry.flush()) onCreated(id); }} onSelectComponent={onSelectComponent} />}</Section>
      <Section title={t("관리", "Manage")} defaultOpen={false}><Field label={t("복제 이름", "Duplicate name")}><TextInput label={t("복제 이름", "Duplicate name")} value={duplicateName} placeholder={`${token.name} ${t("복사", "copy")}`} disabled={disabled} onCommit={setDuplicateName} /></Field><Button icon="copy" disabled={disabled || dirty} onClick={() => { const ids = applied(() => controller.foundation({ kind: "token-duplicate", id: token.id, name: duplicateName.trim() || `${token.name} ${t("복사", "copy")}` })); if (ids[0] && !controller.getSnapshot().error) onCreated(ids[0]); }}>{t("토큰 복제", "Duplicate token")}</Button><Button tone="danger" icon="trash" disabled={disabled || dirty} onClick={() => setDeleting(!deleting)}>{t("토큰 삭제…", "Delete token…")}</Button>
        {deleting && <div className="manager-form"><p>{t("삭제는 검토할 변경안에 포함됩니다. 사용 중이면 같은 유형의 대체 토큰이 필요합니다.", "Deletion joins the reviewed proposal. A used token needs a replacement of the same type.")}</p><Field label={t("대체 토큰", "Replacement token")}><Select aria-label={t("대체 토큰", "Replacement token")} disabled={disabled} value={replacement} onChange={event => setReplacement(event.target.value)}><option value="">{t("대체 없음", "No replacement")}</option>{compatible.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Button tone="danger" data-testid="foundation-token-delete" disabled={disabled || dirty || token.inUse && !replacement} onClick={() => { applied(() => controller.foundation({ kind: "token-delete", id: token.id, ...(replacement ? { replacementId: replacement } : {}) })); if (!controller.getSnapshot().error) onCancel(); }}>{t("삭제 변경안 만들기", "Propose deletion")}</Button></div>}
      </Section></>}
    {state.error && state.diagnostics.length > 0 && <div className="inline-error" role="alert"><p>{t("변경을 반영하지 못했습니다. 입력을 수정해 다시 시도하세요.", "The change was not applied. Edit your input and try again.")}</p>{state.diagnostics.filter(item => item.severity === "error").slice(0, 5).map((item, i) => <p key={i}><code>{item.path}</code> {item.message}</p>)}</div>}
  </div>;
}
