-- Database Creation
CREATE DATABASE IF NOT EXISTS lalaland_db;
USE lalaland_db;

-- 1. Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    specialization VARCHAR(100),
    grades JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    grade VARCHAR(10),
    balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    teacher_id INT NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0.00,
    image_color VARCHAR(20) DEFAULT '#6c5ce7',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 4. Sections Table (Main chapters/units)
CREATE TABLE IF NOT EXISTS sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 5. SubSections Table (Topics within a section)
CREATE TABLE IF NOT EXISTS subsections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- 6. Videos/Content Table
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subsection_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    url TEXT, -- URL or file path
    video_type ENUM('url', 'local', 'file') DEFAULT 'url',
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subsection_id) REFERENCES subsections(id) ON DELETE CASCADE
);

-- 7. Enrollments Table (Many-to-Many relationship between Students and Courses)
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- Optional: Insert some initial data based on data.js

-- Insert Teachers (Passwords should be hashed in real app, using plain text for demo if needed, but 'password123' hash here)
-- Assuming password hash for 'password123'
INSERT IGNORE INTO teachers (full_name, email, password_hash, specialization, grades) VALUES 
('أ. محمد الفقي', 'mohamed@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'اللغة العربية', '["الصف الأول","الصف الثاني","الصف الثالث"]'),
('د. سارة أحمد', 'sara@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'الكيمياء', '["الصف الثاني","الصف الثالث"]'),
('م. محمود حسن', 'mahmoud@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'الفيزياء', '["الصف الأول","الصف الثاني"]');

-- Insert Courses (without course_code as it was removed from schema)
INSERT IGNORE INTO courses (title, subtitle, description, teacher_id, price, image_color) VALUES 
('اللغة العربية (ثانوية عامة)', 'شرح شامل للمنهج مع تدريبات مكثفة', 'هذا الكورس يغطي كافة فروع اللغة العربية للثانوية العامة...', 1, 200.00, '#e17055'),
('الكيمياء (ثانوية عامة)', 'افهم الكيمياء ببساطة وعمق', 'كورس الكيمياء الشامل للصف الثالث الثانوي...', 2, 200.00, '#0984e3'),
('الفيزياء (ثانوية عامة)', 'الفيزياء كما لم تعرفها من قبل', 'دورة متكاملة في الفيزياء...', 3, 200.00, '#6c5ce7');
