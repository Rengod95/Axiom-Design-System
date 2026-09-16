import { canonicalJson, inspectFoundationPolicies, inspectStudioProject, STUDIO_ROOT_FONT_SIZE } from "../../ads-core/src/index.ts";
import type { ProjectSnapshot } from "../../ads-core/src/index.ts";
import { TARGET_CODE, TARGET_DEPENDENCIES, TARGET_IDS, TARGET_PACK_VERSION } from "./constants.ts";
import type { TargetDigest, TargetGeneration, TargetOptions, TargetFile, SourceFile } from "./contracts.ts";
import { componentSymbol, inspectGeneratorProjection, nativeLengthProjection } from "./generator-input.ts";
import { generateReactSources } from "./react-generator.ts";
import { generateNativeReactSources } from "./native-react-generator.ts";
import { generateSwiftSources } from "./swift-generator.ts";
import { generateComposeSources } from "./compose-generator.ts";
import { packageFiles } from "./package-files.ts";
import { hashSource, inspectSourceFiles } from "./source-inventory.ts";
import { TargetError } from "./target-error.ts";

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
function fileKind(file: SourceFile): TargetFile["kind"] { return file.path.endsWith(".md") ? "documentation" : file.path.endsWith(".css") ? "style" : /\.(?:tsx?|swift|kt)$/.test(file.path) ? "source" : "configuration"; }

