import { test, expect } from "@playwright/test";

test("WebGL candle stays visible at 360, 390 and 1440px, with visual evidence", async ({ page }, testInfo) => {
  const pageErrors = [];
  const shaderErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /WebGLProgram|Shader Error|compile/i.test(message.text())) {
      shaderErrors.push(message.text());
    }
  });

  await page.goto("/");
  // Until BOSH removes the old briefing, it remains a prerequisite to inspect the arena.
  if (await page.locator("#mission-gate").isVisible()) {
    await page.locator("#player-name-input").fill("Visual QA");
    await page.locator("#safety-ack").check();
    await page.getByRole("button", { name: "Enter training" }).click();
  }
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    const target = page.locator("#target-canvas");
    const canvas = target.locator("canvas");
    await expect(canvas).toBeVisible();
    await expect(target).toHaveAttribute("data-renderer-kind", "webgl");
    const size = await target.evaluate((element) => {
      const { width: cssWidth, height: cssHeight } = element.getBoundingClientRect();
      const rendered = element.querySelector("canvas");
      return {
        cssWidth, cssHeight,
        canvasWidth: rendered.width,
        pixelRatio: rendered.width / Math.max(1, cssWidth),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(size.cssWidth).toBeGreaterThan(90);
    expect(size.cssHeight).toBeGreaterThan(120);
    expect(size.canvasWidth).toBeGreaterThan(0);
    expect(size.pixelRatio).toBeLessThanOrEqual(width <= 390 ? 1.36 : 2.01);
    expect(size.overflow).toBeLessThanOrEqual(1);
    await target.screenshot({ path: testInfo.outputPath("candle-" + width + ".png") });
  }
  expect(pageErrors).toEqual([]);
  expect(shaderErrors).toEqual([]);
});
