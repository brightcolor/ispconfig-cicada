# Cicada für ISPConfig

Ein dunkles Theme für das ISPConfig-3.3-Panel nach dem Vorbild von
[Cicada für OPNsense](https://github.com/opnsense/plugins/tree/master/misc/theme-cicada)
(„dark grey onyx", von rene@team-rebellion.net).

Beide Oberflächen fahren Bootstrap 3, deshalb lässt sich die Cicada-Farbwelt
direkt übertragen: Anthrazit als Grund, gebranntes Orange für alles, was
handelt, kantige 2–3-px-Radien.

**Stand: 0.1.0 — auf einem echten ISPConfig-System noch nicht gelaufen.**
Gebaut und geprüft wurde gegen den Quelltext von ISPConfig 3.3.2 und gegen
eine Prüfseite mit echtem Panel-Markup (siehe *Prüfen*). Vor dem
Produktivbetrieb auf einem Testsystem durchspielen.

## Installation

Auf dem ISPConfig-Server:

```bash
sudo ./install.sh
```

Das Skript legt `interface/web/themes/cicada/` an, kopiert die vier Dateien
hinein und übernimmt Eigentümer und Rechte vom mitgelieferten
`default`-Theme. Von Hand geht es genauso:

```bash
sudo cp -r theme /usr/local/ispconfig/interface/web/themes/cicada
```

Das Theme lässt sich anschließend **pro Benutzer** wählen — es zwingt
niemandem etwas auf:

| Wo | Für wen |
|---|---|
| *Werkzeuge → Einstellungen* | für den eigenen Benutzer |
| *System → Benutzer → Bearbeiten* | für einen anderen Administrator |
| *Kunde → Bearbeiten* | für einen Kunden |
| `$conf['theme']` in `interface/lib/config.inc.php` | als Vorgabe für neue Benutzer |

Zum Ausprobieren also: eigenen Benutzer umstellen, alles andere bleibt auf
`default`.

## Der Fallstrick beim ISPConfig-Update

`interface/lib/classes/functions.inc.php:571` prüft jedes Theme so:

```php
return $theme_tmp[1] === $app_tmp[1];   // Major.Minor müssen exakt gleich sein
```

Verglichen wird der Inhalt der Datei `ispconfig_version` im Theme-Ordner mit
`ISPC_APP_VERSION`. Sie enthält hier `3.3`.

**Nach einem Update auf ISPConfig 3.4 verschwindet das Theme wortlos aus der
Auswahl, und jeder Benutzer, der es eingestellt hatte, landet beim nächsten
Anmelden auf `default`.** Keine Fehlermeldung, kein Hinweis. Nach einem
Minor-Update also:

```bash
echo "3.4" | sudo tee /usr/local/ispconfig/interface/web/themes/cicada/ispconfig_version
```

und danach nachsehen, ob die Oberfläche noch stimmt — 3.4 kann Bausteine
mitbringen, die dieses Theme nicht kennt.

## Aufbau

Vier Dateien, keine Kopie von Bootstrap:

```
themes/cicada/
├── ispconfig_version              "3.3" — sonst taucht das Theme nicht auf
├── templates/main.tpl.htm         Assetpfade auf 'default', cicada.css zuletzt
├── templates/main_login.tpl.htm   dasselbe für die Anmeldeseite
└── assets/stylesheets/cicada.css  die eigentliche Arbeit
```

Warum das reicht:

- **Templates werden vererbt.** `tpl_ini.inc.php:53` setzt `TEMPLATE_DIR` fest
  auf `themes/default/templates` und hängt das eigene Theme nur in
  `INCLUDE_PATHS`. `vlibTemplate::_fileSearch()` durchsucht die
  `INCLUDE_PATHS` **vor** dem `TEMPLATE_DIR`. Ein Theme braucht also nur die
  Dateien, die es wirklich ändert; alle übrigen kommen weiter aus `default`
  und werden bei jedem ISPConfig-Update mitgepflegt.
- **Nur zwei Templates ziehen Assets** über den Theme-Pfad (`main.tpl.htm`,
  `main_login.tpl.htm`). Beide zeigen hier auf `themes/default/assets/`, damit
  Bootstrap, Font Awesome, die Icons und die 2,4 MB Schriften **nicht** ein
  zweites Mal herumliegen und mit dem Panel aktuell bleiben.
- **`cicada.css` steht als letztes Stylesheet** und ersetzt
  `themes/default/theme.min.css` vollständig. Stünde sie an dessen Stelle,
  kämen `select2.css` und `bootstrap-icons.css` danach und würden Teile
  wieder überschreiben.

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

Ohne laufendes ISPConfig lässt sich das Theme trotzdem ansehen und messen.
`tools/preview.html` baut die echten Panel-Bausteine nach — Kopfzeile,
Navigation, Modulkacheln, Listenansicht mit Filterzeile und Sortierpfeilen,
Formular mit Reitern, Meldungen, Dialog, Suchvorschläge, select2,
Datumsauswahl. Das Markup stammt aus den ISPConfig-Templates, nicht aus der
Fantasie.

So aufsetzen:

```bash
mkdir -p /tmp/cicada-preview/themes/cicada/assets/stylesheets
cp -r /usr/local/ispconfig/interface/web/themes/default /tmp/cicada-preview/themes/
cp theme/assets/stylesheets/cicada.css /tmp/cicada-preview/themes/cicada/assets/stylesheets/
cp tools/preview.html /tmp/cicada-preview/index.html
cp tools/check-*.js /tmp/cicada-preview/
php -S 127.0.0.1:8124 -t /tmp/cicada-preview
```

Dazu zwei Prüfskripte, die in der Browserkonsole laufen — auch auf einem
echten Panel:

```js
fetch('/check-dark.js').then(r => r.text()).then(eval)
fetch('/check-contrast.js').then(r => r.text()).then(eval)
```

**`check-dark.js`** sucht Helles, das durchgeschlagen ist, und zwar zweimal
aus verschiedenen Richtungen:

- *gerendert*: läuft über die Seite und meldet, was tatsächlich hell gemalt
  wird — durchscheinende Schichten werden dabei überlagert, sonst gilt jede
  30-%-Weiß-Markierung als Fehler;
- *deklariert*: läuft über alle Regeln der fremden Stylesheets, sammelt die
  mit hellen Werten und meldet die, deren Selektor dieses Theme nie anfasst.

Keine der beiden Richtungen reicht allein: Die erste ist blind für alles, was
gerade nicht auf der Seite steht, die zweite kennt keine Spezifität. Dazu
kommen zwei Prüfungen, die aus konkreten Fehlern entstanden sind: **helle
Verläufe** (der Kalender malt sein „heute" mit `#fdd49a → #fdf59a`, ganz ohne
Weiß) und **fremde Farbtöne** (der ausgewählte Tag kam in `#039` daher —
dunkelblau ist nicht „hell" und rutscht durch jede Helligkeitsprüfung).

**`check-contrast.js`** misst jede sichtbare Textstelle gegen WCAG AA. Der
Punkt dabei ist der *tatsächliche* Hintergrund: `backgroundColor` liefert für
die meisten Elemente `rgba(0,0,0,0)`, und eine Prüfung, die gegen eine
angenommene Fläche rechnet, meldet Erfolg für alles. Das Skript geht die
Elternkette hoch und überlagert jede durchscheinende Schicht.

Stand dieser Fassung: **0 von 204 Textstellen unter AA, 0 helle Flächen.**

**`tools/check-paths.sh`** prüft, ob jeder Verweis auf das Standard-Theme
noch auflöst — das Gegenstück dazu, dass dieses Theme Bootstrap und die
Schriften bewusst nicht dupliziert. Ein fehlendes `bootstrap.min.css` ist
keine Schönheitsfrage, sondern eine zerlegte Oberfläche. **Nach jedem
ISPConfig-Update laufen lassen:**

```bash
./tools/check-paths.sh
```

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
  Prüfskripte laufen auch dort — sie sind genau dafür da.
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
