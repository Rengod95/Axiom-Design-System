import { useEffect, useRef, useState } from "react";
import type { Locale } from "./locales.ts";
import { copy } from "./ui.tsx";

export const SIDEBAR_MIN = 196, SIDEBAR_MAX = 400, SIDEBAR_DEFAULT = 232;
export const sidebarWidth = (value: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Number.isFinite(value) ? value : SIDEBAR_DEFAULT));
export function SidebarResize({ width, onChange, locale }: { width: number; onChange(width: number): void; locale: Locale }) {
  const handle = useRef<HTMLDivElement>(null), [actual, setActual] = useState(width);
  useEffect(() => { const parent = handle.current?.parentElement; if (!parent) return; const observer = new ResizeObserver(() => setActual(parent.getBoundingClientRect().width)); observer.observe(parent); return () => observer.disconnect(); }, []);
  const drag = useRef<{ x: number; width: number } | null>(null);
  return <div ref={handle} className="sidebar-resize" role="separator" tabIndex={0} aria-orientation="vertical" aria-controls="studio-sidebar" aria-label={copy(locale, "탐색 패널 너비", "Navigation panel width")} aria-valuemin={SIDEBAR_MIN} aria-valuemax={SIDEBAR_MAX} aria-valuenow={Math.round(actual)} aria-valuetext={`${Math.round(actual)} px`} data-testid="sidebar-resize" data-tooltip={copy(locale, "드래그하여 너비 조절 · 더블클릭으로 초기화", "Drag to resize · Double-click to reset")} onDoubleClick={() => onChange(SIDEBAR_DEFAULT)}
    onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); drag.current = { x: event.clientX, width: actual }; event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={event => { if (drag.current) onChange(sidebarWidth(drag.current.width + event.clientX - drag.current.x)); }}
    onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { if (drag.current) onChange(drag.current.width); drag.current = null; }}
    onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); onChange(event.key === "Home" ? SIDEBAR_MIN : event.key === "End" ? SIDEBAR_MAX : sidebarWidth(actual + (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 32 : 8))); }}><span /></div>;
}
