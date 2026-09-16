import type { ReferenceEdits } from "./reference-protocol.ts";
import type { StudioLayout, StudioPart, StudioStyle } from "../../../modules/ads-core/src/index.ts";

const ROLES: Readonly<Record<string, string>> = {
  trigger: '[data-slot$="trigger"], [class*="-control"], button[aria-expanded], button',
  input: 'input:not([type="hidden"]),textarea,[contenteditable="true"]', control: '[role="switch"],[role="checkbox"],input:not([type="hidden"]),button',
  label: '[data-slot$="label"],label,[class*="-label"]', title: '[data-slot$="title"],h1,h2,h3', header: '[data-slot$="header"],header',
  body: '[data-slot$="content"],[data-slot$="body"],[class*="-content"],article', content: '[data-slot$="content"],[class*="-content"]',
  description: '[data-slot$="description"],[class*="-description"],p', close: '[data-slot$="close"],button[aria-label*="Close"]',
  actions: '[data-slot$="footer"],footer,[class*="-actions"]', list: '[role="tablist"],[role="listbox"],ul,ol',
  item: '[role="tab"],[role="option"],li,[data-slot$="item"]', track: '[data-slot$="track"],[class*="-track"]', thumb: '[role="slider"],[data-slot$="thumb"],[class*="-thumb"]',
  indicator: '[data-slot$="indicator"],[class*="-indicator"]', icon: 'svg', value: 'output,[data-slot$="value"]',
};
const STYLE_KEYS = new Set(["background", "color", "borderColor", "borderWidth", "borderRadius", "fontSize", "opacity", "fontFamily", "fontWeight", "lineHeight", "letterSpacing", "boxShadow", "backgroundImage", "borderStyle", "transitionDelay", "transitionDuration", "transitionTimingFunction"]);
const UNITLESS = new Set(["opacity", "fontWeight", "lineHeight"]);
const TAGS = new Set(["div", "section", "article", "header", "footer", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "code"]);
function applyStyle(element: HTMLElement, style: StudioStyle): void {
  for (const [key, value] of Object.entries(style)) if (STYLE_KEYS.has(key) && (typeof value === "string" || typeof value === "number")) element.style.setProperty(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), typeof value === "number" && !UNITLESS.has(key) ? `${value}px` : String(value));
  if (style.borderWidth !== undefined && style.borderStyle === undefined) element.style.borderStyle = "solid";
}
function applyLayout(element: HTMLElement, layout: StudioLayout, fields: readonly string[], freeParent = false): void {
  for (const field of fields) {
    if (field === "gap" || field === "padding" || field === "minHeight") element.style[field] = `${layout[field]}px`;
    if (field === "axis") { element.style.display = "flex"; element.style.flexDirection = layout.axis === "horizontal" ? "row" : "column"; }
    if (field === "alignment") element.style.alignItems = layout.alignment === "start" ? "flex-start" : layout.alignment === "end" ? "flex-end" : layout.alignment ?? "";
    if (field === "width" || field === "height") { const value = layout[field]; element.style[field] = value?.mode === "fixed" ? `${value.value}px` : value?.mode === "fill" ? "100%" : "fit-content"; }
    if (field === "mode") element.style.position = layout.mode === "free" ? "relative" : "";
    if (field === "position" && layout.position && freeParent) { element.style.position = "absolute"; element.style.left = `${layout.position.x}px`; element.style.top = `${layout.position.y}px`; }
  }
}
/** Match trusted provider anatomy, preserving the original React tree and all unedited CSS. */
export function applyReferenceEdits(host: HTMLElement, { component, design }: ReferenceEdits): () => void {
  if (!Array.isArray(component.parts) || component.parts.length > 64 || !design.parts || !design.layout) return () => {};
  const original = new Map<HTMLElement, { style: string | null }>(), textNodes = new Map<Node, string>(), generated: HTMLElement[] = [], mapped = new Map<string, HTMLElement>();
  const content = host.querySelector<HTMLElement>('[data-slot]:not(style),[class*="mantine-"][class*="-root"],.react-aria-Button,.react-aria-TextField') ?? [...host.children].find(node => node instanceof HTMLElement && !["STYLE", "SCRIPT"].includes(node.tagName)) as HTMLElement | undefined;
  if (!content) return () => {};
  const bind = (part: StudioPart, element: HTMLElement) => { if (!original.has(element)) original.set(element, { style: element.getAttribute("style") }); element.dataset.referencePart = part.id; mapped.set(part.id, element); };
  const parts = component.parts.filter(part => !part.elementKind), rootPart = parts.find(part => part.parent === null);
  if (rootPart) bind(rootPart, content);
  for (const part of parts.filter(part => part !== rootPart)) {
    const selector = ROLES[part.role];
    let element = document.body.querySelector<HTMLElement>(`[data-slot="${part.role.replace(/[^a-z0-9_-]/gi, "")}"]`);
    if (!element && selector) element = (mapped.get(part.parent ?? "") ?? host).querySelector<HTMLElement>(selector) ?? document.body.querySelector<HTMLElement>(selector);
    if (element && ![...mapped.values()].includes(element)) bind(part, element);
  }
  for (const part of component.parts.filter(part => part.elementKind)) {
    const parent = mapped.get(part.parent ?? ""); if (!parent || ["INPUT", "IMG", "TEXTAREA", "SELECT", "SVG"].includes(parent.tagName)) continue;
    const tag = design.elements?.[part.id] ?? (part.elementKind === "text" ? "span" : "div"); if (!TAGS.has(tag)) continue;
    const element = document.createElement(tag); element.textContent = part.text ?? ""; parent.append(element); generated.push(element); bind(part, element);
  }
  for (const part of component.parts) {
    const element = mapped.get(part.id); if (!element) continue;
    const presentation = design.parts[part.id], state = `${component.defaults.variant}${component.defaults.disabled ? "-disabled" : ""}` as keyof NonNullable<typeof presentation>["combinations"];
    if (presentation) applyStyle(element, presentation.combinations[state] ?? presentation.base);
    const layout = design.layout[part.id];
    if (layout) applyLayout(element, layout, part.elementKind ? ["gap", "padding", "minHeight", "axis", "width", "height", "alignment", "mode", "position"] : design.referenceLayout?.[part.id] ?? [], Boolean(part.parent && design.layout[part.parent]?.mode === "free"));
    if (part.text !== undefined && !part.elementKind) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, { acceptNode: node => node.textContent?.trim() && node.parentElement?.closest("[data-reference-part]") === element && !node.parentElement?.closest("svg,style,script") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
      const text = walker.nextNode();
      if (text) { if (!textNodes.has(text)) textNodes.set(text, text.textContent ?? ""); text.textContent = part.text; }
    }
  }
  return () => { for (const [node, text] of textNodes) node.textContent = text; for (const element of generated) element.remove(); for (const [element, previous] of original) { delete element.dataset.referencePart; if (previous.style === null) element.removeAttribute("style"); else element.setAttribute("style", previous.style); } };
}
