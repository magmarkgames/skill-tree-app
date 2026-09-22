# Skill Tree App v0.10.9

## Neu: Multi-Set Push-up Workouts

- Im Trainingsmenü wird nur noch die Hauptkategorie **Push-ups** gewählt.
- Die Push-up-Variante wird **innerhalb des Workouts** gewählt.
- Unterstützte Varianten: Standard, Wide, Diamond, Pike, Incline, Decline.
- Nach der Variantenwahl startet Kamera + Positionserkennung; sobald die obere Position stabil erkannt wird, startet automatisch der 3-Sekunden-Countdown.
- Ein Workout kann jetzt aus **mehreren Sets** bestehen.
- Wenn während eines laufenden Sets das Gesicht länger als ca. 1,7 Sekunden durchgehend nicht erkannt wird (und bereits mindestens 1 Wiederholung erkannt wurde), wird das Set automatisch beendet und die Pause gestartet.
- Kurzes Verschwinden des Gesichts in der tiefen Push-up-Position bleibt weiterhin Teil der Wiederholung und beendet das Set nicht.
- Zwischen Sets läuft ein **Pausentimer hoch**. Pausenziele 30 / 60 / 90 Sekunden oder frei sind auswählbar; das Ziel erzwingt keinen Neustart.
- Während der Pause kann direkt die nächste Push-up-Variante gewählt werden.
- Sobald man wieder in der oberen Position ist, startet der nächste 3-Sekunden-Countdown automatisch.
- Die aktive Trainingszeit wurde aus dem Workout-Screen entfernt.
- Die Meilensteinleiste berücksichtigt jetzt auch mehrere Sets innerhalb desselben Workouts.
- Beim Beenden wird das Workout als eine Einheit mit allen Sets gespeichert.
- Die Workout-Historie unterstützt neue Multi-Set-Einträge; alte Einträge bleiben kompatibel.

## Sicherheits-Fallback

Während eines aktiven Sets gibt es zusätzlich **Set pausieren**. Damit kann ein Set manuell abgeschlossen werden, falls die automatische Gesicht-aus-dem-Bild-Erkennung in einer besonderen Kameraposition nicht auslöst.
