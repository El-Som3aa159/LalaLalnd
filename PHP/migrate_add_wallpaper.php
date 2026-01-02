<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';

// Add wallpaper column if it doesn't exist
$check_column = $conn->query("SHOW COLUMNS FROM courses LIKE 'wallpaper'");

if ($check_column->num_rows === 0) {
    $alter_table = "ALTER TABLE courses ADD COLUMN wallpaper VARCHAR(255) DEFAULT NULL";
    if ($conn->query($alter_table)) {
        echo json_encode(['success' => true, 'message' => 'Wallpaper column added successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add wallpaper column: ' . $conn->error]);
    }
} else {
    echo json_encode(['success' => true, 'message' => 'Wallpaper column already exists']);
}
?>
