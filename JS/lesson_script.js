// Shared Notification Function
function showNotification(message, type = 'success') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; gap: 10px; width: 300px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    const bgColor = type === 'error' ? '#d63031' : '#00b894';
    toast.style.cssText = `background-color: ${bgColor}; color: white; padding: 15px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; font-family: 'Cairo', sans-serif; opacity: 0; transition: opacity 0.5s ease;`;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}

// On Page Load Initialization
window.onload = function() {
    // 1. Dark Mode Persistence
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // 2. Initialize Video.js
    window.player = videojs('myVideoPlayer', {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        playbackRates: [0.5, 1, 1.5, 2]
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    
    // Get course ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course_id');

    if (!courseId) {
        showNotification('خطأ: معرف الكورس غير موجود', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    try {
        // Load course data from database
        const response = await fetch(`PHP/courses.php?action=list`);
        const coursesData = await response.json();
        
        if (!coursesData.success || !coursesData.data) {
            showNotification('خطأ في تحميل بيانات الكورس', 'error');
            return;
        }

        // Find the course
        const course = coursesData.data.find(c => c.id == courseId);
        
        if (!course) {
            showNotification('الكورس غير موجود', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }

        // Set course title in header
        document.getElementById('courseTitle').textContent = course.title;

        // Set course background with wallpaper or color
        const videoWrapper = document.getElementById('videoWrapper');
        if (course.wallpaper) {
            videoWrapper.style.backgroundImage = `url('${course.wallpaper}')`;
            videoWrapper.style.backgroundSize = 'cover';
            videoWrapper.style.backgroundPosition = 'center';
            videoWrapper.style.backgroundAttachment = 'fixed';
        } else if (course.image_color) {
            videoWrapper.style.backgroundColor = course.image_color;
        }

        // Load and display course sections/videos
        loadCourseSections(courseId);

    } catch (error) {
        console.error('Error loading course:', error);
        showNotification('خطأ في تحميل الكورس', 'error');
    }

    // Back to dashboard
    document.getElementById('backToCourseButton').addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
});

async function loadCourseSections(courseId) {
    const sectionsContainer = document.getElementById('courseSections');
    
    try {
        console.log('Loading course sections for course ID:', courseId);
        
        // Fetch course content from the new API (sections, subsections, videos)
        const formData = new FormData();
        formData.append('action', 'get_course_content');
        formData.append('course_id', courseId);
        
        const response = await fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Course content result:', result);

        if (result.success && result.sections && result.sections.length > 0) {
            // Display sections with subsections and videos
            sectionsContainer.innerHTML = '';
            
            result.sections.forEach((section, index) => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'section-item';
                
                // Build subsections HTML
                let subsectionsHtml = '';
                if (section.subsections && section.subsections.length > 0) {
                    subsectionsHtml = section.subsections.map(subsection => {
                        let videosHtml = '';
                        if (subsection.videos && subsection.videos.length > 0) {
                            videosHtml = subsection.videos.map(video => {
                                const videoIcon = video.video_type === 'url' ? '🔗' : '📹';
                                const videoSource = video.video_type === 'url' ? video.url : `PHP/uploads/${video.url}`;
                                const encodedUrl = encodeURIComponent(videoSource);
                                const encodedTitle = encodeURIComponent(video.title);
                                const watchLink = `watch_video.html?video_id=${video.id}&course_id=${courseId}&title=${encodedTitle}&url=${encodedUrl}&type=${video.video_type}`;
                                return `
                                    <div class="video-item" data-watch-link="${watchLink}">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-size: 1.2rem;">${videoIcon}</span>
                                            <div style="flex: 1;">
                                                <p style="margin: 0; font-weight: bold;">${video.title}</p>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                        } else {
                            videosHtml = '<p style="color: #636e72; text-align: center; padding: 10px;">لا توجد محتويات في هذا الخيار</p>';
                        }
                        
                        return `
                            <div class="subsection-item">
                                <h4 style="margin: 0 0 15px 0;">🔹 ${subsection.title}</h4>
                                <div class="videos-list">
                                    ${videosHtml}
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    subsectionsHtml = '<p style="color: #636e72; text-align: center; padding: 20px;">لا توجد خيارات في هذه الوحدة</p>';
                }
                
                sectionDiv.innerHTML = `
                    <div class="section-header">
                        <h3 style="margin: 0;">📌 ${section.title}</h3>
                        <button class="toggle-btn" onclick="toggleSection(this)" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;">▼</button>
                    </div>
                    <div class="section-content" style="display: ${index === 0 ? 'block' : 'none'};">
                        ${subsectionsHtml}
                    </div>
                `;
                sectionsContainer.appendChild(sectionDiv);
            });
            
            // Add click listeners to video items
            document.querySelectorAll('.video-item').forEach(item => {
                item.addEventListener('click', function() {
                    const watchLink = this.getAttribute('data-watch-link');
                    if (watchLink) {
                        window.location.href = watchLink;
                    }
                });
            });
        } else {
            // No sections yet - show welcome message
            console.log('No sections found for course');
            sectionsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #636e72;">
                    <p style="font-size: 1.1rem;">📚 هذا الكورس قيد التطوير</p>
                    <p>سيتم إضافة الدروس والمحتويات قريباً من قبل المعلم</p>
                    <p style="margin-top: 20px; font-size: 0.9rem;">تحقق لاحقاً من هنا للحصول على آخر التحديثات</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        sectionsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #d63031;">
                <p>خطأ في تحميل محتوى الكورس</p>
                <p style="font-size: 0.9rem;">${error.message}</p>
            </div>
        `;
    }
}



function toggleSection(button) {
    const sectionContent = button.closest('.section-item').querySelector('.section-content');
    sectionContent.style.display = sectionContent.style.display === 'none' ? 'block' : 'none';
    button.textContent = sectionContent.style.display === 'none' ? '▼' : '▲';
}