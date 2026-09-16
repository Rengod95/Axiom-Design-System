import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { browserPath, launch, terminate, within } from "./browser-driver.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const referenceId = value => `document.querySelector(${JSON.stringify(`[data-testid=${JSON.stringify(value)}]`)})`;
const referenceDebuggers = new WeakMap();
export function registerReferenceDebugger(page, cdp) { referenceDebuggers.set(page, { cdp, sessions: new Map() }); }

export async function referenceTemplates() {
  const source = await readFile(join(ROOT, "modules/ads-core/src/studio-reference-data.ts"), "utf8");
  return JSON.parse(source.slice(source.indexOf("= [") + 2).trim().replace(/;\s*$/, ""));
}

/** CDP's isolated world executes inside the sandbox, without granting universal access. */
export async function referenceContext(page, iframeExpression) {
  const src = await page.evaluate(`(${iframeExpression})?.src`);
  assert.ok(src, `Missing reference iframe: ${iframeExpression}`);
  let send = (method, params) => page.send(method, params);
  let { frameTree } = await send("Page.getFrameTree");
  const flatten = tree => [tree.frame, ...(tree.childFrames ?? []).flatMap(flatten)];
  let frame = flatten(frameTree).find(item => item.url === src);
  if (!frame) {
    const debug = referenceDebuggers.get(page);
    assert.ok(debug, "Register the dedicated browser debugger to inspect out-of-process sandboxed frames");
    const { targetInfos } = await debug.cdp.send("Target.getTargets");
    const target = targetInfos.find(item => item.type === "iframe" && item.url === src);
    assert.ok(target, `Reference frame target is not attached: ${src}`);
    if (!debug.sessions.has(target.targetId)) {
      const { sessionId } = await debug.cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
      debug.sessions.set(target.targetId, sessionId);
      await debug.cdp.send("Runtime.enable", {}, sessionId); await debug.cdp.send("Page.enable", {}, sessionId);
    }
    const sessionId = debug.sessions.get(target.targetId);
    send = (method, params) => debug.cdp.send(method, params, sessionId);
    ({ frameTree } = await send("Page.getFrameTree"));
    frame = flatten(frameTree).find(item => item.url === src);
  }
  assert.ok(frame, `Reference frame is not attached: ${src}`);
  const { executionContextId } = await send("Page.createIsolatedWorld", { frameId: frame.id, worldName: "axiom-reference-verification", grantUniveralAccess: false });
  return {
    src, frameId: frame.id,
    async evaluate(expression) {
      const reply = await send("Runtime.evaluate", { expression, contextId: executionContextId, awaitPromise: true, returnByValue: true });
      if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text);
      return reply.result.value;
    },
  };
}

export async function waitReferenceFrame(page, iframeExpression) {
  const deadline = Date.now() + 30_000;
  do {
    const state = await page.evaluate(`(${iframeExpression})?.closest('.reference-frame-shell')?.dataset.referenceState`);
    if (state === "error") throw new Error(await page.evaluate(`(${iframeExpression}).parentElement.textContent`));
    if (state === "ready") {
      const context = await referenceContext(page, iframeExpression);
      if (await context.evaluate("document.querySelector('#reference-root')?.dataset.referenceState==='ready'")) return context;
    }
    await delay(80);
  } while (Date.now() < deadline);
  throw new Error(`Reference template did not become ready: ${iframeExpression}`);
}

export async function closeReferenceDialog(page) {
  for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  const deadline = Date.now() + 10_000;
  while (await page.evaluate("Boolean(document.querySelector('dialog[open] .reference-dialog-preview'))")) { if (Date.now() > deadline) throw new Error("Original reference dialog did not close"); await delay(50); }
}

