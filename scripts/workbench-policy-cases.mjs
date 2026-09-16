import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { foundationTab, openFoundationSettings, seedLegacyFoundation } from "./workbench-foundation-cases.mjs";

/** Real policy controls and export gates; the dedicated database is read only for saved-source assertions. */
export async function verifyPolicyWorkspace({ page, origin, database, root, id, text, click, clickElement, fill, selectElement, until, settled, approve, revision, record }) {
  assert.match(database, /^axiom-studio-test-/);
  const ruleName = "Semantic spacing standard";
  const saved = () => page.evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open(${JSON.stringify(database)});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('commits','readonly'),cursor=tx.objectStore('commits').openCursor(null,'prev');cursor.onsuccess=()=>{resolve(Object.values(JSON.parse(cursor.result.value.stateText).project.documents));};cursor.onerror=()=>reject(cursor.error);tx.oncomplete=()=>db.close();};})`);
  const policySource = async () => (await saved()).find(entry => entry.document.kind === "foundation").document.policies;
  const reload = async () => { const before = await page.evaluate("performance.timeOrigin"); await page.send("Page.reload"); await until(`performance.timeOrigin!==${before} && ${id("studio-app")} && !${id("open-export")}.disabled`); };
  const policies = async () => { await openFoundationSettings({ page, id, click, clickElement }, "Policies"); await until(`${id("foundation-policies")}.getClientRects().length`); };
  const closeExport = () => clickElement(`${id("export-dialog")}?.querySelector('footer button:first-child')`);
  const cancelEditor = () => clickElement("Array.from(document.querySelectorAll('.policy-editor button')).find(e=>e.textContent.trim()==='Cancel')");
  const editRule = () => clickElement(`document.querySelector('.policy-rule button[aria-label=${JSON.stringify(`Edit ${ruleName}`)}]')`);
  const capture = async name => {
    await mkdir(join(root, "dist/evidence"), { recursive: true });
    await page.evaluate("document.fonts.ready"); await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 }); await settled();
    const shot = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    await writeFile(join(root, "dist/evidence", `policy-${name}.png`), Buffer.from(shot.data, "base64"));
  };
  await page.send("Page.navigate", { url: `${origin}/?database=${database}` }); await until(id("onboarding"));
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  await fill("project-name", "Foundation policies"); await click("start-project"); await until(`${id("studio-app")} && !${id("undo")}.disabled`);
  await seedLegacyFoundation({ page, database, id, until });
  if (await page.evaluate("document.documentElement.dataset.theme!=='dark'")) await click("studio-theme-toggle");
  await click("view-library"); await click("create-custom-component"); await until(id("component-composer"));
  await click("composer-stack"); await fill("composer-name", "Policy specimen"); await click("composer-create"); await approve();
  const entries = await saved(), component = entries.map(entry => entry.document).find(document => document.kind === "component" && document.name === "Policy specimen");
  assert.ok(component); const originalSource = entries.find(entry => entry.document.kind === "foundation").originalText;
  const baseline = await revision();
  await policies(); await clickElement(text("Add rule")); await fill("policy-name", "Incomplete rule");
  assert.equal(await page.evaluate(`${id("policy-apply")}.disabled`), true);
  await clickElement(foundationTab("Domains"));
  assert.equal(await page.evaluate(`${id("policy-name")}.value`), "Incomplete rule", "Browsing another Foundation page preserves the policy draft");
  await policies();
  assert.ok(await page.evaluate(`${id("foundation-policies")}.getClientRects().length && ${id("policy-name")}.value==='Incomplete rule'`), "Returning to policies reveals the same invalid draft");
  await cancelEditor(); assert.equal(await revision(), baseline); assert.equal((await policySource()).length, 0);
  await clickElement(text("Add rule")); await fill("policy-name", ruleName); await fill("policy-rationale", "Use shared spacing so product density stays consistent.");
  await selectElement(id("policy-component"), component.id); await selectElement(id("policy-category"), "Web");
  assert.equal(await page.evaluate(`${id("policy-severity")}.value`), "warning");
  await capture("editor-desktop-dark");
  await click("policy-apply");
  assert.equal(await revision(), baseline, "Policy proposals do not commit before review");
  assert.ok(await page.evaluate("Boolean(document.querySelector('.policy-findings li[data-part-id]'))"));
  await approve(); const advisoryRevision = await revision(); await reload(); assert.equal(await revision(), advisoryRevision);
  const [advisoryRule] = await policySource(); assert.equal(advisoryRule.name, ruleName); assert.equal(advisoryRule.severity, "warning");
  assert.equal((await saved()).find(entry => entry.document.kind === "foundation").originalText, originalSource);
  await click("open-export"); await until(`${id("export-generated")} && !${id("export-download")}.disabled`);
  assert.ok(await page.evaluate(`${id("export-dialog")}.textContent.includes(${JSON.stringify(ruleName)})`), "Advisory findings remain visible in the actual generated export");
  await closeExport(); await policies();
  const location = await page.evaluate("(()=>{const row=document.querySelector('.policy-findings li[data-part-id]');return{componentId:row.dataset.componentId,partId:row.dataset.partId,category:row.dataset.category,path:row.dataset.path}})()");
  assert.equal(location.componentId, component.id); assert.equal(location.category, "Web"); assert.match(location.path, /^\/layout\/\d+\/(gap|padding)$/);
  await clickElement("document.querySelector('.policy-findings li[data-part-id] button')");
  await until(`document.querySelector('[data-component-frame=${JSON.stringify(component.id)}].is-selected') && ${id(`preview-part-${location.partId}`)}?.classList.contains('selected-part')`);
  assert.equal(await page.evaluate(`${id("part-name")}.value`), component.parts.find(part => part.id === location.partId).name);
  record("policyDraftAndAdvisory", { invalidDraftRetained: true, cancelLeavesSourceUnchanged: true, reviewedSaveReload: true, originalSourcePreserved: true, advisoryExportAllowed: true, exactComponentElementAndCategoryLocate: true });

  await policies(); await editRule(); await selectElement(id("policy-severity"), "error"); await click("policy-apply");
  assert.ok(await page.evaluate("document.querySelector('.policy-status').dataset.state==='blocked'"));
  await approve(); const requiredRevision = await revision(); await reload();
  const [requiredRule] = await policySource(); assert.equal(requiredRule.ruleId, advisoryRule.ruleId); assert.equal(requiredRule.severity, "error");
  await click("open-export");
  for (const target of ["react", "react-native", "swiftui", "compose"]) {
    await click(`target-${target}`); await until(`${id("export-download")}.disabled && !${id("export-generated")}`);
    assert.ok(await page.evaluate(`${id("export-dialog")}.textContent.includes(${JSON.stringify(ruleName)})`));
  }
  await closeExport(); await policies();
  for (const theme of ["dark", "light"]) {
    if (await page.evaluate(`document.documentElement.dataset.theme!==${JSON.stringify(theme)}`)) await click("studio-theme-toggle");
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false }); await settled();
    await page.evaluate("document.querySelector('.foundation-panel').scrollTop=0"); await capture(`required-desktop-${theme}`);
    await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }); await settled(); await capture(`required-narrow-${theme}`);
    assert.ok(await page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), "Policy findings do not create page-level horizontal overflow");
  }
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false }); await settled();
  await editRule(); await fill("policy-name", "Discarded name"); await cancelEditor(); assert.equal(await revision(), requiredRevision);
  assert.equal((await policySource())[0].name, ruleName);
  await clickElement(`document.querySelector('.policy-rule button[aria-label=${JSON.stringify(`Delete ${ruleName}`)}]')`);
  assert.equal(await revision(), requiredRevision); await approve(); assert.equal((await policySource()).length, 0); await reload();
  const deletedRevision = await revision(); await click("undo"); await until(`${id("project-revision")}.title!==${JSON.stringify(deletedRevision)} && !${id("open-export")}.disabled`); await reload();
  assert.equal((await policySource())[0].ruleId, advisoryRule.ruleId); assert.equal((await policySource())[0].severity, "error");
  await click("open-export"); await until(`${id("export-download")}.disabled && !${id("export-generated")}`); await closeExport();
  const restoredRevision = await revision(); await click("redo"); await until(`${id("project-revision")}.title!==${JSON.stringify(restoredRevision)} && !${id("open-export")}.disabled`); await reload(); assert.equal((await policySource()).length, 0);
  await click("open-export"); await until(`${id("export-generated")} && !${id("export-download")}.disabled`); await closeExport();
  assert.equal((await saved()).find(entry => entry.document.kind === "foundation").originalText, originalSource);
  record("policyRequiredDeliveryAndRecovery", { stableRuleIdentity: true, allFourExportTargetsBlocked: true, sourceStillEditable: true, editCancelPreservesRequiredRule: true, reviewedDeletion: true, savedUndoRedoAndReload: true, originalSourcePreserved: true, exportRecoveredAfterRedo: true });
}
