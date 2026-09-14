import assert from "node:assert/strict";

/** Exercise the authored controls through the visible browser UI, not the form proxy. */
export async function verifyCompactWorkbench({ page, id, label, text, click, clickElement, fill, selectElement, until, settled, revision, record }) {
  const before = await revision();
  const press = async key => { for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key, code: key === " " ? "Space" : key.length === 1 ? `Key${key.toUpperCase()}` : key }); await settled(); };
  await click("view-foundation"); await clickElement(text("Tokens")); await click("token-view-visual"); await fill("foundation-search", "");
  for (const name of ["Filter domain", "Filter tier", "Filter type"]) await selectElement(label(name, "select"), "all");
  const source = label("Filter type", "select"), trigger = `(${source}).parentElement.querySelector('[data-select-trigger]')`;
  await clickElement(trigger); await until("document.querySelector('.select-popup')");
  await press("End"); assert.equal(await page.evaluate("document.querySelector('.select-popup [data-active=true]').textContent"), "typography");
  await press("Home"); await press("ArrowDown"); await press("Enter");
  assert.equal(await page.evaluate(`(${source}).value`), "color");
  assert.equal(await page.evaluate("document.querySelector('.select-popup')===null"), true);
  await press("g"); await until("document.querySelector('.select-popup [data-active=true]')?.textContent==='gradient'");
  await press("Escape"); assert.equal(await page.evaluate(`(${source}).value`), "color", "Escape preserves the committed choice");
  await clickElement(trigger); await clickElement(text("Aliases only"));
  assert.equal(await page.evaluate("document.querySelector('.select-popup')===null"), true, "An outside click dismisses the menu");
  await clickElement(text("Aliases only"));
  await clickElement(trigger); await clickElement("Array.from(document.querySelectorAll('.select-option')).find(e=>e.textContent==='dimension')");
  assert.equal(await page.evaluate(`(${source}).value`), "dimension");
  await clickElement(trigger); await press("Home"); await press("Tab");
  assert.equal(await page.evaluate(`(${source}).value`), "all", "Tab commits the active option and continues focus navigation");
  assert.notEqual(await page.evaluate(`document.activeElement===(${trigger})`), true);
  await selectElement(source, "color"); await fill("foundation-search", "color.brand.");
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('.material-name')).some(e=>e.textContent==='200')"), true);
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('.material-color .token-visual')).every(e=>Math.abs(e.clientWidth-e.clientHeight)<1)"), true);
  await clickElement("document.querySelector('.material-group .section-add-token')");
  assert.equal(await page.evaluate(`${id("foundation-token-name")}.value`), "color.brand.");
  assert.equal(await page.evaluate(`${id("foundation-token-type")}.value`), "color");
  assert.equal(await page.evaluate(`(${label("Domain", "select")}).selectedOptions[0].textContent`), "Color");
  assert.equal(await page.evaluate(`(${label("Tier", "select")}).selectedOptions[0].textContent`), "Primitive");
  // Switching an untouched creation context must remount defaults without losing another edited form.
  await fill("foundation-search", "color.neutral."); await clickElement("document.querySelector('.material-group .section-add-token')");
  assert.equal(await page.evaluate(`${id("foundation-token-name")}.value`), "color.neutral.");
  await clickElement(text("Cancel")); await fill("foundation-search", ""); await selectElement(source, "all");
  const geometry = await page.evaluate("(()=>{const p=document.querySelector('.foundation-panel'),n=document.querySelector('.foundation-navigation'),top=n.getBoundingClientRect().top;p.scrollTop=400;return{top}})()");
  await settled();
  assert.ok(Math.abs(await page.evaluate("document.querySelector('.foundation-navigation').getBoundingClientRect().top") - geometry.top) < 1, "Foundation tabs stay fixed in their scrolling pane");
  await page.evaluate("document.querySelector('.foundation-panel').scrollTop=0");
  const appearance = await page.evaluate("(()=>{const s=getComputedStyle(document.documentElement);return{font:s.getPropertyValue('--font-ui'),neutral:['--surface','--surface-subtle','--surface-hover','--surface-active','--canvas','--line','--line-strong'].map(k=>s.getPropertyValue(k).trim()),glass:getComputedStyle(document.querySelector('.sidebar')).backdropFilter,nav:document.querySelector('.workspace-nav .nav-item').getBoundingClientRect().height,footer:document.querySelector('.statusbar').getBoundingClientRect().height}})()");
  assert.ok(appearance.font.startsWith("Geist"));
  assert.ok(appearance.neutral.every(value => /^#([0-9a-f]{2})\1\1$/i.test(value)), "Studio neutrals are achromatic");
  assert.ok(appearance.glass.includes("blur")); assert.equal(appearance.nav, 36); assert.equal(appearance.footer, 28);
  assert.equal(await revision(), before, "Browsing, changing UI filters and cancelling contextual creation preserve the project");
  record("compactGlassControls", { visibleDropdownKeyboardAndPointer: true, typeahead: true, escapeAndOutsideDismissal: true, tabCommit: true, contextualCreation: true, contextualReentry: true, squareColorSurfaces: true, localTokenLabels: true, stickyNavigation: true, neutralShades: true, geist: true, navHeight: 36, footerHeight: 28 });
}
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Trusted test-only journal seed models documents saved by the former type-only validator. */
export async function verifyBindingRepair({ page, origin, database, root, id, click, fill, selectElement, until, settled, approve, revision, record }) {
  assert.match(database, /^axiom-studio-test-/);
  await page.send("Page.navigate", { url: `${origin}/?database=${database}` });
  await until(id("onboarding")); await fill("project-name", "Binding recovery"); await click("start-project");
  await until(`${id("studio-app")} && !${id("undo")}.disabled`);
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  const latest = await page.evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open(${JSON.stringify(database)});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('commits','readonly'),get=tx.objectStore('commits').openCursor(null,'prev');get.onsuccess=()=>resolve(get.result.value);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close();};})`);
  const { canonicalJson } = await import("../modules/ads-core/src/index.ts");
  const { createBrowserCommit } = await import("../modules/browser-store/src/journal.ts");
  const state = JSON.parse(latest.stateText), foundation = state.project.documents["foundation.system"].document;
  const wrongToken = foundation.tokens.find(token => token.name === "space.2"); assert.ok(wrongToken);
  const replacement = foundation.tokens.find(token => token.name === "radius.control"); assert.ok(replacement);
  for (const name of ["design.button.web", "design.card.web"]) {
    const entry = state.project.documents[name];
    entry.document.appearance[0].declarations.borderRadius = { tokenRef: wrongToken.id };
    entry.currentText = canonicalJson(entry.document);
  }
  const conditional = state.project.documents["design.button.web"];
  conditional.document.appearance[1].declarations.borderRadius = { tokenRef: wrongToken.id };
  conditional.currentText = canonicalJson(conditional.document);
  const commit = createBrowserCommit(state, { storageFormatVersion: latest.storageFormatVersion, sequence: latest.sequence, commitDigest: latest.commitDigest });
  await page.evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open(${JSON.stringify(database)});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['commits','meta'],'readwrite'),commit=${JSON.stringify(commit)};tx.objectStore('commits').add(commit,commit.sequence);tx.objectStore('meta').put({storageFormatVersion:commit.storageFormatVersion,sequence:commit.sequence,commitDigest:commit.commitDigest},'head');tx.oncomplete=()=>{db.close();resolve(true)};tx.onabort=()=>{db.close();reject(tx.error)};};})`);
  await page.send("Page.reload"); await until(id("open-binding-repair"));
  const before = await revision();
  const capture = async name => { await page.evaluate("document.fonts.ready"); const shot = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(join(root, "dist/evidence", `quiet-repair-${name}.png`), Buffer.from(shot.data, "base64")); };
  await click("open-binding-repair"); await until(`${id("binding-repair-dialog")}.open`);
  assert.equal(await page.evaluate(`getComputedStyle(${id("binding-repair-dialog")}).borderRadius`), "16px");
  assert.equal(await page.evaluate(`${id("binding-repair-progress")}.textContent`), "0 / 3");
  const rowLabels = await page.evaluate("Array.from(document.querySelectorAll('select[data-testid^=binding-repair-select-]')).map(e=>e.getAttribute('aria-label'))");
  assert.equal(new Set(rowLabels).size, 3, "Base and conditional rules have distinguishable repair labels");
  assert.ok(rowLabels.some(label => label.includes("outlined")));
  assert.equal(await page.evaluate(`${id("binding-repair-apply")}.disabled`), true);
  if (await page.evaluate("document.documentElement.dataset.theme!=='dark'")) {
    await click("binding-repair-cancel"); await click("studio-theme-toggle"); await click("open-binding-repair");
  }
  await capture("desktop");
  await selectElement(id("binding-repair-select-0"), `token:${replacement.id}`);
  assert.equal(await page.evaluate(`${id("binding-repair-apply")}.disabled`), true, "One repaired document cannot commit while another remains incompatible");
  await click("binding-repair-cancel"); assert.equal(await revision(), before);
  await click("open-binding-repair");
  assert.equal(await page.evaluate(`${id("binding-repair-progress")}.textContent`), "0 / 3", "Cancelled transient choices do not change source or linger");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }); await settled(); await capture("mobile");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false }); await settled();
  await click("binding-repair-cancel"); await click("studio-theme-toggle"); await click("open-binding-repair"); await capture("light");
  for (const index of [0, 1, 2]) await selectElement(id(`binding-repair-select-${index}`), `token:${replacement.id}`);
  await click("binding-repair-apply"); await until(`!${id("binding-repair-dialog")}`);
  assert.equal(await revision(), before, "Preparing the complete repair does not save it before review");
  await approve(); assert.notEqual(await revision(), before);
  assert.equal(await page.evaluate(`Boolean(${id("open-binding-repair")})`), false);
  await page.send("Page.reload"); await until(`${id("studio-app")} && !${id("open-export")}.disabled`);
  assert.equal(await page.evaluate(`Boolean(${id("open-binding-repair")})`), false, "Reviewed repair survives reopening");
  record("atomicBindingRepair", { incompatibleDocuments: 2, incompatibleSites: 3, distinctRuleContexts: true, noPartialCommit: true, cancelPreservesSource: true, reviewedAtomicRepair: true, survivesReload: true });
}

