# BodyPath v0.11.60 — Journey Start → Bronze

## What changed
- **11 small circular goals**, plus Start and the larger Wood, Stone and Bronze circles.
- Goal states: green = completed, yellow = available, gray = locked. A completed goal turns the outgoing connections green, even before the next goal is complete.
- Exercise category is marked in the inner circle: **Power** (red) or **Volume** (blue).
- Two alternative, interconnected paths. **Either final Power OR final Volume goal awards the next rank**; the unused path remains available.
- **Start → Wood:** 1 Standard Push-Up in a set.
- **Wood → Stone:** Power 2 → 3 in a set; Volume 5 → 15 Standard Push-Ups overall.
- **Stone → Bronze:** Power 5 → 7 → 10 in a set; Volume 30 → 60 → 100 Standard Push-Ups overall.
- No outdated challenge trials gate these ranks anymore. Previously recorded training contributes immediately; all eleven goals remain visible.
- Home next-rank panel and in-training milestones follow the new goals.
- The display is a single vertically scrollable tree without nested rank-chapter boxes.

## Data migration / limitations
- Existing browser storage key (`skillTreeAppProgressV010`), workout history, XP, cosmetic selections, and backups remain compatible.
- `journeyStandardTotal` is a new persisted counter, **derived from identified Standard sets in saved history** on first load, then incremented on every newly saved Standard set. This avoids a preexisting bug where the old `variantStats.standard.total` could include Wall and other variants.
- The old app caps stored history at 200 sessions. Where older Standard sessions have already fallen outside those 200 sessions, their individual counts cannot be reconstructed reliably, so migrated historical Volume may be undercounted. Future Standard repetitions are tracked cumulatively.
- Other variants remain available in the existing training alpha; they do not count toward the new Standard-specific Journey.
- Later ranks are intentionally not part of this iteration.

## Local usage
Open `index.html` as before (or deploy all active files to the same directory). `app.js` and `style.css` are cache-busted at `v0.11.60`.

---

# BodyPath v0.11.53

## Neu
- Skill-Tree-Knoten als reduzierte Hexagons mit Variantensymbol
- nur drei Zustände: Gesperrt, Aktiv, Abgeschlossen
- kleine Fortschrittsleiste direkt unter jedem Knoten mit aktuellem Fortschritt / Ziel
- Fortschrittsbreite wird pro Ziel automatisch berechnet
- Wall, Incline, Standard, Wide, Military, Diamond und Decline erhalten eigene Farben und Symbole
- Gesamt-Ziele erhalten ein neutrales Summen-Symbol
- Symbole sind als sehr kleine Inline-SVGs umgesetzt; keine zusätzlichen Bilddateien nötig
- Klick auf einen Knoten zeigt weiterhin Detailinformationen


## v0.11.40
- Neuer BodyPath-Header auf der Startseite: das Logo nutzt jetzt das ausgeschnittene quadratische Icon der neuen Marke.
- Schriftzug oben links von „Power Push“ auf „BodyPath“ umgestellt, mit blauem Farbverlauf auf „Path“.
- Einstellungen-Symbol auf der Startseite entfernt, damit der Mond im Header frei sichtbar bleibt.
- Home-Header gestrafft: der Skill-Tree-Bereich sitzt nun deutlich höher, sodass direkt mehr von der App sichtbar ist.
- Benachrichtigungsglocke auf der Startseite entfernt; übrig bleibt nur die Einstellungen-Aktion.
- Neuer Home-Header mit generiertem Indigo-Night-Motiv.
- Profil-Toggle für männliche/weibliche Hintergrundperson.
- Auswahl wird lokal gespeichert und in Backups übernommen.


## v0.11.44 — Discovery Tree prototype

- Focuses the playable progression on Starter → Wood → Stone → Bronze.
- Variant totals are now independent milestones (Standard, Wide, Diamond).
- Wide and Diamond are real unlock rewards and stay hidden in Training until earned.
- The next major skill and next rank remain visible, while intermediate nodes reveal one at a time as `?` nodes.
- Experienced users with an existing Standard Push-Up automatically receive credit for the starter fundamentals.
- Home shows only the current revealed goal and the next major reward, so it does not spoil hidden nodes.
- Training milestone rail now follows the same variant-specific targets as the new tree.


## v0.11.50 — Fixed modular tree

- Rebuilt Starter → Wood → Stone → Bronze as a strict row-based module system.
- Nodes are no longer freely positioned; Single, Split, Reward, and Rank rows live in normal document flow, so they cannot overlap.
- Unlock order: Wall → Incline → Standard → Wide.
- Future task rows stay hidden as `?`, while the next skill reward and next rank remain visible.
- Variant totals remain variant-specific.
- Added a small Diamond/Silver teaser after Bronze.
- Updated cache-busting to v0.11.50.


## v0.11.53 — Micro progression + 3-node rows

- More, smaller milestones from Start through Bronze.
- Progress types are deliberately mixed so the next reveal is less predictable.
- Added mandatory 3-node rows to keep the tree compact without losing milestones.
- Wall phases out after Wood/Stone, Incline after Stone/Bronze; Standard remains a recurring baseline.
- Added variant-specific set milestones and mixed-workout milestones.
- Three-node rows use the same visible branching language as two-node rows.
- Checkmarks now reflect the real node value only.

## v0.11.56
- Account level + XP system (Push-Up alpha)
- Every rep awards XP with variant difficulty multipliers (Wall < Standard < Pike etc.)
- Level-up rewards unlock profile pictures, accent colors and Home backgrounds
- Home hero now shows account name, level, rank and XP progress
- Profile customization UI for avatar, app accent and background
- Workout completion shows earned XP, level-ups and cosmetic unlocks
