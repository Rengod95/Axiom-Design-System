import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Real pointer authoring on a disposable project, followed by read-only source assertions. */
export async function verifyCompoundWorkspace({ page, origin, database, root, id, text, click, clickElement, fill, until, settled, approve, revision, record }) {
  assert.match(database, /^axiom-studio-test-/);
  const saved = () => page.evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open(${JSON.stringify(database)});r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('commits','readonly'),c=tx.objectStore('commits').openCursor(null,'prev');c.onsuccess=()=>resolve(Object.values(JSON.parse(c.result.value.stateText).project.documents));c.onerror=()=>reject(c.error);tx.oncomplete=()=>db.close();};})`);
  await page.send("Page.navigate", { url: `${origin}/?database=${database}` }); await until(id("onboarding"));
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1080, deviceScaleFactor: 1, mobile: false });
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  await fill("project-name", "Compound anatomy"); await click("starter-enabled"); await click("start-project"); await until(`${id("studio-app")} && !${id("undo")}.disabled`);
  const originals = Object.fromEntries((await saved()).map(entry => [entry.document.id, entry.originalText]));
  await click("view-library"); await click("create-custom-component"); await click("composer-accordion"); await fill("composer-name", "Accordion"); await click("composer-create"); await approve();
  const source = () => saved().then(entries => entries.find(entry => entry.document.kind === "component" && entry.document.catalogProfile?.catalogId === "catalog.accordion").document);
  const component = await source(), componentId = component.id;
  assert.equal(component.studioReference, undefined, "Compound element authoring uses an Accordion from the custom composer");
  const role = value => component.parts.find(part => part.studioRole === value);
  const preview = id(`preview-${componentId}`);
  const nodes = partId => `${preview}.querySelectorAll('[data-part-id="${partId}"]')`;
  const node = partId => `(${nodes(partId)})[0]`;
  await click(`component-${componentId}`); await click("zoom-selection");
  assert.equal(role("trigger").parent, role("header").id); assert.equal(role("panel").parent, role("item").id);
  assert.equal(await page.evaluate("document.querySelectorAll('.inspector .element-tree, .inspector [data-testid=element-add-box]').length"), 0);
  await click(`part-${role("trigger").id}`); await click("element-add-box"); await approve();
  const box = (await source()).parts.find(part => part.studioElement === "box");
  await click(`part-${box.id}`); await click("element-add-text"); await approve();
  const caption = (await source()).parts.find(part => part.studioElement === "text");
  await fill("part-text", "Nested trigger detail"); await clickElement(text("Elements", "summary")); await approve();
  assert.equal(await page.evaluate(`Array.from(${nodes(caption.id)}).every(e=>e.parentElement.dataset.partId===${JSON.stringify(box.id)} && !!e.closest('button[aria-expanded]'))`), true);
  assert.equal(await page.evaluate(`${nodes(caption.id)}.length`), 3);
  assert.equal(await page.evaluate(`${preview}.querySelectorAll('button div,button p,button textarea').length`), 0);
  await clickElement(`${id(`part-${box.id}`)}.querySelector('.structure-disclosure')`);
  await until(`${id(`part-${box.id}`)}.getAttribute('aria-expanded')==='false' && ${id(`part-${box.id}`)}.getAttribute('aria-selected')==='true'`);
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('[role=treeitem][tabindex=\"0\"]')).filter(e=>e.getClientRects().length).length"), 1);
  await page.evaluate(`${id(`part-${box.id}`)}.focus()`);
  for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  await until(`${id(`part-${box.id}`)}.getAttribute('aria-expanded')==='true'`);
  record("compoundAnatomy", { actualItemHeaderTriggerContent: true, nestedPhrasingContainers: true, sharedCollectionTemplate: true, leftStructureOnly: true, collapseRetainsVisibleKeyboardSelection: true });

  // Draw into Content at 75%, then into the new free-position Frame at 50%.
  await click(`part-${role("panel").id}`); await fill("layout-minHeight", "200"); await clickElement(text("Layout", "summary")); await approve();
  await fill("zoom-level", "75"); await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await settled();
  const draw = async (parentId, kind, width, height, cancel = false) => {
    await click(`canvas-draw-${kind}`);
    const point = await page.evaluate(`(()=>{const e=${node(parentId)},r=e.getBoundingClientRect();return{x:r.left+24,y:r.top+30}})()`);
    await page.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", buttons: 1, clickCount: 1, ...point });
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", buttons: 1, x: point.x + width, y: point.y + height }); await settled();
    assert.ok(await page.evaluate(`Boolean(${id("canvas-drawing")})`));
    if (cancel) { for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); }
    await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: point.x + width, y: point.y + height }); await settled();
  };
  const before = await revision(), countBefore = (await source()).parts.length;
  await draw(role("panel").id, "frame", 144, 84, true);
  assert.equal(await revision(), before); assert.equal((await source()).parts.length, countBefore);
  assert.equal(await page.evaluate(`Boolean(${id("review-strip")})`), false);
  await draw(role("panel").id, "frame", 144, 84);
  await until(`${id("review-strip")}`); assert.equal(await revision(), before); await approve();
  const frame = (await source()).parts.find(part => part.studioElement === "frame"); assert.equal(frame.parent, role("panel").id);
  const designs = (await saved()).filter(entry => entry.document.kind === "design" && entry.document.componentRef.id === componentId).map(entry => entry.document);
  const layout = design => design.layout.find(node => node.targetPartRef === frame.id);
  assert.equal(layout(designs.find(design => design.category === "Web")).size.width.value.value, 192);
  assert.equal(layout(designs.find(design => design.category === "Mobile")).size.width.value.value, 240);
  assert.ok(await page.evaluate(`Math.abs(parseFloat(${node(frame.id)}.style.width)-192)<=8`));
  await click("undo"); await until(`!${node(frame.id)}`); await click("redo"); await until(node(frame.id));
  await fill("zoom-level", "50"); for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await settled();
  await draw(frame.id, "box", 48, 28); await approve();
  const nestedBox = (await source()).parts.find(part => part.studioElement === "box" && part.parent === frame.id); assert.ok(nestedBox);
  assert.equal(await page.evaluate(`${node(nestedBox.id)}.style.position`), "absolute");
  assert.ok(await page.evaluate(`Math.abs(parseFloat(${node(nestedBox.id)}.style.width)-96)<=8`));
  const beforeReload = await page.evaluate("performance.timeOrigin"); await page.send("Page.reload"); await until(`performance.timeOrigin!==${beforeReload} && ${id("studio-app")} && !${id("open-export")}.disabled`);
  await click(`component-${componentId}`); await click(`part-${nestedBox.id}`); await click("zoom-selection");
  assert.ok(await page.evaluate(`Boolean(${node(nestedBox.id)})`));
  assert.equal((await source()).parts.find(part => part.id === nestedBox.id).parent, frame.id);
  const ownerPosition = await page.evaluate(`document.querySelector('[data-component-frame="${componentId}"]').style.left`);
  const childPosition = await page.evaluate(`parseFloat(${node(nestedBox.id)}.style.left)`);
  await page.evaluate(`${id("canvas-viewport")}.focus()`);
  for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  await until(`parseFloat(${node(nestedBox.id)}.style.left)===${childPosition + 1}`); await approve();
  assert.equal(await page.evaluate(`document.querySelector('[data-component-frame="${componentId}"]').style.left`), ownerPosition);
  await page.evaluate(`${id("canvas-viewport")}.focus()`);
  for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: "Delete", code: "Delete", windowsVirtualKeyCode: 46 });
  await until(`!${node(nestedBox.id)}`); await approve(); assert.ok(await source());
  await click("undo"); await until(node(nestedBox.id));
  record("canvasCompoundInsertion", { cancellationDoesNotWrite: true, drawAt75Percent: true, nestedFreeFrameAt50Percent: true, reviewBeforeCommit: true, undoRedo: true, survivesReload: true, keyboardEditsElementWithoutMovingOrDeletingOwner: true });

  await click("mode-run"); const runRevision = await revision();
  const trigger = node(role("trigger").id), panel = node(role("panel").id);
  const expanded = await page.evaluate(`${trigger}.getAttribute('aria-expanded')`);
  await clickElement(trigger); assert.notEqual(await page.evaluate(`${trigger}.getAttribute('aria-expanded')`), expanded);
  assert.equal(await page.evaluate(`${panel}.hidden`), expanded === "true"); assert.equal(await revision(), runRevision);
  const relations = await page.evaluate(`Array.from(${nodes(role("trigger").id)}).map(e=>({controls:e.getAttribute('aria-controls'),id:e.id}))`);
  assert.equal(new Set(relations.map(item => item.controls)).size, 3);
  assert.equal(new Set(relations.map(item => item.id)).size, 3);
  await click("mode-edit"); await click(`part-${caption.id}`);
  await mkdir(join(root, "dist/evidence"), { recursive: true });
  for (const theme of ["light", "dark"]) {
    if (await page.evaluate(`document.documentElement.dataset.theme!==${JSON.stringify(theme)}`)) await click("studio-theme-toggle");
    await page.evaluate("document.fonts.ready"); await settled(); const shot = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(join(root, `dist/evidence/compound-${theme}.png`), Buffer.from(shot.data, "base64"));
  }
  for (const entry of await saved()) if (Object.hasOwn(originals, entry.document.id)) assert.equal(entry.originalText, originals[entry.document.id]);
  record("compoundInteraction", { uniqueAriaRelationships: true, transientExpansion: true, originalsPreserved: true, darkAndLight: true });
}
