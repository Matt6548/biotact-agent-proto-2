# Stage 25.2 — First-run onboarding hardening

ShapeUI onboarding/hardening review was applied against the committed product brief and Stage 25 screenshots.

## Changes
- The full mission briefing remains mandatory before the **first** training session.
- Once completed, it is persisted locally and is not shown again on reload.
- Returning players go directly to the arena; chapter/mission context remains inside the game.
- The safety reminder remains visible beside the camera during every session.
- The first-run dialog moves keyboard focus to the player-name field.
- The background training UI is inert while the required briefing is active.
- Body scrolling is locked while the briefing is open; the briefing itself remains scrollable.
- After acceptance, focus moves to the real Start training action.
- The decorative eyebrow above the heading was removed.
- The three setup concepts are now a compact ordered sequence rather than three equal cards.

## Profile persistence
Local player profile schema is now v2 and records:
- original creation timestamp;
- first briefing acceptance timestamp;
- first safety acknowledgement timestamp;
- explicit onlineAccount=false.

This still is not an online registration account.

## Acceptance
Browser acceptance now proves:
1. first visit cannot enter without valid name + safety acknowledgement;
2. the game explanation and no-real-flame guidance are visible;
3. after acceptance the arena opens;
4. reload skips the full first-run briefing and preserves the local player name.

Unit tests verify briefing completion semantics and preservation of the original profile creation time.
