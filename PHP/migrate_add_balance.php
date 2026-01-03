<?php
/**
 * Migration: Add balance column to students table
 * This script adds the balance column if it doesn't exist
 */

require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    // Check if balance column already exists
    $result = $conn->query("SHOW COLUMNS FROM students LIKE 'balance'");
    
    if ($result && $result->num_rows > 0) {
        $output = [
            'success' => true,
            'message' => 'Balance column already exists'
        ];
    } else {
        // Add balance column
        $sql = "ALTER TABLE students ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0.00 AFTER grade";
        
        if ($conn->query($sql)) {
            $output = [
                'success' => true,
                'message' => 'Balance column added successfully to students table'
            ];
        } else {
            $output = [
                'success' => false,
                'message' => 'Error adding balance column: ' . $conn->error
            ];
        }
    }
    
    echo json_encode($output);
    $conn->close();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Exception: ' . $e->getMessage()
    ]);
}
?>
