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

switch ($method) {
    case 'GET':
        if ($action === 'get') {
            getVideo($conn, $_GET['video_id'] ?? $_GET['videoId'] ?? '');
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request']);
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createVideo($conn, $data);
        } elseif ($action === 'update') {
            updateVideo($conn, $data);
        } elseif ($action === 'delete') {
            deleteVideo($conn, $data);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function getVideo($conn, $video_id) {
    if (empty($video_id)) {
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        return;
    }

    $stmt = $conn->prepare("SELECT * FROM videos WHERE id = ?");
    $stmt->bind_param("i", $video_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(['success' => true, 'data' => $result->fetch_assoc()]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Video not found']);
    }
}

function createVideo($conn, $data) {
    $subsection_id = $data['subsection_id'] ?? $data['subsectionId'] ?? '';
    $title = $data['title'] ?? '';
    $url = $data['url'] ?? '';
    $video_type = $data['video_type'] ?? $data['videoType'] ?? 'url';
    $description = $data['description'] ?? '';
    $order_index = $data['order_index'] ?? $data['orderIndex'] ?? 0;

    if (empty($subsection_id) || empty($title) || empty($url)) {
        echo json_encode(['success' => false, 'message' => 'Subsection ID, title, and URL are required']);
        return;
    }

    $stmt = $conn->prepare("INSERT INTO videos (subsection_id, title, url, video_type, description, order_index) 
                            VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("issssi", $subsection_id, $title, $url, $video_type, $description, $order_index);

    if ($stmt->execute()) {
        $video_id = $stmt->insert_id;
        echo json_encode(['success' => true, 'message' => 'Video created successfully', 'video_id' => $video_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error creating video']);
    }
}

function updateVideo($conn, $data) {
    $video_id = $data['video_id'] ?? $data['videoId'] ?? '';
    $title = $data['title'] ?? '';
    $url = $data['url'] ?? '';
    $description = $data['description'] ?? '';
    $order_index = $data['order_index'] ?? $data['orderIndex'] ?? 0;

    if (empty($video_id) || empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Video ID and title are required']);
        return;
    }

    $stmt = $conn->prepare("UPDATE videos SET title = ?, url = ?, description = ?, order_index = ? WHERE id = ?");
    $stmt->bind_param("sssii", $title, $url, $description, $order_index, $video_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Video updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error updating video']);
    }
}

function deleteVideo($conn, $data) {
    $video_id = $data['video_id'] ?? $data['videoId'] ?? '';

    if (empty($video_id)) {
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM videos WHERE id = ?");
    $stmt->bind_param("i", $video_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Video deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error deleting video']);
    }
}
?>
