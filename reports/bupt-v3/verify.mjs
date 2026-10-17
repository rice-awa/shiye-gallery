import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900}});
const errors=[], checks=[], scenes=[], layout=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const url=`file://${process.cwd()}/content/presentations/bupt-v3/index.html`;
await page.goto(url);await page.evaluate(()=>document.fonts.ready);
await page.waitForFunction(()=>window.__spatial);
assert.equal(await page.locator('.cover [data-scene]').count(),0);
for(let i=0;i<12;i++) {
 await page.evaluate(i=>window.__deck.go(i,true),i);
 const result=await page.evaluate(()=>{
  const s=document.querySelector('.slide.active'), note=s.querySelector('.source-note,.sources-disclaimer,.campus-credit');
  const n=note?.getBoundingClientRect();
  const items=[...s.querySelectorAll('h1,h2,h3,p,figcaption,.stat-label')].filter(e=>e!==note&&!note?.contains(e));
  const overlap=items.filter(e=>{const r=e.getBoundingClientRect();return n&&r.bottom>n.top&&r.top<n.bottom&&r.right>n.left&&r.left<n.right}).map(e=>e.textContent);
  const outside=items.filter(e=>{const r=e.getBoundingClientRect();return r.right>1601||r.bottom>820||r.left<0}).map(e=>e.textContent);
  return {index:window.__deck.state().index,overlap,outside,spatial:window.__spatial.state()};
 });
 layout.push(result);
 assert.deepEqual(result.overlap,[],`source overlap on ${i+1}`);assert.deepEqual(result.outside,[],`bounds on ${i+1}`);
 if([4,5,9].includes(i)) {assert.ok(result.spatial.drawCalls>10);assert.ok(result.spatial.triangles>100);assert.equal(result.spatial.running,false);scenes.push(result.spatial);}
 await page.screenshot({path:`reports/bupt-v3/screenshots/slide-${String(i+1).padStart(2,'0')}.png`});
}
checks.push('All 12 desktop pages: readable bounds, sources clear, 3 real rendered WebGL scenes');
await page.evaluate(()=>window.__deck.go(4));await page.waitForTimeout(2800);
let before=await page.evaluate(()=>window.__spatial.state().renders);await page.waitForTimeout(300);
assert.equal(await page.evaluate(()=>window.__spatial.state().renders),before);
await page.mouse.move(850,530);await page.waitForFunction(n=>window.__spatial.state().renders>n,before);
assert.ok(await page.evaluate(()=>window.__spatial.state().renders)>before);
await page.mouse.move(700,100);await page.waitForTimeout(1100);
assert.equal(await page.evaluate(()=>window.__spatial.state().running),false);
checks.push('Scene entrance stops at rest; real pointer gesture redraws and settles');
await page.keyboard.press('r');await page.waitForTimeout(100);await page.keyboard.press('o');
await page.waitForTimeout(100);before=await page.evaluate(()=>window.__spatial.state().renders);await page.waitForTimeout(200);
assert.equal(await page.evaluate(()=>window.__spatial.state().renders),before);
await page.keyboard.press('Escape');await page.waitForFunction(n=>!document.querySelector('#overview').open&&window.__spatial.state().renders>n,before);
checks.push('Overview pauses and resumes the 3D clock');
await page.keyboard.press('Home');
for(const key of ['ArrowRight','ArrowRight','ArrowRight','ArrowRight','ArrowRight','ArrowLeft','ArrowRight'])await page.keyboard.press(key);
await page.waitForFunction(()=>!document.querySelector('.slide.exiting')&&!window.__spatial.state().running);
assert.equal(await page.locator('.slide.active').count(),1);assert.equal(await page.locator('.slide.exiting').count(),0);
assert.equal(await page.evaluate(()=>window.__deck.state().index),5);
assert.equal(await page.evaluate(()=>window.__spatial.state().scene),'satellite');
assert.equal(await page.locator('canvas').count(),1);
await page.keyboard.press('o');await page.locator('.overview-item').nth(9).click();await page.waitForTimeout(2700);
assert.equal(await page.locator('[data-value="200"]').textContent(),'200');
checks.push('Rapid real keyboard navigation and overview selection leave one slide, one canvas, final counters');
await page.locator('#spatial-toggle').click();assert.equal(await page.locator('canvas').count(),0);
assert.equal(await page.locator('.global .spatial-fallback').evaluate(e=>getComputedStyle(e).visibility),'visible');
await page.locator('#spatial-toggle').click();assert.equal(await page.locator('canvas').count(),1);
checks.push('3D toggle restores readable static diagrams and resumes rendering');
await page.evaluate(()=>{window.__deck.go(4);window.__deck.hold(650)});
assert.equal(await page.evaluate(()=>window.__spatial.state().held),true);
await page.screenshot({path:'reports/bupt-v3/screenshots/network-mid.png'});
await page.evaluate(()=>{window.__deck.go(2);window.__deck.hold(1450)});
const milestones=await page.locator('.milestone-copy').evaluateAll(es=>es.map(e=>Number(getComputedStyle(e).opacity)));
assert.ok(milestones[0]>.9&&milestones[4]===0);
checks.push('Pinned mid-transition 3D and history milestone sequencing work');
await page.emulateMedia({reducedMotion:'reduce'});
for(const i of [4,5,9]) {
 await page.evaluate(i=>window.__deck.go(i),i);
 assert.equal(await page.evaluate(()=>window.__spatial.state().running),false);
 assert.equal(await page.evaluate(()=>window.__spatial.state().elapsed),2400);
 assert.equal(await page.evaluate(()=>document.querySelector('.slide.active').getAnimations({subtree:true}).length),0);
}
await page.screenshot({path:'reports/bupt-v3/screenshots/reduced-motion.png'});
checks.push('Reduced motion keeps full 3D stills, complete content and final counters');
const mobile=[];
for(const width of [320,375,414,768]) {
 await page.setViewportSize({width,height:900});
 for(let i=0;i<12;i++) {
  await page.evaluate(i=>window.__deck.go(i,true),i);
  const r=await page.evaluate(()=>{
   const s=document.querySelector('.slide.active');
   const overflow=[...s.querySelectorAll('h1,h2,h3,p,.stat-label')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left< -1||r.right>innerWidth+1)}).map(e=>e.textContent);
   const track=document.querySelector('.page-track').getBoundingClientRect(),controls=document.querySelector('.control-actions').getBoundingClientRect();
   return {index:window.__deck.state().index,width:innerWidth,overflow,scrollOverflow:s.scrollWidth>s.clientWidth,controlOverlap:track.bottom>controls.top&&track.top<controls.bottom&&track.right>controls.left};
  });
  mobile.push(r);assert.deepEqual(r.overflow,[],JSON.stringify(r));assert.equal(r.scrollOverflow,false,JSON.stringify(r));assert.equal(r.controlOverlap,false,JSON.stringify(r));
 }
}
checks.push('320 / 375 / 414 / 768 widths: all 12 pages fit and navigation does not overlap');
await page.setViewportSize({width:375,height:812});
await page.evaluate(()=>window.__deck.go(4,true));
await page.screenshot({path:'reports/bupt-v3/screenshots/mobile-network.png'});
await page.locator('.slide.active').evaluate(e=>e.scrollTop=e.scrollHeight);
assert.ok(await page.locator('.connections .frontier-strip').isVisible());
await page.screenshot({path:'reports/bupt-v3/screenshots/mobile-network-bottom.png'});
await page.setViewportSize({width:1600,height:900});
await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});
assert.ok(await page.locator('.slide').evaluateAll(es=>es.every(e=>getComputedStyle(e).visibility==='visible'&&getComputedStyle(e).opacity==='1')));
assert.ok(await page.locator('.spatial-fallback').evaluateAll(es=>es.every(e=>getComputedStyle(e).visibility==='visible')));
checks.push('Print exposes all 12 pages and static diagrams');
await page.emulateMedia({media:'screen',reducedMotion:'no-preference'});
await page.evaluate(()=>window.__deck.go(4,true));
await page.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
await page.waitForTimeout(200);
assert.equal(await page.locator('.connections .spatial-fallback').evaluate(e=>getComputedStyle(e).visibility),'visible');
assert.equal(await page.evaluate(()=>window.__spatial.state().running),false);
await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>window.__deck.state().index),5);
checks.push('WebGL context loss shows fallback; navigation remains usable');
const fallback=await browser.newPage();
await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args)}});
await fallback.goto(url);await fallback.evaluate(()=>window.__deck.go(4,true));await fallback.keyboard.press('End');assert.equal(await fallback.evaluate(()=>window.__deck.state().index),11);
assert.equal(await fallback.locator('#spatial-toggle').isDisabled(),true);await fallback.close();
checks.push('No-WebGL browser retains all pages with disabled 3D control');
assert.deepEqual(errors,[]);
fs.writeFileSync('reports/bupt-v3/verification.json',JSON.stringify({checks,scenes,layout,mobile,errors},null,2));
console.log(JSON.stringify({checks,errors},null,2));await browser.close();
