import { test, expect } from "@playwright/test";

test("WebGL failure falls back without losing the training flow",async({page})=>{
  await page.addInitScript(()=>{
    const native=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      if(String(type).toLowerCase().startsWith("webgl"))return null;
      return native.call(this,type,...args);
    };
  });

  await page.goto("/");
  await expect(page.locator("#target-canvas")).toHaveAttribute("data-renderer-kind","fallback");
  await expect(page.locator(".fallback-target")).toBeVisible();

  await page.getByText("История и технические настройки").click();
  await page.getByText("Engineering simulation controls").click();
  await page.getByRole("button",{name:"Simulate strike"}).click();
  await expect(page.locator("#score")).not.toHaveText("—");
  await expect(page.locator("#flame-state")).not.toHaveText("Stable flame");
});

test("camera permission failure returns to a retryable state",async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator.mediaDevices,"getUserMedia",{
      configurable:true,
      value:()=>Promise.reject(new DOMException("Permission denied for test","NotAllowedError")),
    });
  });

  await page.goto("/");
  await page.getByRole("button",{name:"Начать упражнение"}).click();

  // The user-facing camera error is localized, while the underlying browser
  // error is still available in the technical status for diagnosis.
  await expect(page.locator("#setup-state")).toContainText(/Нет доступа|разрешени|permission|unavailable/i);
  await expect(page.getByRole("button",{name:"Начать упражнение"})).toBeEnabled();
  await expect(page.locator("#camera-status")).toContainText(/permission|denied/i);
});
