# Candle V3 isolated Hand CPU preview

Source integration: e565418c20fc6c7f4e1279f498446eebba766399. Four workflows complete SUCCESS: 45865294487 (main), 45865294498 (Hand runtime), 45865294569 (Pose privacy), 45865294605 (field UI).

Only vercel.json build command and branch-only ignore override differ from tested source. Pinned Hand assets are prepared at build time, then normal Pose preparation plus Vite build with explicit VITE_CANDLE_HAND_FIELD=1. Existing headers unchanged. No production branch, domains, settings or protection changes. This branch is not to be merged. No real human motion accuracy/phone latency claim. Verify Vercel deployed SHA and actual runtime before field acceptance.
