import type { JsonValue, StudioComponent, TypeExpression } from "../../ads-core/src/index.ts";
import { TARGET_CODE } from "./constants.ts";
import { TargetError } from "./target-error.ts";

/** Derive consumer TypeScript APIs from the same closed ADS TypeExpr declarations. */
export function catalogTypeScript(type: TypeExpression): string {
  switch (type.kind) {
    case "string": case "number": case "boolean": return type.kind;
    case "enum": return type.values.map(value => JSON.stringify(value)).join(" | ");
    case "nullable": return `(${catalogTypeScript(type.inner)} | null)`;
    case "list": return `Array<${catalogTypeScript(type.items)}>`;
    case "record": return `{ ${Object.entries(type.fields).map(([name, field]) => `${JSON.stringify(name)}${type.required.includes(name) ? "" : "?"}: ${catalogTypeScript(field)}`).join("; ")} }`;
  }
}
export function callbackName(name: string): string { return `on${name.charAt(0).toUpperCase()}${name.slice(1)}`; }
export function catalogDefaults(component: StudioComponent): Record<string, JsonValue> { return Object.fromEntries(component.catalog!.values.map(value => [String(value.name), value.defaultValue!])); }
export function catalogProps(component: StudioComponent, name: string): { declaration: string; destructure: string } {
  const catalog = component.catalog!;
  for (const value of catalog.values) if (["label", "description", "variant", "body", "header", "actions", "panel", "content", "children"].includes(String(value.name))) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Public value conflicts with a catalog content API name", component.id);
  const fields = catalog.values.map(value => `${String(value.name)}?: ${catalogTypeScript(value.type as unknown as TypeExpression)}`);
  fields.push(...catalog.events.map(event => `${callbackName(String(event.name))}: (request: ${catalogTypeScript(event.payloadType as unknown as TypeExpression)}) => void`));
  const slots = catalog.slots.map(slot => ({ name: component.parts.find(part => part.id === slot.ownerPartRef)!.role, required: slot.min !== 0 }));
  fields.push("label?: string", "description?: string", 'variant?: "filled" | "outlined"', ...slots.map(slot => `${slot.name}${slot.required ? "" : "?"}: React.ReactNode`));
  const defaults = catalogDefaults(component);
  const variables = Object.entries(defaults).map(([key, value]) => `${key} = ${JSON.stringify(value)} as ${catalogTypeScript(catalog.values.find(item => item.name === key)!.type as unknown as TypeExpression)}`);
  variables.push(...catalog.events.map(event => callbackName(String(event.name))), `label = ${JSON.stringify(catalog.accessibility.label)}`, `description = ${JSON.stringify(catalog.accessibility.description)}`, `variant = ${JSON.stringify(component.defaults.variant)}`, ...slots.map(slot => slot.name));
  return { declaration: `export interface ${name}Props { ${fields.join("; ")} }`, destructure: `const { ${variables.join(", ")} } = props;` };
}
