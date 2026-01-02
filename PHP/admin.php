<?php
header('Content-Type: text/html; charset=utf-8');
require_once 'db_connect.php';

// Simple security - in production, add proper authentication
$password = $_POST['password'] ?? $_GET['password'] ?? '';
$authenticated = ($password === 'admin123'); // Change this password!

if (!$authenticated) {
    ?>
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>لوحة التحكم - LalaLand</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Cairo', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .login-container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                width: 100%;
                max-width: 400px;
            }
            h1 {
                text-align: center;
                margin-bottom: 30px;
                color: #333;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 10px;
                color: #555;
                font-weight: bold;
            }
            input {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                font-family: 'Cairo', Arial;
                transition: border-color 0.3s;
            }
            input:focus {
                outline: none;
                border-color: #667eea;
            }
            button {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                font-family: 'Cairo', Arial;
                cursor: pointer;
                transition: transform 0.3s;
            }
            button:hover {
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h1>🔐 لوحة التحكم</h1>
            <form method="POST">
                <div class="form-group">
                    <label for="password">كلمة المرور:</label>
                    <input type="password" id="password" name="password" placeholder="أدخل كلمة المرور" required>
                </div>
                <button type="submit">الدخول</button>
            </form>
        </div>
    </body>
    </html>
    <?php
    exit();
}

