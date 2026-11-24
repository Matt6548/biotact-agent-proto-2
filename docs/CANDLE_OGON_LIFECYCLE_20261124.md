# OGON — Flame lifecycle V3 (24 November 2026)

Control HEAD PR #9: f535407e3e3b3da2555670b99b00fbd345795cc4. Previous full CI run: https://github.com/Matt6548/biotact-agent-proto-2/actions/runs/45353655560 ; reference synthetic screenshots: https://github.com/Matt6548/biotact-agent-proto-2/actions/runs/45353655560/artifacts/14900419244. BOSH's 46-degree perspective and projection regression are retained. Previous BOSH measurements of OGON #7 (13 draw calls, 5852 triangles, headless rAF 20–41.7 FPS) are not a measured result for this branch or for Redmi.

## Physical reference vs model
- NASA, Candle Flame — 1g vs Microgravity: https://www.nasa.gov/image-article/candle-flame-1g-vs-microgravity/ : buoyant convection explains upward tapered shape and luminous soot. Reference photo, not a new laboratory experiment.
- Royal Society of Chemistry, Introduction to Chemistry, Flames and Radiation: https://doi.org/10.1039/9781837070046-00001 : dark fuel-rich region around wick, blue reaction region, luminous soot. Render uses an original dark-foot mask rather than a flat uniform yellow shape.
- Cross-flow literature https://www.sciencedirect.com/science/article/abs/pii/S0016236116306871 : buoyancy and cross-flow change flame orientation/oscillation. No physical calibration or claim of airflow from camera. Existing damped oscillator is retained; renderer now follows signed tilt with time-based damping.
- BOSH's docs/CANDLE_OS_RESEARCH_20261123.md: gddickinson/candle_flame (reported MIT) separates flame life, temperature and smoke particles; useful conceptual comparison. SmokeGL (reported MIT) uses soft particles; fire-shader (reported MIT) uses GLSL masks. No code/assets imported, no new license/dependency; these repos have not been benchmarked against ours. No new particle-engine or WebGPU requirement.

## Incremental improvements
- Keep 46-degree camera and prior softened floor. Root flame at curved wick, use yaw-only billboard (no pitch-induced displacement). Compress flame during sideways movement and extinguishing, keep lower end anchored. Three existing sheets, no extra render passes.
- Replace fixed-per-frame lerp with exponential damping in elapsed seconds; short pauses freeze shader time, clamp long frame delta. Warm point light follows signed bend, dims during instability; wax emissive tracks flame; ember cools gradually.
- Smoke starts only after the visible flame collapses, rises from the wick with signed drift, soft Gaussian edge. Relight clears smoke and restores light immediately on reset. Idle smoke/air draw calls skipped. No additional camera or detector.
- Wax mesh seam normals averaged and melt pool slightly deeper; invalid tessellation bounded. Existing potek geometry and material retained.

## Validation
- Four additional Node regressions: dt invariance, signed smoke/relight, smoke gating and 46° FOV, wax normals/tessellation. Existing projection regression unchanged.
- Browser test 360/390/1366/1440 captures actual WebGL target, draw calls, triangles, DPR, headless rAF, p50/p95 frame time. New 390px lifecycle test runs existing engineering simulation form (not physical camera) and records steady/deflected/extinguished/relight with metrics, including ember heat. Camera is not requested. No personal images.
- Scoped Actions workflow runs unit suite, build and both visual browser tests. Results pending until independently verified. GPU timing, real phone FPS/heat/battery and actual side-by-side lab candle comparison are BLOCKED (no device/lab); camera concurrency remains BOSH/CV field acceptance.
- Production, integration refs, UI, CV and existing core oscillator unchanged; do not merge or deploy.