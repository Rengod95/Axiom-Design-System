import { studioBehaviorRuntimeSource } from "../../ads-core/src/index.ts";
import type { StudioComponent } from "../../ads-core/src/index.ts";
import { callbackName } from "./catalog-source-types.ts";
import { TargetError } from "./target-error.ts";
import { TARGET_CODE } from "./constants.ts";

/** Typed wrapper around the exact same Axiom-owned deterministic interpreter used by Studio. */
export function catalogReactBehaviorRuntime(): string {
  return `
type AxiomBehaviorScalar = string | number | boolean;
type AxiomBehaviorState = Record<string,AxiomBehaviorScalar>;
type AxiomBehaviorJson = null | boolean | number | string | AxiomBehaviorJson[] | { [key:string]:AxiomBehaviorJson };
type AxiomBehaviorTrigger = "press" | "change" | "focus" | "blur";
type AxiomBehaviorCondition = {valueRef:string;operator:"equals"|"not-equals"|"greater-than"|"less-than";value:AxiomBehaviorScalar};
type AxiomBehaviorAction = {kind:"toggle";valueRef:string}|{kind:"set";valueRef:string;value:AxiomBehaviorScalar}|{kind:"emit";eventRef:string;payload:AxiomBehaviorJson};
type AxiomBehaviorDefinition = {version:"1.0.0";rules:{id:string;name:string;targetPartRef:string;trigger:AxiomBehaviorTrigger;condition:AxiomBehaviorCondition|null;actions:AxiomBehaviorAction[]}[]};
type AxiomBehaviorResult = {values:AxiomBehaviorState;emissions:{eventRef:string;payload:AxiomBehaviorJson;ruleId:string}[];matchedRuleIds:string[]};
const executeStudioBehavior:(definition:AxiomBehaviorDefinition,state:AxiomBehaviorState,input:{targetPartRef:string;trigger:AxiomBehaviorTrigger},localIds:string[])=>AxiomBehaviorResult = ${studioBehaviorRuntimeSource()};
`;
}

export interface CatalogReactBehaviorCode { hooks: string; attributes: string }
/** Local values are instance state; consumer values are read on each render and never silently adopted. */
export function catalogReactBehavior(component: StudioComponent): CatalogReactBehaviorCode {
  const definition = component.behavior, catalog = component.catalog;
  if (!definition?.rules.length || !catalog) return { hooks: "", attributes: "" };
  const ports = catalog.values.filter(value => value.type && typeof value.type === "object" && !Array.isArray(value.type) && ["boolean", "number", "string", "enum"].includes(String(value.type.kind)));
  const local = ports.filter(value => value.ownership === "local"), external = ports.filter(value => value.ownership !== "local");
  const attributeNames = local.map(value => String(value.name).toLowerCase());
  if (new Set(attributeNames).size !== attributeNames.length) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Local state names must remain distinct when mapped to lowercase HTML data-state attributes.", component.id);
  const initial = Object.fromEntries(local.map(value => [String(value.id), value.defaultValue]));
  const externalReads = external.map(value => `${JSON.stringify(String(value.id))}:${String(value.name)}`).join(",");
  const callbacks = catalog.events.map(event => `${JSON.stringify(String(event.id))}:(payload:AxiomBehaviorJson)=>${callbackName(String(event.name))}(payload as Parameters<typeof ${callbackName(String(event.name))}>[0])`).join(",");
  const disabled = catalog.values.some(value => value.name === "disabled") ? "disabled" : "false";
  const attributes = local.map(value => `${JSON.stringify(`data-state-${String(value.name).toLowerCase()}`)}:String(axiomLocal[${JSON.stringify(String(value.id))}])`).join(",");
  return {
    hooks: `
const axiomBehavior:AxiomBehaviorDefinition=${JSON.stringify(definition)};
const axiomLocalIds=${JSON.stringify(local.map(value => String(value.id)))};
const [axiomLocal,setAxiomLocal]=React.useState<AxiomBehaviorState>(()=>(${JSON.stringify(initial)}));
const axiomStateRef=React.useRef<AxiomBehaviorState>({...axiomLocal,${externalReads}});
axiomStateRef.current={...axiomStateRef.current,${externalReads}};
const axiomCallbacks:Record<string,(payload:AxiomBehaviorJson)=>void>={${callbacks}};
const axiomBehaviorAttributes={${attributes}};
const axiomBehaviorInput=(trigger:AxiomBehaviorTrigger,event:React.SyntheticEvent<HTMLElement>)=>{
  if(${disabled}||!(event.target instanceof Element))return;
  const origin=event.target;
  if(origin.closest('[data-axiom-behavior-root]')!==event.currentTarget||origin.closest(':disabled,[aria-disabled="true"]'))return;
  let target:Element|null=origin;
  while(target&&event.currentTarget.contains(target)){
    const part=target.getAttribute('data-part');
    if(part&&axiomBehavior.rules.some(rule=>rule.targetPartRef===part&&rule.trigger===trigger)){
      if((trigger==='focus'||trigger==='blur')&&'relatedTarget'in event&&event.relatedTarget instanceof Node&&target.contains(event.relatedTarget))return;
      const result=executeStudioBehavior(axiomBehavior,axiomStateRef.current,{targetPartRef:part,trigger},axiomLocalIds);
      axiomStateRef.current=result.values;
      setAxiomLocal(Object.fromEntries(axiomLocalIds.map(id=>[id,result.values[id]!])));
      for(const emission of result.emissions)axiomCallbacks[emission.eventRef]?.(emission.payload);
      return;
    }
    if(target===event.currentTarget)return;
    target=target.parentElement;
  }
};
`,
    attributes: `data-axiom-behavior-root=${JSON.stringify(component.id)} {...axiomBehaviorAttributes} onClickCapture={event=>axiomBehaviorInput("press",event)} onChangeCapture={event=>axiomBehaviorInput("change",event)} onFocusCapture={event=>axiomBehaviorInput("focus",event)} onBlurCapture={event=>axiomBehaviorInput("blur",event)}`,
  };
}
