# Skill Tree v0.10.8

## Workout redesign
- Workout screen is locked to one viewport: no vertical scrolling during the active training screen.
- The three separate live goal cards were replaced with one sliding milestone rail.
- The rail combines the next reachable milestones for the active push-up variant and sorts them by how many session reps are still needed.
- When a milestone is reached, its emblem moves to the completed position on the left and the next milestones advance.
- The text above the rail always shows the exact remaining reps to the nearest milestone.
- Variant confirmation is now the single **Training starten** action.
- Camera and face detection start from that same click. As soon as the top position is stable, the 3-second countdown starts automatically.
- No second countdown/start button is required.
- If calibration fails, automatic countdown is re-armed once the user is positioned correctly again.
- Camera retry and manual mode remain available as fallbacks.

## Performance / existing behavior
- v0.10.6 Android scroll/render fixes are retained.
- v0.10.7 rank material/completion styling is retained.
- Push-up counting thresholds and core Quick Mode detection logic were not changed.
