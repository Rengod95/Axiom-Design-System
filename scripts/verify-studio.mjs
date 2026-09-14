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
const evidence = { kind: "axiom-real-studio-regression", status: "FAILED", browser: null, cases: {}, limitations: ["Chromium only; Mobile is a DOM approximation.", "Source download is not native installation or platform certification."] };
const start = Date.now();
const selector = id => `[data-testid=${JSON.stringify(id)}]`;
let browser, server, temp, page;
async function until(expression) {
  const deadline = Date.now() + 30_000;
  do { if (await page.evaluate(`Boolean(${expression})`)) return; await delay(80); } while (Date.now() < deadline);
  const detail = await page.evaluate(`({text:document.body.innerText.slice(-1600),theme:document.getElementById("theme-select")?.value})`);
  throw new Error(`Studio condition timed out: ${expression}; detail: ${JSON.stringify(detail)}; browser errors: ${browser.cdp.errors.join("; ")}`);
}
const element = id => `document.querySelector(${JSON.stringify(selector(id))})`;
async function reveal(id) {
  const index = await page.evaluate(`(()=>{const target=${element(id)};let closed=null;for(let e=target;e;e=e.parentElement)if(e.tagName==='DETAILS'&&!e.open&&!e.querySelector(':scope > summary')?.contains(target))closed=e;return closed?Array.from(document.querySelectorAll('details')).indexOf(closed):-1})()`);
  if(index<0)return;
  const point=await page.evaluate(`(()=>{const e=document.querySelectorAll('details')[${index}].querySelector('summary');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  for(const type of ['mousePressed','mouseReleased'])await page.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...point});
  await delay(280);await reveal(id);
}
async function click(id) {
  await reveal(id);
  await until(`${element(id)} && !${element(id)}.disabled`);
  await page.evaluate(`${element(id)}.scrollIntoView({block:"center",inline:"nearest"})`);
  const bounds = await page.evaluate(`(()=>{const r=${element(id)}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...bounds });
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...bounds });
  await page.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))`);
}
async function fill(id, value) {
  await reveal(id);
  await until(`${element(id)} && !${element(id)}.disabled`);
  await page.evaluate(`${element(id)}.focus()`);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 });
  await page.send("Input.insertText", { text: value });
}
async function select(id, value) { await page.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`); await page.evaluate(`(()=>{const e=${element(id)};e.value=${JSON.stringify(value)};e.dispatchEvent(new Event("change",{bubbles:true}));})()`); }
async function serve() {
  const child = spawn(process.execPath, ["scripts/serve-studio.mjs"], { cwd: ROOT, windowsHide: true, env: { ...process.env, AXIOM_STUDIO_PORT: "0" }, stdio: ["ignore", "pipe", "pipe"] });
  server = child;
  return await new Promise((accept, reject) => {
    const timer = setTimeout(() => reject(new Error("Studio server startup timed out")), 10_000);
    let output = "";
    child.stdout.on("data", data => { output += String(data); const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); accept(match[0]); } });
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("exit", code => { clearTimeout(timer); reject(new Error(`Studio server exited: ${code}`)); });
  });
}
try {
  temp = await mkdtemp(join(tmpdir(), "axiom-studio-"));
  const origin = await serve();
  for (const path of ["/package.json", "/app.js.map", "/build-evidence.json", "/docs/README.md"]) assert.equal((await fetch(origin + path)).status, 404);
  const executable = await browserPath(), profile = join(temp, "profile"), downloads = join(temp, "downloads");
  await mkdir(downloads);
  browser = await launch(executable, profile);
  evidence.browser = (await browser.cdp.send("Browser.getVersion")).product;
  await browser.cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
  const url = `${origin}/?database=axiom-studio-test-${randomUUID()}`;
  page = await browser.cdp.page(url);
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await fill("project-name", "검증 디자인 시스템");
  await click("starter-enabled"); await click("start-project");
  await until(`${element("studio-app")}`);
  // Locale-independent settled creation, then retain the source revision for preview checks.
  await until(`${element("save-status")} && !${element("undo")}.disabled`);
  const initialRevision = await page.evaluate(`${element("project-revision")}.title`);
  evidence.cases.create = { documentsShown: await page.evaluate(`document.querySelectorAll('[data-testid^="component-component."]').length`), authoritativeSave: true };
  assert.equal(evidence.cases.create.documentsShown, 3);
  assert.ok(await page.evaluate(`(()=>{const root=document.querySelector('[data-part-id="component.card.root"]'),body=document.querySelector('[data-part-id="component.card.body"]');return getComputedStyle(root).fontSize===getComputedStyle(body).fontSize && getComputedStyle(root).color===getComputedStyle(body).color})()`));
  await click("token-token.accent");
  const originalColor = await page.evaluate(`${element("token-value-input")}.value`);
  await fill("token-value-input", "#7451e8");
  await click("foundation-token-apply");
  await until(`${element("review-changes")} && !${element("review-changes")}.disabled`);
  assert.equal(await page.evaluate(`${element("project-revision")}.title`), initialRevision);
  assert.equal(await page.evaluate(`${element("open-export")}.disabled`), true);
  await click("review-changes");
  await until(`${element("review-dialog")}?.open`);
  assert.match(await page.evaluate(`${element("review-dialog")}.textContent`), /foundation.system/);
  await click("review-approve");
  await until(`!${element("review-dialog")} && !${element("open-export")}.disabled`);
  const changedRevision = await page.evaluate(`${element("project-revision")}.title`);
  assert.notEqual(changedRevision, initialRevision);
  await click("undo");
  await until(`${element("token-value-input")}.value === ${JSON.stringify(originalColor)}`);
  await click("redo");
  await until(`${element("token-value-input")}.value === "#7451e8"`);
  evidence.cases.reviewUndoRedo = { transientPreviewKeptRevision: true, exportBlockedUntilApply: true, oneUndoRestoresToken: true };
  await fill("token-value-input", "#123456");
  await click("foundation-token-apply");
  await click("review-changes");
  await click("review-reject");
  await until(`!${element("review-dialog")} && ${element("token-value-input")}.value === "#7451e8"`);
  evidence.cases.reject = true;
  await click("view-canvas");
  const lightPaint = await page.evaluate(`getComputedStyle(${element("runtime-button")}).backgroundColor`);
  await select("theme-select", "theme.dark");
  await until(`getComputedStyle(${element("runtime-button")}).backgroundColor !== ${JSON.stringify(lightPaint)}`);
  await click("token-token.accent");
  // Base authoring intentionally stays on its stored value; context editing shows the override.
  assert.equal(await page.evaluate(`${element("token-value-input")}.value`), "#7451e8");
  await page.evaluate(`(()=>{const e=document.querySelector('[data-testid="foundation-token-scope"]');e.value=[...e.options].find(option=>option.textContent.includes("dark")).value;e.dispatchEvent(new Event("change",{bubbles:true}));})()`);
  await until(`${element("token-value-input")}.value !== "#7451e8"`);
  await select("foundation-token-scope", "base");
  await click("view-canvas");
  await select("theme-select", "theme.light");
  await click("token-token.accent");
  await until(`${element("token-value-input")}.value === "#7451e8"`);
  await click("component-component.card");
  const cardBody = "한글 입력을 보존하는 디자인 시스템";
  await reveal("sample-body");
  await page.evaluate(`${element("sample-body")}.focus()`);
  // Genuine CDP composition (not a synthetic DOM event) remains transient until commit.
  await page.send("Input.imeSetComposition", { text: "한글", selectionStart: 2, selectionEnd: 2 });
  assert.equal(await page.evaluate(`${element("review-changes")} !== null`), false);
  await page.send("Input.insertText", { text: "한글" });
  await fill("sample-body", cardBody);
  await click("review-changes"); await click("review-approve");
  await until(`!${element("review-dialog")} && !${element("open-export")}.disabled`);
  await click("category-mobile"); assert.equal(await page.evaluate(`${element("category-mobile")}.getAttribute("aria-pressed")`), "true");
  // Direct selection on rendered child Part, not only the navigation tree.
  const bodyId = await page.evaluate(`document.querySelector('[data-testid="preview-component.card"] [data-part-id$=".body"]').dataset.partId`);
  await click(`preview-part-${bodyId}`);
  await until(`${element(`part-${bodyId}`)}.getAttribute("aria-pressed") === "true"`);
  await click("category-web");
  evidence.cases.authoring = { namedThemes: true, imeComposition: true, koreanContent: true, directPartSelection: true, webMobile: true };
  await click("source-tab");
  const adoptedSource = await page.evaluate(`${element("source-editor")}.value`);
  await fill("source-editor", '{ "broken": ');
  await click("source-preview");
  await until(`${element("operation-error")}`);
  assert.equal(await page.evaluate(`${element("source-editor")}.value`), '{ "broken": ');
  await click("source-capture");
  await until(`${element("status-message")}.textContent.includes("보관했습니다")`);
  await click("discard-changes");
  await until(`${element("source-editor")}.value === ${JSON.stringify(adoptedSource)}`);
  evidence.cases.invalidSource = { exactBufferPreserved: true, capturedAsDraft: true, adoptedSourceUnchanged: true };
  await click("mode-run");
  await until(`${element("activation-count")}?.textContent === "0"`);
  assert.ok(await page.evaluate(`(()=>{const r=getComputedStyle(${element("runtime-toast-close")});return parseFloat(r.width)>=44&&parseFloat(r.height)>=44})()`));
  await page.evaluate(`${element("runtime-button")}.focus()`);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await until(`${element("activation-count")}.textContent === "1"`);
  await page.evaluate(`(()=>{const e=document.getElementById("component.toast-close-response");e.value="decline";e.dispatchEvent(new Event("change",{bubbles:true}));})()`);
  await click("runtime-toast-close");
  await until(`${element("close-request-count")}.textContent === "1"`);
  assert.equal(await page.evaluate(`${element("runtime-toast-close")} !== null`), true);
  await page.evaluate(`(()=>{const e=document.getElementById("component.toast-close-response");e.value="accept";e.dispatchEvent(new Event("change",{bubbles:true}));})()`);
  await click("runtime-toast-close");
  await until(`${element("runtime-toast-close")} === null`);
  evidence.cases.runtime = { keyboardActivation: true, declinedCloseRetainsToast: true, acceptedCloseCleansUp: true };
  await click("mode-edit");
  await click("locale-toggle"); await until(`document.documentElement.lang === "en"`);
  assert.ok(await page.evaluate(`document.body.textContent.includes("Components")`));
  await click("locale-toggle");
  await mkdir(join(ROOT, "dist/evidence"), { recursive: true });
  const screenshot = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(ROOT, "dist/evidence/studio.png"), Buffer.from(screenshot.data, "base64"));
  evidence.cases.locale = ["ko", "en"];
  await click("open-export");
  for (const target of ["react", "react-native", "swiftui", "compose"]) {
    await click(`target-${target}`);
    await until(`${element("export-generated")} && !${element("export-download")}.disabled`);
    assert.ok(await page.evaluate(`${element("export-unverified")} !== null`));
    await click("export-download");
    const deadline = Date.now() + 10_000;
    while (!(await readdir(downloads)).includes(`axiom-${target}.zip`)) { if (Date.now() > deadline) throw new Error(`Missing target download ${target}`); await delay(100); }
    const bytes = await readFile(join(downloads, `axiom-${target}.zip`));
    assert.equal(bytes.readUInt32LE(0), 0x04034b50);
    assert.ok(bytes.length > 1000);
    evidence.cases[`download-${target}`] = bytes.length;
  }
  assert.deepEqual(browser.cdp.errors, []);
  await terminate(browser); browser = undefined;
  browser = await launch(executable, profile); page = await browser.cdp.page(url);
  await until(`${element("studio-app")}`);
  await click("token-token.accent"); await until(`${element("token-value-input")}.value === "#7451e8"`);
  await click("component-component.card");
  await until(`${element("sample-body")}.value === ${JSON.stringify(cardBody)}`);
  evidence.cases.processRestart = { colorRetained: true, koreanContentRetained: true, dedicatedProfile: true };
  assert.deepEqual(browser.cdp.errors, []);
  evidence.status = "PASSED";
} catch (error) { evidence.error = { message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  try { await terminate(browser); } catch (error) { evidence.cleanupError = error.message; process.exitCode = 1; evidence.status = "FAILED"; }
  server?.kill();
  if (temp) {
    if (!within(resolve(tmpdir()), resolve(temp)) || !relative(resolve(tmpdir()), resolve(temp)).startsWith("axiom-studio-")) throw new Error("Refusing cleanup outside dedicated Studio temporary directory");
    await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
  evidence.elapsedMs = Date.now() - start;
  await mkdir(join(ROOT, "dist/evidence"), { recursive: true });
  await writeFile(join(ROOT, "dist/evidence/studio.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence, null, 2));
}
