import {test,expect} from '@playwright/test';

for(const [width,height] of [[1366,625],[1440,900],[1024,600]]){
 test('desktop Hand field fits entire stage without camera permission: '+width+'x'+height,async({page})=>{
  await page.setViewportSize({width,height});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('.lab')).toHaveAttribute('data-tracking-mode','hand-field');
  await expect(page.locator('#target-canvas')).toHaveAttribute('data-renderer-kind','webgl');
  await expect(page.locator('#target-canvas canvas')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Начать упражнение'})).toBeInViewport();
  await expect(page.getByText('Освободи место · без настоящего огня · камера обрабатывается локально')).toBeVisible();
  const geometry=()=>page.evaluate(()=>{
   const r=document.querySelector('.scene').getBoundingClientRect();
   const c=document.querySelector('#target-canvas canvas').getBoundingClientRect();
   return {top:r.top,bottom:r.bottom,height:r.height,canvasHeight:c.height,viewport:innerHeight,
    overflow:document.documentElement.scrollWidth>innerWidth,
    cameraOn:Boolean(document.querySelector('#camera').srcObject),
    cameraBelow:document.querySelector('#camera-card').getBoundingClientRect().top>=r.bottom};
  });
  const g=await geometry();
  expect(g.top).toBeGreaterThanOrEqual(0);
  expect(g.bottom).toBeLessThanOrEqual(g.viewport);
  expect(g.height).toBeGreaterThanOrEqual(270);
  expect(Math.abs(g.height-g.canvasHeight)).toBeLessThanOrEqual(3);
  expect(g.overflow).toBe(false);
  expect(g.cameraOn).toBe(false);
  expect(g.cameraBelow).toBe(true);
  await page.getByRole('button',{name:'Настроить камеру'}).click();
  await expect(page.locator('#camera-card')).toBeInViewport();
  await page.getByRole('button',{name:'К свече ↑'}).click();
  await expect.poll(async()=>{const q=await geometry();return q.top>=-1&&q.bottom<=q.viewport+1;}).toBe(true);
  expect((await geometry()).cameraOn).toBe(false);
 });
}
