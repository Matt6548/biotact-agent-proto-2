import { test, expect } from "@playwright/test";

// The input is intentionally hidden in the advanced diagnostics area.
// File upload must not parse huge untrusted JSON before rejecting it.
test("oversized imported motion trace is rejected before JSON parsing",async({page})=>{
  await page.goto("/");
  await page.locator("#trace-import").setInputFiles({
    name:"oversized-trace.json",
    mimeType:"application/json",
    buffer:Buffer.alloc(5*1024*1024+1,0x78),
  });
  await expect(page.locator("#trace-status")).toContainText("trace-file-too-large");
  await expect(page.locator("#trace-replay")).toBeDisabled();
});
