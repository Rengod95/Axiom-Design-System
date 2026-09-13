import assert from "node:assert/strict";
import test from "node:test";
import { lstat, mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { safeRoot } from "../src/file-boundary.ts";
import { DELIVERY_CODE } from "../src/index.ts";

test("short directory spelling and missing tails resolve to the same canonical delivery root",async()=>{
  const volume=parse(resolve(tmpdir())).root;const short=join(volume,"Users","RUNNER~1","AppData","Local","Temp");const long=join(volume,"Users","runner administrator","AppData","Local","Temp");const seen:string[]=[];
  const reader={async lstat(path:string){seen.push(path);if(path.startsWith(`${short}/pending`)||path.startsWith(`${short}\\pending`)||path.startsWith(`${long}/pending`)||path.startsWith(`${long}\\pending`))throw Object.assign(new Error("missing"),{code:"ENOENT"});return{isDirectory:()=>true,isSymbolicLink:()=>false};},async realpath(path:string){assert([short,long].includes(path));return long;}};
  assert.equal(await safeRoot(short,reader),long);assert.equal(await safeRoot(join(short,"pending","package"),reader),join(long,"pending","package"));assert.equal(await safeRoot(join(long,"pending","package"),reader),join(long,"pending","package"));
  for(let ancestor=short;;ancestor=dirname(ancestor)){assert(seen.includes(ancestor),`Original ancestor must be checked: ${ancestor}`);if(ancestor===dirname(ancestor))break;}
});

test("canonical spelling never bypasses a junction on the original ancestor chain",async()=>{
  const root=resolve(tmpdir(),"RUNNER~1","linked","pending");const link=dirname(root);let resolved=false;
  await assert.rejects(()=>safeRoot(root,{async lstat(path){if(path===root)throw Object.assign(new Error("missing"),{code:"ENOENT"});return{isDirectory:()=>true,isSymbolicLink:()=>path===link};},async realpath(path){resolved=true;return path;}}),{code:DELIVERY_CODE.PATH});assert.equal(resolved,false);
});

test("ordinary directories canonicalize while a real junction cannot redirect fresh delivery output",async t=>{
  const temporary=await mkdtemp(join(tmpdir(),"axiom-delivery-path-"));const directory=await realpath(temporary);t.after(()=>rm(directory,{recursive:true,force:true}));const target=join(directory,"target");await mkdir(target);const link=join(directory,"linked");await symlink(target,link,"junction");
  assert.equal(await safeRoot(join(temporary,"fresh","package")),join(directory,"fresh","package"));await assert.rejects(()=>safeRoot(join(link,"fresh","package")),{code:DELIVERY_CODE.PATH});
});

test("an existing Windows short-name directory expands without creating files inside it",async()=>{
  if(process.platform!=="win32")return;
  const short=join(parse(resolve(tmpdir())).root,"PROGRA~1");let info;try{info=await lstat(short);}catch(error){if(error&&typeof error==="object"&&"code" in error&&error.code==="ENOENT")return;throw error;}
  assert(info.isDirectory()&&!info.isSymbolicLink());const expanded=await realpath(short);assert.equal(await safeRoot(short),expanded);assert.equal(await safeRoot(join(short,"axiom-absent-path-check","pending")),join(expanded,"axiom-absent-path-check","pending"));
});
