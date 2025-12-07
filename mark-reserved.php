<?php
// File where we track puppy status
$dataFile = __DIR__ . '/data/puppies.json';

// Shared secret so randoms can't hit this and mark pups reserved
$secretToken = 'BGDoodlesReserve_2025_3f97c1b2c4';

// ---------- Facebook CAPI settings ----------
$fbPixelId    = '433201072263739';
$fbAccessToken = 'EAATTYkjN900BQCsXHKxYL6D9jeLNWekQLeXoVGCmYZB3w0ENVXbtEs2te04llADvdjavObim8NVqQvXe4JOiHgL7i5dYG0emysJbZCmVRaeq3uzjqiELsfGD0PZCfW9SudmH1NyKYw7opK643yWZCSdyU5leZC5EDjSDCMDYhZBxLQ9kr1Um63y6AoeM8ePwZDZD'; // <-- replace with your token
$depositValue = 50.00; // deposit amount in USD

/**
 * Send Purchase event to Facebook Conversions API
 */
function sendFacebookPurchaseEvent($pixelId, $accessToken, $puppyId, $value)
{
    if (empty($pixelId) || empty($accessToken) || empty($puppyId)) {
        return;
    }

    $eventId = 'reserve-' . $puppyId . '-' . time();

    $event = [
        'event_name'      => 'Purchase',
        'event_time'      => time(),
        'event_id'        => $eventId,
        'action_source'   => 'website',
        'event_source_url'=> 'https://bluegrassdoodle.com/cockapoof1.html?reserved=' . urlencode($puppyId),
        'custom_data'     => [
            'value'           => $value,
            'currency'        => 'USD',
            'content_name'    => 'Cockapoo Puppy Deposit',
            'content_category'=> 'Puppy Reservation',
            'content_ids'     => [$puppyId],
            'contents'        => [
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

    // Use cURL to send the event; fail silently so user isn't affected
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    // If you ever want to debug, you could log $response to a file.
}

// ---------- Main logic ----------

// Read query params from Stripe redirect
$puppyId = isset($_GET['puppy']) ? $_GET['puppy'] : '';
$token   = isset($_GET['token']) ? $_GET['token'] : '';

// Basic security check
if ($token !== $secretToken || $puppyId === '') {
    http_response_code(403);
    echo 'Invalid request.';
    exit;
}

// Make sure data file exists
if (!file_exists($dataFile)) {
    http_response_code(500);
    echo 'Config file not found.';
    exit;
}

// Load JSON
$json = file_get_contents($dataFile);
$puppies = json_decode($json, true);

if (!is_array($puppies)) {
    http_response_code(500);
    echo 'Config file invalid.';
    exit;
}

// Update the matching puppy to reserved
$found = false;
foreach ($puppies as &$p) {
    if (isset($p['id']) && $p['id'] === $puppyId) {
        $p['status'] = 'reserved';
        $found = true;
        break;
    }
}
unset($p);

if (!$found) {
    http_response_code(404);
    echo 'Puppy not found.';
    exit;
}

// Save back to JSON
file_put_contents($dataFile, json_encode($puppies, JSON_PRETTY_PRINT));

// ---- NEW: send Facebook CAPI Purchase event ----
sendFacebookPurchaseEvent($fbPixelId, $fbAccessToken, $puppyId, $depositValue);

// Redirect buyer back to the litter page (optional query just for your info)
header('Location: https://bluegrassdoodle.com/cockapoof1.html?reserved=' . urlencode($puppyId));
exit;
