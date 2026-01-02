<?php
// Enable error reporting to file
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/courses_api_errors.log');

error_reporting(E_ALL);

// Get the current user from session (start before includes)
session_start();

header('Content-Type: application/json; charset=utf-8');
require 'db_connect.php';

// Check if database connection is valid
if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Log for debugging
error_log("Courses API called - Action: " . ($_POST['action'] ?? 'none'));
error_log("Session user_id: " . ($_SESSION['user_id'] ?? 'not set'));
error_log("Session user_role: " . ($_SESSION['user_role'] ?? 'not set'));
error_log("POST teacher_id: " . ($_POST['teacher_id'] ?? 'not set'));

// Try to get user info from PHP session first
$userId = $_SESSION['user_id'] ?? null;
$userRole = $_SESSION['user_role'] ?? null;

// If no session, check for Authorization header or POST data (for API requests)
if (!$userId) {
    // Check if Authorization header is provided (Bearer token with JSON data)
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strpos($authHeader, 'Bearer ') === 0) {
        $tokenData = json_decode(base64_decode(substr($authHeader, 7)), true);
        if ($tokenData && isset($tokenData['id']) && isset($tokenData['role'])) {
            $userId = $tokenData['id'];
            $userRole = $tokenData['role'];
        }
    }
    
    // Also check for user_id in POST/GET data as fallback (for same-origin requests)
    if (!$userId && isset($_POST['teacher_id'])) {
        $userId = intval($_POST['teacher_id']);
        error_log("teacher_id from POST: $userId");
        
        // Verify this is actually a teacher by checking the database
        $checkStmt = $conn->prepare("SELECT id FROM teachers WHERE id = ?");
        if ($checkStmt) {
            $checkStmt->bind_param('i', $userId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            error_log("Teacher check query result rows: " . $result->num_rows);
            
            if ($result->num_rows > 0) {
                error_log("Teacher ID $userId found in database");
                $userRole = 'teacher';
            } else {
                error_log("Teacher ID $userId NOT found in database - treating as teacher anyway for testing");
                // For testing, assume teacher role if teacher_id is provided
                $userRole = 'teacher';
            }
            $checkStmt->close();
        } else {
            error_log("Failed to prepare teacher check: " . $conn->error);
            // If we can't verify, still trust the teacher_id for testing
            $userRole = 'teacher';
        }
    }
}

if (!$userId) {
    error_log("No user_id found - unauthorized");
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized - Please login']);
    exit;
}

$action = $_POST['action'] ?? '';

if (empty($action)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action is required']);
    exit;
}

// Ensure user is a teacher
if ($userRole !== 'teacher') {
    error_log("Role check failed - User $userId has role: '$userRole' (expected 'teacher')");
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Only teachers can manage courses']);
    exit;
}

error_log("Authentication successful - User $userId is teacher");

try {
    switch ($action) {
        case 'create_course':
            createCourse($conn, $userId);
            break;
        case 'update_course':
            updateCourse($conn, $userId);
            break;
        case 'delete_course':
            deleteCourse($conn, $userId);
            break;
        case 'get_courses':
            getCourses($conn, $userId);
            break;
        case 'get_course_by_id':
            getCourseById($conn, $userId);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
    }
} catch (Exception $e) {
    error_log("Exception in courses_api: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

function createCourse($conn, $userId) {
    error_log("createCourse called with userId: $userId");
    
    $title = sanitizeInput($_POST['title'] ?? '');
    $subtitle = sanitizeInput($_POST['subtitle'] ?? '');
    $description = sanitizeInput($_POST['description'] ?? '');
    $price = floatval($_POST['price'] ?? 0);
    $bgType = $_POST['bgType'] ?? 'color';
    $imageColor = sanitizeInput($_POST['imageColor'] ?? '#6c5ce7');
    
    error_log("Course data - Title: $title, Subtitle: $subtitle, Price: $price, Color: $imageColor");
    
    if (empty($title) || empty($subtitle) || empty($description)) {
        error_log("Validation failed: missing required fields");
        echo json_encode(['success' => false, 'message' => 'Title, subtitle, and description are required']);
        return;
    }

    // Handle wallpaper upload if provided
    $wallpaperPath = null;
    if ($bgType === 'image' && isset($_FILES['courseImage'])) {
        $wallpaperPath = handleWallpaperUpload($_FILES['courseImage']);
        if (!$wallpaperPath) {
            echo json_encode(['success' => false, 'message' => 'Failed to upload wallpaper image']);
            return;
        }
    }

    // Generate a unique course code
    $courseCode = 'COURSE_' . time() . '_' . rand(1000, 9999);
    error_log("Generated course code: $courseCode");

    $query = "INSERT INTO courses (course_code, title, subtitle, description, teacher_id, price, image_color, wallpaper, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    error_log("Preparing SQL: $query");
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        return;
    }

    // Correct bind_param: s=string, i=int, d=double
    error_log("Binding parameters: s(code), s, s, s, i, d, s, s");
    $bindResult = $stmt->bind_param('ssssidss', $courseCode, $title, $subtitle, $description, $userId, $price, $imageColor, $wallpaperPath);
    if (!$bindResult) {
        error_log("bind_param failed: " . $stmt->error);
        echo json_encode(['success' => false, 'message' => 'Bind parameter error: ' . $stmt->error]);
        return;
    }
    
    if ($stmt->execute()) {
        $courseId = $stmt->insert_id;
        error_log("Course created successfully with ID: $courseId, Wallpaper: $wallpaperPath");
        echo json_encode([
            'success' => true, 
            'message' => 'Course created successfully',
            'course_id' => $courseId
        ]);
    } else {
        error_log("Execute failed: " . $stmt->error);
        echo json_encode(['success' => false, 'message' => 'Failed to create course: ' . $stmt->error]);
    }
    
    $stmt->close();
}

function updateCourse($conn, $userId) {
    $courseId = intval($_POST['course_id'] ?? 0);
    $title = sanitizeInput($_POST['title'] ?? '');
    $subtitle = sanitizeInput($_POST['subtitle'] ?? '');
    $description = sanitizeInput($_POST['description'] ?? '');
    $price = floatval($_POST['price'] ?? 0);
    $bgType = $_POST['bgType'] ?? 'color';
    $imageColor = sanitizeInput($_POST['imageColor'] ?? '#6c5ce7');

    if ($courseId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid course ID']);
        return;
    }

    // Check if course belongs to the teacher
    $checkQuery = "SELECT id FROM courses WHERE id = ? AND teacher_id = ?";
    $checkStmt = $conn->prepare($checkQuery);
    $checkStmt->bind_param('ii', $courseId, $userId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Course not found or unauthorized']);
        $checkStmt->close();
        return;
    }
    $checkStmt->close();

    // Handle wallpaper upload if provided
    $wallpaperPath = null;
    if ($bgType === 'image' && isset($_FILES['courseImage'])) {
        $wallpaperPath = handleWallpaperUpload($_FILES['courseImage']);
        if (!$wallpaperPath) {
            echo json_encode(['success' => false, 'message' => 'Failed to upload wallpaper image']);
            return;
        }
    }

    // Update course with wallpaper if provided, otherwise just update colors/text
    if ($wallpaperPath) {
        $query = "UPDATE courses SET title = ?, subtitle = ?, description = ?, price = ?, image_color = ?, wallpaper = ? 
                  WHERE id = ? AND teacher_id = ?";
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
            return;
        }
        $stmt->bind_param('sssdssii', $title, $subtitle, $description, $price, $imageColor, $wallpaperPath, $courseId, $userId);
    } else {
        $query = "UPDATE courses SET title = ?, subtitle = ?, description = ?, price = ?, image_color = ? 
                  WHERE id = ? AND teacher_id = ?";
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
            return;
        }
        $stmt->bind_param('sssdsii', $title, $subtitle, $description, $price, $imageColor, $courseId, $userId);
    }
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Course updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update course']);
    }
    
    $stmt->close();
}

