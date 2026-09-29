# BodyPath v0.11.50

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
