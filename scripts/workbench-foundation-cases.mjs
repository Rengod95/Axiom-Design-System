import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export const foundationTab = name => `Array.from(document.querySelectorAll('[role=tablist][aria-label="Foundation views"] button')).find(e=>e.textContent.trim()===${JSON.stringify(name)})`;
export const tokenLayer = name => `Array.from(document.querySelectorAll('[role=tablist][aria-label="Token layer"] button')).find(e=>e.textContent.trim()===${JSON.stringify(name)})`;
export const tokenDomain = name => `Array.from(document.querySelectorAll('[role=tablist][aria-label="Token domain"] button')).find(e=>e.textContent.trim()===${JSON.stringify(name)})`;
export async function openFoundationSettings({ page, id, click, clickElement }, name) {
  await click("view-foundation");
  if (await page.evaluate(`${id("foundation-settings")}.getAttribute('aria-pressed')!=='true'`)) await click("foundation-settings");
  await clickElement(`Array.from(document.querySelectorAll('[role=tablist][aria-label="Foundation settings task"] button')).find(e=>e.textContent.trim()===${JSON.stringify(name)})`);
}

/** Seed a historical fixture only into an isolated test journal; product migration still runs through its real UI. */
export async function seedLegacyFoundation({ page, database, id, until }) {
  assert.match(database, /^axiom-studio-test-/);
  const latest = await page.evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open(${JSON.stringify(database)});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('commits','readonly'),cursor=tx.objectStore('commits').openCursor(null,'prev');cursor.onsuccess=()=>resolve(cursor.result.value);cursor.onerror=()=>reject(cursor.error);tx.oncomplete=()=>db.close();};})`);
  const { canonicalJson, createStudioStarter, inspectStudioProject } = await import("../modules/ads-core/src/index.ts");
  const { createBrowserCommit } = await import("../modules/browser-store/src/journal.ts");
  const state = JSON.parse(latest.stateText);
  for (const document of createStudioStarter(state.project.id)) {
    const entry = state.project.documents[document.id];
    entry.document = document; entry.originalText = canonicalJson(document); entry.currentText = canonicalJson(document);
  }
  assert.equal(inspectStudioProject(state.project).valid, true, "Historical fixture is executable before migration");
  const commit = createBrowserCommit(state, { storageFormatVersion: latest.storageFormatVersion, sequence: latest.sequence, commitDigest: latest.commitDigest });
  await page.evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open(${JSON.stringify(database)});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['commits','meta'],'readwrite'),commit=${JSON.stringify(commit)};tx.objectStore('commits').add(commit,commit.sequence);tx.objectStore('meta').put({storageFormatVersion:commit.storageFormatVersion,sequence:commit.sequence,commitDigest:commit.commitDigest},'head');tx.oncomplete=()=>{db.close();resolve(true)};tx.onabort=()=>{db.close();reject(tx.error)};};})`);
  const before = await page.evaluate("performance.timeOrigin"); await page.send("Page.reload");
  await until(`performance.timeOrigin!==${before} && ${id("studio-app")} && !${id("open-export")}.disabled`);
}

