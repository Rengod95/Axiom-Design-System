import type { StudioComponent, StudioProjection } from "../../ads-core/src/index.ts";
import type { SourceFile } from "./contracts.ts";
import { componentSymbol } from "./generator-input.ts";
import { REACT_LIFECYCLE_SOURCE } from "./react-runtime.ts";
import { catalogNativeReactComponent } from "./catalog-native-react-generator.ts";

function nativeComponent(component: StudioComponent): string {
  if (component.archetype === "catalog") return catalogNativeReactComponent(component);
  const name = componentSymbol(component); const root = component.parts.find((part) => part.role === "root")!;
  const part = (role: string) => component.parts.find((item) => item.role === role)?.id ?? root.id;
  const data = JSON.stringify(component.mobile); const sample = JSON.stringify(component.sampleContent);
  const ordered = component.mobile.layout[root.id]?.childOrder ?? component.parts.filter((item) => item.parent === root.id).map((item) => item.id);
  const common = `const ${name}Design: Design = ${data};\n`;
  if (component.archetype === "button") return `${common}
/** Native Pressable owns activation; disabled input cannot request action. */
export function ${name}({label = ${sample}.label, disabled = ${component.defaults.disabled}, variant = ${JSON.stringify(component.defaults.variant)}, onActivate}: AxiomButtonProps) {
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPress={onActivate} style={({pressed}) => [visual(${name}Design, ${JSON.stringify(root.id)}, variant, disabled, pressed),{minWidth:48}]}>{({pressed}) => <Text style={[textVisual(${name}Design,${JSON.stringify(part("label"))},${JSON.stringify(root.id)},variant,disabled,pressed),visual(${name}Design, ${JSON.stringify(part("label"))}, variant, disabled, pressed)]}>{label}</Text>}</Pressable>;
}
`;
  if (component.archetype === "card") return `${common}
/** A Card groups required body content without becoming an action. */
export function ${name}({body, header, actions, variant = ${JSON.stringify(component.defaults.variant)}}: AxiomCardProps) {
 if(body==null) throw new Error("Axiom Card requires body content");
 return <View style={visual(${name}Design, ${JSON.stringify(root.id)}, variant)}>{${JSON.stringify(ordered)}.map(id => {const child=id === ${JSON.stringify(part("body"))}?body:id === ${JSON.stringify(part("header"))}?header:id === ${JSON.stringify(part("actions"))}?actions:null;return child==null?null:<TextContext.Provider key={id} value={textVisual(${name}Design,id,${JSON.stringify(root.id)},variant)}><View style={visual(${name}Design,id,variant)}>{child}</View></TextContext.Provider>;})}</View>;
}
`;
  return `${common}
/** Controlled open and closeRequest remain separate from host presence and animation. */
export function ${name}({open, message = ${sample}.body, closeLabel = ${sample}.closeLabel, onCloseRequest}: AxiomToastProps) {
 const reduced = useReducedMotion(); const duration = reduced ? ${component.motion.reducedDurationMs} : ${component.motion.durationMs};
 const phase = usePresence(open,duration,${component.motion.cleanupMs}); const active = useHostEntry(phase !== "removed");
 const opacity = React.useRef(new Animated.Value(1)).current;
 React.useEffect(() => { const animation = Animated.timing(opacity,{toValue:phase === "exiting" ? 0 : 1,duration,useNativeDriver:true}); animation.start(); return () => animation.stop(); },[phase,duration,opacity]);
 React.useEffect(() => { if (active && phase === "present" && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(message); },[active,phase]);
 if (!active || phase === "removed") return null;
 return <Animated.View style={[visual(${name}Design,${JSON.stringify(root.id)}),{opacity:Animated.multiply(opacity,${component.mobile.parts[root.id]!.combinations.filled.opacity??1})}]}><Text accessibilityLiveRegion="polite" style={[textVisual(${name}Design,${JSON.stringify(part("body"))},${JSON.stringify(root.id)}),visual(${name}Design,${JSON.stringify(part("body"))})]}>{message}</Text><Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onCloseRequest} style={[visual(${name}Design,${JSON.stringify(part("close"))}),{minWidth:48,minHeight:${Math.max(48,component.mobile.layout[part("close")]?.minHeight??0)},justifyContent:"center",alignItems:"center"}]}><Text style={textVisual(${name}Design,${JSON.stringify(part("close"))},${JSON.stringify(root.id)})}>{closeLabel}</Text></Pressable></Animated.View>;
}
`;
}

