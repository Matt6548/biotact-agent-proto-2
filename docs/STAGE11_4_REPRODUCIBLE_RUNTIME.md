# Stage 11.4 — Reproducible private runtime

The dependency lock produced and tested by CI is now committed at repository HEAD.

CI no longer resolves dependencies with `npm install`. It uses:

```bash
npm ci --no-audit --no-fund
```

The workflow is read-only again (`contents: read`).

A successful Stage 11.4 run therefore proves, for the committed lock:
- deterministic dependency installation,
- unit/regression tests,
- model SHA-256 verification,
- production build,
- desktop/mobile browser acceptance,
- fake-webcam camera initialization,
- same-origin Pose Landmarker runtime with no external HTTP(S) requests observed by the browser test.
