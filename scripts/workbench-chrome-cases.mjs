import assert from "node:assert/strict";

/** Saved starter fixture: exercise native chrome gestures and reviewed numeric authoring. */
export async function verifyBlueprintChrome({ page, id, label, text, click, clickElement, fill, fillElement, selectElement, until, settled, approve, revision, record }) {
  const press = async key => {
    for (const type of ["keyDown", "keyUp"]) await page.send("Input.dispatchKeyEvent", { type, key, code: key });
    await settled();
  };
  const focus = async expression => {
    await until(`(${expression}) && !(${expression}).matches(':disabled')`);
    await page.evaluate(`(${expression}).scrollIntoView({block:'center',inline:'nearest'});(${expression}).focus()`);
    await settled();
    assert.equal(await page.evaluate(`document.activeElement===(${expression})`), true);
  };
  const drag = async (expression, dx, dy) => {
    const point = await page.evaluate(`(()=>{const e=(${expression}),r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    assert.equal(await page.evaluate(`(()=>{const e=(${expression}),hit=document.elementFromPoint(${point.x},${point.y});return e===hit||e.contains(hit)})()`), true, "The gesture starts on the visible control");
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await page.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", buttons: 1, clickCount: 1, ...point });
    for (let step = 1; step <= 4; step++) await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", buttons: 1, x: point.x + dx * step / 4, y: point.y + dy * step / 4 });
    await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", buttons: 0, clickCount: 1, x: point.x + dx, y: point.y + dy });
    await settled();
  };
  const saved = `${id("studio-app")} && ${id("open-export")} && !${id("open-export")}.disabled`;
  const reloadSaved = async () => { await until(saved); const previousTimeOrigin = await page.evaluate("performance.timeOrigin"); await page.send("Page.reload"); await until(`performance.timeOrigin!==${previousTimeOrigin} && (${saved})`); await settled(); };
  const openPanels = async () => { for (const panel of ["sidebar", "inspector"]) if (await page.evaluate(`${id(`toggle-${panel}`)}.getAttribute('aria-expanded')==='false'`)) await click(`toggle-${panel}`); };
  await until(saved);
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  const chromeRevision = await revision();
  await reloadSaved(); await openPanels();

  // A reload remounts the sidebar; earlier tests may have expanded domains to reach tokens.
  const domains = await page.evaluate("Array.from(document.querySelectorAll('.sidebar-domain-toggle')).map(e=>({name:e.textContent,open:e.getAttribute('aria-expanded')}))");
  assert.ok(domains.length > 1, "The starter fixture exposes multiple token domains");
  assert.ok(domains.every(domain => domain.open === "false"), "Token domains start collapsed");
  const search = label("Search project", "input");
  await fillElement(search, "color.brand.");
  const matches = await page.evaluate("Array.from(document.querySelectorAll('.sidebar-token')).filter(e=>e.getClientRects().length).map(e=>({name:e.getAttribute('aria-label'),path:e.querySelector('.token-name-segments > span')?.textContent??'',leaf:e.querySelector('.token-name-segments > strong')?.textContent??''}))");
  assert.ok(matches.length > 1);
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('.sidebar-domain-toggle')).every(e=>e.getAttribute('aria-expanded')==='true')"), true, "Search reveals matching domains");
  assert.ok(matches.every(token => token.name.startsWith("color.brand.") && token.path === "brand" && token.leaf.length > 0), "Visible token paths omit their Color domain prefix while accessible names retain it");
  await fillElement(search, "");
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('.sidebar-domain-toggle')).every(e=>e.getAttribute('aria-expanded')==='false')"), true, "Clearing search restores the collapsed state");

  const width = () => page.evaluate("document.querySelector('#studio-sidebar').getBoundingClientRect().width");
  await focus(id("sidebar-resize")); await press("Home");
  assert.ok(Math.abs(await width() - 196) <= 1);
  await press("ArrowRight"); assert.ok(Math.abs(await width() - 204) <= 1);
  await press("End"); assert.ok(Math.abs(await width() - 400) <= 1);
  await press("Home"); await drag(id("sidebar-resize"), 57, 0);
  const resizedWidth = await width(); assert.ok(Math.abs(resizedWidth - 253) <= 1, "Pointer drag changes the actual navigation width");
  await until(`Math.abs(Number(localStorage.getItem('axiom.ui.sidebarWidth'))-${resizedWidth})<=1`);
  await click("toggle-sidebar"); await click("toggle-sidebar");
  assert.ok(Math.abs(await width() - resizedWidth) <= 1, "Collapse preserves the resized width");
  await reloadSaved(); await openPanels();
  assert.ok(Math.abs(await width() - resizedWidth) <= 1, "Reopening the saved project retains the layout preference");

  await fillElement(search, "color.");
  const viewport = "document.querySelector('.sidebar-scroll')";
  await until(`${viewport}.scrollHeight>${viewport}.clientHeight+80 && ${viewport}.id`);
  const viewportId = await page.evaluate(`${viewport}.id`);
  const scrollbar = `document.querySelector(${JSON.stringify(`.studio-scrollbar[data-axis="y"][aria-controls="${viewportId}"]`)})`;
  await until(scrollbar); await focus(scrollbar); await press("Home");
  assert.equal(await page.evaluate(`${viewport}.scrollTop`), 0);
  const native = await page.evaluate(`(()=>{const e=${viewport},s=getComputedStyle(e);return{gutter:e.offsetWidth-e.clientWidth-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),background:getComputedStyle(${scrollbar}).backgroundColor}})()`);
  assert.ok(Math.abs(native.gutter) <= 1, "The scroll viewport reserves no native scrollbar gutter");
  assert.equal(native.background, "rgba(0, 0, 0, 0)", "The overlay track stays transparent");
  await drag(`(${scrollbar}).querySelector('span')`, 0, 70);
  assert.ok(await page.evaluate(`${viewport}.scrollTop`) > 0, "Dragging the overlay thumb moves the native viewport");
  await focus(scrollbar); await press("End");
  await until(`Math.abs(${viewport}.scrollTop-(${viewport}.scrollHeight-${viewport}.clientHeight))<=1`);
  assert.ok(Math.abs(await page.evaluate(`Number((${scrollbar}).getAttribute('aria-valuenow'))-${viewport}.scrollTop`)) <= 1);
  await press("Home"); await press("ArrowDown");
  assert.ok(Math.abs(await page.evaluate(`${viewport}.scrollTop`) - 40) <= 1, "Scrollbar arrow keys scroll the native viewport");
  await press("Home"); await fillElement(search, "");

  await click("view-canvas");
  const dockColors = await page.evaluate("(()=>{const button=document.querySelector('.canvas-tools .icon-button.active[data-tool-label]');return{button:getComputedStyle(button).color,label:getComputedStyle(button,'::after').color,icon:getComputedStyle(button.querySelector('svg')).color}})()");
  assert.deepEqual(dockColors, { button: "rgb(21, 32, 9)", label: "rgb(21, 32, 9)", icon: "rgb(21, 32, 9)" }, "The active canvas dock label and icon inherit the documented on-accent foreground");
  const modeBefore = await page.evaluate(`${id("mode-run")}.getAttribute('aria-pressed')`);
  const hover = await page.evaluate(`(()=>{const r=${id("mode-run")}.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...hover });
  await until("document.querySelector('[role=tooltip]')?.textContent.includes('Interact')");
  assert.ok(await page.evaluate(`${id("mode-run")}.getAttribute('aria-describedby').includes('studio-tooltip')`));
  await press("Escape"); await until("!document.querySelector('[role=tooltip]')");
  assert.equal(await page.evaluate(`${id("mode-run")}.getAttribute('aria-pressed')`), modeBefore, "Hover explains the mode without activating it");
  assert.equal(await revision(), chromeRevision, "Search, resize, collapse, scrolling and tooltips preserve the project revision");
  record("blueprintChrome", { domainsInitiallyCollapsed: domains.length, searchRevealsMatches: true, domainPrefixOmitted: true, keyboardAndPointerResize: true, persistedWidth: resizedWidth, collapsePreservesWidth: true, nativeScrollbarPointerAndKeyboard: true, transparentTrack: true, noNativeGutter: true, activeDockForeground: dockColors, modeHoverTooltip: true, projectPreserved: true });

  // Opening and focusing sliders must remain clean. Literal editing then shares one reviewed plan.
  await clickElement("document.querySelector('.sidebar [data-testid^=component-]')");
  const transition = text("Default transition", "summary");
  if (await page.evaluate(`!(${transition}).parentElement.open`)) await clickElement(transition);
  const original = await page.evaluate(`({opacityBinding:${id("appearance-opacity-binding")}.value,radiusBinding:${id("appearance-borderRadius-binding")}.value,opacity:${id("appearance-opacity-value")}?.value??null,radius:${id("appearance-borderRadius-value")}?.value??null,duration:${id("motion-duration")}.value})`);
  await focus(id("motion-duration-slider")); await focus(id("motion-duration"));
  await page.evaluate("document.activeElement.blur()"); await settled();
  assert.equal(await page.evaluate(`${id("open-export")}.disabled`), false, "Mounting, focusing and blurring a slider creates no draft");
  const sliderRevision = await revision();
  for (const property of ["opacity", "borderRadius"]) if (await page.evaluate(`${id(`appearance-${property}-binding`)}.value!=='literal'`)) await selectElement(id(`appearance-${property}-binding`), "literal");
  for (const [name, minimum, maximum] of [["appearance-opacity-value", 0, 1], ["appearance-borderRadius-value", 0, 128], ["motion-duration", 0, 10000]]) {
    await focus(id(`${name}-slider`)); await press("Home");
    assert.equal(Number(await page.evaluate(`${id(name)}.value`)), minimum, `${name}: Home reaches the gesture minimum`);
    await press("End");
    assert.equal(Number(await page.evaluate(`${id(name)}.value`)), maximum, `${name}: End reaches the gesture maximum`);
  }
  await fill("appearance-borderRadius-value", "12.75"); await fill("motion-duration", "175.5");
  await fill("appearance-opacity-value", "-");
  assert.equal(await page.evaluate(`${id("appearance-opacity-value")}.value`), "-");
  assert.equal(await page.evaluate(`${id("appearance-opacity-value")}.getAttribute('aria-invalid')`), "true");
  await click("review-changes"); await until("document.querySelector('.input-notice')");
  assert.equal(await page.evaluate(`Boolean(${id("review-dialog")})`), false, "An incomplete precision draft blocks review without losing input");
  assert.equal(await revision(), sliderRevision);
  await fill("appearance-opacity-value", "0.375");
  assert.deepEqual(await page.evaluate(`[${id("appearance-opacity-value")}.value,${id("appearance-borderRadius-value")}.value,${id("motion-duration")}.value]`), ["0.375", "12.75", "175.5"], "Precision fields retain values finer than the slider step");
  await approve(); assert.notEqual(await revision(), sliderRevision);
  await click("undo");
  await until(`${saved} && ${id("appearance-opacity-binding")}.value===${JSON.stringify(original.opacityBinding)} && ${id("appearance-borderRadius-binding")}.value===${JSON.stringify(original.radiusBinding)} && ${id("motion-duration")}.value===${JSON.stringify(original.duration)}`);
  if (original.opacity !== null) assert.equal(await page.evaluate(`${id("appearance-opacity-value")}.value`), original.opacity);
  if (original.radius !== null) assert.equal(await page.evaluate(`${id("appearance-borderRadius-value")}.value`), original.radius);

  // The catalog timeline uses the form registry: valid precision joins Review without Apply track.
  const catalogId = await page.evaluate("document.querySelector('.catalog-component-preview[data-testid]')?.dataset.testid.slice('preview-'.length)");
  assert.ok(catalogId, "The editor-completion fixture supplies a catalog component");
  await click(`component-${catalogId}`);
  const timeline = text("Motion timeline", "summary");
  if (await page.evaluate(`!(${timeline}).parentElement.open`)) await clickElement(timeline);
  const trackId = await page.evaluate(`Array.from(${id("motion-track-select")}.options).find(e=>e.value)?.value`);
  assert.ok(trackId, "The editor-completion fixture supplies an authored motion track");
  await selectElement(id("motion-track-select"), trackId);
  const trackDuration = "document.querySelector('[data-draft-form=motion-track] input.studio-slider-value[aria-label=" + JSON.stringify("Duration · ms") + "]')";
  const trackRange = `(${trackDuration}).closest('.studio-slider').querySelector('input[type=range]')`;
  const originalTrackDuration = await page.evaluate(`(${trackDuration}).value`);
  await focus(trackRange); await focus(trackDuration); await page.evaluate("document.activeElement.blur()"); await settled();
  assert.equal(await page.evaluate(`${id("open-export")}.disabled`), false, "Inspecting a saved motion track stays clean");
  await focus(trackRange); await press("Home"); assert.equal(await page.evaluate(`(${trackDuration}).value`), "0");
  await press("End"); assert.equal(await page.evaluate(`(${trackDuration}).value`), "10000");
  await fillElement(trackDuration, "287.125");
  const trackRevision = await revision(); await approve(); assert.notEqual(await revision(), trackRevision);
  assert.equal(await page.evaluate(`(${trackDuration}).value`), "287.125", "Review flushes valid motion precision directly from the registered form");
  await click("undo"); await until(`${saved} && (${trackDuration}).value===${JSON.stringify(originalTrackDuration)}`);
  record("studioSliderAuthoring", { cleanMountAndFocus: true, opacityRadiusAndDurationHomeEnd: true, precisionBeyondStep: true, invalidDraftRetainedAndBlocksReview: true, reviewedUndoRestoresBindingsAndValues: true, motionTrackPrecisionFlushesOnReview: true, motionTrackUndo: true });
}
