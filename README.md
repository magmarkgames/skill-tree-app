# Skill Tree App v0.10.6

Auf Basis von v0.10.2 mit dem nächsten Design-Pass.

## Neu in v0.10.3
- Skill Tree nutzt jetzt den kompletten restlichen Bildschirm unter der Kopfzeile.
- Die vier Fortschrittswerte sind nicht mehr dauerhaft über dem Tree sichtbar.
- Neuer **Stats-Button** oben rechts öffnet Rang, Rekord, Heute, 7 Tage und Gesamt.
- Skill-Tree-Legende und Hinweistext wurden entfernt.
- Home Screen auf das helle Blau/Weiß-Design umgestellt.
- Übungs- und Varianten-Auswahl im Training ebenfalls hell gestaltet.
- Der eigentliche Workout-/Kamera-Bildschirm bleibt bewusst dunkel für guten Kontrast.

## Hochladen
Lade weiterhin **alle Dateien aus diesem Ordner gemeinsam in den Hauptordner deines GitHub-Repositories**.

Dazu gehören:
- `index.html`
- `style.css`
- `app.js`
- alle `variant-*.png`
- alle `metric-*.png`
- alle `rank-*.png`

Die PNG-Dateien müssen auf derselben Ebene wie `index.html` liegen.

## v0.10.4 Performance
- Bild-Assets auf passende mobile Auflösungen verkleinert und als WebP gespeichert.
- Skill Tree wird erst gerendert, wenn er tatsächlich geöffnet wird.
- Verdeckte History/Tree-Ansichten werden nicht mehr bei jedem allgemeinen Render neu aufgebaut.
- Teure Drop-Shadow/Blur/Grayscale-Filter und Tree-Eintrittsanimationen reduziert.
- Lazy/async Decoding für Bild-Assets aktiviert.


## v0.10.6 Responsive Skill Tree
- Horizontales Scrollen im Haupt-Skill-Tree entfernt.
- Der Tree nutzt jetzt fünf responsive Spalten und passt vollständig in die Displaybreite.
- Es wird ausschließlich vertikal gescrollt.
- Knoten skalieren automatisch je nach Bildschirmbreite.
- Rang-Knoten bleiben etwas größer, da sie allein in ihrer Reihe stehen.
- Verbindungslinien werden anhand der tatsächlichen responsiven Knotengrößen berechnet.