/** Token candidates retain their property purpose as well as their DTCG value type. */
export async function verifyBindingPurposeFilters({ page, id, text, click, clickElement, selectElement, revision, record }) {
  const before = await revision();
  await click("view-canvas"); await clickElement("document.querySelector('.sidebar [data-testid^=component-]')");
  const beforeStatus = await page.evaluate(`${id("save-status")}.textContent`);
  const names = testId => page.evaluate(`Array.from(${id(testId)}.options).filter(o=>!o.disabled && !['literal','inherited'].includes(o.value)).map(o=>o.textContent)`);
  const verified = {};
  for (const [property, expected, excluded] of [
    ["borderRadius", /radius\./, /space\.|size\.|font\.|border\./],
    ["fontSize", /font\.size\.|text\.body\.size/, /radius\.|space\.|border\.width/],
    ["borderWidth", /stroke\.width/, /radius\.|space\.|font\.size/],
    ["opacity", /alpha\.|opacity\./, /lineHeight|layer\.|z\./],
  ]) {
    const values = await names(`appearance-${property}-binding`);
    assert.ok(values.some(value => expected.test(value)), `${property} retains related tokens`);
    assert.ok(values.every(value => !excluded.test(value)), `${property} excludes unrelated same-type tokens`);
    verified[property] = values.length;
  }
  await clickElement(text("Typography, effects and states", "summary"));
  await selectElement(id("appearance-rule-property"), "lineHeight");
  const lineHeight = await names("appearance-rule-binding");
  assert.ok(lineHeight.some(value => value.includes("lineHeight")));
  assert.ok(lineHeight.every(value => !/alpha\.|opacity\.|layer\.|z\./.test(value)));
  assert.equal(await page.evaluate(`${id("save-status")}.textContent`), beforeStatus, "Changing the inspected property must not create a false dirty value of the previous type");
  assert.equal(await page.evaluate(`${id("appearance-rule-property")}.disabled`), false);
  assert.equal(await revision(), before);
  record("bindingPurposeFilters", { sameTypeDomainsSeparated: verified, extendedLineHeight: lineHeight.length, projectPreserved: true });
}

