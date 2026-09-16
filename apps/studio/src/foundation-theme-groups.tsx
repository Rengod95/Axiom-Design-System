import { useEffect, useMemo, useState } from "react";
import { foundationThemeGroups } from "../../../modules/ads-core/src/index.ts";
import type { AdsDocument, FoundationAuthoringProjection, FoundationThemeSet } from "../../../modules/ads-core/src/index.ts";
import type { StudioController } from "./controller.ts";
import type { Locale } from "./locales.ts";
import { Button, Field, Select, TextInput, copy } from "./ui.tsx";
import { TokenSpecimen } from "./token-specimen.tsx";
import { DOMAIN_LABELS } from "./foundation-starter-panel.tsx";
import { resolveThemeDraft, valueGroupDraftState } from "./foundation-theme-preview.ts";
import { useFormDraft } from "./form-drafts.tsx";

/** A named theme connects to shared groups; changing the connection never copies token identities. */
export function FoundationThemeGroups({ model, document, theme, locale, disabled, onChange }: { model: FoundationAuthoringProjection; document: AdsDocument | undefined; theme: FoundationThemeSet; locale: Locale; disabled: boolean; onChange(ids: string[]): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const { inherited, effective } = useMemo(() => {
    const source = { themeAxes: model.axes, valueSets: model.valueSets, resolutionOrder: model.resolutionOrder };
    return { inherited: foundationThemeGroups(source, { ...theme, valueSetIds: [] }), effective: foundationThemeGroups(source, theme) };
  }, [model.axes, model.valueSets, model.resolutionOrder, theme]);
  const preview = useMemo(() => resolveThemeDraft(document, theme), [document, theme]);
  const resolved = useMemo(() => new Map(preview.tokens.map(token => [token.id, token.value])), [preview]);
  return <section className="theme-group-connections"><header><h3>{t("도메인별 값 연결", "Values connected to this theme")}</h3><p className="field-hint">{t("테마는 토큰을 복제하지 않고 값 그룹에 연결됩니다. 그룹에서 정하지 않은 토큰은 공통 기본값을 사용합니다.", "A theme connects to groups without duplicating tokens. Tokens without a group override use their shared base.")}</p></header>
    {!preview.valid && <p className="field-hint" role="status" data-testid="foundation-theme-preview-invalid">{t("미리보기 없음", "Preview unavailable")} · {preview.diagnostics[0]?.message}</p>}
    <div className="theme-group-rows">{model.domains.map(domain => {
      const groups = model.valueSets.filter(group => group.domain === domain.id);
      const active = effective.filter(group => group.domain === domain.id);
      const automatic = inherited.filter(group => group.domain === domain.id);
      const selected = (theme.valueSetIds ?? []).find(id => groups.some(group => group.id === id)) ?? "";
      const label = DOMAIN_LABELS[domain.name.toLowerCase()] ? t(...DOMAIN_LABELS[domain.name.toLowerCase()]!) : domain.name;
      const previews = preview.valid ? [...new Set(active.flatMap(group => Object.keys(group.values)))].slice(0, 4) : [];
      return <div className="theme-group-row" key={domain.id}><div><strong>{label}</strong><small>{active.length ? active.map(group => group.name).join(" · ") : t("공통 기본값", "Shared base values")}</small></div><div className="theme-value-preview" aria-hidden="true">{previews.map(id => { const token = model.tokens.find(token => token.id === id); const value = resolved.get(id); return token && value !== undefined ? <TokenSpecimen key={id} token={{ ...token, resolvedValue: value }} /> : null; })}</div><Select aria-label={t(`${label} 값 그룹`, `${label} value group`)} disabled={disabled} value={selected} onChange={event => onChange([...(theme.valueSetIds ?? []).filter(id => !groups.some(group => group.id === id)), ...(event.target.value ? [event.target.value] : [])])}><option value="">{automatic.length ? t(`자동 · ${automatic.map(group => group.name).join(", ")}`, `Automatic · ${automatic.map(group => group.name).join(", ")}`) : t("공통 기본값 사용", "Use shared base")}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</Select></div>;
    })}</div>
  </section>;
}

export function FoundationValueGroupManager({ model, controller, locale, disabled, onDirtyChange }: { model: FoundationAuthoringProjection; controller: StudioController; locale: Locale; disabled: boolean; onDirtyChange(dirty: boolean): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const defaultDomain = model.domains.find(item => item.bindingCategory === "color")?.id ?? model.domains[0]?.id ?? "";
  const [selected, setSelected] = useState(""), [name, setName] = useState(""), [domain, setDomain] = useState(defaultDomain), [copyFrom, setCopyFrom] = useState(""), [replacement, setReplacement] = useState("");
  const [baseline, setBaseline] = useState<{ group: { id: string; name: string } | undefined; domain: string }>({ group: undefined, domain: defaultDomain });
  const group = model.valueSets.find(item => item.id === selected);
  const draft = valueGroupDraftState({ name, domain, copyFrom }, baseline.group, baseline.domain, model.domains.map(item => item.id));
  const dirty = draft.dirty, valid = draft.valid && (!selected || Boolean(group));
  const choose = (id: string) => {
    const next = model.valueSets.find(item => item.id === id);
    setSelected(next?.id ?? ""); setName(next?.name ?? ""); setDomain(next?.domain ?? defaultDomain); setCopyFrom(""); setReplacement("");
    setBaseline({ group: next ? { id: next.id, name: next.name } : undefined, domain: defaultDomain });
  };
  useEffect(() => {
    // Undo, rejected proposals and source refreshes update clean forms. Real local
    // edits retain their baseline and cannot silently recreate a removed group.
    if (dirty) return;
    if (selected && !group || group && (baseline.group?.id !== group.id || baseline.group.name !== group.name) || !selected && baseline.domain !== defaultDomain) choose(group?.id ?? "");
  }, [group, selected, dirty, baseline, defaultDomain]);
  const apply = () => {
    if (!dirty) return true;
    if (!valid) return false;
    const ids = controller.foundation(group ? { kind: "value-set-update", id: group.id, name } : { kind: "value-set-create", name, domain, ...(copyFrom ? { copyFrom } : {}) });
    if (controller.getSnapshot().error) return false;
    const id = ids[0] ?? group?.id;
    if (id) { setSelected(id); setBaseline({ group: { id, name }, domain: defaultDomain }); setCopyFrom(""); }
    return true;
  };
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useFormDraft({ id: "foundation-manager-value-group", label: t("공유 값 그룹", "Shared value group"), dirty, valid, apply, reset: () => { choose(selected); controller.clearInputError(); } });
  const connected = group ? model.themeSets.filter(theme => foundationThemeGroups({ themeAxes: model.axes, valueSets: model.valueSets, resolutionOrder: model.resolutionOrder }, theme).some(item => item.id === group.id)) : [];
  return <details className="foundation-value-group-manager" data-draft-form="foundation-manager-value-group"><summary>{t(`공유 값 그룹 관리 · ${model.valueSets.length}`, `Manage shared value groups · ${model.valueSets.length}`)}</summary><p className="field-hint">{t("예: Light 색상 / Dark 색상. 그룹의 토큰 값은 토큰 화면의 ‘수정 대상’에서 편집합니다.", "For example: Light colors / Dark colors. Edit individual values from a token’s edit scope.")}</p><div className="manager-list"><Button icon="plus" disabled={disabled || dirty} onClick={() => choose("")}>{t("새 그룹", "New group")}</Button>{model.valueSets.map(group => <Button key={group.id} tone={selected === group.id ? "primary" : "subtle"} disabled={disabled || dirty} onClick={() => choose(group.id)}>{group.name}<span>{Object.keys(group.values).length}</span></Button>)}</div><fieldset className="manager-form" disabled={disabled}>
    <Field label={t("그룹 이름", "Group name")}><TextInput label={t("값 그룹 이름", "Value group name")} value={name} placeholder="Light colors" onCommit={setName} /></Field>
    {!group && <><Field label={t("도메인", "Domain")}><Select aria-label={t("값 그룹 도메인", "Value group domain")} value={domain} onChange={event => { setDomain(event.target.value); setCopyFrom(""); }}>{model.domains.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label={t("시작 값", "Starting values")}><Select aria-label={t("값 그룹 복사 원본", "Copy value group")} value={copyFrom} onChange={event => setCopyFrom(event.target.value)}><option value="">{t("공통 기본값 상속", "Inherit shared base")}</option>{model.valueSets.filter(item => item.domain === domain).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field></>}
    {group && <p className="field-hint">{connected.length ? t(`${connected.map(theme => theme.name ?? theme.id).join(", ")} 테마에서 사용 중`, `Used by ${connected.map(theme => theme.name ?? theme.id).join(", ")}`) : t("아직 연결된 테마가 없습니다.", "No theme is connected yet.")}</p>}
    <Button tone="primary" disabled={disabled || !dirty || !valid} onClick={apply}>{group ? t("그룹 이름 반영", "Apply group name") : t("그룹 만들기", "Create group")}</Button>
    {dirty && <Button disabled={disabled} onClick={() => { choose(selected); controller.clearInputError(); }}>{t("그룹 입력 되돌리기", "Reset group form")}</Button>}
    {group && <details><summary>{t("그룹 삭제", "Delete group")}</summary><Field label={t("대체 그룹", "Replacement group")}><Select aria-label={t("대체 값 그룹", "Replacement value group")} value={replacement} onChange={event => setReplacement(event.target.value)}><option value="">{t("대체 없음", "No replacement")}</option>{model.valueSets.filter(item => item.id !== group.id && item.domain === group.domain).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Button tone="danger" disabled={disabled || dirty || connected.length > 0 && !replacement} onClick={() => { controller.foundation({ kind: "value-set-delete", id: group.id, ...(replacement ? { replacementId: replacement } : {}) }); if (!controller.getSnapshot().error) choose(""); }}>{t("삭제 변경안 만들기", "Propose deletion")}</Button></details>}
  </fieldset></details>;
}
