import assert from "node:assert/strict";

const CATALOG_CASES = [
  { name: "Checkbox", catalogId: "catalog.checkbox", shape: "checkbox", selector: "label.catalog-check input[type=checkbox]", roles: ["root", "control", "label"] },
  { name: "TextInput", catalogId: "catalog.textinput", shape: "text-input", selector: "input[type=text]", roles: ["root", "label", "input"] },
  { name: "Card", catalogId: "catalog.card", shape: "card", selector: "article > h3", roles: ["root", "header", "body", "actions"] },
  { name: "Calendar", catalogId: "catalog.calendar", shape: "calendar", structure: "calendar", roles: ["root", "body", "calendar_header", "previous", "heading", "next", "weekdays", ...Array.from({ length: 5 }, (_, i) => `week_${i + 1}`), ...Array.from({ length: 35 }, (_, i) => `day_${i + 1}`)] },
  { name: "Tree", catalogId: "catalog.tree", shape: "tree", structure: "tree", roles: ["root", "body", "branch", "item_one", "item_two", "item_three"] },
  { name: "DonutChart", catalogId: "catalog.donutchart", shape: "donutchart", structure: "donutchart", roles: ["root", "body", "plot", "axis", "series", "legend"] },
];

/** Actual library additions retain canonical source identity and their authored visual structure. */
export async function verifyCatalogBlueprints({ page, id, label, click, fill, selectElement, until, settled, approve, revision, record }) {
  const saved = `${id("studio-app")} && ${id("open-export")} && !${id("open-export")}.disabled`;
  await until(saved);
  const database = await page.evaluate("new URL(location.href).searchParams.get('database')");
  assert.match(database, /^axiom-studio-test-/, "Catalog creation runs only in the dedicated test database");
  const project = () => page.evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open(${JSON.stringify(database)});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('commits','readonly'),get=tx.objectStore('commits').openCursor(null,'prev');get.onsuccess=()=>{try{resolve(JSON.parse(get.result.value.stateText).project)}catch(error){reject(error)}};get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();reject(tx.error)};};})`);
  const frameIds = () => page.evaluate("Array.from(document.querySelectorAll('[data-component-frame]')).map(e=>e.dataset.componentFrame)");
  const openPanels = async () => { for (const panel of ["sidebar", "inspector"]) if (await page.evaluate(`${id(`toggle-${panel}`)}.getAttribute('aria-expanded')==='false'`)) await click(`toggle-${panel}`); };
  if (await page.evaluate("document.documentElement.lang!=='en'")) await click("locale-toggle");
  await openPanels(); await click("view-canvas"); await click("mode-edit"); await click("category-web");
  const initialIds = await frameIds(), created = [], provenance = [];
  const verifyButtonWrapper = async () => {
    const wrapper = `${id("preview-component.button")}.querySelector('.component-root')`;
    await until(wrapper);
    assert.equal(await page.evaluate(`getComputedStyle(${wrapper}).backgroundColor`), "rgba(0, 0, 0, 0)", "Button: the transparent preview wrapper preserves the authored button silhouette");
  };
  await verifyButtonWrapper();

  const choose = async entry => {
    await click("view-library");
    await selectElement(label("Entry kind", "select"), "component"); await selectElement(label("Family", "select"), "");
    await fill("catalog-search", entry.name); await click(`catalog-${entry.catalogId}`);
    assert.equal(await page.evaluate(`${id(`catalog-${entry.catalogId}`)}.getAttribute('aria-pressed')`), "true");
    assert.equal(await page.evaluate("document.querySelector('#studio-inspector .inspector-header h2').textContent"), entry.name);
    const specimen = await page.evaluate(`${id(`catalog-${entry.catalogId}`)}.querySelector('.catalog-thumbnail').dataset.specimenShape`);
    assert.equal(specimen, entry.shape, `${entry.name}: the chosen library specimen uses its canonical shape`);
    const references = await page.evaluate("Array.from(document.querySelectorAll('#studio-inspector [data-testid=catalog-provider-reference]')).map(e=>({href:e.getAttribute('href'),label:e.textContent.trim()}))");
    assert.ok(references.length > 0 && references.every(reference => /^https:\/\//.test(reference.href) && reference.label.length > 0), `${entry.name}: provenance has labeled provider reference links`);
    provenance.push({ catalogId: entry.catalogId, references: references.length });
  };

  const add = async entry => {
    const beforeIds = await frameIds();
    await choose(entry); await click("catalog-add");
    await until(`document.querySelectorAll('[data-component-frame]').length===${beforeIds.length + 1} && ${id("component-name")}?.value===${JSON.stringify(entry.name)}`);
    const added = (await frameIds()).filter(componentId => !beforeIds.includes(componentId));
    assert.equal(added.length, 1, `${entry.name}: one component is added`);
    const componentId = added[0];
    assert.equal(await page.evaluate(`${id(`component-${componentId}`)}.getAttribute('aria-pressed')`), "true", `${entry.name}: the created component is selected`);
    assert.equal(await page.evaluate(`${id(`component-${componentId}`)}.querySelector('.nav-name').textContent`), entry.name);
    return componentId;
  };

  const verifyRendered = async (entry, component) => {
    const preview = id(`preview-${component.id}`);
    await until(preview);
    const rendered = await page.evaluate(`(()=>{const e=${preview},frame=e.closest('[data-component-frame]');return{catalogId:e.dataset.catalogId,shape:e.dataset.previewShape,name:e.getAttribute('aria-label'),parts:Array.from(e.querySelectorAll('[data-part-id]')).map(part=>part.dataset.partId),structure:e.querySelector('.catalog-structure')?.dataset.structureKind??null,semantic:${entry.selector ? `Boolean(e.querySelector(${JSON.stringify(entry.selector)}))` : "true"},genericCard:Boolean(e.querySelector('article')),frame:{height:frame.offsetHeight,plannedHeight:parseFloat(frame.style.minHeight)}}})()`);
    assert.equal(rendered.catalogId, entry.catalogId);
    assert.equal(rendered.shape, entry.shape);
    assert.equal(rendered.name, component.name);
    assert.ok(Number.isFinite(rendered.frame.plannedHeight) && rendered.frame.height <= rendered.frame.plannedHeight + 1, `${entry.name}: default frame contains its rendered content (${rendered.frame.height}px actual, ${rendered.frame.plannedHeight}px planned)`);
    assert.equal(rendered.semantic, true, `${entry.name}: the actual authored component has its distinct renderer`);
    if (entry.structure) { assert.equal(rendered.structure, entry.structure); assert.equal(rendered.genericCard, false, `${entry.name}: structural rendering is not a generic card`); }
    if (entry.catalogId === "catalog.calendar") {
      const weekdays = await page.evaluate(`Array.from(${preview}.querySelector('[data-structure-part=weekdays]').children).map(day=>({text:day.textContent.trim(),top:day.getBoundingClientRect().top,width:day.getBoundingClientRect().width}))`);
      assert.deepEqual(weekdays.map(day => day.text), ["M", "T", "W", "T", "F", "S", "S"]);
      assert.ok(weekdays.every(day => day.width > 0 && Math.abs(day.top - weekdays[0].top) < 1), "Calendar: all seven weekday columns remain on one row");
    }
    if (entry.catalogId === "catalog.tree") {
      const backdrop = await page.evaluate(`({frame:getComputedStyle(${preview}.closest('[data-component-frame]')).backgroundColor,wrapper:getComputedStyle(${preview}.querySelector('.component-root')).backgroundColor})`);
      assert.ok(!["transparent", "rgba(0, 0, 0, 0)"].includes(backdrop.frame), "Tree: the full canvas frame has a project-theme backdrop for transparent authored structure");
      assert.equal(backdrop.wrapper, "rgba(0, 0, 0, 0)", "Tree: the preview wrapper stays transparent over the frame backdrop");
    }
    for (const role of entry.roles) {
      const part = component.parts.find(part => part.studioRole === role);
      assert.ok(part, `${entry.name}: source includes the ${role} part`);
      assert.ok(rendered.parts.includes(part.id), `${entry.name}: authored ${role} has a rendered data-part-id`);
    }
    assert.ok(rendered.parts.every(partId => component.parts.some(part => part.id === partId)), `${entry.name}: rendered parts refer to the created source`);
    if (entry.structure) assert.deepEqual([...new Set(rendered.parts)].sort(), component.parts.map(part => part.id).sort(), `${entry.name}: every authored structural part renders`);
    return rendered;
  };

  const verifyArrangement = async () => {
    const frames = await page.evaluate(`Array.from(document.querySelectorAll('[data-component-frame]')).filter(frame=>${JSON.stringify(created.map(entry => entry.componentId))}.includes(frame.dataset.componentFrame)).map(frame=>({id:frame.dataset.componentFrame,x:parseFloat(frame.style.left),y:parseFloat(frame.style.top),width:frame.offsetWidth,height:frame.offsetHeight}))`);
    assert.equal(frames.length, CATALOG_CASES.length);
    for (let index = 0; index < frames.length; index++) for (const other of frames.slice(index + 1)) {
      const frame = frames[index], horizontalOverlap = Math.min(frame.x + frame.width, other.x + other.width) - Math.max(frame.x, other.x);
      if (horizontalOverlap > 0) assert.ok(frame.y + frame.height <= other.y || other.y + other.height <= frame.y, `Default catalog frames ${frame.id} and ${other.id} do not overlap vertically`);
    }
  };

  // Rejecting creation restores both the visible component inventory and durable source.
  const rejectedRevision = await revision(), rejectedId = await add(CATALOG_CASES[0]);
  assert.equal(await revision(), rejectedRevision);
  assert.equal((await project()).documents[rejectedId], undefined, "An unreviewed addition has no durable component document");
  await click("review-changes"); await until(`${id("review-dialog")}?.open`); await click("review-reject");
  await until(`${saved} && !${id(`component-${rejectedId}`)} && !${id("review-dialog")}`);
  assert.deepEqual(await frameIds(), initialIds); assert.equal(await revision(), rejectedRevision);
  assert.equal((await project()).documents[rejectedId], undefined);

  for (const entry of CATALOG_CASES) {
    const before = await revision(), componentId = await add(entry);
    assert.equal(await revision(), before, `${entry.name}: creating a preview does not commit source`);
    assert.equal((await project()).documents[componentId], undefined);
    await approve(); assert.notEqual(await revision(), before);
    const current = await project(), component = current.documents[componentId]?.document;
    assert.ok(component); assert.equal(component.kind, "component"); assert.equal(component.name, entry.name); assert.equal(component.catalogProfile.catalogId, entry.catalogId);
    const designs = Object.values(current.documents).map(item => item.document).filter(document => document.kind === "design" && document.componentRef?.id === componentId);
    assert.deepEqual(designs.map(design => design.category).sort(), ["Mobile", "Web"]);
    assert.ok(designs.every(design => design.catalogProfile.catalogId === entry.catalogId), `${entry.name}: both category designs retain canonical catalog identity`);
    const sidebarParts = await page.evaluate(`${id(`component-${componentId}`)}.parentElement.querySelectorAll('[data-testid^=part-]').length`);
    assert.equal(sidebarParts, component.parts.length, `${entry.name}: the selected layer inventory matches authored source parts`);
    await verifyRendered(entry, component);
    created.push({ ...entry, componentId, parts: component.parts.length, source: component });
  }

  await verifyArrangement();
  const persistedRevision = await revision(), previousTimeOrigin = await page.evaluate("performance.timeOrigin");
  await page.send("Page.reload"); await until(`performance.timeOrigin!==${previousTimeOrigin} && (${saved})`); await settled(); await openPanels(); await click("view-canvas");
  assert.equal(await revision(), persistedRevision); assert.equal((await frameIds()).length, initialIds.length + CATALOG_CASES.length);
  const reloaded = await project();
  for (const entry of created) {
    await click(`component-${entry.componentId}`);
    assert.equal(await page.evaluate(`${id("component-name")}.value`), entry.name);
    assert.deepEqual(reloaded.documents[entry.componentId].document, entry.source, `${entry.name}: reload preserves the complete component source`);
    await verifyRendered(entry, entry.source);
  }
  await verifyArrangement();
  await verifyButtonWrapper();
  record("catalogBlueprints", { created: created.map(({ catalogId, componentId, name, shape, parts }) => ({ catalogId, componentId, name, shape, parts })), providerReferences: provenance.slice(1), rejectedCreationPreservesSource: true, reviewedComponentAndBothDesigns: true, canonicalIdentityAndSelectedName: true, distinctAuthoredRenderers: true, structuralPartIds: true, defaultFramesContainContent: true, defaultFramesDoNotOverlap: true, calendarWeekdaysOneRow: true, treeProjectThemeFrameBackdrop: true, transparentTreeAndButtonWrappers: true, reloadPreservesSourceAndRendering: true });
}
