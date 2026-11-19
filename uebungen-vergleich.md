# Übungen: Vergleich mit RepDB

> **Umgesetzt am 19.11.2026:** Alle 88 RepDB-Dehnübungen sind übernommen, auch die mit Band und Bank (in der App filterbar). Dazu kommen „Kinn-zurück-Halten“ und Beinheben, zusammen 90 Übungen. Schulterkreisen wurde durch das Nadelöhr ersetzt. Zehn fertige Programme stehen in `js/store.js` (`PRESETS`).

Stand der Analyse: 19.11.2026 · Quelle: RepDB Free Tier (`RepDB/exercise-dataset`, 708 Übungen, davon 88 mit `category: "stretching"`)

## 1. So ist der RepDB-Datensatz aufgebaut

| Punkt | Befund |
|---|---|
| Download | GitHub `github.com/RepDB/exercise-dataset`, Hugging Face `RepDB/exercise-dataset` oder ZIP `cdn.repdb.co/repdb-assets/site/repdb-free.zip` |
| Datei | `exercises.json` (2,6 MB, `schema_version: 3`, Feld `exercises[]`); auf Hugging Face zusätzlich als CSV/Parquet |
| Felder | `id`, `name_en/_de/_es`, `description_*`, `instructions_*` (Liste), `tips_*` (Liste), `category`, `force_type` (static/dynamic), `difficulty`, `equipment`, `body_part`, `primary_muscles`, `secondary_muscles`, `is_unilateral`, `is_bodyweight`, `images` |
| Bilder | `images/flat/<id>-main.webp` (statische Dehnung, 1 Bild) oder `<id>-start.webp` + `<id>-peak.webp` (Bewegung, 2 Bilder); WebP, 512 × 512 px |
| Stil | Flach illustriert, immer dieselbe männliche Figur (blaues Tanktop, dunkelblaue Shorts), hellblauer Hintergrund. 4 Stichproben geprüft, die Figur ist einheitlich. |
| Dehnübungen | `category == "stretching"`: 88 Übungen. 11 davon brauchen ein Band, 10 eine Hantelbank. |
| Deutsch | Ja, `name_de`, `description_de`, `instructions_de` und `tips_de`. Englisch und Spanisch sind auch dabei, **Arabisch nicht**. |
| Seitenwechsel | `is_unilateral: true` entspricht eurem `perSide: true` |

Beispiel (`neck-side-stretch`, deutsch): „Seitliche Nackendehnung“, 5 Schritte und 2 Tipps.

## 2. Bisherige Übungen und passende RepDB-Übungen

Die Dauer ist nicht pro Übung gespeichert, sondern pro Programm (Standard 30 s Übung, 10 s Pause, pro Übung änderbar). Die Tabelle braucht deshalb keine eigene Spalte für die Dauer.

