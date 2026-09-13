import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { build } from "esbuild";
import React from "react";
import { renderToString } from "react-dom/server";
import { canonicalJson, createStudioStarter } from "../modules/ads-core/src/index.ts";
import { generateTargetPack, getTargetFiles, TARGET_IDS, TARGET_DEPENDENCIES } from "../modules/target-packs/src/index.ts";
import { browserPath, launch, terminate, within } from "./browser-driver.mjs";

const ROOT=resolve(fileURLToPath(new URL("..",import.meta.url)));
const OUTPUT=join(ROOT,"dist/target-verification");
const HASH=text=>createHash("sha256").update(text).digest("hex");
const TSC=fileURLToPath(import.meta.resolve("typescript/bin/tsc"));
const evidence={kind:"axiom-target-consumer-verification",status:"FAILED",node:process.version,platform:process.platform,targets:{},limitations:["Only Button, plain Card and controlled Toast in the explicit Studio profile are covered.","RN export verifies JavaScript/Hermes bundles; it does not run native controls or assistive technology.","SwiftUI/Compose compilation and device execution are not run without their toolchains."]};

async function writeFiles(directory,files){for(const file of files){const path=resolve(directory,file.path);assert(within(directory,path));await mkdir(dirname(path),{recursive:true});await writeFile(path,file.text,"utf8");}}
async function run(executable,args,cwd){await new Promise((accept,reject)=>{let command=executable;let parameters=args;if(process.platform==="win32"&&executable==="pnpm"){assert(args.every(argument=>/^[A-Za-z0-9./_-]+$/.test(argument)),"Only fixed, shell-safe pnpm verification arguments are accepted");command=process.env.ComSpec??"cmd.exe";parameters=["/d","/s","/c",`pnpm ${args.join(" ")}`];}const child=spawn(command,parameters,{cwd,stdio:"inherit",windowsHide:true,env:{...process.env,CI:"1"}});child.once("error",reject);child.once("exit",code=>code===0?accept():reject(new Error(`${executable} ${args.join(" ")} failed with ${code}`)));});}
async function waitFor(page,expression){const deadline=Date.now()+15000;while(Date.now()<deadline){if(await page.evaluate(expression))return;await delay(30);}throw new Error(`Browser condition timed out: ${expression}`);}
async function click(page,selector){const point=await page.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await page.send("Input.dispatchMouseEvent",{type:"mousePressed",...point,button:"left",clickCount:1});await page.send("Input.dispatchMouseEvent",{type:"mouseReleased",...point,button:"left",clickCount:1});}

