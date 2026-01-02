// Debug script to check if everything is connected
console.log("=== LalaLand Debug Console ===");

// 1. Check HTML elements
console.log("--- Checking HTML Elements ---");
const timerMinutesInput = document.querySelector('#timerMinutes');
const timerSecondsInput = document.querySelector('#timerSeconds');
const timerDisplay = document.querySelector('#timerDisplay');
const timerStartBtn = document.querySelector('#timerStartBtn');
const timerResetBtn = document.querySelector('#timerResetBtn');
const timerStatus = document.querySelector('#timerStatus');

console.log("Timer Minutes Input:", timerMinutesInput ? "✅ FOUND" : "❌ NOT FOUND");
console.log("Timer Seconds Input:", timerSecondsInput ? "✅ FOUND" : "❌ NOT FOUND");
console.log("Timer Display:", timerDisplay ? "✅ FOUND" : "❌ NOT FOUND");
console.log("Timer Start Button:", timerStartBtn ? "✅ FOUND" : "❌ NOT FOUND");
console.log("Timer Reset Button:", timerResetBtn ? "✅ FOUND" : "❌ NOT FOUND");
console.log("Timer Status:", timerStatus ? "✅ FOUND" : "❌ NOT FOUND");

// 2. Check sections
console.log("--- Checking Dashboard Sections ---");
const sectionPomodoro = document.getElementById('sectionPomodoro');
const sectionExplore = document.getElementById('sectionExplore');
const sectionMyCourses = document.getElementById('sectionMyCourses');

console.log("Pomodoro Section:", sectionPomodoro ? "✅ FOUND" : "❌ NOT FOUND");
console.log("Explore Section:", sectionExplore ? "✅ FOUND" : "❌ NOT FOUND");
console.log("My Courses Section:", sectionMyCourses ? "✅ FOUND" : "❌ NOT FOUND");

// 3. Check session
console.log("--- Checking Session ---");
const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
console.log("Current User:", currentUser ? JSON.stringify(currentUser) : "❌ NO USER IN SESSION");

// 4. Check if jQuery is loaded
console.log("--- Checking jQuery ---");
console.log("jQuery loaded:", typeof jQuery !== 'undefined' ? "✅ YES (v" + jQuery.fn.jquery + ")" : "❌ NO");
console.log("jQuery UI loaded:", typeof jQuery !== 'undefined' && typeof jQuery.ui !== 'undefined' ? "✅ YES" : "❌ NO");

// 5. Test timer button click
if (timerStartBtn) {
    timerStartBtn.addEventListener('click', function() {
        console.log("⭐ TIMER START BUTTON CLICKED!");
        console.log("This event listener is working");
    });
}

// 6. Test API connectivity
console.log("--- Testing API Connectivity ---");
fetch('PHP/courses_api.php', {
    method: 'POST',
    body: new URLSearchParams({
        action: 'get_courses'
    })
})
.then(response => {
    console.log("Courses API Response Status:", response.status);
    return response.json();
})
.then(data => {
    console.log("Courses API Response:", data);
    if (data.success) {
        console.log("✅ Courses API is working! Found", data.courses.length, "courses");
    } else {
        console.log("❌ Courses API error:", data.message);
    }
})
.catch(error => {
    console.log("❌ Courses API error:", error);
});

// 7. Test dashboard API
console.log("--- Testing Dashboard API ---");
fetch('PHP/dashboard_api.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json; charset=utf-8'},
    body: JSON.stringify({
        action: 'get_student_data',
        student_id: currentUser ? currentUser.id : 0
    })
})
.then(response => response.json())
.then(data => {
    console.log("Dashboard API Response:", data);
    if (data.success) {
        console.log("✅ Dashboard API is working!");
    } else {
        console.log("❌ Dashboard API error:", data.message);
    }
})
.catch(error => {
    console.log("❌ Dashboard API error:", error);
});

console.log("=== End Debug Console ===");
