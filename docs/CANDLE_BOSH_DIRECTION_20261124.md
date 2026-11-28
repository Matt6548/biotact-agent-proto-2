# BOSH — product direction and release discipline (2026-11-24)

One product: a realistic interactive virtual candle, with natural movement response, no mandatory rounds, levels, registration, or persistent camera UI. Keep the existing Three.js / MediaPipe / Vercel architecture. No real flame during exercise. Single RGB camera does not measure force, airflow, or absolute distance.

## Exact integration candidate
- Verified baseline PR #6: d9a84ac63ee22f21f6e79d802540a256b2136e9c; full CI run 45145721373 succeeded.
- OGON PR #7: 0865a61e17516718408f33b99e962907a04d8ef2; its scoped CI 45144767161 succeeded, real device visual quality not yet approved.
- CV PR #8: 854896df51f305987bb64d991b52526df135aa5b; hand-only path is experimental, opt-in factory not wired to UI, default Pose path stays unchanged. Actual model and full integration CI not previously verified.
- All 16 changed files are disjoint and match the prior common checkpoint on the baseline. This candidate ports the exact blobs onto the current baseline, including its trace import safety fixes; no production merge.

## Owners and workflow
BOSH owns shared integration, interface, research, evidence and preview; OGON owns render and flame quality; CV owns gesture robustness, worker lifecycle and model verification. Keep two specialists and one coordinator. The owner should be asked only for decisions requiring product approval, authorization, or a real device test.

## Gates
1. Run full Node/build/security/Playwright CI on exact combined HEAD. Do not confuse branch mergeability with tests.
2. Compare actual visual screenshots and motion before/after. Review flame, shadows, wax, mobile layout, draw calls, FPS and resource disposal.
3. Validate hand experiment in isolation: pinned local model, init/infer time, fallback, false positives and camera stop. Do not enable hand mode by default or claim it works from synthetic tests alone.
4. Use existing Vercel Preview only after relevant checks. No new hosting project. Maintain privacy: no personal screenshots, raw video or identifiable traces in GitHub.
5. Real desktop and Redmi Note 9S evaluation, including natural movement, camera denial/pause, lag, heat and battery. No production promotion without explicit owner approval.

Report PASS/FAIL/BLOCKED with exact HEAD and links; separate tested facts from targets. Do not keep adding features before improving core experience.