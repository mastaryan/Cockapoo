<?php
/*
 *  CONFIGURE EVERYTHING HERE
 */

// email address that will be in the From field of the email
$from = 'info@bluegrassdoodle.com';

// email address that will receive the email with the output of the form
$sendTo = 'info@bluegrassdoodle.com';

// subject of the email
$subject = 'New message from Bluegrass Doodles contact form';

// form field names and their labels for the email
$fields = array(
    'name'    => 'Name',
    'surname' => 'Surname',
    'phone'   => 'Phone',
    'email'   => 'Email',
    'message' => 'Message'
    // NOTE: honeypot field "website" is intentionally NOT listed here
);

// user-facing messages
$okMessage    = 'Contact form successfully submitted. Thank you, we will get back to you soon!';
$errorMessage = 'There was an error while submitting the form. Please try again later.';

// reCAPTCHA SECRET KEY (from Google dashboard)
$recaptchaSecret = '6LeTAdoZAAAAAG2Zi4gK8hvA8afhdfPNJ_iqtVN1';

// rate limiting settings
$rateLimitMaxAttempts = 5;       // max submissions
$rateLimitWindow       = 600;    // window in seconds (600 = 10 minutes)

/*
 *  LET'S DO THE SENDING
 */

error_reporting(E_ALL & ~E_NOTICE);

/**
 * Simple sanitizer
 */
function clean_field($value)
{
    return trim(strip_tags($value));
}

try {

    // Reject non-POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }

    if (count($_POST) === 0) {
        throw new Exception('Form is empty');
    }

    // -----------------------------
    // 1) HONEYPOT CHECK
    // -----------------------------
    // "website" is a hidden/off-screen field in the form.
    // Humans leave it empty; bots often fill it.
    $honeypot = isset($_POST['website']) ? trim($_POST['website']) : '';
    if ($honeypot !== '') {
        // Treat as spam and silently fail.
        throw new Exception('Spam detected via honeypot');
    }

    // -----------------------------
    // 2) RATE LIMITING PER IP
    // -----------------------------
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ipSafe = preg_replace('/[^0-9a-zA-Z_.-]/', '_', $ip);

    $rateDir = __DIR__ . '/rate_limit';
    if (!is_dir($rateDir)) {
        @mkdir($rateDir, 0755, true);
    }

    $rateFile = $rateDir . '/' . $ipSafe . '.json';
    $now      = time();

    $attempts = [];
    if (file_exists($rateFile)) {
        $json = file_get_contents($rateFile);
        $attempts = json_decode($json, true);
        if (!is_array($attempts)) {
            $attempts = [];
        }
    }

    // keep only attempts inside the time window
    $attempts = array_filter($attempts, function ($ts) use ($now, $rateLimitWindow) {
        return ($now - (int)$ts) < $rateLimitWindow;
    });

    if (count($attempts) >= $rateLimitMaxAttempts) {
        throw new Exception('Rate limit exceeded for this IP');
    }

    // record current attempt
    $attempts[] = $now;
    @file_put_contents($rateFile, json_encode(array_values($attempts)));

    // -----------------------------
    // 3) reCAPTCHA VALIDATION
    // -----------------------------
    if (empty($_POST['g-recaptcha-response'])) {
        throw new Exception('reCAPTCHA is missing');
    }

    $recaptchaToken = $_POST['g-recaptcha-response'];

    $verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

    $query = http_build_query([
        'secret'   => $recaptchaSecret,
        'response' => $recaptchaToken,
        'remoteip' => $ip,
    ]);

    $verifyResponse = @file_get_contents($verifyUrl . '?' . $query);

    if ($verifyResponse === false) {
        throw new Exception('Unable to contact reCAPTCHA verification server');
    }

    $captchaData = json_decode($verifyResponse, true);

    if (empty($captchaData['success'])) {
        throw new Exception('reCAPTCHA verification failed');
    }

    // -----------------------------
    // 4) VALIDATE EMAIL + BUILD BODY
    // -----------------------------

    // Validate email format
    if (isset($_POST['email'])) {
        $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email address');
        }
        $_POST['email'] = $email;
    }

    // Build email body
    $emailText = "You have a new message from the Bluegrass Doodles contact form\n";
    $emailText .= "=====================================================\n";

    foreach ($fields as $key => $label) {
        if (isset($_POST[$key]) && $_POST[$key] !== '') {
            $value = clean_field($_POST[$key]);
            $emailText .= "$label: $value\n";
        }
    }

    // Headers
    $headers = array(
        "Content-Type: text/plain; charset=UTF-8",
        "From: $from",
        "Reply-To: $from",
        "Return-Path: $from"
    );

    // Send email
    $mailResult = @mail($sendTo, $subject, $emailText, implode("\n", $headers));

    if (!$mailResult) {
        throw new Exception('Mail sending failed');
    }

    $responseArray = array('type' => 'success', 'message' => $okMessage);

} catch (Exception $e) {

    // Optional: log errors
    // error_log("Contact form error: " . $e->getMessage());

    $responseArray = array('type' => 'danger', 'message' => $errorMessage);
}

// Return JSON if AJAX, otherwise fallback to plain text
if (
    !empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest'
) {
    header('Content-Type: application/json');
    echo json_encode($responseArray);
} else {
    echo $responseArray['message'];
}
