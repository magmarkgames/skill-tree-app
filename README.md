# BodyPath v0.11.63 — Connected Journey

## New in this version
- Redesigned, more compact mobile layout from START to Bronze.
- Direct access to the first Standard Push-Up, without the oversized left-side shortcut.
- Optional Wall/Incline learner route zigzags toward that same Standard Push-Up goal.
- Knee route now reconnects at H3/H4 (Stone finalists) after K2.
- Wide route now reconnects at S5/S6 (Bronze finalists) after W2.
- Power and Volume paths are still independently valid.
- Standard rank goals remain the same: Wood = 1 in a set, Stone = 3 in a set OR 15 Standard total, Bronze = 10 in a set OR 100 Standard total.
- All existing 19 levels / 57 possible stars, their objectives, training histories, and local progress format remain unchanged.
- Keeps the white minimal SVG exercise icons and gold stars from v0.11.62.

## Deployment on GitHub Pages
Unzip the download and upload the **contents** of the `BodyPath-v0.11.63` directory to your existing GitHub Pages repository, replacing the previous app files. In particular replace `app.js`, `style.css`, and `index.html` together; keep all included SVG/WebP assets.

`index.html` now references `?v=0.11.63` to help refresh browser caches. If the old UI persists, reload the page.

**Do not press the app's “Testdaten löschen” button** unless you actually intend to reset locally stored test progress. Uploading the new version does not intentionally clear the browser's existing training data.

## Tests
- JavaScript syntax check.
- Graph, rank, variant bypass, and star regression checks.
- Browser rendering checked at 390 × 844 with 19 nodes and 30 connections; clicking the first Standard challenge opens its detail panel.
- Browser checks for Knee II → H3/H4 and Wide II → S5/S6 unlocks passed.

Note: The camera-based workout flow has not been physically exercised on a phone for this release.
