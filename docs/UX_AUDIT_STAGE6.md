# UX audit — Stage 6 Training Arena

Audit date: 2026-10-19  
Evidence: fresh desktop + Pixel-class Chromium screenshots from GitHub Actions rerun.

## User goal
Set up camera training quickly, perform a short controlled punching drill, perceive the virtual candle reaction immediately, and understand the result without reading an engineering dashboard.

## What is working
- The product concept is immediately understandable: camera on the left, reactive candle on the right.
- The Three.js target is clearly visible in both desktop and mobile captures.
- The dark training-room visual direction is coherent and restrained.
- Primary buttons are large enough for touch use.
- Mobile has no horizontal overflow.
- The simulation visibly changes the flame and score.

## Highest-impact problems

### 1. Competing starts
The screen presents both `Start 5-strike round` and `Start camera` before setup is complete. The correct order is not obvious.

**Decision:** replace them with one stateful primary action:
`Start training -> Calibrate -> Start 5-strike round -> Repeat round`.

### 2. Mobile loses the target during the actual movement
On a phone the camera view and the candle are separated vertically. A trainee facing the camera cannot see the flame reaction without scrolling.

**Decision:** render a small synchronized 3D candle inside the live camera stage on narrow screens while retaining the full target below for inspection.

### 3. Engineering metrics lead the experience
Quality/FPS/wrist speeds are useful diagnostics, but they occupy primary space before the user has even started.

**Decision:** keep only a compact readiness line in the main flow. Move raw tracking values into an expandable `Tracking details` section.

### 4. Result feedback is too quiet
The flame reacts, but score/result text is visually small compared with the movement itself.

**Decision:** add a short in-scene result cue such as `74 · Strong instability` immediately after a detected strike.

## Accessibility risks visible in screenshots
- Some small secondary text used roughly #777a71 on #151612, about 4.16:1 contrast, below the 4.5:1 target for ordinary text.
- The optional 3D orbit interaction is pointer-led. Core training must not depend on rotating the candle.
- Motion feedback needs a reduced-motion fallback.

## Stage 7 acceptance
- One primary setup/training action.
- Mobile can see a synchronized target while looking at camera view.
- Raw diagnostics no longer dominate the initial screen.
- Strike result appears immediately in the camera/arena context.
- Small secondary text meets normal-text contrast target.
- Browser QA completes an entire simulated 5-strike round and reaches the summary.
