# BodyPath v0.11.66 — One Main Path + Shortcuts

- 25 numbered Journey levels including Wood (4), Stone (9), Bronze (16) and Silver (25) as playable rank-up levels. Each level has up to three stars; the special rank levels have three *alternative* stars and any one awards the rank.
- Main path is a single serpentine route with small optional shortcut lines, **not ladders**.
- 4 explicit shortcut challenges: Direct Start (Start→4), Knee (5→9), Wide (12→16), Pike (20→24). They unlock destinations but do not automatically complete skipped levels or award stars.
- Standard, Incline, Knee, Wide, Pike and mixed-variant goals; new Silver rank and Pike activities.
- Free Workout is still separate: Daily/Weekly/history/records/XP accrue, but not Journey stars or shortcuts.
- Journey progress uses dedicated `journeyLevelStars66`, `journeyRankMasks66`, `journeyLevelTotals66` and `journeyShortcuts66`; existing v0.11.65 progress is **preserved** separately. Verified v0.11.65 achievements are migrated only when the new objective is demonstrably equivalent or easier; other old levels remain uncompleted. Legacy rank access and Find Your Level placement remain available. Export a backup first.
- The existing frontal camera and manual counter are retained. A mixed-variant objective requires switching variants between sets; form cannot be verified by the current face tracker.

Deploy: copy the contents of this folder to the GitHub Pages site root (not the containing folder). Replace `app.js`, `style.css`, `index.html` and the assets as necessary. Version query strings are `?v=0.11.66`.
