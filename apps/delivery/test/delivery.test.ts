import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, mkdir, rm, open, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson, createStudioStarter } from "../../../modules/ads-core/src/index.ts";
import type { ProjectSnapshot } from "../../../modules/ads-core/src/index.ts";
import { generateTargetPack } from "../../../modules/target-packs/src/index.ts";
import type { TargetPack } from "../../../modules/target-packs/src/index.ts";
import { applyDeliveryPlan, doctorDelivery, exportTargetSource, planDelivery, recoverDelivery, rollbackDelivery, DELIVERY_CODE } from "../src/index.ts";

const PRINCIPAL={id:"owner",scopes:["connection.read","connection.execute","review.apply","delivery.write"]};
const HASH=(text:string):string=>createHash("sha256").update(text).digest("hex");
function fixture():TargetPack{
 const project:ProjectSnapshot={id:"project.delivery",name:"Delivery",revision:"revision.one",documents:Object.fromEntries(createStudioStarter("project.delivery").map(document=>[document.id,{document,originalText:canonicalJson(document),sourceUri:`memory:${document.id}`,validation:"envelope-only",validationProfile:"foundation-studio",diagnostics:[]}]))};
 const result=generateTargetPack(project,{target:"react"},HASH);assert.equal(result.valid,true,canonicalJson(result.diagnostics));return result.pack!;
}
function nextPack(baseline:TargetPack):TargetPack {const pack=structuredClone(baseline);pack.manifest.source.revision="revision.two";const file=pack.files.find(file=>file.path==="src/styles.css")!;file.text+="\n/* next generation */";file.digest=HASH(file.text);pack.manifest.files.find(item=>item.path===file.path)!.digest=file.digest;return pack;}

test("source init is reviewed, stale-checked, idempotent and records generated baseline separately from installed bytes",async t=>{
 const directory=await mkdtemp(join(tmpdir(),"axiom-delivery-"));t.after(()=>rm(directory,{recursive:true,force:true}));const root=join(directory,"package");const pack=fixture();
 const plan=await planDelivery(root,pack,PRINCIPAL);assert.equal(plan.kind,"init");await assert.rejects(()=>applyDeliveryPlan(plan,"wrong",PRINCIPAL),{code:DELIVERY_CODE.AUTHORITY});
 const receipt=await applyDeliveryPlan(plan,plan.digest,PRINCIPAL);assert.equal(receipt.after!.installedRelease,null);assert.equal(receipt.after!.verification,"source-installed-unverified");assert.deepEqual(await applyDeliveryPlan(plan,plan.digest,PRINCIPAL),receipt);
 const userPath=join(root,"README.md");await writeFile(userPath,(await readFile(userPath,"utf8"))+"\nMy customization");
 const upgrade=await planDelivery(root,nextPack(pack),PRINCIPAL);const installed=await applyDeliveryPlan(upgrade,upgrade.digest,PRINCIPAL);assert.match(await readFile(userPath,"utf8"),/My customization/);
 assert.notEqual(installed.after!.installedHashes["README.md"],HASH(installed.after!.baseline.files.find(file=>file.path==="README.md")!.text));
 const doctor=await doctorDelivery(root,PRINCIPAL);assert.equal(doctor.execution,"not-run");assert.equal(doctor.files.find(file=>file.path==="README.md")!.status,"user-modified");
 const rollback=await rollbackDelivery(root,installed.id,installed.id,PRINCIPAL);assert.equal(rollback.after!.generatedRelease,"revision.one");assert.match(await readFile(userPath,"utf8"),/My customization/);assert.deepEqual(await rollbackDelivery(root,installed.id,installed.id,PRINCIPAL),rollback);
});

test("competing changes and edits after review prevent all upgrade writes",async t=>{
 const directory=await mkdtemp(join(tmpdir(),"axiom-delivery-"));t.after(()=>rm(directory,{recursive:true,force:true}));const root=join(directory,"package");const baseline=fixture();const init=await planDelivery(root,baseline,PRINCIPAL);await applyDeliveryPlan(init,init.digest,PRINCIPAL);
 const plan=await planDelivery(root,nextPack(baseline),PRINCIPAL);const path=join(root,"src/styles.css");await writeFile(path,(await readFile(path,"utf8"))+"\n/* user edit */");
 await assert.rejects(()=>applyDeliveryPlan(plan,plan.digest,PRINCIPAL),{code:DELIVERY_CODE.STALE});
 const conflict=await planDelivery(root,nextPack(baseline),PRINCIPAL);await assert.rejects(()=>applyDeliveryPlan(conflict,conflict.digest,PRINCIPAL),{code:DELIVERY_CODE.CONFLICT});assert.match(await readFile(path,"utf8"),/user edit/);
});

