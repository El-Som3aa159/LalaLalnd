/**
 * Data Service Layer
 * Bridges frontend (localStorage/IndexedDB) with PHP backend (MySQL)
 * 
 * This service provides:
 * - Data fetching from PHP backend
 * - Local caching with localStorage/IndexedDB
 * - Image and video file uploads
 * - Fallback to localStorage if backend unavailable
 */

// ==================== Database & Storage Setup ====================

// IndexedDB for large files (images, videos)
let db = null;
const DB_NAME = 'LalaLandDB';
const STORES = {
    IMAGES: 'images',
    VIDEOS: 'videos'
};

// Initialize IndexedDB
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.IMAGES)) {
                db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
                db.createObjectStore(STORES.VIDEOS, { keyPath: 'id' });
            }
        };
    });
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndexedDB);
} else {
    initIndexedDB().catch(e => console.warn('IndexedDB not available:', e));
}

// ==================== COURSES ====================

/**
 * Get all courses from backend or localStorage
 * @returns {Object} Courses indexed by course ID
 */
async function getCourses() {
    try {
        // Try to fetch from backend first
        const response = await fetch('PHP/courses.php?action=list');
        if (!response.ok) throw new Error('Backend unavailable');
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
            // Convert array to object indexed by ID
            const coursesObj = {};
            data.data.forEach(course => {
                coursesObj[course.id] = course;
            });
            
            // Cache in localStorage
            localStorage.setItem('coursesDB', JSON.stringify(coursesObj));
            return coursesObj;
        }
    } catch (error) {
        console.warn('Failed to fetch from backend, using localStorage:', error);
    }
    
    // Fallback to localStorage
    const cached = localStorage.getItem('coursesDB');
    return cached ? JSON.parse(cached) : {};
}

/**
 * Save/Create a course
 * @param {Object} courseData - Course information
 * @returns {Promise<Object>} Result with success status and course data
 */
async function saveCourse(courseData) {
    try {
        // Prepare form data
        const formData = new FormData();
        Object.keys(courseData).forEach(key => {
            if (key !== 'sections' && key !== 'subSections' && key !== 'imageFile') {
                formData.append(key, courseData[key]);
            }
        });
        
        formData.append('action', courseData.id ? 'update' : 'create');
        
        // Send to backend
        const response = await fetch('PHP/courses.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Also cache in localStorage for quick access
            const courses = await getCourses();
            courseData.id = result.course_id || courseData.id;
            courses[courseData.id] = courseData;
            localStorage.setItem('coursesDB', JSON.stringify(courses));
            
            return { success: true, course_id: courseData.id };
        }
        
        throw new Error(result.message || 'Failed to save course');
    } catch (error) {
        console.error('Error saving course:', error);
        
        // Fallback: save to localStorage only
        const courses = JSON.parse(localStorage.getItem('coursesDB') || '{}');
        courseData.id = courseData.id || 'course_' + Date.now();
        courses[courseData.id] = courseData;
        localStorage.setItem('coursesDB', JSON.stringify(courses));
        
        return { success: true, course_id: courseData.id, offline: true };
    }
}

/**
 * Delete a course
 * @param {number|string} courseId - Course ID
 * @returns {Promise<Object>} Result with success status
 */
async function deleteCourse(courseId) {
    try {
        const response = await fetch('PHP/courses.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                course_id: courseId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update localStorage
            const courses = JSON.parse(localStorage.getItem('coursesDB') || '{}');
            delete courses[courseId];
            localStorage.setItem('coursesDB', JSON.stringify(courses));
            
            return { success: true };
        }
        
        throw new Error(result.message);
    } catch (error) {
        console.error('Error deleting course:', error);
        
        // Fallback: delete from localStorage
        const courses = JSON.parse(localStorage.getItem('coursesDB') || '{}');
        delete courses[courseId];
        localStorage.setItem('coursesDB', JSON.stringify(courses));
        
        return { success: true, offline: true };
    }
}

