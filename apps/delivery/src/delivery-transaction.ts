import { mkdir, lstat, open, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { hostname } from "node:os";
import { canonicalJson } from "../../../modules/ads-core/src/index.ts";
import type { Principal } from "../../../modules/ads-core/src/index.ts";
import { getTargetFiles, inspectSourceFiles } from "../../../modules/target-packs/src/index.ts";
import type { TargetPack } from "../../../modules/target-packs/src/index.ts";
import { DELIVERY_CODE, DELIVERY_DIRECTORY, DELIVERY_FILES, DELIVERY_FORMAT_VERSION, DELIVERY_SCOPES, MAX_DELIVERY_RECORD_BYTES } from "./constants.ts";
import type { DeliveryChange, DeliveryConnection, DeliveryOptions, DeliveryPlan, DeliveryReceipt } from "./contracts.ts";
import { DeliveryError } from "./delivery-error.ts";
import { missing, readControl, readSource, replaceText, safeFile, safeRoot } from "./file-boundary.ts";
import { authorize, decodeRecord, DELIVERY_DIGEST, readConnection, readReceipt, withDeliveryLock } from "./delivery-state.ts";
import { planDelivery } from "./delivery-plan.ts";

const recordText=(value:unknown):string=>canonicalJson(value,MAX_DELIVERY_RECORD_BYTES);

async function assertChanges(root:string,changes:readonly DeliveryChange[],side:"before"|"after"):Promise<void>{
  for(const change of changes)if(await readSource(root,change.path)!==change[side])throw new DeliveryError(DELIVERY_CODE.STALE,`File changed since review: ${change.path}`);
}

/** The journal is durable before file writes; incomplete operations require explicit checked recovery. */
async function commitDelivery(root:string,receipt:DeliveryReceipt,options:DeliveryOptions):Promise<DeliveryReceipt>{
  const control=resolve(root,DELIVERY_DIRECTORY);
  if(await readControl(control,DELIVERY_FILES.pending)!==null)throw new DeliveryError(DELIVERY_CODE.INCOMPLETE,"An interrupted delivery journal already exists");
  await assertChanges(root,receipt.changes,"before");
  await replaceText(control,DELIVERY_FILES.pending,recordText(receipt));options.fault?.("after-prepare");
  for(const change of receipt.changes){if(await readSource(root,change.path)!==change.before)throw new DeliveryError(DELIVERY_CODE.STALE,`File changed immediately before apply: ${change.path}`);await replaceText(root,change.path,change.after);options.fault?.("after-file");}
  await replaceText(control,`${DELIVERY_FILES.receipts}/${receipt.id}.json`,recordText(receipt));
  await replaceText(control,DELIVERY_FILES.state,receipt.after===null?null:recordText(receipt.after));
  await replaceText(control,DELIVERY_FILES.pending,null);options.fault?.("after-commit");return receipt;
}

/** Apply exactly the displayed plan under current execute/review authority and a writer lock. */
export async function applyDeliveryPlan(plan:DeliveryPlan,reviewedDigest:string,principal:Principal,options:DeliveryOptions={}):Promise<DeliveryReceipt>{
  const actorId=authorize(principal,[DELIVERY_SCOPES.plan,DELIVERY_SCOPES.execute,DELIVERY_SCOPES.review]);const identity:Principal={id:actorId,scopes:[DELIVERY_SCOPES.plan,DELIVERY_SCOPES.execute,DELIVERY_SCOPES.review]};
  const proposed=decodeRecord<DeliveryPlan>(recordText(plan));
  if(proposed.actorId!==actorId || proposed.digest!==reviewedDigest)throw new DeliveryError(DELIVERY_CODE.AUTHORITY,"Apply requires the current actor's exact reviewed plan digest");
  const root=await safeRoot(proposed.root);
  return withDeliveryLock(root,async()=>{
    const oldReceipt=await readReceipt(root,proposed.digest);
    if(oldReceipt){if(oldReceipt.actorId!==actorId || oldReceipt.planDigest!==proposed.digest)throw new DeliveryError(DELIVERY_CODE.AUTHORITY,"Receipt belongs to another actor or request");await assertChanges(root,oldReceipt.changes,"after");if(recordText(await readConnection(root))!==recordText(oldReceipt.after))throw new DeliveryError(DELIVERY_CODE.STALE,"Receipt replay no longer matches installed state");return oldReceipt;}
    const fresh=await planDelivery(root,proposed.next,identity);
    if(fresh.digest!==proposed.digest)throw new DeliveryError(DELIVERY_CODE.STALE,"Delivery plan is stale or was altered after review");
    if(fresh.comparison?.conflicts.length)throw new DeliveryError(DELIVERY_CODE.CONFLICT,"Competing user/generated edits require manual resolution before applying a whole-file upgrade");
    const current=new Map(fresh.current.map(file=>[file.path,file.text]));const next=getTargetFiles(fresh.next,DELIVERY_DIGEST);const changes:DeliveryChange[]=[];
    if(fresh.comparison)for(const file of fresh.comparison.files){const after=file.action==="preserve" || file.action==="unchanged"?file.current:file.generated;if(after!==file.current)changes.push({path:file.path,before:file.current,after});if(after===null)current.delete(file.path);else current.set(file.path,after);}
    else for(const file of next){changes.push({path:file.path,before:null,after:file.text});current.set(file.path,file.text);}
    const after:DeliveryConnection={formatVersion:DELIVERY_FORMAT_VERSION,baseline:fresh.next,installedRelease:null,generatedRelease:fresh.next.manifest.source.revision,installedHashes:Object.fromEntries([...current].map(([path,text])=>[path,DELIVERY_DIGEST(text)])),lastReceipt:fresh.digest,verification:"source-installed-unverified"};
    const receipt:DeliveryReceipt={formatVersion:DELIVERY_FORMAT_VERSION,id:fresh.digest,planDigest:fresh.digest,actorId,kind:fresh.kind,before:fresh.before,after,changes,validation:"source-installed-unverified"};
    return commitDelivery(root,receipt,options);
  });
}

/** Restore one receipt only when neither installed bytes nor connection metadata changed afterward. */
export async function rollbackDelivery(directory:string,receiptId:string,reviewedDigest:string,principal:Principal,options:DeliveryOptions={}):Promise<DeliveryReceipt>{
  const actorId=authorize(principal,[DELIVERY_SCOPES.execute,DELIVERY_SCOPES.review]);if(reviewedDigest!==receiptId)throw new DeliveryError(DELIVERY_CODE.AUTHORITY,"Rollback requires explicit review of the original receipt");const root=await safeRoot(directory);
  return withDeliveryLock(root,async()=>{
    const rollbackId=DELIVERY_DIGEST(recordText({operation:"rollback",receiptId,actorId}));const replay=await readReceipt(root,rollbackId);
    if(replay){if(replay.actorId!==actorId || replay.planDigest!==receiptId)throw new DeliveryError(DELIVERY_CODE.AUTHORITY,"Rollback receipt belongs to another request");await assertChanges(root,replay.changes,"after");if(recordText(await readConnection(root))!==recordText(replay.after))throw new DeliveryError(DELIVERY_CODE.STALE,"Rollback replay no longer matches installed state");return replay;}
    const original=await readReceipt(root,receiptId);if(!original)throw new DeliveryError(DELIVERY_CODE.INVALID,"Rollback receipt does not exist");if(original.actorId!==actorId)throw new DeliveryError(DELIVERY_CODE.AUTHORITY,"Only the receipt owner can roll back this bounded connection");
    if(recordText(await readConnection(root))!==recordText(original.after))throw new DeliveryError(DELIVERY_CODE.STALE,"Another delivery changed this connection after the receipt");
    await assertChanges(root,original.changes,"after");
    const id=rollbackId;const after=original.before===null?null:{...original.before,lastReceipt:id};
    return commitDelivery(root,{formatVersion:DELIVERY_FORMAT_VERSION,id,planDigest:receiptId,actorId,kind:"rollback",before:original.after,after,changes:original.changes.map(change=>({path:change.path,before:change.after,after:change.before})),validation:"source-installed-unverified"},options);
  });
}

/** Recover a interrupted journal by restoring only bytes that are still a known before/after version. */
export async function recoverDelivery(directory:string,principal:Principal):Promise<void>{
  authorize(principal,[DELIVERY_SCOPES.execute,DELIVERY_SCOPES.review]);const root=await safeRoot(directory);const control=resolve(root,DELIVERY_DIRECTORY);
  const lockText=await readControl(control,DELIVERY_FILES.lock);
  if(lockText!==null){const lock=decodeRecord<{processId:number;host:string}>(lockText);if(!Number.isSafeInteger(lock.processId) || lock.processId<=0 || typeof lock.host!=="string")throw new DeliveryError(DELIVERY_CODE.CORRUPT,"Writer lock is malformed");if(lock.host!==hostname())throw new DeliveryError(DELIVERY_CODE.LOCKED,"The interrupted writer belongs to another host");let alive=true;try{process.kill(lock.processId,0);}catch(error){if(error && typeof error==="object" && "code" in error && error.code==="ESRCH")alive=false;else throw error;}if(alive)throw new DeliveryError(DELIVERY_CODE.LOCKED,"The lock's writer process is still alive");await unlink(resolve(control,DELIVERY_FILES.lock));}
  await withDeliveryLock(root,async()=>{
    const pending=await readControl(control,DELIVERY_FILES.pending);if(pending===null)return;
    const receipt=decodeRecord<DeliveryReceipt>(pending);if(receipt.formatVersion!==DELIVERY_FORMAT_VERSION || !Array.isArray(receipt.changes))throw new DeliveryError(DELIVERY_CODE.CORRUPT,"Interrupted receipt is malformed");
    inspectSourceFiles(receipt.changes.map(change=>({path:change.path,text:change.before??change.after??""})));
    for(const change of receipt.changes){const current=await readSource(root,change.path);if(current!==change.before && current!==change.after)throw new DeliveryError(DELIVERY_CODE.STALE,`Intervening user changes block recovery: ${change.path}`);}
    const connection=await readConnection(root);if(recordText(connection)!==recordText(receipt.before) && recordText(connection)!==recordText(receipt.after))throw new DeliveryError(DELIVERY_CODE.STALE,"Intervening connection changes block recovery");
    for(const change of [...receipt.changes].reverse()){const current=await readSource(root,change.path);if(current!==change.before && current!==change.after)throw new DeliveryError(DELIVERY_CODE.STALE,`File changed immediately before recovery: ${change.path}`);await replaceText(root,change.path,change.before);}
    await replaceText(control,DELIVERY_FILES.state,receipt.before===null?null:recordText(receipt.before));
    if(await readReceipt(root,receipt.id)!==null){await replaceText(control,`recovered/${receipt.id}.json`,recordText(receipt));await replaceText(control,`${DELIVERY_FILES.receipts}/${receipt.id}.json`,null);}
    await replaceText(control,DELIVERY_FILES.pending,null);
  });
}

/** Write user-owned source into a newly created directory; existing files are never adopted or overwritten. */
export async function exportTargetSource(directory:string,pack:TargetPack,principal:Principal):Promise<{root:string;files:string[]}>{
  authorize(principal,[DELIVERY_SCOPES.export]);const files=getTargetFiles(pack,DELIVERY_DIGEST);const root=await safeRoot(directory);
  try{await lstat(root);throw new DeliveryError(DELIVERY_CODE.EXISTS,"Fresh source export requires a new output directory");}catch(error){if(!missing(error))throw error;}
  await mkdir(root);const written:string[]=[];
  try{for(const file of files){const full=await safeFile(root,file.path);await mkdir(resolve(full,".."),{recursive:true});await safeRoot(resolve(full,".."));const handle=await open(full,"wx");try{await handle.writeFile(file.text,"utf8");await handle.sync();}finally{await handle.close();}written.push(file.path);}return{root,files:written};}catch(error){throw new DeliveryError(DELIVERY_CODE.IO,`Source export stopped after ${written.length} files; inspect the new directory before retrying`,{cause:error});}
}
