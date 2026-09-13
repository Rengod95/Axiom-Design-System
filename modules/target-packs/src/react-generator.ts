import type { StudioComponent, StudioProjection } from "../../ads-core/src/index.ts";
import type { SourceFile } from "./contracts.ts";
import { componentSymbol } from "./generator-input.ts";
import { REACT_LIFECYCLE_SOURCE } from "./react-runtime.ts";
import { catalogReactComponent } from "./catalog-react-generator.ts";
import { CATALOG_REACT_RUNTIME } from "./catalog-react-runtime.ts";

const CSS_NAMES: Record<string, string> = { background: "background", color: "color", borderColor: "border-color", borderWidth: "border-width", borderRadius: "border-radius", fontSize: "font-size", opacity: "opacity", fontFamily: "font-family", fontWeight: "font-weight", lineHeight: "line-height", letterSpacing: "letter-spacing", boxShadow: "box-shadow", backgroundImage: "background-image", borderStyle: "border-style", transitionDelay: "transition-delay", transitionDuration: "transition-duration", transitionTimingFunction: "transition-timing-function" };

function cssRules(component: StudioComponent): string {
  const rules: string[] = []; const name = componentSymbol(component); const design = component.web;
  for (const part of component.parts) {
    const presentation = design.parts[part.id]!; const layout = design.layout[part.id];
    const selector = `.${name} [data-part=${JSON.stringify(part.id)}]`;
    const rootSelector = part.role === "root" ? `.${name}` : selector;
    const declarations = (style: typeof presentation.base) => Object.entries(style).map(([key, value]) => `${CSS_NAMES[key]}:${value}${typeof value === "number" && !["opacity", "fontWeight", "lineHeight"].includes(key) ? "px" : ""}`).join(";");
    rules.push(`${rootSelector}{box-sizing:border-box;border-style:solid;border-width:0;${declarations(presentation.base)};${part.role==="close"||part.role==="root"&&component.archetype==="button"?"min-width:44px;":""}${layout ? `display:flex;flex-direction:${layout.axis === "horizontal" ? "row" : "column"};gap:${layout.gap}px;padding:${layout.padding}px;min-height:${Math.max(part.role==="close"?44:0,layout.minHeight)}px;` : ""}}`);
    if (layout) {
      const size = (axis: "width" | "height"): string => { const policy = layout[axis]; return policy ? `${axis}:${policy.mode === "fixed" ? `${policy.value}px` : policy.mode === "fill" ? "100%" : "max-content"};` : ""; };
      rules.push(`${rootSelector}{${size("width")}${size("height")}${layout.alignment ? `align-items:${layout.alignment === "start" ? "flex-start" : layout.alignment === "end" ? "flex-end" : layout.alignment};` : ""}}`);
    }
    for (const [state, key] of [["[data-variant=filled]", "filled"], ["[data-variant=outlined]", "outlined"], ["[data-variant=filled][data-disabled=true]", "filled-disabled"], ["[data-variant=outlined][data-disabled=true]", "outlined-disabled"], ["[data-variant=filled]:active:not(:disabled)", "filled-pressed"], ["[data-variant=outlined]:active:not(:disabled)", "outlined-pressed"]] as const) rules.push(`.${name}${state}${part.role === "root" ? "" : ` [data-part=${JSON.stringify(part.id)}]`}{${declarations(presentation.combinations[key])}}`);
  }
  if (component.catalog) {
    rules.push(`.${name} [hidden]{display:none!important}`);
    if (component.catalog.semantic.kind === "table") {
      const root = component.parts.find(part => part.role === "root")!;
      rules.push(`table.${name}{display:table;border-collapse:separate;border-spacing:${design.layout[root.id]!.gap}px}table.${name} thead{display:table-header-group}table.${name} tbody{display:table-row-group}table.${name} tr{display:table-row}table.${name} td,table.${name} th{display:table-cell}`);
    }
  }
  return rules.join("\n");
}