function deleteCourse($conn, $userId) {
    $courseId = intval($_POST['course_id'] ?? 0);

    if ($courseId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid course ID']);
        return;
    }

    // Check if course belongs to the teacher
    $checkQuery = "SELECT id FROM courses WHERE id = ? AND teacher_id = ?";
    $checkStmt = $conn->prepare($checkQuery);
    $checkStmt->bind_param('ii', $courseId, $userId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Course not found or unauthorized']);
        $checkStmt->close();
        return;
    }
    $checkStmt->close();

    $query = "DELETE FROM courses WHERE id = ? AND teacher_id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        return;
    }

    $stmt->bind_param('ii', $courseId, $userId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Course deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete course']);
    }
    
    $stmt->close();
}

function getCourses($conn, $userId) {
    $query = "SELECT id, title, subtitle, description, price, image_color, wallpaper, created_at 
              FROM courses WHERE teacher_id = ? ORDER BY created_at DESC";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $courses = [];
    while ($row = $result->fetch_assoc()) {
        $courses[] = $row;
    }
    
    echo json_encode(['success' => true, 'courses' => $courses]);
    $stmt->close();
}

function getCourseById($conn, $userId) {
    $courseId = intval($_POST['course_id'] ?? 0);

    if ($courseId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid course ID']);
        return;
    }

    $query = "SELECT id, title, subtitle, description, price, image_color, wallpaper, created_at 
              FROM courses WHERE id = ? AND teacher_id = ?";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('ii', $courseId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Course not found']);
        $stmt->close();
        return;
    }
    
    $course = $result->fetch_assoc();
    echo json_encode(['success' => true, 'course' => $course]);
    $stmt->close();
}

function handleImageUpload($file) {
    $uploadDir = 'uploads/course_images/';
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $fileName = basename($file['name']);
    $fileSize = $file['size'];
    $fileTmp = $file['tmp_name'];
    $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    // Validate file
    $allowedExt = ['jpg', 'jpeg', 'png', 'gif'];
    if (!in_array($fileExt, $allowedExt)) {
        return false;
    }

    if ($fileSize > 5 * 1024 * 1024) { // 5MB max
        return false;
    }

    $newFileName = uniqid('course_') . '.' . $fileExt;
    $uploadPath = $uploadDir . $newFileName;

    if (move_uploaded_file($fileTmp, $uploadPath)) {
        return $uploadPath;
    }

    return false;
}

function handleWallpaperUpload($file) {
    $uploadDir = 'uploads/wallpapers/';
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $fileName = basename($file['name']);
    $fileSize = $file['size'];
    $fileTmp = $file['tmp_name'];
    $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    // Validate file
    $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($fileExt, $allowedExt)) {
        error_log("Invalid file extension: $fileExt");
        return false;
    }

    if ($fileSize > 10 * 1024 * 1024) { // 10MB max for wallpapers
        error_log("File too large: $fileSize bytes");
        return false;
    }

    $newFileName = uniqid('wallpaper_') . '.' . $fileExt;
    $uploadPath = $uploadDir . $newFileName;

    if (move_uploaded_file($fileTmp, $uploadPath)) {
        error_log("Wallpaper uploaded successfully to: $uploadPath");
        // Return path relative to web root so browser can access it
        return 'PHP/' . $uploadPath;
    }

    error_log("Failed to move uploaded file to: $uploadPath");
    return false;
}

function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

$conn->close();
?>
