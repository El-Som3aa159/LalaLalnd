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

    // 2. Clear old cached teacher data to force fresh database load
    localStorage.removeItem('teachers');
    localStorage.removeItem('followedTeachers');
    localStorage.removeItem('cachedTeachers');

    // 3. Name Loading (Fix Name Leakage)
    // Since this is the STUDENT dashboard, we specifically look for the student name.
    // We do NOT rely on 'ls_userRole' because it might be overwritten if a teacher logs in on another tab.
    const savedName = localStorage.getItem('ls_studentName');

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
    
    // --- 1. User Info & Balance ---
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser) {
        // Add class based on role (optional visual distinction)
        if (currentUser.role === 'student') document.body.classList.add('is-student');
        if (currentUser.role === 'teacher') document.body.classList.add('is-teacher');
    }

    const balanceDisplay = document.getElementById('dashboardBalance');
    if (balanceDisplay) {
        const currentBalance = localStorage.getItem('userBalance') || '0';
        balanceDisplay.textContent = `الرصيد: ${currentBalance} ج.م`;
    }

    // --- 2. Sidebar Toggle Logic ---
    const userLogoToggle = document.getElementById('userLogoToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (userLogoToggle && sidebar) {
        userLogoToggle.addEventListener('click', () => {
            sidebar.classList.toggle('closed');
        });
    }

    // --- 3. Navigation Logic ---
    const navLinks = {
        'navMyCourses': 'sectionMyCourses',
        'navPomodoro': 'sectionPomodoro',
        'navExplore': 'sectionExplore',
        'navTeachers': 'sectionTeachers',
        'navSettings': 'settingsSection'
    };

    Object.keys(navLinks).forEach(navId => {
        const navItem = document.getElementById(navId);
        if (navItem) {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all nav items
                document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
                navItem.classList.add('active');

                // Hide all sections
                document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
                
                // Show target section
                const targetSection = document.getElementById(navLinks[navId]);
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                }
                
                // Load teachers when Teachers nav is clicked
                if (navId === 'navTeachers') {
                    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
                    if (currentUser && currentUser.grade) {
                        loadTeachersForGrade(currentUser.grade);
                    }
                }
            });
        }
    });

    // Logout
    const navLogout = document.getElementById('navLogout');
    if (navLogout) {
        navLogout.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    // --- Settings Button in Header ---
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
            // Show settings section
            const settingsSection = document.getElementById('settingsSection');
            if (settingsSection) {
                settingsSection.classList.remove('hidden');
            }
            // Update active nav item
            document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
            const navSettings = document.getElementById('navSettings');
            if (navSettings) {
                navSettings.classList.add('active');
            }
        });
    }

    // --- 4. Settings Functionality ---
    
    // Profile Update Logic (Name and Email)
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
            
            // Debug log to verify user data
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

            // Determine if student or teacher and call appropriate update
            const userRole = localStorage.getItem('ls_userRole') || currentUser.role;
            console.log('User Role:', userRole, 'User ID:', currentUser.id);
            
            if (userRole === 'student') {
                updateStudentProfile(currentUser.id, fullName, email, newNameInput, newEmailInput, currentUser);
            } else if (userRole === 'teacher') {
                updateTeacherProfile(currentUser.id, fullName, email, newNameInput, newEmailInput, currentUser);
            } else {
                showNotification("خطأ: لم يتم تحديد دور المستخدم.", 'error');
            }
        });
    }

    function isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    function updateStudentProfile(studentId, fullName, email, nameInput, emailInput, currentUser) {
        // Ensure email is always provided - if not changed, use current email
        const finalEmail = email.trim() !== '' ? email : (currentUser && currentUser.email ? currentUser.email : '');
        
        console.log('=== STUDENT PROFILE UPDATE ===' );
        console.log('Student ID:', studentId);
        console.log('Full Name:', fullName);
        console.log('Email:', finalEmail);
        
        if (!finalEmail) {
            showNotification("خطأ: لا يوجد بريد إلكتروني للتحديث", 'error');
            return;
        }
        
        const payload = {
            action: 'update_student_profile',
            student_id: parseInt(studentId),
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
                // Update local storage and session storage
                localStorage.setItem('ls_studentName', fullName);
                const nameDisplays = document.querySelectorAll('#userNameDisplay');
                nameDisplays.forEach(el => el.textContent = fullName);
                
                // Update session storage
                const updatedUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
                updatedUser.name = fullName;
                updatedUser.email = finalEmail;
                sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

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

    function updateTeacherProfile(teacherId, fullName, email, nameInput, emailInput, currentUser) {
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
                // Update local storage and session storage
                localStorage.setItem('ls_teacherName', fullName);
                const nameDisplays = document.querySelectorAll('#userNameDisplay');
                nameDisplays.forEach(el => el.textContent = fullName);
                
                // Update session storage
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
                currentUser.name = fullName;
                currentUser.email = finalEmail;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

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

    // Wallet Top-up
    const topUpButton = document.getElementById('topUpButton');
    const walletInput = document.getElementById('walletAmount');
    
    if (topUpButton && walletInput) {
        topUpButton.addEventListener('click', () => {
            const amount = parseFloat(walletInput.value);
            if (amount && amount > 0) {
                // 1. Get current balance
                let currentBalance = parseFloat(localStorage.getItem('userBalance')) || 0;
                
                // 2. Add amount
                currentBalance += amount;
                
                // 3. Save back to localStorage
                localStorage.setItem('userBalance', currentBalance);
                
                // 4. Update Display
                const balanceDisplay = document.getElementById('dashboardBalance');
                if (balanceDisplay) {
                    balanceDisplay.textContent = `الرصيد: ${currentBalance} ج.م`;
                }

                showNotification(`تم شحن المحفظة بمبلغ ${amount} جنيه بنجاح.`, 'success');
                walletInput.value = ''; // Clear input
            } else {
                showNotification('الرجاء إدخال مبلغ صحيح.', 'error');
            }
        });
    }

    // Delete Account
    const deleteAccountButton = document.getElementById('deleteAccountButton');
    if (deleteAccountButton) {
        deleteAccountButton.addEventListener('click', () => {
            const confirmed = confirm('⚠️ تحذير: حذف الحساب لا يمكن التراجع عنه. هل أنت متأكد من رغبتك في حذف حسابك نهائياً؟');
            if (confirmed) {
                const finalConfirm = prompt('اكتب "نعم" للتأكيد النهائي لحذف الحساب:');
                if (finalConfirm === 'نعم') {
                    deleteStudentAccount();
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

    // --- 5. Dynamic Content (Courses) ---
    // Don't use global enrolledIds - load per student

    // Color palette for courses
    const courseColors = ['#e17055', '#0984e3', '#6c5ce7', '#00b894', '#fdcb6e', '#d63031', '#74b9ff', '#a29bfe', '#fab1a0', '#fd79a8'];
    
    function getColorForCourse(courseId) {
        // Use course ID to consistently assign a color
        return courseColors[courseId % courseColors.length];
    }
    
    async function getCourseBackgroundStyle(course) {
        // Check for wallpaper image first
        if (course.wallpaper) {
            return `background-image: url('${course.wallpaper}'); background-size: cover; background-position: center; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.7);`;
        }
        
        if (course.imageId && typeof getImageFromDB === 'function') {
            try {
                const imageBlob = await getImageFromDB(course.imageId);
                if (imageBlob) {
                    const url = URL.createObjectURL(imageBlob);
                    return `background-image: url('${url}'); background-size: cover; background-position: center; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.7);`;
                }
            } catch (e) { console.error(e); }
        }
        
        // Use image_color from database, or generate one based on course ID
        let bgColor = course.image_color || course.imageColor;
        if (!bgColor || bgColor === '0' || bgColor === '0.00') {
            bgColor = getColorForCourse(course.id);
        }
        return `background-color: ${bgColor}; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.7);`;
    }

    // Load and render courses from database
    async function loadAllCourses() {
        try {
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            
            // Get all courses from database
            const response = await fetch('PHP/courses.php?action=list');
            if (!response.ok) throw new Error('Failed to fetch courses');
            
            const data = await response.json();
            if (!data.success || !Array.isArray(data.data)) {
                throw new Error('Invalid response format');
            }
            
            const courses = data.data;
            console.log('Loaded all courses from database:', courses);
            
            // Get enrolled courses from database for this student
            let enrolledIds = [];
            if (currentUser && currentUser.id && currentUser.role === 'student') {
                try {
                    const enrollResponse = await fetch(`PHP/enrollments.php?action=list&student_id=${currentUser.id}`);
                    if (enrollResponse.ok) {
                        const enrollData = await enrollResponse.json();
                        if (enrollData.success && Array.isArray(enrollData.data)) {
                            enrolledIds = enrollData.data.map(c => parseInt(c.id));
                            console.log('Enrolled courses from DB:', enrolledIds);
                        }
                    }
                } catch (e) {
                    console.error('Error loading enrolled courses from DB:', e);
                }
            }
            
            // === RENDER "دوراتي" (My Courses) - ONLY ENROLLED COURSES ===
            const myCoursesGrid = document.getElementById('myCoursesGrid');
            if (myCoursesGrid) {
                if (enrolledIds.length === 0) {
                    myCoursesGrid.innerHTML = '<p style="text-align: center; color: #636e72; width: 100%;">لم تقم بشراء أي كورس بعد. اذهب إلى استكشاف الكورسات!</p>';
                } else {
                    myCoursesGrid.innerHTML = '';
                    for (const courseId of enrolledIds) {
                        const course = courses.find(c => parseInt(c.id) === courseId);
                        if (course) {
                            const bgStyle = await getCourseBackgroundStyle(course);
                            const teacherName = course.teacher_name || 'معلم';
                            myCoursesGrid.innerHTML += `
                                <div class="course-card">
                                    <div class="card-img" style="${bgStyle}">
                                        <h4 style="margin: 0; font-size: 1.1rem;">${course.title}</h4>
                                    </div>
                                    <div class="card-body">
                                        <p style="font-size: 0.85rem; color: #636e72; margin: 8px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">👨‍🏫 <a href="teacher_profile.html?teacher_id=${course.teacher_id}" style="color: #3498db; text-decoration: none; cursor: pointer;">${teacherName}</a></p>
                                        <button class="btn-continue" onclick="window.location.href='lesson_page.html?course_id=${course.id}'" style="width: 100%;">متابعة التعلم</button>
                                    </div>
                                </div>`;
                        }
                    }
                }
            }
            
            // === RENDER "استكشاف الكورسات" (Explore Courses) - ALL COURSES ===
            const exploreCoursesGrid = document.getElementById('exploreCoursesGrid');
            if (exploreCoursesGrid) {
                exploreCoursesGrid.innerHTML = '';
                
                if (courses.length === 0) {
                    exploreCoursesGrid.innerHTML = '<p style="text-align: center; color: #636e72; width: 100%;">لا توجد كورسات متاحة حالياً.</p>';
                } else {
                    for (const course of courses) {
                        const isEnrolled = enrolledIds.includes(parseInt(course.id));
                        const coursePrice = parseFloat(course.price) || 0;
                        const priceText = coursePrice > 0 ? coursePrice + ' ج.م' : 'مجاني';
                        const bgStyle = await getCourseBackgroundStyle(course);
                        const teacherName = course.teacher_name || 'معلم';
                        
                        // Course details page - to view full course info before purchase
                        const detailsAction = `window.location.href='course_details.html?id=${course.id}'`;
                        const btnText = isEnrolled ? '✅ مشتريته' : 'شراء الآن';
                        const btnClass = isEnrolled ? 'btn-enrolled' : 'btn-enroll';
                        
                        exploreCoursesGrid.innerHTML += `
                            <div class="course-card">
                                <div class="card-img" style="${bgStyle}">
                                    <h4 style="margin: 0; font-size: 1.1rem;">${course.title}</h4>
                                </div>
                                <div class="card-body">
                                    <p style="font-size: 0.85rem; color: #636e72; margin: 8px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">👨‍🏫 <a href="teacher_profile.html?teacher_id=${course.teacher_id}" style="color: #3498db; text-decoration: none; cursor: pointer;">${teacherName}</a></p>
                                    <p style="font-size: 0.9rem; color: #2c3e50; font-weight: bold; margin: 8px 0;">${priceText}</p>
                                    <button class="${btnClass}" onclick="${detailsAction}" style="width: 100%;" ${isEnrolled ? 'disabled' : ''}>${btnText}</button>
                                </div>
                            </div>`;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error loading courses:', error);
            const exploreCoursesGrid = document.getElementById('exploreCoursesGrid');
            if (exploreCoursesGrid) {
                exploreCoursesGrid.innerHTML = '<p style="text-align: center; color: #e74c3c; width: 100%;">خطأ في تحميل الكورسات. يرجى تحديث الصفحة.</p>';
            }
        }
    }
    
    // Buy Course Function - calls backend API
    function buyCourse(courseId, price, courseName) {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser || currentUser.role !== 'student') {
            showNotification('يرجى تسجيل الدخول أولاً كطالب.', 'error');
            return;
        }

        // Call backend API to process purchase
        fetch('PHP/enrollments.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'purchase',
                student_id: currentUser.id,
                course_id: courseId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(`✅ تم شراء "${courseName}" بنجاح!`, 'success');
                // Reload all courses to update display
                loadAllCourses();
            } else {
                if (data.message === 'Insufficient balance') {
                    showNotification(`❌ رصيدك غير كافي. تحتاج ${data.required} ج.م ولديك ${data.available} ج.م`, 'error');
                } else if (data.message.includes('already')) {
                    showNotification('أنت مسجل بالفعل في هذا الكورس!', 'error');
                } else {
                    showNotification(data.message || 'حدث خطأ في عملية الشراء', 'error');
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('❌ خطأ في الاتصال بالخادم', 'error');
        });
    }
    
    // Call the load function when page loads
    loadAllCourses();

    // --- 5. Load Student Data and Teachers by Grade ---
    function loadStudentDashboard() {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser || currentUser.role !== 'student') return;

        // Load student data
        fetch('PHP/dashboard_api.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json; charset=utf-8'},
            body: JSON.stringify({
                action: 'get_student_data',
                student_id: currentUser.id
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.student) {
                const student = data.student;
                // Save to session for later use
                currentUser.grade = student.grade;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        })
        .catch(error => console.error('Error loading student data:', error));
    }

    function loadTeachersForGrade(grade) {
        fetch('PHP/dashboard_api.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json; charset=utf-8'},
            body: JSON.stringify({
                action: 'get_teachers_for_grade',
                grade: grade
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.teachers) {
                displayTeachersForGrade(data.teachers);
            }
        })
        .catch(error => console.error('Error loading teachers:', error));
    }

    function displayTeachersForGrade(teachers) {
        const teachersSection = document.getElementById('teachersList');
        if (!teachersSection) return;

        let html = '';
        
        if (teachers.length === 0) {
            html = '<p style="grid-column: 1/-1; text-align: center;">لا توجد معلمون متاحون لصفك حالياً.</p>';
        } else {
            teachers.forEach(teacher => {
                html += `
                    <div class="course-card">
                        <div class="card-img" style="background-color: #6c5ce7; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 2rem;">👨‍🏫</span>
                        </div>
                        <div class="card-body">
                            <h3>${teacher.full_name}</h3>
                            <p style="font-size: 0.85rem; color: #636e72;">التخصص: ${teacher.specialization}</p>
                            <button class="btn-continue" onclick="window.location.href='teacher_profile.html?teacher_id=${teacher.id}'" style="width: 100%;">متابعة</button>
                        </div>
                    </div>
                `;
            });
        }
        teachersSection.innerHTML = html;
    }

    // Load and display teachers in the Followed section
    function loadFollowedTeachers(grade) {
        fetch('PHP/dashboard_api.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json; charset=utf-8'},
            body: JSON.stringify({
                action: 'get_teachers_for_grade',
                grade: grade
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.teachers) {
                displayFollowedTeachers(data.teachers);
            } else {
                showNotification('فشل في تحميل المعلمين', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading followed teachers:', error);
            showNotification('خطأ في الاتصال بالخادم', 'error');
        });
    }

    // Display teachers in the Followed Teachers section
    function displayFollowedTeachers(teachers) {
        const followedList = document.getElementById('followedTeachersList');
        if (!followedList) return;

        let html = '';
        
        if (teachers.length === 0) {
            html = '<p>لا توجد معلمون متاحون لصفك حالياً.</p>';
        } else {
            teachers.forEach(teacher => {
                html += `
                    <div class="teacher-card">
                        <div class="teacher-avatar">👨‍🏫</div>
                        <h3>${teacher.full_name}</h3>
                        <p>${teacher.specialization}</p>
                        <p style="font-size: 0.85rem; color: #636e72;">البريد: ${teacher.email}</p>
                        <button class="btn-outline" onclick="viewTeacherProfile(${teacher.id})">عرض الملف</button>
                    </div>
                `;
            });
        }
        followedList.innerHTML = html;
    }

    // Function to view teacher profile
    window.viewTeacherProfile = function(teacherId) {
        window.location.href = `teacher_profile.html?teacher_id=${teacherId}`;
    };

    // Load student dashboard data if student
    currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser && currentUser.role === 'student') {
        loadStudentDashboard();
    }

    // Initialize Pomodoro Timer
    initializePomodoroTimer();
    
    // Initialize Draggable Cards with jQuery
    setTimeout(initializeDraggableCards, 500);
    
    // Initialize Draggable Sections with jQuery
    setTimeout(initializeDraggableSections, 500);
});

// ============================================
// POMODORO TIMER MODULE
// ============================================

function initializePomodoroTimer() {
    let timerInterval = null;
    let isRunning = false;
    let totalSeconds = 0;
    let remainingSeconds = 0;

    const timerMinutesInput = document.querySelector('#timerMinutes');
    const timerSecondsInput = document.querySelector('#timerSeconds');
    const timerDisplayText = document.querySelector('#timerDisplay');
    const timerStartBtn = document.querySelector('#timerStartBtn');
    const timerResetBtn = document.querySelector('#timerResetBtn');
    const timerStatus = document.querySelector('#timerStatus');

    // Check if all elements exist
    if (!timerMinutesInput || !timerSecondsInput || !timerDisplayText || !timerStartBtn || !timerResetBtn || !timerStatus) {
        console.log('Timer elements not found, skipping initialization');
        return;
    }

    // Initialize display
    updateTimerDisplay();

    // Input change listeners
    if (timerMinutesInput) {
        timerMinutesInput.addEventListener('change', function() {
            if (!isRunning) {
                const minutes = Math.max(0, Math.min(99, parseInt(this.value) || 0));
                this.value = String(minutes).padStart(2, '0');
                updateTimerDisplay();
            }
        });

        timerMinutesInput.addEventListener('blur', function() {
            if (!isRunning) {
                const minutes = Math.max(0, Math.min(99, parseInt(this.value) || 0));
                this.value = String(minutes).padStart(2, '0');
                updateTimerDisplay();
            }
        });
    }

    if (timerSecondsInput) {
        timerSecondsInput.addEventListener('change', function() {
            if (!isRunning) {
                let seconds = Math.max(0, Math.min(59, parseInt(this.value) || 0));
                this.value = String(seconds).padStart(2, '0');
                updateTimerDisplay();
            }
        });

        timerSecondsInput.addEventListener('blur', function() {
            if (!isRunning) {
                let seconds = Math.max(0, Math.min(59, parseInt(this.value) || 0));
                this.value = String(seconds).padStart(2, '0');
                updateTimerDisplay();
            }
        });
    }

    // Start/Stop button
    if (timerStartBtn) {
        timerStartBtn.addEventListener('click', function() {
            if (!isRunning && remainingSeconds > 0) {
                startTimer();
            } else if (isRunning) {
                stopTimer();
            }
        });
    }

    // Reset button
    if (timerResetBtn) {
        timerResetBtn.addEventListener('click', function() {
            resetTimer();
        });
    }

    function startTimer() {
        if (remainingSeconds <= 0) {
            timerStatus.textContent = 'يرجى تعيين الوقت';
            return;
        }

        isRunning = true;
        timerMinutesInput.disabled = true;
        timerSecondsInput.disabled = true;
        timerStartBtn.textContent = 'إيقاف';
        timerStartBtn.classList.add('running');
        timerStatus.textContent = 'المؤقت قيد التشغيل...';

        timerInterval = setInterval(function() {
            remainingSeconds--;
            updateTimerDisplay();

            if (remainingSeconds <= 0) {
                stopTimer();
                timerStatus.textContent = 'انتهى الوقت! ✅';
                playNotificationSound();
            }
        }, 1000);
    }

    function stopTimer() {
        isRunning = false;
        clearInterval(timerInterval);
        timerMinutesInput.disabled = false;
        timerSecondsInput.disabled = false;
        timerStartBtn.textContent = 'ابدأ';
        timerStartBtn.classList.remove('running');
        timerStatus.textContent = 'متوقف';
    }

    function resetTimer() {
        stopTimer();
        const minutes = parseInt(timerMinutesInput.value) || 0;
        const seconds = parseInt(timerSecondsInput.value) || 0;
        remainingSeconds = minutes * 60 + seconds;
        updateTimerDisplay();
        timerStatus.textContent = 'جاهز للبدء';
    }

    function updateTimerDisplay() {
        if (!timerMinutesInput || !timerSecondsInput || !timerDisplayText) return;
        
        const minutes = Math.floor(parseInt(timerMinutesInput.value) || 0);
        const seconds = Math.floor(parseInt(timerSecondsInput.value) || 0);
        
        totalSeconds = minutes * 60 + seconds;
        remainingSeconds = totalSeconds;
        
        const displayMinutes = String(minutes).padStart(2, '0');
        const displaySeconds = String(seconds).padStart(2, '0');
        
        if (timerDisplayText) {
            timerDisplayText.textContent = `${displayMinutes}:${displaySeconds}`;
        }
    }

    function playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch(e) {
            console.log('Audio notification not available');
        }
    }
}

// ============================================
// DRAGGABLE CARDS MODULE
// ============================================

function initializeDraggableCards() {
    if (typeof jQuery === 'undefined' || typeof jQuery.ui === 'undefined') {
        console.log('jQuery UI not loaded, retrying...');
        setTimeout(initializeDraggableCards, 500);
        return;
    }

    const $ = jQuery;
    
    const settingsGrid = $('#settingsGrid');
    if (settingsGrid.length === 0) return;

    // Initialize sortable
    settingsGrid.sortable({
        items: '.draggable-card',
        placeholder: 'ui-sortable-placeholder',
        distance: 10,
        opacity: 0.8,
        revert: 150,
        cursor: 'move',
        start: function(event, ui) {
            ui.placeholder.height(ui.item.height());
        },
        stop: function(event, ui) {
            saveCardOrder();
        }
    });

    // Load saved order
    loadCardOrder();
}

function saveCardOrder() {
    if (typeof jQuery === 'undefined') return;

    const $ = jQuery;
    const order = [];
    
    $('#settingsGrid .draggable-card').each(function() {
        const cardId = $(this).attr('data-card-id');
        if (cardId) {
            order.push(cardId);
        }
    });
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const storageKey = `cardOrder_${currentUser.id || 'guest'}`;
    localStorage.setItem(storageKey, JSON.stringify(order));
    
    console.log('Card order saved:', order);
}

function loadCardOrder() {
    if (typeof jQuery === 'undefined') return;

    const $ = jQuery;
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const storageKey = `cardOrder_${currentUser.id || 'guest'}`;
    const savedOrder = JSON.parse(localStorage.getItem(storageKey));
    
    if (!savedOrder || savedOrder.length === 0) {
        return;
    }

    const container = $('#settingsGrid');
    const cards = container.find('.draggable-card');
    
    const cardMap = {};
    cards.each(function() {
        const id = $(this).attr('data-card-id');
        cardMap[id] = this;
    });

    savedOrder.forEach(cardId => {
        if (cardMap[cardId]) {
            container.append(cardMap[cardId]);
        }
    });

    console.log('Card order loaded:', savedOrder);
}

// Initialize Section-Level Dragging (for main dashboard sections)
function initializeDraggableSections() {
    if (typeof jQuery === 'undefined' || typeof jQuery.ui === 'undefined') {
        console.log('jQuery UI not loaded for sections, retrying...');
        setTimeout(initializeDraggableSections, 500);
        return;
    }

    const $ = jQuery;
    const contentArea = $('.main-content');
    
    if (contentArea.length === 0) return;

    // Make sections draggable
    $('.draggable-section').each(function() {
        $(this).draggable({
            handle: 'h2',  // Only drag by header
            containment: '.main-content',
            cursor: 'move',
            opacity: 0.8,
            revert: 'invalid',
            stop: function(event, ui) {
                saveSectionPositions();
            }
        });
    });

    loadSectionPositions();
}

function saveSectionPositions() {
    if (typeof jQuery === 'undefined') return;

    const $ = jQuery;
    const positions = {};
    
    $('.draggable-section').each(function() {
        const sectionId = $(this).attr('data-section-id');
        if (sectionId) {
            positions[sectionId] = {
                top: $(this).css('top'),
                left: $(this).css('left')
            };
        }
    });
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const storageKey = `sectionPositions_${currentUser.id || 'guest'}`;
    localStorage.setItem(storageKey, JSON.stringify(positions));
}

function loadSectionPositions() {
    if (typeof jQuery === 'undefined') return;

    const $ = jQuery;
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const storageKey = `sectionPositions_${currentUser.id || 'guest'}`;
    const savedPositions = JSON.parse(localStorage.getItem(storageKey));
    
    if (!savedPositions) return;

    Object.keys(savedPositions).forEach(sectionId => {
        const section = $(`[data-section-id="${sectionId}"]`);
        if (section.length > 0 && savedPositions[sectionId]) {
            section.css({
                top: savedPositions[sectionId].top,
                left: savedPositions[sectionId].left,
                position: 'absolute'
            });
        }
    });
}

function deleteStudentAccount() {
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
            action: 'delete_student_account',
            student_id: currentUser.id
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم حذف حسابك بنجاح. سيتم تحويلك الآن...', 'success');
            setTimeout(() => {
                sessionStorage.removeItem('currentUser');
                localStorage.removeItem('userBalance');
                localStorage.removeItem('ls_studentName');
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