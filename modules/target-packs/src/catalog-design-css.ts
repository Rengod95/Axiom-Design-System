import type { StudioComponent } from "../../ads-core/src/index.ts";
import { componentSymbol } from "./generator-input.ts";

/** Native HTML affordances accompany authored paint, without importing the Studio stylesheet. */
export function catalogDesignCss(component: StudioComponent): string {
  if (!component.catalog) return "";
  const selector = `.${componentSymbol(component)}`, kind = component.catalog.semantic.kind;
  const rules = [
    `${selector},${selector} *{box-sizing:border-box}`,
    `${selector}:is(button,input,textarea,select),${selector} :is(button,input,textarea,select){font:inherit;color:inherit}`,
    `${selector}:is(button,input,textarea,select):focus-visible,${selector} :is(button,input,textarea,select):focus-visible{outline:2px solid currentColor;outline-offset:3px}`,
    `${selector} :is(input,textarea)::placeholder{color:inherit;opacity:.65}`,
    `${selector}:is(button),${selector} button{cursor:pointer;justify-content:center}`,
    `${selector}:disabled,${selector} :disabled{cursor:not-allowed}`,
    `${selector} :is(input[type=checkbox],input[type=radio]){accent-color:currentColor;margin:0;flex:none;width:18px;height:18px}`,
  ];
  if (kind === "tabs") rules.push(`${selector} [role=tablist]{flex-wrap:wrap}`, `${selector} [role=tab][aria-selected=true]{background:color-mix(in srgb,currentColor 12%,transparent)}`, `${selector} [role=tab]:not(:focus-visible){outline:none}`);
  if (kind === "checkbox" || kind === "radio" || kind === "switch") rules.push(`${selector}{align-items:center}`);
  return rules.join("\n");
}
