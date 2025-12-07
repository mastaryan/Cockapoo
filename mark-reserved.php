<?php
// File where we track puppy status
$dataFile = __DIR__ . '/data/puppies.json';

// Shared secret so randoms can't hit this and mark pups reserved
$secretToken = 'BGDoodlesReserve_2025_3f97c1b2c4';

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

// Redirect buyer back to the litter page (optional query just for your info)
header('Location: https://bluegrassdoodle.com/cockapoof1.html?reserved=' . urlencode($puppyId));
exit;
