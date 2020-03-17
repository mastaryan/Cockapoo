
<?php
    if(isset($_POST['submit'])){
        ini_set('display_errors', 1); error_reporting(~0);
        $name=$_POST['name'];
        $email=$_POST['email'];
        $message=$_POST['message'];
        $to='wsizemore00@gmail.com';
        $subject='Hello from Bluegrass Doodles';
        $human=$_POST['human'];
        $from='From: Bluegrass Doodles';
        $body="From: $name\n E-Mail: $email\n Message:\n $message";
    }
 				
    if ($_POST['submit'] && $human == '4') {				 
        if (mail ($to, $subject, $body, $from)) { 
	    echo '<p>Your message has been sent!</p>';
	} else { 
	    echo '<p>Something went wrong, go back and try again!</p>'; 
	} 
    } else if ($_POST['submit'] && $human != '4') {
	echo '<p>You answered the anti-spam question incorrectly!</p>';
    }
    error_reporting(-1);
?>