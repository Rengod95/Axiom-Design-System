import { Component, useLayoutEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { REFERENCE_TEMPLATES, REFERENCE_SOURCE_ROWS } from "./registry";
import "./frame.css";

export { REFERENCE_TEMPLATES, REFERENCE_SOURCE_ROWS };

class ReferenceBoundary extends Component<{ onError: (error: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { this.props.onError(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function CommittedReference({ host }: { host: HTMLElement }) {
  useLayoutEffect(() => {
    if (host.dataset.referenceState === "error") return;
    host.dataset.referenceState = "ready";
    host.dispatchEvent(new Event("axiom-reference-ready"));
  }, [host]);
  return null;
}

/** Mounts the original CSS Modules hero demo without replacing its anatomy or design. */
export function mountReferenceTemplate(element: HTMLElement, sourceRow: number, options: { theme: "light" | "dark" }): () => void {
  const template = REFERENCE_TEMPLATES[sourceRow as keyof typeof REFERENCE_TEMPLATES];
  if (!template) throw new Error(`Unknown Base UI reference source row ${sourceRow}.`);
  const document = element.ownerDocument;
  document.documentElement.dataset.referenceTheme = options.theme;
  document.documentElement.style.colorScheme = options.theme;
  element.dataset.referenceProvider = "base-ui";
  element.dataset.referenceSourceRow = String(sourceRow);
  element.dataset.referenceState = "loading";
  delete element.dataset.referenceError;
  const reportError = (error: unknown) => {
    element.dataset.referenceError = error instanceof Error ? error.message : String(error);
    element.dataset.referenceState = "error";
  };
  const root = createRoot(element, { onUncaughtError: reportError });
  const Demo = template.component;
  root.render(<ReferenceBoundary onError={reportError}><Demo /><CommittedReference host={element} /></ReferenceBoundary>);
  return () => root.unmount();
}
