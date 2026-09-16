import type { JsonObject, JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { StudioComponentPlan } from "./studio-catalog-contracts.ts";
import type { StudioInstance, StudioInstanceEdit } from "./studio-composition.ts";
import { studioInstances } from "./studio-composition.ts";
import { planStudioMutation } from "./studio-component-authoring.ts";
import { catalogObjects } from "./studio-catalog-validation.ts";
import { isObject } from "./documents.ts";

/** Instances own references and deltas, never copied component definitions. */
export function planStudioInstanceEdit(project: ProjectSnapshot, ownerId: string, edit: StudioInstanceEdit, createId: () => string): StudioComponentPlan {
  return planStudioMutation(project, { ownerId, edit }, createId, (context, options) => {
    const data = options.edit;
    if (typeof options.ownerId !== "string" || !isObject(data) || typeof data.kind !== "string") throw new Error("Choose a component and an instance action.");
    const fields: Record<string, string[]> = { insert: ["ownerPartRef", "slotRef", "sourceComponentId"], remove: ["instanceId"], refresh: ["instanceId"], value: ["instanceId", "valueId", "value", "reset"], content: ["instanceId", "slotId", "text"] };
    const allowed = fields[data.kind];
    if (!allowed || allowed.some(key => !Object.hasOwn(data, key)) || Object.keys(data).some(key => key !== "kind" && !allowed.includes(key))) throw new Error("Invalid instance action fields.");
    const owner = context.component(options.ownerId), instances = studioInstances(owner);
    const pin = (sourceId: string) => {
      const source = context.component(sourceId), designs = context.designs(sourceId);
      const web = designs.find(item => item.category === "Web")!, mobile = designs.find(item => item.category === "Mobile")!;
      if (!web || !mobile) throw new Error("The source must have both category designs.");
      return { componentRef: { id: source.id, revision: source.revision }, designRefs: { Web: { id: web.id, revision: web.revision }, Mobile: { id: mobile.id, revision: mobile.revision } } };
    };
    if (data.kind === "insert") {
      if (typeof data.sourceComponentId !== "string" || typeof data.ownerPartRef !== "string" || data.slotRef !== null && typeof data.slotRef !== "string") throw new Error("Choose a source and destination element.");
      if (owner.studioReference) throw new Error("Original templates do not yet support authored component instance content.");
      const source = context.component(data.sourceComponentId);
      const instance: StudioInstance = { id: context.id(), ownerPartRef: data.ownerPartRef, slotRef: data.slotRef, ...pin(source.id), values: {},
        slotContents: source.studioReference ? {} : Object.fromEntries(catalogObjects(source.slots).map(slot => [String(slot.id), isObject(source.previewContent) ? String(source.previewContent.body ?? "Content") : "Content"])) };
      owner.studioComposition = { version: "1.0.0", instances: [...instances, instance] } as unknown as JsonObject;
      return;
    }
    const instance = instances.find(item => item.id === data.instanceId);
    if (!instance) throw new Error("The selected instance no longer exists.");
    if (data.kind === "remove") owner.studioComposition = { version: "1.0.0", instances: instances.filter(item => item !== instance) } as unknown as JsonObject;
    else if (data.kind === "refresh") Object.assign(instance, pin(instance.componentRef.id));
    else if (data.kind === "value") {
      if (typeof data.valueId !== "string" || typeof data.reset !== "boolean") throw new Error("Choose a value port and an explicit reset policy.");
      if (!data.reset && context.component(instance.componentRef.id).studioReference) throw new Error("Original template instances retain upstream values. Individual value overrides require a provider-specific mapping.");
      if (data.reset) delete instance.values[data.valueId]; else instance.values[data.valueId] = data.value as JsonValue;
    } else if (data.kind === "content") {
      if (typeof data.slotId !== "string" || typeof data.text !== "string") throw new Error("Content requires an exposed slot and text.");
      if (context.component(instance.componentRef.id).studioReference) throw new Error("Original template instances retain upstream content. Slot overrides require a provider-specific mapping.");
      instance.slotContents[data.slotId] = data.text;
    }
  });
}
