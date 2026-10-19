import { test, expect } from "@playwright/test";

test("simulation drives the 3D target and reset restores the session",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Candle Strike"})).toBeVisible();
  await page.getByText("Engineering simulation controls").click();
  await page.getByRole("button",{name:"Simulate strike"}).click();
  await expect(page.locator("#score")).not.toHaveText("—");
  await expect(page.locator("#flame-state")).not.toHaveText("Stable flame");
  await page.getByRole("button",{name:"Reset target"}).click();
  await expect(page.locator("#score")).toHaveText("—");
  await expect(page.locator("#flame-state")).toHaveText("Stable flame");
});
