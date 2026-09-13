import type { JsonValue, StudioComponent, TypeExpression } from "../../ads-core/src/index.ts";
import { componentSymbol, sourceLiteral } from "./generator-input.ts";
import { callbackName } from "./catalog-source-types.ts";
import { TargetError } from "./target-error.ts";
import { TARGET_CODE } from "./constants.ts";

type Language = "swift" | "kotlin";
function typeName(type: TypeExpression, language: Language): string {
  if (type.kind === "string") return "String";
  if (type.kind === "enum" && JSON.stringify(type.values) === '["horizontal","vertical"]') return "AxiomCatalogOrientation";
  if (type.kind === "boolean") return language === "swift" ? "Bool" : "Boolean";
  if (type.kind === "number") return "Double";
  if (type.kind === "nullable") return `${typeName(type.inner, language)}?`;
  if (type.kind === "list") return language === "swift" ? "[AxiomCatalogItem]" : "List<AxiomCatalogItem>";
  throw new TargetError(TARGET_CODE.UNSUPPORTED, "Native catalog API does not map this record type");
}
function literal(value: JsonValue, language: Language): string {
  if (value === null) return language === "swift" ? "nil" : "null";
  if (typeof value === "string") return sourceLiteral(value, language);
  if (typeof value === "number") return Number.isInteger(value) ? `${value}.0` : String(value);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const items = value.map(item => { const row = item as { key: string; label: string; disabled: boolean }; return language === "swift" ? `AxiomCatalogItem(key: ${sourceLiteral(row.key, language)}, label: ${sourceLiteral(row.label, language)}, disabled: ${row.disabled})` : `AxiomCatalogItem(${sourceLiteral(row.key, language)}, ${sourceLiteral(row.label, language)}, ${row.disabled})`; });
    return language === "swift" ? `[${items.join(", ")}]` : `listOf(${items.join(", ")})`;
  }
  throw new TargetError(TARGET_CODE.UNSUPPORTED, "Native catalog default cannot be represented");
}
const fail = (component: StudioComponent): never => { throw new TargetError(TARGET_CODE.UNSUPPORTED, `No native realization for ${component.catalog!.semantic.kind}`, component.id); };

