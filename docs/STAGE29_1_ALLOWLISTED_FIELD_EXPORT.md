# Stage 29.1 — Allowlisted field-test export

The first Stage 29 unit test exposed a real privacy-design flaw: the pack builder copied the already-formed motion-trace object wholesale.

Even though the in-app recorder does not add identity fields, an evidence pack should not trust arbitrary object properties.

## Fix
The pack now reconstructs the embedded trace from an allowlist:
- timestamps and FPS;
- only the pose landmark indices used by training;
- only x/y/z/visibility numeric point values;
- only calibration baseline, peak and three detector thresholds;
- normalized ISO timestamps.

It does not copy arbitrary trace properties, arbitrary device-report properties or arbitrary round properties.

## Result
A caller cannot smuggle player name, user agent, account ID or unrelated metadata into the field-test export through extra object properties.

The pack still contains movement coordinates and therefore remains sensitive movement data requiring explicit export.
