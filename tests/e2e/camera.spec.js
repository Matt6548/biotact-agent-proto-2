import { test, expect } from "@playwright/test";

test("fake webcam initializes private pose runtime and the correct renderer mode",async({page},testInfo)=>{
  const external=[];
  page.on("request",(request)=>{
    const url=new URL(request.url());
    if(url.protocol==="http:"||url.protocol==="https:"){
      if(url.origin!=="http://127.0.0.1:4173")external.push(request.url());
    }
  });

  await page.goto("/");
  await page.getByRole("button",{name:"Start training"}).click();

  await expect(page.locator("#camera-status")).toContainText(/Pose model ready/i,{timeout:20000});
  const frameAction=page.getByRole("button",{name:"Step into frame"});
  await expect(frameAction).toBeVisible();
  await expect(frameAction).toBeDisabled();
  await expect(page.locator("#setup-state")).toContainText(/frame|body|camera/i);

  expect(external).toEqual([]);

  const mode=await page.locator("#camera-card").getAttribute("data-renderer-mode");
  if(testInfo.project.name==="camera-mobile-chromium"){
    expect(mode).toBe("mini");
    await expect(page.locator("#mini-target-canvas canvas")).toHaveCount(1);
  }else{
    expect(mode).toBe("full");
    await expect(page.locator("#mini-target-canvas canvas")).toHaveCount(0);
  }
});
