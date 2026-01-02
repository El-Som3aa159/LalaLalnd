<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);  // Don't display errors, we'll handle them properly

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

// Parse request data - handle both JSON and FormData
$data = [];
if (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    // Read raw input and ensure it's UTF-8
    $raw_input = file_get_contents("php://input");
    $data = json_decode($raw_input, true, 512, JSON_UNESCAPED_UNICODE) ?? [];
} else {
    $data = $_POST ?? [];
}

if ($method === 'POST') {
    $action = $data['action'] ?? '';

    try {
        switch ($action) {
            case 'register_student':
                registerStudent($conn, $data);
                break;
            case 'register_teacher':
                registerTeacher($conn, $data);
                break;
            case 'login':
                login($conn, $data);
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
                break;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function registerStudent($conn, $data) {
    $full_name = $data['fullName'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $confirm_password = $data['confirmPassword'] ?? '';
    $grade = $data['grade'] ?? '';

    // Trim and sanitize
    $full_name = trim($full_name);
    $email = trim(strtolower($email));

    // Validation - Empty Fields
    if (empty($full_name)) {
        echo json_encode(['success' => false, 'message' => 'الاسم مطلوب.']);
        return;
    }

    if (empty($email)) {
        echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني مطلوب.']);
        return;
    }

    if (empty($password)) {
        echo json_encode(['success' => false, 'message' => 'كلمة المرور مطلوبة.']);
        return;
    }

    if (empty($confirm_password)) {
        echo json_encode(['success' => false, 'message' => 'تأكيد كلمة المرور مطلوب.']);
        return;
    }

    if (empty($grade)) {
        echo json_encode(['success' => false, 'message' => 'يرجى اختيار صف.']);
        return;
    }

    // Validation - Password Match
    if ($password !== $confirm_password) {
        echo json_encode(['success' => false, 'message' => 'كلمات المرور غير متطابقة.']);
        return;
    }

    // Validation - Password Length
    if (strlen($password) < 8) {
        echo json_encode(['success' => false, 'message' => 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.']);
        return;
    }

    // Validation - Email Format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'صيغة البريد الإلكتروني غير صحيحة.']);
        return;
    }

    // Validation - Name Format (at least 2 words with letters only)
    // Allow Arabic and English letters with spaces - reject special chars and numbers
    if (preg_match('/[0-9!@#$%^&*()_+=\[\]{};:"\'<>?,.\\/\\\\|~`]/', $full_name)) {
        echo json_encode(['success' => false, 'message' => 'الاسم يجب أن يحتوي على أحرف فقط.']);
        return;
    }

    if (substr_count($full_name, ' ') < 1) {
        echo json_encode(['success' => false, 'message' => 'الاسم يجب أن يكون ثنائياً على الأقل.']);
        return;
    }

    // Check if email exists
    $stmt = $conn->prepare("SELECT id FROM students WHERE email = ?");
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات.']);
        return;
    }

    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني مسجل بالفعل.']);
        return;
    }

    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    // Insert student
    $stmt = $conn->prepare("INSERT INTO students (full_name, email, password_hash, grade) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات.']);
        return;
    }

    $stmt->bind_param("ssss", $full_name, $email, $password_hash, $grade);

    if ($stmt->execute()) {
        $student_id = $stmt->insert_id;
        // Save to JSON backup
        saveStudentToJSON($full_name, $email, $password_hash, $grade);
        echo json_encode([
            'success' => true, 
            'message' => 'تم التسجيل بنجاح', 
            'role' => 'student',
            'user' => [
                'id' => $student_id,
                'name' => $full_name,
                'email' => $email,
                'role' => 'student',
                'grade' => $grade
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في حفظ البيانات: ' . $stmt->error]);
    }
    $stmt->close();
}

function registerTeacher($conn, $data) {
    $full_name = $data['fullName'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $confirm_password = $data['confirmPassword'] ?? '';
    $specialization = $data['specialization'] ?? '';
    $grades = $data['grades'] ?? []; // Array of selected grades

    // Convert grades array to JSON string for storage
    $grades_json = !empty($grades) ? json_encode($grades) : '[]';

    // Trim and sanitize
    $full_name = trim($full_name);
    $email = trim(strtolower($email));

    // Validation - Empty Fields
    if (empty($full_name)) {
        echo json_encode(['success' => false, 'message' => 'الاسم مطلوب.']);
        return;
    }

    if (empty($email)) {
        echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني مطلوب.']);
        return;
    }

    if (empty($password)) {
        echo json_encode(['success' => false, 'message' => 'كلمة المرور مطلوبة.']);
        return;
    }

    if (empty($confirm_password)) {
        echo json_encode(['success' => false, 'message' => 'تأكيد كلمة المرور مطلوب.']);
        return;
    }

    if (empty($specialization)) {
        echo json_encode(['success' => false, 'message' => 'التخصص مطلوب.']);
        return;
    }

    if (empty($grades) || !is_array($grades) || count($grades) === 0) {
        echo json_encode(['success' => false, 'message' => 'يجب اختيار صف واحد على الأقل.']);
        return;
    }

    // Validation - Password Match
    if ($password !== $confirm_password) {
        echo json_encode(['success' => false, 'message' => 'كلمات المرور غير متطابقة.']);
        return;
    }

    // Validation - Password Length
    if (strlen($password) < 8) {
        echo json_encode(['success' => false, 'message' => 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.']);
        return;
    }

    // Validation - Email Format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'صيغة البريد الإلكتروني غير صحيحة.']);
        return;
    }

    // Validation - Name Format (at least 2 words with letters only)
    // Allow Arabic and English letters with spaces - reject special chars and numbers
    if (preg_match('/[0-9!@#$%^&*()_+=\[\]{};:"\'<>?,.\\/\\\\|~`]/', $full_name)) {
        echo json_encode(['success' => false, 'message' => 'الاسم يجب أن يحتوي على أحرف فقط.']);
        return;
    }

    if (substr_count($full_name, ' ') < 1) {
        echo json_encode(['success' => false, 'message' => 'الاسم يجب أن يكون ثنائياً على الأقل.']);
        return;
    }

    // Check if email exists
    $stmt = $conn->prepare("SELECT id FROM teachers WHERE email = ?");
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات.']);
        return;
    }

    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني مسجل بالفعل.']);
        return;
    }

    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    // Insert teacher
    $stmt = $conn->prepare("INSERT INTO teachers (full_name, email, password_hash, specialization, grades) VALUES (?, ?, ?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات: ' . $conn->error]);
        return;
    }

    $stmt->bind_param("sssss", $full_name, $email, $password_hash, $specialization, $grades_json);

    if ($stmt->execute()) {
        $teacher_id = $stmt->insert_id;
        // Save to JSON backup
        saveTeacherToJSON($full_name, $email, $password_hash, $specialization, $grades_json);
        echo json_encode([
            'success' => true, 
            'message' => 'تم التسجيل بنجاح', 
            'role' => 'teacher',
            'user' => [
                'id' => $teacher_id,
                'name' => $full_name,
                'email' => $email,
                'role' => 'teacher',
                'specialization' => $specialization,
                'grades' => $grades
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في حفظ البيانات: ' . $stmt->error]);
    }
    $stmt->close();
}

function login($conn, $data) {
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? ''; // 'student' or 'teacher'

    if (empty($email) || empty($password) || empty($role)) {
        echo json_encode(['success' => false, 'message' => 'البريد والكلمة مطلوبة']);
        return;
    }

    if ($role === 'student') {
        $stmt = $conn->prepare("SELECT id, full_name, email, password_hash FROM students WHERE email = ?");
    } else {
        $stmt = $conn->prepare("SELECT id, full_name, email, password_hash, specialization FROM teachers WHERE email = ?");
    }

    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'البريد أو كلمة المرور غير صحيحة']);
        return;
    }

    $user = $result->fetch_assoc();

    if (!password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'البريد أو كلمة المرور غير صحيحة']);
        return;
    }

    // Generate session token
    $token = bin2hex(random_bytes(32));
    $_SESSION['user_token'] = $token;
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_role'] = $role;

    echo json_encode([
        'success' => true,
        'message' => 'تم تسجيل الدخول بنجاح',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'name' => $user['full_name'],
            'email' => $user['email'],
            'role' => $role
        ]
    ]);
}

function saveStudentToJSON($full_name, $email, $password_hash, $grade) {
    $json_file = 'data/students.json';
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }

    $students = [];
    if (file_exists($json_file)) {
        $students = json_decode(file_get_contents($json_file), true) ?? [];
    }

    $students[$email] = [
        'full_name' => $full_name,
        'email' => $email,
        'password_hash' => $password_hash,
        'grade' => $grade,
        'created_at' => date('Y-m-d H:i:s')
    ];

    file_put_contents($json_file, json_encode($students, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function saveTeacherToJSON($full_name, $email, $password_hash, $specialization, $grades_json) {
    $json_file = 'data/teachers.json';
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }

    $teachers = [];
    if (file_exists($json_file)) {
        $teachers = json_decode(file_get_contents($json_file), true) ?? [];
    }

    $teachers[$email] = [
        'full_name' => $full_name,
        'email' => $email,
        'password_hash' => $password_hash,
        'specialization' => $specialization,
        'grades' => $grades_json,
        'created_at' => date('Y-m-d H:i:s')
    ];

    file_put_contents($json_file, json_encode($teachers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
?>
