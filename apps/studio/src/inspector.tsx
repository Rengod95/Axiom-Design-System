import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Diagnostic, StudioCategory, StudioComponent } from "../../../modules/ads-core/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import { ComponentInspector } from "./component-inspector.tsx";
import { Icon } from "./icons.tsx";
import type { Locale, MessageKey } from "./locales.ts";
import { translate } from "./locales.ts";
import { Select, Button, copy } from "./ui.tsx";
import { downloadText } from "./ui-utils.ts";

export function DiagnosticList({ diagnostics, locale }: { diagnostics: Diagnostic[]; locale: Locale }) {
  const t = (key: MessageKey) => translate(locale, key);
  return <>{diagnostics.slice(0, 12).map((diagnostic, index) => <div key={`${diagnostic.code}-${diagnostic.path}-${index}`} className={`diagnostic ${diagnostic.severity}`}><strong>{diagnostic.severity === "error" ? t("invalidValue") : t("additionalDiagnostic")}</strong>{diagnostic.path && <p><code>{diagnostic.path}</code></p>}<details><summary>{t("details")} · {diagnostic.code}</summary><p>{diagnostic.message}</p></details></div>)}</>;
}

interface InspectorProps {
  state: StudioState; controller: StudioController; tokenId: string | null; component: StudioComponent | null; selectedPart: string | null; category: StudioCategory; locale: Locale;
  onSelectToken?: (id: string) => void; onSelectPart?: (id: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}
export function Inspector({ state, controller, tokenId, component, selectedPart, category, locale, onSelectToken, onSelectPart, onDirtyChange }: InspectorProps) {
  const t = (key: MessageKey) => translate(locale, key), c = (ko: string, en: string) => copy(locale, ko, en);
  const [tab, setTab] = useState<"design" | "source">("design"), [sourceId, setSourceId] = useState(""), [original, setOriginal] = useState("");
  const working = state.plan?.project ?? state.project;
  const token = state.projection?.foundation.tokens.find(item => item.id === tokenId);
  const defaultId = token ? state.projection?.foundation.foundationId ?? "" : component?.id ?? Object.keys(working?.documents ?? {})[0] ?? "";
  useEffect(() => { setSourceId(defaultId); setOriginal(""); }, [defaultId]);
  useEffect(() => { let active = true; if (tab === "source" && sourceId) void controller.exportSource(sourceId).then(source => { if (active) setOriginal(source?.original.text ?? ""); }).catch(() => { if (active) setOriginal(""); }); return () => { active = false; }; }, [tab, sourceId, controller, state.project?.revision]);
  const document = working?.documents[sourceId]?.document;
  const source = state.buffers[sourceId] ?? (document ? JSON.stringify(document, null, 2) : "");
  const tabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "design" : event.key === "End" ? "source" : tab === "design" ? "source" : "design";
    setTab(next); event.currentTarget.querySelector<HTMLButtonElement>(`#inspector-tab-${next}`)?.focus();
  };
  const disabled = state.busy || state.retryable || Boolean(state.candidate);
  return <aside className="inspector" aria-label={t("inspector")}><div className="inspector-header inspector-tabs-only"><div className="tabs" role="tablist" aria-label={t("inspector")} onKeyDown={tabKey}><button id="inspector-tab-design" type="button" role="tab" tabIndex={tab === "design" ? 0 : -1} aria-selected={tab === "design"} aria-controls="inspector-design-panel" className={tab === "design" ? "active" : ""} onClick={() => setTab("design")}>{t("design")}</button><button id="inspector-tab-source" type="button" data-testid="source-tab" role="tab" tabIndex={tab === "source" ? 0 : -1} aria-selected={tab === "source"} aria-controls="inspector-source-panel" className={tab === "source" ? "active" : ""} onClick={() => setTab("source")}><span className="row"><Icon name="code" size={12} />{t("source")}</span></button></div></div>
    <div className={`inspector-body ${tab === "source" ? "source-panel" : ""}`} id="inspector-panel">
      <div hidden={tab !== "design"} role="tabpanel" id="inspector-design-panel" aria-labelledby="inspector-tab-design"><fieldset className="inspector-fields" disabled={disabled}>
        {component ? <ComponentInspector state={state} controller={controller} component={component} selectedPart={selectedPart} category={category} locale={locale} {...(onSelectToken ? { onSelectToken } : {})} {...(onSelectPart ? { onSelectPart } : {})} {...(onDirtyChange ? { onDirtyChange } : {})} /> : token ? <Button tone="subtle" onClick={() => onSelectToken?.(token.id)} disabled={!onSelectToken}>{c("Foundation에서 토큰 편집", "Edit token in Foundation")}</Button> : <p className="help">{t("emptySelection")}</p>}
      </fieldset></div>
      <div hidden={tab !== "source"} className="source-panel" role="tabpanel" id="inspector-source-panel" aria-labelledby="inspector-tab-source">
        <div className="field"><label htmlFor="source-document">{t("documentSource")}</label><Select id="source-document" value={sourceId} onChange={event => { setSourceId(event.target.value); setOriginal(""); }}>{Object.keys(working?.documents ?? {}).map(id => <option value={id} key={id}>{id}</option>)}</Select><p className="help">{t("sourceHelp")}</p></div>
        <label className="sr-only" htmlFor="source-editor">{t("documentSource")}</label><textarea id="source-editor" data-testid="source-editor" className="json-editor" value={source} spellCheck={false} disabled={disabled || !document} onChange={event => controller.setBuffer(sourceId, event.target.value)} />
        <Button tone="primary" data-testid="source-preview" disabled={disabled || !state.pendingBuffers.includes(sourceId)} onClick={() => controller.previewBuffer(sourceId)}>{t("previewSource")}</Button>
        <Button data-testid="source-capture" disabled={disabled || state.buffers[sourceId] === undefined} onClick={() => void controller.captureBuffer(sourceId)}>{t("captureDraft")}</Button>
        <Button tone="subtle" icon="download" disabled={!sourceId} onClick={() => downloadText(`${sourceId}.json`, source)}>{t("downloadBuffer")}</Button>
        <details><summary className="section-title">{t("original")}</summary><pre className="json-editor" data-testid="source-original">{original}</pre>{!state.project?.documents[sourceId] && <p className="field-hint">{c("새 문서의 원본 캡처는 승인 후 확인할 수 있습니다.", "A new document's original capture becomes available after approval.")}</p>}</details>
      </div>
      {state.diagnostics.some(item => item.severity === "error") && <section className="inspector-section"><div className="section-title">{t("diagnostics")}</div><DiagnosticList diagnostics={state.diagnostics.filter(item => item.severity === "error")} locale={locale} /></section>}
    </div>
  </aside>;
}
