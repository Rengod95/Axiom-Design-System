import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ScrollTarget = { element: HTMLElement; id: string };
function overlayPosition(host: HTMLElement, x: number, y: number) {
  if (!(host instanceof HTMLDialogElement)) return { position: "fixed" as const, left: x, top: y };
  const rect = host.getBoundingClientRect();
  return { position: "absolute" as const, left: x - rect.left - host.clientLeft + host.scrollLeft, top: y - rect.top - host.clientTop + host.scrollTop };
}
/** Enhances existing native viewports without wrapping them or intercepting wheel/touch gestures. */
export function StudioScrollAreas() {
  const [targets, setTargets] = useState<ScrollTarget[]>([]);
  useEffect(() => {
    let frame = 0, serial = 0;
    const known = new Map<HTMLElement, ScrollTarget>();
    const scan = () => {
      frame = 0;
      for (const element of document.querySelectorAll<HTMLElement>("#root :is(div,aside,main,section,nav,pre,textarea,dialog),.select-popup")) {
        if (element.closest(".studio-scrollbar,.studio-tooltip,.canvas-viewport,.preview-surface")) continue;
        const style = getComputedStyle(element);
        if (!/(auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) continue;
        if (!known.has(element)) {
          const id = element.id || `studio-scroll-viewport-${++serial}`;
          element.id ||= id;
          element.dataset.studioScroll = "true";
          known.set(element, { element, id });
        }
      }
      for (const element of known.keys()) if (!element.isConnected) known.delete(element);
      const next = [...known.values()];
      setTargets(before => before.length === next.length && before.every((item, i) => item.element === next[i]?.element) ? before : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(scan); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule); scan();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", schedule); for (const element of known.keys()) delete element.dataset.studioScroll; };
  }, []);
  return <>{targets.map(target => <ScrollTracks key={target.id} {...target} />)}</>;
}

function ScrollTracks({ element, id }: ScrollTarget) {
  const [geometry, setGeometry] = useState({ x: 0, y: 0, width: 0, height: 0, scrollX: 0, scrollY: 0, maxX: 0, maxY: 0, totalWidth: 0, totalHeight: 0 });
  const [active, setActive] = useState(false);
  const dragging = useRef<{ axis: "x" | "y"; point: number; scroll: number } | null>(null);
  useEffect(() => {
    let frame = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      let left = Math.max(0, rect.left), top = Math.max(0, rect.top), right = Math.min(innerWidth, rect.right), bottom = Math.min(innerHeight, rect.bottom);
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      }
      const hidden = !element.getClientRects().length || right <= left || bottom <= top;
      const next = { x: left, y: top, width: hidden ? 0 : right - left, height: hidden ? 0 : bottom - top, scrollX: element.scrollLeft, scrollY: element.scrollTop, maxX: Math.max(0, element.scrollWidth - element.clientWidth), maxY: Math.max(0, element.scrollHeight - element.clientHeight), totalWidth: element.scrollWidth, totalHeight: element.scrollHeight };
      setGeometry(before => JSON.stringify(before) === JSON.stringify(next) ? before : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const activate = () => { setActive(true); clearTimeout(timer); schedule(); };
    const hide = () => { clearTimeout(timer); timer = setTimeout(() => { if (!dragging.current) setActive(false); }, 800); };
    const scroll = (event: Event) => { schedule(); if (event.target === element) { activate(); hide(); } };
    const resize = new ResizeObserver(schedule); resize.observe(element);
    for (const child of element.children) resize.observe(child);
    const mutation = new MutationObserver(schedule); mutation.observe(element, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden", "open"] });
    document.addEventListener("scroll", scroll, true); window.addEventListener("resize", schedule);
    element.addEventListener("pointerenter", activate); element.addEventListener("pointerleave", hide); element.addEventListener("focusin", activate); element.addEventListener("focusout", hide);
    measure();
    return () => { resize.disconnect(); mutation.disconnect(); clearTimeout(timer); cancelAnimationFrame(frame); document.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", schedule); element.removeEventListener("pointerenter", activate); element.removeEventListener("pointerleave", hide); element.removeEventListener("focusin", activate); element.removeEventListener("focusout", hide); };
  }, [element]);
  if (!geometry.width || !geometry.height) return null;
  const host = element.closest("dialog") ?? document.body;
  return createPortal(<>{(["y", "x"] as const).map(axis => {
    const vertical = axis === "y", max = vertical ? geometry.maxY : geometry.maxX;
    if (max < 2) return null;
    const length = Math.max(0, (vertical ? geometry.height : geometry.width) - 8), total = vertical ? geometry.totalHeight : geometry.totalWidth;
    const thumb = Math.min(length, Math.max(24, length * length / total)), travel = Math.max(1, length - thumb), value = vertical ? geometry.scrollY : geometry.scrollX;
    const scrollTo = (value: number) => { if (vertical) element.scrollTop = value; else element.scrollLeft = value; };
    return <div key={axis} className="studio-scrollbar" data-axis={axis} data-active={active} style={vertical ? { ...overlayPosition(host, geometry.x + geometry.width - 9, geometry.y + 4), height: length } : { ...overlayPosition(host, geometry.x + 4, geometry.y + geometry.height - 9), width: length }} role="scrollbar" tabIndex={0} aria-controls={id} aria-orientation={vertical ? "vertical" : "horizontal"} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} aria-label={document.documentElement.lang === "ko" ? (vertical ? "세로 스크롤" : "가로 스크롤") : (vertical ? "Scroll vertically" : "Scroll horizontally")}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setActive(true); if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); scrollTo(((vertical ? event.clientY - rect.top : event.clientX - rect.left) - thumb / 2) / travel * max); } dragging.current = { axis, point: vertical ? event.clientY : event.clientX, scroll: vertical ? element.scrollTop : element.scrollLeft }; }}
      onPointerMove={event => { if (dragging.current?.axis === axis) scrollTo(dragging.current.scroll + ((vertical ? event.clientY : event.clientX) - dragging.current.point) / travel * max); }}
      onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}
      onKeyDown={event => { const delta = ["ArrowDown", "ArrowRight"].includes(event.key) ? 40 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -40 : event.key === "PageDown" ? length : event.key === "PageUp" ? -length : 0; if (delta || event.key === "Home" || event.key === "End") { event.preventDefault(); scrollTo(event.key === "Home" ? 0 : event.key === "End" ? max : value + delta); } }}><span style={vertical ? { height: thumb, transform: `translateY(${value / max * travel}px)` } : { width: thumb, transform: `translateX(${value / max * travel}px)` }} /></div>;
  })}</>, host);
}

