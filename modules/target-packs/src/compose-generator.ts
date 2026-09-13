import type { StudioComponent, StudioProjection, StudioStyle } from "../../ads-core/src/index.ts";
import type { SourceFile } from "./contracts.ts";
import { colorChannels, componentSymbol, sourceLiteral } from "./generator-input.ts";

function composeValue(value: string | number): string {
  if (typeof value === "number") return `${value}f`;
  const channels = colorChannels(value);
  return `Color(${channels.map((channel) => `${channel}f`).join(", ")})`;
}

function assignments(style: StudioStyle): string {
  return Object.entries(style).map(([key, value]) => `visual = visual.copy(${key} = ${composeValue(value)})`).join("; ");
}

function composeComponent(component: StudioComponent): string {
  const name = componentSymbol(component); const root = component.parts.find((part) => part.role === "root")!;
  const part = (role: string) => sourceLiteral(component.parts.find((item) => item.role === role)?.id ?? root.id, "kotlin");
  const layout = component.mobile.layout[root.id]; const horizontal = layout?.axis === "horizontal"; const gap = layout?.gap ?? 0;
  const style = `private fun ${name}Visual(id: String, variant: AxiomVariant = AxiomVariant.Filled, disabled: Boolean = false, pressed: Boolean = false): AxiomVisual {\n var visual = AxiomVisual()\n val state = (if (variant == AxiomVariant.Outlined) "outlined" else "filled") + (if (disabled) "-disabled" else if (pressed) "-pressed" else "")\n when (id) {\n${component.parts.map((item) => { const values = component.mobile.parts[item.id]!; const layout = component.mobile.layout[item.id]; return `${sourceLiteral(item.id,"kotlin")} -> {\n when (state) {\n${Object.entries(values.combinations).map(([key, style]) => `"${key}" -> { ${assignments(style)} }`).join("\n")}\n }\n${layout ? ` visual = visual.copy(padding = ${layout.padding}f, minHeight = ${layout.minHeight}f)` : ""}\n }`; }).join("\n")}\n }\n return visual\n}\n`;
  const variant = component.defaults.variant === "outlined" ? "Outlined" : "Filled";
  if (component.archetype === "button") return `${style}
@Composable
public fun ${name}(onActivate: () -> Unit, label: String = ${sourceLiteral(component.sampleContent.label,"kotlin")}, disabled: Boolean = ${component.defaults.disabled}, variant: AxiomVariant = AxiomVariant.${variant}) {
 val interactions = remember { MutableInteractionSource() }; val pressed by interactions.collectIsPressedAsState()
 val root = ${name}Visual(${part("root")},variant,disabled,pressed); val labelVisual = ${name}Visual(${part("label")},variant,disabled,pressed)
 Box(Modifier.axiomVisual(root).defaultMinSize(minWidth=48.dp).clickable(interactionSource = interactions, indication = LocalIndication.current, enabled = !disabled, role = Role.Button, onClick = onActivate), contentAlignment = Alignment.Center) { Text(label, modifier = Modifier.axiomVisual(labelVisual), color = labelVisual.color ?: root.color ?: Color.Unspecified, fontSize = (labelVisual.fontSize ?: root.fontSize ?: 16f).sp) }
}
`;
  if (component.archetype === "card") {
    const order = layout?.childOrder ?? component.parts.filter((item) => item.parent === root.id).map((item) => item.id);
    const children = order.map((id) => { const role = component.parts.find((item) => item.id === id)?.role; const visual=`${name}Visual(${sourceLiteral(id,"kotlin")},variant)`; const content=role==="body"?"body()":role==="header"?"header()":role==="actions"?"actions()":"";return content?`${role==="header"?"if (header != null) ":role==="actions"?"if (actions != null) ":""}AxiomTextScope(${visual}) { Box(Modifier.axiomVisual(${visual})) { ${content} } }`:""; }).join("\n");
    return `${style}
@Composable
public fun ${name}(body: @Composable () -> Unit, header: (@Composable () -> Unit)? = null, actions: (@Composable () -> Unit)? = null, variant: AxiomVariant = AxiomVariant.${variant}) {
 val root = ${name}Visual(${part("root")},variant)
 AxiomTextScope(root) { AxiomStack(${horizontal},${gap}f,Modifier.axiomVisual(root)) { ${children} } }
}
`;
  }
  return `${style}
@Composable
public fun ${name}(open: Boolean, onCloseRequest: () -> Unit, message: String = ${sourceLiteral(component.sampleContent.body,"kotlin")}, closeLabel: String = ${sourceLiteral(component.sampleContent.closeLabel,"kotlin")}, reducedMotion: Boolean = false) {
 val host = checkNotNull(LocalAxiomToastHost.current) { "Axiom Toast requires an explicit AxiomToastHost" }
 val id = remember { java.util.UUID.randomUUID().toString() }; var phase by remember { mutableStateOf(if (open) "present" else "removed") }
 val desiredOpen by rememberUpdatedState(open); val duration = if (reducedMotion) ${component.motion.reducedDurationMs} else ${component.motion.durationMs}
 LaunchedEffect(open,phase) { if (open && phase == "removed") phase = "present" else if (!open && phase == "present") phase = "exiting" }
 LaunchedEffect(phase) { if (phase == "exiting") { delay(minOf(duration,${component.motion.cleanupMs}).toLong()); phase = "removed"; if (desiredOpen) { host.remove(id); host.add(id); phase = "present" } } }
 DisposableEffect(phase != "removed") { if (phase != "removed") host.add(id); onDispose { host.remove(id) } }
 val alpha by animateFloatAsState(if (phase == "exiting") 0f else 1f, tween(durationMillis = duration), label = "AxiomToastPresence")
 if (host.entries.firstOrNull() == id && phase != "removed") { val rootVisual=${name}Visual(${part("root")});AxiomTextScope(rootVisual) { AxiomStack(${horizontal},${gap}f,Modifier.axiomVisual(rootVisual).alpha(alpha)) {
  val contentVisual = ${name}Visual(${part("body")}); AxiomTextScope(contentVisual) { Text(message, modifier = Modifier.axiomVisual(contentVisual).semantics { liveRegion = LiveRegionMode.Polite }) }
  val closeVisual=${name}Visual(${part("close")}); AxiomTextScope(closeVisual) { Box(Modifier.axiomVisual(closeVisual).defaultMinSize(minWidth = 48.dp, minHeight = 48.dp).clickable(role = Role.Button, onClick = onCloseRequest)) { Text(closeLabel) } }
 } } }
}
`;
}

