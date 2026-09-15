import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { getStudioCatalogEntry, studioCatalogPresentation } from "../../../modules/ads-core/src/index.ts";
import type { StudioComponent, StudioCategory } from "../../../modules/ads-core/src/index.ts";
import { CatalogChartDrawing } from "./catalog-vector.tsx";
import { CatalogThumbnail } from "./catalog-thumbnail.tsx";
import type { Locale } from "./locales.ts";

interface PartProps { "data-part-id": string | undefined; "data-testid": string; className: string; style: CSSProperties }

/** Source-backed design composition. It intentionally has no pretend date/chart/editor runtime. */
export function CatalogStructurePreview({ component, category, locale, partProps, renderAuthoredPart, renderInstances }: { component: StudioComponent; category: StudioCategory; locale: Locale; partProps(role: string): PartProps; renderAuthoredPart?(partId: string): ReactNode; renderInstances?(partId: string): ReactNode }) {
  const unique = useId(), entry = getStudioCatalogEntry(component.catalog!.catalogId)!, presentation = studioCatalogPresentation(entry, component.catalog!.semantic.kind);
  const design = category === "Web" ? component.web : component.mobile, root = component.parts.find(part => part.role === "root")!;
  const byRole = (role: string) => component.parts.find(part => part.role === role);
  const image = (text: string): ReactNode => <svg className="catalog-structure-image" viewBox="0 0 200 112" role="img" aria-label={text} fill="none"><rect width="200" height="112" rx="4" fill="currentColor" opacity=".07" /><circle cx="146" cy="29" r="11" fill="currentColor" opacity=".2" /><path d="m0 106 57-61 42 39 26-27 75 49" fill="currentColor" opacity=".15" /></svg>;
  const render = (partId: string): ReactNode => {
    const part = component.parts.find(item => item.id === partId); if (!part) return null;
    if (part.elementKind && renderAuthoredPart) return renderAuthoredPart(partId);
    const attrs = partProps(part.role), childIds = design.layout[part.id]?.childOrder ?? component.parts.filter(item => item.parent === part.id).map(item => item.id);
    const layout = design.layout[part.id], role = part.role, shape = presentation.shape;
    const style: CSSProperties = { ...attrs.style, ...(childIds.length ? { display: "flex", flexDirection: layout?.axis === "horizontal" ? "row" : "column" } : {}) };
    const className = `${attrs.className} catalog-structure-part`;
    const common = { ...attrs, style, className, "data-structure-part": role };
    // Every drawable series remains a real selectable source part; data sample comes from its text.
    if (role === "plot" && entry.familyIds.includes("axiom.family/chart")) {
      const series = byRole("series"), seriesProps = partProps("series"), sample = series?.text?.split(",").map(value => Number(value.trim())).filter(Number.isFinite);
      const sourceColor = seriesProps.style.color;
      return <div key={part.id} {...common}><svg viewBox="0 0 200 112" className="catalog-structure-chart" role="img" aria-labelledby={`${unique}-chart-title`} fill="none" stroke="currentColor" strokeWidth="1.2"><title id={`${unique}-chart-title`}>{`${component.name} · ${series?.text ?? "Sample data"}`}</title><g data-part-id={series?.id} data-testid={seriesProps["data-testid"]} className={seriesProps.className} style={{ ...seriesProps.style, ...(sourceColor ? { "--accent": sourceColor } : {}) } as CSSProperties}><CatalogChartDrawing shape={shape} {...(sample?.length ? { values: sample } : {})} /></g></svg>{byRole("axis") && <div {...partProps("axis")} className={`${partProps("axis").className} catalog-chart-axis`}>{byRole("axis")!.text}</div>}</div>;
    }
    if (role === "color_area") return <div key={part.id} {...common}><span className={shape === "color-wheel" ? "catalog-color-wheel" : "catalog-color-area"} style={attrs.style.background ? { background: attrs.style.background } : undefined}><i /></span></div>;
    if (role === "color_track") return <div key={part.id} {...common}><span className={`catalog-color-track ${presentation.variant === "alphaslider" ? "alpha" : ""}`}><i /></span></div>;
    if (role.startsWith("swatch_")) return <div key={part.id} {...common}><span className="catalog-color-swatch" style={{ background: attrs.style.background ?? ["#8dfc52", "#38bdf8", "#818cf8", "#fb7185", "#facc15"][Math.max(0, Number(role.split("_")[1]) - 1)] }} /></div>;
    if (role === "dial") return <div key={part.id} {...common}><svg viewBox="0 0 100 100" className="catalog-angle-dial" aria-hidden="true"><circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" opacity=".2" strokeWidth="2" /><path d="m50 50 28-28" stroke="currentColor" strokeWidth="3" /><circle cx="78" cy="22" r="5" fill="currentColor" /></svg></div>;
    if (["image", "slide"].includes(role)) return <div key={part.id} {...common}>{shape === "theme-icon" ? <span className="catalog-theme-icon">{part.text}</span> : <>{image(part.text ?? component.name)}{shape === "aspect-ratio" && <span className="catalog-image-label">{part.text}</span>}</>}</div>;
    if (role === "editor") return <div key={part.id} {...common}><pre className={shape === "code-editor" ? "catalog-code-content" : "catalog-rich-content"}>{part.text}</pre></div>;
    if (role === "input" || role === "search" || role.startsWith("digit_")) return <div key={part.id} {...common}><span className="catalog-structure-input">{part.text}</span></div>;
    if (role === "calendar_header") return <div key={part.id} {...common}>{childIds.map(render)}</div>;
    if (role === "weekdays") return <div key={part.id} {...common} className={`${className} catalog-weekdays`}>{part.text?.trim().split(/\s+/).map((day, index) => <span key={index}>{day}</span>)}</div>;
    const text = part.text ?? (role === "body" && childIds.length === 0 ? component.sampleContent.body : undefined);
    return <div key={part.id} {...common}>{text !== undefined && <span className="catalog-structure-text">{text}</span>}{childIds.map(render)}{renderInstances?.(part.id)}</div>;
  };
  const authored = presentation.parts.length > 0 && presentation.parts.some(part => byRole(part.role));
  // Opening a legacy root/body document is read-only. Show its identity honestly, without inventing saved parts.
  if (!authored) return <div {...partProps("root")} className={`${partProps("root").className} catalog-legacy-structure`} data-structure-kind={presentation.shape}><CatalogThumbnail entry={entry} /><span {...partProps("body")}>{component.sampleContent.body}</span><p className="catalog-capability-note" data-testid="catalog-legacy-note">{locale === "ko" ? `이전 구조 · 라이브러리에서 ${entry.name}을 추가하면 최신 파트 구조를 만들 수 있습니다. 저장된 기존 초안은 유지됩니다.` : `Legacy structure · Add ${entry.name} from Library to create the current editable part blueprint. This saved draft is preserved.`}</p></div>;
  return <div className="catalog-structure" data-structure-kind={presentation.shape} data-structure-variant={presentation.variant}>{render(root.id)}</div>;
}
