import { test, expect } from "@playwright/test";

test("focused arena completes one fixed-goal five-strike round",async({page},testInfo)=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Candle Strike"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Start training"})).toBeVisible();
  await expect(page.locator("#arena-goal")).toHaveText("Deflect the flame");

  const target=page.locator("#target-canvas canvas");
  await expect(target).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.screenshot({path:testInfo.outputPath("01-initial.png"),fullPage:true});

  await page.getByText("Engineering simulation controls").click();
  await page.getByRole("button",{name:"Start simulated round"}).click();
  await expect(page.locator("#arena-goal")).toHaveText("Deflect the flame");

  for(let i=0;i<5;i+=1){
    await page.getByRole("button",{name:"Simulate strike"}).click();
    if(i<4)await expect(page.locator("#arena-goal")).toHaveText("Deflect the flame");
    await page.waitForTimeout(80);
  }

  await expect(page.locator("#round-summary")).toBeVisible();
  await expect(page.locator("#round-count")).toHaveText("5 / 5");
  await expect(page.locator("#summary-score")).not.toHaveText("—");
  await expect(page.locator("#arena-goal")).toHaveText("Deflect the flame");
  await expect(page.locator("#round-success")).toHaveText("3 / 3");
  await expect(page.locator("#level")).toHaveText("Next · 2 · Destabilize");

  await page.screenshot({path:testInfo.outputPath("02-round-complete.png"),fullPage:true});
});

test("mobile focused arena has one primary action and no horizontal overflow",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile-specific check");
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Start training"})).toBeVisible();
  await expect(page.locator(".tracking-details")).not.toHaveAttribute("open","");
  const arenaPosition=await page.locator(".arena-status").evaluate((el)=>getComputedStyle(el).position);
  expect(arenaPosition).not.toBe("sticky");
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client+1);
  await page.screenshot({path:testInfo.outputPath("03-mobile-focused.png"),fullPage:true});
});