export async function referenceSandboxState(page, iframeExpression) {
  const context = await waitReferenceFrame(page, iframeExpression);
  const isolation = await context.evaluate(`(()=>{let localStorageBlocked=false,parentDocumentBlocked=false;try{localStorage.length}catch(error){localStorageBlocked=error.name==='SecurityError'}try{parent.document.body}catch(error){parentDocumentBlocked=error.name==='SecurityError'}return{origin:self.origin,localStorageBlocked,parentDocumentBlocked,sourceRow:Number(new URL(location.href).searchParams.get('row'))}})()`);
  assert.equal(await page.evaluate(`(${iframeExpression}).getAttribute('sandbox')`), "allow-scripts");
  assert.equal(isolation.origin, "null");
  assert.equal(isolation.localStorageBlocked, true);
  assert.equal(isolation.parentDocumentBlocked, true);
  return { context, isolation };
}

export async function referenceCheckboxState(context) {
  return await context.evaluate(`(()=>{const e=document.querySelector('#reference-root [role=checkbox]:not([aria-disabled=true]), #reference-root input[type=checkbox]:not(:disabled)');if(!e)throw Error('Original checkbox is missing');return{checked:e.getAttribute('aria-checked')==='true'||e.checked===true,tag:e.tagName,role:e.getAttribute('role')}})()`);
}

