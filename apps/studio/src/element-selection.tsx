import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { StudioComponentEdit, StudioDesign, StudioPart } from "../../../modules/ads-core/src/index.ts";
import type { Locale } from "./locales.ts";
import { Icon } from "./icons.tsx";
import { copy } from "./ui.tsx";
import { useFormDraft } from "./form-drafts.tsx";

export type ElementEditHandler = (edits: StudioComponentEdit[]) => boolean;
/** Editing chrome is a sibling overlay, never a textarea nested inside a semantic button. */
export function InlineElementOverlay({ root, part, locale, onEdit, onClose }: { root: RefObject<HTMLDivElement | null>; part: StudioPart; locale: Locale; onEdit: ElementEditHandler; onClose(): void }) {
  const [bounds, setBounds] = useState({ left: 0, top: 0, width: 200 });
  useEffect(() => {
    const container = root.current, target = container?.querySelector<HTMLElement>(`[data-part-id="${part.id}"]`);
    if (!container || !target) return;
    const outer = container.getBoundingClientRect(), inner = target.getBoundingClientRect(), scale = outer.width / (container.offsetWidth || outer.width);
    if (scale > 0) setBounds({ left: (inner.left - outer.left) / scale, top: (inner.top - outer.top) / scale, width: Math.max(160, inner.width / scale) });
  }, [root, part.id]);
  return <div className="element-inline-overlay" data-element-handle data-canvas-ui style={bounds}><InlineElementText part={part} locale={locale} onEdit={onEdit} onClose={onClose} /></div>;
}
export function ElementSelection({ root, part, design, locale, onEdit }: { root: RefObject<HTMLDivElement | null>; part: StudioPart; design: StudioDesign; locale: Locale; onEdit: ElementEditHandler }) {
  const [bounds, setBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [ghost, setGhost] = useState<typeof bounds>(null);
  const gesture = useRef<{ x: number; y: number; scale: number; resize: boolean; bounds: NonNullable<typeof bounds>; next: NonNullable<typeof bounds> } | null>(null);
  const layout = design.layout[part.id], canMove = Boolean(part.parent && design.layout[part.parent]?.mode === "free");
  useEffect(() => {
    const container = root.current, target = container?.querySelector<HTMLElement>(`[data-part-id="${part.id}"]`);
    if (!container || !target) { setBounds(null); return; }
    const measure = () => { const outer = container.getBoundingClientRect(), inner = target.getBoundingClientRect(), scale = outer.width / (container.offsetWidth || outer.width); if (scale > 0) setBounds({ x: (inner.x - outer.x) / scale, y: (inner.y - outer.y) / scale, width: inner.width / scale, height: inner.height / scale }); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(container); observer.observe(target); return () => observer.disconnect();
  }, [root, part.id, design]);
  if (!bounds || !layout || !part.parent) return null;
  const shown = ghost ?? bounds, t = (ko: string, en: string) => copy(locale, ko, en);
  return <div className="element-selection" data-element-handle data-canvas-ui style={{ left: shown.x, top: shown.y, width: shown.width, height: shown.height }}>
    {([false, true] as const).map(resize => <button key={String(resize)} type="button" className={resize ? "element-resize" : "element-move"} data-testid={resize ? "element-resize" : "element-move"} hidden={!resize && !canMove} aria-label={resize ? t("요소 크기 조절", "Resize element") : t("요소 이동", "Move element")} onPointerDown={event => {
      event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
      const container = root.current!; gesture.current = { x: event.clientX, y: event.clientY, scale: container.getBoundingClientRect().width / container.offsetWidth, resize, bounds, next: bounds };
    }} onPointerMove={event => { const g = gesture.current; if (!g) return; const dx = (event.clientX - g.x) / g.scale, dy = (event.clientY - g.y) / g.scale; g.next = g.resize ? { ...g.bounds, width: Math.max(1, Math.min(4096, Math.round(g.bounds.width + dx))), height: Math.max(1, Math.min(4096, Math.round(g.bounds.height + dy))) } : { ...g.bounds, x: g.bounds.x + dx, y: g.bounds.y + dy }; setGhost(g.next); }} onPointerUp={event => {
      const g = gesture.current; if (!g) return; gesture.current = null; event.currentTarget.releasePointerCapture(event.pointerId); setGhost(null);
      if (g.resize) onEdit((["width", "height"] as const).map(field => ({ kind: "layout", category: design.category, partId: part.id, field, value: { mode: "fixed", value: g.next[field] } })));
      else onEdit([{ kind: "layout", category: design.category, partId: part.id, field: "position", value: { x: Math.round((layout.position?.x ?? 0) + g.next.x - g.bounds.x), y: Math.round((layout.position?.y ?? 0) + g.next.y - g.bounds.y) } }]);
    }} onPointerCancel={() => { gesture.current = null; setGhost(null); }} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); event.stopPropagation(); const step = event.shiftKey ? 10 : 1, dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0, dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      onEdit(resize ? [{ kind: "layout", category: design.category, partId: part.id, field: dx ? "width" : "height", value: { mode: "fixed", value: Math.max(1, Math.min(4096, (dx ? bounds.width : bounds.height) + dx + dy)) } }] : [{ kind: "layout", category: design.category, partId: part.id, field: "position", value: { x: (layout.position?.x ?? 0) + dx, y: (layout.position?.y ?? 0) + dy } }]);
    }}>{!resize && <Icon name="move" size={12} />}</button>)}
  </div>;
}

export function InlineElementText({ part, locale, onEdit, onClose }: { part: StudioPart; locale: Locale; onEdit: ElementEditHandler; onClose(): void }) {
  const [text, setText] = useState(part.text ?? ""), ref = useRef<HTMLTextAreaElement>(null);
  const apply = () => { if (text.length > 8000) return false; if (text === part.text || onEdit([{ kind: "part-text", partId: part.id, text }])) { onClose(); return true; } return false; };
  useFormDraft({ id: `inline-element-${part.id}`, label: copy(locale, "캔버스 텍스트", "Canvas text"), dirty: text !== part.text, valid: text.length <= 8000, apply, reset: onClose, focus: () => ref.current?.focus() });
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return <textarea ref={ref} data-element-handle data-canvas-ui className="element-inline-text" data-testid="element-inline-text" aria-label={copy(locale, "요소 텍스트 · Ctrl Enter로 반영", "Element text · Ctrl Enter to apply")} aria-invalid={text.length > 8000} value={text} onChange={event => setText(event.target.value)} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onBlur={apply} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); onClose(); } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); apply(); } }} />;
}
