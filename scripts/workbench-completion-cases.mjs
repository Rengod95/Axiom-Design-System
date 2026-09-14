import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Real browser regressions for the owner's blocked-review and Foundation completion report. */
export async function verifyEditorCompletion({ page, origin, database, root, id, label, text, click, clickElement, fill, fillElement, select, selectElement, until, settled, approve, revision, record }) {
  const captures = join(root, "dist/evidence/completion"); await mkdir(captures, { recursive: true });
  const capture = async name => { const image = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(join(captures, `${name}.png`), Buffer.from(image.data, "base64")); };
  const viewport = async (width, height, mobile = false) => { await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile }); await settled(); };
  await page.send("Page.navigate", { url: `${origin}/?database=${database}` });
  await until(id("onboarding")); await viewport(1440, 1080);
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  if (await page.evaluate("document.documentElement.dataset.theme!=='light'")) await click("studio-theme-toggle");
  await fill("project-name", "Forma system"); await capture("01-onboarding-light");
  assert.equal(await page.evaluate(`${id("starter-enabled")}.checked`), true);
  await click("start-project"); await until(`${id("studio-app")} && !${id("undo")}.disabled`);
  await click("view-foundation"); await clickElement(text("Domains"));
  assert.equal(await page.evaluate("document.querySelectorAll('[data-testid^=domain-page-]').length"), 11);
  assert.equal(await page.evaluate("Boolean(document.querySelector('.unassigned-row'))"), false);
  await viewport(1312, 958); await capture("02-domains-light");
  await clickElement("Array.from(document.querySelectorAll('.domain-directory-row')).find(e=>e.querySelector('strong').textContent==='Typography')");
  await clickElement(text("Semantic"));
  assert.ok(await page.evaluate("Array.from(document.querySelectorAll('.foundation-table tbody tr')).filter(e=>e.getClientRects().length).every(e=>e.textContent.includes('Semantic'))"));
  await clickElement("Array.from(document.querySelectorAll('[data-testid^=foundation-row-]')).find(e=>e.textContent.includes('typography.body'))?.querySelector('button')");
  await capture("03-typography-light");
  await clickElement(text("Connections"));
  assert.ok(await page.evaluate("document.querySelectorAll('.relationship-tree ul ul').length > 0"));
  await capture("04-connections-light");
  const usageSelector = "document.querySelector('.relationship-usage-link[data-usage-category=Mobile]')";
  const usage = await page.evaluate(`(()=>{const e=${usageSelector};return{component:e.dataset.usageComponent,part:e.dataset.usagePart,label:e.textContent}})()`);
  assert.match(usage.label, /Mobile/); assert.match(usage.label, /Rule|Layout/);
  assert.ok(await page.evaluate("new Set(Array.from(document.querySelectorAll('.relationship-usage-link')).map(e=>e.textContent)).size>10"));
  const usageRevision = await revision();
  await clickElement(usageSelector);
  await until(`${id("category-mobile")}.getAttribute('aria-pressed')==='true'`);
  assert.equal(await page.evaluate(`${id("component-name")}.value`), "Button");
  assert.equal(await page.evaluate(`${id("part-name")}.value`), "root");
  assert.equal(await revision(), usageRevision);
  await click("view-foundation"); await clickElement(text("Connections"));
  await clickElement(text("Themes")); await capture("05-themes-light");
  await click("studio-theme-toggle"); await capture("06-themes-dark");
  record("starterWorkspace", { domains: 11, allTokensClassified: true, semanticFilter: true, aliasTree: true, distinguishableDesignPropertyUses: true, usagePartNavigation: true, themeWorkspace: true });

  await click("view-library"); await fill("catalog-search", "");
  assert.ok(await page.evaluate("document.querySelectorAll('.catalog-thumbnail').length > 5"));
  await capture("07-library-dark");
  await click("create-custom-component"); await until("document.querySelectorAll('[data-component-frame]').length===4");
  const componentId = await page.evaluate("Array.from(document.querySelectorAll('[data-component-frame]')).map(e=>e.dataset.componentFrame).find(id=>!id.startsWith('component.'))");
  await click(`component-${componentId}`);
  await fill("component-name", "Profile summary");
  await clickElement(text("Typography, effects and states", "summary"));
  await select("appearance-rule-property", "boxShadow");
  const shadow = await page.evaluate(`Array.from(${id("appearance-rule-binding")}.options).find(e=>e.textContent==='elevation.md').value`);
  await select("appearance-rule-binding", shadow);
  // A valid buffered form can go straight to common review; no separate Apply barrier.
  await approve();
  assert.ok(await page.evaluate(`getComputedStyle(${id(`preview-${componentId}`)}.querySelector('[data-part-id]')).boxShadow!=='none'`));
  record("directReview", { pendingTypedBindingFlushed: true, reviewedShadowVisible: true });
  await fill("component-name", ""); await click("review-changes");
  assert.ok(await page.evaluate("Boolean(document.querySelector('.input-notice'))"));
  assert.equal(await page.evaluate(`${id("component-name")}.value`), "");
  await click("reset-pending-input"); await until(`${id("component-name")}.value==='Profile summary'`);
  assert.equal(await page.evaluate(`Boolean(${id("operation-error")})`), false);
  await fill("component-name", "Profile block"); await approve();
  record("blockedInspectorRecovery", { invalidTextRetained: true, resetRestoresLastGoodValue: true, commonReviewRecovered: true });

  const beforeZoom = await page.evaluate(`Number(${id("zoom-level")}.value)`), beforeRevision = await revision();
  const point = await page.evaluate(`(()=>{const r=${id("canvas-viewport")}.getBoundingClientRect();return{x:r.x+r.width*.5,y:r.y+r.height*.5}})()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseWheel", deltaX: 0, deltaY: -40, modifiers: 2, ...point }); await settled();
  assert.ok(await page.evaluate(`Number(${id("zoom-level")}.value)`)>beforeZoom);
  assert.equal(await page.evaluate("window.visualViewport.scale"), 1); assert.equal(await revision(), beforeRevision);
  record("trackpadGesture", { controlWheelZoomsCanvas: true, browserPageScaleUnchanged: true, projectRevisionUnchanged: true, physicalHardware: "unverified" });
  await click("zoom-fit");
  await clickElement(text("Motion timeline", "summary")); await click("motion-preset-opacity"); await click("motion-track-apply");
  await until(`${id("motion-play")}`); await click("motion-play"); await click("motion-pause");
  assert.ok(await page.evaluate(`Array.from(${id(`preview-${componentId}`)}.querySelectorAll('[data-part-id]')).some(e=>e.getAnimations().length>0)`));
  await clickElement(label("Motion timeline", "input"));
  assert.ok(await page.evaluate(`Number((${label("Motion timeline", "input")}).value)>0`));
  await clickElement(text("Reset", "button"));
  await capture("08-motion-dark");
  await approve(); record("motionAuthoring", { typedTrackReviewed: true, actualWebAnimation: true, pauseAndReset: true });

  await click("view-foundation"); await clickElement(text("Domains")); await viewport(390, 844, true);
  // Responsive panel navigation has an explicit workspace control.
  await clickElement("Array.from(document.querySelectorAll('.mobile-panel-tabs button')).find(e=>e.textContent.trim()==='Workspace')");
  await capture("09-foundation-mobile-dark");
  assert.ok(await page.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"));
  await click("studio-theme-toggle"); await capture("10-foundation-mobile-light");
  await viewport(1440, 1080); record("responsiveAppearance", { desktopWidths: [1440, 1312], mobileWidth: 390, themes: ["light", "dark"], documentOverflow: false });
}

/** File input, live property bindings and history run on their own disposable database. */
export async function verifyFoundationInterop({ page, origin, database, root, id, label, text, click, clickElement, fill, fillElement, selectElement, until, settled, approve, revision, record }) {
  const captures = join(root, "dist/evidence/interop"); await mkdir(captures, { recursive: true });
  const capture = async name => { await settled(); const image = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(join(captures, `${name}.png`), Buffer.from(image.data, "base64")); };
  const viewport = async (width, height, mobile = false) => { await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile }); await settled(); };
  const chooseFile = async (name, content, input = "Choose token file") => {
    const path = join(captures, name); await writeFile(path, JSON.stringify(content, null, 2));
    const document = await page.send("DOM.getDocument", { depth: 0 });
    const node = await page.send("DOM.querySelector", { nodeId: document.root.nodeId, selector: `input[aria-label="${input}"]` });
    await page.send("DOM.setFileInputFiles", { nodeId: node.nodeId, files: [path] }); await settled();
  };
  await page.send("Page.navigate", { url: `${origin}/?database=${database}` }); await until(id("onboarding")); await viewport(1600, 1080);
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  if (await page.evaluate("document.documentElement.dataset.theme!=='light'")) await click("studio-theme-toggle");
  await fill("project-name", "Orbit foundation"); await click("starter-enabled"); await click("start-project"); await until(id("studio-app"));
  await click("view-foundation"); await clickElement(text("Files")); await until(id("dtcg-source"));
  const data = { space: { $type: "dimension", base: { $value: { value: 8, unit: "px" } }, control: { $value: "{space.base}" } }, measure: { $type: "number", $value: { $ref: "#/space/base/$value/value" } }, title: { $type: "typography", $value: { fontFamily: "SUIT", fontSize: "{space.base}", fontWeight: 450, letterSpacing: { value: 0, unit: "px" }, lineHeight: 1.5 } } };
  const initial = await revision();
  await chooseFile("tokens.json", data); await until(`${id("dtcg-source")}.value.includes('space') && !${id("dtcg-import-apply")}.disabled`);
  assert.equal(await revision(), initial); await capture("desktop-light");
  await click("dtcg-import-apply"); await approve(); const saved = await revision(); assert.notEqual(saved, initial);
  await click("undo"); await until(`(${id("save-status")}).textContent.includes('Saved')`); await click("redo"); await until(`(${id("save-status")}).textContent.includes('Saved')`);
  await clickElement(text("Tokens"));
  const row = name => `Array.from(document.querySelectorAll('.foundation-table tbody tr')).find(e=>e.querySelector('.token-name-cell > span:last-child')?.firstChild.textContent===${JSON.stringify(name)})`;
  await until(row("measure")); await clickElement(`${row("measure")}.querySelector('button')`);
  assert.equal(await page.evaluate(`(${label("Value source", "select")}).value`), "expression");
  assert.equal(await page.evaluate(`(${label("Binding property 1", "select")}).value`), "/value");
  await fillElement(label("Token description", "textarea"), "A linked numeric measurement");
  await clickElement("Array.from(document.querySelectorAll('.foundation-inspector label')).find(e=>e.textContent.trim()==='Deprecated').querySelector('input')"); await fillElement(label("Deprecation guidance", "textarea"), "Use space.control for new components");
  await approve();
  assert.equal(await page.evaluate(`(${label("Value source", "select")}).value`), "expression");
  await clickElement(`${row("space.base")}.querySelector('button')`);
  const numeric = "document.querySelector('.foundation-inspector input[aria-label=Value]')";
  await fillElement(numeric, "24"); await approve();
  assert.ok(await page.evaluate(`${row("measure")}.textContent.includes('24')`));
  await clickElement(`${row("title")}.querySelector('button')`); await fillElement(label("Token description", "textarea"), "Composite type with a live font size"); await approve();
  assert.equal(await page.evaluate(`(${label("Value source", "select")}).value`), "expression");
  await clickElement(text("Connections")); assert.ok(await page.evaluate("document.querySelector('.relationship-tree').textContent.includes('title')"));
  await clickElement(text("Tokens")); await clickElement(`${row("measure")}.querySelector('button')`); await capture("property-binding-light");
  await click("studio-theme-toggle"); await capture("property-binding-dark");
  // Malformed advanced input remains editable and reset restores its live binding.
  await clickElement(text("Edit expression JSON", "summary")); await fillElement(label("Binding expression", "textarea"), '{"ref":null}');
  await click("review-changes"); assert.ok(await page.evaluate("Boolean(document.querySelector('.input-notice'))"));
  await click("reset-pending-input"); assert.equal(await page.evaluate(`(${label("Binding property 1", "select")}).value`), "/value");
  record("dtcgReviewedImport", { nativeFileInput: true, originalProjectPreservedBeforeApply: true, reviewSaveUndoRedo: true, livePropertyAndComposite: true, metadataPreservesReferences: true, deprecation: true, invalidExpressionReset: true });
  await clickElement(text("Files"));
  const resolver = { version: "2025.10", sets: { base: { sources: [{ $ref: "base.json" }] } }, modifiers: { scheme: { default: "light", contexts: { light: [], dark: [{ scale: { $type: "number", $value: 9 } }] } } }, resolutionOrder: [{ $ref: "#/sets/base" }, { $ref: "#/modifiers/scheme" }] };
  await chooseFile("resolver.json", resolver); await until(`${id("dtcg-import-apply")}.disabled`);
  await chooseFile("base.json", { scale: { $type: "number", $value: 2 }, semantic: { $type: "number", $value: "{scale}" } }, "Choose referenced files");
  await until(`!${id("dtcg-import-apply")}.disabled`); await clickElement(text("dark")); await capture("resolver-dark");
  await click("dtcg-import-apply"); await approve();
  await clickElement(text("Tokens")); await until(row("semantic")); assert.ok(await page.evaluate(`${row("semantic")}.textContent.includes('9')`));
  await clickElement(text("Files")); await clickElement(text("Export", "[role=tab]")); await until(`!${id("dtcg-export")}.disabled`);
  await capture("export-dark"); await clickElement(text("Resolved values")); assert.equal(await page.evaluate(`${id("dtcg-export")}.disabled`), false);
  await clickElement(text("Import")); await fill("dtcg-source", "{"); await until(`${id("dtcg-import-apply")}.disabled`); assert.ok(await page.evaluate("document.querySelector('.exchange-preview [role=alert]').textContent.length>0"));
  await clickElement(text("Try an example")); await until(`!${id("dtcg-import-apply")}.disabled`); await clickElement(text("Reject conflicts")); await until(`${id("dtcg-import-apply")}.disabled`);
  await clickElement(text("Add a name prefix", "summary")); await fillElement(label("Import prefix"), "external"); await until(`!${id("dtcg-import-apply")}.disabled`);
  await viewport(1312, 958); await capture("user-1312");
  await viewport(390, 844, true); await clickElement("Array.from(document.querySelectorAll('.mobile-panel-tabs button')).find(e=>e.textContent.trim()==='Workspace')"); await capture("mobile-dark");
  const strip = "document.querySelector('[role=tablist][aria-label=\"Foundation views\"]')";
  const tabBounds = `(()=>{const bar=${strip},tab=bar.querySelector('[aria-selected=true]'),r=bar.getBoundingClientRect(),a=tab.getBoundingClientRect();return a.left>=r.left-1&&a.right<=r.right+1})()`;
  assert.ok(await page.evaluate(tabBounds), "Selected Files tab must remain visible after resize");
  const scrollState = `(()=>{const rows=[];let e=${strip}.parentElement;while(e){rows.push(e.scrollTop);e=e.parentElement}return rows})()`;
  const beforeTabKeys = await page.evaluate(scrollState);
  await page.evaluate(`${strip}.querySelector('[aria-selected=true]').focus({preventScroll:true})`);
  for (const key of ["Home", "End", "ArrowLeft", "ArrowRight", "ArrowLeft"]) {
    for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key, code: key });
    await settled(); assert.ok(await page.evaluate(tabBounds));
  }
  assert.equal(await page.evaluate(`${strip}.querySelector('[aria-selected=true]').textContent`), "Files");
  assert.deepEqual(await page.evaluate(scrollState), beforeTabKeys, "Tab navigation must not jump parent panels");
  assert.ok(await page.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"));
  await click("studio-theme-toggle"); await capture("mobile-light");
  assert.ok(await page.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"));
  await viewport(1600, 1080); await clickElement(text("Files")); await clickElement(text("Export", "[role=tab]")); await capture("export-light");
  record("dtcgResolverAndExchange", { suppliedFilesOnly: true, selectedContextApplied: true, exportModes: ["references", "resolved"], invalidSourceRecovery: true, prefixConflictRecovery: true, selectedTabVisibleOnResizeAndKeys: true, tabKeysPreserveParentScroll: true, desktopWidths: [1600, 1312], mobileWidth: 390, themes: ["light", "dark"] });
}
