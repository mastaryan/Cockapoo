<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	exit;
}

// Honeypot check
if (!empty($_POST['website'])) {
	exit;
}

// Google reCAPTCHA SECRET KEY
$recaptchaSecret = 'REDACTED';

$recaptchaResponse = $_POST['g-recaptcha-response'] ?? '';

if (!$recaptchaResponse) {
	die('Captcha not completed.');
}

// Verify reCAPTCHA
$verify = file_get_contents(
	"https://www.google.com/recaptcha/api/siteverify?secret={$recaptchaSecret}&response={$recaptchaResponse}"
);

$responseData = json_decode($verify);

if (!$responseData || !$responseData->success) {
	die('Captcha verification failed.');
}

// Sanitize inputs
$name = htmlspecialchars(trim($_POST['name']));
$email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
$message = htmlspecialchars(trim($_POST['message']));

// Email config
$to = 'info@bluegrassdoodle.com';
$subject = 'New Contact Form Submission';
$headers = "From: {$name} <{$email}>\r\nReply-To: {$email}";

$body = "Name: {$name}\nEmail: {$email}\n\nMessage:\n{$message}";

mail($to, $subject, $body, $headers);

// Success
echo 'Message sent successfully.';
