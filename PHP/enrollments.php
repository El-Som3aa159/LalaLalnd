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
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? $_POST['action'] ?? $data['action'] ?? '';

if ($method === 'POST') {
    if ($action === 'enroll') {
        enrollStudent($conn, $data);
    } elseif ($action === 'purchase') {
        purchaseCourse($conn, $data);
    } elseif ($action === 'unenroll') {
        unenrollStudent($conn, $data);
    } elseif ($action === 'check') {
        checkEnrollment($conn, $data);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} elseif ($method === 'GET') {
    if ($action === 'list') {
        getStudentEnrollments($conn, $_GET['student_id'] ?? $_GET['studentId'] ?? '');
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function purchaseCourse($conn, $data) {
    $student_id = intval($data['student_id'] ?? $data['studentId'] ?? 0);
    $course_id = intval($data['course_id'] ?? $data['courseId'] ?? 0);

    if (empty($student_id) || empty($course_id)) {
        echo json_encode(['success' => false, 'message' => 'Student ID and Course ID are required']);
        return;
    }

    // Get course price
    $stmt = $conn->prepare("SELECT price FROM courses WHERE id = ?");
    $stmt->bind_param("i", $course_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Course not found']);
        return;
    }
    
    $course = $result->fetch_assoc();
    $price = floatval($course['price']);

    // Check if already enrolled
    $stmt = $conn->prepare("SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?");
    $stmt->bind_param("ii", $student_id, $course_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Student is already enrolled in this course']);
        return;
    }

    // Get student balance
    $stmt = $conn->prepare("SELECT balance FROM students WHERE id = ?");
    $stmt->bind_param("i", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Student not found']);
        return;
    }
    
    $student = $result->fetch_assoc();
    $balance = floatval($student['balance']);

    // Check if student has enough balance (only if course is not free)
    if ($price > 0 && $balance < $price) {
        echo json_encode([
            'success' => false, 
            'message' => 'Insufficient balance',
            'required' => $price,
            'available' => $balance
        ]);
        return;
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // Deduct price from balance
        if ($price > 0) {
            $new_balance = $balance - $price;
            $stmt = $conn->prepare("UPDATE students SET balance = ? WHERE id = ?");
            $stmt->bind_param("di", $new_balance, $student_id);
            $stmt->execute();
        }

        // Add enrollment
        $stmt = $conn->prepare("INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $student_id, $course_id);
        $stmt->execute();

        // Commit transaction
        $conn->commit();

        echo json_encode([
            'success' => true, 
            'message' => 'تم شراء الكورس بنجاح',
            'new_balance' => $new_balance ?? $balance
        ]);
    } catch (Exception $e) {
        // Rollback transaction
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'Error processing purchase: ' . $e->getMessage()]);
    }
}

function enrollStudent($conn, $data) {
    $student_id = $data['student_id'] ?? $data['studentId'] ?? '';
    $course_id = $data['course_id'] ?? $data['courseId'] ?? '';

    if (empty($student_id) || empty($course_id)) {
        echo json_encode(['success' => false, 'message' => 'Student ID and Course ID are required']);
        return;
    }

    // Check if already enrolled
    $stmt = $conn->prepare("SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?");
    $stmt->bind_param("ii", $student_id, $course_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Student is already enrolled in this course']);
        return;
    }

    // Enroll
    $stmt = $conn->prepare("INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)");
    $stmt->bind_param("ii", $student_id, $course_id);

    if ($stmt->execute()) {
        saveEnrollmentToJSON($student_id, $course_id);
        echo json_encode(['success' => true, 'message' => 'تم التسجيل في الكورس بنجاح']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error enrolling in course']);
    }
}

function unenrollStudent($conn, $data) {
    $student_id = $data['student_id'] ?? $data['studentId'] ?? '';
    $course_id = $data['course_id'] ?? $data['courseId'] ?? '';

    if (empty($student_id) || empty($course_id)) {
        echo json_encode(['success' => false, 'message' => 'Student ID and Course ID are required']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM enrollments WHERE student_id = ? AND course_id = ?");
    $stmt->bind_param("ii", $student_id, $course_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Unenrolled successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error unenrolling']);
    }
}

function checkEnrollment($conn, $data) {
    $student_id = $data['student_id'] ?? $data['studentId'] ?? '';
    $course_id = $data['course_id'] ?? $data['courseId'] ?? '';

    if (empty($student_id) || empty($course_id)) {
        echo json_encode(['success' => false, 'message' => 'Student ID and Course ID are required']);
        return;
    }

    $stmt = $conn->prepare("SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?");
    $stmt->bind_param("ii", $student_id, $course_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(['success' => true, 'enrolled' => true, 'message' => 'Student is enrolled']);
    } else {
        echo json_encode(['success' => true, 'enrolled' => false, 'message' => 'Student is not enrolled']);
    }
}

function getStudentEnrollments($conn, $student_id) {
    if (empty($student_id)) {
        echo json_encode(['success' => false, 'message' => 'Student ID is required']);
        return;
    }

    $stmt = $conn->prepare("SELECT c.* FROM courses c 
                            INNER JOIN enrollments e ON c.id = e.course_id 
                            WHERE e.student_id = ? ORDER BY e.enrolled_at DESC");
    $stmt->bind_param("i", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $courses = [];
    while ($row = $result->fetch_assoc()) {
        $courses[] = $row;
    }

    echo json_encode(['success' => true, 'data' => $courses]);
}

function saveEnrollmentToJSON($student_id, $course_id) {
    $json_file = 'data/enrollments.json';
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }

    $enrollments = [];
    if (file_exists($json_file)) {
        $enrollments = json_decode(file_get_contents($json_file), true) ?? [];
    }

    $enrollment_key = $student_id . '_' . $course_id;
    $enrollments[$enrollment_key] = [
        'student_id' => $student_id,
        'course_id' => $course_id,
        'enrolled_at' => date('Y-m-d H:i:s')
    ];

    file_put_contents($json_file, json_encode($enrollments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
?>