/** Theme drafts resolve their own groups, and clean group forms follow Undo and rejected proposals. */
export async function verifyThemeDraftWorkspace({ page, origin, database, downloads, id, label, text, click, clickElement, fill, fillElement, selectElement, until, approve, revision, record }) {
  assert.match(database, /^axiom-studio-test-/);
  await page.send("Page.navigate", { url: `${origin}/?database=${database}` }); await until(id("onboarding"));
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  await fill("project-name", "Theme draft isolation"); await click("start-project"); await until(`${id("studio-app")} && !${id("undo")}.disabled`);
  const saved = () => page.evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open(${JSON.stringify(database)});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('commits','readonly'),cursor=tx.objectStore('commits').openCursor(null,'prev');cursor.onsuccess=()=>resolve(Object.values(JSON.parse(cursor.result.value.stateText).project.documents).find(entry=>entry.document.kind==='foundation').document);cursor.onerror=()=>reject(cursor.error);tx.oncomplete=()=>db.close();};})`);
  const { foundationThemeGroups, importDtcgFoundation, resolveFoundationTokens } = await import("../modules/ads-core/src/index.ts");
  const foundation = await saved(), colorDomain = foundation.domains.find(domain => domain.bindingCategory === "color");
  const light = foundation.themeSets.find(theme => theme.name === "Light"), dark = foundation.themeSets.find(theme => theme.name === "Dark");
  assert.ok(colorDomain && light && dark);
  const lightGroup = foundationThemeGroups(foundation, light).find(group => group.domain === colorDomain.id);
  const darkGroup = foundationThemeGroups(foundation, dark).find(group => group.domain === colorDomain.id);
  assert.ok(lightGroup && darkGroup && lightGroup.id !== darkGroup.id);
  const colors = async (document, theme) => {
    const resolved = resolveFoundationTokens(document, { themeSetId: theme.id }); assert.equal(resolved.valid, true);
    const ids = [...new Set(foundationThemeGroups(document, theme).filter(group => group.domain === colorDomain.id).flatMap(group => Object.keys(group.values)))].slice(0, 4);
    const css = ids.map(tokenId => {
      const token = resolved.tokens.find(token => token.id === tokenId);
      assert.equal(token.type, "color"); assert.equal(token.value.colorSpace, "srgb");
      return `color(srgb ${token.value.components.join(" ")} / ${token.value.alpha ?? 1})`;
    });
    return page.evaluate(`(${JSON.stringify(css)}).map(value=>{const e=document.createElement('i');e.style.background=value;return e.style.background})`);
  };
  const lightColors = await colors(foundation, light), darkColors = await colors(foundation, dark);
  assert.equal(darkColors.length, 4); assert.notDeepEqual(lightColors, darkColors, "The fixture must distinguish the selected global theme from the edited theme");
  await click("view-foundation"); await clickElement(foundationTab("Tokens")); await selectElement(label("Preview theme", "select"), light.id);
  await clickElement(foundationTab("Themes"));
  const chooseTheme = name => clickElement(`Array.from(document.querySelectorAll('[data-draft-form=foundation-manager-set] > .manager-list button')).find(e=>e.textContent.trim()===${JSON.stringify(name)})`);
  await chooseTheme("Dark");
  const colorRow = "Array.from(document.querySelectorAll('.theme-group-row')).find(e=>e.querySelector('strong').textContent==='Color')";
  const visibleColors = () => page.evaluate(`Array.from((${colorRow}).querySelectorAll('.specimen-color')).map(e=>e.style.background)`);
  assert.deepEqual(await visibleColors(), darkColors, "Editing Dark resolves Dark aliases even while Tokens preview selects Light");
  await chooseTheme("Light"); assert.deepEqual(await visibleColors(), lightColors, "The inherited shared-base group has no explicit override swatches");
  const baseline = await revision();
  await selectElement(`(${colorRow}).querySelector('select')`, darkGroup.id);
  const draft = structuredClone(foundation), draftTheme = draft.themeSets.find(theme => theme.id === light.id);
  draftTheme.valueSetIds = [...(light.valueSetIds ?? []).filter(groupId => !foundation.valueSets.some(group => group.id === groupId && group.domain === colorDomain.id)), darkGroup.id];
  assert.deepEqual(await visibleColors(), await colors(draft, draftTheme), "An unapplied group connection resolves its actual draft theme");
  assert.equal(await revision(), baseline);
  await clickElement(text("Reset theme form")); assert.deepEqual(await visibleColors(), lightColors);
  await clickElement(foundationTab("Tokens"));
  assert.equal(await page.evaluate(`(${label("Preview theme", "select")}).value`), light.id);
  assert.equal(await page.evaluate(`Boolean(${id("review-strip")})`), false);
  record("themeDraftPreview", { globalPreviewLight: true, editedDarkResolvesOwnAliases: true, unappliedGroupPreview: true, resetRestoresLight: true, independentGlobalSelection: true, noSourceEdit: true });

  await clickElement(foundationTab("Themes")); await clickElement("document.querySelector('.foundation-value-group-manager > summary')");
  const chooseGroup = name => clickElement(`Array.from(document.querySelectorAll('.foundation-value-group-manager > .manager-list button')).find(e=>e.firstChild?.textContent===${JSON.stringify(name)})`);
  await chooseGroup(lightGroup.name);
  await fillElement(label("Value group name"), "Unapplied group name");
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('.foundation-value-group-manager > .manager-list button')).every(e=>e.disabled)"), true, "A dirty group cannot be replaced by another selection");
  await clickElement(text("Reset group form"));
  assert.equal(await page.evaluate(`(${label("Value group name")}).value`), lightGroup.name); assert.equal(await revision(), baseline);
  await fillElement(label("Value group name"), "Reviewed Light colors"); await clickElement(text("Apply group name")); await approve();
  assert.equal((await saved()).valueSets.find(group => group.id === lightGroup.id).name, "Reviewed Light colors");
  const renamedRevision = await revision(); await click("undo");
  await until(`${id("project-revision")}.title!==${JSON.stringify(renamedRevision)} && !${id("open-export")}.disabled && (${label("Value group name")}).value===${JSON.stringify(lightGroup.name)}`);
  const undoneRevision = await revision();
  await clickElement(foundationTab("Tokens")); assert.equal(await page.evaluate(`Boolean(${id("review-strip")})`), false); assert.equal(await revision(), undoneRevision);
  assert.equal((await saved()).valueSets.find(group => group.id === lightGroup.id).name, lightGroup.name, "Navigation must not replay the undone rename");
  await clickElement(foundationTab("Themes")); await clickElement(text("New group"));
  await fillElement(label("Value group name"), "Rejected color group"); await clickElement(text("Create group"));
  await click("review-changes"); await until(`${id("review-dialog")}?.open`); await click("review-reject");
  await until(`!${id("review-dialog")} && !${id("open-export")}.disabled && (${label("Value group name")}).value===''`);
  await clickElement(foundationTab("Tokens")); assert.equal(await page.evaluate(`Boolean(${id("review-strip")})`), false); assert.equal(await revision(), undoneRevision);
  assert.deepEqual((await saved()).valueSets.map(group => group.id), foundation.valueSets.map(group => group.id));
  record("valueGroupDraftRecovery", { dirtySelectionBlocked: true, resetRestoresSource: true, reviewedRename: true, undoSynchronizesCleanForm: true, navigationDoesNotReplayUndo: true, rejectedCreationClearsForm: true, rejectedGroupNotRecreated: true });

  await selectElement(label("Preview theme", "select"), dark.id);
  await openFoundationSettings({ page, id, click, clickElement }, "Files"); await clickElement(text("Export", "[role=tab]"));
  const expectedTokens = resolveFoundationTokens(await saved(), { themeSetId: dark.id }).tokens;
  for (const [mode, button] of [["references", "Keep references"], ["resolved", "Resolved values"]]) {
    await clickElement(text(button)); await click("dtcg-export");
    const filename = `axiom-${mode}.tokens.json`, deadline = Date.now() + 10_000;
    while (!(await readdir(downloads)).includes(filename)) { if (Date.now() > deadline) throw Error(`Selected-theme DTCG ${mode} download missing`); await delay(100); }
    const sourceText = await readFile(join(downloads, filename), "utf8"), output = JSON.parse(sourceText);
    assert.equal(typeof output.surface.canvas.$value, mode === "references" ? "string" : "object", "Reference mode keeps aliases while resolved mode emits values");
    let sequence = 0;
    const imported = importDtcgFoundation(sourceText, { id: `export.${mode}`, name: "Downloaded theme", revision: "export-test", sourceUri: `memory:${filename}`, createId: () => `export.token.${++sequence}`, digest: text => createHash("sha256").update(text).digest("hex") });
    assert.equal(imported.valid, true, JSON.stringify(imported.diagnostics));
    const resolved = resolveFoundationTokens(imported.document); assert.equal(resolved.valid, true, JSON.stringify(resolved.diagnostics));
    const actual = new Map(resolved.tokens.map(token => [token.name, token.value])); assert.equal(actual.size, expectedTokens.length);
    for (const token of expectedTokens) assert.deepEqual(actual.get(token.name), token.value, `${mode}: exported ${token.name} matches the selected Dark theme after real file round-trip`);
  }
  assert.equal(await revision(), undoneRevision);
  record("guidedThemeDtcgExport", { selectedTheme: "Dark", downloadedModes: ["references", "resolved"], liveAliasesPreserved: true, allValuesRoundTripAgainstSelectedTheme: expectedTokens.length, sourceUnchanged: true });
}

/** Read-only blueprint/material checks against the existing complete starter fixture. */
export async function verifyFoundationBlueprints({ page, id, label, text, click, clickElement, fill, selectElement, settled, revision, record }) {
  const before = await revision(), viewport = await page.evaluate("({width:innerWidth,height:innerHeight,deviceScaleFactor:devicePixelRatio})");
  await click("view-foundation"); await clickElement(text("Domains"));
  const domains = await page.evaluate("Array.from(document.querySelectorAll('.blueprint-domain-card')).map(card=>({blueprints:card.querySelectorAll('.domain-blueprint').length,materials:card.querySelectorAll('.token-visual').length}))");
  assert.ok(domains.length >= 11);
  assert.ok(domains.every(card => card.blueprints === 1 && card.materials === 0), "Each domain has one blueprint, without duplicated token previews");
  const domain = async name => { await clickElement(text("Domains")); await clickElement(`Array.from(document.querySelectorAll('.blueprint-domain-card')).find(card=>card.querySelector('.domain-directory-label strong').textContent===${JSON.stringify(name)})`); };
  await domain("Color"); await clickElement(tokenLayer("Primitive")); await click("token-view-visual");
  const themeInput = label("Preview theme", "select"), previousTheme = await page.evaluate(`(${themeInput}).value`);
  try {
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }); await settled();
    await fill("foundation-search", "color.brand.");
    const scale = await page.evaluate("Array.from(document.querySelectorAll('.atlas-color-specimens .material-token')).map(e=>({name:e.querySelector('.material-name').textContent,top:e.getBoundingClientRect().top,rect:{width:e.querySelector('.token-visual').getBoundingClientRect().width,height:e.querySelector('.token-visual').getBoundingClientRect().height}}))");
    assert.deepEqual(scale.map(item => item.name), ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"]);
    assert.ok(scale.every(item => Math.abs(item.top - scale[0].top) < 1 && Math.abs(item.rect.width - item.rect.height) < 1), "The complete brand scale remains square and fits one row at Full HD");
    await fill("foundation-search", "");
    const allSwatches = await page.evaluate("Array.from(document.querySelectorAll('.atlas-tier-primitive .atlas-color-specimens .token-visual')).map(e=>e.getBoundingClientRect().width)");
    assert.ok(allSwatches.length > scale.length && allSwatches.every(width => width >= 52 && width <= 129), "Sparse color groups use the same bounded swatch scale instead of stretching to the page width");
    const themes = await page.evaluate(`Array.from((${themeInput}).options).map(option=>({value:option.value,name:option.textContent}))`);
    const light = themes.find(theme => /^light$/i.test(theme.name)), dark = themes.find(theme => /^dark$/i.test(theme.name));
    assert.ok(light && dark, "The starter fixture has named Light and Dark sets");
    const verifyEdge = async sourceName => {
      const edge = await page.evaluate(`(()=>{const row=name=>Array.from(document.querySelectorAll('.sidebar-token')).find(button=>button.getAttribute('aria-label')===name)?.dataset.testid.slice('token-'.length);const source=row(${JSON.stringify(sourceName)}),target=row('action.primary.background');return{source,target,edges:Array.from(document.querySelectorAll('.dependency-map-edges g[data-source-token]')).filter(g=>g.dataset.targetToken===target).map(g=>g.dataset.sourceToken)}})()`);
      assert.ok(edge.source && edge.target);
      assert.deepEqual([...new Set(edge.edges)], [edge.source], "Semantic role edges must use the selected theme's actual referenced token ID");
    };
    await clickElement(tokenLayer("Semantic")); await click("token-view-graph");
    await selectElement(themeInput, light.value); await verifyEdge("color.brand.600");
    await selectElement(themeInput, dark.value); await verifyEdge("color.brand.400");
    assert.ok(await page.evaluate("Array.from(document.querySelectorAll('.dependency-source-tier')).some(e=>e.textContent==='Primitive') && Boolean(document.querySelector('.dependency-target'))"), "Relations show the actual primitive source and semantic target across separate layer pages");
    await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await settled();
    assert.ok(await page.evaluate("Array.from(document.querySelectorAll('.dependency-edge-flow')).every(path=>getComputedStyle(path).animationName==='none')"));
    for (const name of ["Spacing", "Sizing"]) {
      await domain(name); await clickElement(tokenLayer("Primitive")); await click("token-view-visual");
      const ruler = await page.evaluate("(()=>{const grid=document.querySelector('.atlas-tier-primitive .atlas-ruler-specimens');const rows=Array.from(grid.querySelectorAll('.shared-measure-track'));return{rows:rows.length,origins:rows.map(row=>row.getBoundingClientRect().left),axis:getComputedStyle(grid,'::before').width,cards:grid.querySelectorAll('.token-visual').length}})()");
      assert.ok(ruler.rows > 5 && ruler.origins.every(value => Math.abs(value - ruler.origins[0]) < 1));
      assert.equal(ruler.axis, "1px"); assert.equal(ruler.cards, 0);
    }
    await domain("Typography"); await fill("foundation-search", "type.scale.display");
    const type = await page.evaluate("(()=>{const e=document.querySelector('.editorial-type'),s=getComputedStyle(e);return{sourceSize:e.style.fontSize,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,rootSize:parseFloat(getComputedStyle(document.documentElement).fontSize),bodySize:getComputedStyle(document.body).fontSize}})()");
    assert.equal(type.rootSize, 16, "The clean browser default remains the design rem basis");
    assert.equal(type.bodySize, "13px", "Studio chrome density is independent from authored rem values");
    assert.match(type.sourceSize, /2\.5rem/, "The editorial specimen preserves the authored relative font size");
    assert.deepEqual({ size: type.size, weight: type.weight, lineHeight: type.lineHeight }, { size: `${2.5 * type.rootSize}px`, weight: "600", lineHeight: `${2.5 * type.rootSize * 1.25}px` });
    const previousRootSize = await page.evaluate("document.documentElement.style.fontSize");
    try {
      await page.evaluate("document.documentElement.style.fontSize='20px'"); await settled();
      assert.deepEqual(await page.evaluate("(()=>{const s=getComputedStyle(document.querySelector('.editorial-type'));return{size:s.fontSize,lineHeight:s.lineHeight}})()"), { size: "50px", lineHeight: "62.5px" }, "Changing the actual CSS root scales rem typography without rewriting tokens");
    } finally { await page.evaluate(`document.documentElement.style.fontSize=${JSON.stringify(previousRootSize)}`); await settled(); }
    await domain("Border");
    assert.ok(await page.evaluate("document.querySelector('.atlas-border-specimens .visual-border-line') && !document.querySelector('.atlas-border-specimens .visual-border-box')"));
    await domain("Shadow");
    assert.ok(await page.evaluate("Array.from(document.querySelectorAll('.atlas-shadow-specimens .token-visual')).every(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)' && getComputedStyle(e.querySelector('.visual-shadow')).boxShadow!=='none')"));
    assert.equal(await revision(), before);
    record("foundationBlueprints", { singleDomainBlueprints: domains.length, brandSwatchesOneRow: scale.length, selectedThemeEdges: true, sharedRulers: ["Spacing", "Sizing"], actualTypography: type, relativeTypographyTracksDocumentRoot: true, borderRows: true, openShadowPlane: true, reducedMotion: true, sourceUnchanged: true });
  } finally {
    await page.send("Emulation.setEmulatedMedia", { features: [] });
    await page.send("Emulation.setDeviceMetricsOverride", { ...viewport, mobile: false });
    await selectElement(themeInput, previousTheme); await fill("foundation-search", ""); await settled();
  }
}
