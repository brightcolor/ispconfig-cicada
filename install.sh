#!/bin/sh
#
# Install the Cicada theme into an ISPConfig panel (3.2 or 3.3).
#
#   sudo ./install.sh [path-to-ispconfig-interface]
#
# Default path: /usr/local/ispconfig/interface
#
# The two templates are not shipped — they are derived from the panel's own
# default theme (see tools/make-templates.sh), so the theme fits whichever
# ISPConfig it lands on. Re-run this after an ISPConfig update.
#
set -eu

INTERFACE="${1:-/usr/local/ispconfig/interface}"
THEMES="$INTERFACE/web/themes"
TARGET="$THEMES/cicada"
HERE="$(cd "$(dirname "$0")" && pwd)"

fail() { printf 'error: %s\n' "$1" >&2; exit 1; }

[ -d "$HERE/theme" ] || fail "theme/ not found next to this script"
[ -d "$THEMES" ] || fail "$THEMES does not exist - pass the interface path as the first argument"
[ -d "$THEMES/default" ] || fail "$THEMES/default is missing; this does not look like an ISPConfig install"

# ---------------------------------------------------------------------------
# Which panel is this, and how does it decide whether to offer a theme?
#
# 3.3  functions.inc.php::theme_is_compatible() — the theme MUST carry an
#      ispconfig_version file, and its major.minor must match the panel's.
#      No file, or a mismatch, and the theme silently never appears.
#
# 3.2  the theme forms inline the check instead: a theme with NO
#      ispconfig_version file is always listed; a theme that has one must
#      match ISPC_APP_VERSION *exactly* — "3.2.12p1", not "3.2".
#
# So the file is required on 3.3 and actively harmful on 3.2, where it would
# have to be rewritten after every patch release. Detect, don't guess.
# ---------------------------------------------------------------------------
CONFIG="$INTERFACE/lib/config.inc.php"
FUNCTIONS="$INTERFACE/lib/classes/functions.inc.php"

APP_VERSION=""
if [ -f "$CONFIG" ]; then
	APP_VERSION="$(sed -n "s/.*define('ISPC_APP_VERSION',[ ]*'\([^']*\)').*/\1/p" "$CONFIG" | head -1)"
fi

if [ -f "$FUNCTIONS" ] && grep -q "function theme_is_compatible" "$FUNCTIONS"; then
	SCHEME="majorminor"
else
	SCHEME="omit"
fi

if [ -n "$APP_VERSION" ]; then
	printf 'Panel: ISPConfig %s\n' "$APP_VERSION"
else
	printf 'Panel: version not readable from config.inc.php\n'
fi

case "$SCHEME" in
	majorminor)
		if [ -n "$APP_VERSION" ]; then
			SHORT="$(printf '%s' "$APP_VERSION" | sed -n 's/^\([0-9]\{1,\}\.[0-9]\{1,\}\).*/\1/p')"
			[ -n "$SHORT" ] || fail "cannot read a major.minor from '$APP_VERSION'"
		else
			fail "this panel checks theme versions but its version is unreadable; pass the interface path explicitly"
		fi
		printf 'Theme list checks major.minor - writing ispconfig_version "%s"\n' "$SHORT"
		;;
	omit)
		printf 'Theme list checks the exact version - omitting ispconfig_version so the\n'
		printf 'theme is listed without having to be rewritten after every patch release.\n'
		;;
esac

# ---------------------------------------------------------------------------
# Install
# ---------------------------------------------------------------------------
if [ -d "$TARGET" ]; then
	BACKUP="$TARGET.bak-$(date +%Y%m%d%H%M%S)"
	printf 'Existing install found, moving it to %s\n' "$BACKUP"
	mv "$TARGET" "$BACKUP"
fi

mkdir -p "$TARGET/assets/stylesheets"
cp "$HERE/theme/assets/stylesheets/cicada.css" "$TARGET/assets/stylesheets/cicada.css"

printf 'Deriving templates from the default theme:\n'
sh "$HERE/tools/make-templates.sh" "$THEMES" "$TARGET/templates"

if [ "$SCHEME" = "majorminor" ]; then
	printf '%s\n' "$SHORT" > "$TARGET/ispconfig_version"
fi

# Match whatever the shipped theme uses, rather than guessing a user.
OWNER="$(ls -ld "$THEMES/default" | awk '{print $3 ":" $4}')"
chown -R "$OWNER" "$TARGET" 2>/dev/null || printf 'warning: could not chown to %s\n' "$OWNER" >&2
find "$TARGET" -type d -exec chmod 755 {} +
find "$TARGET" -type f -exec chmod 644 {} +

# ---------------------------------------------------------------------------
# Verify before claiming success
# ---------------------------------------------------------------------------
printf 'Checking asset references:\n'
sh "$HERE/tools/check-paths.sh" "$INTERFACE" | sed 's/^/  /'

printf '\nInstalled to %s\n' "$TARGET"
printf 'Activate it per user under Tools -> Settings, or for another account\n'
printf 'under System -> Users. The default theme stays untouched for everyone else.\n'
