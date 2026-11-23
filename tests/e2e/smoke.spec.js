import { test, expect } from "@playwright/test";

test("one-screen candle practice opens without any mandatory briefing",async({page},testInfo)=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Игра со свечой"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Начать упражнение"})).toBeEnabled();
  await expect(page.getByRole("dialog",{name:"Candle Strike"})).toHaveCount(0);
  await expect(page.locator("#mission-gate")).toBeHidden();
  await expect(page.locator("#target-canvas canvas")).toBeVisible();
  await expect(page.getByText("Не используй настоящую свечу.",{exact:false})).toBeVisible();
  await expect(page.locator(".mission-strip")).toBeHidden();
  await expect(page.locator(".player-layer")).toBeHidden();
  await expect(page.locator(".level-line")).toBeHidden();
  const visualOrder=await page.evaluate(()=>Array.from(document.querySelector(".live-grid").children,el=>el.className));
  expect(visualOrder).toEqual(["target-card","camera-card"]);
  await page.screenshot({path:testInfo.outputPath("01-candle-open.png"),fullPage:true});
});

test("simulation supports unlimited strikes with no stages or score gate",async({page},testInfo)=>{
  // 25 real UI clicks plus a full-page WebGL screenshot can exceed Playwright's
  // 30-second default when the fake-camera project uses the GPU in parallel.
  test.setTimeout(75_000);
  await page.goto("/");
  await page.getByText("История и технические настройки").click();
  await page.getByText("Engineering simulation controls").click();
  await page.getByRole("button",{name:"Демо без камеры"}).click();
  const simulate=page.getByRole("button",{name:"Simulate strike"});
  for(let i=0;i<25;i+=1)await simulate.click();
  await expect(page.locator("#round-count")).toHaveText("25");
  await expect(page.locator("#round-summary")).toBeHidden();
  await expect(page.locator("#practice-status")).toHaveText("Готово к началу");
  await expect(page.locator("#flame-state")).not.toHaveText("Stable flame");
  await expect(page.getByRole("button",{name:"Начать упражнение"})).toBeEnabled();
  await page.getByRole("button",{name:"Зажечь снова"}).click();
  await expect(page.locator("#flame-state")).toHaveText("Пламя спокойно");
  await page.screenshot({path:testInfo.outputPath("02-free-practice-demo.png"),fullPage:true});
});

test("mobile keeps the big candle visible without horizontal overflow",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile-specific check");
  await page.goto("/");
  await expect(page.locator("#target-canvas canvas")).toBeVisible();
  await expect(page.locator(".target-card")).toBeVisible();
  await expect(page.getByRole("button",{name:"Начать упражнение"})).toBeVisible();
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client+1);
  const targetHeight=await page.locator(".scene").evaluate(el=>el.getBoundingClientRect().height);
  expect(targetHeight).toBeGreaterThan(300);
  await page.screenshot({path:testInfo.outputPath("03-mobile-free-practice.png"),fullPage:true});
});