export async function clickReferenceCheckbox(page, iframeExpression) {
  const context = await waitReferenceFrame(page, iframeExpression);
  const point = await context.evaluate(`(()=>{const candidates=Array.from(document.querySelectorAll('#reference-root [role=checkbox]:not([aria-disabled=true]), #reference-root input[type=checkbox]:not(:disabled)'));const e=candidates.find(e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1&&getComputedStyle(e).opacity!=='0'});if(!e)throw Error('Visible original checkbox is missing');const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.evaluate(`(${iframeExpression}).scrollIntoView({block:'center',inline:'center'})`);
  const outer = await page.evaluate(`(()=>{const e=(${iframeExpression}),r=e.getBoundingClientRect();return{x:r.x,y:r.y,scaleX:r.width/e.offsetWidth,scaleY:r.height/e.offsetHeight}})()`);
  const position = { x: outer.x + point.x * outer.scaleX, y: outer.y + point.y * outer.scaleY };
  for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, button: "left", clickCount: 1, ...position });
  await delay(80);
  return context;
}

export async function verifyReferenceCheckboxSimulation({ page, componentId, click, revision, record }) {
  const iframe = `${referenceId(`preview-${componentId}`)}.querySelector('iframe.reference-frame')`;
  const before = await revision();
  await click("mode-run");
  const { context, isolation } = await referenceSandboxState(page, iframe);
  assert.match(context.src, /\/references\/shadcn\.html\?row=73&/);
  const initial = await referenceCheckboxState(context);
  const interacted = await clickReferenceCheckbox(page, iframe);
  assert.notEqual((await referenceCheckboxState(interacted)).checked, initial.checked, "The actual upstream checkbox responds to a pointer click");
  assert.equal(await revision(), before, "Upstream transient interaction never commits ADS source");
  assert.equal(await page.evaluate(`Boolean(${referenceId("review-strip")})`), false);
  await click("mode-edit");
  const reset = await waitReferenceFrame(page, iframe);
  assert.notEqual(reset.src, context.src, "Leaving run mode creates a fresh upstream instance");
  assert.equal((await referenceCheckboxState(reset)).checked, initial.checked);
  assert.equal(await revision(), before);
  record("catalogSimulation", { originalCheckboxPointerClick: true, sourceRow: 73, provider: "shadcn/ui", opaqueOrigin: isolation.origin, storageBlocked: isolation.localStorageBlocked, authoredDefaultUnchanged: true, exitRunResetsTransientState: true });
}

async function verifyReferenceStudio() {
  const evidence = { kind: "axiom-reference-studio-integration", status: "FAILED", cases: {}, limitations: ["Chromium execution validates the web reference runtime, not native export parity."] };
  let browser, server, temp, page;
  try {
    temp = await mkdtemp(join(tmpdir(), "axiom-reference-studio-"));
    const origin = await new Promise((accept, reject) => {
      server = spawn(process.execPath, ["scripts/serve-studio.mjs"], { cwd: ROOT, windowsHide: true, env: { ...process.env, AXIOM_STUDIO_PORT: "0" }, stdio: ["ignore", "pipe", "pipe"] });
      let output = "", errors = "";
      const timer = setTimeout(() => reject(new Error(`Reference test server timed out: ${errors}`)), 10_000);
      server.stdout.on("data", data => { output += data; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); accept(match[0]); } });
      server.stderr.on("data", data => { errors += data; });
      server.once("error", error => { clearTimeout(timer); reject(error); });
      server.once("exit", code => { clearTimeout(timer); reject(new Error(`Reference test server exited ${code}: ${errors}`)); });
    });
    browser = await launch(await browserPath(), join(temp, "profile"));
    evidence.browser = (await browser.cdp.send("Browser.getVersion")).product;
    const database = `axiom-studio-test-${randomUUID()}`;
    page = await browser.cdp.page(`${origin}/?database=${database}`);
    registerReferenceDebugger(page, browser.cdp);
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1080, deviceScaleFactor: 1, mobile: false });
    const id = referenceId;
    const until = async expression => { const deadline = Date.now() + 30_000; do { if (await page.evaluate(`Boolean(${expression})`)) return; await delay(80); } while (Date.now() < deadline); throw new Error(`Condition timed out: ${expression}; ${await page.evaluate("document.body.innerText.slice(-1600)")}`); };
    const settled = () => page.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))");
    const clickElement = async expression => {
      await until(`(${expression}) && !(${expression}).matches(':disabled')`);
      const closed = await page.evaluate(`(()=>{const e=(${expression});let closed=null;for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!p.querySelector(':scope>summary')?.contains(e))closed=p;return closed?Array.from(document.querySelectorAll('details')).indexOf(closed):-1})()`);
      if (closed >= 0) { await clickElement(`document.querySelectorAll('details')[${closed}].querySelector('summary')`); await delay(280); return await clickElement(expression); }
      await page.evaluate(`(${expression}).scrollIntoView({block:'center'})`); await settled();
      const point = await page.evaluate(`(()=>{const e=(${expression}),r=e.getBoundingClientRect();if(!r.width||!r.height)throw Error('Hidden control');const x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);if(hit!==e&&!e.contains(hit))throw Error('Obscured control '+hit?.outerHTML.slice(0,200));return{x,y}})()`);
      for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, button: "left", clickCount: 1, ...point });
      await settled();
    };
    const click = key => clickElement(id(key));
    const fill = async (testId, value) => { await click(testId); for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 }); await page.send("Input.insertText", { text: value }); await settled(); };
    const label = (value, tag = "input,select,textarea,button") => `Array.from(document.querySelectorAll(${JSON.stringify(tag)})).find(e=>e.getAttribute('aria-label')===${JSON.stringify(value)})`;
    const selectElement = async (expression, value) => { await until(`(${expression}) && !(${expression}).disabled`); await page.evaluate(`(()=>{const e=(${expression});if(!Array.from(e.options).some(o=>o.value===${JSON.stringify(value)}))throw Error('Unknown option');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await settled(); };
    const select = (name, value) => selectElement(label(name, "select"), value);
    const blur = async () => { for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); await settled(); };
    const revision = () => page.evaluate(`${id("project-revision")}.title`);
    const record = (name, details) => { evidence.cases[name] = details; console.error(`Reference Studio verified ${name}`); };
    const saved = `${id("studio-app")} && !${id("open-export")}.disabled`;
    const approve = async () => { await click("review-changes"); await until(`${id("review-dialog")}?.open`); await click("review-approve"); await until(`!${id("review-dialog")} && ${saved}`); };
    const project = () => page.evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open(${JSON.stringify(database)});r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('commits','readonly'),get=tx.objectStore('commits').openCursor(null,'prev');get.onsuccess=()=>resolve(JSON.parse(get.result.value.stateText).project);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close()}})`);
    await fill("project-name", "Original reference regression"); await click("starter-enabled"); await click("start-project"); await until(saved);
    if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
    await click("view-library"); await select("Entry kind", "");
    await until("document.querySelectorAll('.catalog-select').length===225");
    const entries = await page.evaluate("Array.from(document.querySelectorAll('.catalog-select')).map(e=>({id:e.dataset.testid.slice(8),name:e.querySelector('strong').textContent,provider:e.querySelector('small').textContent,image:e.querySelector('img.reference-thumbnail')?.getAttribute('src'),frames:e.querySelectorAll('iframe').length}))");
    const aliases = ["breadcrumbs", "anchor", "togglebutton", "togglebuttongroup", "divider", "progressbar", "numberinput", "splitter", "emptystate", "disclosuregroup", "disclosure", "dropdownmenu", "textinput", "filebutton"];
    assert.ok(aliases.every(alias => !entries.some(entry => entry.id === `catalog.${alias}`)));
    const pinned = await referenceTemplates(); assert.equal(pinned.length, 225);
    for (const entry of entries) {
      const template = pinned.find(item => item.catalogId === entry.id); assert.ok(template, entry.id);
      assert.equal(entry.provider, template.provider); assert.equal(entry.frames, 0);
      assert.match(entry.image, new RegExp(`^/references/${template.bundle}-previews/${template.sourceRow}-(light|dark)\\.png$`));
    }
    for (const catalogId of ["catalog.accordion", "catalog.button", "catalog.card", "catalog.checkbox", "catalog.calendar"]) assert.equal(entries.find(entry => entry.id === catalogId).provider, "shadcn/ui");
    record("discovery", { canonicalRows: 225, removedAliases: aliases.length, staticPinnedThumbnails: 225, nativeIframePerCard: false, shadcnPrimary: true });
    await fill("catalog-search", "Checkbox"); await click("catalog-catalog.checkbox");
    await click("catalog-preview-open");
    const detailFrame = "document.querySelector('dialog[open] iframe.reference-frame')";
    const { context: detail, isolation } = await referenceSandboxState(page, detailFrame);
    assert.equal(isolation.sourceRow, 73);
    assert.equal(await page.evaluate("document.querySelector('[data-testid=catalog-provider-reference]').getAttribute('href')"), "https://ui.shadcn.com/docs/components/base/checkbox");
    const originalState = await referenceCheckboxState(detail);
    await closeReferenceDialog(page);
    const initialIds = Object.values((await project()).documents).map(entry => entry.document).filter(document => document.kind === "component").map(document => document.id);
    const beforeCreate = await revision(); await click("catalog-add");
    await until(`document.querySelectorAll('[data-component-frame]').length===${initialIds.length + 1}`);
    const componentId = await page.evaluate(`Array.from(document.querySelectorAll('[data-component-frame]')).map(e=>e.dataset.componentFrame).find(id=>!${JSON.stringify(initialIds)}.includes(id))`);
    assert.equal(await revision(), beforeCreate); assert.equal((await project()).documents[componentId], undefined);
    await approve();
    const created = (await project()).documents[componentId].document;
    assert.equal(created.studioReference.templateId, "reference.shadcn.73");
    const canvasFrame = `${id(`preview-${componentId}`)}.querySelector('iframe.reference-frame')`;
    const canvas = await waitReferenceFrame(page, canvasFrame);
    assert.equal((await referenceCheckboxState(canvas)).checked, originalState.checked);
    record("insertion", { componentId, templateId: created.studioReference.templateId, sourceRow: 73, unreviewedSourceNotCommitted: true, detailAndCanvasShareOriginal: true, opaqueStorageBlocked: true });
    await verifyReferenceCheckboxSimulation({ page, componentId, click, revision, record });
    const rootId = created.parts.find(part => part.parent === null).id;
    const nativeRoot = `document.querySelector(${JSON.stringify(`[data-reference-part=${JSON.stringify(rootId)}]`)})`;
    const textId = created.parts.find(part => part.studioRole === "label").id;
    const nativeText = `document.querySelector(${JSON.stringify(`[data-reference-part=${JSON.stringify(textId)}]`)})`;
    const runtime = await waitReferenceFrame(page, canvasFrame);
    const original = await runtime.evaluate(`({labelText:(${nativeText}).textContent,padding:(${nativeRoot}).style.padding,background:(${nativeRoot}).style.backgroundColor})`);
    const untilNative = async predicate => { const deadline = Date.now() + 15_000; do { if (await runtime.evaluate(predicate)) return; await delay(50); } while (Date.now() < deadline); throw Error(`Original template edit did not render: ${predicate}`); };
    await click(`part-${textId}`);
    assert.equal(await page.evaluate(`${id("part-text")}.value`), "");
    await fill("part-text", "Edited original checkbox"); await blur();
    await untilNative(`(${nativeText}).textContent.includes('Edited original checkbox')`); await approve();
    const editedText = (await project()).documents[componentId].document;
    assert.equal(editedText.parts.find(part => part.id === textId).studioText, "Edited original checkbox");
    assert.deepEqual(editedText.studioReference, created.studioReference);
    await fill("part-text", ""); await blur();
    await untilNative(`!(${nativeText}).textContent.includes('Edited original checkbox')`); await approve();
    assert.equal((await project()).documents[componentId].document.parts.find(part => part.id === textId).studioText, "");
    await click("undo"); await untilNative(`(${nativeText}).textContent.includes('Edited original checkbox')`);
    await click("undo"); await untilNative(`(${nativeText}).textContent===${JSON.stringify(original.labelText)}`);
    assert.equal((await project()).documents[componentId].document.parts.find(part => part.id === textId).studioText, undefined);
    await click("redo"); await untilNative(`(${nativeText}).textContent.includes('Edited original checkbox')`);
    await click("undo"); await untilNative(`(${nativeText}).textContent===${JSON.stringify(original.labelText)}`);
    await click(`part-${rootId}`);
    assert.equal(await page.evaluate(`${id("layout-padding")}.value`), "", "Untouched layout shows the original-provider placeholder");
    await fill("layout-padding", "0"); await blur(); await untilNative(`(${nativeRoot}).style.padding==='0px'`); await approve();
    const withPadding = await project();
    const web = Object.values(withPadding.documents).map(entry => entry.document).find(document => document.kind === "design" && document.category === "Web" && document.componentRef?.id === componentId);
    assert.ok(web.referenceLayout.some(row => row.partRef === rootId && row.fields.includes("padding")), "Explicit zero is recorded as an override, separate from the untouched default");
    await click("undo"); await untilNative(`(${nativeRoot}).style.padding===${JSON.stringify(original.padding)}`);
    await selectElement(id("appearance-background-binding"), "literal"); await fill("appearance-background-value", "#dbeafe"); await blur(); await fill("appearance-background-alpha", "1"); await blur();
    await untilNative(`(${nativeRoot}).style.backgroundColor==='rgb(219, 234, 254)'`); await approve();
    await click("undo"); await untilNative(`(${nativeRoot}).style.backgroundColor===${JSON.stringify(original.background)}`);
    await page.evaluate(`(()=>{const frame=(${canvasFrame});window.__referenceMeasureCount=0;window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data?.channel==='axiom-reference'&&event.data?.type==='measure')window.__referenceMeasureCount++})})()`);
    await runtime.evaluate("document.fonts.ready.then(()=>true)"); await delay(250); await page.evaluate("window.__referenceMeasureCount=0"); await delay(750);
    const idleMeasures = await page.evaluate("window.__referenceMeasureCount"); assert.ok(idleMeasures <= 2, `Idle template does not enter a measure/update render loop (${idleMeasures} messages)`);
    record("originalEditing", { nativeTextAndUndoRestoreOriginal: true, explicitZeroPaddingAndUndo: true, nativePaintAndUndo: true, providerPinUnchanged: true, idleMeasureMessages: idleMeasures });
    for (let index = 0; index < 2; index++) {
      await selectElement(id("element-insert-parent"), rootId); await click("element-add-box");
    }
    await approve();
    const addedParts = (await project()).documents[componentId].document.parts.filter(part => part.studioElement === "box");
    assert.equal(addedParts.length, 2);
    const authoredNodes = `Array.from(document.querySelectorAll('[data-reference-part]')).filter(node=>${JSON.stringify(addedParts.map(part => part.id))}.includes(node.dataset.referencePart))`;
    await untilNative(`(${authoredNodes}).length===2`);
    const stackGeometry = await runtime.evaluate(`(${authoredNodes}).map(node=>{const rect=node.getBoundingClientRect();return{position:getComputedStyle(node).position,x:rect.x,y:rect.y,width:rect.width,height:rect.height}})`);
    assert.ok(stackGeometry.every(rect => rect.position !== "absolute"));
    const [first, second] = stackGeometry;
    assert.ok(first.x + first.width <= second.x || second.x + second.width <= first.x || first.y + first.height <= second.y || second.y + second.height <= first.y, "Authored siblings retain the original parent's stack flow");
    await click("undo"); await untilNative(`(${authoredNodes}).length===0`);
    record("authoredReferenceLayout", { stackedBoxes: 2, absolutePositionInStack: false, boxesDoNotOverlap: true, undoRemovesGeneratedNodes: true });
    const prior = await revision(); await fill("component-name", "Pinned checkbox");
    await blur();
    await until(id("review-strip")); assert.equal(await revision(), prior); await approve();
    const renamed = (await project()).documents[componentId].document; assert.equal(renamed.name, "Pinned checkbox"); assert.deepEqual(renamed.studioReference, created.studioReference);
    await click("undo"); await until(`${id("component-name")}.value==='Checkbox'`); assert.deepEqual((await project()).documents[componentId].document.studioReference, created.studioReference);
    await click("redo"); await until(`${id("component-name")}.value==='Pinned checkbox'`); assert.deepEqual((await project()).documents[componentId].document, renamed);
    const persisted = await revision(), time = await page.evaluate("performance.timeOrigin"); await page.send("Page.reload"); await until(`performance.timeOrigin!==${time} && ${saved}`); await click(`component-${componentId}`);
    assert.equal(await revision(), persisted); assert.deepEqual((await project()).documents[componentId].document, renamed); await waitReferenceFrame(page, canvasFrame);
    record("sourcePersistence", { reviewedRename: true, undoRedoAndReloadPreserveProviderPin: true });
    const { verifyCatalogBlueprints } = await import("./workbench-catalog-cases.mjs");
    await verifyCatalogBlueprints({ page, id, label, click, fill, selectElement, until, settled, approve, revision, record });
    assert.deepEqual(browser.cdp.errors, []);
    evidence.status = "PASSED";
  } catch (error) { evidence.error = error.stack; process.exitCode = 1; }
  finally {
    try { await terminate(browser); } catch (error) { evidence.cleanupError = error.message; process.exitCode = 1; }
    if (server && server.exitCode === null && server.signalCode === null) { const stopped = new Promise(resolve => server.once("exit", resolve)); server.kill(); await stopped; }
    if (temp && within(tmpdir(), temp) && temp.startsWith(join(tmpdir(), "axiom-reference-studio-"))) await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    await mkdir(join(ROOT, "dist/evidence"), { recursive: true }); await writeFile(join(ROOT, "dist/evidence/reference-studio.json"), JSON.stringify(evidence, null, 2) + "\n");
    console.log(JSON.stringify(evidence));
  }
}

// Finish module evaluation before catalog cases import these shared helpers.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void verifyReferenceStudio();