// ==================== IMAGES ====================

/**
 * Save image to IndexedDB and backend
 * @param {File} imageFile - Image file object
 * @returns {Promise<string>} Image ID
 */
async function saveImageToDB(imageFile) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const imageId = 'img_' + Date.now();
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const imageData = {
                id: imageId,
                name: imageFile.name,
                type: imageFile.type,
                data: e.target.result,
                timestamp: Date.now()
            };
            
            try {
                // Save to IndexedDB
                const transaction = db.transaction([STORES.IMAGES], 'readwrite');
                const store = transaction.objectStore(STORES.IMAGES);
                store.put(imageData);
                
                // Try to upload to backend (optional)
                const formData = new FormData();
                formData.append('action', 'upload_image');
                formData.append('image', imageFile);
                
                try {
                    const response = await fetch('PHP/videos.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            console.log('Image uploaded to backend');
                        }
                    }
                } catch (err) {
                    console.warn('Could not upload image to backend:', err);
                }
                
                resolve(imageId);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(imageFile);
    });
}

/**
 * Retrieve image from IndexedDB
 * @param {string} imageId - Image ID
 * @returns {Promise<Blob>} Image blob
 */
async function getImageFromDB(imageId) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.IMAGES], 'readonly');
        const store = transaction.objectStore(STORES.IMAGES);
        const request = store.get(imageId);
        
        request.onsuccess = () => {
            const imageData = request.result;
            if (imageData) {
                const blob = new Blob([imageData.data], { type: imageData.type });
                resolve(blob);
            } else {
                reject(new Error('Image not found'));
            }
        };
        
        request.onerror = () => reject(request.error);
    });
}

// ==================== VIDEOS ====================

/**
 * Save video to IndexedDB and backend
 * @param {File} videoFile - Video file object
 * @returns {Promise<string>} Video ID
 */
async function saveVideoToDB(videoFile) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const videoId = 'vid_' + Date.now();
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const videoData = {
                id: videoId,
                name: videoFile.name,
                type: videoFile.type,
                size: videoFile.size,
                data: e.target.result,
                timestamp: Date.now()
            };
            
            try {
                // Save to IndexedDB
                const transaction = db.transaction([STORES.VIDEOS], 'readwrite');
                const store = transaction.objectStore(STORES.VIDEOS);
                store.put(videoData);
                
                // Try to upload to backend
                const formData = new FormData();
                formData.append('action', 'upload_video');
                formData.append('video', videoFile);
                
                try {
                    const response = await fetch('PHP/videos.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            console.log('Video uploaded to backend:', result.video_id);
                            // Could use backend video ID instead
                        }
                    }
                } catch (err) {
                    console.warn('Could not upload video to backend:', err);
                }
                
                resolve(videoId);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(videoFile);
    });
}

/**
 * Retrieve video from IndexedDB
 * @param {string} videoId - Video ID
 * @returns {Promise<Blob>} Video blob
 */
async function getVideoFromDB(videoId) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.VIDEOS], 'readonly');
        const store = transaction.objectStore(STORES.VIDEOS);
        const request = store.get(videoId);
        
        request.onsuccess = () => {
            const videoData = request.result;
            if (videoData) {
                const blob = new Blob([videoData.data], { type: videoData.type });
                resolve(blob);
            } else {
                reject(new Error('Video not found'));
            }
        };
        
        request.onerror = () => reject(request.error);
    });
}

// ==================== SECTIONS ====================

/**
 * Create a section in a course
 * @param {number|string} courseId - Course ID
 * @param {Object} sectionData - Section information
 * @returns {Promise<Object>} Result with section_id
 */
async function createSection(courseId, sectionData) {
    try {
        const payload = {
            action: 'create',
            course_id: courseId,
            title: sectionData.title,
            ...sectionData
        };
        
        const response = await fetch('PHP/sections.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            return { success: true, section_id: result.section_id };
        }
        
        throw new Error(result.message);
    } catch (error) {
        console.error('Error creating section:', error);
        
        // Fallback: create local ID
        return {
            success: true,
            section_id: sectionData.id || 'sec_' + Date.now(),
            offline: true
        };
    }
}

