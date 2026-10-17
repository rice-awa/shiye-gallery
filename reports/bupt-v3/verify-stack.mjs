import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`file://${process.cwd()}/content/presentations/bupt-v3/index.html`);
await page.evaluate(()=>document.fonts.ready);
await page.evaluate(()=>__deck.go(5,true));
await page.screenshot({path:'reports/bupt-v3/screenshots/stack-diagram.png'});
await page.locator('#next').click();
assert.deepEqual(await page.evaluate(()=>[__deck.state().index,__deck.state().researchCard]),[5,1]);
assert.equal(await page.locator('.research-news').getAttribute('aria-hidden'),'false');
await page.waitForTimeout(650);
await page.screenshot({path:'reports/bupt-v3/screenshots/stack-news.png'});
await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>__deck.state().index),6);
await page.keyboard.press('ArrowLeft');assert.deepEqual(await page.evaluate(()=>[__deck.state().index,__deck.state().researchCard]),[5,1]);
await page.keyboard.press('ArrowLeft');assert.deepEqual(await page.evaluate(()=>[__deck.state().index,__deck.state().researchCard]),[5,0]);
await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>__deck.state().index),4);
await page.evaluate(()=>__deck.go(5,true));
await page.locator('body').click({position:{x:50,y:100}});await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__deck.state().researchCard),1);
await page.keyboard.press('r');assert.equal(await page.evaluate(()=>__deck.state().researchCard),0);
await page.evaluate(()=>__deck.settle());
for(let i=0;i<5;i++)await page.locator('#research-card-toggle').click({force:true});
await page.waitForTimeout(650);assert.equal(await page.locator('.research-stack .is-front').count(),1);assert.equal(await page.evaluate(()=>__deck.state().researchCard),1);
await page.keyboard.press('o');await page.locator('.overview-item').nth(7).click();assert.equal(await page.evaluate(()=>__deck.state().index),7);
await page.evaluate(()=>__deck.go(5,true));assert.equal(await page.evaluate(()=>__deck.state().researchCard),0);
await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('ArrowRight');
assert.equal(await page.locator('.research-card').evaluateAll(es=>es.reduce((n,e)=>n+e.getAnimations().length,0)),0);
for(const width of [320,375,414]){
 await page.setViewportSize({width,height:812});
 await page.evaluate(()=>__deck.go(5,true));
 for(let i=0;i<2;i++){
  await page.locator('#research-card-toggle').click();
  const b=await page.locator('.research-card.is-front').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);
 }
}
await page.locator('.research-visual').scrollIntoViewIfNeeded();
await page.screenshot({path:'reports/bupt-v3/screenshots/stack-mobile.png'});
await page.setViewportSize({width:1600,height:900});await page.emulateMedia({media:'print'});
const boxes=await page.locator('.research-card').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}}));assert.ok(boxes[0].right<=boxes[1].left);
assert.deepEqual(errors,[]);
console.log('PASS: next/previous/Space/replay/overview, interrupted card swaps, reduced motion, 320–414px, print, no runtime errors.');
await browser.close();
