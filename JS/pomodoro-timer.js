// Pomodoro Timer Module
(function() {
    let timerInterval = null;
    let isRunning = false;
    let totalSeconds = 0;
    let remainingSeconds = 0;

    const timerMinutesInput = document.getElementById('timerMinutes');
    const timerSecondsInput = document.getElementById('timerSeconds');
    const timerDisplayText = document.getElementById('timerDisplay');
    const timerStartBtn = document.getElementById('timerStartBtn');
    const timerResetBtn = document.getElementById('timerResetBtn');
    const timerStatus = document.getElementById('timerStatus');

    // Initialize timer on page load
    document.addEventListener('DOMContentLoaded', function() {
        initializeTimer();
        attachEventListeners();
        initializeDraggableCards();
    });

    function initializeTimer() {
        const minutes = parseInt(timerMinutesInput.value) || 0;
        const seconds = parseInt(timerSecondsInput.value) || 0;
        totalSeconds = minutes * 60 + seconds;
        remainingSeconds = totalSeconds;
        updateTimerDisplay();
    }

    function attachEventListeners() {
        // Input change listeners
        timerMinutesInput.addEventListener('change', function() {
            if (!isRunning) {
                const minutes = Math.max(0, Math.min(99, parseInt(this.value) || 0));
                this.value = String(minutes).padStart(2, '0');
                initializeTimer();
            }
        });

        timerSecondsInput.addEventListener('change', function() {
            if (!isRunning) {
                let seconds = Math.max(0, Math.min(59, parseInt(this.value) || 0));
                this.value = String(seconds).padStart(2, '0');
                initializeTimer();
            }
        });

        // Allow direct typing without changing on every keystroke
        timerMinutesInput.addEventListener('blur', function() {
            if (!isRunning) {
                const minutes = Math.max(0, Math.min(99, parseInt(this.value) || 0));
                this.value = String(minutes).padStart(2, '0');
                initializeTimer();
            }
        });

        timerSecondsInput.addEventListener('blur', function() {
            if (!isRunning) {
                let seconds = Math.max(0, Math.min(59, parseInt(this.value) || 0));
                this.value = String(seconds).padStart(2, '0');
                initializeTimer();
            }
        });

        // Start/Stop button
        timerStartBtn.addEventListener('click', function() {
            if (!isRunning && remainingSeconds > 0) {
                startTimer();
            } else if (isRunning) {
                stopTimer();
            }
        });

        // Reset button
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
                remainingSeconds = 0;
                stopTimer();
                timerStatus.textContent = 'انتهى الوقت! ✅';
                if (isRunning === false) { // Only play sound if it was actually running
                    playNotificationSound();
                }
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
        initializeTimer();
        timerStatus.textContent = 'جاهز للبدء';
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        
        const displayMinutes = String(minutes).padStart(2, '0');
        const displaySeconds = String(seconds).padStart(2, '0');
        
        timerDisplayText.textContent = `${displayMinutes}:${displaySeconds}`;
        timerMinutesInput.value = displayMinutes;
        timerSecondsInput.value = displaySeconds;

        // Update page title with remaining time
        if (isRunning) {
            document.title = `${displayMinutes}:${displaySeconds} - Pomodoro Timer`;
        }
    }

    function playNotificationSound() {
        // Create a beep sound using Web Audio API
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

    // jQuery UI Sortable for draggable cards
    function initializeDraggableCards() {
        if (typeof jQuery === 'undefined' || typeof jQuery.ui === 'undefined') {
            console.log('jQuery UI not loaded yet, retrying...');
            setTimeout(initializeDraggableCards, 500);
            return;
        }

        const $ = jQuery;
        
        $('#settingsGrid').sortable({
            items: '.draggable-card',
            placeholder: 'ui-sortable-placeholder',
            distance: 10,
            opacity: 0.8,
            revert: 150,
            cursor: 'move',
            toleranceElement: '> h3',
            start: function(event, ui) {
                ui.placeholder.height(ui.item.height());
            },
            stop: function(event, ui) {
                // Save card order to localStorage
                saveCardOrder();
            }
        });

        // Load saved order from localStorage
        loadCardOrder();
    }

    function saveCardOrder() {
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
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
        const storageKey = `cardOrder_${currentUser.id || 'guest'}`;
        const savedOrder = JSON.parse(localStorage.getItem(storageKey));
        
        if (!savedOrder || savedOrder.length === 0) {
            return;
        }

        const $ = jQuery;
        const container = $('#settingsGrid');
        const cards = container.find('.draggable-card');
        
        // Create a map of current cards
        const cardMap = {};
        cards.each(function() {
            const id = $(this).attr('data-card-id');
            cardMap[id] = this;
        });

        // Reorder cards based on saved order
        savedOrder.forEach(cardId => {
            if (cardMap[cardId]) {
                container.append(cardMap[cardId]);
            }
        });

        console.log('Card order loaded:', savedOrder);
    }

    // Make functions available globally for manual control
    window.pomodoroTimer = {
        start: startTimer,
        stop: stopTimer,
        reset: resetTimer,
        getRemaining: () => remainingSeconds,
        isRunning: () => isRunning
    };

})();
