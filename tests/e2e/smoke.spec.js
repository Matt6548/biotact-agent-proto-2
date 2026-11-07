import { test, expect } from "@playwright/test";

async function completeBriefing(page,name="Test Player"){
  await expect(page.getByRole("dialog",{name:"Candle Strike"})).toBeVisible();
  await page.locator("#player-name-input").fill(name);
  await page.locator("#safety-ack").check();
  await expect(page.getByRole("button",{name:"Enter training"})).toBeEnabled();
  await page.getByRole("button",{name:"Enter training"}).click();
  await expect(page.locator("#mission-gate")).toBeHidden();
}


test("mandatory briefing explains the game before training",async({page},testInfo)=>{
  await page.goto("/");
  await expect(page.getByText("Required once before your first session.")).toBeVisible();
  await expect(page.getByText(/does not measure real punch force/i)).toBeVisible();
  await expect(page.getByText(/No real candle is needed/i)).toBeVisible();
  await expect(page.getByRole("button",{name:"Enter training"})).toBeDisabled();
  await page.locator("#player-name-input").fill("QA Fighter");
  await expect(page.getByRole("button",{name:"Enter training"})).toBeDisabled();
  await page.locator("#safety-ack").check();
  await page.screenshot({path:testInfo.outputPath("00-mission-briefing.png"),fullPage:true});
  await page.getByRole("button",{name:"Enter training"}).click();
  await expect(page.locator("#mission-gate")).toBeHidden();
  await expect(page.locator("#player-display")).toHaveText("QA Fighter");

  await page.reload();
  await expect(page.locator("#mission-gate")).toBeHidden();
  await expect(page.locator("#player-display")).toHaveText("QA Fighter");
  await expect(page.getByRole("button",{name:"Start training"})).toBeVisible();
});

test("focused arena completes one fixed-goal five-strike round",async({page},testInfo)=>{
  await page.goto("/");
  await completeBriefing(page);
  await expect(page.getByRole("heading",{name:"Candle Strike"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Start training"})).toBeVisible();
  await expect(page.locator(".player-layer")).not.toHaveAttribute("open","");
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
  await expect(page.locator("#round-insight")).toBeVisible();
  await expect(page.locator("#summary-consistency")).toContainText(/Stable|Developing|Variable/);
  await expect(page.locator("#summary-drill")).toContainText(/drill/i);
  await expect(page.locator("#session-review")).toBeVisible();
  await expect(page.locator("#session-rounds")).toHaveText("1");
  await expect(page.locator("#session-score")).not.toHaveText("—");
  await expect(page.locator("#session-focus")).not.toHaveText("");

  await page.screenshot({path:testInfo.outputPath("02-round-complete.png"),fullPage:true});
});

test("mobile focused arena has one primary action and no horizontal overflow",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile-specific check");
  await page.goto("/");
  await completeBriefing(page);
  await expect(page.getByRole("button",{name:"Start training"})).toBeVisible();
  await expect(page.locator(".tracking-details")).not.toHaveAttribute("open","");
  const arenaPosition=await page.locator(".arena-status").evaluate((el)=>getComputedStyle(el).position);
  expect(arenaPosition).not.toBe("sticky");
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client+1);
  await page.screenshot({path:testInfo.outputPath("03-mobile-focused.png"),fullPage:true});
});
