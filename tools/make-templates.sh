#!/bin/sh
#
# make-templates.sh — derive the theme's two templates from the default theme
# of the panel it is being installed into.
#
#   ./tools/make-templates.sh <themes-dir> <output-dir>
#
# The theme needs main.tpl.htm and main_login.tpl.htm only to do two things:
# point the asset paths at themes/default (so Bootstrap and the fonts are not
# duplicated) and load cicada.css last. Everything else in those files must
# stay exactly as the installed ISPConfig ships it.
#
# That is why they are generated instead of shipped. The two files differ
# between ISPConfig versions — 3.3 loads bootstrap-icons.min.css and chart.js,
# 3.2 does not — and a template copied from the wrong version points at files
# that are not there. Deriving them at install time makes the theme correct
# for 3.2, for 3.3 and for whatever comes next, and a re-run after an
# ISPConfig update pulls in whatever the update changed.
#
set -eu

THEMES="${1:?usage: make-templates.sh <themes-dir> <output-dir>}"
OUT="${2:?usage: make-templates.sh <themes-dir> <output-dir>}"
SRC="$THEMES/default/templates"

[ -d "$SRC" ] || { printf 'error: %s not found\n' "$SRC" >&2; exit 1; }

mkdir -p "$OUT"

# A browser that already holds cicada.css keeps serving it after an update —
# the file name never changes, and ISPConfig sends no cache headers that would
# stop it. The panel's own sheets carry ?ver= for the same reason. A checksum
# rather than a timestamp, so the URL only moves when the content does.
sum() {
	[ -f "$1" ] || return 0
	printf '?v=%s' "$(cksum "$1" | cut -d' ' -f1)"
}
CSS_VER="$(sum "$THEMES/cicada/assets/stylesheets/cicada.css")"
JS_VER="$(sum "$THEMES/cicada/assets/javascripts/cicada-charts.js")"

for tpl in main main_login; do
	file="$SRC/$tpl.tpl.htm"
	[ -f "$file" ] || { printf 'error: %s missing\n' "$file" >&2; exit 1; }

	# 1. every asset reference moves to the default theme
	# 2. the light colour sheet is dropped — cicada.css replaces it wholesale
	# 3. cicada.css goes in last, after select2 and the icon fonts, so nothing
	#    loaded later can paint over it
	# 4. the browser chrome colour follows the accent
	#
	# The pattern is anchored on "themes/<tmpl_var ...>/assets/" with no regex
	# metacharacters: an unescaped dot here also matches "='/themes/" and
	# shreds the favicon attributes.
	# 5. where the panel ships Chart.js (3.3 and up), cicada-charts.js follows
	#    it and overrides the light-page defaults it would otherwise draw with.
	#    On 3.2 there is no chart.umd.js line, so nothing is inserted.
	sed -e "s|themes/<tmpl_var name='current_theme'>/assets/|themes/default/assets/|g" \
	    -e "\|stylesheets/themes/default/theme\.min\.css|d" \
	    -e "s|#cc151c|#dd630d|g" \
	    -e "\|</head>|i\\  <link rel='stylesheet' href='<CICADA_PREFIX>themes/cicada/assets/stylesheets/cicada.css$CSS_VER' />" \
	    -e "\|js/chartjs/chart\.umd\.js|a\\  <script src='<CICADA_PREFIX>themes/cicada/assets/javascripts/cicada-charts.js$JS_VER'></script>" \
	    "$file" > "$OUT/$tpl.tpl.htm"

	# main.tpl.htm is served from /, main_login.tpl.htm from /login/
	if [ "$tpl" = "main_login" ]; then
		sed -i.tmp "s|<CICADA_PREFIX>|../|" "$OUT/$tpl.tpl.htm"
	else
		sed -i.tmp "s|<CICADA_PREFIX>||" "$OUT/$tpl.tpl.htm"
	fi
	rm -f "$OUT/$tpl.tpl.htm.tmp"

	# --- verify, rather than assume the substitutions landed ---------------
	left="$(grep -c "current_theme" "$OUT/$tpl.tpl.htm" || true)"
	[ "$left" = "0" ] || { printf 'error: %s still has %s current_theme reference(s)\n' "$tpl" "$left" >&2; exit 1; }

	cic="$(grep -c "cicada.css" "$OUT/$tpl.tpl.htm" || true)"
	[ "$cic" = "1" ] || { printf 'error: %s references cicada.css %s times, expected 1\n' "$tpl" "$cic" >&2; exit 1; }

	# cicada.css must be the last stylesheet in the document
	last="$(grep -n "rel='stylesheet'" "$OUT/$tpl.tpl.htm" | tail -1)"
	case "$last" in
		*cicada.css*) ;;
		*) printf 'error: %s does not load cicada.css last (last is: %s)\n' "$tpl" "$last" >&2; exit 1 ;;
	esac

	# the structure must be untouched apart from the dropped colour sheet
	before="$(grep -c "href='" "$file" || true)"
	after="$(grep -c "href='" "$OUT/$tpl.tpl.htm" || true)"
	[ "$before" = "$after" ] || { printf 'error: %s has %s href attributes, source had %s\n' "$tpl" "$after" "$before" >&2; exit 1; }

	# the chart script belongs exactly where Chart.js is, and nowhere else
	charts="$(grep -c "cicada-charts.js" "$OUT/$tpl.tpl.htm" || true)"
	if grep -q "js/chartjs/chart.umd.js" "$file"; then
		[ "$charts" = "1" ] || { printf 'error: %s ships Chart.js but references cicada-charts.js %s times, expected 1\n' "$tpl" "$charts" >&2; exit 1; }
		# it has to come after Chart.js, or the defaults are set too late
		order="$(grep -n "chart.umd.js\|cicada-charts.js" "$OUT/$tpl.tpl.htm" | head -2 | tail -1)"
		case "$order" in
			*cicada-charts.js*) ;;
			*) printf 'error: %s loads cicada-charts.js before Chart.js\n' "$tpl" >&2; exit 1 ;;
		esac
		note=", charts themed"
	else
		[ "$charts" = "0" ] || { printf 'error: %s has no Chart.js but references cicada-charts.js\n' "$tpl" >&2; exit 1; }
		note=""
	fi

	printf '  %s.tpl.htm  (%s stylesheets, cicada.css last%s)\n' "$tpl" \
		"$(grep -c "rel='stylesheet'" "$OUT/$tpl.tpl.htm" || true)" "$note"
done