export const CATALOG_SWIFT_TYPES = `
public enum AxiomCatalogOrientation { case horizontal, vertical }
public struct AxiomCatalogItem: Identifiable {
 public let key: String; public let label: String; public let disabled: Bool; public var id: String { key }
 public init(key: String, label: String, disabled: Bool = false) { self.key=key; self.label=label; self.disabled=disabled }
}
`;
/** SwiftUI bindings request values from the consumer; they never own an undisclosed copy. */
export function catalogSwiftComponent(component: StudioComponent, visual: string): string {
  const name = componentSymbol(component), catalog = component.catalog!, semantic = catalog.semantic;
  const root = component.parts.find(part => part.role === "root")!, layout = component.mobile.layout[root.id]!;
  const declarations: string[] = [], arguments_: string[] = [], assignments: string[] = [];
  const property = (name: string, type: string, initial?: string): void => { declarations.push(`public var ${name}: ${type}`); arguments_.push(`${name}: ${type}${initial === undefined ? "" : ` = ${initial}`}`); assignments.push(`self.${name}=${name}`); };
  for (const value of catalog.values) { const type = value.type as unknown as TypeExpression; property(String(value.name), typeName(type, "swift"), type.kind === "enum" ? `.${String(value.defaultValue)}` : literal(value.defaultValue!, "swift")); }
  property("label", "String", sourceLiteral(String(catalog.accessibility.label), "swift")); property("description", "String", sourceLiteral(String(catalog.accessibility.description), "swift")); property("variant", "AxiomVariant", `.${component.defaults.variant}`);
  for (const event of catalog.events) {
    const payload = event.payloadType as { fields: Record<string, TypeExpression> }, name = callbackName(String(event.name));
    const type = `(${payload.fields.value ? typeName(payload.fields.value, "swift") : ""}) -> Void`;
    declarations.push(`public var ${name}: ${type}`); arguments_.push(`${name}: @escaping ${type}`); assignments.push(`self.${name}=${name}`);
  }
  for (const slot of catalog.slots) { const role = component.parts.find(part => part.id === slot.ownerPartRef)!.role, name = role === "body" ? "content" : role; property(name, slot.min === 0 ? "AnyView?" : "AnyView", slot.min === 0 ? "nil" : undefined); }
  const binding = (value: string): string => `Binding(get: { ${value} }, set: { on${value.charAt(0).toUpperCase()+value.slice(1)}ChangeRequest($0) })`;
  let content: string;
  switch (semantic.kind) {
    case "button": content = `Button(action: { onActivate() }) { Text(label).frame(minWidth:44,minHeight:44).contentShape(Rectangle()) }.buttonStyle(.plain).disabled(disabled)`; break;
    case "text-input": content = `Text(label); ${semantic.inputType === "password" ? "SecureField" : "TextField"}(placeholder, text: ${binding("value")}).disabled(disabled || readOnly).accessibilityLabel(label).accessibilityHint(description); if invalid { Text("Invalid input") }; if !description.isEmpty { Text(description) }`; break;
    case "textarea": content = `Text(label); TextEditor(text: ${binding("value")}).disabled(disabled || readOnly).accessibilityLabel(label).accessibilityHint(description).frame(minHeight:100); if value.isEmpty { Text(placeholder) }; if invalid { Text("Invalid input") }; if !description.isEmpty { Text(description) }`; break;
    case "switch": content = `Toggle(label, isOn: ${binding("checked")}).disabled(disabled).accessibilityHint(description)`; break;
    case "toggle": content = `Toggle(label, isOn: ${binding("pressed")}).toggleStyle(.button).disabled(disabled).accessibilityHint(description)`; break;
    case "select": content = `Picker(label, selection: ${binding("selectedKey")}) { Text("Choose…").tag(Optional<String>.none); ForEach(items) { item in Text(item.label).tag(Optional(item.key)).disabled(item.disabled) } }.disabled(disabled).accessibilityHint(description)`; break;
    case "slider": content = `Text(label); Slider(value: ${binding("value")}, in: min...max, step: step).disabled(disabled).accessibilityLabel(label); Text(value.formatted())`; break;
    case "progress": content = `if indeterminate { ProgressView(label) } else { ProgressView(label, value: value-min, total: max-min) }`; break;
    case "loading": content = `if loading { ProgressView(label) } else { Text(label) }`; break;
    case "badge": case "text": content = `Text(text)${semantic.role === "heading" ? ".accessibilityAddTraits(.isHeader)" : ""}`; break;
    case "separator": content = `if orientation == .vertical { Divider().frame(width:1) } else { Divider() }`; break;
    case "list": content = `List(items) { item in Text(item.label) }.accessibilityLabel(label)`; break;
    case "navigation": content = `Text(label); ForEach(items) { item in Button(action:{onCurrentKeyChangeRequest(item.key)}) { Text(item.label).frame(minWidth:44,minHeight:44).contentShape(Rectangle()) }.buttonStyle(.plain).disabled(item.disabled).accessibilityAddTraits(currentKey==item.key ? .isSelected : []) }`; break;
    case "surface": content = `if let header { header }; content; if let actions { actions }`; break;
    case "layout": content = "content"; break;
    case "field": content = `Text(label); content; if required { Text("Required") }; if invalid { Text("Invalid input") }; if !description.isEmpty { Text(description) }`; break;
    case "alert": content = `Text(label); content; if dismissible { Button(action: { onDismissRequest() }) { Text(${sourceLiteral(component.sampleContent.closeLabel,"swift")}).frame(minWidth:44,minHeight:44).contentShape(Rectangle()) }.buttonStyle(.plain) }`; break;
    default: return fail(component);
  }
  const dimensions = (["width", "height"] as const).map(axis => { const policy = layout[axis]; return !policy || policy.mode === "hug" ? "" : policy.mode === "fixed" ? `.frame(${axis}:${policy.value})` : `.frame(${axis === "width" ? "maxWidth" : "maxHeight"}:.infinity)`; }).join("");
  return `${visual}\npublic struct ${name}: View {\n ${declarations.join("; ")}\n public init(${arguments_.join(", ")}) { ${assignments.join("; ")} }\n public var body: some View { AxiomStack(horizontal:${layout.axis === "horizontal"}, gap:${layout.gap}) { ${content} }.modifier(AxiomVisualModifier(visual:${name}Visual(${sourceLiteral(root.id,"swift")},variant${catalog.values.some(value=>value.name==="disabled")?",disabled":""})))${dimensions} }\n}\n`;
}