/** Generate only after the core revalidates an adopted snapshot; compilation evidence is never invented. */
export function generateTargetPack(project: ProjectSnapshot, options: TargetOptions, digest: TargetDigest): TargetGeneration {
  try {
    const snapshot:unknown = JSON.parse(canonicalJson(options));
    if(!snapshot || typeof snapshot!=="object" || Array.isArray(snapshot) || Object.keys(snapshot).some(key=>!["target","packageName","selection","nativeRootFontSize"].includes(key)))throw new TargetError(TARGET_CODE.INVALID,"Target options require an explicit supported object");
    const selected = snapshot as TargetOptions;
    if (!TARGET_IDS.includes(selected.target)) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Unknown target profile");
    const nativeRootFontSize = selected.nativeRootFontSize ?? STUDIO_ROOT_FONT_SIZE;
    if (!Number.isFinite(nativeRootFontSize) || nativeRootFontSize <= 0 || nativeRootFontSize > 256) throw new TargetError(TARGET_CODE.INVALID, "Native root font size must be positive and at most 256 logical px");
    if (selected.target === "react" && selected.nativeRootFontSize !== undefined) throw new TargetError(TARGET_CODE.INVALID, "Web preserves rem against the consumer root; nativeRootFontSize applies only to native targets");
    const packageName = selected.packageName ?? "axiom-design";
    if (typeof packageName!=="string" || packageName.length > 100 || !PACKAGE_NAME_PATTERN.test(packageName)) throw new TargetError(TARGET_CODE.INVALID, "Package name must be a portable npm-style owner name");
    const projection = inspectStudioProject(project, selected.selection);
    if (!projection.valid) return { valid: false, diagnostics: projection.diagnostics };
    const policies = inspectFoundationPolicies(project);
    if (!policies.valid || !policies.canDeliver) return { valid: false, diagnostics: [...projection.diagnostics, ...policies.diagnostics] };
    const diagnostics = [...projection.diagnostics, ...policies.diagnostics];
    inspectGeneratorProjection(projection, selected.target);
    const executable = selected.target === "react" ? projection : nativeLengthProjection(projection, nativeRootFontSize);
    const generated = selected.target === "react" ? generateReactSources(executable) : selected.target === "react-native" ? generateNativeReactSources(executable) : selected.target === "swiftui" ? generateSwiftSources(executable) : generateComposeSources(executable);
    const files = inspectSourceFiles([...generated, ...packageFiles(projection, selected.target, packageName)]).map((file) => ({ ...file, kind: fileKind(file), digest: hashSource(file.text, digest) }));
    const dependencies = { ...TARGET_DEPENDENCIES[selected.target] };
    const licenses = Object.fromEntries(Object.keys(dependencies).map((dependency) => [dependency, selected.target === "react" || selected.target === "react-native" ? "MIT" : selected.target === "compose" ? dependency === "jdk" ? "host-supplied JDK license" : "Apache-2.0" : dependency === "swift" ? "Apache-2.0 WITH Swift-exception" : "Apple platform SDK license"]));
    const limitations = ["Builtin Button/Card/Toast and the explicitly listed catalog semantic realizations are generated. Unsupported catalog contracts reject output; this is not full-catalog certification.", "The selected theme is fixed to the source snapshot; other contexts require a new generated revision.", "Catalog component values remain consumer-owned. React callbacks receive typed request records; browser/native realization and native-device execution are separate. Raw resolved DTCG token data is preserved; only sRGB and declared logical visual dimensions execute in this target.", "No external font, icon or asset is imported. Source generation does not establish installation, assistive-technology, native-device or release evidence.", "The consumer owns callbacks and controlled open. Automatic dismissal is disabled.", "Dependency pins are direct dependencies; the consuming package manager must create and retain its transitive lock.", ...(selected.target === "swiftui" ? ["This package targets iOS17+ SwiftUI/UIKit and requires an Apple SDK build host."] : []), ...(selected.target === "compose" ? ["Native compilation is not run in the generating browser. The consumer supplies the reduced-motion policy."] : [])];
    return { valid: true, diagnostics, pack: { files, diagnostics, manifest: {
      formatVersion: TARGET_PACK_VERSION, generator: { id: "axiom.target-packs", version: TARGET_PACK_VERSION },
      source: { projectId: projection.projectId, revision: projection.revision, digest: hashSource(projection.sourceText, digest), themeContexts: projection.foundation.contexts },
      target: { id: selected.target, version: TARGET_PACK_VERSION, dependencies, licenses }, files: files.map(({ path, digest, kind }) => ({ path, digest, kind })),
      publicApiMap: { ...Object.fromEntries(projection.components.map((component) => [component.id, componentSymbol(component)])), theme: "AxiomThemeProvider", toastHost: "AxiomToastHost", ...(selected.target === "react" && projection.components.some(component=>component.catalog) ? {overlayHost:"AxiomOverlayHost"} : {}), tokens: selected.target === "react" || selected.target === "react-native" ? "tokens" : "AxiomTokens",...(selected.target==="react-native"?{text:"AxiomText"}:{}) },
      capabilities: ["button.native-activation", "card.required-body", "toast.controlled-open", "toast.explicit-host-queue", "toast.bounded-presence", "source.user-owned", "theme.fixed-context", ...new Set(projection.components.flatMap(component => component.catalog ? [`catalog.${component.catalog.semantic.kind}.source`] : []))], limitations,
      verification: { generated: "passed", typechecked: "not-run", runtime: "not-run" }, conversionPolicy: { color: "explicit sRGB only; no gamut conversion", dimension: selected.target === "react" ? "px and rem preserved as CSS; rem follows the consumer root font size" : `rem resolved using explicit root font size ${nativeRootFontSize} logical px; ${selected.target === "react-native" ? "lengths to React Native logical units; fontSize uses Text font scaling" : selected.target === "swiftui" ? "lengths to points; fontSize follows the generated Dynamic Type scale" : "lengths to dp; fontSize to sp"}; composite typography, shadow and extended paint require separate native mapping`, motion: "controlled presence with bounded cleanup; consumer open is never rewritten" },
    } } };
  } catch (error) {
    if (error instanceof TargetError) return { valid: false, diagnostics: [error.toDiagnostic()] };
    if (error && typeof error === "object" && "toDiagnostic" in error && typeof error.toDiagnostic === "function") return { valid: false, diagnostics: [error.toDiagnostic()] };
    throw error;
  }
}
