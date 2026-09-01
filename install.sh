#!/bin/sh
#
# Install the Cicada theme into an ISPConfig 3.3 panel.
#
#   sudo ./install.sh [path-to-ispconfig-interface]
#
# Default path: /usr/local/ispconfig/interface
#
set -eu

INTERFACE="${1:-/usr/local/ispconfig/interface}"
THEMES="$INTERFACE/web/themes"
TARGET="$THEMES/cicada"
SOURCE="$(cd "$(dirname "$0")" && pwd)/theme"

fail() { printf 'error: %s\n' "$1" >&2; exit 1; }

[ -d "$SOURCE" ] || fail "theme/ not found next to this script"
[ -d "$THEMES" ] || fail "$THEMES does not exist - pass the interface path as the first argument"
[ -d "$THEMES/default" ] || fail "$THEMES/default is missing; this does not look like an ISPConfig install"

# The panel only offers a theme whose ispconfig_version matches its own
# major.minor exactly. Comparing up front beats a theme that silently never
# appears in the list.
CONFIG="$INTERFACE/lib/config.inc.php"
THEME_VERSION="$(tr -d ' \t\r\n' < "$SOURCE/ispconfig_version")"
if [ -f "$CONFIG" ]; then
	APP_VERSION="$(sed -n "s/.*define('ISPC_APP_VERSION',[ ]*'\([^']*\)').*/\1/p" "$CONFIG" | head -1)"
	if [ -n "$APP_VERSION" ]; then
		APP_SHORT="$(printf '%s' "$APP_VERSION" | sed -n 's/^\([0-9]\{1,\}\.[0-9]\{1,\}\).*/\1/p')"
		THEME_SHORT="$(printf '%s' "$THEME_VERSION" | sed -n 's/^\([0-9]\{1,\}\.[0-9]\{1,\}\).*/\1/p')"
		if [ "$APP_SHORT" != "$THEME_SHORT" ]; then
			printf 'This panel is ISPConfig %s, the theme declares %s.\n' "$APP_VERSION" "$THEME_VERSION" >&2
			printf 'It would install but never show up in the theme list.\n' >&2
			printf 'Fix with:  echo "%s" > %s/ispconfig_version\n' "$APP_SHORT" "$SOURCE" >&2
			exit 1
		fi
		printf 'ISPConfig %s, theme declares %s - match.\n' "$APP_VERSION" "$THEME_VERSION"
	fi
fi

if [ -d "$TARGET" ]; then
	BACKUP="$TARGET.bak-$(date +%Y%m%d%H%M%S)"
	printf 'Existing install found, moving it to %s\n' "$BACKUP"
	mv "$TARGET" "$BACKUP"
fi

mkdir -p "$TARGET"
cp -r "$SOURCE/." "$TARGET/"

# Match whatever the shipped theme uses, rather than guessing a user.
OWNER="$(ls -ld "$THEMES/default" | awk '{print $3 ":" $4}')"
chown -R "$OWNER" "$TARGET" 2>/dev/null || printf 'warning: could not chown to %s\n' "$OWNER" >&2
find "$TARGET" -type d -exec chmod 755 {} +
find "$TARGET" -type f -exec chmod 644 {} +

printf '\nInstalled to %s\n' "$TARGET"
printf 'Activate it per user under Tools -> Settings, or for another account\n'
printf 'under System -> Users. The default theme stays untouched for everyone else.\n'
