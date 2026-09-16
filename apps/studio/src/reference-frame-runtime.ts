import { referenceEnvelope } from "./reference-protocol.ts";
import type { ReferenceEdits, ReferenceMount, ReferencePartBox } from "./reference-protocol.ts";
import { applyReferenceEdits } from "./reference-frame-styles.ts";

/** This module runs only in an opaque, script-only frame; provider code cannot read Studio storage. */
export function mountReferenceFrame(mount: ReferenceMount): void {
  const params = new URLSearchParams(location.search), nonce = params.get("nonce") ?? "", row = Number(params.get("row")), theme = params.get("theme") === "light" ? "light" : "dark";
  const root = document.getElementById("reference-root")!;
  document.documentElement.style.colorScheme = theme;
  document.body.style.backgroundColor = theme === "dark" ? "#09090b" : "#ffffff";
  const send = (type: string, fields: Record<string, unknown> = {}) => parent.postMessage({ channel: "axiom-reference", nonce, type, ...fields }, "*");
  let edits: ReferenceEdits | null = null, pending = false, disposed = false, cleanupEdits = () => {};
  const announce = () => { if (root.dataset.referenceState === "error") send("error", { message: root.dataset.referenceError ?? "Unable to render original template." }); else if (root.dataset.referenceState === "ready") { send("ready"); refresh(); } };
  const measure = () => {
    const boxes: ReferencePartBox[] = [...document.querySelectorAll<HTMLElement>("[data-reference-part]")].flatMap(element => {
      const rect = element.getBoundingClientRect(); return rect.width && rect.height ? [{ id: element.dataset.referencePart!, x: rect.x, y: rect.y, width: rect.width, height: rect.height }] : [];
    }).slice(0, 256);
    send("measure", { height: Math.max(root.getBoundingClientRect().bottom + 16, 96), boxes });
  };
  const refresh = () => { if (pending || disposed) return; pending = true; requestAnimationFrame(() => { pending = false; observer.disconnect(); cleanupEdits(); cleanupEdits = edits ? applyReferenceEdits(root, edits) : () => {}; measure(); observer.observe(document.body, { childList: true, subtree: true }); }); };
  const observer = new MutationObserver(refresh), resize = new ResizeObserver(measure);
  document.addEventListener("scroll", measure, { capture: true, passive: true });
  window.addEventListener("message", event => {
    if (event.source !== parent || !referenceEnvelope(event.data) || event.data.nonce !== nonce) return;
    if (event.data.type === "hello") { announce(); return; }
    if (event.data.type !== "update") return;
    const candidate = event.data.edits;
    if (candidate === null) edits = null;
    else if (candidate && typeof candidate === "object" && "component" in candidate && "design" in candidate && JSON.stringify(candidate).length < 2_000_000) edits = candidate as ReferenceEdits;
    refresh();
  });
  const error = (message: string) => send("error", { message });
  window.addEventListener("error", event => error(event.message));
  window.addEventListener("unhandledrejection", event => error(String(event.reason)));
  if (!Number.isInteger(row) || row < 1 || row > 330) { error("Unknown reference template."); return; }
  try {
    const dispose = mount(root, row, { theme });
    const ready = announce;
    root.addEventListener("reference-ready", ready);
    root.addEventListener("axiom-reference-ready", ready);
    const state = new MutationObserver(() => { if (root.dataset.referenceState === "ready" || root.dataset.referenceState === "error") ready(); });
    state.observe(root, { attributes: true, attributeFilter: ["data-reference-state"] });
    observer.observe(document.body, { childList: true, subtree: true }); resize.observe(root);
    // Synchronous providers do not emit a custom event; the first painted tree is ready.
    requestAnimationFrame(() => requestAnimationFrame(ready));
    window.addEventListener("pagehide", () => { disposed = true; state.disconnect(); observer.disconnect(); resize.disconnect(); cleanupEdits(); dispose(); }, { once: true });
  } catch (cause) { error(cause instanceof Error ? cause.message : "Template could not mount."); }
}
