<?php
/**
 * mark-reserved.php
 * Marks a puppy as reserved after successful Stripe checkout
 * Sends Facebook CAPI Purchase event
 */

// ===============================
// LOAD SECRETS (NOT IN GIT)
// ===============================
require_once __DIR__ . '/includes/secrets.php';
// secrets.php MUST define:
// $RESERVE_SECRET_TOKEN
// $FB_PIXEL_ID
// $FB_ACCESS_TOKEN

// ===============================
// CONFIG
// ===============================
$dataFile      = __DIR__ . '/data/puppies.json';
$depositValue  = 50.00; // USD

// ===============================
// FACEBOOK CAPI FUNCTION
// ===============================
function sendFacebookPurchaseEvent($pixelId, $accessToken, $puppyId, $value)
{
    if (!$pixelId || !$accessToken || !$puppyId) {
        return;
    }

    $eventId = 'reserve-' . $puppyId . '-' . time();

    $event = [
        'event_name'       => 'Purchase',
        'event_time'       => time(),
        'event_id'         => $eventId,
        'action_source'    => 'website',
        'event_source_url' => 'https://bluegrassdoodle.com/cockapoof1.html?reserved=' . urlencode($puppyId),
        'custom_data'      => [
            'value'            => $value,
            'currency'         => 'USD',
            'content_name'     => 'Cockapoo Puppy Deposit',
            'content_category' => 'Puppy Reservation',
            'content_ids'      => [$puppyId],
            'contents'         => [
                [
                    'id'         => $puppyId,
                    'quantity'   => 1,
                    'item_price' => $value
                ]
            ]
        ]
    ];

    $payload = json_encode(['data' => [$event]]);

    $url = 'https://graph.facebook.com/v18.0/' . $pixelId . '/events?access_token=' . urlencode($accessToken);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
    ]);

    curl_exec($ch);
    curl_close($ch);
}

// ===============================
// INPUT VALIDATION
// ===============================
$puppyId = $_GET['puppy'] ?? '';
$token   = $_GET['token'] ?? '';

if ($token !== $RESERVE_SECRET_TOKEN || empty($puppyId)) {
    http_response_code(403);
    exit('Invalid request.');
}

// ===============================
// LOAD DATA
// ===============================
if (!file_exists($dataFile)) {
    http_response_code(500);
    exit('Data file missing.');
}

$puppies = json_decode(file_get_contents($dataFile), true);

if (!is_array($puppies)) {
    http_response_code(500);
    exit('Data file invalid.');
}

// ===============================
// UPDATE STATUS
// ===============================
$found = false;

foreach ($puppies as &$p) {
    if (!empty($p['id']) && $p['id'] === $puppyId) {
        $p['status'] = 'reserved';
        $found = true;
        break;
    }
}
unset($p);

if (!$found) {
    http_response_code(404);
    exit('Puppy not found.');
}

// ===============================
// SAVE
// ===============================
file_put_contents($dataFile, json_encode($puppies, JSON_PRETTY_PRINT));

// ===============================
// SEND FB CAPI EVENT
// ===============================
sendFacebookPurchaseEvent(
    $FB_PIXEL_ID,
    $FB_ACCESS_TOKEN,
    $puppyId,
    $depositValue
);

// ===============================
// REDIRECT
// ===============================
header('Location: https://bluegrassdoodle.com/cockapoof1.html?reserved=' . urlencode($puppyId));
exit;
