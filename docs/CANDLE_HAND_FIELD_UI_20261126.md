# BOSH — isolated Hand CPU field UI candidate

Baseline a5ed26514eead3f72a997350d0a066a06ed7525b. Reuse the same existing candle scene and FreePracticeCameraController, with explicit compile-time VITE_CANDLE_HAND_FIELD=1 only in isolated QA. Default app remains Pose; no query activation, no automatic fallback to old Pose in field mode. Hand CPU is conservative default. No second camera or canvas.

Adapt status and metrics to hand-only analyzer instead of assuming Pose wrist metrics. Do not label visual direction as anatomical handedness. Keep single start/pause/resume/stop and optional camera inspection. Disable Pose trace recording/import/replay/export in field mode; only aggregate device report available on explicit action. No camera permission before click, no registration/rounds.

CI: normal build, then verified same-origin Hand assets, isolated build, actual model fake-camera start/pause/resume/stop and browser egress checks. Fake camera cannot establish human gesture accuracy or reaction latency. Do not publish this field build until scoped CI and privacy gates are reviewed. No production deployment. Pose migration separately assigned on PR #13.
