# Changelog

Alle nennenswerten Änderungen an diesem Theme.
Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung [Semantic Versioning](https://semver.org/lang/de/).

## [0.2.2] — 2026-09-01

### Behoben

- **Dokumentation: Nur *Werkzeuge → Einstellungen* wirkt sofort.** Die
  README nannte die drei Wege zum Umstellen gleichwertig nebeneinander.
  Tatsächlich ruft allein `tools/user_settings.php` `updateSessionTheme()`
  auf und lädt die Seite neu; `admin/users_edit.php` und
  `client/client_edit.php` schreiben den Wert nur in die Datenbank. Die
  laufende Sitzung behält `$_SESSION['s']['theme']` bis zum nächsten
  Anmelden — ohne Hinweis, sodass das Umstellen wirkungslos aussieht.

## [0.2.1] — 2026-09-01

### Behoben

- **Die Skripte waren nicht ausführbar.** Git unter Windows setzt das
  Ausführbar-Bit nicht selbst; im Index standen `install.sh`,
  `check-paths.sh` und `make-templates.sh` als `100644`. Nach einem Klon wäre
  `./install.sh` an „Permission denied" gescheitert — und weil der Installer
  die beiden anderen über `sh` aufruft, wäre es erst beim ersten echten
  Einsatz aufgefallen.

### Neu

- Lizenz: BSD-2-Clause, wie das Cicada-Vorbild. Ohne Lizenzdatei gilt in
  einem öffentlichen Repository formal „alle Rechte vorbehalten".
- Der Herkunftsabschnitt benennt, dass `make-templates.sh` auf dem
  Zielsystem zwei Dateien aus dem Standard-Theme ableitet; die gehören dem
  ISPConfig-Projekt und werden nicht mitgeliefert.

## [0.2.0] — 2026-09-01

Unterstützung für ISPConfig 3.2. Die Stilvorlage selbst blieb unverändert —
3.2 und 3.3 unterscheiden sich weder im Farbschema noch in den
ISPConfig-eigenen Klassen, und `main_login.tpl.htm` ist in beiden Zweigen
identisch.

### Behoben

- **Auf 3.2 wäre das Theme unsichtbar geblieben.** Die Zweige filtern die
  Auswahlliste gegensätzlich: 3.3 *verlangt* die Datei `ispconfig_version`
  und vergleicht Major.Minor; 3.2 listet ein Theme **ohne** diese Datei
  bedingungslos, verlangt bei vorhandener Datei aber Gleichheit mit der
  **vollen** Version (`3.2.12p1`, nicht `3.2`). Die mitgelieferte Datei mit
  Inhalt `3.2` hätte das Theme aus der Liste fallen lassen — wortlos, wie
  beide Zweige das tun.

### Geändert

- Die beiden Templates werden **nicht mehr mitgeliefert**, sondern beim
  Installieren aus dem Standard-Theme des Zielsystems abgeleitet
  (`tools/make-templates.sh`). Sie unterscheiden sich zwischen den Zweigen —
  3.3 lädt zusätzlich `bootstrap-icons.min.css` und `chart.umd.js` —, und ein
  Template aus dem falschen Zweig verweist auf Dateien, die es dort nicht
  gibt. Das Skript prüft jede seiner vier Änderungen nach und bricht ab, wenn
  eine nicht sitzt.
- `install.sh` erkennt den Zweig am Vorhandensein von
  `theme_is_compatible()`, legt `ispconfig_version` entsprechend an oder eben
  nicht, und prüft nach dem Kopieren alle Asset-Verweise.
- **Nach einem ISPConfig-Update muss `install.sh` erneut laufen.** Steht in
  der README.

### Neu

- `tools/check-listed.php` beantwortet die Frage, bei der beide Zweige
  schweigen: Erscheint das Theme in der Auswahlliste? Bildet beide Filter
  nach und begründet jedes Urteil.

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
