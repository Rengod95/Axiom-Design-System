import { runDelivery } from "./cli.ts";
import { DELIVERY_CODE } from "./constants.ts";

try {
  const result=await runDelivery(process.argv.slice(2));
  console.log(JSON.stringify(result,null,2));
  if(result && typeof result==="object" && "valid" in result && result.valid===false)process.exitCode=1;
} catch(error) {
  const diagnostic=error && typeof error==="object" && "toDiagnostic" in error && typeof error.toDiagnostic==="function"?error.toDiagnostic():{code:DELIVERY_CODE.IO,phase:"state",severity:"error",message:error instanceof Error?error.message:String(error)};
  console.error(JSON.stringify({valid:false,diagnostics:[diagnostic]}));process.exitCode=1;
}
