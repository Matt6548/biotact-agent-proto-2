# Stage 25.3 — Mobile live QA captures the viewport

Stage 25.2 functionality passed every mobile camera assertion, but the final full-page screenshot began near the 45-second total test boundary.

For the live-focus acceptance surface, a full-page capture is the wrong artifact anyway: the user experiences one camera viewport while the rest of the product is intentionally hidden.

The QA capture is now a viewport screenshot:
- all camera, framing, mini-target, sticky status and Stop camera assertions remain unchanged;
- no product timeout or assertion is weakened;
- the evidence now matches the actual mobile live-training view;
- full-page screenshots remain in smoke/onboarding flows where page composition matters.
