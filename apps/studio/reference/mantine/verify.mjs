import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { browserPath, launch, terminate, within } from '../../../../scripts/browser-driver.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const assets = path.join(repo, 'dist/studio/references');
const evidenceRoot = path.join(repo, 'dist/evidence/catalog-reference');
const previewRoot = path.join(repo, 'apps/studio/reference/mantine/previews');
const manifest = JSON.parse(await readFile(path.join(assets, 'mantine-manifest.json'), 'utf8'));
const only = process.env.AXIOM_REFERENCE_ROWS?.split(',').map(Number);
const entries = only ? manifest.templates.filter((entry) => only.includes(entry.sourceRow)) : manifest.templates;
const evidence = { status: 'FAILED', provider: 'Mantine', version: manifest.version, upstreamCommit: manifest.upstreamCommit, sandbox: 'allow-scripts; opaque origin', cases: [], limitations: ['Chromium runtime smoke of unmodified official native demo source; not a screenshot comparison with the hosted documentation.', 'Utilities and closed overlay/manager demos may have no standalone visible pixels.'] };
const previews = [];
await mkdir(evidenceRoot, { recursive: true });
await mkdir(previewRoot, { recursive: true });
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body,iframe{margin:0;border:0;width:100%;height:100%;display:block;overflow:hidden}</style></head><body><iframe id="frame" sandbox="allow-scripts" src="/frame.html"></iframe><script>
let id=0;const callbacks=new Map();window.frameReady=false;
window.addEventListener('message',event=>{if(event.source!==document.getElementById('frame').contentWindow)return;if(event.data.type==='ready'){window.frameReady=true;return;}if(event.data.type==='result'){callbacks.get(event.data.id)?.(event.data.result);callbacks.delete(event.data.id);}});
window.renderReference=(row,theme)=>new Promise(resolve=>{const current=++id;callbacks.set(current,resolve);document.getElementById('frame').contentWindow.postMessage({type:'render',id:current,row,theme},'*');});
</script></body></html>`;
const frameHtml = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';style-src 'self' 'unsafe-inline';img-src 'self' data: https:;connect-src 'self';font-src 'self' data:"><link rel="stylesheet" href="/mantine.css"><style>html,body{margin:0;box-sizing:border-box;min-width:0;}body{padding:24px;}</style></head><body><main id="reference"></main><script type="module">
import {mountReferenceTemplate} from '/mantine.js';
let dispose; window.failures=[];
window.addEventListener('error',event=>window.failures.push(event.error?.stack||event.message));
window.addEventListener('unhandledrejection',event=>window.failures.push(String(event.reason?.stack||event.reason)));
window.renderReference=async(row,theme)=>{
dispose?.(); window.failures=[];
window.scrollTo(0,0);document.body.style.minHeight='';
const host=document.getElementById('reference');
dispose=mountReferenceTemplate(host,row,{theme});
const start=Date.now(); while(host.dataset.referenceState==='loading'&&Date.now()-start<10000)await new Promise(r=>setTimeout(r,20));
await new Promise(r=>setTimeout(r,350));
let previewState='official-first-demo-default';
if(host.dataset.referenceName==='Affix'){document.body.style.minHeight='1800px';window.scrollTo(0,900);await new Promise(r=>setTimeout(r,400));previewState='official-first-demo-after-scroll';}
const nodes=Array.from(document.querySelectorAll('.axiom-reference-demo > *,[data-portal] > *')).filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.bottom>0&&r.top<innerHeight;});
const bounds=nodes.map(e=>e.getBoundingClientRect());const left=bounds.length?Math.max(0,Math.min(...bounds.map(r=>r.left))-16):0;const top=bounds.length?Math.max(0,Math.min(...bounds.map(r=>r.top))-16):0;
const right=bounds.length?Math.min(innerWidth,Math.max(...bounds.map(r=>r.right))+16):innerWidth;const bottom=bounds.length?Math.min(innerHeight,Math.max(...bounds.map(r=>r.bottom))+16):120;
const crop={x:Math.floor(left),y:Math.floor(top),width:Math.max(1,Math.ceil(right-left)),height:Math.max(1,Math.ceil(bottom-top))};
return {state:host.dataset.referenceState,error:host.dataset.referenceError,failures:window.failures.slice(),previewState,crop,visibleContent:bounds.length>0,bodyText:document.body.innerText.slice(0,200),elements:host.querySelectorAll('*').length,inputs:host.querySelectorAll('input').length,buttons:host.querySelectorAll('button').length,height:host.getBoundingClientRect().height,width:host.getBoundingClientRect().width,images:Array.from(host.querySelectorAll('img')).map(i=>({src:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth}))};
};
window.addEventListener('message',async event=>{if(event.source!==parent||event.data.type!=='render')return;try{const result=await window.renderReference(event.data.row,event.data.theme);parent.postMessage({type:'result',id:event.data.id,result},'*');}catch(error){parent.postMessage({type:'result',id:event.data.id,result:{state:'error',error:String(error),failures:[]}},'*');}});
parent.postMessage({type:'ready'},'*');
</script></body></html>`;
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html); return; }
    if (pathname === '/frame.html') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(frameHtml); return; }
    const target = path.resolve(assets, '.' + pathname.replace(/^\/references\//, '/'));
    if (!within(assets, target)) throw new Error('Outside asset root');
    const bytes = await readFile(target);
    response.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': target.endsWith('.js') ? 'application/javascript' : target.endsWith('.css') ? 'text/css' : target.endsWith('.png') ? 'image/png' : 'application/octet-stream' }); response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const profile = await mkdtemp(path.join(tmpdir(), 'axiom-mantine-reference-'));
  browser = await launch(await browserPath(), profile);
  evidence.browser = (await browser.cdp.send('Browser.getVersion')).product;
  const page = await browser.cdp.page(`http://127.0.0.1:${server.address().port}/`);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 640, height: 480, deviceScaleFactor: 1, mobile: false });
  for (let i=0;i<150 && !await page.evaluate('window.frameReady');i++) await delay(80);
  assert.equal(await page.evaluate('window.frameReady'), true, browser.cdp.errors.join('\n'));
  for (const entry of entries) {
    for (const theme of ['light','dark']) {
      const result = await page.evaluate(`window.renderReference(${entry.sourceRow},${JSON.stringify(theme)})`);
      const passed = result.state === 'ready' && !result.error && result.failures.length === 0 && result.images.every((image) => image.complete && image.naturalWidth > 0);
      evidence.cases.push({ sourceRow: entry.sourceRow, name: entry.name, theme, passed, ...result });
      if (!passed) console.log(JSON.stringify({ sourceRow: entry.sourceRow, name: entry.name, theme, ...result }));
      if (passed) {
        const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: {...result.crop, scale:1}, captureBeyondViewport:false });
        const bytes=Buffer.from(data,'base64');const filename=`${entry.sourceRow}-${theme}.png`;
        await writeFile(path.join(previewRoot,filename),bytes);
        previews.push({sourceRow:entry.sourceRow,name:entry.name,theme,path:`previews/${filename}`,sha256:createHash('sha256').update(bytes).digest('hex'),width:result.crop.width,height:result.crop.height,visibleContent:result.visibleContent,state:result.previewState,sourceUrl:entry.sourceUrl});
      }
    }
    if (evidence.cases.length%20===0) console.log(`Rendered ${evidence.cases.length}/${entries.length*2} Mantine cases`);
  }
  evidence.status = evidence.cases.every((entry) => entry.passed) ? 'PASSED' : 'FAILED';
  evidence.passed = evidence.cases.filter((entry) => entry.passed).length;
  evidence.failed = evidence.cases.filter((entry) => !entry.passed).length;
  console.log(JSON.stringify({ status:evidence.status, passed:evidence.passed, failed:evidence.failed }));
} finally {
  await writeFile(path.join(evidenceRoot, only ? 'mantine-browser-focused.json' : 'mantine-browser.json'), JSON.stringify(evidence,null,2)+'\n');
  if (!only && evidence.status==='PASSED') await writeFile(path.join(repo,'apps/studio/reference/mantine/previews-manifest.json'),JSON.stringify({provider:'Mantine',version:manifest.version,upstreamCommit:manifest.upstreamCommit,browser:evidence.browser,sandbox:evidence.sandbox,viewport:{width:640,height:480},format:'png',previews},null,2)+'\n');
  await terminate(browser);
  await new Promise((resolve) => server.close(resolve));
}
assert.equal(evidence.status, 'PASSED');