/** Emit a user-owned Compose library; compiler and device checks remain independent evidence. */
export function generateComposeSources(projection: StudioProjection): SourceFile[] {
  return [{ path: "src/main/kotlin/design/axiom/AxiomDesign.kt", text: `// Generated ADS Compose source. Exact dependency pins are in axiom.delivery.json.
package design.axiom
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
public enum class AxiomVariant { Filled, Outlined }
private data class AxiomVisual(val background: Color? = null,val color: Color? = null,val borderColor: Color? = null,val borderWidth: Float? = null,val borderRadius: Float? = null,val fontSize: Float? = null,val opacity: Float? = null,val padding: Float = 0f,val minHeight: Float = 0f)
private fun Modifier.axiomVisual(visual: AxiomVisual): Modifier = this.clip(RoundedCornerShape((visual.borderRadius ?: 0f).dp)).background(visual.background ?: Color.Transparent).border((visual.borderWidth ?: 0f).dp,visual.borderColor ?: Color.Transparent,RoundedCornerShape((visual.borderRadius ?: 0f).dp)).padding(visual.padding.dp).defaultMinSize(minHeight = visual.minHeight.dp).alpha(visual.opacity ?: 1f)
@Composable private fun AxiomStack(horizontal: Boolean,gap: Float,modifier: Modifier = Modifier,content: @Composable () -> Unit) { if (horizontal) Row(modifier,horizontalArrangement = Arrangement.spacedBy(gap.dp)) { content() } else Column(modifier,verticalArrangement = Arrangement.spacedBy(gap.dp)) { content() } }
@Composable private fun AxiomTextScope(visual:AxiomVisual,content:@Composable () -> Unit) { val inherited=LocalTextStyle.current;val style=inherited.copy(color=visual.color?:inherited.color,fontSize=visual.fontSize?.sp?:inherited.fontSize);CompositionLocalProvider(LocalContentColor provides (visual.color?:LocalContentColor.current)) { ProvideTextStyle(style) { content() } } }
private class AxiomToastQueue { val entries = mutableStateListOf<String>(); fun add(id:String) { if (!entries.contains(id)) entries.add(id) }; fun remove(id:String) { entries.remove(id) } }
private val LocalAxiomToastHost = staticCompositionLocalOf<AxiomToastQueue?> { null }
@Composable public fun AxiomToastHost(content: @Composable () -> Unit) { val queue = remember { AxiomToastQueue() }; CompositionLocalProvider(LocalAxiomToastHost provides queue) { Box { content() } } }
@Composable public fun AxiomThemeProvider(content: @Composable () -> Unit) { MaterialTheme { content() } }
${projection.components.map(composeComponent).join("\n")}
` }];
}