export async function verifyPanelVisibility({ page, id, text, click, clickElement, fill, until, settled, revision, record }) {
  await click("view-canvas");
  await clickElement("document.querySelector('.sidebar [data-testid^=component-]')");
  const before = await revision(), originalName = await page.evaluate(`${id("component-name")}.value`);
  const initialWidth = await page.evaluate("document.querySelector('.workarea').clientWidth");
  await fill("component-name", "");
  await click("toggle-inspector"); await click("toggle-sidebar");
  assert.equal(await page.evaluate(`${id("toggle-inspector")}.getAttribute('aria-expanded')`), "false");
  assert.equal(await page.evaluate("getComputedStyle(document.querySelector('#studio-inspector')).display"), "none");
  assert.equal(await page.evaluate(`${id("component-name")}.value`), "", "Hiding the inspector retains its invalid draft");
  assert.ok(await page.evaluate("document.querySelector('.workarea').clientWidth") > initialWidth + 400, "Both panes release their width to the work area");
  await click("review-changes"); await until("document.querySelector('.input-notice')");
  await clickElement(text("Component properties"));
  await until(`document.activeElement===${id("component-name")}`);
  assert.equal(await page.evaluate(`${id("toggle-inspector")}.getAttribute('aria-expanded')`), "true", "Draft recovery reopens a hidden inspector");
  await click("reset-pending-input");
  assert.equal(await page.evaluate(`${id("component-name")}.value`), originalName);
  await click("toggle-sidebar");
  const chrome = await page.evaluate("(()=>{const a=document.querySelector('.app');return{header:getComputedStyle(a.querySelector('.topbar')).backgroundImage,headerShadow:getComputedStyle(a.querySelector('.topbar')).boxShadow,footer:getComputedStyle(a.querySelector('.statusbar')).backgroundImage,radii:[...a.querySelectorAll('.topbar .button,.workspace-nav .nav-item,.sidebar-scroll .nav-item,.select-trigger')].map(e=>getComputedStyle(e).borderRadius),gaps:[...a.querySelectorAll('.sidebar-token')].slice(0,4).map(e=>parseFloat(getComputedStyle(e).marginBottom))}})()");
  assert.equal(chrome.header, "none"); assert.equal(chrome.headerShadow, "none"); assert.equal(chrome.footer, "none");
  assert.ok(chrome.radii.every(radius => ["8px", "12px"].includes(radius))); assert.ok(chrome.radii.includes("12px") && chrome.radii.includes("8px")); assert.ok(chrome.gaps.length && chrome.gaps.every(gap => gap === 2));
  await click("toggle-sidebar"); await click("toggle-inspector");
  assert.deepEqual(await page.evaluate("[localStorage.getItem('axiom.ui.sidebarCollapsed'),localStorage.getItem('axiom.ui.inspectorCollapsed')]"), ["true", "true"]);
  await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }); await settled();
  await clickElement("document.querySelectorAll('.mobile-panel-tabs button')[1]");
  await clickElement("document.querySelectorAll('.mobile-panel-tabs button')[2]");
  assert.equal(await page.evaluate("getComputedStyle(document.querySelector('#studio-inspector')).display"), "flex", "Mobile panel navigation remains available despite desktop collapse preferences");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false }); await settled();
  await click("toggle-sidebar"); await click("toggle-inspector");
  assert.equal(await revision(), before, "Layout preferences and draft reset create no project revision");
  record("panelVisibility", { independentPanels: true, releasedCanvasWidth: true, hiddenDraftPreserved: true, recoveryReopensInspector: true, persistedPreferences: true, mobileNavigation: true, opticalRadii: [8, 12], objectRowGap: 2, flatHeaderFooter: true });
}

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
  await selectElement(label("Filter tier", "select"), await page.evaluate(`Array.from((${label("Filter tier", "select")}).options).find(e=>e.textContent==='Semantic').value`));
  assert.ok(await page.evaluate("document.querySelectorAll('.material-group').length>0 && Array.from(document.querySelectorAll('.material-group')).every(e=>e.dataset.tokenTier==='Semantic')"));
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
  await clickElement(text("Tokens")); await click("token-view-list");
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
  await clickElement(text("Tokens")); await click("token-view-list"); await clickElement(`${row("measure")}.querySelector('button')`); await capture("property-binding-light");
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
  await clickElement(text("Tokens")); await click("token-view-list"); await until(row("semantic")); assert.ok(await page.evaluate(`${row("semantic")}.textContent.includes('9')`));
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


