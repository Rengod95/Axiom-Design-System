import { resolve } from "node:path";
import { canonicalJson } from "../../../modules/ads-core/src/index.ts";
import type { Principal } from "../../../modules/ads-core/src/index.ts";
import { getTargetFiles, inspectSourceFiles, inspectTargetPack, planUpgrade, TARGET_MANIFEST_FILE } from "../../../modules/target-packs/src/index.ts";
import type { TargetPack } from "../../../modules/target-packs/src/index.ts";
import { DELIVERY_CODE, DELIVERY_DIRECTORY, DELIVERY_FILES, DELIVERY_FORMAT_VERSION, DELIVERY_SCOPES, MAX_DELIVERY_RECORD_BYTES } from "./constants.ts";
import type { DeliveryDoctor, DeliveryPlan } from "./contracts.ts";
import { DeliveryError } from "./delivery-error.ts";
import { readControl, readSource, safeRoot } from "./file-boundary.ts";
import { authorize, DELIVERY_DIGEST, readConnection } from "./delivery-state.ts";

/** Read source files only; doctor never installs dependencies, runs commands or repairs state. */
export async function doctorDelivery(directory:string,principal:Principal):Promise<DeliveryDoctor>{
  authorize(principal,[DELIVERY_SCOPES.plan]);const root=await safeRoot(directory);const connection=await readConnection(root);const incomplete=await readControl(resolve(root,DELIVERY_DIRECTORY),DELIVERY_FILES.pending)!==null;
  const files:DeliveryDoctor["files"]=[];
  if(connection)for(const file of getTargetFiles(connection.baseline,DELIVERY_DIGEST)){const current=await readSource(root,file.path);const actualDigest=current===null?null:DELIVERY_DIGEST(current);files.push({path:file.path,status:current===null?"missing":actualDigest===DELIVERY_DIGEST(file.text)?"unchanged":"user-modified",expectedDigest:DELIVERY_DIGEST(file.text),actualDigest});}
  return {root,connected:connection!==null,incomplete,sourceRevision:connection?.generatedRelease??null,files,dependencies:connection?.baseline.manifest.target.dependencies??{},execution:"not-run"};
}

/** Produce a reviewable, source-only init/upgrade plan without mutating the target directory. */
export async function planDelivery(directory:string,next:TargetPack,principal:Principal):Promise<DeliveryPlan>{
  const actorId=authorize(principal,[DELIVERY_SCOPES.plan]);const target=inspectTargetPack(next,DELIVERY_DIGEST);const root=await safeRoot(directory);const before=await readConnection(root);
  if(await readControl(resolve(root,DELIVERY_DIRECTORY),DELIVERY_FILES.pending)!==null)throw new DeliveryError(DELIVERY_CODE.INCOMPLETE,"An interrupted delivery must be recovered before planning");
  const paths=[...new Set([...getTargetFiles(target,DELIVERY_DIGEST).map(file=>file.path),...(before?getTargetFiles(before.baseline,DELIVERY_DIGEST).map(file=>file.path):[])])].sort();
  const current=[];for(const path of paths){const text=await readSource(root,path);if(text!==null)current.push({path,text});}
  inspectSourceFiles(current);
  if(!before && current.length>0)throw new DeliveryError(DELIVERY_CODE.EXISTS,"Init cannot overwrite existing files or infer their generated baseline");
  const comparison=before?planUpgrade(before.baseline,current,target,DELIVERY_DIGEST):null;
  if(before && !paths.includes(TARGET_MANIFEST_FILE))throw new DeliveryError(DELIVERY_CODE.CORRUPT,"Connected delivery lacks its manifest");
  const body={formatVersion:DELIVERY_FORMAT_VERSION,kind:before?"upgrade" as const:"init" as const,root,actorId,before,next:target,current,comparison};
  return {...body,digest:DELIVERY_DIGEST(canonicalJson(body,MAX_DELIVERY_RECORD_BYTES))};
}
