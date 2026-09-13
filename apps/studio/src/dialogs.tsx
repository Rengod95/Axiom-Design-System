import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { KernelServices, ProjectSnapshot, StudioSelection } from "../../../modules/ads-core/src/index.ts";
import { createSourceArchive, generateTargetPack, getTargetFiles } from "../../../modules/target-packs/src/index.ts";
import type { TargetGeneration, TargetId } from "../../../modules/target-packs/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import { Icon } from "./icons.tsx";
import { DiagnosticList } from "./inspector.tsx";
import { translate } from "./locales.ts";
import type { Locale, MessageKey } from "./locales.ts";
import { downloadBlob } from "./ui-utils.ts";
import { summarizeField } from "./review-diff.ts";
import type { ReviewField } from "./review-diff.ts";

function Modal({ titleId, testId, onClose, children }: { titleId: string; testId: string; onClose(): void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className="dialog" data-testid={testId} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close.current(); }}>{children}</dialog>;
}

export function ReviewDialog({ state, controller, locale, onClose }: { state: StudioState; controller: StudioController; locale: Locale; onClose(): void }) {
  const t = (key: MessageKey) => translate(locale, key);
  const candidate = state.candidate;
  if (!candidate) return null;
  const impact = [...new Map((state.plan?.impact ?? []).map(item => [`${item.componentId}/${item.partId}`, item])).values()];
  const showField = (field: ReviewField) => <div className="diff-field" key={field.path}><div className="diff-path">{field.path}</div><div className="diff-values"><div><small>{t("before")}</small>{JSON.stringify(field.before, null, 2) ?? "∅"}</div><div><small>{t("after")}</small>{JSON.stringify(field.after, null, 2) ?? "∅"}</div></div></div>;
  return <Modal titleId="review-title" testId="review-dialog" onClose={onClose}>
    <header className="dialog-head"><button className="icon-button" aria-label={t("close")} onClick={onClose}><Icon name="close" /></button><div className="eyebrow">Axiom · {t("review")}</div><h2 id="review-title">{t("reviewTitle")}</h2><p>{t("reviewDescription")}</p></header>
    <div className="dialog-body">
      <div className="row between" style={{ marginBottom: 18 }}><span className="badge">{t("changedDocuments")} · {candidate.diff.length}</span><span className="badge amber">{t("reviewing")}</span></div>
      {impact.length > 0 && <section className="diff-item"><h3>{t("impact")} · {impact.length}</h3><p className="help">{impact.map(item => `${state.projection?.components.find(component => component.id === item.componentId)?.name ?? item.componentId} / ${item.partId.split(".").at(-1)}`).join(" · ")}</p></section>}
      {candidate.diff.map(item => <section className="diff-item" key={item.id}><h3>{item.id}</h3>{item.fields?.length ? <>{item.fields.filter(field => field.path !== "/revision").flatMap(summarizeField).map(showField)}<details><summary className="help">{t("fullDiff")}</summary>{item.fields.map(showField)}</details></> : <p className="help">{item.change}</p>}</section>)}
      {state.error && <div className="error-panel" role="alert">{t(state.message ?? "unknownError")}<p><code>{state.error}</code></p>{state.retryable && <button className="button secondary" onClick={() => void controller.retry()} disabled={state.busy}>{t("retrySave")}</button>}</div>}
      <DiagnosticList diagnostics={candidate.diagnostics.filter(item => item.severity === "error")} locale={locale} />
      {candidate.diagnostics.some(item => item.severity !== "error") && <details><summary className="help">{t("additionalDiagnostic")} · {candidate.diagnostics.filter(item => item.severity !== "error").length}</summary><DiagnosticList diagnostics={candidate.diagnostics.filter(item => item.severity !== "error")} locale={locale} /></details>}
      <details><summary className="help">{t("details")}</summary><p className="help">{t("projectRevision")}: <code>{candidate.baseRevision}</code></p><code>{candidate.digest}</code></details>
    </div>
    <footer className="dialog-footer"><button className="button secondary danger" data-testid="review-reject" disabled={state.busy || state.retryable} onClick={() => void controller.discard()}>{t("reject")}</button><button className="button primary" data-testid="review-approve" disabled={state.busy || state.retryable || state.error === "REVISION_CONFLICT"} onClick={() => void controller.approve()}><Icon name="check" />{state.busy ? t("saving") : t("approve")}</button></footer>
  </Modal>;
}

const targets: { id: TargetId; name: string; detail: string }[] = [
  { id: "react", name: "React", detail: "TypeScript · CSS" },
  { id: "react-native", name: "React Native", detail: "TypeScript · Expo" },
  { id: "swiftui", name: "SwiftUI", detail: "Swift · Apple" },
  { id: "compose", name: "Compose", detail: "Kotlin · Android" },
];

export function ExportDialog({ project, selection, services, locale, onClose }: { project: ProjectSnapshot; selection: StudioSelection; services: KernelServices; locale: Locale; onClose(): void }) {
  const t = (key: MessageKey) => translate(locale, key);
  const [target, setTarget] = useState<TargetId>("react"), [result, setResult] = useState<TargetGeneration | null>(null), [error, setError] = useState(false), [preparing, setPreparing] = useState(false);
  useEffect(() => { setError(false); try { setResult(generateTargetPack(project, { target, selection }, services.digest)); } catch { setResult(null); setError(true); } }, [project, selection, target, services]);
  const download = () => {
    if (!result?.pack) return;
    setPreparing(true);
    try { const bytes = createSourceArchive(result.pack, services.digest); downloadBlob(`axiom-${target}.zip`, new Blob([new Uint8Array(bytes).buffer], { type: "application/zip" })); }
    catch { setError(true); }
    finally { setPreparing(false); }
  };
  return <Modal titleId="export-title" testId="export-dialog" onClose={onClose}>
    <header className="dialog-head"><button className="icon-button" aria-label={t("close")} onClick={onClose}><Icon name="close" /></button><div className="eyebrow">Axiom · {t("export")}</div><h2 id="export-title">{t("exportSources")}</h2><p>{t("exportHelp")}</p></header>
    <div className="dialog-body"><div className="section-title">{t("outputTarget")}</div><div className="target-grid" role="group" aria-label={t("outputTarget")}>{targets.map(item => <button key={item.id} data-testid={`target-${item.id}`} aria-pressed={target === item.id} className={`target-card ${target === item.id ? "active" : ""}`} onClick={() => setTarget(item.id)}>{item.name}<small>{item.detail}</small></button>)}</div>
      {error && <p className="error-panel" role="alert">{t("downloadFailed")}</p>}
      {result?.valid && result.pack && <><div className="row flex-wrap" style={{ marginTop: 18 }}><span className="badge" data-testid="export-generated"><Icon name="check" size={12} />{t("generated")}</span><span className="badge amber" data-testid="export-unverified">{t("notRun")}</span></div><div className="file-list" aria-label={t("outputFiles")}>{getTargetFiles(result.pack, services.digest).map(file => <div key={file.path}>{file.path}</div>)}</div><p className="help">{t("projectRevision")}: <code>{result.pack.manifest.source.revision}</code></p></>}
      {result && !result.valid && <p className="help">{t("outputUnavailable")}</p>}<DiagnosticList diagnostics={result?.diagnostics ?? []} locale={locale} />
    </div>
    <footer className="dialog-footer"><button className="button secondary" onClick={onClose}>{t("close")}</button><button className="button primary" data-testid="export-download" disabled={!result?.valid || !result.pack || preparing} onClick={download}><Icon name="download" />{preparing ? t("sourcePreparing") : t("download")}</button></footer>
  </Modal>;
}
