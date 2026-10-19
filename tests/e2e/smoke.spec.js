import { test, expect } from "@playwright/test";

test("training surface works and records visual evidence",async({page},testInfo)=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Candle Strike"})).toBeVisible();

  const target=page.locator("#target-canvas canvas");
  await expect(target).toBeVisible();

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.screenshot({
    path:testInfo.outputPath("01-initial.png"),
    fullPage:true
  });

  await page.getByText("Engineering simulation controls").click();
  await page.getByRole("button",{name:"Simulate strike"}).click();

  await expect(page.locator("#score")).not.toHaveText("—");
  await expect(page.locator("#flame-state")).not.toHaveText("Stable flame");

  await page.screenshot({
    path:testInfo.outputPath("02-after-strike.png"),
    fullPage:true
  });

  await page.getByRole("button",{name:"Reset target"}).click();
  await expect(page.locator("#score")).toHaveText("—");
  await expect(page.locator("#flame-state")).toHaveText("Stable flame");
});

test("mobile controls remain reachable without horizontal overflow",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile-specific check");
  await page.goto("/");
  const cameraButton=page.getByRole("button",{name:"Start camera"});
  await expect(cameraButton).toBeVisible();
  await cameraButton.scrollIntoViewIfNeeded();

  const metrics=page.locator(".metric-strip");
  await expect(metrics).toBeVisible();

  const widths=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,
    client:document.documentElement.clientWidth
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client+1);

  await page.screenshot({
    path:testInfo.outputPath("03-mobile-controls.png"),
    fullPage:true
  });
});
