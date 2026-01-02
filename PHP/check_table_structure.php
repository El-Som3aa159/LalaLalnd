<?php
require 'db_connect.php';

echo "<h2>Database Structure Check</h2>";
echo "<pre>";

// Check courses table structure
$result = $conn->query("DESCRIBE courses");
if ($result) {
    echo "=== COURSES TABLE COLUMNS ===\n";
    while ($col = $result->fetch_assoc()) {
        echo $col['Field'] . " (" . $col['Type'] . ") - Null: " . $col['Null'] . " - Default: " . $col['Default'] . "\n";
    }
} else {
    echo "Error: " . $conn->error . "\n";
}

echo "\n";

// Check teachers table structure
$result = $conn->query("DESCRIBE teachers");
if ($result) {
    echo "=== TEACHERS TABLE COLUMNS ===\n";
    while ($col = $result->fetch_assoc()) {
        echo $col['Field'] . " (" . $col['Type'] . ")\n";
    }
} else {
    echo "Error: " . $conn->error . "\n";
}

$conn->close();
echo "</pre>";
?>
