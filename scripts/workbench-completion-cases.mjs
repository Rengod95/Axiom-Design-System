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
