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
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'get_courses_as_json') {
        exportCoursesToJSON();
    } elseif ($action === 'get_students_as_json') {
        exportStudentsToJSON();
    } elseif ($action === 'get_teachers_as_json') {
        exportTeachersToJSON();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function exportCoursesToJSON() {
    global $conn;
    
    $query = "SELECT c.*, t.full_name as teacher_name FROM courses c 
              LEFT JOIN teachers t ON c.teacher_id = t.id";
    $result = $conn->query($query);

    $courses = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $row['sections'] = getCourseSections($conn, $row['id']);
            $courses[$row['course_code']] = $row;
        }
    }

    // Save to JSON file
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }
    file_put_contents('data/courses_export.json', json_encode($courses, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode(['success' => true, 'message' => 'Courses exported to JSON', 'data' => $courses]);
}

function exportStudentsToJSON() {
    global $conn;
    
    $result = $conn->query("SELECT id, full_name, email, created_at FROM students");

    $students = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $students[$row['email']] = $row;
        }
    }

    // Save to JSON file
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }
    file_put_contents('data/students_export.json', json_encode($students, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode(['success' => true, 'message' => 'Students exported to JSON', 'data' => $students]);
}

function exportTeachersToJSON() {
    global $conn;
    
    $result = $conn->query("SELECT id, full_name, email, specialization, created_at FROM teachers");

    $teachers = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $teachers[$row['email']] = $row;
        }
    }

    // Save to JSON file
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }
    file_put_contents('data/teachers_export.json', json_encode($teachers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode(['success' => true, 'message' => 'Teachers exported to JSON', 'data' => $teachers]);
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
?>
