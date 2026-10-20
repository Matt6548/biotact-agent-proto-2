# Stage 23.1 — Time-window device sampling

The first Stage 23 browser acceptance exposed a sampling-design problem rather than a pose-runtime failure.

A hard requirement of 30 processed samples assumed roughly real-time camera throughput. The fake camera in CI can process substantially fewer frames per second, so a healthy runtime could remain in `Collecting…` until the test timeout.

The fix keeps the diagnostic conservative while making it device-rate independent:
- at least 10 valid performance samples;
- those samples must span at least 1.5 seconds;
- only then is Ready / Constrained / Limited evaluated.

This is preferable to simply extending the browser timeout or lowering the test assertion because the product itself now has a clearer observation contract across fast GPU and slow CPU devices.