/** Runs against the existing disposable starter project after the completion cases. */
export async function verifyMaterialWorkbench({ page, id, label, text, click, clickElement, fill, selectElement, until, settled, revision, record }) {
  await click("view-foundation"); await clickElement(text("Tokens")); await click("token-view-visual");
  for (const [name, value] of [["Filter domain", "all"], ["Filter tier", "all"], ["Filter type", "all"]]) await selectElement(label(name, "select"), value);
  await fill("foundation-search", "");
  const before = await revision();
  const types = await page.evaluate("[...new Set(Array.from(document.querySelectorAll('.material-select [data-visual-type]')).map(e=>e.dataset.visualType))].sort()");
  assert.deepEqual(types, ["border", "color", "cubicBezier", "dimension", "duration", "fontFamily", "fontWeight", "gradient", "number", "shadow", "strokeStyle", "transition", "typography"].sort());
  assert.ok(await page.evaluate("Array.from(document.querySelectorAll('.material-color .token-visual')).every(e=>{const r=e.getBoundingClientRect();return r.width>=20&&Math.abs(r.height-r.width)<1}) && Boolean(document.querySelector('.shared-measure-track')) && Boolean(document.querySelector('.editorial-type'))"), "Color surfaces stay square; length and typography use purpose-specific displays");
  await fill("foundation-search", "space.");
  const names = await page.evaluate("Array.from(document.querySelectorAll('.material-select .sr-only')).map(e=>e.textContent)");
  assert.ok(names.indexOf("space.2") < names.indexOf("space.12"), "Numeric scales use natural ordering");
  const first = await page.evaluate("document.querySelector('.material-token').dataset.testid");
  await clickElement(`${id(first)}.querySelector('.material-select')`);
  assert.equal(await page.evaluate("document.querySelectorAll('.material-token input[type=checkbox]').length"), 0);
  await click("token-selection-mode");
  await clickElement(`${id(first)}.querySelector('input[type=checkbox]')`);
  await click("token-view-list");
  assert.equal(await page.evaluate(`${id(first)}.querySelector('input').checked`), true);
  assert.equal(await page.evaluate(`${id(first)}.querySelector('button').getAttribute('aria-pressed')`), "true");
  await clickElement(text("Clear selection")); await click("token-view-visual");
  assert.equal(await revision(), before, "Browsing and selection do not edit a project");
  record("materialAtlas", { types: 13, naturalScales: true, selectionSurvivesListSwitch: true, readonlyBrowsing: true });

  await fill("foundation-search", "duration.300"); await clickElement("document.querySelector('.material-select')");
  const inheritedReducedMotion = await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] }); await settled();
  // Keep the real 300ms animation inspectable independently of CI/CDP latency.
  await page.send("Animation.enable");
  const { playbackRate } = await page.send("Animation.getPlaybackRate");
  await page.send("Animation.setPlaybackRate", { playbackRate: 0 });
  try {
    await clickElement(label("Replay motion", "button"));
    await page.evaluate("new Promise(resolve=>setTimeout(resolve,400))");
    assert.equal(await page.evaluate("document.querySelector('.inspector-material .motion-dot').getAnimations()[0]?.effect.getTiming().duration"), 300);
    await page.evaluate("document.querySelector('.inspector-material .motion-dot').getAnimations()[0].currentTime=150"); await settled();
    assert.ok(await page.evaluate("document.querySelector('.inspector-material .motion-dot').getBoundingClientRect().left-document.querySelector('.inspector-material .motion-track').getBoundingClientRect().left>0"), "Seeking the real animation moves its specimen");
    await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await settled();
    assert.equal(await page.evaluate("document.querySelector('.inspector-material .motion-dot').getAnimations().length"), 0, "A preference change cancels an existing animation");
    await clickElement(label("Replay motion", "button"));
    assert.equal(await page.evaluate("document.querySelector('.inspector-material .motion-dot').getAnimations().length"), 0, "Reduced motion prevents replay");
  } finally {
    await page.send("Animation.setPlaybackRate", { playbackRate });
    await page.send("Animation.disable");
    await page.send("Emulation.setEmulatedMedia", { features: [] });
  }
  assert.equal(await revision(), before);
  record("materialMotion", { inheritedReducedMotion, explicitPreferenceCases: true, tokenDrivenPlayback: true, controlledDocumentClock: true, nativeSeekingMovesSpecimen: true, cancelsOnReducedMotion: true, noSourceEdit: true });

  try {
    for (const preference of ["no-preference", "reduce"]) {
      await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: preference }] }); await settled();
      await fill("foundation-token-name", "");
      await clickElement(text("Definition", "summary"));
      await click("review-changes");
      await until("Boolean(document.querySelector('.input-notice'))");
      assert.equal(await page.evaluate(`${id("foundation-token-name")}.closest('details').open`), true, "Invalid draft focus reveals its collapsed group");
      await until(`document.activeElement===${id("foundation-token-name")}`);
      await click("reset-pending-input");
      assert.equal(await page.evaluate(`${id("foundation-token-name")}.value`), "duration.300");
    }
  } finally { await page.send("Emulation.setEmulatedMedia", { features: [] }); }
  record("collapsedDraftRecovery", { detailsRevealed: true, invalidControlFocused: true, bothMotionPreferences: true, resetPreservesSource: true });
}
