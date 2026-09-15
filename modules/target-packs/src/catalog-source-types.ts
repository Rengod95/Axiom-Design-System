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
  const fields = catalog.values.filter(value => value.ownership === "consumer").map(value => `${String(value.name)}?: ${catalogTypeScript(value.type as unknown as TypeExpression)}`);
  fields.push(...catalog.events.map(event => `${callbackName(String(event.name))}: (request: ${catalogTypeScript(event.payloadType as unknown as TypeExpression)}) => void`));
  const slots = catalog.slots.map(slot => ({ name: component.parts.find(part => part.id === slot.ownerPartRef)!.role, required: slot.min !== 0 && !(component.instances ?? []).some(instance => instance.ownerPartRef === slot.ownerPartRef) }));
  const reservedBindings = new Set(["arguments", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "enum", "eval", "export", "extends", "false", "finally", "for", "function", "if", "implements", "import", "in", "instanceof", "interface", "let", "new", "null", "package", "private", "protected", "public", "return", "static", "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield"]);
  const occupied = new Set(["props", "id", "label", "description", "variant", "onInstanceEvent", "constructor", "toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", ...catalog.values.map(value => String(value.name)), ...catalog.events.map(event => callbackName(String(event.name)))]);
  for (const slot of slots) {
    if (occupied.has(slot.name) || reservedBindings.has(slot.name) || /^(?:axiom|(?:setInstance|instance)\d+Values$)/.test(slot.name) || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(slot.name)) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Content area name conflicts with a generated React API or binding; rename the element role before exporting.", component.id);
    occupied.add(slot.name);
  }
  if (component.instances?.length) fields.push("onInstanceEvent?: (event: { instanceId: string; event: string; payload: unknown }) => void");
  fields.push("label?: string", "description?: string", 'variant?: "filled" | "outlined"', ...slots.map(slot => `${slot.name}${slot.required ? "" : "?"}: React.ReactNode`));
  const defaults = catalogDefaults(component);
  const variables = Object.entries(defaults).filter(([key]) => catalog.values.find(value => value.name === key)?.ownership === "consumer").map(([key, value]) => `${key} = ${JSON.stringify(value)} as ${catalogTypeScript(catalog.values.find(item => item.name === key)!.type as unknown as TypeExpression)}`);
  variables.push(...catalog.events.map(event => callbackName(String(event.name))), `label = ${JSON.stringify(catalog.accessibility.label)}`, `description = ${JSON.stringify(catalog.accessibility.description)}`, `variant = ${JSON.stringify(component.defaults.variant)}`, ...slots.map(slot => slot.name));
  return { declaration: `export interface ${name}Props { ${fields.join("; ")} }`, destructure: `const { ${variables.join(", ")} } = props;` };
}
