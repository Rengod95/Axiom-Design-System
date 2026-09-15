import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, createStudioStarter, planStudioComponentCreate } from "../modules/ads-core/src/index.ts";
import { generateTargetPack, getTargetFiles } from "../modules/target-packs/src/index.ts";

export const hash = value => createHash("sha256").update(value).digest("hex");
export const ANDROID_TEST_PINS = { runner: "1.7.0", junit: "1.3.0" };

/** Native probes consume a real generated snapshot, never a handwritten replacement renderer. */
export function nativeFixture(target) {
  assert(["compose", "swiftui"].includes(target));
  let project = { id: "project.native-verification", name: "Native consumer verification", revision: "revision.native-verification", documents: Object.fromEntries(createStudioStarter("project.native-verification").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: `memory:${document.id}`, validation: "envelope-only", validationProfile: "foundation-studio", diagnostics: [] }])) };
  const ids = {}, representatives = ["button", "input", "switch", "card", "box", ...(target === "compose" ? ["checkbox"] : [])];
  let identity = 0;
  for (const id of representatives) {
    const plan = planStudioComponentCreate(project, { catalogId: `catalog.${id}` }, () => `native.${id}.${++identity}`);
    assert.equal(plan.valid, true, canonicalJson(plan.diagnostics));
    project = plan.project;
    ids[id] = plan.changes.upserts.find(item => item.document.kind === "component").document.id;
  }
  const result = generateTargetPack(project, { target, packageName: "axiom-native-probe" }, hash);
  assert.equal(result.valid, true, canonicalJson(result.diagnostics));
  const pack = result.pack;
  const symbols = Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, pack.manifest.publicApiMap[id]]));
  const files = getTargetFiles(pack, hash);
  if (target === "compose") {
    const gradle = files.find(file => file.path === "build.gradle.kts");
    gradle.text += `\n// Independent instrumentation consumer; generated library source above is unchanged.\nandroid { defaultConfig { testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" } }\ndependencies { androidTestImplementation(platform("androidx.compose:compose-bom:${pack.manifest.target.dependencies.composeBom}")); androidTestImplementation("androidx.compose.ui:ui-test-junit4"); debugImplementation("androidx.compose.ui:ui-test-manifest"); androidTestImplementation("androidx.test:runner:${ANDROID_TEST_PINS.runner}"); androidTestImplementation("androidx.test.ext:junit:${ANDROID_TEST_PINS.junit}") }\n`;
    files.push({ path: "gradle.properties", text: "android.useAndroidX=true\norg.gradle.jvmargs=-Xmx3g -Dfile.encoding=UTF-8\n" });
    files.push({ path: "src/androidTest/kotlin/design/axiom/NativeConsumerTest.kt", text: androidTests(symbols, pack.manifest.publicApiMap) });
  } else files.push({ path: "NativeConsumer.swift", text: swiftConsumer(symbols, pack.manifest.publicApiMap) });
  return { files, manifest: pack.manifest, representatives, symbols };
}

function androidTests(symbols, legacy) {
  return `package design.axiom
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeConsumerTest {
 @get:Rule val compose = createComposeRule()
 @Test fun activationAndDisabledRemainNative() {
  var requests = 0
  compose.setContent { AxiomThemeProvider { Column {
   ${symbols.button}(label="Activate native", onActivate={requests++})
   ${symbols.button}(label="Disabled native", disabled=true, onActivate={requests+=100})
  } } }
  compose.onNodeWithText("Activate native").assertHasClickAction().performClick()
  compose.onNodeWithText("Disabled native").assertIsNotEnabled()
  compose.runOnIdle { assertEquals(1, requests) }
 }
 @Test fun checkboxRequestsRequireConsumerAdoption() {
  val adopted = mutableStateOf(false)
  var requests = 0
  compose.setContent { AxiomThemeProvider { ${symbols.checkbox}(checked=adopted.value, onCheckedChangeRequest={requests++; assertEquals(true,it)}) } }
  compose.onNode(isToggleable()).assertIsOff().performClick().assertIsOff()
  compose.runOnIdle { assertEquals(1,requests); adopted.value=true }
  compose.onNode(isToggleable()).assertIsOn()
 }
 @Test fun inputUsesNativeEditingAndControlledValue() {
  val adopted = mutableStateOf("")
  compose.setContent { AxiomThemeProvider { ${symbols.input}(value=adopted.value, onValueChangeRequest={adopted.value=it}) } }
  compose.onNode(hasSetTextAction()).performTextInput("Axiom native")
  compose.runOnIdle { assertEquals("Axiom native",adopted.value) }
  compose.onNode(hasSetTextAction()).assertTextContains("Axiom native")
 }
 @Test fun requiredBodyIsMountedAsNativeContent() {
  compose.setContent { AxiomThemeProvider { ${symbols.card}(content={Text("Required native body")}) } }
  compose.onNodeWithText("Required native body").assertIsDisplayed()
 }
 @Test fun toastCloseRequestDoesNotOwnOpenAndReducedExitRemovesContent() {
  val open = mutableStateOf(true)
  var requests = 0
  compose.setContent { AxiomThemeProvider { AxiomToastHost {
   ${legacy["component.toast"]}(open=open.value,onCloseRequest={requests++},message="Native notice",closeLabel="Close native notice",reducedMotion=true)
  } } }
  compose.onNodeWithText("Native notice").assertIsDisplayed()
  compose.onNodeWithText("Close native notice").performClick()
  compose.onNodeWithText("Native notice").assertIsDisplayed()
  compose.runOnIdle { assertEquals(1,requests); open.value=false }
  compose.waitForIdle()
  compose.onNodeWithText("Native notice").assertDoesNotExist()
 }
}
`;
}

