# Cicada für ISPConfig

Ein dunkles Theme für das ISPConfig-Panel nach dem Vorbild von
[Cicada für OPNsense](https://github.com/opnsense/plugins/tree/master/misc/theme-cicada)
(„dark grey onyx", von rene@team-rebellion.net).

Beide Oberflächen fahren Bootstrap 3, deshalb lässt sich die Cicada-Farbwelt
direkt übertragen: Anthrazit als Grund, gebranntes Orange für alles, was
handelt, kantige 2–3-px-Radien.

**Läuft auf ISPConfig 3.2 und 3.3.** Geprüft gegen 3.2.12p1 und 3.3.2.

**Stand: 0.2.0 — auf einem echten ISPConfig-System noch nicht gelaufen.**
Gebaut und geprüft wurde gegen den Quelltext beider Zweige und gegen eine
Prüfseite mit echtem Panel-Markup (siehe *Prüfen*). Vor dem Produktivbetrieb
auf einem Testsystem durchspielen.

## Installation

Auf dem ISPConfig-Server:

```bash
sudo ./install.sh
```

Das Skript erkennt die Panel-Version, erzeugt die beiden Templates aus dem
Standard-Theme des Systems, legt `interface/web/themes/cicada/` an und prüft
zum Schluss, ob alle Verweise auflösen. Eine vorhandene Installation wird
vorher zur Seite gelegt.

**Nach jedem ISPConfig-Update erneut laufen lassen** — siehe unten.

Das Theme lässt sich danach **pro Benutzer** wählen; es zwingt niemandem
etwas auf:

| Wo | Für wen |
|---|---|
| *Werkzeuge → Einstellungen* | für den eigenen Benutzer |
| *System → Benutzer → Bearbeiten* | für einen anderen Administrator |
| *Kunde → Bearbeiten* | für einen Kunden |
| `$conf['theme']` in `interface/lib/config.inc.php` | als Vorgabe für neue Benutzer |

Zum Ausprobieren also: eigenen Benutzer umstellen, alle anderen bleiben auf
`default`.

## Die Versionsfalle

Ein installiertes Theme ist nicht dasselbe wie ein sichtbares Theme. Beide
ISPConfig-Zweige filtern die Auswahlliste, sie tun es **unterschiedlich**,
und **keiner von beiden sagt ein Wort**, wenn ein Theme herausfällt — es
steht dann einfach nicht in der Liste, und wer es eingestellt hatte, landet
beim nächsten Anmelden wieder auf `default`.

| Zweig | Prüfung | Folge für die Datei `ispconfig_version` |
|---|---|---|
| **3.2** | `users.tform.php` (auch in `client`, `reseller`, `client_circle`) prüft inline: keine Datei → immer gelistet; Datei vorhanden → Inhalt muss **exakt** `ISPC_APP_VERSION` sein | Die Datei **darf nicht da sein.** `3.2` reicht nicht — verlangt wäre `3.2.12p1`, und das müsste nach jedem Patch-Release nachgezogen werden. |
| **3.3** | `functions.inc.php::theme_is_compatible()` verlangt die Datei und vergleicht **Major.Minor** | Die Datei **muss** da sein und `3.3` enthalten. |

Die Anforderungen sind also gegensätzlich. Deshalb liefert dieses Repository
die Datei gar nicht mit: `install.sh` erkennt am Vorhandensein von
`theme_is_compatible()`, welcher Zweig läuft, und legt sie an oder eben
nicht.

Nachsehen lässt sich das jederzeit:

```bash
php tools/check-listed.php
```

Das Skript bildet beide Filter nach und sagt für jedes installierte Theme,
ob es in der Liste erscheint — und wenn nicht, warum.

## Nach einem ISPConfig-Update

```bash
sudo ./install.sh
```

Nicht optional. Beim Sprung von 3.2 auf 3.3 kehrt sich die Versionslogik um,
und die beiden Templates unterscheiden sich zwischen den Zweigen (3.3 lädt
zusätzlich `bootstrap-icons.min.css` und `chart.umd.js`). Ein erneuter Lauf
zieht beides nach. Die Stilvorlage selbst bleibt unverändert — sie deckt
beide Zweige ab.

## Aufbau

Im Panel liegen am Ende vier Dateien, keine Kopie von Bootstrap:

```
themes/cicada/
├── ispconfig_version              nur auf 3.3; auf 3.2 fehlt sie mit Absicht
├── templates/main.tpl.htm         beim Installieren erzeugt
├── templates/main_login.tpl.htm   beim Installieren erzeugt
└── assets/stylesheets/cicada.css  die eigentliche Arbeit
```

Im Repository liegt nur `theme/assets/stylesheets/cicada.css`. **Die
Templates werden nicht mitgeliefert, sondern beim Installieren aus dem
Standard-Theme des Zielsystems abgeleitet** (`tools/make-templates.sh`). Sie
müssen zur installierten ISPConfig-Version passen; ein Template aus dem
falschen Zweig verweist auf Dateien, die es dort nicht gibt. Erzeugt statt
mitgeliefert stimmt es für 3.2, für 3.3 und für das, was danach kommt.

Verändert werden dabei nur vier Dinge, alles andere bleibt wie ausgeliefert:
Assetpfade zeigen auf `themes/default`, das helle Farbschema wird
herausgenommen, `cicada.css` kommt als letztes Stylesheet dazu, und die
Browser-Themefarbe folgt dem Akzent. Das Skript prüft jede dieser
Änderungen nach und bricht ab, wenn eine nicht sitzt.

Warum das reicht:

- **Templates werden vererbt.** `tpl_ini.inc.php` setzt `TEMPLATE_DIR` fest
  auf `themes/default/templates` und hängt das eigene Theme nur in
  `INCLUDE_PATHS`. `vlibTemplate::_fileSearch()` durchsucht die
  `INCLUDE_PATHS` **vor** dem `TEMPLATE_DIR`. Ein Theme braucht also nur die
  Dateien, die es wirklich ändert — in beiden Zweigen gleich.
- **Nur zwei Templates ziehen Assets** über den Theme-Pfad. Beide zeigen auf
  `themes/default/assets/`, damit Bootstrap, Font Awesome und die 2,4 MB
  Schriften **nicht** ein zweites Mal herumliegen und mit dem Panel aktuell
  bleiben.
- **`cicada.css` steht als letztes Stylesheet** und ersetzt
  `themes/default/theme.min.css` vollständig. An dessen Stelle kämen
  `select2.css` und die Icon-Schriften danach und würden Teile wieder
  überschreiben.

Die Stilvorlage deckt drei Schichten ab: die hellen Bootstrap-Bausteine, die
ISPConfig-eigenen Klassen (die in `ispconfig.css` bewusst ohne Farbe
auskommen) und eine Handvoll fest eingetragener heller Werte in
`ispconfig.css`, `pushy.css` und `select2.css`.

## Anpassen

Alle Farben stehen als CSS-Variablen im `:root`-Block ganz oben. Für eine
andere Akzentfarbe reichen drei Zeilen:

```css
--cic-accent:      #dd630d;   /* Flächen: Schaltflächen, Balken, Markierung */
--cic-accent-text: #ef7d21;   /* Verweise und Text auf dunklem Grund */
--cic-on-accent:   #1c1c1c;   /* Beschriftung auf einer Akzentfläche */
```

**Das Logo** wird per `filter: brightness(0) invert(1)` zur weißen Silhouette
gemacht. ISPConfig liefert es als base64-Bild für hellen Grund, und es kann
das Logo eines Kunden sein — als Silhouette funktioniert jedes Motiv. Wer die
Originalfarben behalten will, löscht die Regel `#logo` in Abschnitt 2.

## Prüfen

Vier Werkzeuge, alle auch auf einem laufenden Panel einsetzbar.

**`tools/check-listed.php`** — erscheint das Theme in der Auswahl? Bildet
beide Filter nach und begründet jedes Urteil. Der wichtigste Test, weil das
Panel selbst hier schweigt.

**`tools/check-paths.sh`** — löst jeder Verweis auf das Standard-Theme noch
auf? Das Gegenstück dazu, dass Bootstrap und die Schriften bewusst nicht
dupliziert werden. Ein fehlendes `bootstrap.min.css` ist keine
Schönheitsfrage, sondern eine zerlegte Oberfläche.

**`tools/check-dark.js`** und **`tools/check-contrast.js`** laufen in der
Browserkonsole:

```js
fetch('/check-dark.js').then(r => r.text()).then(eval)
fetch('/check-contrast.js').then(r => r.text()).then(eval)
```

`check-dark.js` sucht Helles, das durchgeschlagen ist, aus zwei Richtungen:
*gerendert* läuft über die Seite und meldet, was tatsächlich hell gemalt wird
(durchscheinende Schichten werden überlagert, sonst gilt jede
30-%-Weiß-Markierung als Fehler); *deklariert* läuft über alle Regeln der
fremden Stylesheets und meldet die mit hellen Werten, deren Selektor dieses
Theme nie anfasst. Keine Richtung reicht allein: Die erste ist blind für
alles, was gerade nicht auf der Seite steht, die zweite kennt keine
Spezifität. Dazu zwei Prüfungen, die aus konkreten Fehlern entstanden sind:
**helle Verläufe** (der Kalender malt sein „heute" mit `#fdd49a → #fdf59a`,
ganz ohne Weiß) und **fremde Farbtöne** (der ausgewählte Tag kam in `#039`
daher — dunkelblau ist nicht „hell" und rutscht durch jede
Helligkeitsprüfung).

`check-contrast.js` misst jede sichtbare Textstelle gegen WCAG AA. Der Punkt
dabei ist der *tatsächliche* Hintergrund: `backgroundColor` liefert für die
meisten Elemente `rgba(0,0,0,0)`, und eine Prüfung gegen eine angenommene
Fläche meldet Erfolg für alles. Das Skript geht die Elternkette hoch und
überlagert jede durchscheinende Schicht.

Zum Ansehen ohne Panel bildet `tools/preview.html` die Panel-Bausteine mit
echtem Markup nach — Kopfzeile, Navigation, Modulkacheln, Listenansicht mit
Filterzeile und Sortierpfeilen, Formular mit Reitern, Meldungen, Dialog,
Suchvorschläge, select2, Datumsauswahl:

```bash
mkdir -p /tmp/cicada-preview/themes
cp -r /usr/local/ispconfig/interface/web/themes/default /tmp/cicada-preview/themes/
cp -r /usr/local/ispconfig/interface/web/themes/cicada  /tmp/cicada-preview/themes/
cp tools/preview.html /tmp/cicada-preview/index.html
cp tools/check-*.js /tmp/cicada-preview/
php -S 127.0.0.1:8124 -t /tmp/cicada-preview
```

Auf einem 3.2-Panel vorher die Zeile mit `bootstrap-icons.min.css` aus
`index.html` löschen — die Datei gibt es dort nicht.

Stand dieser Fassung: **0 helle Flächen bei 549 geprüften Elementen; 0 von
204 Textstellen unter AA auf 3.3, 0 von 162 auf 3.2.**

## Bewusst anders als das Original

Cicada ist an einigen Stellen selbst nicht durchgestylt, an anderen wäre die
wörtliche Übernahme schlecht lesbar. Diese Abweichungen sind Absicht:

| Stelle | Cicada | Hier | Warum |
|---|---|---|---|
| Beschriftung auf Akzentflächen | weiß | `#1c1c1c` | Weiß auf `#dd630d` misst 3,6:1. Die Fläche behält damit exakt die Cicada-Farbe, statt für den Kontrast trüb zu werden. |
| Rot als Fläche | `#db4829` | `#d13f22` | Eine Spur dunkler, damit Weiß darauf 4,7:1 erreicht. |
| Statusfarben als Text | wie die Fläche | eigene, hellere Werte | Dieselbe Farbe kann nicht zugleich Fläche mit dunkler Schrift und Text auf dunklem Grund sein. |
| Gedämpfter Text | `#777` | `#8b9298` | `#777` auf `#202020` misst 3,6:1. |
| Zustandszeilen in Tabellen | Bootstrap-Pastell | getönte Flächen | Cicada hat hier nur `.success` angefasst und Bootstraps `#d9edf7`/`#fcf8e3` stehen lassen. ISPConfig markiert abgeschaltete Datensätze mit `tr.danger`, das steht also auf jeder Listenseite. |
| Verweise in Listenzellen | Akzentfarbe | Fließtext, Akzent beim Überfahren | In ISPConfig ist **jede** Zelle ein Verweis auf das Bearbeitungsformular. In Akzentfarbe wird die ganze Tabelle zu einer orangen Wand. |
| Übergänge | 100 ms | 150 ms | ISPConfig liefert 500 ms, das wirkt zäh; 150 ms liegt dazwischen. |

Nicht angefasst und ebenfalls Absicht: die weißen Zähler-Marken auf farbigen
Schaltflächen (`.btn-primary .badge` und Geschwister) — dort ist Weiß der
richtige Kontrast.

## Was fehlt

- **Ein Lauf auf einem echten Panel.** Module, die eigenes Markup mitbringen
  (Monitor, Statistiken, Fremdmodule), sind nicht abgedeckt. Die beiden
  Browser-Prüfskripte laufen auch dort — sie sind genau dafür da.
- **Die Anmeldeseite** ist eingerichtet, aber nur gegen den Quelltext
  geprüft, nicht gesehen.
- ISPConfig schreibt in `quota_lib.inc.php` Textfarben direkt ins
  `style`-Attribut. `#000000` wird per Attributselektor abgefangen; kommt in
  einer neuen Version ein weiterer fester Wert dazu, fällt er durch.

## Herkunft

Farbwerte und Anmutung stammen aus dem Cicada-Theme für OPNsense
(`misc/theme-cicada`, BSD-2-Clause). Übernommen wurden keine Dateien, nur die
Palette und die Formensprache. Das Vorbild gehört seinen Urhebern; für dieses
Theme ist noch keine Lizenz festgelegt.
