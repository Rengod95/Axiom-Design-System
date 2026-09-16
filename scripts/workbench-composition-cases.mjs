import assert from "node:assert/strict";
import { seedLegacyFoundation } from "./workbench-foundation-cases.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Public editing flows run on a disposable database; saved sources are read only for assertions. */
export async function verifyCompositionWorkspace({ page, origin, database, root, id, label, text, click, clickElement, fill, fillElement, selectElement, until, settled, approve, revision, record }) {
  assert.match(database, /^axiom-studio-test-/);
  const saved = () => page.evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open(${JSON.stringify(database)});r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('commits','readonly'),c=tx.objectStore('commits').openCursor(null,'prev');c.onsuccess=()=>resolve(Object.values(JSON.parse(c.result.value.stateText).project.documents));c.onerror=()=>reject(c.error);tx.oncomplete=()=>db.close();};})`);
  const reload = async () => { const before = await page.evaluate("performance.timeOrigin"); await page.send("Page.reload"); await until(`performance.timeOrigin!==${before} && ${id("studio-app")} && !${id("open-export")}.disabled`); };
  const element = name => `Array.from(document.querySelectorAll('.element-tree button')).find(e=>e.querySelector('span')?.textContent===${JSON.stringify(name)})`;
  const source = async componentId => (await saved()).find(entry => entry.document.id === componentId).document;
  const frameIds = () => page.evaluate("Array.from(document.querySelectorAll('[data-component-frame]')).map(e=>e.dataset.componentFrame)");
  await page.send("Page.navigate", { url: `${origin}/?database=${database}` }); await until(id("onboarding"));
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1080, deviceScaleFactor: 1, mobile: false });
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  await fill("project-name", "Element composition"); await click("start-project"); await until(`${id("studio-app")} && !${id("undo")}.disabled`);
  await seedLegacyFoundation({ page, database, id, until }); await click("view-canvas");
  const originals = Object.fromEntries((await saved()).map(entry => [entry.document.id, entry.originalText]));
  let before = await frameIds(); await click("view-library"); await click("create-custom-component"); await click("composer-checkbox"); await fill("composer-name", "Checkbox"); await click("composer-create"); await approve();
  const childId = (await frameIds()).find(value => !before.includes(value)); assert.ok(childId);
  const childBefore = await source(childId);
  assert.equal(childBefore.studioReference, undefined, "Instance value editing uses an authored Checkbox from the custom composer");
  before = await frameIds(); await click("view-library"); await click("create-custom-component"); await click("composer-blank"); await fill("composer-name", "Product frame"); await click("composer-create"); await approve();
  const ownerId = (await frameIds()).find(value => !before.includes(value)); assert.ok(ownerId); await click(`component-${ownerId}`);
  const ownerRoot = (await source(ownerId)).parts.find(part => part.parent === null);
  await selectElement(id("layout-mode"), "free");
  for (const kind of ["frame", "box", "text"]) { await click(`part-${ownerRoot.id}`); await click(`element-add-${kind}`); }
  await approve();
  const definition = await source(ownerId), box = definition.parts.find(part => part.name === "Box 1"), textPart = definition.parts.find(part => part.studioText === "Text");
  assert.ok(box && textPart); assert.ok(definition.parts.some(part => part.name === "Frame 1"));
  await clickElement(element("Box 1")); await click("zoom-selection"); await settled();
  const drag = async (handle, dx, dy) => {
    const point = await page.evaluate(`(()=>{const r=${id(handle)}.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await page.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", buttons: 1, clickCount: 1, ...point });
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", buttons: 1, x: point.x + dx, y: point.y + dy });
    await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: point.x + dx, y: point.y + dy }); await settled();
  };
  const boxNode = `${id(`preview-${ownerId}`)}.querySelector('[data-part-id="${box.id}"]')`;
  const oldX = await page.evaluate(`(${boxNode}).style.left`), oldWidth = await page.evaluate(`(${boxNode}).style.width`), beforeMove = await revision();
  await drag("element-move", 30, 18); assert.notEqual(await page.evaluate(`(${boxNode}).style.left`), oldX); assert.equal(await revision(), beforeMove);
  await drag("element-resize", 30, 20); assert.notEqual(await page.evaluate(`(${boxNode}).style.width`), oldWidth); await approve();
  const changedX = await page.evaluate(`(${boxNode}).style.left`); await click("undo"); await until(`(${boxNode}).style.left===${JSON.stringify(oldX)}`); await click("redo"); await until(`(${boxNode}).style.left===${JSON.stringify(changedX)}`);
  await clickElement(element("Text 1"));
  const textNode = `${id(`preview-${ownerId}`)}.querySelector('[data-part-id="${textPart.id}"]')`;
  const point = await page.evaluate(`(()=>{const r=(${textNode}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  for (const count of [1,2]) for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, button: "left", clickCount: count, ...point });
  await until(id("element-inline-text")); await fill("element-inline-text", "Build once. Reuse everywhere.");
  for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", modifiers: 2, windowsVirtualKeyCode: 13 }); await settled();
  await approve(); await reload(); await click(`component-${ownerId}`);
  assert.equal(await page.evaluate(`(${textNode}).textContent`), "Build once. Reuse everywhere.");
  record("freeElements", { boxFrameText: true, pointerMoveAndResizeAtCanvasZoom: true, groupedReview: true, undoRedo: true, inlineTextSaveAndReload: true });

  await clickElement(element((ownerRoot.name === "root" ? "Root" : ownerRoot.name))); await selectElement(id("layout-mode"), "stack");
  await selectElement(id("instance-source"), childId); await click("instance-insert"); await approve();
  const instance = (await source(ownerId)).studioComposition.instances[0]; assert.equal(instance.componentRef.id, childId);
  const nested = `document.querySelector('[data-instance-id="${instance.id}"] input[type=checkbox]')`;
  assert.ok(await page.evaluate(`Boolean(${nested})`), "A real checkbox renders inside the frame");
  await clickElement(`${id(`instance-${instance.id}`)}.querySelector('input[type=checkbox][aria-label=checked]')`); await approve();
  assert.equal(await page.evaluate(`(${nested}).checked`), true); assert.deepEqual(await source(childId), childBefore);
  const composedRevision = await revision(); await click("mode-run"); await clickElement(nested); assert.equal(await page.evaluate(`(${nested}).checked`), false); assert.equal(await revision(), composedRevision);
  await click("mode-edit"); assert.equal(await page.evaluate(`(${nested}).checked`), true);
  await clickElement(nested); assert.equal(await page.evaluate("document.querySelector('.element-tree button[aria-current=true] span').textContent"), (ownerRoot.name === "root" ? "Root" : ownerRoot.name), "Nested click selects its owning element, never a foreign part ID");
  await click(`component-${childId}`); await clickElement(text("Component", "summary")); await fill("component-name", "Consent checkbox"); await clickElement(text("Elements", "summary")); await approve();
  await click(`component-${ownerId}`); await clickElement(element((ownerRoot.name === "root" ? "Root" : ownerRoot.name))); assert.ok(await page.evaluate("Boolean(document.querySelector('.instance-placeholder'))"));
  assert.equal((await source(ownerId)).studioComposition.instances[0].componentRef.revision, instance.componentRef.revision);
  await click("instance-refresh"); await approve(); await reload(); await click(`component-${ownerId}`); await clickElement(element((ownerRoot.name === "root" ? "Root" : ownerRoot.name)));
  assert.equal(await page.evaluate(`(${nested}).checked`), true); assert.notEqual((await source(ownerId)).studioComposition.instances[0].componentRef.revision, instance.componentRef.revision);
  await mkdir(join(root, "dist/evidence"), { recursive: true });
  for (const theme of ["dark", "light"]) {
    if (await page.evaluate(`document.documentElement.dataset.theme!==${JSON.stringify(theme)}`)) await click("studio-theme-toggle");
    await page.evaluate("document.fonts.ready"); await settled(); const shot = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(join(root, `dist/evidence/composition-${theme}.png`), Buffer.from(shot.data, "base64"));
  }
  for (const entry of await saved()) if (Object.hasOwn(originals, entry.document.id)) assert.equal(entry.originalText, originals[entry.document.id]);
  record("componentInstances", { actualNativeCheckbox: true, sourceUnchangedByOverride: true, transientRunState: true, ownerSelection: true, staleSourceExplicitReview: true, overrideSurvivesRefreshAndReload: true, originalBytesPreserved: true });
}
