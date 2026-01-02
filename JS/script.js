document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Dark Mode Logic ---
    // Handled by theme.js

    // --- 2. Button Linking ---
    
    // Register Buttons (Header and Hero)
    const registerButtons = document.querySelectorAll('.btn-register, .btn-hero');
    
    registerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // If it's a button element (not an anchor), redirect manually
            if (btn.tagName === 'BUTTON') {
                window.location.href = 'student_register.html';
            }
        });
    });

    // Browse Courses Button
    const browseBtn = document.querySelector('.btn-browse');
    if (browseBtn) {
        browseBtn.removeAttribute('onclick'); 
        browseBtn.addEventListener('click', () => {
            alert('سيتم توجيهك إلى صفحة الكورسات الكاملة.');
        });
    }

    // --- 3. Load Teachers from Database ---
    loadTeachersFromDB();

    // --- 4. Grade Filters (Logic) ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Function to filter teachers
    function filterTeachers(grade) {
        const teacherCards = document.querySelectorAll('.teacher-card');
        teacherCards.forEach(card => {
            if (card.classList.contains(`teaches-grade-${grade}`)) {
                card.classList.remove('hidden');
                card.style.animation = 'fadeIn 0.5s ease';
            } else {
                card.classList.add('hidden');
            }
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const grade = btn.getAttribute('data-filter');
            filterTeachers(grade);
        });
    });
});

// Load teachers from database
async function loadTeachersFromDB() {
    try {
        const response = await fetch('/LalaLalnd/PHP/teachers.php?action=list');
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            const container = document.getElementById('teachersContainer');
            
            if (result.data.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #636e72; grid-column: 1/-1;">لا توجد معلمين مسجلين حالياً.</p>';
                return;
            }

            container.innerHTML = '';
            
            result.data.forEach(teacher => {
                // Get grades from database if available
                const grades = teacher.grades && Array.isArray(teacher.grades) ? teacher.grades : [];
                
                // Create grade classes for filtering
                const gradeClasses = grades.length > 0 
                    ? grades.map(g => `teaches-grade-${g}`).join(' ')
                    : 'teaches-grade-all';
                
                const card = document.createElement('div');
                card.className = `teacher-card ${gradeClasses}`;
                card.style.cursor = 'pointer';
                card.style.transition = 'all 0.3s ease';
                
                // Create grade badges
                const gradeBadgesHTML = grades.length > 0
                    ? grades.map(g => `<span class="grade-badge">${getGradeLabel(g)}</span>`).join('')
                    : '<span class="grade-badge">جميع الصفوف</span>';
                
                card.innerHTML = `
                    <div class="teacher-avatar">👨‍🏫</div>
                    <h3 class="teacher-name">${teacher.full_name}</h3>
                    <p class="teacher-subject">${teacher.specialization}</p>
                    <div class="badges">
                        ${gradeBadgesHTML}
                    </div>
                `;
                
                // Make card clickable - navigate to teacher profile
                card.addEventListener('click', () => {
                    window.location.href = `teacher_profile.html?teacher_id=${teacher.id}`;
                });
                
                // Add hover effect
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-8px)';
                    card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = '';
                });
                
                container.appendChild(card);
            });

            // Show grade 1 by default
            filterTeachersByGrade('1');
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
        const container = document.getElementById('teachersContainer');
        container.innerHTML = '<p style="text-align: center; color: #d63031; grid-column: 1/-1;">خطأ في تحميل المدرسين</p>';
    }
}

// Convert grade code to display label
function getGradeLabel(grade) {
    const gradeLabels = {
        '1': 'الصف الأول',
        '2': 'الصف الثاني',
        '3': 'الصف الثالث',
        'secondary': 'الثانوي'
    };
    return gradeLabels[grade] || 'جميع الصفوف';
}

// Map specialization to grade classes
function getGradeClassesForSpecialization(specialization) {
    const specializations = {
        'رياضيات': 'teaches-grade-1 teaches-grade-2 teaches-grade-3',
        'عربي': 'teaches-grade-1 teaches-grade-3',
        'عربية': 'teaches-grade-1 teaches-grade-3',
        'لغة عربية': 'teaches-grade-1 teaches-grade-3',
        'فيزياء': 'teaches-grade-3',
        'كيمياء': 'teaches-grade-1 teaches-grade-2 teaches-grade-3',
        'جغرافيا': 'teaches-grade-1',
        'تاريخ': 'teaches-grade-2',
        'أحياء': 'teaches-grade-2 teaches-grade-3',
        'إنجليزي': 'teaches-grade-1 teaches-grade-2',
        'english': 'teaches-grade-1 teaches-grade-2',
        'mathematics': 'teaches-grade-1 teaches-grade-2 teaches-grade-3',
        'physics': 'teaches-grade-3',
        'chemistry': 'teaches-grade-1 teaches-grade-2 teaches-grade-3'
    };
    
    // Search case-insensitive
    for (const [key, value] of Object.entries(specializations)) {
        if (specialization.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(specialization.toLowerCase())) {
            return value;
        }
    }
    
    // Default: teach all grades
    return 'teaches-grade-1 teaches-grade-2 teaches-grade-3';
}

// Filter by grade
function filterTeachersByGrade(grade) {
    const cards = document.querySelectorAll('.teacher-card');
    cards.forEach(card => {
        if (card.classList.contains(`teaches-grade-${grade}`)) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

// Add fade in animation style dynamically
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(styleSheet);