/**
 * Delete a section
 * @param {number|string} sectionId - Section ID
 * @returns {Promise<Object>} Result with success status
 */
async function deleteSection(sectionId) {
    try {
        const response = await fetch('PHP/sections.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                section_id: sectionId
            })
        });
        
        const result = await response.json();
        return result.success ? { success: true } : Promise.reject(result.message);
    } catch (error) {
        console.error('Error deleting section:', error);
        return { success: true, offline: true };
    }
}

// ==================== VIDEOS (Content) ====================

/**
 * Create a video/content item
 * @param {number|string} subsectionId - Subsection ID
 * @param {Object} videoData - Video information
 * @returns {Promise<Object>} Result with video_id
 */
async function createVideo(subsectionId, videoData) {
    try {
        const payload = {
            action: 'create',
            subsection_id: subsectionId,
            title: videoData.title,
            url: videoData.url || videoData.videoUrl,
            video_type: videoData.videoType || 'url',
            description: videoData.description || '',
            ...videoData
        };
        
        const response = await fetch('PHP/videos.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            return { success: true, video_id: result.video_id };
        }
        
        throw new Error(result.message);
    } catch (error) {
        console.error('Error creating video:', error);
        return { success: true, video_id: 'vid_' + Date.now(), offline: true };
    }
}

// ==================== ENROLLMENTS ====================

/**
 * Enroll student in a course
 * @param {number|string} studentId - Student ID
 * @param {number|string} courseId - Course ID
 * @returns {Promise<Object>} Result with success status
 */
async function enrollStudent(studentId, courseId) {
    try {
        const response = await fetch('PHP/enrollments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'enroll',
                student_id: studentId,
                course_id: courseId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local cache
            const enrolled = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
            if (!enrolled.includes(courseId)) {
                enrolled.push(courseId);
                localStorage.setItem('enrolledCourses', JSON.stringify(enrolled));
            }
            
            return { success: true };
        }
        
        throw new Error(result.message);
    } catch (error) {
        console.error('Error enrolling student:', error);
        
        // Fallback: save to localStorage
        const enrolled = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
        if (!enrolled.includes(courseId)) {
            enrolled.push(courseId);
            localStorage.setItem('enrolledCourses', JSON.stringify(enrolled));
        }
        
        return { success: true, offline: true };
    }
}

/**
 * Unenroll student from a course
 * @param {number|string} studentId - Student ID
 * @param {number|string} courseId - Course ID
 * @returns {Promise<Object>} Result with success status
 */
async function unenrollStudent(studentId, courseId) {
    try {
        const response = await fetch('PHP/enrollments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'unenroll',
                student_id: studentId,
                course_id: courseId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local cache
            let enrolled = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
            enrolled = enrolled.filter(id => id !== courseId);
            localStorage.setItem('enrolledCourses', JSON.stringify(enrolled));
            
            return { success: true };
        }
        
        throw new Error(result.message);
    } catch (error) {
        console.error('Error unenrolling student:', error);
        
        // Fallback: update localStorage
        let enrolled = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
        enrolled = enrolled.filter(id => id !== courseId);
        localStorage.setItem('enrolledCourses', JSON.stringify(enrolled));
        
        return { success: true, offline: true };
    }
}

// ==================== HEALTH CHECK ====================

/**
 * Check if backend is available
 * @returns {Promise<boolean>} True if backend is responsive
 */
async function isBackendAvailable() {
    try {
        const response = await fetch('PHP/courses.php?action=list', {
            method: 'GET',
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        return response.ok;
    } catch (error) {
        console.warn('Backend not available:', error.message);
        return false;
    }
}

// Export for use in other scripts
// (Note: These are already in global scope due to no module system)
