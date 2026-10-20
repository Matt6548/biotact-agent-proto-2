# Stage 24.2 — Split long-running camera acceptance

Stage 24.1 showed that simply increasing the total timeout was not the right fix.

The camera acceptance test had two different responsibilities:
1. fast UI/privacy/renderer verification plus QA screenshot;
2. waiting long enough to collect a device-performance observation window.

On slower CI workers, the second responsibility consumed most of the test budget, leaving the screenshot and final layout assertions racing the global timeout.

## Fix
The responsibilities are now separated.

### Camera/UI/privacy test
Runs for desktop and mobile fake-camera projects and verifies:
- private self-hosted Pose runtime initializes;
- real inference diagnostics arrive;
- no external runtime HTTP(S) requests;
- correct full/mini renderer mode;
- mobile focus-mode visibility/sticky/wrapping behavior;
- QA screenshot.

### Device readiness integration test
Runs once on the desktop fake-camera project with its own 60-second budget and verifies:
- Pose runtime initializes;
- inference results arrive;
- aggregate device readiness leaves Collecting;
- device-report export becomes enabled;
- no external runtime HTTP(S) requests.

The readiness algorithm itself remains covered by deterministic unit tests. Running the same long observation twice (desktop + mobile) adds CI timing risk without testing different logic.