export function StudioTooltips() {
  const [tip, setTip] = useState<{ target: HTMLElement; label: string; x: number; y: number; below: boolean } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hide = () => { clearTimeout(timer); setTip(null); };
    const enter = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-tooltip]") : null;
      if (!target) return;
      clearTimeout(timer);
      timer = setTimeout(() => { const rect = target.getBoundingClientRect(); setTip({ target, label: target.dataset.tooltip!, x: Math.max(100, Math.min(innerWidth - 100, rect.left + rect.width / 2)), y: rect.top > 64 ? rect.top - 8 : rect.bottom + 8, below: rect.top <= 64 }); }, event.type === "focusin" ? 0 : 400);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("pointerover", enter); document.addEventListener("focusin", enter); document.addEventListener("pointerout", hide); document.addEventListener("focusout", hide); document.addEventListener("pointerdown", hide); document.addEventListener("scroll", hide, true); document.addEventListener("keydown", escape);
    return () => { hide(); document.removeEventListener("pointerover", enter); document.removeEventListener("focusin", enter); document.removeEventListener("pointerout", hide); document.removeEventListener("focusout", hide); document.removeEventListener("pointerdown", hide); document.removeEventListener("scroll", hide, true); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => { if (!tip) return; const previous = tip.target.getAttribute("aria-describedby"); tip.target.setAttribute("aria-describedby", `${previous ?? ""} studio-tooltip`.trim()); return () => { if (previous === null) tip.target.removeAttribute("aria-describedby"); else tip.target.setAttribute("aria-describedby", previous); }; }, [tip]);
  if (!tip?.target.isConnected) return null;
  const host = tip.target.closest("dialog") ?? document.body;
  return createPortal(<div id="studio-tooltip" role="tooltip" className="studio-tooltip" data-below={tip.below} style={overlayPosition(host, tip.x, tip.y)}>{tip.label}</div>, host);
}
