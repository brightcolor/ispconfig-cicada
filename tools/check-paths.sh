#!/bin/sh
#
# check-paths.sh — every asset this theme points at must exist.
#
#   ./tools/check-paths.sh [path-to-ispconfig-interface]
#
# The theme deliberately serves Bootstrap, the icon fonts and the images from
# themes/default instead of keeping a second copy. That saves 2.4 MB and keeps
# those files current with the panel — but it means an ISPConfig update that
# renames or drops a file leaves this theme pointing at nothing, and a missing
# bootstrap.min.css is a wrecked panel, not a cosmetic glitch.
#
# Run this after every ISPConfig update.
#
set -eu

INTERFACE="${1:-/usr/local/ispconfig/interface}"
WEB="$INTERFACE/web"
THEME="$WEB/themes/cicada"

[ -d "$THEME" ] || { printf 'error: %s not found\n' "$THEME" >&2; exit 1; }

missing=0
checked=0

check() {
	checked=$((checked + 1))
	if [ ! -e "$1" ]; then
		printf '  MISSING  %s\n' "$2"
		missing=$((missing + 1))
	fi
}

# --- templates -------------------------------------------------------------
# main.tpl.htm is served from /, main_login.tpl.htm from /login/
for tpl in main main_login; do
	file="$THEME/templates/$tpl.tpl.htm"
	[ -f "$file" ] || { printf '  MISSING  templates/%s.tpl.htm\n' "$tpl"; missing=$((missing + 1)); continue; }

	base="$WEB"
	[ "$tpl" = "main_login" ] && base="$WEB/login"

	grep -oE "(href|src)='[^']+'" "$file" \
		| sed "s/^[a-z]*='//;s/'$//" \
		| grep -E "^\.\./|^/themes|^themes" \
		| sort -u \
		| while read -r ref; do
			clean="${ref%%\?*}"
			case "$clean" in
				/*) full="$WEB$clean" ;;
				*)  full="$base/$clean" ;;
			esac
			[ -e "$full" ] || printf '  MISSING  %s  (%s.tpl.htm)\n' "$clean" "$tpl"
		done
done

# --- stylesheet ------------------------------------------------------------
# url() paths inside cicada.css resolve relative to the stylesheet itself.
CSS="$THEME/assets/stylesheets/cicada.css"
if [ -f "$CSS" ]; then
	grep -oE "url\('[^']+'\)" "$CSS" \
		| sed "s/^url('//;s/')$//" \
		| grep -v '^data:' \
		| sort -u \
		| while read -r ref; do
			full="$THEME/assets/stylesheets/$ref"
			[ -e "$full" ] || printf '  MISSING  %s  (cicada.css)\n' "$ref"
		done
else
	printf '  MISSING  assets/stylesheets/cicada.css\n'
fi

# The subshells above cannot raise the counter, so count the report instead.
report="$(
	for tpl in main main_login; do
		file="$THEME/templates/$tpl.tpl.htm"
		[ -f "$file" ] || { echo x; continue; }
		base="$WEB"; [ "$tpl" = "main_login" ] && base="$WEB/login"
		grep -oE "(href|src)='[^']+'" "$file" | sed "s/^[a-z]*='//;s/'$//" \
			| grep -E "^\.\./|^/themes|^themes" | sort -u \
			| while read -r ref; do
				clean="${ref%%\?*}"
				case "$clean" in /*) full="$WEB$clean" ;; *) full="$base/$clean" ;; esac
				[ -e "$full" ] || echo x
			done
	done
	if [ -f "$CSS" ]; then
		grep -oE "url\('[^']+'\)" "$CSS" | sed "s/^url('//;s/')$//" | grep -v '^data:' | sort -u \
			| while read -r ref; do
				[ -e "$THEME/assets/stylesheets/$ref" ] || echo x
			done
	else
		echo x
	fi
)"
missing="$(printf '%s' "$report" | grep -c x || true)"

if [ "${missing:-0}" -gt 0 ]; then
	printf '\n%s reference(s) point at nothing.\n' "$missing" >&2
	exit 1
fi

printf 'All asset references resolve.\n'
