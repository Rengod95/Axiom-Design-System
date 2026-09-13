import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CompositionEvent, KeyboardEvent } from "react";
import { parseJson } from "../../../modules/ads-core/src/index.ts";
import type { Diagnostic, JsonValue, ResolvedFoundationToken, StudioCategory, StudioComponent } from "../../../modules/ads-core/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import { Icon } from "./icons.tsx";
import type { Locale, MessageKey } from "./locales.ts";
import { translate } from "./locales.ts";
import { colorHex, downloadText, hexColor, object } from "./ui-utils.ts";

export function DiagnosticList({ diagnostics, locale }: { diagnostics: Diagnostic[]; locale: Locale }) {
  const t = (key: MessageKey) => translate(locale, key);
  return <>{diagnostics.slice(0, 12).map((diagnostic, index) => <div key={`${diagnostic.code}-${diagnostic.path}-${index}`} className={`diagnostic ${diagnostic.severity}`}><strong>{diagnostic.severity === "error" ? t("invalidValue") : t("additionalDiagnostic")}</strong>{diagnostic.path && <p><code>{diagnostic.path}</code></p>}<details><summary>{t("details")} · {diagnostic.code}</summary><p>{diagnostic.message}</p></details></div>)}</>;
}

function TextField({ label, value, onEdit, multiline = false, testId }: { label: string; value: string; onEdit(value: string): void; multiline?: boolean; testId: string }) {
  const [text, setText] = useState(value), composing = useRef(false);
  useEffect(() => { if (!composing.current) setText(value); }, [value]);
  const props = { id: testId, "data-testid": testId, value: text, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setText(event.target.value); if (!composing.current) onEdit(event.target.value); }, onCompositionStart: () => { composing.current = true; }, onCompositionEnd: (event: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => { composing.current = false; onEdit(event.currentTarget.value); } };
  return <div className="field"><label htmlFor={testId}>{label}</label>{multiline ? <textarea {...props} /> : <input {...props} />}</div>;
}

function TokenEditor({ state, controller, token, locale }: { state: StudioState; controller: StudioController; token: ResolvedFoundationToken; locale: Locale }) {
  const t = (key: MessageKey) => translate(locale, key);
  const working = state.plan?.project ?? state.project;
  const foundation = state.projection?.foundation;
  const source = foundation?.foundationId ? working?.documents[foundation.foundationId]?.document : undefined;
  const original = Array.isArray(source?.tokens) ? source.tokens.find(item => object(item) && item.id === token.id) : undefined;
  const [json, setJson] = useState(""), [hex, setHex] = useState(""), [themeEdit, setThemeEdit] = useState(false), [axis, setAxis] = useState("");
  const selectedAxis = axis || foundation?.resolutionOrder[0] || "";
  const axisRecord = Array.isArray(source?.themeAxes) ? source.themeAxes.find(item => object(item) && item.id === selectedAxis) : undefined;
  const overrides = object(axisRecord) && object(axisRecord.overrides) ? axisRecord.overrides[foundation?.contexts[selectedAxis] ?? ""] : undefined;
  const wrapper = themeEdit ? object(overrides) ? overrides[token.id] ?? { literal: token.value } : { literal: token.value } : object(original) ? original.value : { literal: token.value };
  const value = object(wrapper) && Object.hasOwn(wrapper, "literal") ? wrapper.literal! : token.value;
  const alias = object(wrapper) && Object.hasOwn(wrapper, "ref");
  useEffect(() => { setJson(JSON.stringify(wrapper, null, 2)); setHex(colorHex(value) ?? ""); }, [token.id, JSON.stringify(wrapper), JSON.stringify(value), themeEdit, selectedAxis]);
  const edit = (value: JsonValue) => {
    const context = foundation?.contexts[selectedAxis];
    if (themeEdit && context) controller.edit({ kind: "theme-value", axisId: selectedAxis, context, id: token.id, value });
    else controller.edit({ kind: "token-value", id: token.id, value });
  };
  const uses = state.projection?.usages[token.id] ?? [];
  const uniqueUses = [...new Map(uses.map(usage => [`${usage.componentId}/${usage.partId}`, usage])).values()];
  return <>
    <section className="inspector-section"><div className="section-title">{t("value")}<span className="badge">{token.type}</span></div>
      <div className="field"><label htmlFor="token-scope">{t("valueSource")}</label><select id="token-scope" value={themeEdit ? "theme" : "base"} onChange={event => setThemeEdit(event.target.value === "theme")}><option value="base">{t("editBase")}</option><option value="theme" disabled={!selectedAxis}>{t("editContext")}</option></select></div>
      {themeEdit && foundation && foundation.resolutionOrder.length > 1 && <select aria-label={t("theme")} value={selectedAxis} onChange={event => setAxis(event.target.value)}>{foundation.resolutionOrder.map(id => <option key={id}>{id}</option>)}</select>}
      {alias && <div className="field"><span className="badge"><Icon name="link" size={10} />{t("alias")}</span><small>{t("aliasHelp")}</small><button className="button secondary" onClick={() => edit({ literal: token.value })}>{t("replaceAlias")}</button></div>}
      {colorHex(value) !== null && <>
        <label htmlFor="token-value-input">{t("color")}</label><div className="token-color-row"><input type="color" aria-label={t("color")} value={colorHex(value)!} disabled={Boolean(alias)} onChange={event => { const next = hexColor(event.target.value, value); if (next) { setHex(event.target.value); edit({ literal: next }); } }} /><input id="token-value-input" data-testid="token-value-input" type="text" value={hex} spellCheck={false} disabled={Boolean(alias)} onChange={event => { setHex(event.target.value); const next = hexColor(event.target.value, value); if (next) edit({ literal: next }); else controller.inputError(); }} /></div>
        <div className="property-row"><label htmlFor="token-alpha">{t("alpha")}</label><input id="token-alpha" type="number" min="0" max="1" step="0.05" style={{ width: 80 }} value={object(value) && typeof value.alpha === "number" ? value.alpha : 1} disabled={Boolean(alias)} onChange={event => { if (!Number.isFinite(event.target.valueAsNumber)) { controller.inputError(); return; } edit({ literal: { ...(object(value) ? value : {}), alpha: event.target.valueAsNumber } }); }} /></div>
      </>}
      <details className="field" open={colorHex(value) === null}><summary className="section-title">{t("tokenJson")}</summary><textarea className="json-editor json-value" aria-label={t("tokenJson")} data-testid="token-json-input" value={json} onChange={event => { setJson(event.target.value); controller.inputError(); }} spellCheck={false} /><button className="button secondary" data-testid="token-preview-value" onClick={() => { try { edit(parseJson(json)); } catch { controller.inputError(); } }}>{t("applyInput")}</button></details>
    </section>
    <section className="inspector-section"><div className="section-title">{t("usedBy")}<span className="badge">{uniqueUses.length}</span></div>{uniqueUses.map(usage => <div key={`${usage.componentId}/${usage.partId}`} className="usage-row"><Icon name="component" size={12} />{state.projection?.components.find(component => component.id === usage.componentId)?.name ?? usage.componentId}<span>{usage.partId.split(".").at(-1)}</span></div>)}</section>
    <section className="inspector-section"><div className="section-title">{t("valueSource")}</div><div className="property-row"><span>{t("baseValue")}</span><code>{token.sourcePath}</code></div>{token.aliasChain.length > 0 && <p className="help">{token.aliasChain.join(" → ")}</p>}{token.overrideTrace.map(trace => <p className="help" key={trace.path}>{trace.axisId} · {trace.context}</p>)}</section>
  </>;
}