| # | Meine bisherige Übung (Kategorie, Bild) | Passende RepDB-Dehnübung | Bemerkung |
|---|---|---|---|
| 1 | Nacken dehnen (Nacken, `nacken-dehnen.webp`) | `neck-side-stretch` – Seitliche Nackendehnung | Gleiche Übung, stehend dargestellt, Hand auf dem Kopf |
| 2 | Schulterkreisen (Schultern, `schulterkreisen.webp`) | **keine passende gefunden** | RepDB hat kein Schulterkreisen, weder bei den Dehn- noch bei den Kraftübungen. Möglichkeiten: Übung streichen, durch `thread-the-needle` (Nadelöhr) ersetzen oder als einzige Übung mit altem Bild behalten |
| 3 | Schulter-Stretch (Schultern) | `cross-body-shoulder-stretch` – Schulterdehnung über den Körper | Gleiche Übung |
| 4 | Brustöffnung (Arme) | `doorway-chest-stretch` – Türrahmen-Brustdehnung | Gleiche Übung. **Achtung:** Das RepDB-Bild zeigt eine aufrechte Figur mit angewinkelten Armen, ohne Türrahmen. Es wirkt wenig eindeutig und muss angeschaut werden |
| 5 | Katzen-Kuh-Dehnung (Rücken) | `cat-cow` – Katze-Kuh | Gleiche Übung. RepDB zeigt nur ein Bild (Vierfüßlerstand), nicht beide Positionen |
| 6 | Herabschauender Hund (Ganzkörper) | `downward-dog` – Herabschauender Hund | Identisch |
| 7 | Kobra Stretch (Rücken) | `cobra-stretch` – Kobra-Dehnung | Identisch |
| 8 | Rumpfdrehung (Rücken) | `seated-spinal-twist` – Sitzende Wirbelsäulendrehung | Gleiche Ausführung (sitzend, Bein überkreuzt) |
| 9 | Hüftbeuger Dehnung (Hüfte) | `kneeling-hip-flexor-stretch` – Kniende Hüftbeuger-Dehnung | Gleiche Übung (hinteres Knie am Boden). `low-lunge` wäre die Variante mit tieferem Ausfallschritt |
| 10 | Oberschenkelvorderseite (Beine) | `standing-quad-stretch` – Stehende Quadrizeps-Dehnung | Gleiche Übung |
| 11 | Wadendehnung (Beine) | `standing-calf-stretch` – Stehende Wadendehnung | Gleiche Übung |
| 12 | Beinheben (Beine, standardmäßig aus) | `lying-leg-raise` – Liegendes Beinheben | Keine Dehnung. In RepDB eine **Kraftübung** mit 2 Bildern (Start und Endposition). Passt inhaltlich, ist aber keine Dehnübung |
| 13 | Schmetterlingssitz (Hüfte) | `butterfly-stretch` – Schmetterlings-Dehnung | Identisch |
| 14 | Vorwärtsbeuge (Ganzkörper) | `standing-forward-fold` – Stehende Vorbeuge | Identisch |
| 15 | Seitbeuge (Ganzkörper) | `standing-side-bend` – Stehende Seitneige | Identisch |
| 16 | Kindspose (Entspannung) | `childs-pose` – Stellung des Kindes | Identisch |

**Ergebnis:** 14 von 16 Übungen haben eine direkte Entsprechung. Beinheben passt nur als Kraftübung, für Schulterkreisen gibt es nichts.

## 3. Vorschlag: 34 neue Übungen (zusammen 50)

Ausgewählt nach dem Schwerpunkt Büro und Sitzen: Rücken, Nacken, Hüfte, Beine. Alle ohne Geräte. Weggelassen habe ich Band- und Bank-Übungen, sehr fortgeschrittene oder riskante Positionen (Pflug mit Last auf der Halswirbelsäule, Standspagat, Kamel, Heldensitz) und reine Ruhehaltungen (Totenstellung, Berghaltung, Bequemer Sitz).

„2 Bilder“ heißt: Es ist eine Bewegung mit Start- und Endbild. Die App zeigt im Moment ein Bild pro Übung. Ich würde das Endbild nehmen oder zwischen beiden wechseln, das klären wir bei der Umsetzung.

### Rücken (8)
| RepDB-ID | Deutscher Name | Seiten | Bilder |
|---|---|---|---|
| `sphinx-pose` | Sphinx-Haltung | – | 1 |
| `supine-spinal-twist` | Liegende Wirbelsäulendrehung | je Seite | 1 |
| `thread-the-needle` | Nadelöhr-Drehung | je Seite | 1 |
| `puppy-pose` | Welpen-Haltung (Brustwirbelsäule, Schultern) | – | 1 |
| `knee-to-chest-stretch` | Knie-zur-Brust-Dehnung (unterer Rücken) | je Seite | 1 |
| `pilates-spine-stretch-forward` | Pilates Spine Stretch Forward | – | 2 |
| `pilates-roll-down` | Pilates Roll Down | – | 2 |
| `torso-twists` | Rumpfdrehungen (dynamisch) | – | 1 |

### Nacken (1)
| RepDB-ID | Deutscher Name | Seiten | Bilder |
|---|---|---|---|
| `chin-tuck-hold` | Kinn-zurück-Halten | – | 1 |

