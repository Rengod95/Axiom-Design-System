import type { StudioComponent, StudioDesign, StudioProjection, StudioStyle } from "../../ads-core/src/index.ts";
import type { SourceFile } from "./contracts.ts";
import { colorChannels, componentSymbol, sourceLiteral } from "./generator-input.ts";

function swiftValue(property: string, value: string | number): string {
  if (typeof value === "number") return String(value);
  const [red, green, blue, opacity] = colorChannels(value);
  return `Color(.sRGB, red: ${red}, green: ${green}, blue: ${blue}, opacity: ${opacity})`;
}

function visualAssignments(style: StudioStyle): string {
  return Object.entries(style).map(([key, value]) => `visual.${key} = ${swiftValue(key, value)}`).join("; ");
}

function visualFunction(component: StudioComponent, design: StudioDesign): string {
  return `private func ${componentSymbol(component)}Visual(_ id: String, _ variant: AxiomVariant = .filled, _ disabled: Bool = false, _ pressed: Bool = false) -> AxiomVisual {\n var visual = AxiomVisual()\n let state = (variant == .outlined ? "outlined" : "filled") + (disabled ? "-disabled" : pressed ? "-pressed" : "")\n switch id {\n${component.parts.map((part) => { const values = design.parts[part.id]!; const layout = design.layout[part.id]; return `case ${sourceLiteral(part.id, "swift")}:\n switch state {\n${Object.entries(values.combinations).map(([key, style]) => `case "${key}": ${visualAssignments(style) || "break"}`).join("\n")}\n default: break\n }\n${layout ? ` visual.padding = ${layout.padding}; visual.minHeight = ${layout.minHeight}` : ""}`; }).join("\n")}\n default: break\n }\n return visual\n}\n`;
}

function swiftComponent(component: StudioComponent): string {
  const name = componentSymbol(component); const root = component.parts.find((part) => part.role === "root")!;
  const part = (role: string) => sourceLiteral(component.parts.find((item) => item.role === role)?.id ?? root.id, "swift");
  const layout = component.mobile.layout[root.id]; const axis = layout?.axis === "horizontal" ? "true" : "false"; const gap = layout?.gap ?? 0;
  const common = visualFunction(component, component.mobile);
  if (component.archetype === "button") return `${common}
public struct ${name}: View {
 public var label: String; public var disabled: Bool; public var variant: AxiomVariant; public var onActivate: () -> Void
 public init(label: String = ${sourceLiteral(component.sampleContent.label,"swift")}, disabled: Bool = ${component.defaults.disabled}, variant: AxiomVariant = .${component.defaults.variant}, onActivate: @escaping () -> Void) { self.label = label; self.disabled = disabled; self.variant = variant; self.onActivate = onActivate }
 public var body: some View { Button(action: onActivate) { Text(label) }.buttonStyle(${name}Style(variant: variant, disabled: disabled)).disabled(disabled).accessibilityLabel(label) }
}
private struct ${name}Style: ButtonStyle {
 var variant: AxiomVariant; var disabled: Bool
 func makeBody(configuration: Configuration) -> some View { configuration.label.modifier(AxiomVisualModifier(visual: ${name}Visual(${part("label")},variant,disabled,configuration.isPressed))).modifier(AxiomVisualModifier(visual: ${name}Visual(${part("root")},variant,disabled,configuration.isPressed))).frame(minWidth:44).contentShape(Rectangle()) }
}
`;
  if (component.archetype === "card") {
    const order = layout?.childOrder ?? component.parts.filter((item) => item.parent === root.id).map((item) => item.id);
    const children = order.map((id) => { const role = component.parts.find((item) => item.id === id)?.role; const visual = `.modifier(AxiomVisualModifier(visual: ${name}Visual(${sourceLiteral(id,"swift")},variant)))`; return role === "body" ? `content${visual}` : role === "header" ? `if let header { header${visual} }` : role === "actions" ? `if let actions { actions${visual} }` : ""; }).join("\n");
    return `${common}
public struct ${name}<Content: View>: View {
 private let content: Content; private let header: AnyView?; private let actions: AnyView?; private let variant: AxiomVariant
 public init(header: AnyView? = nil, actions: AnyView? = nil, variant: AxiomVariant = .${component.defaults.variant}, @ViewBuilder body: () -> Content) { self.header = header; self.actions = actions; self.variant = variant; self.content = body() }
 public var body: some View { AxiomStack(horizontal: ${axis}, gap: ${gap}) { ${children} }.modifier(AxiomVisualModifier(visual: ${name}Visual(${part("root")},variant))) }
}
`;
  }
  return `${common}
public struct ${name}: View {
 public var open: Bool; public var message: String; public var closeLabel: String; public var onCloseRequest: () -> Void
 @EnvironmentObject private var host: AxiomToastQueue
 @Environment(\\.accessibilityReduceMotion) private var reducedMotion
 @State private var id = UUID(); @State private var phase = "removed"; @State private var desiredOpen = false
 public init(open: Bool, message: String = ${sourceLiteral(component.sampleContent.body,"swift")}, closeLabel: String = ${sourceLiteral(component.sampleContent.closeLabel,"swift")}, onCloseRequest: @escaping () -> Void) { self.open = open; self.message = message; self.closeLabel = closeLabel; self.onCloseRequest = onCloseRequest }
 public var body: some View {
  Group { if host.entries.first == id && phase != "removed" { AxiomStack(horizontal: ${axis}, gap: ${gap}) {
   Text(message).modifier(AxiomVisualModifier(visual: ${name}Visual(${part("body")})))
   Button(action: onCloseRequest) { Text(closeLabel).frame(minWidth:44,minHeight:44).contentShape(Rectangle()) }.accessibilityLabel(closeLabel).modifier(AxiomVisualModifier(visual: ${name}Visual(${part("close")})))
  }.modifier(AxiomVisualModifier(visual: ${name}Visual(${part("root")}))).opacity(phase == "exiting" ? 0 : 1).animation(.linear(duration: Double(reducedMotion ? ${component.motion.reducedDurationMs} : ${component.motion.durationMs}) / 1000), value: phase).onAppear { UIAccessibility.post(notification: .announcement, argument: message) } } }
  .onAppear { desiredOpen = open; if open { phase = "present"; host.register(id) } }
  .onChange(of: open) { desiredOpen = open; if open && phase == "removed" { phase = "present"; host.register(id) } else if !open && phase == "present" { phase = "exiting" } }
  .task(id: phase) { if phase == "exiting" { do { try await Task.sleep(for: .milliseconds(min(reducedMotion ? ${component.motion.reducedDurationMs} : ${component.motion.durationMs}, ${component.motion.cleanupMs}))) } catch { return }; host.unregister(id); phase = "removed"; if desiredOpen { id = UUID(); phase = "present"; host.register(id) } } }
  .onDisappear { host.unregister(id) }
 }
}
`;
}