async function webConsumer(pack,directory){
 await run(process.execPath,[TSC,"-p","tsconfig.json"],directory);
 const components=await import(pathToFileURL(join(directory,"dist/index.js")).href);
 const button=components[pack.manifest.publicApiMap["component.button"]];const card=components[pack.manifest.publicApiMap["component.card"]];const toast=components[pack.manifest.publicApiMap["component.toast"]];
 const escaped=renderToString(React.createElement(button,{label:'<img src=x onerror="throw 1"> 한글',onActivate(){}}));assert(escaped.includes("&lt;img"));assert(!escaped.includes("<img"));
 const plain=renderToString(React.createElement(card,{body:"Required body"}));assert(!plain.includes("tabindex"));assert(!plain.includes('role="button"'));
 assert.throws(()=>renderToString(React.createElement(toast,{open:true,onCloseRequest(){}})),/requires an explicit/);
 const source=`import * as React from 'react';import {${pack.manifest.publicApiMap["component.button"]} as Button,${pack.manifest.publicApiMap["component.card"]} as Card,${pack.manifest.publicApiMap["component.toast"]} as Toast,AxiomToastHost,AxiomThemeProvider} from './src/index.tsx';
 export function App(){const[count,setCount]=React.useState(0);const[requests,setRequests]=React.useState(0);const[first,setFirst]=React.useState(true);const[second,setSecond]=React.useState(true);return <AxiomThemeProvider><output id="count">{count}</output><output id="requests">{requests}</output><Button label="Activate" onActivate={()=>setCount(value=>value+1)}/><Button label="Disabled" disabled onActivate={()=>setCount(value=>value+100)}/><Card body={<span id="body">한국어 / English content</span>} actions={<Button label="Card action" onActivate={()=>setCount(value=>value+10)}/>}/><AxiomToastHost><Toast open={first} message="First notification" onCloseRequest={()=>setRequests(value=>value+1)}/><Toast open={second} message="Second notification" onCloseRequest={()=>setRequests(value=>value+1)}/></AxiomToastHost><button id="accept" onClick={()=>setFirst(false)}>Accept close</button><button id="remove" onClick={()=>setSecond(false)}>Remove second</button></AxiomThemeProvider>}`;
 await writeFile(join(directory,"consumer.tsx"),source);await build({entryPoints:[join(directory,"consumer.tsx")],outfile:join(directory,"consumer.mjs"),bundle:true,platform:"node",format:"esm",packages:"external"});const{App}=await import(pathToFileURL(join(directory,"consumer.mjs")).href);const html=renderToString(React.createElement(App));
 await writeFile(join(directory,"client.tsx"),`import * as React from 'react';import {hydrateRoot} from 'react-dom/client';import {App} from './consumer.tsx';hydrateRoot(document.getElementById('root')!,<App/>,{onRecoverableError:error=>{throw error;}});`);
 await build({entryPoints:[join(directory,"client.tsx")],outfile:join(directory,"client.js"),bundle:true,platform:"browser",format:"esm"});
 const routes=new Map([["/",{type:"text/html; charset=utf-8",text:`<!doctype html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="/styles.css"></head><body><div id="root">${html}</div><script type="module" src="/client.js"></script></body></html>`}],["/client.js",{type:"text/javascript; charset=utf-8",text:await readFile(join(directory,"client.js"),"utf8")}],["/styles.css",{type:"text/css; charset=utf-8",text:await readFile(join(directory,"src/styles.css"),"utf8")}] ]);
 const server=createServer((request,response)=>{const route=routes.get(request.url);if(!route){response.writeHead(404).end();return;}response.writeHead(200,{"Content-Type":route.type,"Cache-Control":"no-store"});response.end(route.text);});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const profile=await mkdtemp(join(tmpdir(),"axiom-target-browser-"));let browser;
 try{browser=await launch(await browserPath(),profile);const page=await browser.cdp.page(`http://127.0.0.1:${server.address().port}/`);await waitFor(page,`document.querySelector('[role=status]')?.textContent==='First notification'`);
  await click(page,'button[data-part="component.button.root"]');await waitFor(page,`document.querySelector('#count').textContent==='1'`);
  await page.evaluate(`document.querySelector('button[data-part="component.button.root"]').focus()`);for(const [key,code,value]of[["Enter","Enter",13],[" ","Space",32]]){await page.send("Input.dispatchKeyEvent",{type:"keyDown",key,code,text:key==="Enter"?"\r":key,windowsVirtualKeyCode:value,nativeVirtualKeyCode:value});await page.send("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:value,nativeVirtualKeyCode:value});}await waitFor(page,`document.querySelector('#count').textContent==='3'`);
  await click(page,'button[disabled]');assert.equal(await page.evaluate(`document.querySelector('#count').textContent`),"3");
  await click(page,'button[data-part="component.toast.close"]');await waitFor(page,`document.querySelector('#requests').textContent==='1'`);assert.equal(await page.evaluate(`document.querySelector('[role=status]').textContent`),"First notification");
  await page.send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});await click(page,"#accept");await waitFor(page,`document.querySelector('[role=status]')?.textContent==='Second notification'`);assert.equal(await page.evaluate(`document.querySelectorAll('[role=status]').length`),1);await click(page,"#remove");await waitFor(page,`document.querySelectorAll('[role=status]').length===0`);
  assert.deepEqual(browser.cdp.errors,[]);evidence.targets.react={sourceGeneration:"passed",typecheck:"passed",ssr:"passed",hydration:"passed",browserInteraction:"passed",browser:await browser.cdp.send("Browser.getVersion"),cases:["escaped content","plain Card","explicit Toast host","native pointer activation once","Enter/Space activation once","disabled input","controlled close request","single announcement queue","reduced motion removal"]};
 }finally{await terminate(browser);await new Promise(resolve=>server.close(resolve));assert(within(resolve(tmpdir()),profile)&&profile!==resolve(tmpdir()),"Browser cleanup stays inside its dedicated temporary directory");await rm(profile,{recursive:true,force:true});}
}

