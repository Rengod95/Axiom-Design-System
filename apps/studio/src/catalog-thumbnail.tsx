import { useId } from "react";
import { getStudioCatalogRecipe } from "../../../modules/ads-core/src/index.ts";
import type { StudioCatalogEntry } from "../../../modules/ads-core/src/index.ts";

/** Fixed, authored vector specimens: no live controls, external image fetch or mutable preview state. */
export function CatalogThumbnail({ entry }: { entry: StudioCatalogEntry }) {
  const title = useId(), kind = getStudioCatalogRecipe(entry.id)?.semantic.kind, name = entry.name.toLowerCase();
  const box = (x: number, y: number, width: number, height: number, radius = 4, fill = "var(--surface)") => <rect x={x} y={y} width={width} height={height} rx={radius} fill={fill} />;
  const line = (x: number, y: number, width: number) => <path d={`M${x} ${y}h${width}`} />;
  const label = (x: number, y: number, text: string, size = 10) => <text x={x} y={y} fontSize={size} fill="var(--ink-secondary)" stroke="none" fontFamily="var(--font-ui)">{text}</text>;
  let drawing;
  if (/calendar|date|month|year/.test(name)) drawing = <>{box(45, 12, 110, 88)}{line(45, 34, 110)}{label(60, 27, "September")}{Array.from({ length: 28 }, (_, i) => <rect key={i} x={55 + i % 7 * 13} y={43 + Math.floor(i / 7) * 12} width={7} height={5} rx={1} fill={i === 12 ? "var(--accent)" : "var(--line-strong)"} stroke="none" />)}</>;
  else if (/chart|sparkline/.test(name)) drawing = <>{line(35, 91, 130)}<path d="M35 20v71" />{/bar/.test(name) ? [28, 52, 40, 66, 50].map((height, i) => <rect key={i} x={47 + i * 22} y={90 - height} width={12} height={height} rx={2} fill="var(--accent)" stroke="none" />) : /pie|donut/.test(name) ? <><circle cx="102" cy="54" r="30" strokeWidth="14" stroke="var(--line-strong)" /><path d="M102 24a30 30 0 0 1 30 30" stroke="var(--accent)" strokeWidth="14" /></> : <path d="m42 76 24-24 25 8 25-32 38 10" stroke="var(--accent)" strokeWidth="3" />}</>;
  else switch (kind) {
    case "button": drawing = <>{box(52, 36, 96, 36, 7, "var(--accent-soft)")}{label(76, 58, "Continue")}</>; break;
    case "checkbox": case "radio": case "switch": case "toggle": drawing = <>{kind === "switch" ? <>{box(40, 44, 38, 22, 11, "var(--accent)")}<circle cx="67" cy="55" r="7" fill="var(--surface)" stroke="none" /></> : kind === "radio" ? <><circle cx="54" cy="55" r="10" /><circle cx="54" cy="55" r="5" fill="var(--accent)" stroke="none" /></> : <>{box(44, 45, 20, 20, 4, "var(--accent)")}<path d="m49 54 4 4 7-8" stroke="var(--surface)" /></>}{label(86, 59, "Option")}</>; break;
    case "text-input": case "textarea": case "number-input": case "combobox": case "token-choice": case "select": drawing = <>{label(30, 30, entry.name)}{box(30, 40, 140, kind === "textarea" ? 45 : 30)}{label(41, 59, kind === "number-input" ? "24" : "Choose a value")}{["select", "combobox"].includes(kind) && <path d="m151 52 5 5 5-5" />}{kind === "number-input" && <path d="M148 45v20m-6-10h12" />}</>; break;
    case "slider": case "range-slider": drawing = <>{line(28, 57, 144)}<path d="M28 57h88" stroke="var(--accent)" strokeWidth="4" /><circle cx="116" cy="57" r="7" fill="var(--surface)" />{kind === "range-slider" && <circle cx="60" cy="57" r="7" fill="var(--surface)" />}</>; break;
    case "progress": case "meter": case "loading": drawing = kind === "loading" ? <circle cx="100" cy="55" r="19" stroke="var(--accent)" strokeWidth="4" strokeDasharray="80 40" /> : <>{box(30, 49, 140, 12, 6, "var(--surface-hover)")}{box(30, 49, 88, 12, 6, "var(--accent)")}</>; break;
    case "tabs": case "navigation": drawing = <>{label(24, 35, "Overview")}{label(90, 35, "Activity")}{label(145, 35, "Files")}{line(22, 44, 155)}<path d="M24 44h48" stroke="var(--accent)" strokeWidth="2" />{line(25, 65, 128)}{line(25, 77, 95)}</>; break;
    case "dialog": case "popover": case "tooltip": case "toast": case "alert": drawing = <>{box(25, 20, 150, 72, 7)}{label(39, 41, entry.name)}{line(39, 53, 103)}{line(39, 63, 78)}{box(119, 73, 40, 10, 3, "var(--accent-soft)")}<path d="m157 30 6 6m0-6-6 6" /></>; break;
    case "menu": case "list": case "accordion": case "choice-group": drawing = <>{box(34, 15, 132, 84)}{[0, 1, 2].map(i => <g key={i}>{line(45, 37 + i * 24, 80)}{kind === "accordion" && <path d={`m145 ${32 + i * 24} 4 4 4-4`} />}{i < 2 && line(35, 46 + i * 24, 130)}</g>)}</>; break;
    case "table": drawing = <>{box(24, 20, 152, 73)}{box(25, 21, 150, 18, 0, "var(--surface-hover)")}{[39, 57, 75].map(y => <g key={y}>{line(24, y, 152)}</g>)}<path d="M75 20v73m50-73v73" />{label(33, 34, "Name", 8)}{label(84, 34, "Status", 8)}</>; break;
    case "avatar": case "image": drawing = kind === "avatar" ? <><circle cx="100" cy="55" r="28" fill="var(--accent-soft)" />{label(86, 61, "AX", 18)}</> : <>{box(35, 20, 130, 74)}<circle cx="128" cy="38" r="8" fill="var(--accent-soft)" /><path d="m39 85 39-40 26 23 18-16 39 33" /></>; break;
    case "badge": drawing = <>{box(58, 41, 84, 26, 13, "var(--accent-soft)")}{label(81, 58, "Active")}</>; break;
    case "rating": drawing = <>{[0, 1, 2, 3, 4].map(i => <path key={i} d={`m${47 + i * 26} 40 4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1Z`} fill={i < 3 ? "var(--accent)" : "var(--surface)"} stroke="var(--accent)" />)}</>; break;
    case "separator": drawing = <>{line(25, 55, 150)}</>; break;
    case "text": case "link": drawing = <>{label(30, 57, /heading|title/.test(name) ? "Heading" : /code/.test(name) ? "const value = 24" : "A clear line of text", /heading|title/.test(name) ? 22 : 14)}{kind === "link" && line(30, 63, 133)}</>; break;
    case "layout": case "surface": case "field": case "toolbar": drawing = <>{box(25, 17, 150, 80)}{/grid/.test(name) ? [0, 1, 2, 3, 4, 5].map(i => <g key={i}>{box(36 + i % 3 * 43, 29 + Math.floor(i / 3) * 29, 34, 20, 3, "var(--accent-soft)")}</g>) : /stack|group|flex|toolbar/.test(name) ? [0, 1, 2].map(i => <g key={i}>{box(37 + i * 43, 38, 33, 34, 3, "var(--accent-soft)")}</g>) : <>{label(39, 41, "A shared surface")}{line(39, 53, 100)}{line(39, 64, 76)}{box(40, 75, 43, 10, 3, "var(--accent-soft)")}</>}</>; break;
    default: drawing = <>{box(35, 22, 130, 67)}{label(47, 46, entry.name.slice(0, 20))}{line(47, 59, 88)}{line(47, 70, 65)}</>;
  }
  return <svg className="catalog-thumbnail" viewBox="0 0 200 112" role="img" aria-labelledby={title} fill="none" stroke="var(--line-strong)" strokeWidth="1.2"><title id={title}>{entry.name} · static structure preview</title>{drawing}</svg>;
}
