import { verifyPolicyWorkspace } from "./workbench-policy-cases.mjs";
import { verifyBehaviorEditor } from "./workbench-behavior-cases.mjs";
import { verifyCompositionWorkspace } from "./workbench-composition-cases.mjs";
import { verifyAuthoringWorkspace } from "./workbench-authoring-cases.mjs";
import { verifyCompactWorkbench, verifyEditorCompletion, verifyFoundationInterop, verifyMaterialWorkbench, verifyPanelVisibility, verifyBindingPurposeFilters, verifyBindingRepair } from "./workbench-completion-cases.mjs";
import { verifyFoundationBlueprints } from "./workbench-foundation-cases.mjs";
import { verifyBlueprintChrome } from "./workbench-chrome-cases.mjs";
import { verifyCatalogBlueprints } from "./workbench-catalog-cases.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { browserPath, launch, terminate, within } from "./browser-driver.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const evidence = { kind: "axiom-real-workbench-regression", status: "FAILED", browser: null, cases: {}, limitations: ["Chromium DOM execution; no native target certification.", "CDP composition exercises browser IME events, not an operating-system keyboard.", "Representative authoring flows; this is not full Foundation completion evidence."] };
const started = Date.now();
function record(name, details) { evidence.cases[name] = { ...details, elapsedMs: Date.now() - started }; console.error(`Workbench verified ${name} (${Date.now() - started} ms)`); }
let browser, server, temp, page;
const id = value => `document.querySelector(${JSON.stringify(`[data-testid=${JSON.stringify(value)}]`)})`;
const label = (value, tag = "input,select,textarea,button") => `(()=>{const matches=Array.from(document.querySelectorAll(${JSON.stringify(tag)})).filter(e=>e.getAttribute('aria-label')===${JSON.stringify(value)});return matches.find(e=>e.getClientRects().length)||matches[0]})()`;
const text = (value, tag = "button") => `Array.from(document.querySelectorAll(${JSON.stringify(tag)})).find(e=>e.textContent.trim()===${JSON.stringify(value)} && e.getClientRects().length)`;
const settled = () => page.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))");
async function until(expression) {
  const deadline = Date.now() + 30_000;
  do { if (await page.evaluate(`Boolean(${expression})`)) return; await delay(80); } while (Date.now() < deadline);
  const detail = await page.evaluate(`({saveStatus:${id("save-status")}?.textContent,revision:${id("project-revision")}?.title,component:${id("component-name")}?.value,review:${id("review-strip")}?.textContent,error:${id("operation-error")}?.textContent,activeElement:document.activeElement?.outerHTML.slice(0,400),invalidInputs:Array.from(document.querySelectorAll('[aria-invalid=true]')).map(e=>({id:e.dataset.testid,label:e.getAttribute('aria-label'),value:e.value})),disabledInspector:document.querySelector('.inspector-fields')?.disabled,head:document.body.innerText.slice(0,800),tail:document.body.innerText.slice(-1800)})`);
  throw new Error(`Workbench condition timed out: ${expression}; detail: ${JSON.stringify(detail)}; browser errors: ${browser.cdp.errors.join("; ")}`);
}
async function clickElement(expression) {
  await until(`(${expression}) && !(${expression}).matches(':disabled')`);
  await revealControl(expression);
  await page.evaluate(`(${expression}).scrollIntoView({block:'center',inline:'nearest'})`);
  const point = await page.evaluate(`(()=>{const e=(${expression}),r=e.getBoundingClientRect(); if(!r.width||!r.height)throw Error('Hidden control'); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const hit = await page.evaluate(`(()=>{const e=(${expression}),hit=document.elementFromPoint(${point.x},${point.y});return {visible:e===hit||e.contains(hit),hit:hit?.outerHTML.slice(0,300),point:${JSON.stringify(point)},rect:e.getBoundingClientRect().toJSON()}})()`);
  assert.equal(hit.visible, true, `Control is obscured: ${expression}; ${JSON.stringify(hit)}`);
  for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, button: "left", clickCount: 1, ...point });
  await settled();
  if (await page.evaluate(`(${expression})?.tagName==='SUMMARY'`)) await delay(280);
}
const click = testId => clickElement(id(testId));
async function key(key, code, extra = {}) {
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, ...extra });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, ...extra });
  await settled();
}
async function revealControl(expression) {
  const domain = await page.evaluate(`(()=>{const target=(${expression});const toggle=target?.closest('.sidebar-domain')?.querySelector('.sidebar-domain-toggle[aria-expanded=false]');return toggle&&!toggle.contains(target)?toggle.dataset.testid:null})()`);
  if (domain) await click(domain);
  const ancestor = await page.evaluate(`(()=>{const target=(${expression});let e=target;let closed=null;for(;e;e=e.parentElement)if(e.tagName==='DETAILS'&&!e.open&&!e.querySelector(':scope > summary')?.contains(target))closed=e;return closed?Array.from(document.querySelectorAll('details')).indexOf(closed):-1})()`);
  if(ancestor >= 0) { await clickElement(`document.querySelectorAll('details')[${ancestor}].querySelector('summary')`); await delay(280); await revealControl(expression); }
}
async function fillElement(expression, value) {
  await revealControl(expression);
  await until(`(${expression}) && !(${expression}).matches(':disabled')`);
  await page.evaluate(`(${expression}).focus()`);
  await key("a", "KeyA", { modifiers: 2, windowsVirtualKeyCode: 65 });
  await page.send("Input.insertText", { text: value });
  await settled();
}
const fill = (testId, value) => fillElement(id(testId), value);
async function selectElement(expression, value) {
  await until(`(${expression}) && !(${expression}).matches(':disabled')`);
  await page.evaluate(`(()=>{const e=(${expression});if(!Array.from(e.options).some(o=>o.value===${JSON.stringify(value)}))throw Error('Missing option');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await settled();
}
const select = (testId, value) => selectElement(id(testId), value);
const revision = () => page.evaluate(`${id("project-revision")}.title`);
async function approve() {
  await click("review-changes"); await until(`${id("review-dialog")}?.open`);
  await click("review-approve"); await until(`!${id("review-dialog")} && !${id("open-export")}.disabled`);
  assert.equal(await page.evaluate(`Boolean(${id("operation-error")})`), false);
}
async function serve() {
  server = spawn(process.execPath, ["scripts/serve-studio.mjs"], { cwd: ROOT, windowsHide: true, env: { ...process.env, AXIOM_STUDIO_PORT: "0" }, stdio: ["ignore", "pipe", "pipe"] });
  return await new Promise((accept, reject) => {
    let output = "", errors = "";
    const timer = setTimeout(() => reject(new Error(`Workbench server timed out: ${errors}`)), 10_000);
    server.stdout.on("data", data => { output = (output + data).slice(-4000); const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); accept(match[0]); } });
    server.stderr.on("data", data => { errors = (errors + data).slice(-4000); });
    server.once("error", error => { clearTimeout(timer); reject(error); });
    server.once("exit", code => { clearTimeout(timer); reject(new Error(`Workbench server exited ${code}: ${errors}`)); });
  });
}
async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  await new Promise((accept, reject) => {
    const timer = setTimeout(() => reject(new Error("Dedicated workbench server did not terminate")), 10_000);
    server.once("exit", () => { clearTimeout(timer); accept(); }); server.kill();
  });
}
async function closeBrowserNormally() {
  // Browser preferences use localStorage; verify an ordinary browser restart, not
  // a claim that Chromium synchronously flushes preferences before process kill.
  const closingAt = Date.now();
  const exiting = new Promise((accept, reject) => {
    const timer = setTimeout(() => reject(new Error(`Dedicated browser did not close normally after 30s (exit=${browser.child.exitCode}, signal=${browser.child.signalCode})`)), 30_000);
    browser.child.once("exit", () => { clearTimeout(timer); accept(); });
  });
  await Promise.all([browser.cdp.send("Browser.close"), exiting]);
  browser.cdp.close(); browser = undefined;
  return Date.now() - closingAt;
}
try {
  temp = await mkdtemp(join(tmpdir(), "axiom-workbench-"));
  const executable = await browserPath(), profile = join(temp, "profile"), downloads = join(temp, "downloads");
  await mkdir(downloads);
  const origin = await serve();
  for (const path of ["/package.json", "/app.js.map", "/build-evidence.json", "/docs/README.md"]) assert.equal((await fetch(origin + path, { signal: AbortSignal.timeout(5000) })).status, 404);
  browser = await launch(executable, profile); evidence.browser = (await browser.cdp.send("Browser.getVersion")).product;
  await browser.cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
  const url = `${origin}/?database=axiom-studio-test-${randomUUID()}`;
  page = await browser.cdp.page(url);
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1080, deviceScaleFactor: 1, mobile: false });
  await fill("project-name", "Workbench 검증"); await click("starter-enabled"); await click("start-project");
  await until(`${id("studio-app")} && !${id("undo")}.disabled`);
  assert.equal(await page.evaluate("document.querySelectorAll('[data-component-frame]').length"), 3);
  const initialRevision = await revision();
  await click("locale-toggle"); await until("document.documentElement.lang==='en'");
  record("create", { components: 3, saved: true });

  await click("new-token"); await fill("foundation-token-name", "Workbench spacing"); await select("foundation-token-type", "dimension");
  const numeric = label("Value", "input");
  await fillElement(numeric, "-");
  await until(`${id("foundation-token-apply")}.disabled`);
  await click("view-library");
  assert.equal(await page.evaluate(`(${numeric}).value`), "-");
  assert.ok(await page.evaluate("Boolean(document.querySelector('.input-notice'))"));
  assert.equal(await page.evaluate(`${id("view-foundation")}.getAttribute('aria-pressed')`), "true");
  assert.equal(await page.evaluate(`${id("open-export")}.disabled`), true);
  assert.equal(await revision(), initialRevision);
  await fillElement(numeric, "12"); await click("foundation-token-apply");
  const tokenId = await page.evaluate("Array.from(document.querySelectorAll('.sidebar [data-testid^=token-]')).find(e=>e.textContent==='Workbench spacing').dataset.testid.slice(6)");
  await until(`${id(`foundation-row-${tokenId}`)}`);
  assert.equal(await revision(), initialRevision);
  await approve(); const tokenRevision = await revision(); assert.notEqual(tokenRevision, initialRevision);
  await click("undo"); await until(`!${id(`token-${tokenId}`)}`);
  await click("redo"); await until(`${id(`token-${tokenId}`)}`);
  record("typedToken", { finiteInputRejected: true, exactInvalidBufferRetainedAfterBlurAndNavigation: true, previewDoesNotCommit: true, reviewUndoRedo: true });

  await click("new-token"); await fill("foundation-token-name", "Workbench alias"); await select("foundation-token-type", "dimension");
  await selectElement(label("Value source", "select"), "alias"); await selectElement(label("Referenced token", "select"), tokenId); await click("foundation-token-apply");
  const aliasId = await page.evaluate("Array.from(document.querySelectorAll('.sidebar [data-testid^=token-]')).find(e=>e.textContent==='Workbench alias').dataset.testid.slice(6)");
  await until(`${id(`foundation-row-${aliasId}`)}.querySelector('.material-value').textContent==='12px'`);
  await clickElement(text("Manage")); await fill("foundation-classification-name", "Workbench domain");
  assert.equal(await page.evaluate(`${id("foundation-token-apply")}.disabled`), false, "Independent property forms remain accessible");
  // A genuine composition remains in the form and commits only after composition ends.
  await page.evaluate(`${id("foundation-classification-name")}.focus()`);
  await page.send("Input.imeSetComposition", { text: "한글", selectionStart: 2, selectionEnd: 2 });
  await page.send("Input.insertText", { text: "한글" }); await fill("foundation-classification-name", "Workbench domain");
  await click("foundation-classification-apply");
  await clickElement(text("Tokens")); await click("token-view-list");
  await clickElement(label("Select Workbench spacing", "input")); await clickElement(label("Select Workbench alias", "input"));
  const domain = await page.evaluate(`Array.from((${label("Selected tokens domain", "select")}).options).find(o=>o.textContent==='Workbench domain').value`);
  await selectElement(label("Selected tokens domain", "select"), domain); await click("foundation-bulk-classify");
  assert.ok(await page.evaluate(`${id(`foundation-row-${tokenId}`)}.textContent.includes('Workbench domain') && ${id(`foundation-row-${aliasId}`)}.textContent.includes('Workbench domain')`));
  await approve();
  record("aliasAndClassification", { sameTypeAlias: true, resolvedValue: "12 px", twoTokenBulkClassification: true, oneReview: true, browserComposition: true });

  await clickElement(text("Themes")); await clickElement(text("Theme axes and contexts", "summary")); await clickElement(text("New axis")); await fill("foundation-axis-name", "Density"); await fillElement(label("Context name list", "textarea"), "compact\ncomfortable");
  await selectElement(label("Default context", "select"), "compact"); await click("foundation-axis-apply");
  await clickElement(text("New set")); await fill("foundation-theme-name", "Workbench compact"); await selectElement(label("Density context", "select"), "compact"); await click("foundation-theme-apply");
  await approve();
  await click(`token-${tokenId}`);
  const scope = await page.evaluate(`Array.from((${label("Editing scope", "select")}).options).find(o=>o.textContent==='Density / compact').value`);
  await selectElement(label("Editing scope", "select"), scope); await fillElement(numeric, "24"); await click("foundation-token-apply"); await approve();
  await until(`(${numeric}).value==='24'`); await click("undo"); await until(`(${numeric}).value==='12'`); await click("redo"); await until(`(${numeric}).value==='24'`);
  await clickElement(text("Themes")); await selectElement(label("Token to compare", "select"), tokenId);
  assert.ok(await page.evaluate("Array.from(document.querySelectorAll('.comparison-table tbody tr')).some(e=>e.textContent.includes('Workbench compact')&&e.textContent.includes('24 px'))"));
  record("themes", { axisWithTwoContexts: true, namedSet: true, explicitOverride: true, cleanContextBufferTracksUndoRedo: true, namedSetComparison: true });

  await click("view-library"); await fill("catalog-search", "Checkbox"); await click("catalog-catalog.checkbox"); await click("catalog-add");
  await until("document.querySelectorAll('[data-component-frame]').length===4"); await approve();
  const addedId = await page.evaluate("Array.from(document.querySelectorAll('[data-component-frame]')).map(e=>e.dataset.componentFrame).find(id=>!['component.button','component.card','component.toast'].includes(id))");
  assert.ok(addedId); await click(`component-${addedId}`);
  const simulationRevision = await revision();
  await click("mode-run");
  const checkbox = `(${id(`preview-${addedId}`)}).querySelector('input[type=checkbox]')`;
  await until(`${id(`catalog-requests-${addedId}`)}?.textContent.trim()==='0'`);
  assert.equal(await page.evaluate(`(${checkbox}).checked`), false);
  await clickElement(checkbox);
  await until(`(${checkbox}).checked && ${id(`catalog-requests-${addedId}`)}.textContent.trim()==='1 checkedChangeRequest'`);
  assert.equal(await revision(), simulationRevision); assert.equal(await page.evaluate(`Boolean(${id("review-strip")})`), false);
  await click("mode-edit"); await until(`!(${checkbox}).checked && !${id(`catalog-requests-${addedId}`)}`);
  record("catalogSimulation", { nativeCheckboxClick: true, checkedChangeRequest: true, authoredDefaultUnchanged: true, exitRunResetsTransientState: true });
  const cleanRevision = await revision(), previousZoom = await page.evaluate(`${id("zoom-level")}.value`);
  await click("zoom-in"); assert.notEqual(await page.evaluate(`${id("zoom-level")}.value`), previousZoom); await click("zoom-fit");
  await page.evaluate(`${id("canvas-viewport")}.focus()`); await key("h", "KeyH");
  const previousTransform = await page.evaluate(`${id("canvas-world")}.style.transform`);
  const pan = await page.evaluate(`(()=>{const r=${id("canvas-viewport")}.getBoundingClientRect();return{x:r.x+80,y:r.y+80}})()`);
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", buttons: 1, clickCount: 1, ...pan });
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", buttons: 1, x: pan.x + 65, y: pan.y + 40 });
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: pan.x + 65, y: pan.y + 40 }); await settled();
  assert.notEqual(await page.evaluate(`${id("canvas-world")}.style.transform`), previousTransform);
  assert.equal(await revision(), cleanRevision); assert.equal(await page.evaluate(`Boolean(${id("review-strip")})`), false);
  await key("v", "KeyV"); await click(`component-${addedId}`); await page.evaluate(`${id("canvas-viewport")}.focus()`);
  const frame = `document.querySelector(${JSON.stringify(`[data-component-frame=${JSON.stringify(addedId)}]`)})`;
  const frameX = await page.evaluate(`parseFloat((${frame}).style.left)`); await key("ArrowRight", "ArrowRight", { windowsVirtualKeyCode: 39 });
  await until(`parseFloat((${frame}).style.left)===${frameX + 1}`); assert.equal(await revision(), cleanRevision);
  await approve(); await click("undo"); await until(`parseFloat((${frame}).style.left)===${frameX}`); await click("redo"); await until(`parseFloat((${frame}).style.left)===${frameX + 1}`);
  record("libraryAndCanvas", { addedCatalogId: "catalog.checkbox", components: 4, zoomAndPanDoNotCommit: true, selectedFrameMove: true, frameReviewUndoRedo: true });

  await click(`token-${tokenId}`); await selectElement(label("Editing scope", "select"), "base"); await fill("foundation-token-name", ""); await clickElement(text("Manage", "summary"));
  assert.equal(await page.evaluate(`(${text("Duplicate token")}).disabled`), true);
  assert.equal(await page.evaluate(`(${text("Delete token…")}).disabled`), true);
  await click("token-selection-mode");
  await clickElement(label("Select Workbench spacing", "input"));
  assert.equal(await page.evaluate(`(${text("Delete…")}).disabled`), true, "Bulk deletion must not unmount an inspector with unapplied input");
  await clickElement(text("Clear selection"));
  await click("view-canvas"); assert.equal(await page.evaluate(`${id("foundation-token-name")}.value`), "");
  await clickElement(text("Reset form")); await until(`${id("foundation-token-name")}.value==='Workbench spacing'`);
  record("dirtyManagement", { duplicateAndDeleteBlocked: true, crossPanelBulkDeleteBlocked: true, navigationPreservesDraft: true, explicitResetRestoresSource: true });

  await click("token-token.accent"); const originalHex = await page.evaluate(`${id("token-value-input")}.value`);
  await fill("token-value-input", "#12"); await until(`${id("foundation-token-apply")}.disabled`);
  await click("view-library"); assert.equal(await page.evaluate(`${id("token-value-input")}.value`), "#12");
  await fill("token-value-input", "#123456"); await click("foundation-token-apply"); await approve();
  await click("undo"); await until(`${id("token-value-input")}.value===${JSON.stringify(originalHex)}`);
  await click("redo"); await until(`${id("token-value-input")}.value==='#123456'`);
  record("hexEditing", { partialInputPreserved: true, invalidApplyBlocked: true, reviewedColorUndoRedo: true });

  if (await page.evaluate("document.documentElement.dataset.theme!=='dark'")) await click("studio-theme-toggle");
  assert.equal(await page.evaluate("document.documentElement.dataset.theme"), "dark");
  await click("locale-toggle"); await until("document.documentElement.lang==='ko'"); await click("locale-toggle"); await until("document.documentElement.lang==='en'");
  await click("project-download");
  const deadline = Date.now() + 10_000;
  while (!(await readdir(downloads)).includes("axiom-project.json")) { if (Date.now() > deadline) throw Error("Project source bundle download missing"); await delay(100); }
  const bundle = JSON.parse(await readFile(join(downloads, "axiom-project.json"), "utf8"));
  assert.ok(JSON.stringify(bundle).includes("Workbench spacing")); assert.ok(JSON.stringify(bundle).includes("Workbench compact"));
  record("sourceBundle", { downloaded: true, containsAuthoredTokenAndTheme: true });
  await mkdir(join(ROOT, "dist/evidence"), { recursive: true });
  const screenshot = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(ROOT, "dist/evidence/workbench.png"), Buffer.from(screenshot.data, "base64"));
  assert.deepEqual(browser.cdp.errors, []);
  assert.deepEqual(await page.evaluate("({theme:localStorage.getItem('axiom.ui.theme'),locale:localStorage.getItem('axiom.ui.locale')})"), { theme: "dark", locale: "en" });
  const shutdownElapsedMs = await closeBrowserNormally();
  browser = await launch(executable, profile); page = await browser.cdp.page(url);
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1080, deviceScaleFactor: 1, mobile: false });
  await until(`${id("studio-app")}`);
  assert.equal(await page.evaluate("document.documentElement.lang"), "en"); assert.equal(await page.evaluate("document.documentElement.dataset.theme"), "dark");
  assert.equal(await page.evaluate("document.querySelectorAll('[data-component-frame]').length"), 4);
  await click(`token-${tokenId}`); await until(`${id("foundation-token-name")}.value==='Workbench spacing'`);
  await selectElement(label("Editing scope", "select"), scope); await until(`(${numeric}).value==='24'`);
  record("processRestart", { dedicatedProfile: true, ordinaryBrowserShutdown: true, shutdownElapsedMs, tokenAndContextValue: true, catalogComponent: true, localeAndAppearance: true });
  await verifyEditorCompletion({ page, origin, database: `axiom-studio-test-${randomUUID()}`, root: ROOT, id, label, text, click, clickElement, fill, fillElement, select, selectElement, until, settled, approve, revision, record });
  await verifyMaterialWorkbench({ page, id, label, text, click, clickElement, fill, selectElement, until, settled, revision, record });
  await verifyCompactWorkbench({ page, id, label, text, click, clickElement, fill, selectElement, until, settled, revision, record });
  await verifyBindingPurposeFilters({ page, id, text, click, clickElement, selectElement, revision, record });
  await verifyPanelVisibility({ page, id, text, click, clickElement, fill, until, settled, revision, record });
  await verifyFoundationBlueprints({ page, id, label, text, click, clickElement, fill, selectElement, until, settled, revision, record });
  await verifyBlueprintChrome({ page, id, label, text, click, clickElement, fill, fillElement, selectElement, until, settled, approve, revision, record });
  await verifyCatalogBlueprints({ page, id, label, click, fill, selectElement, until, settled, approve, revision, record });
  await verifyFoundationInterop({ page, origin, database: `axiom-studio-test-${randomUUID()}`, root: ROOT, id, label, text, click, clickElement, fill, fillElement, selectElement, until, settled, approve, revision, record });
  await verifyCompositionWorkspace({ page, origin, database: `axiom-studio-test-${randomUUID()}`, root: ROOT, id, label, text, click, clickElement, fill, fillElement, selectElement, until, settled, approve, revision, record });
  await verifyBehaviorEditor({ page, origin, database: `axiom-studio-test-${randomUUID()}`, root: ROOT, id, label, text, click, clickElement, fill, fillElement, selectElement, until, settled, approve, revision, record });
  await verifyPolicyWorkspace({ page, origin, database: `axiom-studio-test-${randomUUID()}`, root: ROOT, id, label, text, click, clickElement, fill, fillElement, selectElement, until, settled, approve, revision, record });
  await verifyAuthoringWorkspace({ page, origin, database: `axiom-studio-test-${randomUUID()}`, root: ROOT, id, label, text, click, clickElement, fill, selectElement, until, settled, approve, revision, record });
  await verifyBindingRepair({ page, origin, database: `axiom-studio-test-${randomUUID()}`, root: ROOT, id, click, fill, selectElement, until, settled, approve, revision, record });
  assert.deepEqual(browser.cdp.errors, []); evidence.status = "PASSED";
} catch (error) { evidence.error = { message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  const cleanupErrors = [];
  for (const action of [() => terminate(browser), stopServer, async () => {
    if (!temp) return;
    const relativeTemp = relative(resolve(tmpdir()), resolve(temp));
    if (!within(resolve(tmpdir()), resolve(temp)) || !relativeTemp.startsWith("axiom-workbench-") || /[\\/]/.test(relativeTemp)) throw Error("Refusing cleanup outside dedicated workbench directory");
    await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }]) try { await action(); } catch (error) { cleanupErrors.push(error.message); }
  if (cleanupErrors.length) { evidence.cleanupErrors = cleanupErrors; evidence.status = "FAILED"; process.exitCode = 1; }
  evidence.elapsedMs = Date.now() - started;
  await mkdir(join(ROOT, "dist/evidence"), { recursive: true });
  await writeFile(join(ROOT, "dist/evidence/workbench.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence, null, 2));
}
