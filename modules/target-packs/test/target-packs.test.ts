import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson } from "../../ads-core/src/index.ts";
import { createSourceArchive, generateTargetPack, getTargetFiles, inspectSourceFiles, inspectTargetPack, planUpgrade, TARGET_IDS, TARGET_MANIFEST_FILE, TARGET_CODE } from "../src/index.ts";
import type { TargetPack, TargetOptions } from "../src/index.ts";
import { sourceLiteral } from "../src/generator-input.ts";
import { DIGEST, projectFixture } from "./target-fixture.ts";

function pack(): TargetPack { const result = generateTargetPack(projectFixture(), { target: "react" }, DIGEST); assert.equal(result.valid,true,canonicalJson(result.diagnostics)); return result.pack!; }
function change(pack: TargetPack, path: string, text: string): TargetPack {
  const result = structuredClone(pack); const file = result.files.find((file) => file.path === path)!; file.text = text; file.digest = DIGEST(text); result.manifest.files.find((file) => file.path === path)!.digest = file.digest; result.manifest.source.revision = "revision.next"; return result;
}

test("four source targets retain stable identities, source evidence, independent dependency pins and no private state", () => {
  const project = projectFixture(); const before = canonicalJson(project);
  for (const target of TARGET_IDS) {
    const result = generateTargetPack(project,{ target },DIGEST); assert.equal(result.valid,true,canonicalJson(result.diagnostics)); const pack = result.pack!;
    assert.equal(pack.manifest.source.revision,project.revision); assert.equal(pack.manifest.publicApiMap["component.button"],"Axiom_component_button");
    assert.deepEqual(pack.manifest.verification,{generated:"passed",typechecked:"not-run",runtime:"not-run"});
    assert.equal(inspectTargetPack(pack,DIGEST).files.length,pack.files.length);
    assert(!canonicalJson(pack).includes("approvalToken")); assert(!canonicalJson(pack).includes("reviewToken"));
    if (target === "react") assert.equal(pack.manifest.target.dependencies.react,"19.3.0");
    if (target === "react-native") assert.equal(pack.manifest.target.dependencies.react,"19.2.3");
  }
  assert.equal(canonicalJson(project),before);
});

test("Compose exports satisfy the pinned BOM's minimum native compiler contract", () => {
  const result = generateTargetPack(projectFixture(), { target: "compose" }, DIGEST);
  assert(result.pack, canonicalJson(result.diagnostics));
  const pins = result.pack.manifest.target.dependencies;
  // Compose 1.12.0 AAR metadata in BOM 2026.08.00 rejects SDK36 and AGP9.0.
  assert.equal(pins.composeBom, "2026.08.00");
  assert(Number(pins.compileSdk) >= 37);
  assert.deepEqual([pins.agp, pins.gradle, pins.kotlin, pins.jdk], ["9.1.1", "9.3.1", "2.2.10", "17"]);
  assert.equal(pins.minSdk, "26", "A compile SDK update must not silently raise device requirements");
  const gradle = result.pack.files.find(file => file.path === "build.gradle.kts")!.text;
  const readme = result.pack.files.find(file => file.path === "README.md")!.text;
  assert(gradle.includes(`id("com.android.library") version "${pins.agp}"`));
  assert(gradle.includes(`compileSdk = ${pins.compileSdk};`));
  assert(gradle.includes(`buildToolsVersion = "${pins.buildTools}"`));
  assert(gradle.includes(`org.jetbrains.kotlin.plugin.compose") version "${pins.kotlin}"`));
  assert(readme.includes(`Gradle${pins.gradle}/JDK${pins.jdk} and Android SDK${pins.compileSdk}/build-tools${pins.buildTools}`));
});

test("unsupported source and portable-name collisions produce no partial output", () => {
  const project = projectFixture(); project.documents["component.button"]!.document.studioProfile = {id:"unknown",version:"0.1.0"};
  assert.equal(generateTargetPack(project,{target:"react"},DIGEST).pack,undefined);
  assert.equal(generateTargetPack(projectFixture(),{target:"react",packageName:"../../escape"},DIGEST).valid,false);
  for (const path of ["../evil", "/absolute", "a/../b", "CON.txt", "a/aux", "a.", "a\\b", "C:/file"]) assert.throws(() => inspectSourceFiles([{path,text:""}]),{code:TARGET_CODE.INVALID});
  assert.throws(() => inspectSourceFiles([{path:"A.txt",text:""},{path:"a.txt",text:""}]),{code:TARGET_CODE.INVALID});
});

