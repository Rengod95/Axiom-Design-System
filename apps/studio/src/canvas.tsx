import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { StudioCategory, StudioComponent } from "../../../modules/ads-core/src/index.ts";
import { canvasPoint, clampZoom, fitBounds, intersects, snap, unionBounds, zoomAt } from "./canvas-geometry.ts";
import type { Point, Rect, Viewport } from "./canvas-geometry.ts";
import type { Locale } from "./locales.ts";
import { Preview } from "./preview.tsx";
import { editingTarget } from "./ui-utils.ts";
import { Select, copy, IconButton } from "./ui.tsx";
import { pinchViewport, wheelViewport } from "./canvas-input.ts";

export interface CanvasFrame extends Rect {}
interface Props {
  components: StudioComponent[]; category: StudioCategory; mode: "edit" | "run"; locale: Locale;
  selectedIds: string[]; selectedPart: string | null; frames: Record<string, CanvasFrame>;
  onSelect(ids: string[], partId?: string): void; onFrames(frames: Record<string, CanvasFrame>): void;
  onDuplicate(): void; onDelete(): void; disabled: boolean;
}
type Gesture = { kind: "pan"; point: Point; view: Viewport } | { kind: "marquee"; point: Point; additive: string[] } | { kind: "move" | "resize"; point: Point; originals: Record<string, CanvasFrame> };

