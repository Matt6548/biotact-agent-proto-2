# Stage 24 — Deployment readiness

## Decision
The new Martial Training deployment must **not** reuse the existing GitHub Pages site for `biotact-agent-proto-2`.

TinyFish verified that the existing Pages URL still serves the legacy Biotact Q4-2025 marketing/analysis app. It remains untouched.

## Preferred new HTTPS target
Vercel is prepared as the next deployment target for the Martial Training branch.

Why this fits the current app:
- Vite is a supported frontend framework;
- the build remains `npm run build`;
- the static output is `dist`;
- `vercel.json` supports response headers, so the app can keep the same CSP, camera Permissions Policy, COOP, COEP and CORP used by the verified local server.

No deployment has been performed in this stage. Publishing remains a separate explicit action.

## Security-header parity
`scripts/check-deployment-security.mjs` checks:
- Vercel framework/build/output;
- exact Vercel security headers;
- parity with the existing Netlify header config;
- presence of the same isolation/privacy headers in the portable Python server.

CI runs this check after the production build.

## Production acceptance after publishing
A deployment is not accepted merely because the URL returns 200.

The public HTTPS URL must then be checked for:
1. CSP and Permissions-Policy headers;
2. COOP/COEP/CORP headers;
3. app/model/WASM loading from the same origin;
4. no third-party runtime requests;
5. camera permission flow;
6. desktop/mobile layout;
7. real-device field acceptance and exported device report.

## Current boundary
Automated acceptance remains strong, but punch-recognition quality still needs actual human movement on the target device.
