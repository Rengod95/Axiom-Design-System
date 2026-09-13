import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import type { StudioCategory, StudioComponent, StudioPart } from "../../../modules/ads-core/src/index.ts";
import { Icon } from "./icons.tsx";
import { translate } from "./locales.ts";
import type { Locale } from "./locales.ts";
import { closeActionSize, inheritPreviewText } from "./preview-style.ts";
import { CatalogPreview } from "./catalog-preview.tsx";

interface Props { components: StudioComponent[]; category: StudioCategory; mode: "edit" | "run"; selectedPart: string | null; onSelect(componentId: string, partId: string): void; locale: Locale }
const partFor = (component: StudioComponent, role: StudioPart["role"]): StudioPart | undefined => component.parts.find(part => part.role === role);

function ComponentPreview({ component, category, mode, selectedPart, onSelect, locale }: Omit<Props, "components"> & { component: StudioComponent }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [activations, setActivations] = useState(0), [requests, setRequests] = useState(0), [disabled, setDisabled] = useState(component.defaults.disabled), [open, setOpen] = useState(component.defaults.open), [decline, setDecline] = useState(false), [present, setPresent] = useState(component.defaults.open);
  const [pressed, setPressed] = useState(false);
  const reopen = useRef<HTMLButtonElement>(null);
  const cleanup = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setDisabled(component.defaults.disabled); setOpen(component.defaults.open); setPresent(component.defaults.open); setActivations(0); setRequests(0); return () => clearTimeout(cleanup.current); }, [component.id, mode]);
  useEffect(() => {
    clearTimeout(cleanup.current);
    if (open) { setPresent(true); return; }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    cleanup.current = setTimeout(() => setPresent(false), reduced ? component.motion.reducedDurationMs : Math.min(component.motion.durationMs, component.motion.cleanupMs));
    return () => clearTimeout(cleanup.current);
  }, [open, component.motion.durationMs, component.motion.cleanupMs, component.motion.reducedDurationMs]);
  const design = category === "Web" ? component.web : component.mobile;
  const root = partFor(component, "root"), layout = root ? design.layout[root.id] : undefined;
  const selected = (role: StudioPart["role"]) => selectedPart === partFor(component, role)?.id;
  const attrs = (role: StudioPart["role"]) => ({ "data-part-id": partFor(component, role)?.id, "data-testid": `preview-part-${partFor(component, role)?.id}`, className: `selectable-part ${selected(role) ? "selected-part" : ""}` });
  const style = (role: StudioPart["role"]): CSSProperties => {
    const part = partFor(component, role), presentation = part ? design.parts[part.id] : undefined;
    if (!presentation) return {};
    const key = `${component.defaults.variant}${disabled ? "-disabled" : pressed ? "-pressed" : ""}` as keyof typeof presentation.combinations;
    const layout = part ? design.layout[part.id] : undefined;
    const inherited = inheritPreviewText(root ? design.parts[root.id]?.combinations[key] ?? {} : {}, presentation.combinations[key]);
    return { ...inherited, ...(layout ? { display: "flex", flexDirection: layout.axis === "horizontal" ? "row" : "column", padding: layout.padding, gap: layout.gap, minHeight: layout.minHeight } : {}), ...(role === "close" ? closeActionSize(category, layout?.minHeight) : {}) };
  };
  const rootStyle: CSSProperties = { ...style("root"), ...(layout ? { display: component.archetype === "button" ? "inline-flex" : "flex", flexDirection: layout.axis === "horizontal" ? "row" : "column", padding: layout.padding, gap: layout.gap, minHeight: layout.minHeight } : {}) };
  const select = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== "edit") return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-part-id]") : null;
    const id = target?.dataset.partId ?? root?.id;
    if (id) { event.preventDefault(); onSelect(component.id, id); }
  };
  const requestClose = () => { setRequests(value => value + 1); if (!decline) { setOpen(false); reopen.current?.focus(); } };
  const ordered = (nodes: Partial<Record<StudioPart["role"], ReactNode>>) => {
    const roles = Object.keys(nodes) as StudioPart["role"][];
    return roles.sort((a, b) => (layout?.childOrder.indexOf(partFor(component, a)?.id ?? "") ?? 0) - (layout?.childOrder.indexOf(partFor(component, b)?.id ?? "") ?? 0)).map(role => nodes[role]);
  };
  return <section className="preview-section" aria-label={component.name} data-testid={`preview-${component.id}`}>
    <div className={`component-root ${mode === "edit" ? "edit-surface" : ""}`} onPointerDown={select}>
      {component.archetype === "button" && <button {...attrs("root")} className={`sample-button ${attrs("root").className}`} style={{ ...rootStyle, opacity: rootStyle.opacity ?? 1 }} disabled={mode === "run" && disabled} tabIndex={mode === "edit" ? -1 : 0} onPointerDown={() => { if (mode === "run" && !disabled) setPressed(true); }} onPointerUp={() => setPressed(false)} onPointerCancel={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onBlur={() => setPressed(false)} onKeyDown={event => { if (mode === "run" && (event.key === " " || event.key === "Enter")) setPressed(true); }} onKeyUp={() => setPressed(false)} onClick={event => { if (mode === "edit") { event.preventDefault(); return; } setActivations(value => value + 1); }} data-testid="runtime-button"><span {...attrs("label")} style={style("label")}>{component.sampleContent.label}</span></button>}
      {component.archetype === "card" && <article {...attrs("root")} className={`sample-card ${attrs("root").className}`} style={rootStyle}>
        {ordered({ header: <h2 key="header" {...attrs("header")} style={style("header")}>{component.sampleContent.title}</h2>, body: <p key="body" {...attrs("body")} style={style("body")}>{component.sampleContent.body}</p>, actions: component.sampleContent.actionLabel ? <div key="actions" {...attrs("actions")} style={style("actions")}><button className="button secondary" style={{ color: "inherit", fontSize: "inherit", background: "transparent", borderColor: "currentColor" }} tabIndex={mode === "edit" ? -1 : 0} onClick={event => { if (mode === "edit") event.preventDefault(); else setActivations(value => value + 1); }}>{component.sampleContent.actionLabel}</button></div> : null })}
      </article>}
      {component.archetype === "toast" && (present || mode === "edit") && <div {...attrs("root")} className={`sample-toast ${attrs("root").className}`} style={{ ...rootStyle, opacity: mode === "run" && !open ? 0 : rootStyle.opacity ?? 1, transition: `opacity ${component.motion.durationMs}ms` }}>
        {ordered({ body: <span key="body" {...attrs("body")} className={`toast-copy ${attrs("body").className}`} style={style("body")} role={mode === "run" && open ? "status" : undefined}>{component.sampleContent.body}</span>, close: <button key="close" {...attrs("close")} className={`toast-close ${attrs("close").className}`} style={style("close")} aria-label={component.sampleContent.closeLabel} disabled={mode === "run" && !open} tabIndex={mode === "edit" ? -1 : 0} onClick={event => { if (mode === "edit") event.preventDefault(); else requestClose(); }} data-testid="runtime-toast-close"><Icon name="close" size={13} /></button> })}
      </div>}
    </div>
    {mode === "run" && <div className="run-controls"><span>{t("sampleOnly")}</span>
      {component.archetype === "button" && <><label className="switch-row"><input type="checkbox" checked={disabled} onChange={event => setDisabled(event.target.checked)} />{t("disabled")}</label><p className="help">{t("activationCount")}: <output data-testid="activation-count">{activations}</output></p></>}
      {component.archetype === "toast" && <><div className="property-row"><label htmlFor={`${component.id}-close-response`}>{t("closeResponse")}</label><select id={`${component.id}-close-response`} className="tiny-select" value={decline ? "decline" : "accept"} onChange={event => setDecline(event.target.value === "decline")}><option value="accept">{t("accept")}</option><option value="decline">{t("decline")}</option></select></div><button ref={reopen} className="button secondary" data-testid="runtime-toast-show" onClick={() => setOpen(true)}>{t("showToast")}</button><p className="help">{t("closeRequests")}: <output data-testid="close-request-count">{requests}</output></p></>}
      {component.archetype === "card" && <p className="help">{t("activationCount")}: {activations}</p>}
    </div>}
  </section>;
}

export function Preview(props: Props) { return <div className="preview-surface" data-testid="preview-surface">{props.components.map(component => component.catalog ? <CatalogPreview key={component.id} {...props} component={component} /> : <ComponentPreview key={component.id} {...props} component={component} />)}</div>; }
