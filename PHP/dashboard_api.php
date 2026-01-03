<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

$data = [];
if (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    $raw_input = file_get_contents("php://input");
    $data = json_decode($raw_input, true, 512, JSON_UNESCAPED_UNICODE) ?? [];
}

// Debug logging
error_log("Dashboard API Request - Method: $method, Action: " . ($data['action'] ?? 'none') . ", Data: " . json_encode($data));

if ($method === 'POST') {
    $action = $data['action'] ?? '';

    try {
        switch ($action) {
            case 'get_student_data':
                getStudentData($conn, $data);
                break;
            case 'get_student_balance':
                getStudentBalance($conn, $data);
                break;
            case 'update_student_balance':
                updateStudentBalance($conn, $data);
                break;
            case 'get_teacher_data':
                getTeacherData($conn, $data);
                break;
            case 'get_teachers_for_grade':
                getTeachersForGrade($conn, $data);
                break;
            case 'update_student_profile':
                updateStudentProfile($conn, $data);
                break;
            case 'update_teacher_profile':
                updateTeacherProfile($conn, $data);
                break;
            case 'update_teacher_bio':
                updateTeacherBio($conn, $data);
                break;
            case 'delete_student_account':
                deleteStudentAccount($conn, $data);
                break;
            case 'delete_teacher_account':
                deleteTeacherAccount($conn, $data);
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
                break;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ: ' . $e->getMessage()]);
    }
}

function getStudentData($conn, $data) {
    $student_id = $data['student_id'] ?? 0;
    
    if (empty($student_id)) {
        echo json_encode(['success' => false, 'message' => 'Student ID required']);
        return;
    }

    $stmt = $conn->prepare("SELECT id, full_name, email, grade, balance FROM students WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات: ' . $conn->error]);
        return;
    }

    $stmt->bind_param("i", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Student not found']);
        return;
    }

    $student = $result->fetch_assoc();
    echo json_encode(['success' => true, 'student' => $student]);
    $stmt->close();
}

function getStudentBalance($conn, $data) {
    $student_id = $data['student_id'] ?? 0;
    
    if (empty($student_id)) {
        echo json_encode(['success' => false, 'message' => 'Student ID required']);
        return;
    }

    $stmt = $conn->prepare("SELECT balance FROM students WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات: ' . $conn->error]);
        return;
    }

    $stmt->bind_param("i", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Student not found']);
        return;
    }

    $student = $result->fetch_assoc();
    $balance = floatval($student['balance'] ?? 0);
    echo json_encode(['success' => true, 'balance' => $balance]);
    $stmt->close();
}

function updateStudentBalance($conn, $data) {
    $student_id = $data['student_id'] ?? 0;
    $new_balance = $data['balance'] ?? null;
    $amount_to_add = $data['amount'] ?? null;
    
    if (empty($student_id)) {
        echo json_encode(['success' => false, 'message' => 'Student ID required']);
        return;
    }
    
    // Check if we're setting absolute balance or adding amount
    if ($new_balance === null && $amount_to_add === null) {
        echo json_encode(['success' => false, 'message' => 'Balance or amount required']);
        return;
    }
    
    // Get current balance if adding
    if ($amount_to_add !== null) {
        $stmt = $conn->prepare("SELECT balance FROM students WHERE id = ?");
        $stmt->bind_param("i", $student_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Student not found']);
            return;
        }
        
        $student = $result->fetch_assoc();
        $new_balance = floatval($student['balance'] ?? 0) + floatval($amount_to_add);
        $stmt->close();
    } else {
        $new_balance = floatval($new_balance);
    }
    
    // Ensure balance is not negative
    if ($new_balance < 0) {
        $new_balance = 0;
    }
    
    // Update balance in database
    $stmt = $conn->prepare("UPDATE students SET balance = ? WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        return;
    }
    
    $stmt->bind_param("di", $new_balance, $student_id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Balance updated successfully',
            'balance' => $new_balance
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update balance']);
    }
    
    $stmt->close();
}

function getTeacherData($conn, $data) {
    $teacher_id = $data['teacher_id'] ?? 0;
    
    if (empty($teacher_id)) {
        echo json_encode(['success' => false, 'message' => 'Teacher ID required']);
        return;
    }

    $stmt = $conn->prepare("SELECT id, full_name, email, specialization, grades FROM teachers WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات: ' . $conn->error]);
        return;
    }

    $stmt->bind_param("i", $teacher_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Teacher not found']);
        return;
    }

    $teacher = $result->fetch_assoc();
    if (!empty($teacher['grades'])) {
        $teacher['grades'] = json_decode($teacher['grades'], true);
    }
    echo json_encode(['success' => true, 'teacher' => $teacher]);
    $stmt->close();
}

function getTeachersForGrade($conn, $data) {
    $grade = $data['grade'] ?? '';
    
    if (empty($grade)) {
        echo json_encode(['success' => false, 'message' => 'Grade required']);
        return;
    }

    // Get all teachers and filter by grade
    $stmt = $conn->prepare("SELECT id, full_name, email, specialization, grades FROM teachers");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات: ' . $conn->error]);
        return;
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $teachers = [];
    while ($row = $result->fetch_assoc()) {
        $grades = json_decode($row['grades'], true);
        if (is_array($grades) && in_array($grade, $grades)) {
            $row['grades'] = $grades;
            $teachers[] = $row;
        }
    }

    echo json_encode(['success' => true, 'teachers' => $teachers]);
    $stmt->close();
}

function updateStudentProfile($conn, $data) {
    $student_id = $data['student_id'] ?? 0;
    $full_name = $data['full_name'] ?? '';
    $email = $data['email'] ?? '';
    
    error_log("updateStudentProfile called - ID: $student_id, Name: $full_name, Email: $email");
    
    if (empty($student_id) || empty($full_name) || empty($email)) {
        $msg = "Missing required fields - ID:" . (empty($student_id) ? "empty" : "ok") . 
               " Name:" . (empty($full_name) ? "empty" : "ok") . 
               " Email:" . (empty($email) ? "empty" : "ok");
        error_log($msg);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: ' . $msg]);
        return;
    }

    // Validate name and email format
    if (preg_match('/[0-9!@#$%^&*()_+=\[\]{};:"\'<>?,.\\/\\\\|~`]/', $full_name)) {
        echo json_encode(['success' => false, 'message' => 'الاسم يجب أن يحتوي على أحرف فقط.']);
        return;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'صيغة البريد الإلكتروني غير صحيحة.']);
        return;
    }

    // Check if new email already exists for another student
    $stmt = $conn->prepare("SELECT id FROM students WHERE email = ? AND id != ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات']);
        return;
    }
    
    $stmt->bind_param("si", $email, $student_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني مسجل بالفعل']);
        return;
    }
    $stmt->close();

    // Update student profile
    $stmt = $conn->prepare("UPDATE students SET full_name = ?, email = ? WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات']);
        return;
    }

    $stmt->bind_param("ssi", $full_name, $email, $student_id);
    
    if ($stmt->execute()) {
        error_log("Student profile updated successfully - ID: $student_id, Name: $full_name, Email: $email");
        echo json_encode(['success' => true, 'message' => 'تم تحديث البيانات بنجاح']);
    } else {
        error_log("Student profile update failed - Error: " . $stmt->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في حفظ البيانات: ' . $stmt->error]);
    }
    $stmt->close();
}