/** Generate the pinned Expo-first React Native source without a DOM or CSS dependency. */
export function generateNativeReactSources(projection: StudioProjection): SourceFile[] {
  return [{ path: "src/index.tsx", text: `// Generated from ADS; dependency and evidence pins are in axiom.delivery.json.
import * as React from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, Text, View, TextInput as NativeTextInput, Switch as NativeSwitch, ActivityIndicator as NativeActivityIndicator, Modal as NativeModal } from "react-native";
import type { TextProps, TextStyle, ViewStyle, DimensionValue } from "react-native";
export { tokens, themeContexts } from "./tokens";
export interface AxiomButtonProps { label?: string; disabled?: boolean; variant?: "filled" | "outlined"; onActivate: () => void }
export interface AxiomCardProps { body: React.ReactNode; header?: React.ReactNode; actions?: React.ReactNode; variant?: "filled" | "outlined" }
export interface AxiomToastProps { open: boolean; message?: string; closeLabel?: string; onCloseRequest: () => void }
type Visual = Record<string,string | number>;
type Design = { parts: Record<string,{base:Visual;outlined:Visual;disabled:Visual;pressed:Visual;combinations:Record<string,Visual>;provenance:unknown}>;layout:Record<string,{axis:string;gap:number;padding:number;minHeight:number;childOrder:string[];width?:{mode:string;value?:number};height?:{mode:string;value?:number};alignment?:string}>;id:string;category:string;editorFrame?:unknown };
function visual(design:Design,id:string,variant = "filled",disabled = false,pressed = false): ViewStyle & TextStyle {
 const part = design.parts[id]!; const values = part.combinations[variant + (disabled ? "-disabled" : pressed ? "-pressed" : "")]!;
 const result: ViewStyle & TextStyle = {}; for (const [key,value] of Object.entries(values)) Object.assign(result,{[key === "background" ? "backgroundColor" : key]:value});
 const layout = design.layout[id]; if (layout) {Object.assign(result,{flexDirection:layout.axis === "horizontal" ? "row" : "column",gap:layout.gap,padding:layout.padding,minHeight:layout.minHeight});for(const axis of ["width","height"] as const){const policy=layout[axis];if(policy)Object.assign(result,{[axis]:policy.mode==="fixed"?policy.value:policy.mode==="fill"?"100%":"auto"});}if(layout.alignment)Object.assign(result,{alignItems:layout.alignment==="start"?"flex-start":layout.alignment==="end"?"flex-end":layout.alignment});} return result;
}
function textVisual(design:Design,id:string,root:string,variant = "filled",disabled = false,pressed = false):TextStyle {
 const parent=visual(design,root,variant,disabled,pressed);const child=visual(design,id,variant,disabled,pressed);const style:TextStyle={};const color=child.color??parent.color;const fontSize=child.fontSize??parent.fontSize;if(color!==undefined)style.color=color;if(fontSize!==undefined)style.fontSize=fontSize;return style;
}
const TextContext=React.createContext<TextStyle>({});
/** Use in Card slots to inherit authored text styles; native Text keeps consumer-owned styling. */
export function AxiomText({children,style,...props}:TextProps){const inherited=React.useContext(TextContext);return <Text {...props} style={[inherited,style]}>{children}</Text>;}
${REACT_LIFECYCLE_SOURCE}
function useReducedMotion() {
 const [reduced,setReduced] = React.useState(false);
 React.useEffect(() => { let active = true; void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }); const listener = AccessibilityInfo.addEventListener("reduceMotionChanged",setReduced); return () => { active = false; listener.remove(); }; },[]); return reduced;
}
/** Queue ownership belongs to this explicit host. */
export function AxiomToastHost({children}: {children:React.ReactNode}) { const host = useHostQueue(); return <HostContext.Provider value={host}><View>{children}</View></HostContext.Provider>; }
/** The package contains a fixed, reproducible theme context. */
export function AxiomThemeProvider({children}: {children:React.ReactNode}) { return <View>{children}</View>; }
${projection.components.map(nativeComponent).join("\n")}
` }];
}
