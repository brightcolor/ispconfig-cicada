# Changelog

Alle nennenswerten Änderungen an diesem Theme.
Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung [Semantic Versioning](https://semver.org/lang/de/).

## [0.1.0] — 2026-09-01

Erste Fassung. Auf einem echten ISPConfig-System noch nicht gelaufen.

### Neu

- Dunkles Theme für ISPConfig 3.3 nach dem Vorbild von Cicada für OPNsense:
  Anthrazit als Grund, gebranntes Orange als Akzent, kantige Radien.
- Vier Dateien statt einer Kopie des Standard-Themes. Templates werden vom
  Standard-Theme geerbt, Bootstrap und die Schriften werden von dort geladen
  statt dupliziert.
- Abgedeckt sind die Bootstrap-Bausteine, die ISPConfig-eigenen Klassen und
  die fest eingetragenen hellen Werte in `ispconfig.css`, `pushy.css` und
  `select2.css` — Kopfzeile, Navigation, Modulkacheln, Seitenleiste, Listen
  mit Filterzeile und Sortierpfeilen, Formulare, Reiter, Meldungen, Dialoge,
  Aufklappmenüs, select2, Datumsauswahl, Suchvorschläge, Fortschrittsbalken,
  Konfigurationsvergleich und das mobile Menü.
- Alle Farben als CSS-Variablen; eine andere Akzentfarbe kostet drei Zeilen.
- `install.sh` prüft vor dem Kopieren, ob die Panel-Version zur Angabe in
  `ispconfig_version` passt, und sichert eine vorhandene Installation.
- Prüfwerkzeuge: `tools/preview.html` bildet die Panel-Bausteine mit echtem
  Markup nach; `tools/check-dark.js` sucht durchgeschlagene helle Werte aus
  zwei Richtungen; `tools/check-contrast.js` misst jede Textstelle gegen
  WCAG AA; `tools/check-paths.sh` prüft, ob alle Verweise auf das
  Standard-Theme noch auflösen.

### Bewusst anders als das Vorbild

- Beschriftungen auf Akzentflächen sind dunkel statt weiß. Weiß auf `#dd630d`
  misst 3,6:1; so behält die Fläche die Originalfarbe, statt für den Kontrast
  abgedunkelt zu werden.
- Rot als Fläche ist `#d13f22` statt `#db4829`, damit Weiß darauf 4,7:1
  erreicht.
- Gedämpfter Text ist `#8b9298` statt `#777` (das misst auf `#202020` nur
  3,6:1).
- Zustandszeilen in Tabellen sind getönte Flächen statt Bootstrap-Pastell.
  Das Vorbild hat hier nur `.success` angefasst; ISPConfig markiert
  abgeschaltete Datensätze mit `tr.danger`, das steht auf jeder Listenseite.
- Verweise in Listenzellen tragen Fließtextfarbe und nehmen den Akzent erst
  beim Überfahren auf — in ISPConfig ist jede Zelle ein Verweis, in
  Akzentfarbe wird die Tabelle zu einer orangen Wand.

### Bekannt

- Module mit eigenem Markup (Monitor, Statistiken, Fremdmodule) sind nicht
  abgedeckt; die Prüfskripte laufen auch auf einem echten Panel.
- Nach einem ISPConfig-Minor-Update muss `ispconfig_version` nachgezogen
  werden, sonst verschwindet das Theme wortlos aus der Auswahl und betroffene
  Benutzer landen auf `default`.
- `quota_lib.inc.php` schreibt Textfarben ins `style`-Attribut. `#000000`
  wird abgefangen; ein weiterer fester Wert in einer neuen Version fiele
  durch.