test("an interrupted journal blocks planning and checked recovery restores exact before bytes",async t=>{
 const directory=await mkdtemp(join(tmpdir(),"axiom-delivery-"));t.after(()=>rm(directory,{recursive:true,force:true}));const root=join(directory,"package");const plan=await planDelivery(root,fixture(),PRINCIPAL);
 await assert.rejects(()=>applyDeliveryPlan(plan,plan.digest,PRINCIPAL,{fault:phase=>{if(phase==="after-file")throw new Error("interrupted");}}),/interrupted/);
 assert.equal((await doctorDelivery(root,PRINCIPAL)).incomplete,true);await assert.rejects(()=>planDelivery(root,fixture(),PRINCIPAL),{code:DELIVERY_CODE.INCOMPLETE});await recoverDelivery(root,PRINCIPAL);assert.equal((await doctorDelivery(root,PRINCIPAL)).connected,false);
 const fresh=await planDelivery(root,fixture(),PRINCIPAL);await applyDeliveryPlan(fresh,fresh.digest,PRINCIPAL);assert.equal((await doctorDelivery(root,PRINCIPAL)).connected,true);
});

test("lost commit response replays its receipt and rollback refuses intervening user edits",async t=>{
 const directory=await mkdtemp(join(tmpdir(),"axiom-delivery-"));t.after(()=>rm(directory,{recursive:true,force:true}));const root=join(directory,"package");const plan=await planDelivery(root,fixture(),PRINCIPAL);
 await assert.rejects(()=>applyDeliveryPlan(plan,plan.digest,PRINCIPAL,{fault:phase=>{if(phase==="after-commit")throw new Error("lost response");}}),/lost response/);const receipt=await applyDeliveryPlan(plan,plan.digest,PRINCIPAL);
 await writeFile(join(root,"README.md"),"User owns these bytes");await assert.rejects(()=>rollbackDelivery(root,receipt.id,receipt.id,PRINCIPAL),{code:DELIVERY_CODE.STALE});
});

test("fresh export and scopes never overwrite or adopt an existing directory",async t=>{
 const directory=await mkdtemp(join(tmpdir(),"axiom-delivery-"));t.after(()=>rm(directory,{recursive:true,force:true}));const root=join(directory,"package");
 await assert.rejects(()=>exportTargetSource(root,fixture(),{id:"guest",scopes:[]}),{code:DELIVERY_CODE.AUTHORITY});await mkdir(root);await assert.rejects(()=>exportTargetSource(root,fixture(),PRINCIPAL),{code:DELIVERY_CODE.EXISTS});
 const output=await exportTargetSource(join(directory,"exported"),fixture(),PRINCIPAL);assert(output.files.includes("axiom.delivery.json"));
});

test("write failures release the owned lock and remove failed staging files",async t=>{
 const directory=await mkdtemp(join(tmpdir(),"axiom-delivery-"));t.after(()=>rm(directory,{recursive:true,force:true}));const probe=await open(join(directory,"probe"),"wx");const prototype=Object.getPrototypeOf(probe) as {writeFile:typeof probe.writeFile};const original=prototype.writeFile;await probe.close();
 for(const failAt of [1,2]){const root=join(directory,`failure-${failAt}`);const plan=await planDelivery(root,fixture(),PRINCIPAL);let calls=0;const mock=t.mock.method(prototype,"writeFile",async function(this:typeof probe,...args:Parameters<typeof probe.writeFile>){if(++calls===failAt)throw Object.assign(new Error("simulated full disk"),{code:"ENOSPC"});return original.apply(this,args);});
  await assert.rejects(()=>applyDeliveryPlan(plan,plan.digest,PRINCIPAL),/simulated full disk/);mock.mock.restore();
  const entries=await readdir(join(root,".axiom-delivery"));assert(!entries.includes("writer.lock"));assert(!entries.some(name=>name.startsWith("axiom-stage-")));await applyDeliveryPlan(plan,plan.digest,PRINCIPAL);
 }
});

test("recovery preserves an intervening edit after an interrupted file write",async t=>{
 const directory=await mkdtemp(join(tmpdir(),"axiom-delivery-"));t.after(()=>rm(directory,{recursive:true,force:true}));const root=join(directory,"package");const plan=await planDelivery(root,fixture(),PRINCIPAL);
 await assert.rejects(()=>applyDeliveryPlan(plan,plan.digest,PRINCIPAL,{fault:phase=>{if(phase==="after-file")throw new Error("stop");}}),/stop/);
 const pending=JSON.parse(await readFile(join(root,".axiom-delivery/pending.json"),"utf8")) as {changes:{path:string}[]};const changed=join(root,pending.changes[0]!.path);await writeFile(changed,"User changed this after the interrupted write");
 await assert.rejects(()=>recoverDelivery(root,PRINCIPAL),{code:DELIVERY_CODE.STALE});assert.equal(await readFile(changed,"utf8"),"User changed this after the interrupted write");
});
