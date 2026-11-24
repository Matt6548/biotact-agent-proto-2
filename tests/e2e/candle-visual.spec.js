import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("OGON flame and shadow render at 360/390/1366/1440 with scoped GPU estimates", async ({ page }, testInfo) => {
  // Four viewport screenshots and 104 animation-frame samples share a software GPU in CI.
  // Keep all render assertions; give this multi-viewport test its own bounded budget.
  test.setTimeout(120_000);
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
  const metrics = [];
  for (const width of [360, 390, 1366, 1440]) {
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
    await page.waitForTimeout(300);
    // Synthetic test page only: never capture or upload the owner's webcam stream.
    await target.screenshot({ path: testInfo.outputPath("candle-" + width + ".png") });
    const rendererStats = await canvas.evaluate((element) =>
      typeof element.candleRenderStats === "function" ? element.candleRenderStats() : null
    );
    expect(rendererStats, "renderer should expose scoped, read-only diagnostics").not.toBeNull();
    expect(rendererStats.shadowMapEnabled).toBe(false);
    expect(rendererStats.flameAlive).toBeGreaterThan(0.8);
    expect(rendererStats.drawCalls).toBeGreaterThan(5);
    expect(rendererStats.drawCalls).toBeLessThanOrEqual(22);
    expect(rendererStats.triangles).toBeLessThan(12000);
    // Visibility matters: background tabs can throttle requestAnimationFrame.
    await page.bringToFront();
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe("visible");
    const headlessFps = await page.evaluate(async () => {
      const count = 26;
      const times = [];
      await new Promise((resolve, reject) => {
        let frameId;
        const deadline = setTimeout(() => {
          cancelAnimationFrame(frameId);
          reject(new Error("Timed out collecting 26 visible animation frames"));
        }, 20_000);
        const sample = (t) => {
          times.push(t);
          if (times.length >= count) {
            clearTimeout(deadline);
            resolve();
          } else frameId = requestAnimationFrame(sample);
        };
        frameId = requestAnimationFrame(sample);
      });
      return Number(((count - 1) * 1000 / Math.max(1, times[count - 1] - times[0])).toFixed(1));
    });
    metrics.push({ viewportWidth: width, ...size, ...rendererStats,
      headlessChromiumFps: headlessFps,
      fpsWarning: "CI/headless-browser sample only; NOT Redmi Note 9S FPS or GPU time" });
  }
  await writeFile(testInfo.outputPath("candle-render-metrics.json"),
    JSON.stringify(metrics, null, 2));
  expect(pageErrors).toEqual([]);
  expect(shaderErrors).toEqual([]);
});