function ComponentEditor({ component, selectedPart, category, controller, locale }: { component: StudioComponent; selectedPart: string | null; category: StudioCategory; controller: StudioController; locale: Locale }) {
  const t = (key: MessageKey) => translate(locale, key);
  const part = component.parts.find(item => item.id === selectedPart) ?? component.parts.find(item => item.role === "root");
  const fields: (keyof StudioComponent["sampleContent"])[] = component.archetype === "button" ? ["label"] : component.archetype === "card" ? ["title", "body", "actionLabel"] : ["body", "closeLabel"];
  const design = category === "Web" ? component.web : component.mobile;
  const layout = part ? design.layout[part.id] : undefined;
  return <><section className="inspector-section"><div className="section-title">{t("sampleContent")}</div>{fields.map(field => <TextField key={`${component.id}-${field}`} label={field === "body" ? t("body") : field === "closeLabel" ? t("close") : field === "actionLabel" ? t("actionLabel") : field === "title" ? t("contentTitle") : t("label")} value={component.sampleContent[field]} multiline={field === "body"} testId={`sample-${field}`} onEdit={value => controller.edit({ kind: "sample-content", id: component.id, field, value })} />)}<p className="help">{t("sampleHelp")}</p></section>
    {layout && part && <section className="inspector-section"><div className="section-title">{t("structure")}</div>{(["padding", "gap", "minHeight"] as const).map(field => <div className="property-row" key={field}><label htmlFor={`layout-${field}`}>{t(field)}</label><input id={`layout-${field}`} data-testid={`layout-${field}`} type="number" min="0" max="2048" style={{ width: 88 }} value={layout[field]} onChange={event => { if (!Number.isFinite(event.target.valueAsNumber)) controller.inputError(); else controller.edit({ kind: "layout", id: component.id, category, partId: part.id, field, value: event.target.valueAsNumber }); }} /></div>)}</section>}
    <section className="inspector-section"><div className="section-title">{t("stableId")}</div><code>{part?.id ?? component.id}</code><p className="help">{component.purpose}</p></section></>;
}

