import { createHash } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { hostname } from "node:os";
import { canonicalJson } from "../../../modules/ads-core/src/index.ts";
import type { Principal } from "../../../modules/ads-core/src/index.ts";
import { inspectTargetPack } from "../../../modules/target-packs/src/index.ts";
import { DELIVERY_CODE, DELIVERY_DIRECTORY, DELIVERY_FILES, DELIVERY_FORMAT_VERSION, MAX_DELIVERY_RECORD_BYTES } from "./constants.ts";
import type { DeliveryConnection, DeliveryReceipt } from "./contracts.ts";
import { DeliveryError } from "./delivery-error.ts";
import { readControl, safeRoot } from "./file-boundary.ts";

export const DELIVERY_DIGEST = (text:string):string=>createHash("sha256").update(text,"utf8").digest("hex");
/** Snapshot caller authority before asynchronous host I/O. */
export function authorize(principal:Principal,scopes:readonly string[]):string {
  const value=JSON.parse(canonicalJson(principal)) as Principal;
  if(!value || typeof value.id!=="string" || !value.id || !Array.isArray(value.scopes) || scopes.some(scope=>!value.scopes.includes(scope)))throw new DeliveryError(DELIVERY_CODE.AUTHORITY,"Current principal lacks the required delivery scope");return value.id;
}

/** Canonical journals reject duplicate, noncanonical or lossy persisted data. */
export function decodeRecord<T>(text:string):T {
  try{const value:unknown=JSON.parse(text);if(canonicalJson(value,MAX_DELIVERY_RECORD_BYTES)!==text)throw new Error("Noncanonical delivery record");return value as T;}catch(error){throw new DeliveryError(DELIVERY_CODE.CORRUPT,"Delivery record is malformed",{cause:error});}
}

/** Keep the immutable generator baseline distinct from hashes of user-installed bytes. */
export async function readConnection(root:string):Promise<DeliveryConnection|null>{
  const text=await readControl(resolve(root,DELIVERY_DIRECTORY),DELIVERY_FILES.state);if(text===null)return null;
  const value=decodeRecord<DeliveryConnection>(text);
  if(value.formatVersion!==DELIVERY_FORMAT_VERSION || value.installedRelease!==null || typeof value.generatedRelease!=="string" || typeof value.lastReceipt!=="string" || !value.installedHashes || value.verification!=="source-installed-unverified")throw new DeliveryError(DELIVERY_CODE.CORRUPT,"Delivery connection shape is invalid");
  inspectTargetPack(value.baseline,DELIVERY_DIGEST);return value;
}

/** Load a bounded receipt only by its canonical SHA-256 identifier. */
export async function readReceipt(root:string,id:string):Promise<DeliveryReceipt|null>{
  if(!/^[a-f0-9]{64}$/.test(id))throw new DeliveryError(DELIVERY_CODE.INVALID,"Receipt identifier must be a SHA-256 digest");
  const text=await readControl(resolve(root,DELIVERY_DIRECTORY),`${DELIVERY_FILES.receipts}/${id}.json`);return text===null?null:decodeRecord<DeliveryReceipt>(text);
}

/** Serialize cooperating delivery adapters; arbitrary external editor writes are checked separately. */
export async function withDeliveryLock<T>(root:string,work:()=>Promise<T>):Promise<T>{
  const control=resolve(root,DELIVERY_DIRECTORY);await mkdir(control,{recursive:true});await safeRoot(control);
  const path=resolve(control,DELIVERY_FILES.lock);let handle;
  try{handle=await open(path,"wx");await handle.writeFile(canonicalJson({processId:process.pid,host:hostname()}));await handle.sync();}catch(error){if(handle){await handle.close();await unlink(path);}if(error && typeof error==="object" && "code" in error && error.code==="EEXIST")throw new DeliveryError(DELIVERY_CODE.LOCKED,"Another delivery writer or interrupted writer owns this connection");throw error;}
  try{return await work();}finally{await handle.close();await unlink(path);}
}
