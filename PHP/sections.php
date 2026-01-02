<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? $_POST['action'] ?? $data['action'] ?? '';
$section_id = $_GET['section_id'] ?? $_POST['section_id'] ?? $data['section_id'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'get' && $section_id) {
            getSection($conn, $section_id);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request']);
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createSection($conn, $data);
        } elseif ($action === 'update') {
            updateSection($conn, $data);
        } elseif ($action === 'delete') {
            deleteSection($conn, $data);
        } elseif ($action === 'add_subsection') {
            addSubSection($conn, $data);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function getSection($conn, $section_id) {
    $stmt = $conn->prepare("SELECT * FROM sections WHERE id = ?");
    $stmt->bind_param("i", $section_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $section = $result->fetch_assoc();
        $section['subSections'] = getSubSections($conn, $section_id);
        echo json_encode(['success' => true, 'data' => $section]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Section not found']);
    }
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

function createSection($conn, $data) {
    $course_id = $data['course_id'] ?? $data['courseId'] ?? '';
    $title = $data['title'] ?? '';
    $order_index = $data['order_index'] ?? $data['orderIndex'] ?? 0;

    if (empty($course_id) || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Course ID and title are required']);
        return;
    }

    $stmt = $conn->prepare("INSERT INTO sections (course_id, title, order_index) VALUES (?, ?, ?)");
    $stmt->bind_param("isi", $course_id, $title, $order_index);

    if ($stmt->execute()) {
        $section_id = $stmt->insert_id;
        echo json_encode(['success' => true, 'message' => 'Section created successfully', 'section_id' => $section_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error creating section']);
    }
}

function updateSection($conn, $data) {
    $section_id = $data['section_id'] ?? $data['sectionId'] ?? '';
    $title = $data['title'] ?? '';
    $order_index = $data['order_index'] ?? $data['orderIndex'] ?? 0;

    if (empty($section_id) || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Section ID and title are required']);
        return;
    }

    $stmt = $conn->prepare("UPDATE sections SET title = ?, order_index = ? WHERE id = ?");
    $stmt->bind_param("sii", $title, $order_index, $section_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Section updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error updating section']);
    }
}

function deleteSection($conn, $data) {
    $section_id = $data['section_id'] ?? $data['sectionId'] ?? '';

    if (empty($section_id)) {
        echo json_encode(['success' => false, 'message' => 'Section ID is required']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM sections WHERE id = ?");
    $stmt->bind_param("i", $section_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Section deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error deleting section']);
    }
}

function addSubSection($conn, $data) {
    $section_id = $data['section_id'] ?? $data['sectionId'] ?? '';
    $title = $data['title'] ?? '';
    $order_index = $data['order_index'] ?? $data['orderIndex'] ?? 0;

    if (empty($section_id) || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Section ID and title are required']);
        return;
    }

    $stmt = $conn->prepare("INSERT INTO subsections (section_id, title, order_index) VALUES (?, ?, ?)");
    $stmt->bind_param("isi", $section_id, $title, $order_index);

    if ($stmt->execute()) {
        $subsection_id = $stmt->insert_id;
        echo json_encode(['success' => true, 'message' => 'SubSection created successfully', 'subsection_id' => $subsection_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error creating subsection']);
    }
}
?>
