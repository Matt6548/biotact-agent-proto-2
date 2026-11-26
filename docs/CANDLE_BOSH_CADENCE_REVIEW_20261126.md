# BOSH acceptance review — 26 November 2026

Baseline 1574aac9a67e2456212d2ffd9a2106bf945a813a, main CI 45658202142 completed SUCCESS (137 Node; 13 Playwright pass / 2 conditional skip; build and security checks), isolated CV CI 45658202035 completed SUCCESS (137 Node; real model 3 pass; existing camera/resilience 6 pass / 1 skip).

CV V3 PR #12 exact e3ff63b9c1116d3a9cb9efa52d60f08bfb45fe6e, CI 45661625285 completed SUCCESS (144 Node; real Hand model 3 pass; camera/resilience 6 pass / 1 skip; both builds). Independently checked completed job logs and source diff. Exact eight-file change descends directly from baseline, preserves renderer, UI, pinned SDK and privacy policy. No production merge.

Specialist reports 96/96 synthetic positives vs 66/96 baseline (24 at each 7,10,12,15 FPS); 0/28 negative confirmations. Actual model photo transform tests with real timestamps improved confirmation at 7 and 10 observed FPS, and target 15 achieved 11. These are controlled fixtures, not human accuracy or display latency. CPU-first experiment remains opt-in and absent from normal UI. Preserve no invented missing frames, timestamp rejection, bounded reversible early preview and two retreat samples.

Combined HEAD must rerun both main and CV CI. Still HOLD normal UI hand activation and production: physical user test, actual device cadence, end-to-end response, Pose 1.1.1 privacy audit. Prior Preview not replaced. Next BOSH task is explicit local-only hand field route after privacy and lifecycle review; no levels, registration, second camera or forced calibration.