// If authenticated, show the admin panel
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم - LalaLand</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Cairo', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #333;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .logout-btn {
            background: #d63031;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: 'Cairo', Arial;
        }
        .section {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h2 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: right;
            font-weight: bold;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        tr:hover {
            background: #f9f9f9;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .empty {
            text-align: center;
            color: #999;
            padding: 20px;
        }
        .delete-btn {
            background: #d63031;
            color: white;
            padding: 5px 10px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.85em;
        }
        .delete-btn:hover {
            background: #b71c1c;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 لوحة التحكم - LalaLand</h1>
            <a href="?logout=1" class="logout-btn">تسجيل الخروج</a>
        </div>

        <!-- Statistics -->
        <div class="stats">
            <?php
            $students_count = $conn->query("SELECT COUNT(*) as count FROM students")->fetch_assoc()['count'];
            $teachers_count = $conn->query("SELECT COUNT(*) as count FROM teachers")->fetch_assoc()['count'];
            $courses_count = $conn->query("SELECT COUNT(*) as count FROM courses")->fetch_assoc()['count'];
            $enrollments_count = $conn->query("SELECT COUNT(*) as count FROM enrollments")->fetch_assoc()['count'];
            ?>
            <div class="stat-card">
                <div class="stat-label">👨‍🎓 الطلاب</div>
                <div class="stat-number"><?php echo $students_count; ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">👨‍🏫 المعلمون</div>
                <div class="stat-number"><?php echo $teachers_count; ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">📚 الكورسات</div>
                <div class="stat-number"><?php echo $courses_count; ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">✓ التسجيلات</div>
                <div class="stat-number"><?php echo $enrollments_count; ?></div>
            </div>
        </div>

        <!-- Students Section -->
        <div class="section">
            <h2>👨‍🎓 الطلاب المسجلون</h2>
            <?php
            $result = $conn->query("SELECT id, full_name, email, created_at FROM students ORDER BY created_at DESC");
            if ($result->num_rows > 0) {
                echo "<table>
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>الاسم</th>
                            <th>البريد الإلكتروني</th>
                            <th>تاريخ التسجيل</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>";
                while ($row = $result->fetch_assoc()) {
                    echo "<tr>
                        <td>{$row['id']}</td>
                        <td>{$row['full_name']}</td>
                        <td>{$row['email']}</td>
                        <td>" . date('Y-m-d H:i', strtotime($row['created_at'])) . "</td>
                        <td><a href='#' class='delete-btn' onclick='deleteStudent({$row['id']}); return false;'>حذف</a></td>
                    </tr>";
                }
                echo "</tbody></table>";
            } else {
                echo "<div class='empty'>لا توجد بيانات طلاب حتى الآن</div>";
            }
            ?>
        </div>

        <!-- Teachers Section -->
        <div class="section">
            <h2>👨‍🏫 المعلمون المسجلون</h2>
            <?php
            $result = $conn->query("SELECT id, full_name, email, specialization, created_at FROM teachers ORDER BY created_at DESC");
            if ($result->num_rows > 0) {
                echo "<table>
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>الاسم</th>
                            <th>البريد الإلكتروني</th>
                            <th>التخصص</th>
                            <th>تاريخ التسجيل</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>";
                while ($row = $result->fetch_assoc()) {
                    echo "<tr>
                        <td>{$row['id']}</td>
                        <td>{$row['full_name']}</td>
                        <td>{$row['email']}</td>
                        <td>{$row['specialization']}</td>
                        <td>" . date('Y-m-d H:i', strtotime($row['created_at'])) . "</td>
                        <td><a href='#' class='delete-btn' onclick='deleteTeacher({$row['id']}); return false;'>حذف</a></td>
                    </tr>";
                }
                echo "</tbody></table>";
            } else {
                echo "<div class='empty'>لا توجد بيانات معلمين حتى الآن</div>";
            }
            ?>
        </div>

        <!-- Courses Section -->
        <div class="section">
            <h2>📚 الكورسات</h2>
            <?php
            $result = $conn->query("SELECT c.*, t.full_name as teacher_name FROM courses c LEFT JOIN teachers t ON c.teacher_id = t.id ORDER BY c.created_at DESC");
            if ($result->num_rows > 0) {
                echo "<table>
                    <thead>
                        <tr>
                            <th>الرقم</th>
                            <th>الكورس</th>
                            <th>المعلم</th>
                            <th>السعر</th>
                            <th>تاريخ الإنشاء</th>
                        </tr>
                    </thead>
                    <tbody>";
                while ($row = $result->fetch_assoc()) {
                    $teacher = $row['teacher_name'] ?? 'لم يتم التعيين';
                    echo "<tr>
                        <td>{$row['id']}</td>
                        <td>{$row['title']}</td>
                        <td>{$teacher}</td>
                        <td>SR {$row['price']}</td>
                        <td>" . date('Y-m-d H:i', strtotime($row['created_at'])) . "</td>
                    </tr>";
                }
                echo "</tbody></table>";
            } else {
                echo "<div class='empty'>لا توجد كورسات حتى الآن</div>";
            }
            ?>
        </div>

        <!-- Enrollments Section -->
        <div class="section">
            <h2>✓ تسجيلات الطلاب في الكورسات</h2>
            <?php
            $result = $conn->query("SELECT e.*, s.full_name as student_name, c.title as course_title FROM enrollments e 
                                    JOIN students s ON e.student_id = s.id 
                                    JOIN courses c ON e.course_id = c.id 
                                    ORDER BY e.enrolled_at DESC");
            if ($result->num_rows > 0) {
                echo "<table>
                    <thead>
                        <tr>
                            <th>الطالب</th>
                            <th>الكورس</th>
                            <th>تاريخ التسجيل</th>
                        </tr>
                    </thead>
                    <tbody>";
                while ($row = $result->fetch_assoc()) {
                    echo "<tr>
                        <td>{$row['student_name']}</td>
                        <td>{$row['course_title']}</td>
                        <td>" . date('Y-m-d H:i', strtotime($row['enrolled_at'])) . "</td>
                    </tr>";
                }
                echo "</tbody></table>";
            } else {
                echo "<div class='empty'>لا توجد تسجيلات حتى الآن</div>";
            }
            ?>
        </div>

        <!-- JSON Data Export -->
        <div class="section">
            <h2>📁 تصدير البيانات</h2>
            <p>يمكنك تصدير جميع البيانات كملفات JSON:</p>
            <br>
            <a href="data_export.php?action=get_students_as_json" style="display: inline-block; margin: 5px; padding: 10px 20px; background: #667eea; color: white; border-radius: 5px; text-decoration: none;">📥 الطلاب (JSON)</a>
            <a href="data_export.php?action=get_teachers_as_json" style="display: inline-block; margin: 5px; padding: 10px 20px; background: #667eea; color: white; border-radius: 5px; text-decoration: none;">📥 المعلمون (JSON)</a>
            <a href="data_export.php?action=get_courses_as_json" style="display: inline-block; margin: 5px; padding: 10px 20px; background: #667eea; color: white; border-radius: 5px; text-decoration: none;">📥 الكورسات (JSON)</a>
        </div>
    </div>

    <script>
        function deleteStudent(id) {
            if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
                fetch('admin.php?password=<?php echo urlencode($password); ?>', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'delete_student',
                        id: id
                    })
                }).then(() => location.reload());
            }
        }

        function deleteTeacher(id) {
            if (confirm('هل أنت متأكد من حذف هذا المعلم؟')) {
                fetch('admin.php?password=<?php echo urlencode($password); ?>', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'delete_teacher',
                        id: id
                    })
                }).then(() => location.reload());
            }
        }
    </script>
</body>
</html>

<?php
// Handle logout
if (isset($_GET['logout'])) {
    header('Location: admin.php');
    exit();
}

// Handle DELETE requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if ($data['action'] === 'delete_student') {
        $conn->query("DELETE FROM students WHERE id = " . intval($data['id']));
    } elseif ($data['action'] === 'delete_teacher') {
        $conn->query("DELETE FROM teachers WHERE id = " . intval($data['id']));
    }
}
?>
