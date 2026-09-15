import { useEffect, useState } from "react";
import { createStudioBehaviorState, dispatchStudioBehavior, inspectStudioBehavior, inspectTypedValue, readStudioBehavior, studioBehaviorValues, STUDIO_BEHAVIOR_TRIGGERS, STUDIO_BEHAVIOR_VERSION } from "../../../modules/ads-core/src/index.ts";
import type { JsonObject, JsonValue, StudioBehaviorAction, StudioBehaviorDefinition, StudioBehaviorResult, StudioBehaviorRule, StudioBehaviorScalar, StudioBehaviorState, StudioBehaviorTrigger, StudioComponent, StudioComponentEdit } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Button, Field, IconButton, Section, Select, copy } from "./ui.tsx";
import { useFormDraft } from "./form-drafts.tsx";
import { object } from "./ui-utils.ts";

const rows = (value: unknown): JsonObject[] => Array.isArray(value) ? value.filter(object) : [];
const triggers: Record<StudioBehaviorTrigger, [string, string]> = { press: ["누르기", "Press"], change: ["값 변경", "Change"], focus: ["포커스 진입", "Focus"], blur: ["포커스 이탈", "Blur"] };
function sample(type: JsonValue | undefined): JsonValue {
  if (!object(type)) return {};
  if (type.kind === "boolean") return true;
  if (type.kind === "number") return 0;
  if (type.kind === "string") return "";
  if (type.kind === "enum") return Array.isArray(type.values) ? type.values[0] ?? "" : "";
  if (type.kind === "list") return [];
  if (type.kind === "nullable") return null;
  if (type.kind === "record" && object(type.fields) && Array.isArray(type.required)) return Object.fromEntries(type.required.filter((key): key is string => typeof key === "string").map(key => [key, sample((type.fields as JsonObject)[key])]));
  return {};
}

export interface BehaviorEditorProps {
  component: StudioComponent; document: JsonObject; locale: Locale;
  onEdit(edit: StudioComponentEdit | StudioComponentEdit[]): boolean;
}

