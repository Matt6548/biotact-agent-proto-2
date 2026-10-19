# Stage 10.2 — Motion regression gate

A new integration-level test feeds pose frames through the real `LiveTrainingAnalyzer`, including:
`world landmark -> velocity -> 3-frame median -> quality gate -> StrikeDetector`.

Current required behavior:
- clean synthetic straight punch: exactly 1 event,
- slow arm motion: 0 events,
- single-frame coordinate spike: 0 events,
- bad framing: 0 emitted events.

This prevents future detector changes from silently reintroducing obvious false positives while we wait for real-device traces.
