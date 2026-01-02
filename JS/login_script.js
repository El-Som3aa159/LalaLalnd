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

    // Disable default HTML5 validation to use our custom alerts
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.setAttribute('novalidate', true);
    }
};

// Regex Patterns
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Real-time validation function for login
function validateLoginField(fieldId, regex = null) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');
    
    if (!input || !errorEl) return true;

    const value = input.value.trim();
    let isValid = true;

    if (regex) {
        isValid = regex.test(value);
    } else {
        isValid = value.length > 0;
    }

    if (!isValid && input.value.length > 0) {
        errorEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
    }

    return isValid;
}

// Add real-time validation listeners for login
document.getElementById('email')?.addEventListener('blur', () => validateLoginField('email', emailRegex));
document.getElementById('email')?.addEventListener('input', () => validateLoginField('email', emailRegex));

document.getElementById('password')?.addEventListener('blur', () => validateLoginField('password'));
document.getElementById('password')?.addEventListener('input', () => validateLoginField('password'));

// Form Submission Logic
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Get Values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const userType = document.querySelector('input[name="userType"]:checked').value;

    // 1. Input Validation (Empty Fields)
    if (email === "" || password === "") {
        showNotification("البريد الإلكتروني وكلمة المرور مطلوبان.", 'error');
        return;
    }

    // 2. Email Regex Validation
    if (!emailRegex.test(email)) {
        document.getElementById('emailError').style.display = 'block';
        showNotification("يرجى إدخال بريد إلكتروني صحيح.", 'error');
        return;
    }

    // 3. Send login request to backend
    showNotification("جاري التحقق...", 'success');

    fetch('PHP/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'login',
            email: email,
            password: password,
            role: userType
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('🔐 Login response received:', data);
        
        if (data.success) {
            console.log('✓ Login successful. Saving to sessionStorage:', data.user);
            showNotification("تم تسجيل الدخول بنجاح. جاري التحميل...", 'success');

            // Store user data in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(data.user));
            console.log('✓ Saved to sessionStorage. Verification:', JSON.parse(sessionStorage.getItem('currentUser')));

            // Store in localStorage for persistence
            localStorage.setItem('ls_userRole', userType);
            if (userType === 'student') {
                localStorage.setItem('ls_studentName', data.user.name);
            } else {
                localStorage.setItem('ls_teacherName', data.user.name);
            }

            // Redirect after delay
            setTimeout(() => {
                if (userType === 'student') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'teacher_dashboard.html';
                }
            }, 1500);
        } else {
            console.error('❌ Login failed:', data.message);
            showNotification("خطأ: " + (data.message || 'فشل تسجيل الدخول'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Fetch error:', error);
        showNotification("خطأ في الاتصال بالخادم", 'error');
    });
});
