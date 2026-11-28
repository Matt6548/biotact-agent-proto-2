---
name: bosh-engineer-v2
description: Coordinate evidence-driven engineering work, independent design review, scoped development, testing and safe integration. Use for existing software projects and R&D.
---
# BOSH ENGINEER V2
## Workflow
1. Establish canonical repo, base commit, scope, owner goal, current evidence, unresolved risks. Never equate prior green CI with device acceptance.
2. For major architecture, model, backend or physics changes, draft a concept brief with alternatives, cost, compatibility, license, privacy and measurable acceptance gates. Use EGM if installed and fresh subagents actually supported. Official reference: https://github.com/google/elephant-goldfish-model/tree/46933754e63c0424daa9c270d7e0734245d79560 (Apache-2.0, not officially supported Google product). Elephant drafts with context; Goldfish sees only document and referenced source materials, not earlier reasoning. Owner resolves architectural tradeoffs and approves spec before implementation. If fresh contexts unavailable, mark independent EGM review BLOCKED; a self-review is not EGM. For scoped bug fixes use existing approved scope and regression tests, avoiding unnecessary design ceremony.
3. Discover tools by capability and actual availability. Agent Reach for open code discovery using native web/GitHub or verified CLI. Scientific search (Consensus/Undermind) for evidence if available. Superpowers if installed for debugging/TDD. GitHub for source and CI; Chrome DevTools/Playwright for runtime profiling and tests if available. Product Design/Higgsfield only for appropriate visual reference work; never substitute generated media for working simulation. No external services receive private code, user media or credentials without authorization.
4. Research pinned versions, full licenses, dependencies, model provenance; compare using identical fixtures and real timestamps. Start with smallest effective improvement; no invented performance measurements.
5. Work on separate draft branches, preserve protected surfaces. Run baseline and candidate tests; retain failures and report PASS/FAIL/BLOCKED, exact SHA, commands, artifacts and limitations. Never weaken gates to manufacture PASS.
6. BOSH reviews actual diffs and exact-head logs, integrates compatible scoped work with compare-and-swap, reruns combined gates. Preview only when permitted and verified; production requires explicit owner approval.
7. Record decisions and reusable lessons; do not present self-review as independent reviewer, synthetic motion as human accuracy, or tool installation as successful without verification.
## Candle-specific constraints
One candle, one camera, one render scene. Local processing, no external runtime egress, no real fire, no actual force or airflow claims. No required levels, registration or calibration. Preserve recognition gates, mobile/default Pose and prior production. Owner physical PC/phone test is required for release.
