<?php
require 'db_connect.php';

echo "<h2>Create Test Teacher</h2>";
echo "<pre>";

// Check if teacher 1 exists
$check = $conn->query("SELECT id, full_name FROM teachers WHERE id = 1");
if ($check && $check->num_rows > 0) {
    $teacher = $check->fetch_assoc();
    echo "✓ Teacher ID 1 already exists: " . $teacher['full_name'] . "\n";
} else {
    echo "Creating teacher ID 1...\n";
    
    $name = "معلم اختبار";
    $email = "teacher@test.com";
    $password = password_hash("password123", PASSWORD_DEFAULT);
    $specialization = "computer science";
    $grades = json_encode(['primary', 'secondary']);
    
    $stmt = $conn->prepare("INSERT INTO teachers (id, full_name, email, password_hash, specialization, grades) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('isssss', $id, $name, $email, $password, $specialization, $grades);
    $id = 1;
    
    if ($stmt->execute()) {
        echo "✓ Teacher created successfully!\n";
    } else {
        echo "✗ Error: " . $stmt->error . "\n";
    }
    $stmt->close();
}

// List all teachers
echo "\n=== All Teachers in Database ===\n";
$result = $conn->query("SELECT id, full_name, email, specialization FROM teachers ORDER BY id");
if ($result) {
    while ($teacher = $result->fetch_assoc()) {
        echo "ID: " . $teacher['id'] . " | Name: " . $teacher['full_name'] . " | Email: " . $teacher['email'] . " | Specialization: " . $teacher['specialization'] . "\n";
    }
} else {
    echo "Error: " . $conn->error . "\n";
}

$conn->close();
echo "</pre>";
?>
