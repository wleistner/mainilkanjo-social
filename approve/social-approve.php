<?php
/**
 * mainilkanjo Social – Freigabe-Endpoint
 * -------------------------------------------------------------
 * Auf den WordPress-Server hochladen (z. B. nach /httpdocs/social-approve.php).
 * Wird von den Buttons in der Freigabe-Mail aufgerufen:
 *   social-approve.php?id=<slug>&action=approve|reject&sig=<hmac>
 * Verifiziert die HMAC-Signatur und löst per GitHub repository_dispatch
 * den Veröffentlichen-/Verwerfen-Workflow aus.
 *
 * Konfiguration NICHT hier hardcoden – lege daneben eine Datei
 * 'social-approve-config.php' an (siehe README) mit:
 *   <?php
 *   define('SOCIAL_APPROVE_SECRET', '…');     // identisch zu APPROVE_SECRET in GitHub
 *   define('SOCIAL_GH_OWNER', 'dein-github-name');
 *   define('SOCIAL_GH_REPO',  'mainilkanjo-social');
 *   define('SOCIAL_GH_TOKEN', 'github_pat_…'); // Fine-grained PAT, Contents+Actions: RW
 */

$cfg = __DIR__ . '/social-approve-config.php';
if (!file_exists($cfg)) { http_response_code(500); exit('Konfiguration fehlt.'); }
require $cfg;

function page($title, $msg, $color) {
  http_response_code(200);
  header('Content-Type: text/html; charset=utf-8');
  echo "<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'>"
     . "<div style='font-family:Inter,Arial,sans-serif;max-width:460px;margin:18vh auto;text-align:center;color:#0B1F33'>"
     . "<div style='font-size:46px;margin-bottom:8px'>$color</div>"
     . "<h2 style='color:#003A6F;margin:0 0 8px'>$title</h2>"
     . "<p style='color:#5A6B7B'>$msg</p></div>";
  exit;
}

$id     = isset($_GET['id'])     ? (string)$_GET['id']     : '';
$action = isset($_GET['action']) ? (string)$_GET['action'] : '';
$sig    = isset($_GET['sig'])    ? (string)$_GET['sig']    : '';

if ($id === '' || !in_array($action, ['approve', 'reject'], true) || $sig === '') {
  page('Ungültiger Link', 'Die Parameter sind unvollständig.', '⚠️');
}

$expected = hash_hmac('sha256', $id . ':' . $action, SOCIAL_APPROVE_SECRET);
if (!hash_equals($expected, $sig)) {
  page('Signatur ungültig', 'Dieser Freigabe-Link ist nicht gültig oder wurde verändert.', '🚫');
}

$event = ($action === 'approve') ? 'social-publish' : 'social-reject';
$url = 'https://api.github.com/repos/' . SOCIAL_GH_OWNER . '/' . SOCIAL_GH_REPO . '/dispatches';
$payload = json_encode(['event_type' => $event, 'client_payload' => ['slug' => $id]]);

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . SOCIAL_GH_TOKEN,
    'Accept: application/vnd.github+json',
    'User-Agent: mainilkanjo-social',
    'Content-Type: application/json',
  ],
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code >= 200 && $code < 300) {
  if ($action === 'approve') {
    page('Wird veröffentlicht ✓', 'Der Beitrag geht jetzt automatisch auf Instagram und Facebook live. Das dauert ein bis zwei Minuten.', '✅');
  } else {
    page('Verworfen', 'Dieser Beitrag wird nicht veröffentlicht.', '🗑️');
  }
} else {
  page('Fehler beim Auslösen', 'GitHub hat mit Status ' . htmlspecialchars((string)$code) . ' geantwortet. Bitte später erneut versuchen.', '⚠️');
}
