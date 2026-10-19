# Stage 10.1 — Closed-loop motion trace

The field-test path is now closed-loop:

1. record numeric pose trace,
2. automatically close it if camera stops,
3. export JSON,
4. import the same JSON later,
5. restore its detector calibration profile when present,
6. replay the frames through the exact same `LiveTrainingAnalyzer`,
7. report how many strike events were detected.

Replay is accelerated 4× for practical tuning. It never reconstructs or stores camera imagery.

This makes threshold regressions reproducible: a detector change can be evaluated against the same real-device numeric trace instead of asking the user to repeat the movement every time.