interface InspectorProps { state: StudioState; controller: StudioController; tokenId: string | null; component: StudioComponent | null; selectedPart: string | null; category: StudioCategory; locale: Locale }
export function Inspector({ state, controller, tokenId, component, selectedPart, category, locale }: InspectorProps) {
  const t = (key: MessageKey) => translate(locale, key);
  const [tab, setTab] = useState<"design" | "source">("design"), [sourceId, setSourceId] = useState(""), [original, setOriginal] = useState("");
  const token = state.projection?.foundation.tokens.find(item => item.id === tokenId);
  const defaultId = token ? state.projection?.foundation.foundationId ?? "" : component?.id ?? Object.keys(state.project?.documents ?? {})[0] ?? "";
  useEffect(() => { setSourceId(defaultId); setOriginal(""); }, [defaultId]);
  useEffect(() => { let active = true; if (tab === "source" && sourceId) void controller.exportSource(sourceId).then(source => { if (active) setOriginal(source?.original.text ?? ""); }).catch(() => { if (active) setOriginal(""); }); return () => { active = false; }; }, [tab, sourceId, controller, state.project?.revision]);
  const document = (state.plan?.project ?? state.project)?.documents[sourceId]?.document;
  const source = state.buffers[sourceId] ?? (document ? JSON.stringify(document, null, 2) : "");
  const tabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "design" : event.key === "End" ? "source" : tab === "design" ? "source" : "design";
    setTab(next); event.currentTarget.querySelector<HTMLButtonElement>(`#inspector-tab-${next}`)?.focus();
  };
  return <aside className="inspector" aria-label={t("inspector")}><div className="inspector-header"><span className="eyebrow">{t("inspector")}</span><h2>{token?.name ?? component?.name ?? t("emptySelection")}</h2><p className="object-id">{token?.id ?? selectedPart ?? component?.id}</p><div className="tabs" role="tablist" aria-label={t("inspector")} onKeyDown={tabKey}><button id="inspector-tab-design" role="tab" tabIndex={tab === "design" ? 0 : -1} aria-selected={tab === "design"} aria-controls="inspector-panel" className={tab === "design" ? "active" : ""} onClick={() => setTab("design")}>{t("design")}</button><button id="inspector-tab-source" data-testid="source-tab" role="tab" tabIndex={tab === "source" ? 0 : -1} aria-selected={tab === "source"} aria-controls="inspector-panel" className={tab === "source" ? "active" : ""} onClick={() => setTab("source")}><span className="row"><Icon name="code" size={12} />{t("source")}</span></button></div></div>
    <div className={`inspector-body ${tab === "source" ? "source-panel" : ""}`} role="tabpanel" id="inspector-panel" aria-labelledby={`inspector-tab-${tab}`}>
      {tab === "design" ? <fieldset className="inspector-fields" disabled={state.busy || state.retryable || Boolean(state.candidate)}>{token ? <TokenEditor key={token.id} state={state} controller={controller} token={token} locale={locale} /> : component ? <ComponentEditor component={component} selectedPart={selectedPart} category={category} controller={controller} locale={locale} /> : <p className="help">{t("emptySelection")}</p>}</fieldset> : <>
        <div className="field"><label htmlFor="source-document">{t("documentSource")}</label><select id="source-document" value={sourceId} onChange={event => setSourceId(event.target.value)}>{Object.keys(state.project?.documents ?? {}).map(id => <option value={id} key={id}>{id}</option>)}</select><p className="help">{t("sourceHelp")}</p></div>
        <label className="sr-only" htmlFor="source-editor">{t("documentSource")}</label><textarea id="source-editor" data-testid="source-editor" className="json-editor" value={source} spellCheck={false} disabled={state.busy || state.retryable || Boolean(state.candidate)} onChange={event => controller.setBuffer(sourceId, event.target.value)} />
        <button className="button primary" data-testid="source-preview" disabled={state.busy || !state.pendingBuffers.includes(sourceId)} onClick={() => controller.previewBuffer(sourceId)}>{t("previewSource")}</button>
        <button className="button secondary" data-testid="source-capture" disabled={state.busy || state.buffers[sourceId] === undefined} onClick={() => void controller.captureBuffer(sourceId)}>{t("captureDraft")}</button>
        <button className="button subtle" onClick={() => downloadText(`${sourceId}.json`, source)}><Icon name="download" />{t("downloadBuffer")}</button>
        <details style={{ marginTop: 18 }}><summary className="section-title">{t("original")}</summary><pre className="json-editor" data-testid="source-original" style={{ padding: 10, whiteSpace: "pre-wrap", minHeight: 70 }}>{original}</pre></details>
      </>}
      {state.diagnostics.some(item => item.severity === "error") && <section className="inspector-section"><div className="section-title">{t("diagnostics")}</div><DiagnosticList diagnostics={state.diagnostics.filter(item => item.severity === "error")} locale={locale} /></section>}
    </div>
  </aside>;
}
