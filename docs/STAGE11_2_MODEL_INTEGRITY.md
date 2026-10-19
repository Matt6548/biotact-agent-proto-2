# Stage 11.2 — Model integrity and dependency lock capture

The versioned Pose Landmarker Lite file used by the successful Stage 11.1 build has:

`SHA-256 59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`

The asset-preparation script now refuses to build if the downloaded model does not match this digest.

CI also uploads:
- the generated `package-lock.json`,
- model provenance with source URL/hash,
- browser QA evidence.

The next checkpoint commits that lockfile and switches CI to `npm ci` for deterministic dependency resolution.