/** Emit an iOS SwiftUI package; Apple compiler/device evidence is intentionally separate. */
export function generateSwiftSources(projection: StudioProjection): SourceFile[] {
  return [{ path: "Sources/AxiomDesign/AxiomDesign.swift", text: `// Generated ADS iOS SwiftUI profile. See axiom.delivery.json for source and toolchain pins.
import SwiftUI
import UIKit
public enum AxiomVariant { case filled, outlined }
private struct AxiomVisual {
 var background: Color?; var color: Color?; var borderColor: Color?; var borderWidth: Double?; var borderRadius: Double?; var fontSize: Double?; var opacity: Double?; var padding: Double = 0; var minHeight: Double = 0
}
private struct AxiomVisualModifier: ViewModifier {
 let visual: AxiomVisual
 @ScaledMetric(relativeTo: .body) var fontScale = 1.0
 @ViewBuilder private func fontContent(_ content:Content) -> some View { if let size=visual.fontSize { content.font(.system(size:size*fontScale)) } else { content } }
 @ViewBuilder private func textContent(_ content:Content) -> some View { if let color=visual.color { fontContent(content).foregroundStyle(color) } else { fontContent(content) } }
 func body(content: Content) -> some View { textContent(content).padding(visual.padding).frame(minHeight: visual.minHeight).background(visual.background ?? .clear).clipShape(RoundedRectangle(cornerRadius: visual.borderRadius ?? 0)).overlay(RoundedRectangle(cornerRadius: visual.borderRadius ?? 0).stroke(visual.borderColor ?? .clear,lineWidth: visual.borderWidth ?? 0)).opacity(visual.opacity ?? 1) }
}
private struct AxiomStack<Content: View>: View {
 let horizontal: Bool; let gap: Double; @ViewBuilder var content: Content
 var body: some View { if horizontal { HStack(spacing: gap) { content } } else { VStack(alignment: .leading, spacing: gap) { content } } }
}
@MainActor private final class AxiomToastQueue: ObservableObject {
 @Published var entries: [UUID] = []
 func register(_ id: UUID) { if !entries.contains(id) { entries.append(id) } }
 func unregister(_ id: UUID) { entries.removeAll { $0 == id } }
}
public struct AxiomToastHost<Content: View>: View {
 @StateObject private var queue = AxiomToastQueue(); private let content: Content
 public init(@ViewBuilder content: () -> Content) { self.content = content() }
 public var body: some View { ZStack { content }.environmentObject(queue) }
}
public struct AxiomThemeProvider<Content: View>: View {
 private let content: Content
 public init(@ViewBuilder content: () -> Content) { self.content = content() }
 public var body: some View { content }
}
${projection.components.map(swiftComponent).join("\n")}
` }];
}
