# Stage 23.2 — Hidden-control acceptance fix

Stage 23.1 reached a real device-readiness status in the fake-camera test, proving the diagnostic sampling path works.

The remaining failure was an accessibility-locator mismatch:
- `Export device report` intentionally lives inside the collapsed `Field test data` details;
- mobile live focus mode intentionally hides that entire section;
- Playwright `getByRole(...)` only resolves elements exposed in the accessibility tree, so the hidden button was reported as “not found” even though it existed and was enabled in the DOM.

The acceptance assertion now targets `#device-report-export` directly and still requires it to be enabled after readiness is reached.

This preserves the intended UX: technical export controls stay out of the live training surface.
