# BodyPath v0.11.64 — Frontal Quick Setup

## New

- **Wall Push-Ups retired from the active app.** The Journey now contains 17 playable levels and 51 possible stars. Starter options are **First Incline → Incline Builder → First Standard**, or directly **First Standard**. Existing Wall history and old A1/A2 star records are retained in storage, but Wall is no longer selectable for new workouts.
- **Incline guidance** in the workout selection: a *higher*, stable hand support makes the exercise easier; lower it gradually.
- **Frontal training screen**: a mirrored live Front Camera preview, colored framing corners, actual face-detection bounding box, short status/hints, large current-set rep count, challenge target, and **three live Journey goals with progress bars**.
- The countdown and existing face-based repetition counter remain; hands-free quick start from a stable face position is still supported. An accessible **manual mode** stays available, including when camera initialization fails.
- A face leaving the image no longer automatically ends the set (to avoid unintended endings with a propped-up phone). Use **Pause** / **Finish** as needed.
- No fixed phone inclination, angle calibration, or setup wizard.

## Technical limits (important)

The new green/yellow/red camera status is a **face-framing aid**, not whole-body pose tracking or a reliable measure of push-up technique. The existing face-size-based rep-count algorithm has not been replaced with a new pose estimation model; frontal counting from a leaned-up camera **must be tested on a real phone** for different distances and exercises, especially Incline, Wide and Pike. No claim is made that this release scores execution depth, arm width, or form.

## Deploying

Upload the **contents** of the `BodyPath-v0.11.64` folder to the existing GitHub Pages repository, replacing previous files (at least `app.js`, `index.html`, `style.css` together). URLs in `index.html` use `?v=0.11.64` to avoid old caches. No new external assets are required beyond the packaged files.

The local-storage key is unchanged (`skillTreeAppProgressV010`), so your training history and unlocked stars stay intact. Export a backup before testing major changes. Never press the app's reset-test-data button unless you intend to reset local progress.

## Checks performed

- JavaScript syntax (`node --check`).
- Browser rendering on 390 × 844 and 360 × 720 viewports (using offline-injected assets because local networking was restricted).
- Browser logic assertions for the 17 Journey challenges / 51 stars, 3 live goal progress rows, Wall not being selectable, Incline remaining selectable, and fallback manual mode.
- No physical camera/rep-counter test was possible here. On-device confirmation is needed.
