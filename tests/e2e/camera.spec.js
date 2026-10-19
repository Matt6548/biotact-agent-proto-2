import { test, expect } from "@playwright/test";

test("fake webcam initializes the self-hosted pose model without third-party runtime requests",async({page})=>{
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
  await expect(page.getByRole("button",{name:"Calibrate 5 s"})).toBeVisible();
  await expect(page.locator("#setup-state")).toContainText(/ready/i);

  expect(external).toEqual([]);
});
