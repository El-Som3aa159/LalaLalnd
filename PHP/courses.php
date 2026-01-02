<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? $_POST['action'] ?? $data['action'] ?? '';
$course_id = $_GET['course_id'] ?? $_POST['course_id'] ?? $data['course_id'] ?? '';
$teacher_id = $_GET['teacher_id'] ?? $_POST['teacher_id'] ?? $data['teacher_id'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'list') {
            getAllCourses();
        } elseif ($action === 'get' && $course_id) {
            getCourse($conn, $course_id);
        } elseif ($action === 'get_teacher' && $teacher_id) {
            getTeacherProfile($conn, $teacher_id);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request']);
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createCourse($conn, $data);
        } elseif ($action === 'update') {
            updateCourse($conn, $data);
        } elseif ($action === 'delete') {
            deleteCourse($conn, $data);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function getAllCourses() {
    global $conn;
    $query = "SELECT c.*, t.full_name as teacher_name FROM courses c 
              LEFT JOIN teachers t ON c.teacher_id = t.id";
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $courses = [];
        while ($row = $result->fetch_assoc()) {
            $row['sections'] = getCourseSections($conn, $row['id']);
            $courses[] = $row;
        }
        echo json_encode(['success' => true, 'data' => $courses]);
    } else {
        echo json_encode(['success' => true, 'data' => []]);
    }
}

function getCourse($conn, $course_id) {
    $stmt = $conn->prepare("SELECT c.*, t.full_name as teacher_name FROM courses c 
                            LEFT JOIN teachers t ON c.teacher_id = t.id WHERE c.id = ?");
    $stmt->bind_param("i", $course_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $course = $result->fetch_assoc();
        $course['sections'] = getCourseSections($conn, $course_id);
        echo json_encode(['success' => true, 'data' => $course]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Course not found']);
    }
}

function getCourseSections($conn, $course_id) {
    $stmt = $conn->prepare("SELECT * FROM sections WHERE course_id = ? ORDER BY order_index");
    $stmt->bind_param("i", $course_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $sections = [];
    while ($section = $result->fetch_assoc()) {
        $section['subSections'] = getSubSections($conn, $section['id']);
        $sections[] = $section;
    }
    return $sections;
}

function getSubSections($conn, $section_id) {
    $stmt = $conn->prepare("SELECT * FROM subsections WHERE section_id = ? ORDER BY order_index");
    $stmt->bind_param("i", $section_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $subsections = [];
    while ($subsection = $result->fetch_assoc()) {
        $subsection['videos'] = getVideos($conn, $subsection['id']);
        $subsections[] = $subsection;
    }
    return $subsections;
}

function getVideos($conn, $subsection_id) {
    $stmt = $conn->prepare("SELECT * FROM videos WHERE subsection_id = ? ORDER BY order_index");
    $stmt->bind_param("i", $subsection_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $videos = [];
    while ($video = $result->fetch_assoc()) {
        $videos[] = $video;
    }
    return $videos;
}

function createCourse($conn, $data) {
    $course_code = $data['courseCode'] ?? $data['course_code'] ?? '';
    $title = $data['title'] ?? '';
    $subtitle = $data['subtitle'] ?? '';
    $description = $data['description'] ?? '';
    $teacher_id = $data['teacher_id'] ?? $data['teacherId'] ?? null;
    $price = $data['price'] ?? 0;
    $image_color = $data['imageColor'] ?? $data['image_color'] ?? '#ffffff';

    if (empty($course_code) || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Course code and title are required']);
        return;
    }

    $stmt = $conn->prepare("INSERT INTO courses (course_code, title, subtitle, description, teacher_id, price, image_color) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssids", $course_code, $title, $subtitle, $description, $teacher_id, $price, $image_color);

    if ($stmt->execute()) {
        $course_id = $stmt->insert_id;
        saveCourseToJSON($course_id, $course_code, $title, $subtitle, $description, $teacher_id, $price, $image_color);
        echo json_encode(['success' => true, 'message' => 'Course created successfully', 'course_id' => $course_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error creating course']);
    }
}

function updateCourse($conn, $data) {
    $course_id = $data['course_id'] ?? $data['courseId'] ?? '';
    $title = $data['title'] ?? '';
    $subtitle = $data['subtitle'] ?? '';
    $description = $data['description'] ?? '';
    $price = $data['price'] ?? 0;

    if (empty($course_id) || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Course ID and title are required']);
        return;
    }

    $stmt = $conn->prepare("UPDATE courses SET title = ?, subtitle = ?, description = ?, price = ? WHERE id = ?");
    $stmt->bind_param("sssii", $title, $subtitle, $description, $price, $course_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Course updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error updating course']);
    }
}

function deleteCourse($conn, $data) {
    $course_id = $data['course_id'] ?? $data['courseId'] ?? '';

    if (empty($course_id)) {
        echo json_encode(['success' => false, 'message' => 'Course ID is required']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM courses WHERE id = ?");
    $stmt->bind_param("i", $course_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Course deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error deleting course']);
    }
}

function saveCourseToJSON($course_id, $course_code, $title, $subtitle, $description, $teacher_id, $price, $image_color) {
    $json_file = 'data/courses.json';
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }

    $courses = [];
    if (file_exists($json_file)) {
        $courses = json_decode(file_get_contents($json_file), true) ?? [];
    }

    $courses[$course_code] = [
        'id' => $course_id,
        'course_code' => $course_code,
        'title' => $title,
        'subtitle' => $subtitle,
        'description' => $description,
        'teacher_id' => $teacher_id,
        'price' => $price,
        'image_color' => $image_color,
        'sections' => [],
        'created_at' => date('Y-m-d H:i:s')
    ];

    file_put_contents($json_file, json_encode($courses, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function getTeacherProfile($conn, $teacher_id) {
    // Get teacher info including bio
    $stmt = $conn->prepare("SELECT id, full_name, specialization, bio FROM teachers WHERE id = ?");
    $stmt->bind_param("i", $teacher_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Teacher not found']);
        return;
    }
    
    $teacher = $result->fetch_assoc();
    
    // Get all courses by this teacher
    $courseStmt = $conn->prepare("SELECT id, title, subtitle, description, price FROM courses WHERE teacher_id = ? ORDER BY created_at DESC");
    $courseStmt->bind_param("i", $teacher_id);
    $courseStmt->execute();
    $courseResult = $courseStmt->get_result();
    
    $courses = [];
    while ($row = $courseResult->fetch_assoc()) {
        $courses[] = $row;
    }
    
    $teacher['courses'] = $courses;
    echo json_encode(['success' => true, 'data' => $teacher]);
}
?>