async function nativeReactConsumer(pack,directory){
 const consumer=join(OUTPUT,"expo-consumer");await mkdir(consumer,{recursive:true});const pins=TARGET_DEPENDENCIES["react-native"];
 const packageJson={name:"axiom-expo-consumer",version:"0.1.0",private:true,main:"index.js",dependencies:{react:pins.react,"react-native":pins["react-native"],expo:pins.expo,"@axiom/fixture-design":"file:../react-native"},devDependencies:{typescript:pins.typescript,"@types/react":pins["@types/react"]}};
 await writeFiles(consumer,[{path:"package.json",text:JSON.stringify(packageJson,null,2)},{path:"app.json",text:JSON.stringify({expo:{name:"Axiom consumer",slug:"axiom-consumer",platforms:["ios","android"]}})},{path:"index.js",text:`import {registerRootComponent} from 'expo';import App from './App';registerRootComponent(App);`},{path:"App.tsx",text:`import * as React from 'react';import {AxiomText as Text,${pack.manifest.publicApiMap["component.button"]} as Button,${pack.manifest.publicApiMap["component.card"]} as Card,${pack.manifest.publicApiMap["component.toast"]} as Toast,AxiomToastHost,AxiomThemeProvider} from '@axiom/fixture-design';export default function App(){return <AxiomThemeProvider><Button onActivate={()=>{}}/><Card body={<Text>한글 native body</Text>}/><AxiomToastHost><Toast open onCloseRequest={()=>{}}/></AxiomToastHost></AxiomThemeProvider>}`},{path:"tsconfig.json",text:JSON.stringify({extends:"expo/tsconfig.base",compilerOptions:{strict:true,noEmit:true},include:["App.tsx"]})}]);
 await writeFile(join(consumer,"pnpm-lock.yaml"),await readFile(join(ROOT,"modules/target-packs/test/expo-consumer.lock.yaml")));
 await run("pnpm",["install","--ignore-workspace","--frozen-lockfile","--ignore-scripts"],consumer);
 await run("pnpm",["exec","tsc","--noEmit"],consumer);
 await run("pnpm",["exec","expo","export","--platform","android","--output-dir","android-output"],consumer);
 await run("pnpm",["exec","expo","export","--platform","ios","--output-dir","ios-output"],consumer);
 evidence.targets["react-native"]={sourceGeneration:"passed",typecheck:"passed",androidBundle:"passed",iosBundle:"passed",nativeExecution:"not-run",dependencies:pins,lockDigest:HASH(await readFile(join(consumer,"pnpm-lock.yaml"),"utf8"))};
}

try{
 assert(within(join(ROOT,"dist"),OUTPUT)&&OUTPUT!==join(ROOT,"dist"),"Only the dedicated generated verification directory is replaced");
 try{const actual=await realpath(OUTPUT);assert(process.platform==="win32"?actual.toLowerCase()===OUTPUT.toLowerCase():actual===OUTPUT,"Generated verification cleanup cannot follow a directory alias");}catch(error){if(error.code!=="ENOENT")throw error;}
 await rm(OUTPUT,{recursive:true,force:true});
 await mkdir(OUTPUT,{recursive:true});
 const project={id:"project.target-verification",name:"Independent target consumer",revision:"revision.target-verification",documents:Object.fromEntries(createStudioStarter("project.target-verification").map(document=>[document.id,{document,originalText:canonicalJson(document),sourceUri:`memory:${document.id}`,validation:"envelope-only",validationProfile:"foundation-studio",diagnostics:[]}]))};
 const packs=new Map();for(const target of TARGET_IDS){const result=generateTargetPack(project,{target,packageName:target==="react-native"?"@axiom/fixture-design":"axiom-design"},HASH);assert.equal(result.valid,true,canonicalJson(result.diagnostics));packs.set(target,result.pack);await writeFiles(join(OUTPUT,target),getTargetFiles(result.pack,HASH));evidence.targets[target]={sourceGeneration:"passed",nativeCompilation:"not-run",nativeExecution:"not-run"};}
 await webConsumer(packs.get("react"),join(OUTPUT,"react"));
 await nativeReactConsumer(packs.get("react-native"),join(OUTPUT,"react-native"));
 evidence.status="PASSED";
}catch(error){evidence.error=error instanceof Error?error.message:String(error);process.exitCode=1;console.error(error);}
finally{await mkdir(OUTPUT,{recursive:true});await writeFile(join(OUTPUT,"evidence.json"),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));}
