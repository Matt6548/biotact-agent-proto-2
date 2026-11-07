# Stage 26 — Secure online backend contract

## Purpose
Prepare real registration + global ranking without pretending that localStorage is an online account and without uploading sensitive motion trajectories just to rank players.

This stage does **not** activate Firebase or create a cloud project. It makes the repository ready for a provider connection.

## Provider-neutral ranked flow
1. Authenticated, verified player requests a ranked round from a same-origin backend.
2. Server issues a short-lived `roundId` / challenge nonce.
3. Client completes a five-strike round.
4. Client submits only five quality-passed aggregate attempt records:
   - hand;
   - normalized personal intensity ratio (0–2×);
   - straightness (0–1);
   - relative attempt timestamp;
   - quality gate boolean.
5. Client never submits a final score.
6. Trusted server code validates the challenge and recomputes each strike using the shared deterministic Candle core.
7. Only the server writes the ranked receipt and public leaderboard record.

## Privacy boundary
Ranked payload explicitly rejects:
- raw MediaPipe landmarks;
- world landmarks;
- motion-trace frames;
- video / image / audio;
- device report;
- peak/raw wrist speed;
- client-computed score.

This keeps the leaderboard data model separate from sensitive motion traces.

## Anti-cheat boundary
This prevents easy score tampering and direct database writes. It does **not** make a browser game cryptographically cheat-proof: a determined attacker can fabricate plausible aggregate motion features. Stronger proof would require more trusted sensor/server evidence and would increase privacy/cost complexity.

The intended first online leaderboard is therefore a server-validated casual competition, not an esports-grade anti-cheat claim.

## Firestore security model
Committed `firestore.rules` is fail-closed:
- private player record: owner can read, client cannot write;
- public leaderboard: client can read, never write;
- ranked receipt: authenticated owner can read their own, never write;
- all other paths deny read/write.

Trusted server/Admin code performs writes. Firebase server client libraries bypass Firestore Rules, so IAM and function authorization remain mandatory.

## Hosting
`firebase.json` prepares Firebase Hosting with:
- `dist` output;
- SPA fallback;
- the same CSP / camera Permissions Policy / COOP / COEP / CORP headers as Vercel, Netlify and the portable localhost server.

No Firebase project ID or credential is committed.

## Next activation stage
After a Firebase project is explicitly connected:
- enable Firebase Authentication;
- prefer Google and/or verified email/password;
- keep email-enumeration protection enabled;
- add App Check for the web app and monitor before enforcement;
- implement same-origin callable/API endpoints for account/session and ranked rounds;
- use emulator tests for Firestore Rules and backend functions in CI.

Current local camera/pose path stays local. Online account/rank traffic must never contain video or pose coordinates.