function swiftConsumer(symbols, legacy) {
  return `import SwiftUI
import UIKit
import CryptoKit
import Darwin

@MainActor final class NativeProbeState: ObservableObject { @Published var label = "Native initial"; @Published var checked = false }
@MainActor struct NativeProbeView: View {
 @ObservedObject var state: NativeProbeState
 var body: some View { AxiomThemeProvider { VStack(spacing:16) {
  ${symbols.button}(label:state.label,onActivate:{state.label="Native requested"})
  ${symbols.input}(value:state.label,onValueChangeRequest:{state.label=$0})
  ${symbols.switch}(checked:state.checked,onCheckedChangeRequest:{state.checked=$0})
  ${symbols.card}(content:AnyView(Text("Required native body")))
  AxiomToastHost { ${legacy["component.toast"]}(open:false,onCloseRequest:{}) }
 }.padding(20) } }
}
@main @MainActor final class NativeProbeDelegate: UIResponder, UIApplicationDelegate {
 var window: UIWindow?
 let state = NativeProbeState()
 func application(_ application: UIApplication,didFinishLaunchingWithOptions launchOptions:[UIApplication.LaunchOptionsKey:Any]?) -> Bool {
  let window=UIWindow(frame:UIScreen.main.bounds)
  let controller=UIHostingController(rootView:NativeProbeView(state:state))
  window.rootViewController=controller;window.overrideUserInterfaceStyle = .light; self.window=window; window.makeKeyAndVisible()
  Task { @MainActor in
   do {
    try await Task.sleep(for:.seconds(2))
    let first=try capture(controller)
    state.label="Native updated after mount";state.checked=true
    try await Task.sleep(for:.seconds(1))
    let second=try capture(controller)
    guard first != second else { throw ProbeError.unchanged }
    window.overrideUserInterfaceStyle = .dark
    try await Task.sleep(for:.seconds(1))
    let dark=try capture(controller)
    guard dark != second else { throw ProbeError.unchanged }
    finish(["status":"PASSED","execution":"iOS simulator UIKit-hosted SwiftUI","cases":["generated controls mounted","nonempty native rendering","consumer state updates mounted UI","dark appearance changes rendering"],"firstImageSHA256":digest(first),"updatedImageSHA256":digest(second),"darkImageSHA256":digest(dark),"os":UIDevice.current.systemVersion,"nativeTouch":"not-run","assistiveTechnology":"not-run"])
   } catch { finish(["status":"FAILED","error":String(describing:error)]) }
  }
  return true
 }
 enum ProbeError:Error { case empty,unchanged }
 func capture(_ controller:UIViewController)throws->Data {
  controller.view.setNeedsLayout();controller.view.layoutIfNeeded()
  guard controller.view.bounds.width>100,controller.view.bounds.height>100 else {throw ProbeError.empty}
  let image=UIGraphicsImageRenderer(bounds:controller.view.bounds).image { _ in controller.view.drawHierarchy(in:controller.view.bounds,afterScreenUpdates:true) }
  guard let data=image.pngData(), data.count>4000 else {throw ProbeError.empty}
  return data
 }
 func digest(_ data:Data)->String {SHA256.hash(data:data).map{String(format:"%02x",$0)}.joined()}
 func finish(_ evidence:[String:Any]) {
  let data=try! JSONSerialization.data(withJSONObject:evidence,options:[.sortedKeys])
  FileHandle.standardOutput.write(Data(("AXIOM_NATIVE_RESULT:"+data.base64EncodedString()+"\\n").utf8))
  exit(evidence["status"] as? String == "PASSED" ? 0 : 1)
 }
}
`;
}
