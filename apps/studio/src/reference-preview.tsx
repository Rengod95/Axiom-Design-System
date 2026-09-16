import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { getStudioReferenceTemplate, getStudioReferencePartBinding, studioReferenceForCatalog } from "../../../modules/ads-core/src/index.ts";
import type { StudioReferenceTemplate } from "../../../modules/ads-core/src/index.ts";
import type { CatalogPreviewProps } from "./catalog-preview.tsx";
import { ElementSelection, InlineElementOverlay } from "./element-selection.tsx";
import { referenceBoxes, referenceEnvelope } from "./reference-protocol.ts";
import type { ReferenceEdits, ReferencePartBox } from "./reference-protocol.ts";
import { Button, copy } from "./ui.tsx";

type ReferenceTheme = "light" | "dark";
export const ReferenceThemeContext = createContext<ReferenceTheme | null>(null);
const themeListeners = new Set<() => void>();
let themeObserver: MutationObserver | null = null;
const readStudioTheme = (): ReferenceTheme => typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark";
function subscribeStudioTheme(listener: () => void) {
  themeListeners.add(listener);
  if (!themeObserver) {
    themeObserver = new MutationObserver(() => { for (const notify of themeListeners) notify(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  return () => { themeListeners.delete(listener); if (!themeListeners.size) { themeObserver?.disconnect(); themeObserver = null; } };
}
const readServerTheme = (): ReferenceTheme => "dark";
function useReferenceTheme(): ReferenceTheme {
  const override = useContext(ReferenceThemeContext);
  const studioTheme = useSyncExternalStore(subscribeStudioTheme, readStudioTheme, readServerTheme);
  return override ?? studioTheme;
}
export function ReferenceThumbnail({ catalogId, name }: { catalogId: string; name: string }) {
  const template = studioReferenceForCatalog(catalogId), theme = useReferenceTheme();
  return template ? <img className="reference-thumbnail" loading="lazy" decoding="async" src={`/references/${template.bundle}-previews/${template.sourceRow}-${theme}.png`} alt={`${name} · ${template.provider}`} /> : null;
}
/** Keep the upstream example's usable viewport while fitting it into a narrow inspector dialog. */
export function ReferenceDialogPreview({ template, locale }: { template: StudioReferenceTemplate; locale: CatalogPreviewProps["locale"] }) {
  const host = useRef<HTMLDivElement>(null), [width, setWidth] = useState(720), [fit, setFit] = useState(true);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(1, entries[0]?.contentRect.width ?? 720)));
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  const viewport = Math.max(560, width), scale = fit ? Math.min(1, width / viewport) : 1;
  return <div className="reference-dialog-preview">
    <div ref={host} className="reference-dialog-viewport" data-testid="reference-dialog-viewport">
      <div className="reference-dialog-stage" style={{ width: viewport * scale, height: 480 * scale }}>
        <div style={{ width: viewport, transform: `scale(${scale})`, transformOrigin: "top left" }}><ReferenceFrame template={template} interactive /></div>
      </div>
    </div>
    <div className="reference-preview-controls" role="group" aria-label={copy(locale, "미리보기 배율", "Preview scale")}>
      <span>{copy(locale, "공식 예제", "Original example")}</span>
      <Button size="sm" tone="subtle" aria-pressed={fit} data-testid="reference-fit" onClick={() => setFit(true)}>{copy(locale, "화면에 맞춤", "Fit")}</Button>
      <Button size="sm" tone="subtle" aria-pressed={!fit} data-testid="reference-actual-size" onClick={() => setFit(false)}>100%</Button>
    </div>
  </div>;
}
export function ReferenceFrame({ template, edits, interactive = false, viewportHeight = 480, onBoxes }: { template: StudioReferenceTemplate; edits?: ReferenceEdits; interactive?: boolean; viewportHeight?: number; onBoxes?: (boxes: ReferencePartBox[]) => void }) {
  const iframe = useRef<HTMLIFrameElement>(null), instanceId = useId(), theme = useReferenceTheme();
  const nonce = `${instanceId}:${template.id}:${theme}:${interactive ? "run" : "edit"}`;
  const height = Math.max(128, Math.min(2048, viewportHeight));
  const [state, setState] = useState("loading"), [error, setError] = useState("");
  const latest = useRef({ edits, onBoxes }); latest.current = { edits, onBoxes };
  const editSignature = JSON.stringify(edits ?? null);
  const readyNonce = useRef<string | null>(null), lastSent = useRef<string | null>(null), lastBoxes = useRef("[]");
  const send = useCallback(() => {
    if (readyNonce.current !== nonce) return;
    const signature = JSON.stringify(latest.current.edits ?? null);
    if (lastSent.current === signature) return;
    const target = iframe.current?.contentWindow;
    if (!target) return;
    lastSent.current = signature;
    target.postMessage({ channel: "axiom-reference", type: "update", nonce, edits: latest.current.edits ?? null }, "*");
  }, [nonce]);
  const hello = useCallback(() => iframe.current?.contentWindow?.postMessage({ channel: "axiom-reference", type: "hello", nonce }, "*"), [nonce]);
  useEffect(() => {
    readyNonce.current = null; lastSent.current = null;
    setState("loading"); setError("");
    if (lastBoxes.current !== "[]") { lastBoxes.current = "[]"; latest.current.onBoxes?.([]); }
    const receive = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || !referenceEnvelope(event.data) || event.data.nonce !== nonce) return;
      const data = event.data;
      if (data.type === "ready") { readyNonce.current = nonce; setState("ready"); send(); }
      if (data.type === "error") { readyNonce.current = null; setState("error"); setError(typeof data.message === "string" ? data.message.slice(0, 300) : "Template unavailable"); }
      if (data.type === "measure") {
        const boxes = referenceBoxes(data.boxes);
        if (boxes) {
          const signature = JSON.stringify(boxes);
          if (signature !== lastBoxes.current) { lastBoxes.current = signature; latest.current.onBoxes?.(boxes); }
        }
      }
    };
    window.addEventListener("message", receive);
    // A cached module can announce before this listener is installed. onLoad also
    // retries after a slower frame has registered its own message listener.
    hello();
    return () => { window.removeEventListener("message", receive); readyNonce.current = null; };
  }, [nonce, send, hello]);
  useEffect(send, [editSignature, send]);
  return <div className="reference-frame-shell" data-reference-state={state}>
    <iframe key={nonce} ref={iframe} title={`${template.name} · ${template.provider}`} className="reference-frame" sandbox="allow-scripts" referrerPolicy="no-referrer" tabIndex={interactive ? 0 : -1} onLoad={() => { readyNonce.current = null; lastSent.current = null; hello(); }} style={{ height, colorScheme: theme, backgroundColor: theme === "dark" ? "#09090b" : "#ffffff", pointerEvents: interactive ? "auto" : "none" }} src={`/references/${template.bundle}.html?row=${template.sourceRow}&theme=${theme}&mode=${interactive ? "run" : "edit"}&nonce=${encodeURIComponent(nonce)}`} />
    {state === "loading" && <span className="reference-loading" role="status">Loading {template.provider}…</span>}
    {state === "error" && <p className="reference-error" role="alert">{error}</p>}
  </div>;
}
export function ReferenceCatalogPreview({ component, category, mode, selectedPart, onSelect, locale, nested = false, onElementEdit }: CatalogPreviewProps) {
  const template = getStudioReferenceTemplate(component.catalog!.reference!.templateId)!;
  const design = category === "Web" ? component.web : component.mobile;
  const root = useRef<HTMLDivElement>(null), [boxes, setBoxes] = useState<ReferencePartBox[]>([]), [editing, setEditing] = useState<string | null>(null);
  const selected = component.parts.find(part => part.id === selectedPart), edited = component.parts.find(part => part.id === editing);
  const textEditable = (id: string) => { const part = component.parts.find(part => part.id === id); return Boolean(part && (part.elementKind || getStudioReferencePartBinding(template.id, part.role)?.text)); };
  const edit = (changes: Parameters<NonNullable<typeof onElementEdit>>[1]) => onElementEdit?.(component.id, changes) ?? false;
  const body = <div ref={root} className="reference-canvas" data-testid={`preview-${component.id}`} data-component-id={component.id}>
    <ReferenceFrame template={template} edits={{ component, design }} interactive={mode === "run"} viewportHeight={(design.editorFrame?.height ?? 520) - 56} onBoxes={setBoxes} />
    {mode === "edit" && <div className="reference-hit-layer">{boxes.map(box => <button type="button" key={box.id} className={`reference-hit ${box.id === selectedPart ? "selected" : ""}`} data-part-id={box.id} data-component-id={component.id} aria-label={component.parts.find(part => part.id === box.id)?.name ?? component.name} style={{ left: box.x, top: box.y, width: box.width, height: box.height }} onClick={() => onSelect(component.id, box.id)} onDoubleClick={() => { if (textEditable(box.id)) setEditing(box.id); }} />)}</div>}
    {mode === "edit" && selected?.elementKind && onElementEdit && <ElementSelection root={root} part={selected} design={design} locale={locale} onEdit={edit} />}
    {mode === "edit" && edited && textEditable(edited.id) && onElementEdit && <InlineElementOverlay root={root} part={edited} locale={locale} onEdit={edit} onClose={() => setEditing(null)} />}
  </div>;
  return nested ? body : <section className="preview-section reference-preview"><div className="reference-source"><span>{template.provider}</span><a href={template.docsUrl} target="_blank" rel="noreferrer">{copy(locale, "원본 예제", "Original example")} ↗</a></div>{body}</section>;
}
