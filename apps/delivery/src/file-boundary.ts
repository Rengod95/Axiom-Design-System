import { lstat, realpath, mkdir, open, readFile, unlink, rename } from "node:fs/promises";
import { dirname, isAbsolute, parse, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { validateSourcePath, TARGET_LIMITS } from "../../../modules/target-packs/src/index.ts";
import { DELIVERY_CODE, MAX_DELIVERY_RECORD_BYTES } from "./constants.ts";
import { DeliveryError } from "./delivery-error.ts";

/** Test ENOENT only; permission failures never masquerade as a missing file. */
export function missing(error: unknown): boolean { return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT"; }

interface DirectoryReader {
  lstat(path:string):Promise<{isDirectory():boolean;isSymbolicLink():boolean}>;
  realpath(path:string):Promise<string>;
}

/** Reject links on the supplied ancestor chain, then expand its nearest existing directory's canonical spelling. */
export async function safeRoot(input: string, reader:DirectoryReader={lstat,realpath}): Promise<string> {
  if (typeof input !== "string" || !input.trim() || input.includes("\0")) throw new DeliveryError(DELIVERY_CODE.PATH,"Delivery requires an explicit directory");
  const root=resolve(input); if(root===parse(root).root) throw new DeliveryError(DELIVERY_CODE.PATH,"A filesystem root is not a delivery directory");
  const ancestors:string[]=[]; for(let path=root;;path=dirname(path)){ancestors.push(path);if(path===dirname(path))break;}
  let nearest:string|undefined;
  for(const path of ancestors.reverse()) { try { const info=await reader.lstat(path); if(info.isSymbolicLink() || !info.isDirectory()) throw new DeliveryError(DELIVERY_CODE.PATH,"Delivery ancestors must be ordinary directories");nearest=path; } catch(error) {if(!missing(error))throw error;} }
  if(nearest===undefined)throw new DeliveryError(DELIVERY_CODE.PATH,"Delivery path has no existing filesystem ancestor");
  // Windows 8.3 names identify ordinary directories; their expanded spelling is not a symlink.
  // Resolve only the observed ancestor and append missing components, so fresh output roots work too.
  return resolve(await reader.realpath(nearest),relative(nearest,root));
}

/** Resolve a portable relative source path inside its explicitly selected root. */
export async function safeFile(root:string,path:string):Promise<string>{
  validateSourcePath(path);const output=resolve(root,...path.split("/"));const difference=relative(root,output);
  if(!difference || isAbsolute(difference) || difference===".." || difference.startsWith(`..${sep}`))throw new DeliveryError(DELIVERY_CODE.PATH,"File escapes delivery root");
  await safeRoot(dirname(output));
  try{const info=await lstat(output);if(!info.isFile() || info.isSymbolicLink() || info.nlink!==1)throw new DeliveryError(DELIVERY_CODE.PATH,"Delivery files must be ordinary unshared files");}catch(error){if(!missing(error))throw error;}
  return output;
}

/** Read a stable UTF-8 file with a bound before and after its opened handle is consumed. */
export async function readSource(root:string,path:string):Promise<string|null>{
  const full=await safeFile(root,path);let handle;try{handle=await open(full,"r");}catch(error){if(missing(error))return null;throw error;}
  try{const before=await handle.stat();if(!before.isFile() || before.nlink!==1 || before.size>TARGET_LIMITS.maxFileBytes)throw new DeliveryError(DELIVERY_CODE.PATH,"Delivery source file exceeds its regular-file boundary");const data=new Uint8Array(before.size+1);let bytesRead=0;while(bytesRead<data.length){const read=await handle.read(data,bytesRead,data.length-bytesRead,bytesRead);if(read.bytesRead===0)break;bytesRead+=read.bytesRead;}const after=await handle.stat();if(bytesRead!==before.size || before.size!==after.size || before.mtimeMs!==after.mtimeMs || before.ino!==after.ino)throw new DeliveryError(DELIVERY_CODE.STALE,"Delivery file changed during inspection");try{return new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(data.subarray(0,bytesRead));}catch(error){throw new DeliveryError(DELIVERY_CODE.INVALID,"Delivery file is not valid UTF-8",{cause:error});}}finally{await handle.close();}
}

/** Read adapter-owned JSON with a separate, larger journal bound. */
export async function readControl(root:string,name:string):Promise<string|null>{
  const full=await safeFile(root,name);let info;try{info=await lstat(full);}catch(error){if(missing(error))return null;throw error;}
  if(info.size>MAX_DELIVERY_RECORD_BYTES)throw new DeliveryError(DELIVERY_CODE.CORRUPT,"Delivery record exceeds its bound");
  const data=await readFile(full);if(data.length>MAX_DELIVERY_RECORD_BYTES)throw new DeliveryError(DELIVERY_CODE.CORRUPT,"Delivery record changed beyond its bound");return new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(data);
}

/** Write through a fresh file and same-directory rename after the caller's stale check. */
export async function replaceText(root:string,path:string,text:string|null):Promise<void>{
  const full=await safeFile(root,path);if(text===null){try{await unlink(full);}catch(error){if(!missing(error))throw error;}return;}
  await mkdir(dirname(full),{recursive:true});await safeRoot(dirname(full));
  const staging=resolve(dirname(full),`axiom-stage-${randomUUID()}`);const handle=await open(staging,"wx");
  try{try{await handle.writeFile(text,"utf8");await handle.sync();}finally{await handle.close();}await safeFile(root,path);await rename(staging,full);}catch(error){try{await unlink(staging);}catch{}throw error;}
}
