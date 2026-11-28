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
      const deltas = times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b);
      return { fps: Number(((count - 1) * 1000 / Math.max(1, times[count - 1] - times[0])).toFixed(1)),
        p50Ms: deltas[Math.floor(deltas.length * 0.5)],
        p95Ms: deltas[Math.ceil(deltas.length * 0.95)-1] };
    });
    metrics.push({ viewportWidth: width, ...size, ...rendererStats,
      headlessChromiumFps: headlessFps.fps,
      frameP50Ms: headlessFps.p50Ms, frameP95Ms: headlessFps.p95Ms,
      fpsWarning: "CI/headless-browser sample only; NOT Redmi Note 9S FPS or GPU time" });
  }
  await writeFile(testInfo.outputPath("candle-render-metrics.json"),
    JSON.stringify(metrics, null, 2));
  expect(pageErrors).toEqual([]);
  expect(shaderErrors).toEqual([]);
});

test("real WebGL canvas: side deflection, extinction, smoke and manual relight", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => {
    if (m.type() === "error" && /WebGLProgram|Shader Error|compile/i.test(m.text())) errors.push(m.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const target = page.locator("#target-canvas");
  const canvas = target.locator("canvas");
  await expect(target).toHaveAttribute("data-renderer-kind", "webgl");
  const stats = () => canvas.evaluate(c => c.candleRenderStats());
  await expect.poll(async () => (await stats()).flameAlive).toBeGreaterThan(0.95);
  expect((await stats()).cameraFov).toBe(46);
  const observations = [{ phase:"steady", ...await stats() }];
  await target.screenshot({path:testInfo.outputPath("01-steady.png")});
  // Exercise the existing engineering simulation form, not a test-only renderer API.
  const strike = (speed, alignment, distance) => page.evaluate(({speed,alignment,distance}) => {
    for (const [id,value] of Object.entries({speed,alignment,distance})) {
      const input = document.getElementById(id);
      input.value = String(value);
      input.dispatchEvent(new Event("input", {bubbles:true}));
    }
    document.getElementById("controls").requestSubmit();
  }, {speed,alignment,distance});
  await strike(7,0.9,0.3);
  await expect.poll(async () => (await stats()).flameTilt).toBeGreaterThan(0.03);
  observations.push({phase:"side", ...await stats()});
  await target.screenshot({path:testInfo.outputPath("02-deflected.png")});
  await strike(12,1,0.1);
  await expect.poll(async () => (await stats()).flameAlive).toBeLessThan(0.12);
  await expect.poll(async () => (await stats()).smokeOpacity).toBeGreaterThan(0.12);
  observations.push({phase:"extinguished", ...await stats()});
  await target.screenshot({path:testInfo.outputPath("03-smoke.png")});
  await page.locator("#reset").click();
  await expect.poll(async () => (await stats()).flameAlive).toBeGreaterThan(0.95);
  expect((await stats()).smokeOpacity).toBe(0);
  observations.push({phase:"relight", ...await stats()});
  await target.screenshot({path:testInfo.outputPath("04-relight.png")});
  await writeFile(testInfo.outputPath("lifecycle-metrics.json"), JSON.stringify(observations,null,2));
  expect(errors).toEqual([]);
});
