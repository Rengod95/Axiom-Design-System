import { useEffect, useRef, useState } from "react";
import { inspectStudioTokenBindingIssues } from "../../../modules/ads-core/src/index.ts";
import type { ReactNode } from "react";
import type { KernelServices, ProjectSnapshot, StudioSelection } from "../../../modules/ads-core/src/index.ts";
import { createSourceArchive, generateTargetPack, getTargetFiles } from "../../../modules/target-packs/src/index.ts";
import type { TargetGeneration, TargetId } from "../../../modules/target-packs/src/index.ts";
import type { StudioController, StudioState } from "./controller.ts";
import { Icon } from "./icons.tsx";
import { DiagnosticList } from "./inspector.tsx";
import { translate } from "./locales.ts";
import type { Locale, MessageKey } from "./locales.ts";
import { downloadBlob, object } from "./ui-utils.ts";
import { summarizeField } from "./review-diff.ts";
import type { ReviewField } from "./review-diff.ts";
import { Button, Field, Select, copy } from "./ui.tsx";

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

/** Choices stay inside this modal until every existing binding can join one valid source plan. */
export function BindingRepairDialog({ state, controller, locale, onClose }: { state: StudioState; controller: StudioController; locale: Locale; onClose(): void }) {
  const t = (ko: string, en: string) => copy(locale, ko, en), project = state.plan?.project ?? state.project;
  const [issues] = useState(() => project ? inspectStudioTokenBindingIssues(project, state.selection) : []);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const tokens = state.projection?.foundation.tokens ?? [], complete = issues.length > 0 && issues.every((_, index) => choices[index]);
  const apply = () => {
    if (!complete) return;
    const accepted = controller.repairTokenBindings(issues.map((issue, index) => ({ documentId: issue.documentId, path: issue.path, tokenId: issue.tokenId, replacementTokenId: choices[index] === "literal" ? null : choices[index]!.slice(6) })));
    if (accepted) onClose();
  };
  return <Modal titleId="binding-repair-title" testId="binding-repair-dialog" onClose={onClose}>
    <header className="dialog-head"><button className="icon-button" aria-label={t("닫기", "Close")} data-testid="binding-repair-close" onClick={onClose}><Icon name="close" /></button><h2 id="binding-repair-title">{t("토큰 연결 복구", "Repair token bindings")}</h2><p>{t("모든 잘못된 연결을 함께 수정합니다. 선택 후 변경 내용을 검토하고 저장할 수 있습니다.", "Correct every incompatible binding together, then review and save the changes.")}</p></header>
    <div className="dialog-body form-stack">{issues.map((issue, index) => {
      const token = tokens.find(token => token.id === issue.tokenId), component = state.projection?.components.find(component => component.id === issue.componentId);
      const document = project?.documents[issue.documentId]?.document, [, group, ruleIndex] = issue.path.split("/");
      const entries = document?.[group ?? ""], rule = Array.isArray(entries) ? entries[Number(ruleIndex)] : undefined;
      const predicates = object(rule) ? [rule.variants, rule.states].filter(object).flatMap(values => Object.entries(values).map(([key, value]) => `${key}=${String(value)}`)) : [];
      const context = group === "motion" && object(rule) ? `${t("트랙", "Track")} ${Number(ruleIndex) + 1} · ${rule.trigger} · ${rule.property}` : predicates.join(" · ") || t("기본", "Base");
      const label = `${component?.name ?? issue.componentId} · ${component?.parts.find(part => part.id === issue.partId)?.name ?? issue.partId} · ${document?.category ?? "Motion"} · ${context} · ${issue.property}`;
      return <div className="property-group" key={`${issue.documentId}/${issue.path}`}><Field label={label}><Select data-testid={`binding-repair-select-${index}`} aria-label={label} value={choices[index] ?? ""} onChange={event => { const value = event.currentTarget.value; setChoices(previous => ({ ...previous, [index]: value })); }}><option value="" disabled>{t("대체 토큰 선택", "Choose a replacement")}</option>{issue.compatibleTokenIds.map(id => <option key={id} value={`token:${id}`}>{tokens.find(token => token.id === id)?.name ?? id}</option>)}<option value="literal">{t("현재 테마의 값 유지 · 연결 해제", "Keep current theme value · unlink")}</option></Select><span className="field-hint">{t("기존 연결", "Current binding")}: {token?.name ?? issue.tokenId} · {token?.bindingCategory}</span>{choices[index] === "literal" && <span className="field-hint">{t("현재 값으로 고정되며 이후 토큰·테마 변경을 따르지 않습니다.", "The value becomes a literal and stops following token or theme changes.")}</span>}</Field></div>;
    })}{!issues.length && <p className="help">{t("연결 복구 외의 진단을 먼저 소스에서 수정하세요.", "Repair other source diagnostics before using binding repair.")}</p>}{state.error && <DiagnosticList diagnostics={state.diagnostics} locale={locale} />}</div>
    <footer className="dialog-footer"><span className="field-hint" role="status" data-testid="binding-repair-progress">{Object.values(choices).filter(Boolean).length} / {issues.length}</span><Button data-testid="binding-repair-cancel" onClick={onClose}>{t("취소", "Cancel")}</Button><Button tone="primary" data-testid="binding-repair-apply" disabled={!complete || state.busy || state.retryable || Boolean(state.candidate)} onClick={apply}>{t("복구 변경안 만들기", "Prepare repair")}</Button></footer>
  </Modal>;
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