`chin-tuck-hold` ist in RepDB eine Kraftübung, gegen die typische Kopf-vor-Haltung am Bildschirm aber sehr sinnvoll. Mehr Nackenübungen gibt es in RepDB nicht.

### Hüfte (12)
| RepDB-ID | Deutscher Name | Seiten | Bilder |
|---|---|---|---|
| `90-90-hold` | 90/90-Sitz | je Seite | 1 |
| `90-90-switch` | 90/90-Wechsel | – | 2 |
| `pigeon-stretch` | Tauben-Dehnung | je Seite | 1 |
| `lizard-stretch` | Eidechsen-Dehnung | je Seite | 1 |
| `low-lunge` | Tiefer Ausfallschritt | je Seite | 1 |
| `half-kneeling-hip-flexor-rock` | Hüftbeuger-Wippen im Halbkniestand | je Seite | 2 |
| `frog-stretch` | Frosch-Dehnung | – | 1 |
| `garland-pose` | Girlanden-Haltung (tiefe Hocke) | – | 1 |
| `happy-baby` | Glückliches Baby | – | 1 |
| `reclined-butterfly` | Liegende Schmetterlings-Dehnung | – | 1 |
| `cow-face-pose` | Kuhgesicht-Haltung (Gesäß, Schultern) | je Seite | 1 |
| `worlds-greatest-stretch` | World's Greatest Stretch | je Seite | 2 |

### Beine (10)
| RepDB-ID | Deutscher Name | Seiten | Bilder |
|---|---|---|---|
| `seated-forward-fold` | Sitzende Vorbeuge | – | 1 |
| `head-to-knee-pose` | Kopf-zum-Knie-Haltung | je Seite | 1 |
| `wall-hamstring-stretch` | Hamstring-Dehnung an der Wand | je Seite | 1 |
| `pyramid-pose` | Pyramide | je Seite | 1 |
| `lying-quad-stretch` | Liegende Quadrizeps-Dehnung | je Seite | 1 |
| `standing-adductor-stretch` | Stehende Adduktoren-Dehnung | je Seite | 1 |
| `seated-straddle-stretch` | Sitzende Grätsche | – | 1 |
| `wide-legged-forward-fold` | Weite Vorbeuge im Stand | – | 1 |
| `legs-up-the-wall` | Beine an der Wand | – | 1 |
| `downward-dog-pedal` | Fersenwippen im herabschauenden Hund | – | 2 |

### Oberkörper und Büro-Ausgleich (3)
| RepDB-ID | Deutscher Name | Seiten | Bilder |
|---|---|---|---|
| `overhead-triceps-stretch` | Trizeps-Dehnung über Kopf | je Seite | 1 |
| `kneeling-wrist-stretch` | Kniende Handgelenkdehnung (Maus und Tastatur) | – | 1 |
| `triangle-pose` | Dreieckshaltung | je Seite | 1 |

**Ersatz, falls dir etwas nicht gefällt:** `cat-stretch`, `upward-dog`, `lean-back-90-90-hold`, `downward-dog-to-low-lunge`, `low-lunge-to-half-split`, `leg-swing-front-to-back`, `lateral-leg-swing`, `standing-forward-fold-to-half-lift`, `standing-side-bend-flow`, `thread-the-needle-flow`, `pilates-saw`, `pilates-spine-twist`, `fish-pose`, `isometric-neck-side` (Kraftübung).

## 4. Lizenz: Gilt ein öffentliches Repo als Weiterverbreitung?