export function Canvas(props: Props) {
  const { components, category, mode, locale, selectedIds, selectedPart, frames, onSelect, onFrames, disabled } = props;
  const root = useRef<HTMLDivElement>(null), size = useRef({ width: 800, height: 600 }), initial = useRef(false);
  const [view, setView] = useState<Viewport>({ x: 64, y: 64, zoom: 1 }), viewRef = useRef(view);
  const [tool, setTool] = useState<"select" | "hand">("select"), [space, setSpace] = useState(false), spaceRef = useRef(false);
  const [grid, setGrid] = useState(true), [snapping, setSnapping] = useState(true), [marquee, setMarquee] = useState<Rect | null>(null), [transient, setTransient] = useState<Record<string, CanvasFrame>>({});
  const [zoomDraft, setZoomDraft] = useState("100");
  const gesture = useRef<Gesture | null>(null), changes = useRef<Record<string, CanvasFrame>>({}), current = useRef(props);
  current.current = props; viewRef.current = view;
  useEffect(() => setZoomDraft(String(Math.round(view.zoom * 100))), [view.zoom]);
  const screenPoint = (event: { clientX: number; clientY: number }): Point => { const bounds = root.current!.getBoundingClientRect(); return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }; };
  const fit = (selected = false) => { const rects = Object.entries(current.current.frames).filter(([id]) => !selected || current.current.selectedIds.includes(id)).map(([, frame]) => frame); setView(fitBounds(unionBounds(rects), size.current)); };
  const zoom = (level: number) => setView(before => zoomAt(before, level, { x: size.current.width / 2, y: size.current.height / 2 }));
  useEffect(() => {
    const element = root.current!;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]!.contentRect; size.current = { width: rect.width, height: rect.height };
      if (!initial.current && rect.width > 0 && current.current.components.length) { initial.current = true; fit(); }
    });
    observer.observe(element);
    let nativePinch: { view: Viewport; scale: number; point: Point } | null = null;
    const wheel = (event: WheelEvent) => {
      if (!(event.target instanceof Node) || !element.contains(event.target)) return;
      if (event.target instanceof Element && event.target.closest("[data-canvas-ui]")) return;
      event.preventDefault();
      if (!nativePinch) setView(before => wheelViewport(before, event, screenPoint(event), size.current.height));
    };
    const nativeGesture = (event: Event) => {
      const input = event as Event & { scale?: number; clientX?: number; clientY?: number };
      if (!(event.target instanceof Node) || !element.contains(event.target)) return;
      event.preventDefault();
      if (event.type === "gestureend") { nativePinch = null; return; }
      if (event.type === "gesturestart") nativePinch = { view: viewRef.current, scale: input.scale ?? 1, point: typeof input.clientX === "number" && typeof input.clientY === "number" ? screenPoint({ clientX: input.clientX, clientY: input.clientY }) : { x: size.current.width / 2, y: size.current.height / 2 } };
      else if (nativePinch && typeof input.scale === "number" && input.scale > 0) setView(zoomAt(nativePinch.view, nativePinch.view.zoom * input.scale / nativePinch.scale, nativePinch.point));
    };
    const touches = new Map<number, Point>();
    let touchStart: { view: Viewport; points: [Point, Point] } | null = null;
    const touch = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "touch" || current.current.mode === "run" || event.target instanceof Element && event.target.closest("[data-canvas-ui]")) return;
      if (event.type === "pointerdown") {
        touches.set(event.pointerId, screenPoint(event)); element.setPointerCapture(event.pointerId);
        if (touches.size === 2) { gesture.current = null; touchStart = { view: viewRef.current, points: [...touches.values()] as [Point, Point] }; }
      } else if (event.type === "pointermove" && touches.has(event.pointerId)) {
        const previous = touches.get(event.pointerId)!, point = screenPoint(event); touches.set(event.pointerId, point);
        if (touchStart && touches.size === 2) setView(pinchViewport(touchStart.view, touchStart.points, [...touches.values()] as [Point, Point]));
        else if (touches.size === 1) setView(view => ({ ...view, x: view.x + point.x - previous.x, y: view.y + point.y - previous.y }));
      } else { touches.delete(event.pointerId); touchStart = null; }
      event.preventDefault(); event.stopImmediatePropagation();
    };
    window.addEventListener("wheel", wheel, { passive: false, capture: true });
    for (const name of ["gesturestart", "gesturechange", "gestureend"]) element.addEventListener(name, nativeGesture, { passive: false });
    for (const name of ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const) element.addEventListener(name, touch, { capture: true, passive: false });
    const keyboard = (event: KeyboardEvent) => {
      if (event.isComposing || editingTarget(event.target) || document.querySelector("dialog[open]") || !element.isConnected) return;
      if (event.target instanceof Element && event.target.closest("button, a, summary, [role=button], [role=tab]")) return;
      // Native controls remain usable while running the component.
      if (current.current.mode === "run" && event.target instanceof Element && event.target.closest(".component-root")) return;
      const key = event.key.toLowerCase(), command = event.ctrlKey || event.metaKey;
      if (key === " ") { event.preventDefault(); spaceRef.current = true; setSpace(true); }
      else if (key === "h" && !command) setTool("hand");
      else if (key === "v" && !command) setTool("select");
      else if ((key === "=" || key === "+") && !event.altKey) { event.preventDefault(); zoom(viewRef.current.zoom * 1.2); }
      else if (key === "-" && !event.altKey) { event.preventDefault(); zoom(viewRef.current.zoom / 1.2); }
      else if (key === "0" && !event.altKey) { event.preventDefault(); zoom(1); }
      else if (event.shiftKey && key === "1") { event.preventDefault(); fit(); }
      else if (event.shiftKey && key === "2") { event.preventDefault(); fit(true); }
      else if (key === "escape") { gesture.current = null; changes.current = {}; setTransient({}); setMarquee(null); current.current.onSelect([]); }
      else if (command && key === "a") { event.preventDefault(); current.current.onSelect(current.current.components.map(item => item.id)); }
      else if (command && key === "d" && !current.current.disabled) { event.preventDefault(); current.current.onDuplicate(); }
      else if ((key === "delete" || key === "backspace") && !current.current.disabled && current.current.selectedIds.length) { event.preventDefault(); current.current.onDelete(); }
      else if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
        event.preventDefault(); const distance = event.shiftKey ? 10 : 1;
        const dx = key === "arrowleft" ? -distance : key === "arrowright" ? distance : 0, dy = key === "arrowup" ? -distance : key === "arrowdown" ? distance : 0;
        if (current.current.selectedIds.length && !current.current.disabled && current.current.mode === "edit") {
          current.current.onFrames(Object.fromEntries(current.current.selectedIds.filter(id => current.current.frames[id]).map(id => [id, { ...current.current.frames[id]!, x: current.current.frames[id]!.x + dx, y: current.current.frames[id]!.y + dy }])));
        } else setView(before => ({ ...before, x: before.x - dx * 16, y: before.y - dy * 16 }));
      }
    };
    const release = (event: KeyboardEvent) => { if (event.key === " ") { spaceRef.current = false; setSpace(false); } };
    const blur = () => { spaceRef.current = false; setSpace(false); gesture.current = null; changes.current = {}; setTransient({}); setMarquee(null); };
    window.addEventListener("keydown", keyboard); window.addEventListener("keyup", release); window.addEventListener("blur", blur);
    return () => {
      observer.disconnect(); window.removeEventListener("wheel", wheel, true);
      for (const name of ["gesturestart", "gesturechange", "gestureend"]) element.removeEventListener(name, nativeGesture);
      for (const name of ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const) element.removeEventListener(name, touch, true);
      window.removeEventListener("keydown", keyboard); window.removeEventListener("keyup", release); window.removeEventListener("blur", blur);
    };
  }, []);
  const capture = (event: PointerEvent, next: Gesture) => { event.preventDefault(); event.stopPropagation(); gesture.current = next; root.current?.setPointerCapture(event.pointerId); };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("[data-canvas-ui]")) return;
    const point = screenPoint(event);
    if (event.button === 1 || tool === "hand" || spaceRef.current) { capture(event, { kind: "pan", point, view }); return; }
    if (mode !== "edit" || event.button !== 0 || event.target instanceof Element && event.target.closest(".canvas-frame")) return;
    capture(event, { kind: "marquee", point: canvasPoint(point, view), additive: event.shiftKey ? selectedIds : [] });
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const action = gesture.current; if (!action) return;
    const point = screenPoint(event);
    if (action.kind === "pan") { setView({ ...action.view, x: action.view.x + point.x - action.point.x, y: action.view.y + point.y - action.point.y }); return; }
    const world = canvasPoint(point, view), dx = world.x - action.point.x, dy = world.y - action.point.y;
    if (action.kind === "marquee") {
      const rect = { x: Math.min(world.x, action.point.x), y: Math.min(world.y, action.point.y), width: Math.abs(dx), height: Math.abs(dy) };
      setMarquee(rect); onSelect([...new Set([...action.additive, ...Object.entries(frames).filter(([, frame]) => intersects(frame, rect)).map(([id]) => id)])]); return;
    }
    changes.current = Object.fromEntries(Object.entries(action.originals).map(([id, frame]) => [id, action.kind === "move" ? { ...frame, x: snap(frame.x + dx, snapping && !event.altKey), y: snap(frame.y + dy, snapping && !event.altKey) } : { ...frame, width: Math.max(160, snap(frame.width + dx, snapping)), height: Math.max(100, snap(frame.height + dy, snapping)) }]));
    setTransient(changes.current);
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (!gesture.current) return;
    const edited = changes.current;
    gesture.current = null; changes.current = {}; setTransient({}); setMarquee(null);
    if (root.current?.hasPointerCapture(event.pointerId)) root.current.releasePointerCapture(event.pointerId);
    if (Object.keys(edited).length && !disabled) onFrames(edited);
  };
  return <div ref={root} className={`canvas-viewport ${tool === "hand" || space ? "hand-tool" : ""}`} data-testid="canvas-viewport" role="region" aria-label={copy(locale, "디자인 캔버스", "Design canvas")} tabIndex={0} onPointerDownCapture={event => { if (tool === "hand" || spaceRef.current || event.button === 1) down(event); }} onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { gesture.current = null; changes.current = {}; setTransient({}); setMarquee(null); }}
    style={grid ? { backgroundImage: "radial-gradient(var(--canvas-dot) 1px, transparent 1px)", backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` } : undefined}>
    <div className="canvas-world" data-testid="canvas-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
      {components.map(component => {
        const frame = transient[component.id] ?? frames[component.id]; if (!frame) return null;
        const selected = selectedIds.includes(component.id);
        return <div key={component.id} className={`canvas-frame ${selected ? "is-selected" : ""}`} data-component-frame={component.id} style={{ left: frame.x, top: frame.y, width: frame.width, minHeight: frame.height }}>
          <button type="button" className="frame-label" aria-pressed={selected} data-testid={`frame-label-${component.id}`} onClick={event => { if (event.detail === 0) onSelect([component.id]); }} onPointerDown={event => {
            if (spaceRef.current || tool === "hand" || event.button !== 0) return;
            const ids = event.shiftKey ? selected ? selectedIds.filter(id => id !== component.id) : [...selectedIds, component.id] : selected ? selectedIds : [component.id];
            onSelect(ids); if (!disabled && mode === "edit") capture(event, { kind: "move", point: canvasPoint(screenPoint(event), view), originals: Object.fromEntries(ids.map(id => [id, frames[id]!])) });
          }}><span className="frame-diamond" aria-hidden="true" />{component.name}<span>{Math.round(frame.width)} × {Math.round(frame.height)}</span></button>
          <div className="frame-content"><Preview components={[component]} category={category} mode={mode} selectedPart={selected ? selectedPart : null} onSelect={(id, partId) => onSelect([id], partId)} locale={locale} /></div>
          {selected && mode === "edit" && !disabled && <button type="button" className="resize-handle" aria-label={copy(locale, `${component.name} 크기 조절`, `Resize ${component.name}`)} onPointerDown={event => capture(event, { kind: "resize", point: canvasPoint(screenPoint(event), view), originals: { [component.id]: frame } })} onKeyDown={event => {
            if (!event.key.startsWith("Arrow")) return; event.preventDefault(); event.stopPropagation(); const increment = event.shiftKey ? 10 : 1;
            onFrames({ [component.id]: { ...frame, width: Math.max(160, frame.width + (event.key === "ArrowRight" ? increment : event.key === "ArrowLeft" ? -increment : 0)), height: Math.max(100, frame.height + (event.key === "ArrowDown" ? increment : event.key === "ArrowUp" ? -increment : 0)) } });
          }} />}
        </div>;
      })}
      {marquee && <div className="selection-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}
    </div>
    <div className="canvas-tools" data-canvas-ui="true" role="toolbar" aria-label={copy(locale, "캔버스 도구", "Canvas tools")}>
      <IconButton icon="cursor" label={copy(locale, "선택 (V)", "Select (V)")} aria-pressed={tool === "select"} className={tool === "select" ? "active" : ""} onClick={() => setTool("select")} />
      <IconButton icon="hand" label={copy(locale, "이동 (H / Space)", "Pan (H / Space)")} aria-pressed={tool === "hand"} className={tool === "hand" ? "active" : ""} onClick={() => setTool("hand")} />
      <span className="toolbar-divider" />
      <IconButton icon="grid" label={copy(locale, "격자 표시", "Show grid")} aria-pressed={grid} onClick={() => setGrid(value => !value)} />
      <button type="button" className={`tool-text ${snapping ? "active" : ""}`} aria-pressed={snapping} onClick={() => setSnapping(value => !value)}>{copy(locale, "스냅", "Snap")}</button>
    </div>
    {selectedIds.length > 1 && mode === "edit" && <div className="canvas-alignment" data-canvas-ui="true" role="toolbar" aria-label={copy(locale, "선택 정렬", "Align selection")}><Select aria-label={copy(locale, "정렬과 분배", "Align and distribute")} data-testid="canvas-align" defaultValue="" disabled={disabled} onChange={event => {
      const operation = event.target.value, ids = selectedIds.filter(id => frames[id]), bounds = unionBounds(ids.map(id => frames[id]!));
      if (!bounds || !operation) return;
      const ordered = [...ids].sort((a, b) => operation === "distribute-y" ? frames[a]!.y - frames[b]!.y : frames[a]!.x - frames[b]!.x);
      const horizontalGap = (bounds.width - ids.reduce((sum, id) => sum + frames[id]!.width, 0)) / Math.max(1, ids.length - 1), verticalGap = (bounds.height - ids.reduce((sum, id) => sum + frames[id]!.height, 0)) / Math.max(1, ids.length - 1);
      let cursor = operation === "distribute-y" ? bounds.y : bounds.x;
      onFrames(Object.fromEntries(ordered.map(id => { const frame = frames[id]!, next = { ...frame };
        if (operation === "left") next.x = bounds.x; else if (operation === "center") next.x = bounds.x + (bounds.width - frame.width) / 2; else if (operation === "right") next.x = bounds.x + bounds.width - frame.width;
        else if (operation === "top") next.y = bounds.y; else if (operation === "middle") next.y = bounds.y + (bounds.height - frame.height) / 2; else if (operation === "bottom") next.y = bounds.y + bounds.height - frame.height;
        else if (operation === "distribute-x") { next.x = cursor; cursor += frame.width + horizontalGap; } else if (operation === "distribute-y") { next.y = cursor; cursor += frame.height + verticalGap; }
        return [id, next]; })));
      event.target.value = "";
    }}><option value="">{copy(locale, "정렬과 분배…", "Align and distribute…")}</option>{[["left", "왼쪽", "Left"], ["center", "가로 가운데", "Horizontal center"], ["right", "오른쪽", "Right"], ["top", "위", "Top"], ["middle", "세로 가운데", "Vertical center"], ["bottom", "아래", "Bottom"], ["distribute-x", "가로 간격 균등", "Distribute horizontally"], ["distribute-y", "세로 간격 균등", "Distribute vertically"]].map(([value, ko, en]) => <option key={value} value={value} disabled={value!.startsWith("distribute") && selectedIds.length < 3}>{copy(locale, ko!, en!)}</option>)}</Select><span className="badge">{selectedIds.length}</span></div>}
    <div className="canvas-zoom" data-canvas-ui="true" role="toolbar" aria-label={copy(locale, "확대와 축소", "Zoom controls")}>
      <IconButton icon="minus" data-testid="zoom-out" label={copy(locale, "축소", "Zoom out")} onClick={() => zoom(view.zoom / 1.2)} />
      <label className="zoom-field"><input data-testid="zoom-level" aria-label={copy(locale, "확대 비율 (%)", "Zoom percentage")} inputMode="numeric" value={zoomDraft} onChange={event => setZoomDraft(event.target.value)} onBlur={() => { const value = Number(zoomDraft); if (zoomDraft.trim() && Number.isFinite(value)) zoom(clampZoom(value / 100)); else setZoomDraft(String(Math.round(view.zoom * 100))); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><span>%</span></label>
      <IconButton icon="plus" data-testid="zoom-in" label={copy(locale, "확대", "Zoom in")} onClick={() => zoom(view.zoom * 1.2)} />
      <span className="toolbar-divider" /><IconButton icon="fit" data-testid="zoom-fit" label={copy(locale, "전체 보기 (Shift 1)", "Zoom to fit (Shift 1)")} onClick={() => fit()} /><IconButton icon="component" data-testid="zoom-selection" label={copy(locale, "선택에 맞추기 (Shift 2)", "Zoom to selection (Shift 2)")} disabled={!selectedIds.length} onClick={() => fit(true)} />
    </div>
    <span className="canvas-hint" data-canvas-ui="true">{copy(locale, "Space로 이동 · Ctrl/⌘ + 휠로 확대", "Space to pan · Ctrl/⌘ + scroll to zoom")}</span>
  </div>;
}
