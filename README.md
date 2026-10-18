# Martial Training Lab

Clean reboot of the old Biotact prototype into a local-first martial-arts training simulator.

## Safety / history
- Original Biotact IE-Agent is preserved in `legacy/biotact-ie-agent-2025`.
- New development happens in `martial-training-lab`.
- First training target: **Candle Strike** — a controlled non-contact strike affecting a virtual flame.

## Product rule
We do not claim a single consumer camera measures true punch force. V1 uses motion features we can validate more honestly: segment speed, trajectory, timing, alignment and distance.

## Stack
- Vite 8
- Three.js
- MediaPipe Tasks Vision
- Node deterministic tests
- Playwright browser regression

## Run
Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
npm test
```

For browser tests:
```bash
npx playwright install
npm run test:e2e
```

## Current checkpoint
Stage 0 — clean foundation. The current UI is a small engineering harness for validating the flame-response and scoring core before camera tracking and the final training experience are added.
