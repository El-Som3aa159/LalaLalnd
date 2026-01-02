<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);  // Don't display errors to output - causes JSON corruption

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "lalaland_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode([
        "success" => false,
        "message" => "Connection failed: " . $conn->connect_error
    ]));
}

// Set charset to utf8mb4 for Arabic support
$conn->set_charset("utf8mb4");

// Enable debugging
if ($_GET['debug'] ?? false) {
    echo "Database connected successfully!";
    exit;
}
?>