Wichtige Punkte aus `LICENSE-DATA.md` (Free Tier v1.0):
- Nutzung in Apps und auf Websites ist erlaubt, auch kommerziell.
- Pflicht ist ein sichtbarer Link „Exercise data by RepDB (repdb.co)“ (Info- oder Credits-Seite, README oder Footer).
- Verboten ist, den Datensatz oder einen abgeleiteten Datensatz „as a dataset, dataset repository, or API“ neu zu veröffentlichen. Erlaubt ist nur die Nutzung in der App.
- Zuschneiden, Verkleinern und Umfärben ist erlaubt. Hochskalieren oder Hintergrund entfernen zählt dagegen als Ableitung, die unter das Weitergabeverbot fällt.
- **Die Bilder dürfen nicht als Vorlage für KI-Generatoren dienen.** Das betrifft deine Alternative „eigene Bilder per KI mit Charakter-Referenz“: Die RepDB-Figur darf dort nicht die Referenz sein.
- Die RepDB-README empfiehlt ausdrücklich, JSON und Bilder **in die eigene App zu kopieren**, statt sie live von RepDB zu laden.

**Einschätzung (keine Rechtsberatung):** Eine GitHub-Pages-App braucht die Bilder im öffentlichen Repo, sonst kann sie nicht ausgeliefert werden. Das ist die vorgesehene Nutzung in einer App. Heikel wäre, wenn das Repo selbst wie ein Datensatz aussieht. Deshalb:

1. **Nur die ca. 50 genutzten Bilder** committen, keine `exercises.json` von RepDB, keine CSV, kein ZIP und nicht den Ordner `images/flat/` als Ganzes.
2. Die Texte stehen umgeschrieben im App-Format in `data/exercises.json`, also mit unseren Feldern und Kategorien, deutsch/englisch/arabisch, ohne RepDB-Metadaten wie Muskeln, MET oder Schwierigkeit.
3. Die Bilder liegen unter eigenen Dateinamen in `images/man/` (z. B. `nacken-dehnen.webp`), nicht mit der RepDB-Ordnerstruktur.
4. Ein Hinweis in der README: „Bilder und Übungstexte © RepDB, nur zur Nutzung in dieser App, nicht weiterverwenden.“
5. Die Quellenangabe „Exercise data by RepDB (repdb.co)“ mit Link steht in der App (Optionen, unten bei den Credits) und in der README.

**Offene Punkte:**
- Die Lizenz sagt nichts direkt zu öffentlichen Quellcode-Repos. Wer es ganz sicher haben will, fragt kurz bei RepDB nach (Kontakt steht in der Lizenz). Formuliert ist das Verbot aber eindeutig gegen das Veröffentlichen *als Datensatz*.
- Ein Bild von 512 px reicht für den Kreis-Timer. Hochskalieren ist nach der Lizenz nicht erlaubt.
- Die arabischen Texte gibt es bei RepDB nicht. Die würde ich wie bisher selbst übersetzen.
- Das Bild zu `doorway-chest-stretch` passt möglicherweise nicht. Vor der Übernahme schaue ich alle 50 Bilder einzeln an.

## 5. Umsetzungsplan (nach deinem OK)

1. Nur die ca. 50 ausgewählten Bilder herunterladen und unter `images/man/<deutsche-id>.webp` speichern (512 px, WebP). Die alten ChatGPT-Bilder werden überschrieben bzw. ersetzt. Das ist erst der Fall, wenn du zustimmst.
2. `data/exercises.json`: Bestehende Übungen behalten ihre IDs, damit Programme, Favoriten und Verlauf erhalten bleiben. Neue Übungen bekommen Texte aus RepDB (deutsch und englisch, gekürzt auf unser Schrittformat), Arabisch übersetze ich selbst. `perSide` kommt aus `is_unilateral`, Kategorien werden auf unsere Liste abgebildet (Nacken, Schultern, Rücken, Hüfte, Beine …).
3. Neue Übungen standardmäßig aktivieren (`defaultEnabled`), aber nicht automatisch in die bestehenden Programme aufnehmen.
4. Quellenangabe: in der App unter Optionen bei den Credits (neben der Sprachansage) als Link „Exercise data by RepDB (repdb.co)“, übersetzt für de/en/ar, außerdem ein Abschnitt in der README.
5. Offline: `tools/update-sw.mjs` laufen lassen, damit alle neuen Bilder in die Cache-Liste von `sw.js` kommen und sich die Cache-Version erhöht. Danach im Browser prüfen, dass die App offline läuft und Bilder lädt.
6. Committen und pushen.
