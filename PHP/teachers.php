<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

if ($method === 'GET' || $method === 'POST') {
    switch ($action) {
        case 'list':
            getAllTeachers($conn);
            break;
        case 'get':
            $teacher_id = $_GET['teacher_id'] ?? $_POST['teacher_id'] ?? '';
            getTeacher($conn, $teacher_id);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function getAllTeachers($conn) {
    $query = "SELECT id, full_name, email, specialization, grades, created_at FROM teachers ORDER BY created_at DESC";
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $teachers = [];
        while ($row = $result->fetch_assoc()) {
            // Decode grades JSON array if available
            if (!empty($row['grades'])) {
                $row['grades'] = json_decode($row['grades'], true);
            } else {
                $row['grades'] = [];
            }
            $teachers[] = $row;
        }
        echo json_encode(['success' => true, 'data' => $teachers]);
    } else {
        echo json_encode(['success' => true, 'data' => []]);
    }
}

function getTeacher($conn, $teacher_id) {
    if (empty($teacher_id)) {
        echo json_encode(['success' => false, 'message' => 'Teacher ID is required']);
        return;
    }

    $stmt = $conn->prepare("SELECT id, full_name, email, specialization, grades, created_at FROM teachers WHERE id = ?");
    $stmt->bind_param("i", $teacher_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $teacher = $result->fetch_assoc();
        // Decode grades JSON array if available
        if (!empty($teacher['grades'])) {
            $teacher['grades'] = json_decode($teacher['grades'], true);
        } else {
            $teacher['grades'] = [];
        }
        echo json_encode(['success' => true, 'data' => $teacher]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Teacher not found']);
    }
}
?>
