import { canonicalJson } from "../../ads-core/src/index.ts";
import { DIGEST_PATTERN, TARGET_CODE, TARGET_DEPENDENCIES, TARGET_IDS, TARGET_PACK_VERSION } from "./constants.ts";
import type { TargetId } from "./contracts.ts";
import { TargetError } from "./target-error.ts";

const PHASES=["parse","envelope","authorization","command","reference","review","history","document","state"];
const FILE_KINDS=["source","style","configuration","documentation"];
function record(value:unknown,required:readonly string[],optional:readonly string[]=[]):value is Record<string,unknown>{return !!value && typeof value==="object" && !Array.isArray(value) && required.every(key=>Object.hasOwn(value,key)) && Object.keys(value).every(key=>required.includes(key)||optional.includes(key));}
function nonempty(value:unknown):value is string{return typeof value==="string"&&value.length>0&&value.length<=4096;}
function stringMap(value:unknown):boolean{return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.entries(value).every(([key,item])=>nonempty(key)&&nonempty(item));}
function strings(value:unknown):boolean{return Array.isArray(value)&&value.every(nonempty);}
function metadataFile(value:unknown):boolean{return record(value,["path","digest","kind"])&&nonempty(value.path)&&typeof value.digest==="string"&&DIGEST_PATTERN.test(value.digest)&&typeof value.kind==="string"&&FILE_KINDS.includes(value.kind);}
function diagnostic(value:unknown):boolean{return record(value,["code","phase","severity","message"],["sourceRef","path"])&&nonempty(value.code)&&nonempty(value.message)&&typeof value.phase==="string"&&PHASES.includes(value.phase)&&(value.severity==="info"||value.severity==="warning")&&(value.sourceRef===undefined||typeof value.sourceRef==="string")&&(value.path===undefined||typeof value.path==="string");}

/** Require the exact versioned manifest shape; declarations never substitute for executed evidence. */
export function validatePackShape(value:unknown):void{
  const fail=():never=>{throw new TargetError(TARGET_CODE.INVALID,"Target pack requires a complete supported manifest and diagnostic shape");};
  if(!record(value,["manifest","files","diagnostics"])||!Array.isArray(value.files)||value.files.length===0||!Array.isArray(value.diagnostics)||!value.diagnostics.every(diagnostic))fail();
  const pack=value as Record<string,unknown>;const manifest=pack.manifest;
  if(!record(manifest,["formatVersion","generator","source","target","files","publicApiMap","capabilities","limitations","verification","conversionPolicy"]))fail();
  const data=manifest as Record<string,unknown>;
  if(data.formatVersion!==TARGET_PACK_VERSION||!record(data.generator,["id","version"])||data.generator.id!=="axiom.target-packs"||data.generator.version!==TARGET_PACK_VERSION)fail();
  if(!record(data.source,["projectId","revision","digest","themeContexts"])||!nonempty(data.source.projectId)||!nonempty(data.source.revision)||typeof data.source.digest!=="string"||!DIGEST_PATTERN.test(data.source.digest)||!stringMap(data.source.themeContexts))fail();
  if(!record(data.target,["id","version","dependencies","licenses"])||typeof data.target.id!=="string"||!TARGET_IDS.includes(data.target.id as TargetId)||data.target.version!==TARGET_PACK_VERSION||!stringMap(data.target.dependencies)||!stringMap(data.target.licenses))fail();
  const target=data.target as {id:TargetId;dependencies:Record<string,string>;licenses:Record<string,string>};
  if(canonicalJson(target.dependencies)!==canonicalJson(TARGET_DEPENDENCIES[target.id])||canonicalJson(Object.keys(target.licenses).sort())!==canonicalJson(Object.keys(target.dependencies).sort()))fail();
  if(!Array.isArray(data.files)||!data.files.every(metadataFile)||!stringMap(data.publicApiMap)||!strings(data.capabilities)||!strings(data.limitations))fail();
  if(!record(data.verification,["generated","typechecked","runtime"])||data.verification.generated!=="passed"||data.verification.typechecked!=="not-run"||data.verification.runtime!=="not-run")fail();
  if(!record(data.conversionPolicy,["color","dimension","motion"])||!Object.values(data.conversionPolicy).every(nonempty))fail();
  for(const file of pack.files as unknown[])if(!record(file,["path","text","kind","digest"])||typeof file.text!=="string"||!metadataFile({path:file.path,kind:file.kind,digest:file.digest}))fail();
}
