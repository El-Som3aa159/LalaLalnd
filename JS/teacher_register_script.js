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

// Regex Patterns
// Regex Patterns
const nameRegex = /^[ء-يa-zA-Z]+( [ء-يa-zA-Z]+)+$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

// Validation state object
const validationState = {
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
    specialization: false,
    grades: false
};

// Update button state based on validation
function updateButtonState() {
    const registerBtn = document.getElementById('registrationForm')?.querySelector('button[type="submit"]');
    const allValid = Object.values(validationState).every(status => status === true);
    if (registerBtn) {
        registerBtn.disabled = !allValid;
    }
}

// Initialize button as disabled
window.addEventListener('load', () => {
    const registerBtn = document.getElementById('registrationForm')?.querySelector('button[type="submit"]');
    if (registerBtn) {
        registerBtn.disabled = true;
    }
});

// Real-time validation function
function validateField(fieldId, regex = null, isPassword = false, matchFieldId = null) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId === 'fullName' ? 'nameError' : fieldId === 'confirmPassword' ? 'confirmError' : fieldId + 'Error');
    
    if (!input || !errorEl) return true;

    const value = input.value.trim();
    let isValid = true;

    if (isPassword) {
        // For password confirmation
        if (matchFieldId) {
            const matchField = document.getElementById(matchFieldId);
            isValid = value === matchField.value;
        } else {
            // For password validation
            isValid = regex ? regex.test(value) : value.length > 0;
        }
    } else {
        isValid = regex ? regex.test(value) : value.length > 0;
    }

    if (!isValid) {
        errorEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
    }

    // Update validation state
    if (fieldId === 'fullName') validationState.fullName = isValid;
    if (fieldId === 'email') validationState.email = isValid;
    if (fieldId === 'password') validationState.password = isValid;
    if (fieldId === 'confirmPassword') validationState.confirmPassword = isValid;

    updateButtonState();

    return isValid;
}

// Add real-time validation listeners
document.getElementById('fullName')?.addEventListener('blur', () => validateField('fullName', nameRegex));
document.getElementById('fullName')?.addEventListener('input', () => validateField('fullName', nameRegex));

document.getElementById('email')?.addEventListener('blur', () => validateField('email', emailRegex));
document.getElementById('email')?.addEventListener('input', () => validateField('email', emailRegex));

document.getElementById('password')?.addEventListener('blur', () => validateField('password', passwordRegex));
document.getElementById('password')?.addEventListener('input', () => validateField('password', passwordRegex));

document.getElementById('confirmPassword')?.addEventListener('blur', () => validateField('confirmPassword', null, true, 'password'));
document.getElementById('confirmPassword')?.addEventListener('input', () => validateField('confirmPassword', null, true, 'password'));

// Add event listeners for grade checkboxes
document.querySelectorAll('input[name="grades"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const selectedGrades = Array.from(document.querySelectorAll('input[name="grades"]:checked')).length;
        if (selectedGrades > 0) {
            document.getElementById('gradeError').style.display = 'none';
            validationState.grades = true;
        } else {
            document.getElementById('gradeError').style.display = 'block';
            validationState.grades = false;
        }
        updateButtonState();
    });
});

// Add event listener for specialization
document.getElementById('specialization')?.addEventListener('change', () => {
    const spec = document.getElementById('specialization').value;
    validationState.specialization = spec !== '';
    updateButtonState();
});

// Form Submission Logic
document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Get Values
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const specialization = document.getElementById('specialization').value;
    
    // Get selected grades
    const selectedGrades = Array.from(document.querySelectorAll('input[name="grades"]:checked')).map(cb => cb.value);

    // 1. Full Validation Check
    let isNameValid = validateField('fullName', nameRegex);
    let isEmailValid = validateField('email', emailRegex);
    let isPasswordValid = validateField('password', passwordRegex);
    let isConfirmValid = validateField('confirmPassword', null, true, 'password');

    // Check specialization
    if (specialization === '') {
        showNotification("خطأ: يرجى اختيار التخصص.", 'error');
        return;
    }

    // Check grades - only show error if empty
    if (selectedGrades.length === 0) {
        showNotification("خطأ: يرجى اختيار صف واحد على الأقل.", 'error');
        return;
    }

    // If any field is invalid, don't submit
    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
        showNotification("خطأ: يرجى ملء جميع الحقول بشكل صحيح.", 'error');
        return;
    }

    // 2. Send registration request to backend
    showNotification("جاري التسجيل...", 'success');

    fetch('PHP/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
            action: 'register_teacher',
            fullName: fullName,
            email: email,
            password: password,
            confirmPassword: confirmPassword,
            specialization: specialization,
            grades: selectedGrades
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification("تم التسجيل بنجاح. جاري التوجيه إلى صفحة الدخول...", 'success');
            setTimeout(() => {
                window.location.href = 'student_login.html';
            }, 1500);
        } else {
            showNotification("خطأ: " + (data.message || 'فشل التسجيل'), 'error');
            console.error('Registration error:', data);
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        showNotification("خطأ في الاتصال بالخادم: " + error.message, 'error');
    });
});