test("deterministic ZIP contains exact UTF-8 files and checked portable local records", () => {
  const target = pack(); const zip = createSourceArchive(target,DIGEST); assert.deepEqual(zip,createSourceArchive(target,DIGEST));
  const view = new DataView(zip.buffer); const entries: {path:string;text:string}[] = []; let offset = 0;
  while (view.getUint32(offset,true) === 0x04034b50) { const size = view.getUint32(offset+18,true); const length = view.getUint16(offset+26,true); const start=offset+30; entries.push({path:new TextDecoder().decode(zip.slice(start,start+length)),text:new TextDecoder().decode(zip.slice(start+length,start+length+size))}); offset=start+length+size; }
  assert.deepEqual(entries,getTargetFiles(target,DIGEST)); assert(entries.some((file)=>file.path===TARGET_MANIFEST_FILE));
  target.files[0]!.text += "tamper"; assert.throws(()=>createSourceArchive(target,DIGEST),{code:TARGET_CODE.INVALID});
});

test("three-way plans preserve user-only changes, reject competing changes and bind all current bytes", () => {
  const previous=pack(); const path="src/styles.css"; const current=getTargetFiles(previous,DIGEST); const user=current.find((file)=>file.path===path)!; user.text += "\n/* user */";
  const same=planUpgrade(previous,current,previous,DIGEST); assert.equal(same.files.find((file)=>file.path===path)!.action,"preserve");
  const next=change(previous,path,previous.files.find((file)=>file.path===path)!.text+"\n/* generator */");
  const conflict=planUpgrade(previous,current,next,DIGEST); assert(conflict.conflicts.includes(path));
  const clean=planUpgrade(previous,getTargetFiles(previous,DIGEST),next,DIGEST); assert.equal(clean.files.find((file)=>file.path===path)!.action,"replace");
  user.text += "later"; assert.notEqual(planUpgrade(previous,current,next,DIGEST).digest,conflict.digest);
});

test("caller getters cannot replace inspected file bytes", () => {
  let calls=0; const files = [{path:"safe.txt",get text(){calls++;return "hidden";}}];
  assert.throws(()=>inspectSourceFiles(files)); assert.equal(calls,0);
});

test("malformed options and fabricated manifests cannot claim generation provenance",()=>{
 for(const options of [null,{target:"react",packageName:0},{target:"react",packageName:{toString:null,valueOf:null}},{target:"react",unknown:true}]){const result=generateTargetPack(projectFixture(),options as unknown as TargetOptions,DIGEST);assert.equal(result.valid,false);assert.equal(result.pack,undefined);assert.equal(result.diagnostics[0]!.code,TARGET_CODE.INVALID);}
 assert.throws(()=>inspectTargetPack({files:[],diagnostics:[],manifest:{formatVersion:"0.1.0",target:{id:"react"},source:{revision:"r1"},files:[]}} as unknown as TargetPack,DIGEST),{code:TARGET_CODE.INVALID});
 const forged=pack();forged.manifest.verification.typechecked="passed" as "not-run";assert.throws(()=>inspectTargetPack(forged,DIGEST),{code:TARGET_CODE.INVALID});
});

test("native literal escaping preserves backslash text and uses each language's supported control syntax",()=>{
 assert.equal(sourceLiteral(String.raw`\u1234`,"swift"),String.raw`"\\u1234"`);
 assert.equal(sourceLiteral("\b\f","swift"),String.raw`"\u{8}\u{c}"`);
 assert.equal(sourceLiteral("\b\f","kotlin"),String.raw`"\u0008\u000c"`);
 assert.equal(sourceLiteral('${danger}\\(danger)',"kotlin"),String.raw`"\${danger}\\(danger)"`);
 assert.equal(sourceLiteral("한국어 😀","swift"),'"한국어 😀"');
 assert.throws(()=>sourceLiteral("\ud800","swift"),{code:TARGET_CODE.UNSUPPORTED});
});

test("package export conditions retain host-defined order and native text adapters are explicit",()=>{
 for(const target of ["react","react-native"] as const){const result=generateTargetPack(projectFixture(),{target},DIGEST);assert(result.pack);const pkg=JSON.parse(result.pack.files.find(file=>file.path==="package.json")!.text);assert.deepEqual(Object.keys(pkg.exports["."]),target==="react"?["types","default"]:["types","react-native","default"]);if(target==="react-native"){assert.equal(result.pack.manifest.publicApiMap.text,"AxiomText");assert.match(result.pack.files.find(file=>file.path==="README.md")!.text,/primitive Text does not inherit/);}}
});
