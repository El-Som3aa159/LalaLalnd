/**
 * API Configuration
 * Points to PHP backend running on localhost via XAMPP
 */

// PHP API Base URL (relative paths work when served from same origin)
const API_BASE_URL = window.location.origin; // http://localhost or http://127.0.0.1

// API Endpoints - Using PHP files
const API_ENDPOINTS = {
    // Auth - auth.php
    AUTH_REGISTER_STUDENT: `${API_BASE_URL}/LalaLalnd/auth.php?action=register_student`,
    AUTH_REGISTER_TEACHER: `${API_BASE_URL}/LalaLalnd/auth.php?action=register_teacher`,
    AUTH_LOGIN: `${API_BASE_URL}/LalaLalnd/auth.php?action=login`,
    
    // Courses - courses.php
    COURSES_LIST: `${API_BASE_URL}/LalaLalnd/courses.php?action=list`,
    COURSE_GET: (id) => `${API_BASE_URL}/LalaLalnd/courses.php?action=get&course_id=${id}`,
    COURSE_CREATE: `${API_BASE_URL}/LalaLalnd/courses.php?action=create`,
    COURSE_UPDATE: (id) => `${API_BASE_URL}/LalaLalnd/courses.php?action=update&course_id=${id}`,
    COURSE_DELETE: (id) => `${API_BASE_URL}/LalaLalnd/courses.php?action=delete&course_id=${id}`,
    
    // Sections - sections.php
    SECTION_GET: (id) => `${API_BASE_URL}/LalaLalnd/sections.php?action=get&section_id=${id}`,
    SECTION_CREATE: `${API_BASE_URL}/LalaLalnd/sections.php?action=create`,
    SECTION_UPDATE: (id) => `${API_BASE_URL}/LalaLalnd/sections.php?action=update&section_id=${id}`,
    SECTION_DELETE: (id) => `${API_BASE_URL}/LalaLalnd/sections.php?action=delete&section_id=${id}`,
    SUBSECTION_CREATE: `${API_BASE_URL}/LalaLalnd/sections.php?action=create_subsection`,
    
    // Videos - videos.php
    VIDEO_GET: (id) => `${API_BASE_URL}/LalaLalnd/videos.php?action=get&video_id=${id}`,
    VIDEO_CREATE: `${API_BASE_URL}/LalaLalnd/videos.php?action=create`,
    VIDEO_UPDATE: (id) => `${API_BASE_URL}/LalaLalnd/videos.php?action=update&video_id=${id}`,
    VIDEO_DELETE: (id) => `${API_BASE_URL}/LalaLalnd/videos.php?action=delete&video_id=${id}`,
    
    // Enrollments - enrollments.php
    ENROLL_STUDENT: `${API_BASE_URL}/LalaLalnd/enrollments.php?action=enroll`,
    UNENROLL_STUDENT: `${API_BASE_URL}/LalaLalnd/enrollments.php?action=unenroll`,
    CHECK_ENROLLMENT: `${API_BASE_URL}/LalaLalnd/enrollments.php?action=check`,
    GET_ENROLLMENTS: (studentId) => `${API_BASE_URL}/LalaLalnd/enrollments.php?action=list&studentId=${studentId}`,
    
    // Admin - admin.php & data_export.php
    ADMIN_STUDENTS: `${API_BASE_URL}/LalaLalnd/admin.php?action=list_students`,
    ADMIN_TEACHERS: `${API_BASE_URL}/LalaLalnd/admin.php?action=list_teachers`,
    ADMIN_COURSES: `${API_BASE_URL}/LalaLalnd/admin.php?action=list_courses`,
    ADMIN_ENROLLMENTS: `${API_BASE_URL}/LalaLalnd/admin.php?action=list_enrollments`,
    ADMIN_EXPORT_STUDENTS: `${API_BASE_URL}/LalaLalnd/data_export.php?action=export_students`,
    ADMIN_EXPORT_TEACHERS: `${API_BASE_URL}/LalaLalnd/data_export.php?action=export_teachers`,
    ADMIN_EXPORT_COURSES: `${API_BASE_URL}/LalaLalnd/data_export.php?action=export_courses`,
};

// Helper function for API calls
async function apiCall(method, url, data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
