<?php
include 'db_connect.php';

header('Content-Type: application/json');

// DEBUG: Log all received data
error_log('=== TEACHER BIO API ===');
error_log('REQUEST METHOD: ' . $_SERVER['REQUEST_METHOD']);
error_log('CONTENT_TYPE: ' . $_SERVER['CONTENT_TYPE']);
error_log('POST array keys: ' . implode(', ', array_keys($_POST)));
error_log('POST data: ' . print_r($_POST, true));
error_log('GET data: ' . print_r($_GET, true));

// Try to read raw input as well
$raw_input = file_get_contents('php://input');
error_log('Raw input length: ' . strlen($raw_input));
if (strlen($raw_input) < 1000) {
    error_log('Raw input: ' . $raw_input);
}

// Get teacher_id from GET query parameters
$teacher_id = isset($_GET['teacher_id']) ? $_GET['teacher_id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : null;

error_log('teacher_id from GET: ' . var_export($teacher_id, true));
error_log('action from GET: ' . var_export($action, true));

// Validate teacher_id exists
if ($teacher_id === null || $teacher_id === '') {
    error_log('ERROR: teacher_id is null or empty - $_POST: ' . print_r($_POST, true));
    echo json_encode(['success' => false, 'message' => 'خطأ: معرف المعلم مفقود. تأكد من تسجيل الدخول.']);
    exit;
}

// Convert to integer
$teacher_id = intval($teacher_id);
error_log('Converted teacher_id: ' . $teacher_id);

if ($teacher_id <= 0) {
    error_log('ERROR: teacher_id is not valid after conversion: ' . $teacher_id);
    echo json_encode(['success' => false, 'message' => 'خطأ: معرف المعلم غير صحيح']);
    exit;
}

if ($action === 'update_bio') {
    $bio = isset($_POST['bio']) ? $_POST['bio'] : '';
    
    error_log('Bio length: ' . strlen($bio));
    
    // Validate bio length (max 5000 characters)
    if (strlen($bio) > 5000) {
        echo json_encode(['success' => false, 'message' => 'خطأ: السيرة الذاتية طويلة جداً (الحد الأقصى 5000 حرف)']);
        exit;
    }
    
    // Update bio in database
    $stmt = $conn->prepare("UPDATE teachers SET bio = ? WHERE id = ?");
    if (!$stmt) {
        error_log('ERROR: Prepare failed: ' . $conn->error);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات']);
        exit;
    }
    
    $stmt->bind_param("si", $bio, $teacher_id);
    
    if ($stmt->execute()) {
        error_log('SUCCESS: Bio updated for teacher_id=' . $teacher_id);
        echo json_encode(['success' => true, 'message' => 'تم حفظ السيرة الذاتية بنجاح']);
    } else {
        error_log('ERROR: Execute failed: ' . $stmt->error);
        echo json_encode(['success' => false, 'message' => 'خطأ في حفظ السيرة الذاتية']);
    }
    $stmt->close();
    
} elseif ($action === 'get_bio') {
    // Get bio from database
    $stmt = $conn->prepare("SELECT bio FROM teachers WHERE id = ?");
    $stmt->bind_param("i", $teacher_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    echo json_encode(['success' => true, 'bio' => $row['bio'] ?? '']);
}

$conn->close();
?>
