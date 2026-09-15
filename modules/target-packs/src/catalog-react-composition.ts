import type { StudioComponent } from "../../ads-core/src/index.ts";
import { componentSymbol } from "./generator-input.ts";
import { callbackName } from "./catalog-source-types.ts";
import { TargetError } from "./target-error.ts";
import { TARGET_CODE } from "./constants.ts";

/** The parent owns instance state and forwards declared requests; source components remain controlled. */
export function catalogReactComposition(owner: StudioComponent, components: StudioComponent[]): { hooks: string; render(partId: string): string } {
  const outputs = new Map<string, string[]>(); let hooks = "";
  for (const [index, instance] of (owner.instances ?? []).entries()) {
    const source = components.find(item => item.id === instance.componentRef.id);
    if (!source?.catalog || instance.status !== "current") throw new TargetError(TARGET_CODE.UNSUPPORTED, "Review stale or missing instance source versions before exporting.", owner.id);
    const name = componentSymbol(source), state = `instance${index}Values`, setter = `setInstance${index}Values`;
    const initial = Object.fromEntries(source.catalog.values.filter(port => port.ownership === "consumer").map(port => [String(port.name), Object.hasOwn(instance.values, String(port.id)) ? instance.values[String(port.id)] : port.defaultValue]));
    hooks += `const [${state},${setter}]=React.useState<Partial<${name}Props>>(${JSON.stringify(initial)});\n`;
    const content = source.catalog.slots.map(slot => `${String(source.parts.find(part => part.id === slot.ownerPartRef)!.role)}={${JSON.stringify(instance.slotContents[String(slot.id)] ?? "")}}`).join(" ");
    const events = source.catalog.events.map(event => {
      const value = source.catalog!.values.find(port => port.requestEventRef === event.id && port.ownership === "consumer");
      return `${callbackName(String(event.name))}={request=>{${value ? `${setter}(before=>({...before,${JSON.stringify(String(value.name))}:request.value}));` : ""}props.onInstanceEvent?.({instanceId:${JSON.stringify(instance.id)},event:${JSON.stringify(String(event.name))},payload:request});}}`;
    }).join(" ");
    const nestedEvents = source.instances?.length ? "onInstanceEvent={event=>props.onInstanceEvent?.(event)}" : "";
    const element = `<${name} {...${state}} ${content} ${events} ${nestedEvents}/>`;
    const entries = outputs.get(instance.ownerPartRef) ?? []; entries.push(element); outputs.set(instance.ownerPartRef, entries);
  }
  return { hooks, render: partId => (outputs.get(partId) ?? []).join("") };
}
