# QA protocol

## Automated gates
Every push to `martial-training-lab` runs:
1. dependency install on Node 22,
2. deterministic unit tests,
3. production Vite build,
4. Chromium install,
5. desktop browser acceptance at 1440×1000,
6. mobile browser acceptance using Pixel 7 emulation,
7. upload of visual QA evidence.

## Browser acceptance
The automated browser verifies:
- Candle Strike heading is visible,
- Three.js canvas renders,
- no horizontal overflow,
- engineering simulation causes score and flame state to change,
- reset restores target,
- primary camera control remains reachable on mobile,
- responsive metric layout remains visible.

## Evidence artifact
The workflow uploads `martial-training-qa` containing:
- desktop initial full-page capture,
- desktop after-strike capture,
- mobile initial/after-strike captures,
- mobile controls capture,
- Playwright traces/screenshots if failures occur.

## Manual gates still required
Automation cannot prove:
- real webcam permission behavior on the user's device,
- quality of pose tracking under the user's lighting,
- motion thresholds across different people,
- physical candle calibration,
- perceived realism of 3D motion on low-end phones.

Those require HTTPS/device field testing.