function updateTeacherProfile($conn, $data) {
    $teacher_id = $data['teacher_id'] ?? 0;
    $full_name = $data['full_name'] ?? '';
    $email = $data['email'] ?? '';
    
    error_log("updateTeacherProfile called - ID: $teacher_id, Name: $full_name, Email: $email");
    
    if (empty($teacher_id) || empty($full_name) || empty($email)) {
        $msg = "Missing required fields - ID:" . (empty($teacher_id) ? "empty" : "ok") . 
               " Name:" . (empty($full_name) ? "empty" : "ok") . 
               " Email:" . (empty($email) ? "empty" : "ok");
        error_log($msg);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: ' . $msg]);
        return;
    }

    // Validate name and email format
    if (preg_match('/[0-9!@#$%^&*()_+=\[\]{};:"\'<>?,.\\/\\\\|~`]/', $full_name)) {
        echo json_encode(['success' => false, 'message' => 'الاسم يجب أن يحتوي على أحرف فقط.']);
        return;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'صيغة البريد الإلكتروني غير صحيحة.']);
        return;
    }

    // Check if new email already exists for another teacher
    $stmt = $conn->prepare("SELECT id FROM teachers WHERE email = ? AND id != ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات']);
        return;
    }
    
    $stmt->bind_param("si", $email, $teacher_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني مسجل بالفعل']);
        return;
    }
    $stmt->close();

    // Update teacher profile
    $stmt = $conn->prepare("UPDATE teachers SET full_name = ?, email = ? WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات']);
        return;
    }

    $stmt->bind_param("ssi", $full_name, $email, $teacher_id);
    
    if ($stmt->execute()) {
        error_log("Teacher profile updated successfully - ID: $teacher_id, Name: $full_name, Email: $email");
        echo json_encode(['success' => true, 'message' => 'تم تحديث البيانات بنجاح']);
    } else {
        error_log("Teacher profile update failed - Error: " . $stmt->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في حفظ البيانات: ' . $stmt->error]);
    }
    $stmt->close();
}

