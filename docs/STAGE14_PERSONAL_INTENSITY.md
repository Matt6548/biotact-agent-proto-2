# Stage 14 — Personal-reference intensity

## Review finding
Personal calibration previously changed strike-detection thresholds but did not change the virtual candle response. Live gameplay still mapped raw camera wrist speed directly into the airflow model.

That creates an avoidable device/viewpoint bias: two cameras can estimate different absolute wrist speeds for similar movement.

## New mapping
After successful calibration:

`intensity ratio = detected peak speed / personal calibration peak`

and:

`training speed = clamp(ratio, 0..2) × 6`

Interpretation:
- `1.00×` = the user's comfortable calibration reference,
- `1.50×` = 50% above that camera/session reference,
- `2.00×` = game cap.

This ratio drives the deterministic candle model. Raw MediaPipe world-coordinate speed remains available only under Tracking details and in field-test traces.

If no personal profile exists (engineering simulation), the old deterministic mapping is preserved so QA fixtures stay comparable.

## Why
This is an engineering normalization, not a claim that effort or physiological intensity is measured perfectly. It reduces dependence on raw monocular-camera scale and keeps progression primarily within-user.

Related markerless training literature uses normalized kinematic features for cross-subject consistency and individualized feedback, but our mapping still requires field validation before being called scientifically calibrated.
