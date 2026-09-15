import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Public UI authoring sequences use a dedicated database; source reads only verify saved results. */
export async function verifyAuthoringWorkspace({ page, origin, database, root, id, label, text, click, clickElement, fill, selectElement, until, settled, approve, revision, record }) {
  assert.match(database, /^axiom-studio-test-/);
  await mkdir(join(root, "dist/evidence"), { recursive: true });
  const viewport = async (width, height) => { await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }); await settled(); };
  const capture = async name => { await page.evaluate("document.fonts.ready"); await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 }); await page.evaluate("Promise.all(document.getAnimations().filter(animation=>animation.playState==='running'&&Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>animation.finished.catch(()=>{})))"); await settled(); const shot = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(join(root, "dist/evidence", `authoring-${name}.png`), Buffer.from(shot.data, "base64")); };
  const appearance = async theme => { if (await page.evaluate(`document.documentElement.dataset.theme!==${JSON.stringify(theme)}`)) await click("studio-theme-toggle"); };
  const reload = async () => { const before = await page.evaluate("performance.timeOrigin"); await page.send("Page.reload"); await until(`performance.timeOrigin!==${before} && ${id("studio-app")} && !${id("open-export")}.disabled`); };
  const saved = () => page.evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open(${JSON.stringify(database)});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('commits','readonly'),cursor=tx.objectStore('commits').openCursor(null,'prev');cursor.onsuccess=()=>{const state=JSON.parse(cursor.result.value.stateText);resolve(Object.values(state.project.documents).map(entry=>entry.document));};cursor.onerror=()=>reject(cursor.error);tx.oncomplete=()=>db.close();};})`);
  await page.send("Page.navigate", { url: `${origin}/?database=${database}` }); await until(id("onboarding")); await viewport(1440, 1080);
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  await fill("project-name", "Architecture authoring");
  assert.equal(await page.evaluate(`(${label("Token template", "select")}).options.length`), 6, "All architectures are available during onboarding");
  await click("starter-enabled"); await click("start-project"); await until(`${id("studio-app")} && !${id("undo")}.disabled`);
  const baseline = await revision();
  await click("view-foundation"); await clickElement(text("Templates"));
  assert.equal(await page.evaluate("document.querySelectorAll('.starter-template-choice input').length"), 6);
  assert.equal(await page.evaluate("document.querySelectorAll('.foundation-navigation button').length && Array.from(document.querySelectorAll('.foundation-navigation button')).some(e=>e.textContent==='Connections')"), false);
  for (const template of ["essentials", "radix", "carbon", "material", "fluent", "spectrum"]) {
    await clickElement(`document.querySelector('.starter-template-choice input[value="${template}"]').closest('label')`);
    assert.equal(await page.evaluate(`document.querySelector('.starter-template-choice input[value="${template}"]').checked`), true);
    assert.ok(await page.evaluate("document.querySelector('.starter-alias-chain').textContent.includes('action.primary.background')"));
    assert.equal(await revision(), baseline, "Selecting a template only changes its proposal controls");
    assert.equal(await page.evaluate(`${id("review-changes")}?.disabled ?? true`), true);
  }
  await clickElement(text("Clear all"));
  assert.equal(await page.evaluate(`${id("apply-foundation-template")}.disabled`), true);
  assert.equal(await page.evaluate("document.querySelectorAll('.starter-domain-choice input:checked').length"), 0);
  assert.ok(await page.evaluate("document.querySelector('.starter-domain-empty').textContent.includes('Select at least one')"));
  await clickElement(text("Select all"));
  const spacing = "document.querySelector('.starter-domain-choice input[aria-label=Spacing]')";
  await page.evaluate(`(${spacing}).focus()`);
  for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key: " ", code: "Space", windowsVirtualKeyCode: 32 }); await settled();
  assert.equal(await page.evaluate(`(${spacing}).checked`), false, "Domain selection retains native keyboard semantics");
  await clickElement(`(${spacing}).closest('label')`);
  await clickElement("document.querySelector('.starter-template-choice input[value=radix]').closest('label')");
  for (const theme of ["dark", "light"]) {
    await appearance(theme); await viewport(1440, 1080); await page.evaluate("document.querySelector('.foundation-panel').scrollTop=0"); await capture(`templates-desktop-${theme}`);
    await viewport(390, 844); await capture(`templates-narrow-${theme}`);
    assert.ok(await page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), "Template selection does not add a page-level horizontal scrollbar");
  }
  await viewport(1440, 1080); await appearance("dark");
  await clickElement("document.querySelector('[aria-label=\"Template preview theme\"] button:last-child')");
  assert.ok(await page.evaluate("document.querySelector('.starter-alias-chain').textContent.includes('radix.color.brand.dark.9')"));
  await click("apply-foundation-template"); assert.equal(await revision(), baseline, "Adding a starter waits for common review");
  await approve(); const templateRevision = await revision(); assert.notEqual(templateRevision, baseline);
  await reload(); assert.equal(await revision(), templateRevision);
  const foundation = (await saved()).find(document => document.kind === "foundation");
  assert.ok(foundation.tokens.some(token => token.name === "radix.color.neutral.light.1" && token.metadata.template === "radix"));
  assert.equal(foundation.domains.length, 11);
  record("architectureTemplates", { choices: 6, onboarding: true, selectionDoesNotMutate: true, emptySelectionBlocksApply: true, keyboardCheckbox: true, actualDarkAliasPreview: true, reviewedRadixSaveAndReload: true, domains: 11 });

  await click("view-library"); await click("create-custom-component"); await until(id("component-composer"));
  assert.equal(await page.evaluate("document.querySelectorAll('.composer-starts input').length"), 6);
  for (const start of ["blank", "stack", "article", "button", "input", "card"]) {
    await click(`composer-${start}`); assert.equal(await page.evaluate(`${id(`composer-${start}`)}.checked`), true);
    assert.equal(await page.evaluate(`${id("composer-create")}.disabled`), false);
    if (start === "article") assert.ok(await page.evaluate("Boolean(document.querySelector('.composer-preview article[data-part-id] h2[data-part-id]'))"));
    if (start === "button") assert.ok(await page.evaluate("Boolean(document.querySelector('.composer-preview button[data-part-id]'))"));
    if (start === "input") assert.ok(await page.evaluate("Boolean(document.querySelector('.composer-preview input'))"));
    assert.equal(await revision(), templateRevision);
  }
  await clickElement(text("Cancel")); assert.equal(await revision(), templateRevision);
  assert.equal(await page.evaluate(`${id("review-changes")}?.disabled ?? true`), true, "Cancel does not leave a project edit");
  await click("create-custom-component"); await until(id("component-composer")); await click("composer-article"); await fill("composer-name", "Release article");
  await until("document.querySelector('.composer-preview h2')?.textContent==='Release article'");
  for (const theme of ["dark", "light"]) {
    // Theme control belongs to the application behind the modal. Close/reopen preserves source,
    // then re-enter the same uncommitted choices without clicking through its modal barrier.
    if (await page.evaluate(`document.documentElement.dataset.theme!==${JSON.stringify(theme)}`)) { await clickElement(text("Cancel")); await appearance(theme); await click("create-custom-component"); await click("composer-article"); await fill("composer-name", "Release article"); }
    const planeContrast = await page.evaluate(`(()=>{const foreground=getComputedStyle(document.querySelector('.composer-preview h2')).color,background=getComputedStyle(document.querySelector('.composer-preview-plane')).backgroundColor;const l=text=>text.match(/[\\d.]+/g).slice(0,3).map(Number).reduce((sum,value,index)=>{const channel=value/255;return sum+(channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4)*[.2126,.7152,.0722][index]},0);const a=l(foreground),b=l(background);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)})()`);
    assert.ok(planeContrast >= 4.5, "Composer paints the project's preview environment behind authored text");
    await viewport(1440, 1080); await capture(`composer-desktop-${theme}`); await viewport(390, 844); await capture(`composer-narrow-${theme}`);
    assert.ok(await page.evaluate("document.querySelector('.workbench-dialog').scrollWidth<=document.querySelector('.workbench-dialog').clientWidth+1"), "Composer fits its narrow modal");
  }
  await viewport(1440, 1080);
  const priorFrames = await page.evaluate("Array.from(document.querySelectorAll('[data-component-frame]')).map(e=>e.dataset.componentFrame)");
  await click("composer-create"); await until(`!${id("component-composer")} && document.querySelectorAll('[data-component-frame]').length===4`);
  const componentId = await page.evaluate(`Array.from(document.querySelectorAll('[data-component-frame]')).map(e=>e.dataset.componentFrame).find(id=>!${JSON.stringify(priorFrames)}.includes(id))`);
  assert.ok(componentId); assert.equal(await revision(), templateRevision);
  await approve(); const articleRevision = await revision(); await reload(); assert.equal(await revision(), articleRevision);
  await click(`component-${componentId}`);
  assert.ok(await page.evaluate(`Boolean(${id(`preview-${componentId}`)}.querySelector('article[data-part-id] h2[data-part-id]'))`));
  const component = (await saved()).find(document => document.id === componentId); assert.equal(component.name, "Release article");
  record("componentComposer", { starts: 6, nativeButtonAndInputPreview: true, semanticArticlePreview: true, cancelPreservesSource: true, nameFeedsLivePreview: true, reviewedArticleSaveAndReload: true });

  const heading = "Array.from(document.querySelectorAll('.element-tree button')).find(e=>e.querySelector('span').textContent==='Heading')";
  await clickElement(heading); assert.equal(await page.evaluate(`${id("part-element")}.value`), "h2");
  await selectElement(id("part-element"), "p");
  const headingId = component.parts.find(part => part.studioRole === "heading").id;
  const headingNode = `${id(`preview-${componentId}`)}.querySelector('[data-part-id="${headingId}"]')`;
  assert.equal(await page.evaluate(`(${headingNode}).tagName`), "P");
  await approve(); const elementRevision = await revision(); await reload(); await click(`component-${componentId}`); await clickElement(heading);
  assert.equal(await page.evaluate(`${id("part-element")}.value`), "p"); assert.equal(await page.evaluate(`(${headingNode}).tagName`), "P");
  await clickElement("document.querySelector('.element-tree button')");
  await click("slot-add-optional"); assert.equal(await page.evaluate(`${id("content-required")}.checked`), false); assert.equal(await page.evaluate(`${id("content-multiple")}.checked`), true);
  await click("content-required"); await click("content-multiple");
  assert.equal(await page.evaluate(`${id("content-required")}.checked`), true); assert.equal(await page.evaluate(`${id("content-multiple")}.checked`), false);
  await approve(); await reload(); await click(`component-${componentId}`);
  assert.equal(await page.evaluate(`${id("content-required")}.checked`), true); assert.equal(await page.evaluate(`${id("content-multiple")}.checked`), false);
  await clickElement(text("Remove content area")); assert.ok(await page.evaluate(`Boolean(${id("slot-add-optional")})`));
  await approve(); await reload(); await click(`component-${componentId}`);
  assert.ok(await page.evaluate(`Boolean(${id("slot-add-optional")})`)); assert.notEqual(await revision(), elementRevision);
  await capture("elements-desktop");
  record("elementAndContentAuthoring", { hierarchicalSelection: true, headingTagChangedToParagraph: true, htmlMappingSavedAndReloaded: true, contentAreaAddUpdateRemove: true, requiredAndMultiplicitySavedAndReloaded: true, sourceContractNotInstanceInjection: true });
}
