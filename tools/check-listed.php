<?php
/*
 * check-listed.php — does the panel actually offer this theme?
 *
 *   php tools/check-listed.php [path-to-ispconfig-interface]
 *
 * Installing the files is not the same as the theme showing up. Both
 * ISPConfig branches filter the theme list, they do it differently, and
 * neither says a word when a theme is filtered out — it simply is not in the
 * list, and a user who had it selected lands back on "default" at the next
 * login. That silence is the reason this check exists.
 *
 * The two rules, reproduced from the panel's own source:
 *
 *   3.3  interface/lib/classes/functions.inc.php :: theme_is_compatible()
 *        an ispconfig_version file is REQUIRED, and its leading major.minor
 *        must equal the panel's.
 *
 *   3.2  interface/web/admin/form/users.tform.php (inline, also in
 *        client.tform.php, reseller.tform.php, client_circle.tform.php)
 *        no ispconfig_version file  -> always listed
 *        an ispconfig_version file  -> must equal ISPC_APP_VERSION exactly,
 *                                      down to the patch level.
 */

$interface = $argv[1] ?? '/usr/local/ispconfig/interface';
$themesPath = $interface . '/web/themes';
$configFile = $interface . '/lib/config.inc.php';
$functionsFile = $interface . '/lib/classes/functions.inc.php';

function out(string $line): void { fwrite(STDOUT, $line . "\n"); }
function bail(string $line): void { fwrite(STDERR, 'error: ' . $line . "\n"); exit(2); }

if (!is_dir($themesPath)) {
    bail($themesPath . ' not found - pass the interface path as the first argument');
}

$appVersion = null;
if (is_file($configFile)) {
    if (preg_match("/define\('ISPC_APP_VERSION',\s*'([^']*)'\)/", (string) file_get_contents($configFile), $m)) {
        $appVersion = $m[1];
    }
}
if ($appVersion === null) {
    bail('could not read ISPC_APP_VERSION from ' . $configFile);
}

// Which rule is in force? Detected from the source, not guessed from the number.
$hasCompatFn = is_file($functionsFile)
    && str_contains((string) file_get_contents($functionsFile), 'function theme_is_compatible');
$branch = $hasCompatFn ? '3.3' : '3.2';

out('Panel version : ' . $appVersion);
out('Filter in use : ' . ($hasCompatFn
    ? 'theme_is_compatible() - major.minor, version file required'
    : 'inline check - exact version, or no version file at all'));
out('');

/** 3.3: functions.inc.php::theme_is_compatible() */
function listedUnder33(string $themesPath, string $theme, string $appVersion): array
{
    if ($theme === 'default') return [true, 'always listed'];
    if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $theme)) return [false, 'name has characters the filter rejects'];

    $path = $themesPath . '/' . $theme;
    if (!is_dir($path)) return [false, 'not a directory'];

    $version = '';
    if (is_file($path . '/ispconfig_version')) {
        $version = trim((string) file_get_contents($path . '/ispconfig_version'));
    } elseif (is_file($path . '/ISPC_VERSION')) {
        $version = trim((string) file_get_contents($path . '/ISPC_VERSION'));
    }
    if ($version === '') return [false, 'no ispconfig_version file - 3.3 requires one'];
    if (!preg_match('/^(\d+\.\d+)/', $version, $t)) return [false, 'version file "' . $version . '" has no major.minor'];
    if (!preg_match('/^(\d+\.\d+)/', $appVersion, $a)) return [false, 'panel version has no major.minor'];

    return $t[1] === $a[1]
        ? [true, 'version file "' . $version . '" matches panel ' . $a[1]]
        : [false, 'version file says ' . $t[1] . ', panel is ' . $a[1]];
}

/** 3.2: inline check in the theme forms */
function listedUnder32(string $themesPath, string $theme, string $appVersion): array
{
    $file = $themesPath . '/' . $theme . '/ispconfig_version';
    if (!file_exists($file)) return [true, 'no ispconfig_version file - listed unconditionally'];

    $version = trim((string) file_get_contents($file));
    return $version === $appVersion
        ? [true, 'version file matches ' . $appVersion . ' exactly']
        : [false, 'version file says "' . $version . '", panel is "' . $appVersion . '" - must match exactly'];
}

$themes = [];
foreach (scandir($themesPath) ?: [] as $entry) {
    if ($entry[0] === '.' || !is_dir($themesPath . '/' . $entry)) continue;
    $themes[] = $entry;
}
sort($themes);

$cicadaListed = false;
foreach ($themes as $theme) {
    [$listed, $why] = $hasCompatFn
        ? listedUnder33($themesPath, $theme, $appVersion)
        : listedUnder32($themesPath, $theme, $appVersion);

    out(sprintf('  %-14s %-8s %s', $theme, $listed ? 'LISTED' : 'hidden', $why));
    if ($theme === 'cicada' && $listed) $cicadaListed = true;
}

out('');
if (!in_array('cicada', $themes, true)) {
    out('cicada is not installed in ' . $themesPath);
    exit(1);
}
if (!$cicadaListed) {
    out('cicada is installed but WILL NOT appear in the theme list.');
    exit(1);
}
out('cicada is installed and will appear in the theme list.');
