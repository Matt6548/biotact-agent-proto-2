# Motion regression fixtures

This directory/test layer distinguishes two kinds of evidence.

## Synthetic traces
Generated from known coordinates to test software invariants:
- one clean fast extension -> one strike,
- slow movement -> no strike,
- a one-frame coordinate jump -> no strike after median speed filtering,
- invalid framing -> no emitted strike.

Synthetic traces prove detector logic, not real-world biomechanical accuracy.

## Field traces
Future real-device traces should contain only the Stage 10 numeric motion-trace format. Before a real trace is committed:
- remove anything not required by the schema,
- confirm no image/video/audio is present,
- label device/browser conditions,
- manually label expected strike count,
- keep field traces separate from synthetic tests.

Real field traces are required before tuning thresholds more aggressively.
