# Stage 19 — Field-trace privacy truth

## Review finding
The trace design is privacy-preserving compared with saving camera footage, but "anonymous trace" is too strong a claim. A numeric body-motion sequence can still reveal personal movement characteristics and should be treated as sensitive user data.

## Product truth
Field traces:
- never contain camera frames, video or audio;
- do not automatically contain name, account id or location;
- are not uploaded by the app;
- remain in the current browser tab unless the user explicitly exports a JSON file;
- can still be sensitive movement data.

## Controls
The Field test data section now provides **Clear trace**:
- stops an active recording if necessary;
- clears in-memory recorded frames;
- clears an imported replay trace;
- resets the file input and export/replay controls.

Starting a new trace also replaces the previous in-memory recording.

## Wording rule
Do not call motion traces "anonymous" or "non-identifying". Use:
**privacy-safe numeric trace without raw camera/audio**, followed by the sensitive-motion-data caveat.
