import { useState } from "react";
import type { JsonValue, StudioComponent } from "../../../modules/ads-core/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import type { Locale } from "./locales.ts";
import { Button, Field, Select, TextInput, copy } from "./ui.tsx";
import { object } from "./ui-utils.ts";

export function InstanceInspector({ component, partId, state, controller, locale, onSelectSource }: { component: StudioComponent; partId: string; state: StudioState; controller: StudioController; locale: Locale; onSelectSource?: (id: string) => void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en);
  const [sourceId, setSourceId] = useState("");
  const sources = state.projection?.components.filter(item => item.id !== component.id && item.catalog) ?? [];
  const instances = component.instances?.filter(instance => instance.ownerPartRef === partId) ?? [];
  const slot = component.catalog?.slots.find(slot => slot.ownerPartRef === partId);
  const edit = (instanceId: string, valueId: string, value: JsonValue, reset = false) => controller.instance(component.id, { kind: "value", instanceId, valueId, value, reset });
  return <div className="instance-inspector" data-testid="instance-inspector"><div className="instance-insert-row"><Select aria-label={t("삽입할 컴포넌트", "Component to insert")} data-testid="instance-source" value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="">{t("컴포넌트 선택…", "Choose a component…")}</option>{sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</Select><Button icon="plus" data-testid="instance-insert" disabled={!sourceId || state.busy} onClick={() => controller.instance(component.id, { kind: "insert", ownerPartRef: partId, slotRef: slot ? String(slot.id) : null, sourceComponentId: sourceId })}>{t("삽입", "Insert")}</Button></div>
    {!sources.length && <p className="field-hint">{t("라이브러리에서 재사용할 컴포넌트를 먼저 만드세요.", "Create a reusable component from the library first.")}</p>}
    {instances.map(instance => {
      const source = sources.find(source => source.id === instance.componentRef.id);
      return <details className="instance-row" key={instance.id} open data-testid={`instance-${instance.id}`}><summary><span>{source?.name ?? instance.sourceName}</span><span className="badge">{instance.status === "current" ? t("인스턴스", "Instance") : t("원본 변경됨", "Source changed")}</span></summary>
        <div className="instance-actions">{onSelectSource && source && <Button tone="subtle" onClick={() => onSelectSource(source.id)}>{t("원본 편집", "Edit source")}</Button>}{instance.status !== "current" && source && <Button data-testid="instance-refresh" onClick={() => controller.instance(component.id, { kind: "refresh", instanceId: instance.id })}>{t("새 버전 검토", "Review update")}</Button>}<Button tone="subtle" data-testid="instance-remove" onClick={() => controller.instance(component.id, { kind: "remove", instanceId: instance.id })}>{t("제거", "Remove")}</Button></div>
        {instance.status !== "current" ? <p className="field-hint">{t("원본 버전이 달라졌습니다. 값을 보존한 채 새 버전을 검토하세요.", "Source versions differ. Review the update while preserving your values.")}</p> : source?.catalog?.reference ? <p className="field-hint" data-testid="reference-instance-limit">{t("원본 템플릿의 디자인과 동작을 사용합니다. 인스턴스별 값과 콘텐츠 변경은 아직 지원하지 않습니다.", "Uses the original template's design and behavior. Individual values and content cannot be overridden yet.")}</p> : source?.catalog?.values.filter(value => value.ownership === "consumer" && object(value.type) && ["string", "boolean", "number", "enum"].includes(String(value.type.kind))).map(port => {
          const id = String(port.id), type = object(port.type) ? port.type : {}, value = instance.values[id] ?? port.defaultValue;
          return <Field key={id} label={String(port.name)} layout="row"><div className="instance-value">{type.kind === "boolean" ? <input aria-label={String(port.name)} type="checkbox" checked={Boolean(value)} onChange={event => edit(instance.id, id, event.target.checked)} /> : type.kind === "enum" && Array.isArray(type.values) ? <Select aria-label={String(port.name)} value={String(value)} onChange={event => edit(instance.id, id, event.target.value)}>{type.values.map(option => <option key={String(option)}>{String(option)}</option>)}</Select> : <TextInput label={String(port.name)} data-testid={`instance-value-${id}`} inputMode={type.kind === "number" ? "decimal" : undefined} value={String(value ?? "")} onCommit={text => { if (type.kind === "number" && (!text.trim() || !Number.isFinite(Number(text)))) { controller.inputError(); return; } edit(instance.id, id, type.kind === "number" ? Number(text) : text); }} />}{Object.hasOwn(instance.values, id) && <Button tone="subtle" aria-label={`${String(port.name)} ${t("원본값으로", "Reset to source")}`} onClick={() => edit(instance.id, id, null, true)}>{t("초기화", "Reset")}</Button>}</div></Field>;
        })}
        {instance.status === "current" && !source?.catalog?.reference && source?.catalog?.slots.map(slot => <Field key={String(slot.id)} label={source.parts.find(part => part.id === slot.ownerPartRef)?.name ?? t("콘텐츠", "Content")}><TextInput label={t("인스턴스 콘텐츠", "Instance content")} data-testid={`instance-content-${String(slot.id)}`} multiline value={instance.slotContents[String(slot.id)] ?? ""} onCommit={text => controller.instance(component.id, { kind: "content", instanceId: instance.id, slotId: String(slot.id), text })} /></Field>)}
      </details>;
    })}
    <p className="field-hint">{t("인스턴스는 원본과 개별 값을 연결합니다. 복제와 달리 원본 버전 변경을 검토할 수 있습니다.", "Instances reference their source and keep individual values. Source updates are reviewed explicitly.")}</p>
  </div>;
}
