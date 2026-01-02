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

    // 2. Name Loading (Fix Name Leakage)
    // Since this is the TEACHER dashboard, we specifically look for the teacher name.
    // We do NOT rely on 'ls_userRole' because it might be overwritten if a student logs in on another tab.
    const savedName = localStorage.getItem('ls_teacherName');

    if (savedName) {
        const nameDisplays = document.querySelectorAll('#userNameDisplay');
        nameDisplays.forEach(el => el.textContent = savedName);
    } else {
        // Fallback to session user if no local override
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (currentUser && currentUser.name) {
            const nameDisplays = document.querySelectorAll('#userNameDisplay');
            nameDisplays.forEach(el => el.textContent = currentUser.name);
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    
    let currentEditingCourseId = null;

    // Check Auth
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    console.log('🔍 DOMContentLoaded - currentUser:', currentUser);
    console.log('   currentUser.id:', currentUser?.id);
    console.log('   currentUser.role:', currentUser?.role);
    
    if (!currentUser || !currentUser.id) {
        console.error('❌ Auth check failed - No currentUser in sessionStorage');
        showNotification("لم يتم تسجيل الدخول. يتم إعادة التوجيه...", 'error');
        setTimeout(() => {
            window.location.href = 'student_login.html';
        }, 2000);
        return;
    }
    
    // Sidebar Toggle Logic
    const userLogoToggle = document.getElementById('userLogoToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (userLogoToggle && sidebar) {
        userLogoToggle.addEventListener('click', () => {
            sidebar.classList.toggle('closed');
        });
    }

    // Navigation
    const navMyCreated = document.getElementById('navMyCreated');
    const navAddCourse = document.getElementById('navAddCourse');
    const navSettings = document.getElementById('navSettings');
    const navLogout = document.getElementById('navLogout');

    const sectionMyCourses = document.getElementById('sectionMyCourses');
    const sectionAddCourse = document.getElementById('sectionAddCourse');
    const sectionSettings = document.getElementById('sectionSettings');
    const sectionEditContent = document.getElementById('sectionEditContent');

    function showSection(section) {
        [sectionMyCourses, sectionAddCourse, sectionSettings, sectionEditContent].forEach(s => {
            if(s) s.classList.add('hidden');
        });
        if(section) section.classList.remove('hidden');
    }

    // Expose showSection globally
    window.showSection = showSection;

    if(navMyCreated) {
        navMyCreated.addEventListener('click', (e) => { 
            e.preventDefault();
            loadTeacherCourses(); 
            showSection(sectionMyCourses); 
        });
    }
    
    if(navAddCourse) {
        navAddCourse.addEventListener('click', (e) => { 
            e.preventDefault();
            // Reset form for new course
            document.getElementById('courseId').value = '';
            document.getElementById('addCourseForm').reset();
            document.getElementById('btnCreateCourse').textContent = 'إنشاء الكورس';
            showSection(sectionAddCourse); 
        });
    }

    if (navSettings) {
        navSettings.addEventListener('click', () => {
            showSection(sectionSettings);
        });
    }

    // Settings Button in Header
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(sectionSettings);
        });
    }

    if(navLogout) {
        navLogout.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            sessionStorage.removeItem('currentUser');
            window.location.href = 'student_login.html';
        });
    }

    // Delete Account Button
    const deleteAccountButton = document.getElementById('deleteAccountButton');
    if (deleteAccountButton) {
        deleteAccountButton.addEventListener('click', () => {
            const confirmed = confirm('⚠️ تحذير: حذف الحساب لا يمكن التراجع عنه. هل أنت متأكد من رغبتك في حذف حسابك نهائياً؟');
            if (confirmed) {
                const finalConfirm = prompt('اكتب "نعم" للتأكيد النهائي لحذف الحساب:');
                if (finalConfirm === 'نعم') {
                    deleteTeacherAccount();
                }
            }
        });
    }

    // Coming Soon Link
    const comingSoonLink = document.getElementById('comingSoonLink');
    if (comingSoonLink) {
        comingSoonLink.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification('هذه الميزة ستتوفر قريبًا.', 'success');
        });
    }

    // --- Content Editing Logic ---
    const btnAddSection = document.getElementById('btnAddSection');
    const backToCoursesBtn = document.getElementById('backToCourses');

    if (backToCoursesBtn) {
        backToCoursesBtn.addEventListener('click', () => {
            currentEditingCourseId = null;
            showSection(sectionMyCourses);
        });
    }

    if (btnAddSection) {
        btnAddSection.addEventListener('click', () => {
            const titleInput = document.getElementById('newSectionTitle');
            const title = titleInput.value.trim();
            
            if (!title || !currentEditingCourseId) {
                showNotification('الرجاء إدخال عنوان الوحدة', 'error');
                return;
            }

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            const teacherId = currentUser?.id;
            
            addSectionDB(currentEditingCourseId);
        });
    }

    // Function to Render Sections & Lessons
    function renderSections(courseId) {
        const container = document.getElementById('sectionsContainer');
        const courses = getCourses();
        const course = courses[courseId];
        
        if (!container || !course) return;
        
        container.innerHTML = '';

        if (!course.sections || course.sections.length === 0) {
            container.innerHTML = '<p style="color: #636e72; text-align: center;">لا توجد وحدات بعد. أضف وحدة للبدء.</p>';
            return;
        }

        course.sections.forEach((section, secIndex) => {
            // Ensure subSections array exists
            if (!section.subSections) section.subSections = [];

            const sectionHtml = `
                <div class="section-item">
                    <div class="section-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <h3 style="margin:0;">${section.title}</h3>
                            <button onclick="editSectionTitle('${courseId}', ${secIndex})" title="تعديل اسم الوحدة" style="cursor: pointer; border: none; background: none; font-size: 1.1rem;">✏️</button>
                        </div>
                        <button onclick="deleteSection('${courseId}', ${secIndex})" style="color: #d63031; background: none; border: none; cursor: pointer; font-weight: bold;">حذف الوحدة</button>
                    </div>
                    
                    <div id="subSections_${section.id}" style="padding: 10px;">
                        ${section.subSections.map((subSection, subSecIndex) => `
                            <div class="subsection-item">
                                <div class="subsection-header">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <h4 style="margin:0;">🔹 ${subSection.title}</h4>
                                        <button onclick="editSubSectionTitle('${courseId}', ${secIndex}, ${subSecIndex})" title="تعديل اسم الخيار" style="cursor: pointer; border: none; background: none;">✏️</button>
                                    </div>
                                    <button onclick="deleteSubSection('${courseId}', ${secIndex}, ${subSecIndex})" style="color: #d63031; background: none; border: none; cursor: pointer;">حذف الخيار</button>
                                </div>

                                <div class="videos-list">
                                    ${(subSection.videos || []).map((video, videoIndex) => `
                                        <div class="video-item">
                                            <div style="display: flex; align-items: center; gap: 10px;">
                                                <span>🔗 ${video.title}</span>
                                                <button onclick="editVideoTitle('${courseId}', ${secIndex}, ${subSecIndex}, ${videoIndex})" title="تعديل اسم المحتوى" style="cursor: pointer; border: none; background: none;">✏️</button>
                                            </div>
                                            <button onclick="deleteVideo('${courseId}', ${secIndex}, ${subSecIndex}, ${videoIndex})" style="color: #d63031; background: none; border: none; cursor: pointer;">×</button>
                                        </div>
                                    `).join('')}
                                </div>

                                <!-- Add Video Form -->
                                <div class="add-video-form">
                                    <input type="text" id="videoTitle_${subSection.id}" placeholder="عنوان المحتوى (فيديو/رابط)" style="width: 30%; padding: 5px; margin-bottom: 5px;">
                                    
                                    <div style="margin-bottom: 5px;">
                                        <label style="margin-left: 10px;"><input type="radio" name="vSource_${subSection.id}" value="url" checked onchange="toggleVideoInput('${subSection.id}')"> رابط</label>
                                        <label><input type="radio" name="vSource_${subSection.id}" value="file" onchange="toggleVideoInput('${subSection.id}')"> رفع فيديو</label>
                                    </div>

                                    <input type="text" id="videoUrl_${subSection.id}" placeholder="رابط المحتوى" style="width: 40%; padding: 5px;">
                                    <input type="file" id="videoFile_${subSection.id}" accept="video/*" style="display:none; width: 40%;">
                                    
                                    <button onclick="addVideo('${courseId}', ${secIndex}, ${subSecIndex}, '${subSection.id}')" class="btn-outline" style="font-size: 0.8rem;">+ إضافة محتوى</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Add SubSection Form -->
                    <div class="add-subsection-form">
                        <input type="text" id="newSubSectionTitle_${section.id}" placeholder="عنوان الخيار الجديد" style="width: 60%; padding: 8px;">
                        <button onclick="addSubSection('${courseId}', ${secIndex}, '${section.id}')" class="btn-primary" style="padding: 8px 15px;">+ إضافة خيار</button>
                    </div>
                </div>
            `;
            container.innerHTML += sectionHtml;
        });
    }

    // Helper to toggle inputs
    window.toggleVideoInput = function(id) {
        const type = document.querySelector(`input[name="vSource_${id}"]:checked`).value;
        const urlInput = document.getElementById(`videoUrl_${id}`);
        const fileInput = document.getElementById(`videoFile_${id}`);
        
        if (type === 'url') {
            urlInput.style.display = 'inline-block';
            fileInput.style.display = 'none';
        } else {
            urlInput.style.display = 'none';
            fileInput.style.display = 'inline-block';
        }
    };

    // Expose helper functions globally for onclick events
    window.deleteSection = function(courseId, secIndex) {
        if(confirm('حذف القسم سيحذف جميع المحتويات بداخله. هل أنت متأكد؟')) {
            const courses = getCourses();
            courses[courseId].sections.splice(secIndex, 1);
            localStorage.setItem('coursesDB', JSON.stringify(courses));
            renderSections(courseId);
        }
    };

    window.addSubSection = function(courseId, secIndex, sectionId) {
        const titleInput = document.getElementById(`newSubSectionTitle_${sectionId}`);
        const title = titleInput.value.trim();
        
        if (!title) {
            showNotification('الرجاء إدخال عنوان الخيار', 'error');
            return;
        }

        const courses = getCourses();
        if (!courses[courseId].sections[secIndex].subSections) {
            courses[courseId].sections[secIndex].subSections = [];
        }

        courses[courseId].sections[secIndex].subSections.push({
            id: 'subsec_' + Date.now(),
            title: title,
            videos: []
        });

        localStorage.setItem('coursesDB', JSON.stringify(courses));
        renderSections(courseId);
        showNotification('تم إضافة الخيار بنجاح', 'success');
    };

    window.deleteSubSection = function(courseId, secIndex, subSecIndex) {
        if(confirm('حذف هذا الخيار؟')) {
            const courses = getCourses();
            courses[courseId].sections[secIndex].subSections.splice(subSecIndex, 1);
            localStorage.setItem('coursesDB', JSON.stringify(courses));
            renderSections(courseId);
        }
    };

    window.addVideo = async function(courseId, secIndex, subSecIndex, subSectionId) {
        const titleInput = document.getElementById(`videoTitle_${subSectionId}`);
        const type = document.querySelector(`input[name="vSource_${subSectionId}"]:checked`).value;
        
        const title = titleInput.value.trim();
        let videoUrl = '';
        let videoType = 'url';
        let videoId = null;

        if (!title) {
            showNotification('الرجاء إدخال عنوان المحتوى', 'error');
            return;
        }

        if (type === 'url') {
            const urlInput = document.getElementById(`videoUrl_${subSectionId}`);
            videoUrl = urlInput.value.trim();
            if (!videoUrl) {
                showNotification('الرجاء إدخال رابط المحتوى', 'error');
                return;
            }
        } else {
            const fileInput = document.getElementById(`videoFile_${subSectionId}`);
            if (fileInput.files.length === 0) {
                showNotification('الرجاء اختيار ملف فيديو', 'error');
                return;
            }
            
            // Save Video to DB
            try {
                showNotification('جاري رفع الفيديو...', 'success');
                videoId = await saveVideoToDB(fileInput.files[0]);
                videoType = 'local';
                videoUrl = videoId; 
            } catch (e) {
                console.error(e);
                showNotification('فشل رفع الفيديو', 'error');
                return;
            }
        }

        const courses = getCourses();
        if (!courses[courseId].sections[secIndex].subSections[subSecIndex].videos) {
            courses[courseId].sections[secIndex].subSections[subSecIndex].videos = [];
        }

        courses[courseId].sections[secIndex].subSections[subSecIndex].videos.push({
            title: title,
            url: videoUrl,
            videoUrl: videoUrl,
            videoId: videoId,
            videoType: videoType,
            description: '' 
        });
        
        localStorage.setItem('coursesDB', JSON.stringify(courses));
        renderSections(courseId);
        showNotification('تم إضافة المحتوى بنجاح', 'success');
    };

    window.deleteVideo = function(courseId, secIndex, subSecIndex, videoIndex) {
        if(confirm('حذف هذا المحتوى؟')) {
            const courses = getCourses();
            courses[courseId].sections[secIndex].subSections[subSecIndex].videos.splice(videoIndex, 1);
            localStorage.setItem('coursesDB', JSON.stringify(courses));
            renderSections(courseId);
        }
    };

    // --- Settings: Profile Update (Name and Email) ---
    const userInfoForm = document.getElementById('userInfoForm');
    if (userInfoForm) {
        userInfoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newNameInput = document.getElementById('settingsNameInput');
            const newEmailInput = document.getElementById('settingsEmailInput');

            const newName = newNameInput ? newNameInput.value.trim() : '';
            const newEmail = newEmailInput ? newEmailInput.value.trim().toLowerCase() : '';

            if (newName === '' && newEmail === '') {
                showNotification("خطأ: أدخل الاسم أو البريد الإلكتروني على الأقل.", 'error');
                return;
            }

            // Get current user info
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
            
            console.log('Current User:', currentUser);
            
            if (!currentUser.id) {
                showNotification("خطأ: معلومات المستخدم غير متوفرة. يرجى تسجيل الدخول مجددا.", 'error');
                return;
            }
                        
            const fullName = newName || currentUser.name;
            const email = newEmail || currentUser.email;

            // Validate input
            if (newName && newName.length < 3) {
                showNotification("خطأ: الاسم يجب أن يكون 3 أحرف على الأقل.", 'error');
                return;
            }

            if (newEmail && !isValidEmail(newEmail)) {
                showNotification("خطأ: البريد الإلكتروني غير صحيح.", 'error');
                return;
            }

            // Call the update profile function
            updateTeacherProfileAPI(currentUser.id, fullName, email, newNameInput, newEmailInput, currentUser);
        });
    }

    function isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    function updateTeacherProfileAPI(teacherId, fullName, email, nameInput, emailInput, currentUser) {
        // Ensure email is always provided - if not changed, use current email
        const finalEmail = email.trim() !== '' ? email : (currentUser && currentUser.email ? currentUser.email : '');
        
        console.log('=== TEACHER PROFILE UPDATE ===' );
        console.log('Teacher ID:', teacherId);
        console.log('Full Name:', fullName);
        console.log('Email:', finalEmail);
        
        if (!finalEmail) {
            showNotification("خطأ: لا يوجد بريد إلكتروني للتحديث", 'error');
            return;
        }
        
        const payload = {
            action: 'update_teacher_profile',
            teacher_id: parseInt(teacherId),
            full_name: fullName,
            email: finalEmail
        };
        
        console.log('Payload:', JSON.stringify(payload));
        
        fetch('PHP/dashboard_api.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Response:', data);
            
            if (data.success) {
                // Update local storage
                localStorage.setItem('ls_teacherName', fullName);
                const nameDisplays = document.querySelectorAll('#userNameDisplay');
                nameDisplays.forEach(el => el.textContent = fullName);
                
                // Update session storage
                const updatedUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
                updatedUser.name = fullName;
                updatedUser.email = finalEmail;
                sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

                // Refresh course list if it exists
                if (typeof renderTeacherCourses === 'function') {
                    renderTeacherCourses();
                }

                showNotification("تم تحديث البيانات بنجاح.", 'success');
                if (nameInput) nameInput.value = '';
                if (emailInput) emailInput.value = '';
            } else {
                showNotification("خطأ: " + (data.message || 'فشل التحديث'), 'error');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            showNotification("خطأ في الاتصال بالخادم", 'error');
        });
    }

    // --- Teacher Bio Form Handler ---
    const bioForm = document.getElementById('bioForm');
    if (bioForm) {
        const bioInput = document.getElementById('bioInput');
        const bioCharCount = document.getElementById('bioCharCount');

        // Update character counter as user types
        if (bioInput) {
            bioInput.addEventListener('input', () => {
                const charCount = bioInput.value.length;
                if (bioCharCount) {
                    bioCharCount.textContent = `${charCount} / 5000 حرف`;
                }
            });
        }
        // Handle form submission
        bioForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const bio = bioInput ? bioInput.value.trim() : '';
            
            // Get currentUser from session
            const currentUserStr = sessionStorage.getItem('currentUser');
            console.log('DEBUG: currentUser string from sessionStorage:', currentUserStr);
            
            let currentUser = {};
            if (currentUserStr) {
                try {
                    currentUser = JSON.parse(currentUserStr);
                } catch (err) {
                    console.error('ERROR: Failed to parse currentUser:', err);
                    showNotification("خطأ: فشل قراءة بيانات المستخدم. يرجى تحديث الصفحة.", 'error');
                    return;
                }
            }
            
            console.log('DEBUG: Parsed currentUser object:', currentUser);
            console.log('DEBUG: currentUser.id:', currentUser.id, 'Type:', typeof currentUser.id);
            
            if (!currentUser.id) {
                console.error('ERROR: currentUser.id is missing. All keys:', Object.keys(currentUser));
                showNotification("خطأ: معرف المعلم مفقود. تأكد من تسجيل الدخول.", 'error');
                return;
            }

            // Validate bio is not empty
            if (!bio) {
                showNotification("خطأ: السيرة الذاتية فارغة", 'error');
                return;
            }

            // Validate bio length
            if (bio.length > 5000) {
                showNotification("خطأ: السيرة الذاتية طويلة جداً (الحد الأقصى 5000 حرف)", 'error');
                return;
            }

            // Prepare payload like updateTeacherProfileAPI does
            const payload = {
                action: 'update_teacher_bio',
                teacher_id: parseInt(currentUser.id),
                bio: bio
            };
            
            console.log('📤 Sending payload:', JSON.stringify(payload));
            console.log('   teacher_id value:', payload.teacher_id, 'Type:', typeof payload.teacher_id);
            
            // Call dashboard_api.php (same endpoint as name/email update)
            fetch('PHP/dashboard_api.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            })
            .then(response => {
                return response.json();
            })
            .then(data => {
                console.log('✅ Response from PHP:', data);
                if (data.success) {
                    showNotification("تم حفظ السيرة الذاتية بنجاح", 'success');
                    if (bioInput) bioInput.value = '';
                    if (bioCharCount) bioCharCount.textContent = '0 / 5000 حرف';
                } else {
                    showNotification("خطأ: " + (data.message || 'فشل حفظ السيرة'), 'error');
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                showNotification("خطأ في الاتصال بالخادم", 'error');
            });
        });
    }

    // Load teacher bio on page load
    async function loadTeacherBio() {
        const bioInput = document.getElementById('bioInput');
        if (!bioInput) return;

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
        if (!currentUser.id) return;

        try {
            const response = await fetch('PHP/dashboard_api.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'get_teacher_data',
                    teacher_id: currentUser.id
                })
            });
            const data = await response.json();
            
            if (data.success && data.teacher && data.teacher.bio) {
                bioInput.value = data.teacher.bio;
                const bioCharCount = document.getElementById('bioCharCount');
                if (bioCharCount) {
                    bioCharCount.textContent = `${data.teacher.bio.length} / 5000 حرف`;
                }
            }
        } catch (error) {
            console.error('Error loading bio:', error);
        }
    }

    // Load bio when page loads
    loadTeacherBio();

    // --- Logic: Render Courses (Updated for Async Image) ---
    async function renderTeacherCourses() {
        const courses = getCourses();
        const grid = document.getElementById('teacherCoursesGrid');
        if(!grid) return;
        grid.innerHTML = '';

        const teacherName = currentUser ? currentUser.name : 'المعلم';
        const myCourses = Object.values(courses).filter(c => c.teacher === teacherName);

        if (myCourses.length === 0) {
            grid.innerHTML = '<p>لم تقم بإضافة أي كورسات بعد.</p>';
            return;
        }

        for (const course of myCourses) {
            const bgStyle = await getCourseBackgroundStyle(course);
            const card = `
                <div class="course-card">
                    <div class="card-img" style="${bgStyle}">${course.title}</div>
                    <div class="card-body">
                        <h3>${course.title}</h3>
                        <p>${course.price} ج.م</p>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <button class="btn-continue" onclick="editCourse('${course.id}')" style="flex: 1;">إدارة المحتوى</button>
                            <button class="btn-delete" onclick="deleteCourse('${course.id}')" style="background: #d63031; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">حذف</button>
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML += card;
        }
    }

    // --- Logic: Add New Course (Database Connected) ---
    const addCourseForm = document.getElementById('addCourseForm');
    if(addCourseForm) {
        addCourseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnCreate = document.getElementById('btnCreateCourse');
            btnCreate.disabled = true;
            btnCreate.textContent = 'جاري الحفظ...';

            const courseId = document.getElementById('courseId').value;
            const title = document.getElementById('courseTitle').value.trim();
            const subtitle = document.getElementById('courseSubtitle').value.trim();
            const description = document.getElementById('courseDesc').value.trim();
            const price = document.getElementById('coursePrice').value;
            const bgType = document.querySelector('input[name="bgType"]:checked').value;
            const imageColor = document.getElementById('courseColor').value;

            // Validate
            if (!title || !subtitle || !description || !price) {
                showNotification('يرجى ملء جميع الحقول', 'error');
                btnCreate.disabled = false;
                btnCreate.textContent = 'إنشاء الكورس';
                return;
            }

            try {
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
                const teacherId = currentUser?.id;
                
                const formData = new FormData();
                formData.append('action', courseId ? 'update_course' : 'create_course');
                formData.append('title', title);
                formData.append('subtitle', subtitle);
                formData.append('description', description);
                formData.append('price', parseFloat(price));
                formData.append('bgType', bgType);
                formData.append('imageColor', imageColor);
                
                // Add teacher_id for authentication fallback
                if (teacherId) {
                    formData.append('teacher_id', teacherId);
                }
                
                if (courseId) {
                    formData.append('course_id', courseId);
                }

                // Add image if provided
                const fileInput = document.getElementById('courseImage');
                if (fileInput && fileInput.files.length > 0) {
                    formData.append('courseImage', fileInput.files[0]);
                }

                const response = await fetch('PHP/courses_api.php', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
                }

                const text = await response.text();
                const result = JSON.parse(text);
                console.log('Course save result:', result);

                if (result.success) {
                    showNotification(courseId ? 'تم تحديث الكورس بنجاح!' : 'تم إنشاء الكورس بنجاح!', 'success');
                    addCourseForm.reset();
                    document.getElementById('courseId').value = '';
                    btnCreate.textContent = 'إنشاء الكورس';
                    btnCreate.disabled = false;
                    // Load courses and show the list
                    loadTeacherCourses();
                    const sectionMyCourses = document.getElementById('sectionMyCourses');
                    if (sectionMyCourses) {
                        showSection(sectionMyCourses);
                    }
                } else {
                    showNotification(result.message || 'حدث خطأ', 'error');
                    btnCreate.disabled = false;
                    btnCreate.textContent = courseId ? 'تحديث الكورس' : 'إنشاء الكورس';
                }
            } catch (error) {
                console.error('Error creating course:', error);
                showNotification('حدث خطأ في الاتصال: ' + error.message, 'error');
                btnCreate.disabled = false;
                btnCreate.textContent = courseId ? 'تحديث الكورس' : 'إنشاء الكورس';
            }
        });
    }

    // Load and display teacher's courses
    function loadTeacherCourses() {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;
        
        console.log('loadTeacherCourses called');
        console.log('Current user:', currentUser);
        console.log('Teacher ID:', teacherId);
        
        if (!teacherId) {
            console.error('Teacher ID not found - user may not be logged in');
            showNotification('خطأ: معرف المعلم غير موجود. يرجى تسجيل الدخول مرة أخرى.', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'get_courses');
        formData.append('teacher_id', teacherId);
        
        console.log('Sending request to get courses...');
        
        fetch('PHP/courses_api.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response received:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(text => {
            console.log('Response text:', text);
            try {
                const result = JSON.parse(text);
                console.log('Parsed result:', result);
                if (result.success) {
                    console.log('Courses loaded successfully:', result.courses);
                    displayTeacherCourses(result.courses);
                } else {
                    console.error('Failed to load courses:', result.message);
                    showNotification(result.message || 'فشل تحميل الكورسات', 'error');
                }
            } catch (e) {
                console.error('Invalid JSON response:', text, e);
                showNotification('خطأ: الخادم أرجع بيانات غير صالحة', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading courses:', error);
            showNotification('حدث خطأ في تحميل الكورسات: ' + error.message, 'error');
        });
    }

    // Expose loadTeacherCourses globally
    window.loadTeacherCourses = loadTeacherCourses;

    // Display courses in the grid
    function displayTeacherCourses(courses) {
        const coursesList = document.getElementById('coursesList');
        const noCoursesMsg = document.getElementById('noCoursesMsg');

        if (!courses || courses.length === 0) {
            coursesList.innerHTML = '';
            noCoursesMsg.style.display = 'block';
            return;
        }

        noCoursesMsg.style.display = 'none';
        coursesList.innerHTML = courses.map(course => {
            // Determine background style: wallpaper image or color
            let backgroundStyle = `background-color: ${course.image_color};`;
            if (course.wallpaper) {
                backgroundStyle = `background-image: url('${course.wallpaper}'); background-size: cover; background-position: center;`;
            }
            return `
            <div class="course-card">
                <div class="course-card-header" style="${backgroundStyle}">
                    ${course.title}
                </div>
                <div class="course-card-body">
                    <h3>${course.subtitle}</h3>
                    <p>${course.description.substring(0, 80)}...</p>
                    <p class="course-price">${course.price} ج.م</p>
                </div>
                <div class="course-card-footer">
                    <button class="btn-edit-course" onclick="editCourse(${course.id})">تعديل</button>
                    <button class="btn-delete-course" onclick="deleteCourse(${course.id})">حذف</button>
                </div>
            </div>
            `;
        }).join('');
    }

    // Expose displayTeacherCourses globally
    window.displayTeacherCourses = displayTeacherCourses;

    // Edit existing course - OPENS CONTENT EDITOR WITH FULL INTERFACE
    window.editCourse = function(courseId) {
        console.log('Edit course clicked for:', courseId);
        
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;
        
        if (!teacherId) {
            showNotification('خطأ: معرف المعلم غير موجود', 'error');
            return;
        }
        
        // Store the current editing course ID
        currentEditingCourseId = courseId;
        
        // Load and display full course content (sections, subsections, videos)
        loadAndDisplayCourseContent(courseId, teacherId);
        
        // Show the edit content section
        const sectionEditContent = document.getElementById('sectionEditContent');
        if (sectionEditContent) {
            showSection(sectionEditContent);
            
            // Update the title
            const editTitleEl = document.getElementById('editCourseTitle');
            if (editTitleEl) {
                editTitleEl.textContent = `تعديل محتوى الكورس`;
            }
        }
    };

    // Load course content from database and render it
    function loadAndDisplayCourseContent(courseId, teacherId) {
        const formData = new FormData();
        formData.append('action', 'get_course_content');
        formData.append('course_id', courseId);
        formData.append('teacher_id', teacherId);
        
        console.log('Loading course content...');
        showNotification('جاري تحميل محتوى الكورس...', 'success');
        
        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(text => {
            console.log('Course content response:', text);
            try {
                const result = JSON.parse(text);
                
                if (result.success) {
                    console.log('Course content loaded:', result.sections);
                    renderCourseContentEditor(courseId, result.sections);
                    showNotification('تم تحميل محتوى الكورس بنجاح', 'success');
                } else {
                    console.error('Failed to load content:', result.message);
                    showNotification(result.message || 'فشل تحميل المحتوى', 'error');
                }
            } catch (e) {
                console.error('Invalid JSON response:', text, e);
                showNotification('خطأ في الاستجابة', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading content:', error);
            showNotification('حدث خطأ: ' + error.message, 'error');
        });
    }

    // Render the full course content editor interface
    function renderCourseContentEditor(courseId, sections) {
        const container = document.getElementById('sectionsContainer');
        if (!container) return;
        
        container.innerHTML = '';

        if (!sections || sections.length === 0) {
            container.innerHTML = '<p style="color: #636e72; text-align: center; padding: 20px;">لا توجد وحدات بعد. أضف وحدة جديدة للبدء.</p>';
        } else {
            // Render each section with its subsections and videos
            sections.forEach((section) => {
                const sectionHtml = createSectionHTML(courseId, section);
                container.innerHTML += sectionHtml;
            });
        }
    }

    // Create HTML for a section with all its content
    function createSectionHTML(courseId, section) {
        const subsectionsHtml = (section.subsections || []).map(subsection => {
            return createSubsectionHTML(courseId, section.id, subsection);
        }).join('');

        return `
            <div class="section-item">
                <div class="section-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h3 style="margin:0;">📌 ${section.title}</h3>
                        <button onclick="editSectionNameDB(${courseId}, ${section.id}, '${section.title}')" title="تعديل اسم الوحدة" style="cursor: pointer; border: none; background: none; font-size: 1.1rem;">✏️</button>
                    </div>
                    <button onclick="deleteSectionDB(${courseId}, ${section.id})" style="color: #d63031; background: none; border: none; cursor: pointer; font-weight: bold;">🗑️ حذف</button>
                </div>
                
                <div style="padding: 10px;">
                    ${subsectionsHtml}
                </div>

                <!-- Add New Subsection Form -->
                <div class="add-subsection-form" style="margin: 15px;">
                    <input type="text" id="newSubsectionTitle_${section.id}" placeholder="أدخل عنوان الخيار/الموضوع الجديد" style="width: 60%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="addSubsectionDB(${courseId}, ${section.id})" class="btn-primary" style="padding: 8px 15px; margin-right: 5px;">+ إضافة خيار</button>
                </div>
            </div>
        `;
    }

    // Create HTML for a subsection with videos
    function createSubsectionHTML(courseId, sectionId, subsection) {
        const videosHtml = (subsection.videos || []).map(video => {
            const videoIcon = video.video_type === 'url' ? '🔗' : '📹';
            return `
                <div class="video-item" style="background: white; padding: 8px; margin-bottom: 5px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span>${videoIcon} ${video.title}</span>
                        <button onclick="editVideoNameDB(${courseId}, ${video.id}, '${video.title}')" title="تعديل اسم المحتوى" style="cursor: pointer; border: none; background: none; font-size: 0.9rem;">✏️</button>
                    </div>
                    <button onclick="deleteVideoDB(${courseId}, ${video.id})" style="color: #d63031; background: none; border: none; cursor: pointer; font-weight: bold;">×</button>
                </div>
            `;
        }).join('');

        return `
            <div class="subsection-item" style="background: #f9f9f9; padding: 12px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid #6c5ce7;">
                <div class="subsection-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h4 style="margin:0; color: #2d3436;">🔹 ${subsection.title}</h4>
                        <button onclick="editSubsectionNameDB(${courseId}, ${subsection.id}, '${subsection.title}')" title="تعديل اسم الخيار" style="cursor: pointer; border: none; background: none; font-size: 0.9rem;">✏️</button>
                    </div>
                    <button onclick="deleteSubsectionDB(${courseId}, ${subsection.id})" style="color: #d63031; background: none; border: none; cursor: pointer; font-weight: bold;">🗑️</button>
                </div>

                <!-- Videos List -->
                <div class="videos-list" style="margin-bottom: 10px;">
                    ${videosHtml.length > 0 ? videosHtml : '<p style="color: #999; font-size: 0.9rem; margin: 0;">لا توجد محتويات بعد</p>'}
                </div>

                <!-- Add Video Form -->
                <div class="add-video-form" style="background: #f0f0f0; padding: 10px; border-radius: 4px; margin-top: 10px;">
                    <div style="margin-bottom: 8px;">
                        <input type="text" id="videoTitle_${subsection.id}" placeholder="عنوان المحتوى (فيديو/رابط)" style="width: 35%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>

                    <div style="margin-bottom: 8px;">
                        <label style="margin-right: 15px;"><input type="radio" name="vSource_${subsection.id}" value="url" checked onchange="toggleVideoInputDB('${subsection.id}')"> 🔗 رابط</label>
                        <label><input type="radio" name="vSource_${subsection.id}" value="file" onchange="toggleVideoInputDB('${subsection.id}')"> 📹 رفع فيديو</label>
                    </div>

                    <div style="margin-bottom: 8px;">
                        <input type="text" id="videoUrl_${subsection.id}" placeholder="أدخل رابط المحتوى (YouTube, etc)" style="width: 50%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                        <input type="file" id="videoFile_${subsection.id}" accept="video/*" style="display:none; width: 50%;">
                    </div>

                    <button onclick="addVideoDB(${courseId}, ${subsection.id})" class="btn-outline" style="padding: 6px 12px; background: #6c5ce7; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">+ إضافة محتوى</button>
                </div>
            </div>
        `;
    }

    // ==================== DATABASE OPERATIONS ====================

    // Toggle video input (URL vs File)
    window.toggleVideoInputDB = function(subsectionId) {
        const type = document.querySelector(`input[name="vSource_${subsectionId}"]:checked`).value;
        const urlInput = document.getElementById(`videoUrl_${subsectionId}`);
        const fileInput = document.getElementById(`videoFile_${subsectionId}`);
        
        if (type === 'url') {
            urlInput.style.display = 'inline-block';
            fileInput.style.display = 'none';
        } else {
            urlInput.style.display = 'none';
            fileInput.style.display = 'inline-block';
        }
    };

    // ADD SECTION
    window.addSectionDB = function(courseId) {
        const titleInput = document.getElementById('newSectionTitle');
        const title = titleInput ? titleInput.value.trim() : '';
        
        if (!title) {
            showNotification('الرجاء إدخال عنوان الوحدة', 'error');
            return;
        }

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'add_section');
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم إضافة الوحدة بنجاح', 'success');
                if (titleInput) titleInput.value = '';
                loadAndDisplayCourseContent(courseId, teacherId);
            } else {
                showNotification(data.message || 'فشل إضافة الوحدة', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // EDIT SECTION NAME
    window.editSectionNameDB = function(courseId, sectionId, currentName) {
        const newName = prompt('أدخل الاسم الجديد للوحدة:', currentName);
        if (!newName || newName.trim() === '') return;

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'update_section');
        formData.append('section_id', sectionId);
        formData.append('title', newName.trim());
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم تحديث الوحدة بنجاح', 'success');
                loadAndDisplayCourseContent(courseId, teacherId);
            } else {
                showNotification(data.message || 'فشل التحديث', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // DELETE SECTION
    window.deleteSectionDB = function(courseId, sectionId) {
        if (!confirm('حذف هذه الوحدة سيحذف جميع الخيارات والمحتويات بداخلها. هل أنت متأكد؟')) return;

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'delete_section');
        formData.append('section_id', sectionId);
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم حذف الوحدة بنجاح', 'success');
                loadAndDisplayCourseContent(courseId, teacherId);
            } else {
                showNotification(data.message || 'فشل الحذف', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // ADD SUBSECTION
    window.addSubsectionDB = function(courseId, sectionId) {
        const titleInput = document.getElementById(`newSubsectionTitle_${sectionId}`);
        const title = titleInput ? titleInput.value.trim() : '';
        
        if (!title) {
            showNotification('الرجاء إدخال عنوان الخيار', 'error');
            return;
        }

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'add_subsection');
        formData.append('section_id', sectionId);
        formData.append('title', title);
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم إضافة الخيار بنجاح', 'success');
                if (titleInput) titleInput.value = '';
                loadAndDisplayCourseContent(courseId, teacherId);
            } else {
                showNotification(data.message || 'فشل إضافة الخيار', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // EDIT SUBSECTION NAME
    window.editSubsectionNameDB = function(courseId, subsectionId, currentName) {
        const newName = prompt('أدخل الاسم الجديد للخيار:', currentName);
        if (!newName || newName.trim() === '') return;

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'update_subsection');
        formData.append('subsection_id', subsectionId);
        formData.append('title', newName.trim());
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم تحديث الخيار بنجاح', 'success');
                loadAndDisplayCourseContent(currentEditingCourseId, teacherId);
            } else {
                showNotification(data.message || 'فشل التحديث', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // DELETE SUBSECTION
    window.deleteSubsectionDB = function(courseId, subsectionId) {
        if (!confirm('حذف هذا الخيار سيحذف جميع المحتويات بداخله. هل أنت متأكد؟')) return;

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'delete_subsection');
        formData.append('subsection_id', subsectionId);
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم حذف الخيار بنجاح', 'success');
                loadAndDisplayCourseContent(courseId, teacherId);
            } else {
                showNotification(data.message || 'فشل الحذف', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // ADD VIDEO
    window.addVideoDB = function(courseId, subsectionId) {
        const titleInput = document.getElementById(`videoTitle_${subsectionId}`);
        const title = titleInput ? titleInput.value.trim() : '';
        
        if (!title) {
            showNotification('الرجاء إدخال عنوان المحتوى', 'error');
            return;
        }

        const type = document.querySelector(`input[name="vSource_${subsectionId}"]:checked`).value;
        let url = '';

        if (type === 'url') {
            const urlInput = document.getElementById(`videoUrl_${subsectionId}`);
            url = urlInput ? urlInput.value.trim() : '';
            if (!url) {
                showNotification('الرجاء إدخال رابط المحتوى', 'error');
                return;
            }
        } else {
            const fileInput = document.getElementById(`videoFile_${subsectionId}`);
            if (!fileInput || fileInput.files.length === 0) {
                showNotification('الرجاء اختيار ملف فيديو', 'error');
                return;
            }
            url = fileInput.files[0].name;
        }

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'add_video');
        formData.append('subsection_id', subsectionId);
        formData.append('title', title);
        formData.append('url', url);
        formData.append('video_type', type);
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم إضافة المحتوى بنجاح', 'success');
                if (titleInput) titleInput.value = '';
                loadAndDisplayCourseContent(courseId, teacherId);
            } else {
                showNotification(data.message || 'فشل إضافة المحتوى', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // EDIT VIDEO NAME
    window.editVideoNameDB = function(courseId, videoId, currentName) {
        const newName = prompt('أدخل الاسم الجديد للمحتوى:', currentName);
        if (!newName || newName.trim() === '') return;

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'update_video');
        formData.append('video_id', videoId);
        formData.append('title', newName.trim());
        formData.append('url', currentName); // Keep the same URL
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم تحديث اسم المحتوى بنجاح', 'success');
                loadAndDisplayCourseContent(courseId, teacherId);
            } else {
                showNotification(data.message || 'فشل التحديث', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // DELETE VIDEO
    window.deleteVideoDB = function(courseId, videoId) {
        if (!confirm('هل أنت متأكد من حذف هذا المحتوى؟')) return;

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;

        const formData = new FormData();
        formData.append('action', 'delete_video');
        formData.append('video_id', videoId);
        formData.append('teacher_id', teacherId);

        fetch('PHP/course_content_api.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('تم حذف المحتوى بنجاح', 'success');
                loadAndDisplayCourseContent(courseId, teacherId);
            } else {
                showNotification(data.message || 'فشل الحذف', 'error');
            }
        })
        .catch(e => {
            console.error(e);
            showNotification('حدث خطأ', 'error');
        });
    };

    // Delete course
    window.deleteCourse = function(courseId) {
        // Show confirmation dialog
        const dialog = confirm('⚠️ تحذير: هل أنت متأكد من حذف هذا الكورس؟\nهذا الإجراء لا يمكن التراجع عنه!');
        
        if (!dialog) {
            return; // User cancelled
        }

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const teacherId = currentUser?.id;
        
        // Show loading state
        showNotification('جاري حذف الكورس...', 'success');
        
        // Use FormData to properly send form data
        const formData = new FormData();
        formData.append('action', 'delete_course');
        formData.append('course_id', courseId);
        if (teacherId) {
            formData.append('teacher_id', teacherId);
        }
        
        fetch('PHP/courses_api.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response status:', response.status);
            return response.text().then(text => {
                console.log('Response text:', text);
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error('Invalid JSON response: ' + text);
                }
            });
        })
        .then(result => {
            console.log('Delete result:', result);
            if (result.success) {
                showNotification('✅ تم حذف الكورس بنجاح', 'success');
                // Reload the courses after a short delay
                setTimeout(() => {
                    loadTeacherCourses();
                }, 500);
            } else {
                showNotification('❌ ' + (result.message || 'حدث خطأ في حذف الكورس'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('❌ خطأ في الاتصال بالخادم: ' + error.message, 'error');
        });
    };

    // Helper for Background Style
    async function getCourseBackgroundStyle(course) {
        if (course.imageId && typeof getImageFromDB === 'function') {
            try {
                const imageBlob = await getImageFromDB(course.imageId);
                if (imageBlob) {
                    const url = URL.createObjectURL(imageBlob);
                    return `background-image: url('${url}'); background-size: cover; background-position: center; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.7);`;
                }
            } catch (e) { console.error(e); }
        }
        return `background-color: ${course.imageColor || '#b2bec3'};`;
    }

    window.editSectionTitle = function(courseId, secIndex) {
        const courses = getCourses();
        const currentTitle = courses[courseId].sections[secIndex].title;
        const newTitle = prompt("أدخل الاسم الجديد للوحدة:", currentTitle);
        
        if (newTitle && newTitle.trim() !== "") {
            courses[courseId].sections[secIndex].title = newTitle.trim();
            localStorage.setItem('coursesDB', JSON.stringify(courses));
            renderSections(courseId);
            showNotification('تم تعديل اسم الوحدة بنجاح', 'success');
        }
    };

    window.editSubSectionTitle = function(courseId, secIndex, subSecIndex) {
        const courses = getCourses();
        const currentTitle = courses[courseId].sections[secIndex].subSections[subSecIndex].title;
        const newTitle = prompt("أدخل الاسم الجديد للخيار:", currentTitle);
        
        if (newTitle && newTitle.trim() !== "") {
            courses[courseId].sections[secIndex].subSections[subSecIndex].title = newTitle.trim();
            localStorage.setItem('coursesDB', JSON.stringify(courses));
            renderSections(courseId);
            showNotification('تم تعديل اسم الخيار بنجاح', 'success');
        }
    };

    window.editVideoTitle = function(courseId, secIndex, subSecIndex, videoIndex) {
        const courses = getCourses();
        const currentTitle = courses[courseId].sections[secIndex].subSections[subSecIndex].videos[videoIndex].title;
        const newTitle = prompt("أدخل الاسم الجديد للمحتوى:", currentTitle);
        
        if (newTitle && newTitle.trim() !== "") {
            courses[courseId].sections[secIndex].subSections[subSecIndex].videos[videoIndex].title = newTitle.trim();
            localStorage.setItem('coursesDB', JSON.stringify(courses));
            renderSections(courseId);
            showNotification('تم تعديل اسم المحتوى بنجاح', 'success');
        }
    };

    // Initial Load - Load courses from database and display them
    loadTeacherCourses();
    showSection(sectionMyCourses);  // Show courses section by default
    
    // Initialize jQuery draggable for sections (if jQuery UI is loaded)
    setTimeout(() => {
        initializeDraggableSections();
    }, 500);
});

// Initialize draggable sections for teacher dashboard
function initializeDraggableSections() {
    if (typeof jQuery === 'undefined' || typeof jQuery.ui === 'undefined') {
        console.log('jQuery UI not loaded for teacher sections, retrying...');
        setTimeout(initializeDraggableSections, 500);
        return;
    }

    const $ = jQuery;
    const contentArea = $('.main-content');
    
    if (contentArea.length === 0) return;

    // Make main content sections draggable
    [
        '#sectionMyCourses',
        '#sectionAddCourse',
        '#sectionSettings',
        '#sectionEditContent'
    ].forEach(selector => {
        const section = $(selector);
        if (section.length > 0) {
            section.draggable({
                handle: 'h2',
                containment: '.main-content',
                cursor: 'move',
                opacity: 0.8,
                revert: 'invalid',
                distance: 10
            });
        }
    });
}

function deleteTeacherAccount() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.id) {
        showNotification('خطأ: معلومات المستخدم غير متوفرة.', 'error');
        return;
    }

    fetch('PHP/dashboard_api.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'delete_teacher_account',
            teacher_id: currentUser.id
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم حذف حسابك بنجاح. سيتم تحويلك الآن...', 'success');
            setTimeout(() => {
                sessionStorage.removeItem('currentUser');
                localStorage.removeItem('ls_teacherName');
                localStorage.removeItem('ls_userRole');
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showNotification('خطأ في حذف الحساب: ' + (data.message || 'حدث خطأ غير معروف'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('خطأ في الاتصال بالخادم.', 'error');
    });
}
// Add first course link handler
document.addEventListener('DOMContentLoaded', function() {
    const addFirstCourseLink = document.getElementById('addFirstCourseLink');
    if (addFirstCourseLink) {
        addFirstCourseLink.addEventListener('click', (e) => {
            e.preventDefault();
            const navAddCourse = document.getElementById('navAddCourse');
            if (navAddCourse) {
                navAddCourse.click();
            }
        });
    }
});
