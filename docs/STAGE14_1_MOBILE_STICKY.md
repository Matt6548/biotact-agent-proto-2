# Stage 14.1 — Mobile sticky state review

Fresh Stage 14 screenshots showed the mobile arena bar behaving as sticky even when the camera was off. In long/full-page captures it could visually cover result content and leave an awkward gap near the top.

The arena status is now:
- normal document flow when camera is off,
- sticky only while live camera training is active,
- restored to normal flow immediately when the camera stops or fails.

The mobile smoke test asserts non-sticky initial state; the Pixel 7 fake-camera test asserts sticky live state.