function deleteStudentAccount($conn, $data) {
    $student_id = $data['student_id'] ?? 0;
    
    if (empty($student_id)) {
        echo json_encode(['success' => false, 'message' => 'معرف الطالب مطلوب']);
        return;
    }

    // Begin transaction to ensure all deletes happen together
    $conn->begin_transaction();

    try {
        // 1. Delete enrollments for this student
        $stmt = $conn->prepare("DELETE FROM enrollments WHERE student_id = ?");
        if (!$stmt) {
            throw new Exception('Database error: ' . $conn->error);
        }
        $stmt->bind_param("i", $student_id);
        if (!$stmt->execute()) {
            throw new Exception('Failed to delete enrollments: ' . $stmt->error);
        }
        $stmt->close();

        // 2. Delete the student record
        $stmt = $conn->prepare("DELETE FROM students WHERE id = ?");
        if (!$stmt) {
            throw new Exception('Database error: ' . $conn->error);
        }
        $stmt->bind_param("i", $student_id);
        if (!$stmt->execute()) {
            throw new Exception('Failed to delete student: ' . $stmt->error);
        }
        $stmt->close();

        // Commit transaction
        $conn->commit();
        
        error_log("Student account deleted successfully - Student ID: $student_id");
        echo json_encode(['success' => true, 'message' => 'تم حذف الحساب بنجاح']);
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        error_log("Student account deletion failed - Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في حذف الحساب: ' . $e->getMessage()]);
    }
}

function deleteTeacherAccount($conn, $data) {
    $teacher_id = $data['teacher_id'] ?? 0;
    
    if (empty($teacher_id)) {
        echo json_encode(['success' => false, 'message' => 'معرف المعلم مطلوب']);
        return;
    }

    // Begin transaction to ensure all deletes happen together
    $conn->begin_transaction();

    try {
        // 1. Get all courses by this teacher
        $stmt = $conn->prepare("SELECT id FROM courses WHERE teacher_id = ?");
        if (!$stmt) {
            throw new Exception('Database error: ' . $conn->error);
        }
        $stmt->bind_param("i", $teacher_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $course_ids = [];
        while ($row = $result->fetch_assoc()) {
            $course_ids[] = $row['id'];
        }
        $stmt->close();

        // 2. Delete all enrollments for courses by this teacher
        if (!empty($course_ids)) {
            $placeholders = implode(',', array_fill(0, count($course_ids), '?'));
            $stmt = $conn->prepare("DELETE FROM enrollments WHERE course_id IN ($placeholders)");
            if (!$stmt) {
                throw new Exception('Database error: ' . $conn->error);
            }
            $stmt->bind_param(str_repeat('i', count($course_ids)), ...$course_ids);
            if (!$stmt->execute()) {
                throw new Exception('Failed to delete enrollments: ' . $stmt->error);
            }
            $stmt->close();

            // 3. Delete all sections for courses by this teacher
            $stmt = $conn->prepare("DELETE FROM sections WHERE course_id IN ($placeholders)");
            if (!$stmt) {
                throw new Exception('Database error: ' . $conn->error);
            }
            $stmt->bind_param(str_repeat('i', count($course_ids)), ...$course_ids);
            if (!$stmt->execute()) {
                throw new Exception('Failed to delete sections: ' . $stmt->error);
            }
            $stmt->close();

            // 4. Delete all videos for courses by this teacher
            $stmt = $conn->prepare("DELETE FROM videos WHERE course_id IN ($placeholders)");
            if (!$stmt) {
                throw new Exception('Database error: ' . $conn->error);
            }
            $stmt->bind_param(str_repeat('i', count($course_ids)), ...$course_ids);
            if (!$stmt->execute()) {
                throw new Exception('Failed to delete videos: ' . $stmt->error);
            }
            $stmt->close();

            // 5. Delete all courses by this teacher
            $stmt = $conn->prepare("DELETE FROM courses WHERE teacher_id = ?");
            if (!$stmt) {
                throw new Exception('Database error: ' . $conn->error);
            }
            $stmt->bind_param("i", $teacher_id);
            if (!$stmt->execute()) {
                throw new Exception('Failed to delete courses: ' . $stmt->error);
            }
            $stmt->close();
        }

        // 6. Delete the teacher record
        $stmt = $conn->prepare("DELETE FROM teachers WHERE id = ?");
        if (!$stmt) {
            throw new Exception('Database error: ' . $conn->error);
        }
        $stmt->bind_param("i", $teacher_id);
        if (!$stmt->execute()) {
            throw new Exception('Failed to delete teacher: ' . $stmt->error);
        }
        $stmt->close();

        // Commit transaction
        $conn->commit();
        
        error_log("Teacher account deleted successfully - Teacher ID: $teacher_id, Courses deleted: " . count($course_ids));
        echo json_encode(['success' => true, 'message' => 'تم حذف الحساب والكورسات بنجاح']);
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        error_log("Teacher account deletion failed - Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في حذف الحساب: ' . $e->getMessage()]);
    }
}

function updateTeacherBio($conn, $data) {
    $teacher_id = $data['teacher_id'] ?? 0;
    $bio = $data['bio'] ?? '';
    
    error_log("=== updateTeacherBio DEBUG ===");
    error_log("Received data: " . json_encode($data));
    error_log("teacher_id: " . var_export($teacher_id, true) . " (Type: " . gettype($teacher_id) . ")");
    error_log("bio length: " . strlen($bio));
    error_log("is teacher_id empty? " . (empty($teacher_id) ? 'YES' : 'NO'));
    error_log("teacher_id == 0? " . ($teacher_id == 0 ? 'YES' : 'NO'));
    
    if (empty($teacher_id)) {
        error_log("ERROR: teacher_id is empty or 0");
        echo json_encode(['success' => false, 'message' => 'خطأ: معرف المعلم مفقود']);
        return;
    }

    // Validate bio length
    if (strlen($bio) > 5000) {
        echo json_encode(['success' => false, 'message' => 'خطأ: السيرة الذاتية طويلة جداً (الحد الأقصى 5000 حرف)']);
        return;
    }

    // Update bio in database
    $stmt = $conn->prepare("UPDATE teachers SET bio = ? WHERE id = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في قاعدة البيانات']);
        return;
    }

    $stmt->bind_param("si", $bio, $teacher_id);
    
    if ($stmt->execute()) {
        error_log("Teacher bio updated successfully - ID: $teacher_id");
        echo json_encode(['success' => true, 'message' => 'تم حفظ السيرة الذاتية بنجاح']);
    } else {
        error_log("Teacher bio update failed - Error: " . $stmt->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'خطأ في حفظ السيرة الذاتية']);
    }
    
    $stmt->close();
}
?>
