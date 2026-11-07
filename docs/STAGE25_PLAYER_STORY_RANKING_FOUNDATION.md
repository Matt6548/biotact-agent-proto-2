# Stage 25 — Player shell, mandatory story briefing and ranked-mode security foundation

## Product change
Candle Strike now begins with a mandatory mission briefing before the training surface becomes interactive.

The briefing explains:
- this is camera-based movement training;
- the current system estimates visible motion against the player's own calibration;
- it does **not** measure real punch force;
- the first story chapter and mission;
- how framing, calibration and five-strike rounds work;
- the clear-space / no-real-flame safety rule;
- current local-processing/privacy boundary.

There is no skip/close action. The player must enter a valid name and confirm the safety rule.

## Story in the game
Story is not a detached lore page. Each training level maps to a chapter:
1. Flame Discipline — deflect;
2. Control the Disturbance — destabilize;
3. Extinguish;
4. Distance.

The current chapter, mission and short purpose stay directly above the arena and update with progression.

## Player profile
The current build stores only a local player name in the browser.

This is explicitly **not** represented as an online account. Online registration will be wired only after a real authentication backend is connected.

## Ranking
The UI now separates:
- local player identity;
- personal best from locally stored attempts;
- global rank (locked until secure backend).

The ranking policy fails closed. A global ranked submission must have:
- authenticated identity;
- verified identity;
- a server-validated receipt;
- a server round id and server score.

Client-only scores are not accepted as globally ranked results.

## Security direction
For the planned account/leaderboard backend:
- start Firestore/DB rules deny-by-default;
- user profile writes restricted to the authenticated owner;
- public leaderboard reads can be separate from private profile data;
- ranked scores should be minted/validated by a trusted server function;
- no motion landmarks or video should be uploaded just to support ranking;
- email enumeration protection / brute-force controls should be enabled if email-password auth is used.

## Acceptance
New unit tests cover player-name normalization/local-profile semantics and fail-closed ranked-submission policy.
Browser tests now complete the mandatory briefing before existing gameplay/camera/resilience acceptance, plus a dedicated briefing test verifies the required explanation and safety gate.