function componentSource(component: StudioComponent): string {
  if (component.archetype === "catalog") return catalogReactComponent(component);
  const name = componentSymbol(component); const root = component.parts.find((part) => part.role === "root")!;
  const sample = JSON.stringify(component.sampleContent); const defaults = JSON.stringify(component.defaults);
  const ordered = component.web.layout[root.id]?.childOrder ?? component.parts.filter((part) => part.parent === root.id).map((part) => part.id);
  const child = (role: string) => component.parts.find((part) => part.role === role)?.id ?? root.id;
  const label = JSON.stringify(child("label"));
  if (component.archetype === "button") return `
const ${name}Defaults = ${defaults} as const;
/** Native button activation delegates UI intent exactly once to the consumer. */
export function ${name}({label = ${sample}.label, disabled = ${name}Defaults.disabled, variant = ${name}Defaults.variant, onActivate}: AxiomButtonProps) {
  return <button type="button" className=${JSON.stringify(name)} data-part=${JSON.stringify(root.id)} data-variant={variant} data-disabled={disabled} disabled={disabled} onClick={onActivate}><span data-part={${label}}>{label}</span></button>;
}
`;
  if (component.archetype === "card") return `
/** Plain content grouping; actions remain independently interactive children. */
export function ${name}({body, header, actions, variant = ${JSON.stringify(component.defaults.variant)}}: AxiomCardProps) {
  if(body==null) throw new Error("Axiom Card requires body content");
  return <section className=${JSON.stringify(name)} data-part=${JSON.stringify(root.id)} data-variant={variant}>{${JSON.stringify(ordered)}.map(id => id === ${JSON.stringify(child("body"))} ? <div key={id} data-part={id}>{body}</div> : id === ${JSON.stringify(child("header"))} ? header == null ? null : <div key={id} data-part={id}>{header}</div> : id === ${JSON.stringify(child("actions"))} ? actions == null ? null : <div key={id} data-part={id}>{actions}</div> : null)}</section>;
}
`;
  return `
/** Controlled notification; the host serializes announcements and close only requests consumer action. */
export function ${name}({open, message = ${sample}.body, closeLabel = ${sample}.closeLabel, onCloseRequest}: AxiomToastProps) {
  const reduced = useReducedMotion();
  const phase = usePresence(open, reduced ? ${component.motion.reducedDurationMs} : ${component.motion.durationMs}, ${component.motion.cleanupMs});
  const active = useHostEntry(phase !== "removed");
  if (!active || phase === "removed") return null;
  return <div className=${JSON.stringify(name)} data-part=${JSON.stringify(root.id)} data-presence={phase} style={{opacity: phase === "exiting" ? 0 : ${component.web.parts[root.id]!.combinations.filled.opacity??1}, transition: "opacity " + (reduced ? ${component.motion.reducedDurationMs} : ${component.motion.durationMs}) + "ms"}}><span role="status" aria-live="polite" aria-atomic="true" data-part=${JSON.stringify(child("body"))}>{message}</span><button type="button" aria-label={closeLabel} data-part=${JSON.stringify(child("close"))} onClick={onCloseRequest}>{closeLabel}</button></div>;
}
`;
}

/** Generate React/CSS source with native semantics and no dependency on the Studio runtime. */
export function generateReactSources(projection: StudioProjection): SourceFile[] {
  return [
    { path: "src/index.tsx", text: `// Generated from a validated ADS snapshot; see axiom.delivery.json for provenance.\nimport * as React from "react";\nexport { tokens, themeContexts } from "./tokens.js";\nexport interface AxiomButtonProps { label?: string; disabled?: boolean; variant?: "filled" | "outlined"; onActivate: () => void }\nexport interface AxiomCardProps { body: React.ReactNode; header?: React.ReactNode; actions?: React.ReactNode; variant?: "filled" | "outlined" }\nexport interface AxiomToastProps { open: boolean; message?: string; closeLabel?: string; onCloseRequest: () => void }\n${REACT_LIFECYCLE_SOURCE}\n${projection.components.some(component=>component.archetype==="catalog")?CATALOG_REACT_RUNTIME:""}\nfunction useReducedMotion() {\n const [reduced, setReduced] = React.useState(false);\n React.useEffect(() => { const query = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReduced(query.matches); update(); query.addEventListener("change",update); return () => query.removeEventListener("change",update); },[]); return reduced;\n}\n/** One explicit host owns queue order and announcement opportunity. */\nexport function AxiomToastHost({children}: {children: React.ReactNode}) { const host = useHostQueue(); return <HostContext.Provider value={host}><div data-axiom-toast-host="">{children}</div></HostContext.Provider>; }\n/** The generated fixed context is inherited without a service or account. */\nexport function AxiomThemeProvider({children}: {children: React.ReactNode}) { return <div className="axiom-theme">{children}</div>; }\n${projection.components.map(componentSource).join("\n")}` },
    { path: "src/styles.css", text: `/* Generated fixed theme; see axiom.delivery.json. */\n.axiom-theme{color-scheme:normal}\n.axiom-theme button{font:inherit}.axiom-theme button:focus-visible{outline:3px solid currentColor;outline-offset:3px}\n${projection.components.map(cssRules).join("\n")}\n` },
  ];
}