/** Rules stay in the normal draft registry; simulation only owns temporary instance values. */
export function BehaviorEditor({ component, document, locale, onEdit }: BehaviorEditorProps) {
  const t = (ko: string, en: string) => copy(locale, ko, en), definition = readStudioBehavior(document), ports = studioBehaviorValues(document);
  const locals = ports.filter(port => port.ownership === "local"), events = object(document.publicContract) ? rows(document.publicContract.events) : [];
  const [selected, setSelected] = useState<string | null>(null), [draft, setDraft] = useState<StudioBehaviorRule | null>(null), [dirty, setDirty] = useState(false);
  const [lexical, setLexical] = useState<Record<string, string>>({}), [badFields, setBadFields] = useState<string[]>([]);
  const [runtime, setRuntime] = useState<StudioBehaviorState>(() => createStudioBehaviorState(document)), [trace, setTrace] = useState<StudioBehaviorResult[]>([]), [runError, setRunError] = useState("");
  const [stateName, setStateName] = useState("active"), [stateKind, setStateKind] = useState<"boolean" | "number" | "string">("boolean");
  const sourceKey = JSON.stringify([component.id, document.studioBehavior, document.publicContract]);
  useEffect(() => { setRuntime(createStudioBehaviorState(document)); setTrace([]); setRunError(""); }, [sourceKey]);
  useEffect(() => { if (!dirty && selected) setDraft(definition.rules.find(rule => rule.id === selected) ?? null); }, [sourceKey, selected, dirty]);
  const candidate: StudioBehaviorDefinition = { version: STUDIO_BEHAVIOR_VERSION, rules: draft ? selected ? definition.rules.map(rule => rule.id === selected ? draft : rule) : [...definition.rules, draft] : definition.rules };
  const errors: string[] = []; inspectStudioBehavior({ ...document, studioBehavior: candidate as unknown as JsonObject }, (_path, message) => errors.push(message));
  const valid = !errors.length && !badFields.length;
  const reset = () => { setDirty(false); setLexical({}); setBadFields([]); setDraft(selected ? definition.rules.find(rule => rule.id === selected) ?? null : null); };
  const apply = () => { if (!draft || !valid || !onEdit({ kind: "behavior-set", behavior: candidate })) return false; setSelected(draft.id); setDirty(false); setLexical({}); setBadFields([]); return true; };
  const formId = `behavior-${component.id}`;
  useFormDraft({ id: formId, label: t("행동 규칙", "Behavior rule"), dirty, valid, apply, reset });
  const update = (patch: Partial<StudioBehaviorRule>) => { if (draft) { setDraft({ ...draft, ...patch }); setDirty(true); } };
  const updateAction = (index: number, action: StudioBehaviorAction) => { if (draft) update({ actions: draft.actions.map((current, at) => at === index ? action : current) }); };
  const defaultAction = (): StudioBehaviorAction | null => {
    const local = locals[0];
    if (local) return object(local.type) && local.type.kind === "boolean" ? { kind: "toggle", valueRef: String(local.id) } : { kind: "set", valueRef: String(local.id), value: local.defaultValue as StudioBehaviorScalar };
    const event = events[0]; return event ? { kind: "emit", eventRef: String(event.id), payload: sample(event.payloadType) } : null;
  };
  const start = () => {
    const action = defaultAction(); if (!action) return;
    let next = 1; while (definition.rules.some(rule => rule.id === `${component.id}.behavior.${next}`)) next++;
    setSelected(null); setDraft({ id: `${component.id}.behavior.${next}`, name: t("새 행동", "New behavior"), targetPartRef: component.parts.find(part => part.parent === null)!.id, trigger: "press", condition: null, actions: [action] }); setDirty(true); setLexical({}); setBadFields([]);
  };
  const literal = (key: string, label: string, port: JsonObject, value: JsonValue, change: (value: StudioBehaviorScalar) => void) => {
    const type = object(port.type) ? port.type : {};
    if (type.kind === "boolean" || type.kind === "enum") return <Select aria-label={label} value={String(value)} onChange={event => change(type.kind === "boolean" ? event.target.value === "true" : event.target.value)}>{(type.kind === "boolean" ? ["false", "true"] : Array.isArray(type.values) ? type.values.map(String) : []).map(option => <option value={option} key={option}>{option}</option>)}</Select>;
    return <input aria-label={label} value={lexical[key] ?? String(value)} inputMode={type.kind === "number" ? "decimal" : undefined} aria-invalid={badFields.includes(key) || undefined} onChange={event => {
      const text = event.target.value, next = type.kind === "number" ? text.trim() ? Number(text) : NaN : text;
      setLexical(previous => ({ ...previous, [key]: text })); setDirty(true);
      const okay = inspectTypedValue(type, next).valid;
      setBadFields(previous => okay ? previous.filter(item => item !== key) : [...new Set([...previous, key])]);
      if (okay) change(next);
    }} />;
  };
  const run = (rule: StudioBehaviorRule) => {
    try { const result = dispatchStudioBehavior(document, runtime, { targetPartRef: rule.targetPartRef, trigger: rule.trigger }); setRuntime(result.values); setTrace(before => [...before, result].slice(-12)); setRunError(""); }
    catch (error) { setRunError(error instanceof Error ? error.message : String(error)); }
  };
  return <Section title={t("행동", "Behavior")} defaultOpen={false} action={<span className="count-badge">{definition.rules.length}</span>}>
    <div className="behavior-editor" data-testid="behavior-editor" data-draft-form={formId}>
      <p className="field-hint">{t("요소를 조작할 때 조건을 확인하고, 내부 값을 바꾸거나 앱에 요청을 보냅니다.", "When an element receives input, check a condition, update local values or send a request to the app.")}</p>
      <div className="behavior-rule-list">{definition.rules.map(rule => <button type="button" key={rule.id} className="behavior-rule-row" aria-pressed={selected === rule.id} disabled={dirty} onClick={() => { setSelected(rule.id); setDraft(rule); setLexical({}); setBadFields([]); }}><span><strong>{rule.name}</strong><small>{component.parts.find(part => part.id === rule.targetPartRef)?.name}</small></span><span className="chip">{t(...triggers[rule.trigger])}</span></button>)}</div>
      <div className="form-actions"><Button size="sm" icon="plus" data-testid="behavior-add" disabled={dirty || !defaultAction() || definition.rules.length >= 32} onClick={start}>{t("행동 추가", "Add behavior")}</Button></div>
      {!locals.length && <div className="behavior-state-create"><p className="field-hint">{t("내부 상태를 만들면 선택·열림 같은 동작을 구성할 수 있습니다.", "Create local state to author interactions such as selection or expansion.")}</p><div className="behavior-field-pair"><Field label={t("상태 이름", "State name")}><input aria-label={t("상태 이름", "State name")} value={stateName} onChange={event => setStateName(event.target.value)} /></Field><Field label={t("유형", "Type")}><Select aria-label={t("상태 유형", "State type")} value={stateKind} onChange={event => setStateKind(event.target.value as typeof stateKind)}><option value="boolean">Boolean</option><option value="number">Number</option><option value="string">Text</option></Select></Field></div><Button size="sm" data-testid="behavior-state-create" disabled={dirty || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(stateName) || ports.some(port => port.name === stateName)} onClick={() => onEdit({ kind: "value-add", name: stateName, type: { kind: stateKind }, value: stateKind === "boolean" ? false : stateKind === "number" ? 0 : "", ownership: "local" })}>{t("내부 상태 만들기", "Create local state")}</Button></div>}
      {draft && <div className="behavior-rule-form">
        <Field label={t("행동 이름", "Behavior name")}><input aria-label={t("행동 이름", "Behavior name")} data-testid="behavior-name" value={draft.name} maxLength={80} onChange={event => update({ name: event.target.value })} /></Field>
        <div className="behavior-field-pair"><Field label={t("요소", "Element")}><Select aria-label={t("행동 대상 요소", "Behavior element")} value={draft.targetPartRef} onChange={event => update({ targetPartRef: event.target.value })}>{component.parts.map(part => <option key={part.id} value={part.id}>{part.name}</option>)}</Select></Field><Field label={t("입력", "When")}><Select aria-label={t("행동 입력", "Behavior trigger")} value={draft.trigger} onChange={event => update({ trigger: event.target.value as StudioBehaviorTrigger })}>{STUDIO_BEHAVIOR_TRIGGERS.map(trigger => <option key={trigger} value={trigger}>{t(...triggers[trigger])}</option>)}</Select></Field></div>
        <Field label={t("조건", "Only if")}><Select aria-label={t("행동 조건", "Behavior condition")} value={draft.condition?.valueRef ?? ""} onChange={event => { const port = ports.find(port => port.id === event.target.value); update({ condition: port ? { valueRef: String(port.id), operator: "equals", value: port.defaultValue as StudioBehaviorScalar } : null }); setBadFields([]); setLexical({}); }}><option value="">{t("항상", "Always")}</option>{ports.map(port => <option key={String(port.id)} value={String(port.id)}>{String(port.name)}</option>)}</Select></Field>
        {draft.condition && <div className="behavior-field-pair"><Select aria-label={t("조건 비교", "Condition comparison")} value={draft.condition.operator} onChange={event => update({ condition: { ...draft.condition!, operator: event.target.value as NonNullable<StudioBehaviorRule["condition"]>["operator"] } })}><option value="equals">{t("같음", "Equals")}</option><option value="not-equals">{t("다름", "Does not equal")}</option>{typeof draft.condition.value === "number" && <><option value="greater-than">{t("보다 큼", "Greater than")}</option><option value="less-than">{t("보다 작음", "Less than")}</option></>}</Select>{literal("condition", t("조건 값", "Condition value"), ports.find(port => port.id === draft.condition!.valueRef)!, draft.condition.value, value => update({ condition: { ...draft.condition!, value } }))}</div>}
        <div className="behavior-action-list">{draft.actions.map((action, index) => {
          const port = action.kind !== "emit" ? locals.find(port => port.id === action.valueRef) : undefined;
          return <div className="behavior-action-row" key={index}><div className="behavior-action-title"><span className="field-label">{t("실행", "Then")} {index + 1}</span><IconButton icon="trash" label={t("동작 삭제", "Remove action")} disabled={draft.actions.length === 1} onClick={() => { update({ actions: draft.actions.filter((_action, at) => at !== index) }); setLexical({}); setBadFields([]); }} /></div><Select aria-label={`${t("동작", "Action")} ${index + 1}`} value={action.kind} onChange={event => {
            const kind = event.target.value, local = kind === "toggle" ? locals.find(port => object(port.type) && port.type.kind === "boolean") : locals[0];
            const next: StudioBehaviorAction | undefined = kind === "emit" && events[0] ? { kind: "emit", eventRef: String(events[0].id), payload: sample(events[0].payloadType) } : local ? kind === "toggle" ? { kind, valueRef: String(local.id) } : { kind: "set", valueRef: String(local.id), value: local.defaultValue as StudioBehaviorScalar } : undefined;
            if (next) { updateAction(index, next); setBadFields([]); setLexical({}); }
          }}><option value="toggle" disabled={!locals.some(port => object(port.type) && port.type.kind === "boolean")}>{t("내부 상태 전환", "Toggle local state")}</option><option value="set" disabled={!locals.length}>{t("내부 값 설정", "Set local value")}</option><option value="emit" disabled={!events.length}>{t("앱에 요청 보내기", "Emit app request")}</option></Select>
            {action.kind === "emit" ? <><Select aria-label={`${t("요청 이벤트", "Request event")} ${index + 1}`} value={action.eventRef} onChange={event => { const port = events.find(port => port.id === event.target.value)!; updateAction(index, { kind: "emit", eventRef: String(port.id), payload: sample(port.payloadType) }); setLexical({}); setBadFields([]); }}>{events.map(event => <option value={String(event.id)} key={String(event.id)}>{String(event.name)}</option>)}</Select><Field label={t("요청 데이터 · JSON", "Request data · JSON")}><textarea aria-label={`${t("요청 데이터", "Request data")} ${index + 1}`} value={lexical[`payload-${index}`] ?? JSON.stringify(action.payload, null, 2)} rows={3} aria-invalid={badFields.includes(`payload-${index}`) || undefined} onChange={event => { const text = event.target.value, key = `payload-${index}`; setLexical(before => ({ ...before, [key]: text })); setDirty(true); try { const payload = JSON.parse(text) as JsonValue; updateAction(index, { ...action, payload }); setBadFields(before => before.filter(item => item !== key)); } catch { setBadFields(before => [...new Set([...before, key])]); } }} /></Field></> : <><Select aria-label={`${t("내부 값", "Local value")} ${index + 1}`} value={action.valueRef} onChange={event => { const port = locals.find(port => port.id === event.target.value)!; updateAction(index, action.kind === "toggle" ? { ...action, valueRef: String(port.id) } : { ...action, valueRef: String(port.id), value: port.defaultValue as StudioBehaviorScalar }); setBadFields([]); setLexical({}); }}>{locals.filter(port => action.kind === "set" || object(port.type) && port.type.kind === "boolean").map(port => <option key={String(port.id)} value={String(port.id)}>{String(port.name)}</option>)}</Select>{action.kind === "set" && port && literal(`action-${index}`, `${t("설정값", "Set value")} ${index + 1}`, port, action.value, value => updateAction(index, { ...action, value }))}</>}
          </div>;
        })}</div>
        <Button size="sm" tone="subtle" icon="plus" disabled={draft.actions.length >= 8} onClick={() => { const action = defaultAction(); if (action) update({ actions: [...draft.actions, action] }); }}>{t("다음 동작 추가", "Add next action")}</Button>
        {dirty && !valid && <p className="behavior-error" role="alert">{badFields.length ? t("미완성 입력을 수정하거나 초기화하세요.", "Repair incomplete input or reset the rule.") : errors[0]}</p>}
        <div className="form-actions"><Button size="sm" tone="primary" data-testid="behavior-apply" disabled={!dirty || !valid} onClick={apply}>{t("규칙 적용", "Apply rule")}</Button><Button size="sm" disabled={!dirty} onClick={reset}>{t("초기화", "Reset")}</Button>{selected && <IconButton icon="trash" label={t("행동 삭제", "Delete behavior")} disabled={dirty} onClick={() => { if (onEdit({ kind: "behavior-set", behavior: { ...definition, rules: definition.rules.filter(rule => rule.id !== selected) } })) { setSelected(null); setDraft(null); } }} />}</div>
      </div>}
      {definition.rules.length > 0 && <div className="behavior-simulator" data-testid="behavior-simulator"><div className="behavior-action-title"><strong>{t("동작 시연", "Simulate behavior")}</strong><Button size="sm" tone="subtle" onClick={() => { setRuntime(createStudioBehaviorState(document)); setTrace([]); setRunError(""); }}>{t("재시작", "Restart")}</Button></div><dl className="behavior-state-list">{ports.map(port => <div key={String(port.id)}><dt>{String(port.name)}<small>{port.ownership === "local" ? t("내부", "Local") : t("앱 소유", "App owned")}</small></dt><dd><output data-behavior-value={String(port.name)}>{JSON.stringify(runtime[String(port.id)])}</output></dd></div>)}</dl><div className="behavior-run-actions">{definition.rules.map(rule => <Button key={rule.id} size="sm" icon="play" data-testid={`behavior-run-${rule.id}`} disabled={dirty} onClick={() => run(rule)}>{rule.name}</Button>)}</div><p className="field-hint">{t("같은 요소·입력의 모든 규칙을 순서대로 실행합니다. 기본값은 저장하지 않으며, 요청을 보내도 앱의 값이 바뀌지는 않습니다.", "Runs every rule matching the element and input in order. Defaults stay unchanged; emitted requests do not adopt app-owned values.")}</p>{runError && <p className="behavior-error" role="alert">{runError}</p>}<div className="behavior-trace" aria-live="polite">{trace.slice(-3).map((result, index) => <div key={index}><span>{t("실행된 규칙", "Matched rules")}: {result.matchedRuleIds.length}</span>{result.emissions.map((emission, at) => <code key={at}>{String(events.find(event => event.id === emission.eventRef)?.name)} {JSON.stringify(emission.payload)}</code>)}</div>)}</div></div>}
    </div>
  </Section>;
}
