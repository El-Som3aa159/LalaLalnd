document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    
    // Try to find the toggle button. It might have different IDs or classes, 
    // but let's standardize on ID "darkModeToggle" or class "theme-toggle".
    // We will add this ID to all pages.
    const toggleBtn = document.getElementById('darkModeToggle');

    // 1. Check & Apply Saved Theme
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (toggleBtn) toggleBtn.textContent = '☀️'; 
    } else {
        body.classList.remove('dark-mode');
        if (toggleBtn) toggleBtn.textContent = '🌙';
    }

    // 2. Toggle Listener
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            body.classList.toggle('dark-mode');
            
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                toggleBtn.textContent = '☀️';
            } else {
                localStorage.setItem('theme', 'light');
                toggleBtn.textContent = '🌙';
            }
        });
    }

    // 3. Dynamic Username Display (Unified Logic)
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        // Try sessionStorage first (active session), then localStorage (if persisted)
        let user = null;
        try {
            user = JSON.parse(sessionStorage.getItem('currentUser'));
        } catch (e) {}

        if (!user) {
            try {
                // Fallback if you decide to use localStorage for persistence later
                // user = JSON.parse(localStorage.getItem('currentUser')); 
            } catch (e) {}
        }

        if (user && user.name) {
            userNameDisplay.textContent = user.name;
        }
    }
});
