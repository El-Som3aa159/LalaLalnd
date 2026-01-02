<?php
// Enable error reporting to file
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/course_content_api_errors.log');

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
error_log("Course Content API called - Action: " . ($_POST['action'] ?? 'none'));
error_log("Session user_id: " . ($_SESSION['user_id'] ?? 'not set'));
error_log("POST teacher_id: " . ($_POST['teacher_id'] ?? 'not set'));

// Try to get user info from PHP session first
$userId = $_SESSION['user_id'] ?? null;
$userRole = $_SESSION['user_role'] ?? null;

// If no session, check for teacher_id in POST data
if (!$userId && isset($_POST['teacher_id'])) {
    $userId = intval($_POST['teacher_id']);
    $userRole = 'teacher';
    error_log("teacher_id from POST: $userId");
}

// Allow get_course_content without authentication (for students viewing course)
$action = $_POST['action'] ?? '';
if ($action === 'get_course_content') {
    // Students can view course content without login
    // Continue to process the request
} else {
    // Other actions require authentication
    if (!$userId) {
        error_log("No user_id found - unauthorized");
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized - Please login']);
        exit;
    }
}

$action = $_POST['action'] ?? '';

if (empty($action)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action is required']);
    exit;
}

try {
    switch ($action) {
        // SECTIONS
        case 'add_section':
            addSection($conn, $userId);
            break;
        case 'get_sections':
            getSections($conn, $userId);
            break;
        case 'update_section':
            updateSection($conn, $userId);
            break;
        case 'delete_section':
            deleteSection($conn, $userId);
            break;
        
        // SUBSECTIONS
        case 'add_subsection':
            addSubsection($conn, $userId);
            break;
        case 'get_subsections':
            getSubsections($conn, $userId);
            break;
        case 'update_subsection':
            updateSubsection($conn, $userId);
            break;
        case 'delete_subsection':
            deleteSubsection($conn, $userId);
            break;
        
        // VIDEOS
        case 'add_video':
            addVideo($conn, $userId);
            break;
        case 'get_videos':
            getVideos($conn, $userId);
            break;
        case 'update_video':
            updateVideo($conn, $userId);
            break;
        case 'delete_video':
            deleteVideo($conn, $userId);
            break;
        case 'get_course_content':
            getFullCourseContent($conn, $userId);
            break;
        
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
    }
} catch (Exception $e) {
    error_log("Exception in course_content_api: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

// ==================== SECTIONS ====================

function addSection($conn, $userId) {
    $courseId = intval($_POST['course_id'] ?? 0);
    $title = sanitizeInput($_POST['title'] ?? '');
    
    if ($courseId <= 0 || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Course ID and title are required']);
        return;
    }

    // Verify course belongs to teacher
    if (!verifyCourseOwnership($conn, $courseId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "INSERT INTO sections (course_id, title, order_index) VALUES (?, ?, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM (SELECT order_index FROM sections WHERE course_id = ?) AS sub))";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('isi', $courseId, $title, $courseId);
    
    if ($stmt->execute()) {
        $sectionId = $stmt->insert_id;
        echo json_encode(['success' => true, 'message' => 'Section added', 'section_id' => $sectionId]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add section']);
    }
    
    $stmt->close();
}

function getSections($conn, $userId) {
    $courseId = intval($_POST['course_id'] ?? 0);
    
    if ($courseId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Course ID is required']);
        return;
    }

    // Verify course belongs to teacher
    if (!verifyCourseOwnership($conn, $courseId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "SELECT id, title, order_index FROM sections WHERE course_id = ? ORDER BY order_index ASC";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('i', $courseId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $sections = [];
    while ($row = $result->fetch_assoc()) {
        $sections[] = $row;
    }
    
    echo json_encode(['success' => true, 'sections' => $sections]);
    $stmt->close();
}

function updateSection($conn, $userId) {
    $sectionId = intval($_POST['section_id'] ?? 0);
    $title = sanitizeInput($_POST['title'] ?? '');
    
    if ($sectionId <= 0 || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Section ID and title are required']);
        return;
    }

    // Verify ownership through course
    if (!verifySectionOwnership($conn, $sectionId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "UPDATE sections SET title = ? WHERE id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('si', $title, $sectionId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Section updated']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update section']);
    }
    
    $stmt->close();
}

function deleteSection($conn, $userId) {
    $sectionId = intval($_POST['section_id'] ?? 0);
    
    if ($sectionId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Section ID is required']);
        return;
    }

    // Verify ownership through course
    if (!verifySectionOwnership($conn, $sectionId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "DELETE FROM sections WHERE id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('i', $sectionId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Section deleted']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete section']);
    }
    
    $stmt->close();
}

// ==================== SUBSECTIONS ====================

function addSubsection($conn, $userId) {
    $sectionId = intval($_POST['section_id'] ?? 0);
    $title = sanitizeInput($_POST['title'] ?? '');
    
    if ($sectionId <= 0 || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Section ID and title are required']);
        return;
    }

    // Verify ownership
    if (!verifySectionOwnership($conn, $sectionId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "INSERT INTO subsections (section_id, title, order_index) VALUES (?, ?, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM (SELECT order_index FROM subsections WHERE section_id = ?) AS sub))";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('isi', $sectionId, $title, $sectionId);
    
    if ($stmt->execute()) {
        $subsectionId = $stmt->insert_id;
        echo json_encode(['success' => true, 'message' => 'Subsection added', 'subsection_id' => $subsectionId]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add subsection']);
    }
    
    $stmt->close();
}

function getSubsections($conn, $userId) {
    $sectionId = intval($_POST['section_id'] ?? 0);
    
    if ($sectionId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Section ID is required']);
        return;
    }

    // Verify ownership
    if (!verifySectionOwnership($conn, $sectionId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "SELECT id, title, order_index FROM subsections WHERE section_id = ? ORDER BY order_index ASC";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('i', $sectionId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $subsections = [];
    while ($row = $result->fetch_assoc()) {
        $subsections[] = $row;
    }
    
    echo json_encode(['success' => true, 'subsections' => $subsections]);
    $stmt->close();
}

function updateSubsection($conn, $userId) {
    $subsectionId = intval($_POST['subsection_id'] ?? 0);
    $title = sanitizeInput($_POST['title'] ?? '');
    
    if ($subsectionId <= 0 || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Subsection ID and title are required']);
        return;
    }

    // Verify ownership
    if (!verifySubsectionOwnership($conn, $subsectionId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "UPDATE subsections SET title = ? WHERE id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('si', $title, $subsectionId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Subsection updated']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update subsection']);
    }
    
    $stmt->close();
}

function deleteSubsection($conn, $userId) {
    $subsectionId = intval($_POST['subsection_id'] ?? 0);
    
    if ($subsectionId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Subsection ID is required']);
        return;
    }

    // Verify ownership
    if (!verifySubsectionOwnership($conn, $subsectionId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "DELETE FROM subsections WHERE id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('i', $subsectionId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Subsection deleted']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete subsection']);
    }
    
    $stmt->close();
}

// ==================== VIDEOS ====================

function addVideo($conn, $userId) {
    $subsectionId = intval($_POST['subsection_id'] ?? 0);
    $title = sanitizeInput($_POST['title'] ?? '');
    $url = sanitizeInput($_POST['url'] ?? '');
    $videoType = sanitizeInput($_POST['video_type'] ?? 'url');
    
    if ($subsectionId <= 0 || empty($title) || empty($url)) {
        echo json_encode(['success' => false, 'message' => 'Subsection ID, title, and URL are required']);
        return;
    }

    // Verify ownership
    if (!verifySubsectionOwnership($conn, $subsectionId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "INSERT INTO videos (subsection_id, title, url, video_type, order_index) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM (SELECT order_index FROM videos WHERE subsection_id = ?) AS sub))";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('isssi', $subsectionId, $title, $url, $videoType, $subsectionId);
    
    if ($stmt->execute()) {
        $videoId = $stmt->insert_id;
        echo json_encode(['success' => true, 'message' => 'Video added', 'video_id' => $videoId]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add video']);
    }
    
    $stmt->close();
}

function getVideos($conn, $userId) {
    $subsectionId = intval($_POST['subsection_id'] ?? 0);
    
    if ($subsectionId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Subsection ID is required']);
        return;
    }

    // Verify ownership
    if (!verifySubsectionOwnership($conn, $subsectionId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "SELECT id, title, url, video_type, description, order_index FROM videos WHERE subsection_id = ? ORDER BY order_index ASC";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('i', $subsectionId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $videos = [];
    while ($row = $result->fetch_assoc()) {
        $videos[] = $row;
    }
    
    echo json_encode(['success' => true, 'videos' => $videos]);
    $stmt->close();
}

function updateVideo($conn, $userId) {
    $videoId = intval($_POST['video_id'] ?? 0);
    $title = sanitizeInput($_POST['title'] ?? '');
    $url = sanitizeInput($_POST['url'] ?? '');
    
    if ($videoId <= 0 || empty($title) || empty($url)) {
        echo json_encode(['success' => false, 'message' => 'Video ID, title, and URL are required']);
        return;
    }

    // Verify ownership
    if (!verifyVideoOwnership($conn, $videoId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "UPDATE videos SET title = ?, url = ? WHERE id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('ssi', $title, $url, $videoId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Video updated']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update video']);
    }
    
    $stmt->close();
}

function deleteVideo($conn, $userId) {
    $videoId = intval($_POST['video_id'] ?? 0);
    
    if ($videoId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        return;
    }

    // Verify ownership
    if (!verifyVideoOwnership($conn, $videoId, $userId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $query = "DELETE FROM videos WHERE id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Database error']);
        return;
    }

    $stmt->bind_param('i', $videoId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Video deleted']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete video']);
    }
    
    $stmt->close();
}

// Get full course structure (sections -> subsections -> videos)
function getFullCourseContent($conn, $userId) {
    $courseId = intval($_POST['course_id'] ?? 0);
    
    if ($courseId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Course ID is required']);
        return;
    }

    // Only verify ownership if user is a teacher
    // Students can view any public course content
    if ($userId) {
        // Check if the requesting user is a teacher by checking if they exist in teachers table
        $teacherQuery = "SELECT id FROM teachers WHERE id = ?";
        $teacherStmt = $conn->prepare($teacherQuery);
        $teacherStmt->bind_param('i', $userId);
        $teacherStmt->execute();
        $teacherResult = $teacherStmt->get_result();
        $isTeacher = $teacherResult->num_rows > 0;
        $teacherStmt->close();
        
        if ($isTeacher && !verifyCourseOwnership($conn, $courseId, $userId)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }
    }

    // Get sections with subsections and videos
    $query = "SELECT s.id, s.title, s.order_index FROM sections s WHERE s.course_id = ? ORDER BY s.order_index ASC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $courseId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $sections = [];
    while ($row = $result->fetch_assoc()) {
        $sectionId = $row['id'];
        
        // Get subsections for this section
        $subsQuery = "SELECT id, title, order_index FROM subsections WHERE section_id = ? ORDER BY order_index ASC";
        $subsStmt = $conn->prepare($subsQuery);
        $subsStmt->bind_param('i', $sectionId);
        $subsStmt->execute();
        $subsResult = $subsStmt->get_result();
        
        $subsections = [];
        while ($subsRow = $subsResult->fetch_assoc()) {
            $subsectionId = $subsRow['id'];
            
            // Get videos for this subsection
            $vidQuery = "SELECT id, title, url, video_type, description, order_index FROM videos WHERE subsection_id = ? ORDER BY order_index ASC";
            $vidStmt = $conn->prepare($vidQuery);
            $vidStmt->bind_param('i', $subsectionId);
            $vidStmt->execute();
            $vidResult = $vidStmt->get_result();
            
            $videos = [];
            while ($vidRow = $vidResult->fetch_assoc()) {
                $videos[] = $vidRow;
            }
            
            $subsRow['videos'] = $videos;
            $subsections[] = $subsRow;
            $vidStmt->close();
        }
        
        $row['subsections'] = $subsections;
        $sections[] = $row;
        $subsStmt->close();
    }
    
    echo json_encode(['success' => true, 'sections' => $sections]);
    $stmt->close();
}

// ==================== HELPER FUNCTIONS ====================

function verifyCourseOwnership($conn, $courseId, $userId) {
    $query = "SELECT id FROM courses WHERE id = ? AND teacher_id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ii', $courseId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $owns = $result->num_rows > 0;
    $stmt->close();
    
    return $owns;
}

function verifySectionOwnership($conn, $sectionId, $userId) {
    $query = "SELECT s.id FROM sections s 
              INNER JOIN courses c ON s.course_id = c.id 
              WHERE s.id = ? AND c.teacher_id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ii', $sectionId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $owns = $result->num_rows > 0;
    $stmt->close();
    
    return $owns;
}

function verifySubsectionOwnership($conn, $subsectionId, $userId) {
    $query = "SELECT sub.id FROM subsections sub 
              INNER JOIN sections s ON sub.section_id = s.id 
              INNER JOIN courses c ON s.course_id = c.id 
              WHERE sub.id = ? AND c.teacher_id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ii', $subsectionId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $owns = $result->num_rows > 0;
    $stmt->close();
    
    return $owns;
}

function verifyVideoOwnership($conn, $videoId, $userId) {
    $query = "SELECT v.id FROM videos v 
              INNER JOIN subsections sub ON v.subsection_id = sub.id 
              INNER JOIN sections s ON sub.section_id = s.id 
              INNER JOIN courses c ON s.course_id = c.id 
              WHERE v.id = ? AND c.teacher_id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ii', $videoId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $owns = $result->num_rows > 0;
    $stmt->close();
    
    return $owns;
}

function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}
?>
