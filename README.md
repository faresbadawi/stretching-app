# Dehnen – Stretching-PWA

Kurzes Dehnprogramm (ca. 10 Minuten, dreimal pro Woche) für Rücken und Beweglichkeit.
Reines HTML/CSS/JavaScript, kein Build-Schritt, komplett offline nutzbar.

## Lokal ausprobieren

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen. (Service Worker laufen nur über `localhost` oder HTTPS, nicht über `file://`.)

## Funktionen

- **Bibliothek:** alle Übungen mit Suche, Kategorien, Favoriten; eigene Übungen mit Foto anlegen, bearbeiten und löschen (auch die mitgelieferten, sie lassen sich wiederherstellen).
- **Programme:** beliebig viele Trainings aus der Bibliothek zusammenstellen (Reihenfolge, Zeit pro Übung, Pause).
- **Training:** Kreis-Timer, Bild der Übung oberhalb, Vorschau, Glockenklänge, Countdown, Sprachansagen, Vibration, Bildschirm bleibt an.
- **Statistik:** Wochenziel, Wochen-Serie, Verlauf.
- **Optionen:** Ton, Lautstärke, Design (hell/dunkel), Farbe, Sicherung und Wiederherstellung der eigenen Daten.

Eigene Übungen, Fotos und Programme liegen im Browser des jeweiligen Geräts (localStorage). Über „Optionen → Sichern“ lässt sich eine Datei erzeugen und auf einem anderen Gerät einspielen.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html`, `css/style.css` | Gerüst und Design |
| `js/app.js`, `js/views.js`, `js/training.js` | Start, Programme, Bibliothek, Optionen, Training |
| `js/store.js`, `js/sound.js`, `js/ui.js` | Daten, Signale/Sprache, Hilfsfunktionen |
| `data/exercises.json` | Übungen (Name, Beschreibung, Schritte, Bilder je Variante) |
| `images/man/` | Übungsbilder (Männer-Figuren, WebP) |
| `manifest.webmanifest`, `icons/` | PWA-Manifest und App-Icons |
| `sw.js` | Service Worker (Offline-Cache) |
| `tools/update-sw.mjs` | Trägt Dateiliste und Cache-Version in `sw.js` ein |
| `js/notifications.js` | Platzhalter für spätere Push-Benachrichtigungen |

## Sprachansagen

Vier kurze Clips (`audio/voice/*.mp3`: „Mach dich bereit“, „Pause“, „Seitenwechsel“, „Training geschafft“), erzeugt mit dem Programm Piper und der deutschen Stimme „Thorsten“ (`de_DE-thorsten-medium`, Lizenz CC0). Übungsnamen werden nicht angesagt.

## Weitere Bildvariante ergänzen (optional)

Die Daten sind dafür vorbereitet, in der Oberfläche gibt es aktuell aber nur eine Variante.

1. Bilder nach `images/<variante>/` legen, gleiche Dateinamen wie in `images/man/`.
2. In `data/exercises.json` unter `variants` den Schlüssel ergänzen und bei jeder Übung unter `images` den Pfad eintragen.
3. In `js/views.js` bei „Darstellung“ eine Auswahl für `variant` ergänzen und `node tools/update-sw.mjs` ausführen.

## Übungen ändern / ergänzen

Neuen Eintrag in `data/exercises.json` anlegen (`id` = Dateiname ohne Endung, `perSide: true` für einseitige Übungen, `defaultEnabled` steuert, ob sie im Standardprogramm sind). Danach `node tools/update-sw.mjs`.

## Veröffentlichen auf GitHub Pages

Vor **jedem** Veröffentlichen:

```bash
node tools/update-sw.mjs
```

Das aktualisiert die Cache-Version, sonst bekommen installierte Apps Änderungen nicht mit.

1. Auf github.com ein neues **öffentliches** Repository anlegen (z. B. `stretching-app`), ohne README/Lizenz.
2. Im Projektordner:
   ```bash
   git add -A
   git commit -m "Stretching-PWA"
   git branch -M main
   git remote add origin https://github.com/<DEIN-NAME>/stretching-app.git
   git push -u origin main
   ```
3. Im Repository: **Settings → Pages → Build and deployment → Source: „Deploy from a branch“**, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ca. 1 Minute ist die App erreichbar unter `https://<DEIN-NAME>.github.io/stretching-app/`.

Alle Pfade sind relativ, die App funktioniert daher im Unterordner von GitHub Pages.

## Auf dem Handy installieren

- **iPhone/iPad:** Link in **Safari** öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.
- **Android:** Link in **Chrome** öffnen → Menü (⋮) → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.

Einmal online öffnen, danach läuft die App auch ohne Internet.

Hinweis iPhone: Der Ton wird vom Stummschalter (Seitenschalter) unterdrückt. Für die Signale also auf „laut“ stellen.

## Push-Benachrichtigungen (später)

Bewusst noch nicht eingebaut. Vorbereitet sind `js/notifications.js` (Ablauf als Kommentar), die auskommentierten `push`/`notificationclick`-Handler in `sw.js` und das Feld `reminders` in den Einstellungen. Für echte Pushes wird zusätzlich ein kleiner Server (oder Cloudflare Worker) benötigt; auf dem iPhone funktionieren Pushes nur für die installierte App (ab iOS 16.4).
