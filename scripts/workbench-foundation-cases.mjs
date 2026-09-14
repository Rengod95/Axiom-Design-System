import assert from "node:assert/strict";

/** Read-only blueprint/material checks against the existing complete starter fixture. */
export async function verifyFoundationBlueprints({ page, id, label, text, click, clickElement, fill, selectElement, settled, revision, record }) {
  const before = await revision(), viewport = await page.evaluate("({width:innerWidth,height:innerHeight,deviceScaleFactor:devicePixelRatio})");
  await click("view-foundation"); await clickElement(text("Domains"));
  const domains = await page.evaluate("Array.from(document.querySelectorAll('.blueprint-domain-card')).map(card=>({blueprints:card.querySelectorAll('.domain-blueprint').length,materials:card.querySelectorAll('.token-visual').length}))");
  assert.ok(domains.length >= 11);
  assert.ok(domains.every(card => card.blueprints === 1 && card.materials === 0), "Each domain has one blueprint, without duplicated token previews");
  const domain = async name => { await clickElement(text("Domains")); await clickElement(`Array.from(document.querySelectorAll('.blueprint-domain-card')).find(card=>card.querySelector('.domain-directory-label strong').textContent===${JSON.stringify(name)})`); };
  await domain("Color"); await click("token-view-visual");
  const themeInput = label("Foundation theme", "select"), previousTheme = await page.evaluate(`(${themeInput}).value`);
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
      const edge = await page.evaluate(`(()=>{const row=name=>Array.from(document.querySelectorAll('.material-select')).find(button=>button.getAttribute('aria-label')===name)?.closest('[data-testid]')?.dataset.testid.slice('foundation-row-'.length);const source=row(${JSON.stringify(sourceName)}),target=row('action.primary.background');return{source,target,edges:Array.from(document.querySelectorAll('.dependency-map-edges g[data-source-token]')).filter(g=>g.dataset.targetToken===target).map(g=>g.dataset.sourceToken)}})()`);
      assert.ok(edge.source && edge.target);
      assert.deepEqual([...new Set(edge.edges)], [edge.source], "Semantic role edges must use the selected theme's actual referenced token ID");
    };
    await selectElement(themeInput, light.value); await verifyEdge("color.brand.600");
    await selectElement(themeInput, dark.value); await verifyEdge("color.brand.400");
    assert.ok(await page.evaluate("Boolean(document.querySelector('.atlas-tier-primitive') && document.querySelector('.atlas-tier-semantic'))"));
    await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await settled();
    assert.ok(await page.evaluate("Array.from(document.querySelectorAll('.dependency-edge-flow')).every(path=>getComputedStyle(path).animationName==='none')"));
    for (const name of ["Spacing", "Sizing"]) {
      await domain(name);
      const ruler = await page.evaluate("(()=>{const grid=document.querySelector('.atlas-tier-primitive .atlas-ruler-specimens');const rows=Array.from(grid.querySelectorAll('.shared-measure-track'));return{rows:rows.length,origins:rows.map(row=>row.getBoundingClientRect().left),axis:getComputedStyle(grid,'::before').width,cards:grid.querySelectorAll('.token-visual').length}})()");
      assert.ok(ruler.rows > 5 && ruler.origins.every(value => Math.abs(value - ruler.origins[0]) < 1));
      assert.equal(ruler.axis, "1px"); assert.equal(ruler.cards, 0);
    }
    await domain("Typography"); await fill("foundation-search", "type.scale.display");
    const type = await page.evaluate("(()=>{const e=document.querySelector('.editorial-type'),s=getComputedStyle(e);return{size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight}})()");
    assert.deepEqual(type, { size: "40px", weight: "600", lineHeight: "50px" });
    await domain("Border");
    assert.ok(await page.evaluate("document.querySelector('.atlas-border-specimens .visual-border-line') && !document.querySelector('.atlas-border-specimens .visual-border-box')"));
    await domain("Shadow");
    assert.ok(await page.evaluate("Array.from(document.querySelectorAll('.atlas-shadow-specimens .token-visual')).every(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)' && getComputedStyle(e.querySelector('.visual-shadow')).boxShadow!=='none')"));
    assert.equal(await revision(), before);
    record("foundationBlueprints", { singleDomainBlueprints: domains.length, brandSwatchesOneRow: scale.length, selectedThemeEdges: true, sharedRulers: ["Spacing", "Sizing"], actualTypography: type, borderRows: true, openShadowPlane: true, reducedMotion: true, sourceUnchanged: true });
  } finally {
    await page.send("Emulation.setEmulatedMedia", { features: [] });
    await page.send("Emulation.setDeviceMetricsOverride", { ...viewport, mobile: false });
    await selectElement(themeInput, previousTheme); await fill("foundation-search", ""); await settled();
  }
}
