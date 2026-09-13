import { open } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { CommandService, canonicalJson } from "../../../modules/ads-core/src/index.ts";
import { FileStore } from "../../../modules/local-store/src/index.ts";
import { generateTargetPack, TARGET_IDS } from "../../../modules/target-packs/src/index.ts";
import type { TargetId } from "../../../modules/target-packs/src/index.ts";
import { DELIVERY_CODE, MAX_DELIVERY_RECORD_BYTES } from "./constants.ts";
import type { DeliveryPlan } from "./contracts.ts";
import { DeliveryError } from "./delivery-error.ts";
import { exportTargetSource, applyDeliveryPlan, rollbackDelivery, recoverDelivery } from "./delivery-transaction.ts";
import { doctorDelivery, planDelivery } from "./delivery-plan.ts";
import { decodeRecord } from "./delivery-state.ts";

const CLI_OPTIONS = new Set(["store","out","root","target","package-name","actor","plan","review","receipt"]);
const COMMAND_OPTIONS:Record<string,readonly string[]>={export:["store","out","target","package-name","actor"],plan:["store","root","target","package-name","actor","out"],apply:["plan","review","actor"],doctor:["root","actor"],rollback:["root","receipt","review","actor"],recover:["root","review","actor"]};
const LOCAL_SCOPES = ["project.read","connection.read","connection.execute","review.apply","delivery.write"] as const;
const CLI_HELP = "delivery export --store DIR --out NEW_DIR --target react|react-native|swiftui|compose; plan --store DIR --root DIR --target TARGET --out NEW_PLAN_JSON; apply --plan FILE --review DIGEST; doctor --root DIR; rollback --root DIR --receipt ID --review ID; recover --root DIR --review rollback. Optional --actor ID and --package-name NAME. No command installs dependencies or publishes packages.";

/** Run the local owner's explicit delivery command; remote authorization is outside this CLI adapter. */
export async function runDelivery(args:readonly string[]):Promise<unknown>{
  const command=args[0];if(command==="help" || command==="--help" || command===undefined)return{usage:CLI_HELP};
  if(!["export","plan","apply","doctor","rollback","recover"].includes(command))throw new DeliveryError(DELIVERY_CODE.INVALID,CLI_HELP);
  const options=new Map<string,string>();for(let index=1;index<args.length;index+=2){const key=args[index]?.replace(/^--/,"");const value=args[index+1];if(!key || !args[index]?.startsWith("--") || !CLI_OPTIONS.has(key) || !value || value.startsWith("--") || options.has(key))throw new DeliveryError(DELIVERY_CODE.INVALID,"Options require unique --name value pairs");options.set(key,value);}
  if([...options.keys()].some(key=>!COMMAND_OPTIONS[command]!.includes(key)))throw new DeliveryError(DELIVERY_CODE.INVALID,"Option is not applicable to this delivery command");
  const required=(name:string):string=>{const value=options.get(name);if(!value)throw new DeliveryError(DELIVERY_CODE.INVALID,`Missing --${name}`);return value;};
  const principal={id:options.get("actor")??"local-owner",scopes:LOCAL_SCOPES};
  if(command==="doctor")return doctorDelivery(required("root"),principal);
  if(command==="recover"){if(required("review")!=="rollback")throw new DeliveryError(DELIVERY_CODE.AUTHORITY,"Recovery requires --review rollback");await recoverDelivery(required("root"),principal);return{recovered:true};}
  if(command==="rollback")return rollbackDelivery(required("root"),required("receipt"),required("review"),principal);
  if(command==="apply"){
    const path=required("plan");const handle=await open(path,"r");let text;try{const before=await handle.stat();if(!before.isFile() || before.size>MAX_DELIVERY_RECORD_BYTES)throw new DeliveryError(DELIVERY_CODE.INVALID,"Plan exceeds its regular-file size limit");const bytes=new Uint8Array(before.size+1);let length=0;while(length<bytes.length){const read=await handle.read(bytes,length,bytes.length-length,length);if(read.bytesRead===0)break;length+=read.bytesRead;}const after=await handle.stat();if(length!==before.size || before.size!==after.size || before.mtimeMs!==after.mtimeMs)throw new DeliveryError(DELIVERY_CODE.STALE,"Plan changed while reading");text=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes.subarray(0,length));}finally{await handle.close();}const plan=decodeRecord<DeliveryPlan>(text);return applyDeliveryPlan(plan,required("review"),principal);
  }
  const target=required("target");if(!TARGET_IDS.includes(target as TargetId))throw new DeliveryError(DELIVERY_CODE.INVALID,"Unknown target profile");
  const digest=(text:string):string=>createHash("sha256").update(text).digest("hex");
  const service=new CommandService(new FileStore(required("store")),{digest,createId:()=>`delivery-${randomUUID()}`});const project=await service.getProject(principal);if(!project)throw new DeliveryError(DELIVERY_CODE.INVALID,"Source store has no project");
  const packageName=options.get("package-name");const generated=generateTargetPack(project,{target:target as TargetId,...(packageName?{packageName}: {})},digest);if(!generated.valid || !generated.pack)return{valid:false,diagnostics:generated.diagnostics};
  if(command==="export")return exportTargetSource(required("out"),generated.pack,principal);
  const plan=await planDelivery(required("root"),generated.pack,principal);const handle=await open(required("out"),"wx");try{await handle.writeFile(canonicalJson(plan,MAX_DELIVERY_RECORD_BYTES));await handle.sync();}finally{await handle.close();}
  return {planFile:required("out"),kind:plan.kind,digest:plan.digest,conflicts:plan.comparison?.conflicts??[],files:plan.comparison?.files.map(({path,action})=>({path,action}))??plan.next.files.map(({path})=>({path,action:"create"})),verification:"source-only; dependency installation and platform execution not run"};
}
