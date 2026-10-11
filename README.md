# BodyPath v0.11.65 – Separate Journey & Free Workout

## New rules

- **Free Workout:** Daily / Weekly totals, personal records, history and XP still update. Free workouts **never grant Journey level stars or ranks**.
- **Journey:** Nodes show **level numbers** 1–17. Each is a replayable challenge with 1–3 gold stars. Only the challenge explicitly opened from a numbered node may earn stars for **that node**. A different or higher-level workout cannot mass-complete all earlier nodes.
- **Volume objectives** (5/15/30/60/100 Standard total): count **only reps accumulated during attempts launched for that exact level**. Partial attempts on that level are preserved. Free sessions and attempts on other levels don't count toward it.
- **Find Your Level:** button on the Journey opens optional Wood (1 Standard/set), Stone (3 Standard/set) or Bronze (10 Standard/set) placement checkpoints. Passing a checkpoint unlocks access to that rank/section; **no skipped levels are completed and no stars are awarded**. You can revisit any earlier level to collect its stars. Already granted higher checkpoint ranks cannot be lost.
- **Rank progression:** Wood after Journey A5, Stone after Journey H3 or H4, Bronze after Journey S5 or S6; or by explicitly passing the corresponding checkpoint. Free Workout cannot award a Journey rank. Knee/Wide variants still serve as alternative prerequisite routes to final levels.
- The training screen continues to display the large rep counter and three targets. For a Journey level these are its three star requirements; for Free Workout they are Daily, Weekly and the next personal-best target.
- The frontal face-framing indicator and original camera rep counter are unchanged. Pose/form scoring is still **not** provided.

## Existing users: important data handling

Local storage key remains `skillTreeAppProgressV010`; **all past workouts, history, personal records, XP, Daily/Weekly state and old saved Journey star entries remain in storage**.

However previous versions could give Journey credit automatically for Free Workouts, and they did not record which level was explicitly played. **Those old automatic stars cannot be reliably separated from genuine attempts.** v0.11.65 therefore starts a **new, independent Journey progress track** (`journeyLevelStars65`, `journeyLevelTotals65`, `journeyPlacementRank65`) without migrating the old automatic stars. The old `journeyStars` is *preserved in the backup but not counted*. No fitness statistics are reset. You can use the new Find Your Level checkpoints to reach your present ability without earning free stars. **Export a backup before deploying.**

## Deploy

Upload the contents of the `BodyPath-v0.11.65` folder to the existing GitHub Pages root, overwriting `app.js`, `style.css`, `index.html` and assets. Cache query strings in index.html use `?v=0.11.65`.
