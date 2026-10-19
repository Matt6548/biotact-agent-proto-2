# Stage 12 — Mobile GPU budget

## Review finding
The Stage 11 UI created both the full Three.js candle and the mobile mini-target renderer at page load. Both render loops kept running even though the mini target was hidden until live camera use.

That wastes GPU time and battery on mobile and keeps an unnecessary second render loop alive on desktop.

## Change
- The mini Three.js target is now created lazily only when a live camera is running at <=600 px.
- During mobile live training the full target render loop is paused.
- The mobile mini target uses a 1× pixel-ratio cap and disables OrbitControls.
- When the camera stops or the viewport leaves mobile width, the mini renderer is disposed and the full target resumes.
- Both renderers pause when the page is hidden.
- The full target caps pixel ratio at 1.4 on mobile before live training.

## Acceptance
The fake-camera matrix now runs both Desktop Chrome and Pixel 7:
- desktop: renderer mode must be `full`, no mini canvas is created;
- mobile camera: renderer mode must be `mini`, exactly one mini canvas is created;
- both must still initialize the self-hosted Pose Landmarker with zero observed third-party HTTP(S) requests.