export const CATALOG_COMPOSE_TYPES = `
public enum class AxiomCatalogOrientation { Horizontal, Vertical }
public data class AxiomCatalogItem(val key:String,val label:String,val disabled:Boolean = false)
`;
/** Material controls carry their own checked/value semantics and consumer-owned callbacks. */
export function catalogComposeComponent(component: StudioComponent, visual: string): string {
  const name = componentSymbol(component), catalog = component.catalog!, semantic = catalog.semantic;
  const root = component.parts.find(part => part.role === "root")!, layout = component.mobile.layout[root.id]!;
  const arguments_: string[] = [];
  for (const value of catalog.values) { const type = value.type as unknown as TypeExpression; arguments_.push(`${String(value.name)}: ${typeName(type,"kotlin")} = ${type.kind === "enum" ? `AxiomCatalogOrientation.${value.defaultValue === "vertical" ? "Vertical" : "Horizontal"}` : literal(value.defaultValue!,"kotlin")}`); }
  arguments_.push(`label: String = ${sourceLiteral(String(catalog.accessibility.label),"kotlin")}`, `description: String = ${sourceLiteral(String(catalog.accessibility.description),"kotlin")}`, `variant: AxiomVariant = AxiomVariant.${component.defaults.variant === "filled" ? "Filled" : "Outlined"}`);
  for (const event of catalog.events) { const payload = event.payloadType as { fields: Record<string, TypeExpression> }; arguments_.push(`${callbackName(String(event.name))}: (${payload.fields.value ? typeName(payload.fields.value,"kotlin") : ""}) -> Unit`); }
  for (const slot of catalog.slots) { const role = component.parts.find(part => part.id === slot.ownerPartRef)!.role, name = role === "body" ? "content" : role; arguments_.push(`${name}: ${slot.min === 0 ? "(@Composable () -> Unit)? = null" : "@Composable () -> Unit"}`); }
  let content: string;
  switch (semantic.kind) {
    case "button": content = `Button(onClick={onActivate()},enabled=!disabled) { Text(label,color=root.color?:Color.Unspecified,fontSize=(root.fontSize?:16f).sp) }`; break;
    case "text-input": case "textarea": content = `OutlinedTextField(value=value,onValueChange={onValueChangeRequest(it)},enabled=!disabled,readOnly=readOnly,isError=invalid,singleLine=${semantic.kind !== "textarea"},label={Text(label)},placeholder={Text(placeholder)},supportingText={Text(description)},textStyle=LocalTextStyle.current,visualTransformation=${semantic.inputType === "password" ? "PasswordVisualTransformation()" : "VisualTransformation.None"})`; break;
    case "checkbox": content = `Row(verticalAlignment=Alignment.CenterVertically) { TriStateCheckbox(state=if(indeterminate)ToggleableState.Indeterminate else if(checked)ToggleableState.On else ToggleableState.Off,onClick={onCheckedChangeRequest(indeterminate||!checked)},enabled=!disabled); Text(label) }`; break;
    case "switch": content = `Row(verticalAlignment=Alignment.CenterVertically) { Switch(checked=checked,onCheckedChange={onCheckedChangeRequest(it)},enabled=!disabled); Text(label) }`; break;
    case "toggle": content = `FilterChip(selected=pressed,onClick={onPressedChangeRequest(!pressed)},enabled=!disabled,label={Text(label,color=root.color?:Color.Unspecified,fontSize=(root.fontSize?:16f).sp)})`; break;
    case "select": content = `Text(label); Column(Modifier.selectableGroup()) { TextButton(onClick={onSelectedKeyChangeRequest(null)},enabled=!disabled) { Text("Choose…",color=root.color?:Color.Unspecified,fontSize=(root.fontSize?:16f).sp) }; items.forEach { item -> Row(Modifier.selectable(selected=selectedKey==item.key,enabled=!disabled&&!item.disabled,role=Role.RadioButton,onClick={onSelectedKeyChangeRequest(item.key)}).defaultMinSize(minHeight=48.dp),verticalAlignment=Alignment.CenterVertically) { RadioButton(selected=selectedKey==item.key,onClick=null,enabled=!disabled&&!item.disabled); Text(item.label) } } }`; break;
    case "slider": content = `Text(label); Slider(value=value.toFloat(),onValueChange={onValueChangeRequest(it.toDouble())},enabled=!disabled,valueRange=min.toFloat()..max.toFloat(),steps=kotlin.math.max(0,((max-min)/step).toInt()-1)); Text(value.toString())`; break;
    case "progress": content = `Text(label); if(indeterminate)LinearProgressIndicator() else LinearProgressIndicator(progress={((value-min)/(max-min)).toFloat()})`; break;
    case "loading": content = `if(loading)CircularProgressIndicator(); Text(label)`; break;
    case "badge": case "text": content = "Text(text)"; break;
    case "separator": content = `if(orientation==AxiomCatalogOrientation.Vertical)VerticalDivider() else HorizontalDivider()`; break;
    case "list": content = `LazyColumn { items(items,key={it.key}) { item -> Text(item.label) } }`; break;
    case "navigation": content = `Text(label); items.forEach { item -> Box(Modifier.selectable(selected=currentKey==item.key,enabled=!item.disabled,role=Role.Button,onClick={onCurrentKeyChangeRequest(item.key)}).defaultMinSize(minWidth=48.dp,minHeight=48.dp)) { Text(item.label) } }`; break;
    case "surface": content = `header?.invoke(); content(); actions?.invoke()`; break;
    case "layout": content = "content()"; break;
    case "field": content = `Text(label); content(); if(required)Text("Required"); if(invalid)Text("Invalid input"); Text(description)`; break;
    case "alert": content = `Text(label); content(); if(dismissible)TextButton(onClick={onDismissRequest()}) { Text(${sourceLiteral(component.sampleContent.closeLabel,"kotlin")},color=root.color?:Color.Unspecified,fontSize=(root.fontSize?:16f).sp) }`; break;
    default: return fail(component);
  }
  const dimensions = (["width", "height"] as const).map(axis => { const policy = layout[axis]; return !policy || policy.mode === "hug" ? "" : policy.mode === "fixed" ? `.${axis}(${policy.value}.dp)` : `.${axis === "width" ? "fillMaxWidth" : "fillMaxHeight"}()`; }).join("");
  return `${visual}\n@Composable public fun ${name}(${arguments_.join(", ")}) { val root=${name}Visual(${sourceLiteral(root.id,"kotlin")},variant${catalog.values.some(value=>value.name==="disabled")?",disabled":""}); AxiomTextScope(root) { AxiomStack(${layout.axis === "horizontal"},${layout.gap}f,Modifier.axiomVisual(root)${dimensions}) { ${content} } } }\n`;
}
