<?php
header('Content-Type: application/json; charset=utf-8');

require_once 'db_connect.php';

$stmt = $conn->prepare("SELECT id, full_name, email, specialization, grades FROM teachers ORDER BY id DESC LIMIT 3");
$stmt->execute();
$result = $stmt->get_result();

$teachers = [];
while ($row = $result->fetch_assoc()) {
    $teachers[] = $row;
}

echo json_encode($teachers, JSON_UNESCAPED_UNICODE);
?>
