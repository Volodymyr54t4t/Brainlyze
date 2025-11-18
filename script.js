// Global variables
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let quizzes = [];
let quizStartTime = null;
let detailedResults = null;
const authCheckTimeout = null;
let lastAuthCheck = 0;
const AUTH_CHECK_COOLDOWN = 5000; // 5 seconds cooldown between auth checks
let quizTimer = null;
let timeRemaining = 0;
let isTimeUp = false;

let darkMode = localStorage.getItem('darkMode') === 'true';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
let streak = parseInt(localStorage.getItem('streak') || '0');
let lastTestDate = localStorage.getItem('lastTestDate');
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

let userLevel = parseInt(localStorage.getItem('userLevel') || '1');
let userXP = parseInt(localStorage.getItem('userXP') || '0');
let totalXP = parseInt(localStorage.getItem('totalXP') || '0');
let badges = JSON.parse(localStorage.getItem('badges') || '[]');
let completedCategories = JSON.parse(localStorage.getItem('completedCategories') || '{}');

const CATEGORY_TITLES = {
  mathematics: [
    { tests: 1, title: '🧮 Початківець математик', icon: '🎯' },
    { tests: 3, title: '📐 Юний математик', icon: '⭐' },
    { tests: 5, title: '🔢 Досвідчений математик', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер математики', icon: '💎' }
  ],
  physics: [
    { tests: 1, title: '⚗️ Початківець фізик', icon: '🎯' },
    { tests: 3, title: '⚡ Юний фізик', icon: '⭐' },
    { tests: 5, title: '🔬 Досвідчений фізик', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер фізики', icon: '💎' }
  ],
  chemistry: [
    { tests: 1, title: '🧪 Початківець хімік', icon: '🎯' },
    { tests: 3, title: '⚗️ Юний хімік', icon: '⭐' },
    { tests: 5, title: '🔬 Досвідчений хімік', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер хімії', icon: '💎' }
  ],
  biology: [
    { tests: 1, title: '🌱 Початківець біолог', icon: '🎯' },
    { tests: 3, title: '🦋 Юний біолог', icon: '⭐' },
    { tests: 5, title: '🔬 Досвідчений біолог', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер біології', icon: '💎' }
  ],
  history: [
    { tests: 1, title: '📜 Початківець історик', icon: '🎯' },
    { tests: 3, title: '🏛️ Юний історик', icon: '⭐' },
    { tests: 5, title: '📚 Досвідчений історик', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер історії', icon: '💎' }
  ],
  literature: [
    { tests: 1, title: '📖 Початківець літератор', icon: '🎯' },
    { tests: 3, title: '✍️ Юний письменник', icon: '⭐' },
    { tests: 5, title: '📚 Досвідчений літератор', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер літератури', icon: '💎' }
  ],
  geography: [
    { tests: 1, title: '🗺️ Початківець географ', icon: '🎯' },
    { tests: 3, title: '🌍 Юний дослідник', icon: '⭐' },
    { tests: 5, title: '🧭 Досвідчений географ', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер географії', icon: '💎' }
  ],
  english: [
    { tests: 1, title: '🔤 Beginner', icon: '🎯' },
    { tests: 3, title: '💬 Young Learner', icon: '⭐' },
    { tests: 5, title: '🗣️ Experienced Speaker', icon: '🌟' },
    { tests: 10, title: '🏆 Master of English', icon: '💎' }
  ],
  informatics: [
    { tests: 1, title: '💻 Початківець програміст', icon: '🎯' },
    { tests: 3, title: '⌨️ Юний кодер', icon: '⭐' },
    { tests: 5, title: '🖥️ Досвідчений програміст', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер інформатики', icon: '💎' }
  ],
  economics: [
    { tests: 1, title: '💰 Початківець економіст', icon: '🎯' },
    { tests: 3, title: '📊 Юний економіст', icon: '⭐' },
    { tests: 5, title: '💼 Досвідчений економіст', icon: '🌟' },
    { tests: 10, title: '🏆 Майстер економіки', icon: '💎' }
  ]
};

function getCategoryTitle(category, testsCompleted) {
  const titles = CATEGORY_TITLES[category];
  if (!titles) return null;
  
  for (let i = titles.length - 1; i >= 0; i--) {
    if (testsCompleted >= titles[i].tests) {
      return titles[i];
    }
  }
  return null;
}

function updateCategoryProgress(category) {
  if (!completedCategories[category]) {
    completedCategories[category] = 0;
  }
  completedCategories[category]++;
  localStorage.setItem('completedCategories', JSON.stringify(completedCategories));
  
  const title = getCategoryTitle(category, completedCategories[category]);
  if (title) {
    showTitleNotification(title);
  }
}

function showTitleNotification(title) {
  const notification = document.createElement('div');
  notification.className = 'title-notification';
  notification.innerHTML = `
    <div class="title-icon">${title.icon}</div>
    <div class="title-content">
      <div class="title-badge">Новий титул!</div>
      <div class="title-name">${title.title}</div>
    </div>
  `;
  document.body.appendChild(notification);
  
  playSound('complete');
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initializeTheme();
    initializeSettings();
});

function initializeTheme() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
}

function initializeSettings() {
    const themeToggle = document.getElementById('themeToggle');
    const soundToggle = document.getElementById('soundToggle');
    
    if (themeToggle) {
        themeToggle.checked = darkMode;
        themeToggle.addEventListener('change', toggleDarkMode);
    }
    
    if (soundToggle) {
        soundToggle.checked = soundEnabled;
        soundToggle.addEventListener('change', toggleSound);
    }
}

function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkMode);
    playSound('click');
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    playSound('click');
}

function playSound(type) {
    if (!soundEnabled) return;
    
    const sounds = {
        click: () => new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSBAIRZ/h8rxuIgU2jdXzzYU2Bhxru+7mnEoODUug4/K8byIFNo3V882FNgYca7vu5pxKDg1LoOP5ixsEMYfR89OCMwYebrro5pxKDg1LoOPyvG8iBTaN1fPNhTYGHGu77uacSg4NS6Dj8rxvIgU2jdXzzYU2Bhxru+7mnEoODUug4/K8byIFNo3V882FNgYca7vu5pxKDg1LoOP'),
        correct: () => new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSBAIRZ/h8rxuIgU2jdXzzYU2Bhxru+7mnEoODUug4/K8byIFNo3V882FNgYca7vu5pxKDg1LoOP5ixsEMYfR89OCMwYebrro5pxKDg1LoOPyvG8iBTaN1fPNhTYGHGu77uacSg4NS6Dj8rxvIgU2jdXzzYU2Bhxru+7mnEoODUug4/K8byIFNo3V882FNgYca7vu5pxKDg1LoOP'),
        wrong: () => new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSBAIRZ/h8rxuIgU2jdXzzYU2Bhxru+7mnEoODUug4/K8byIFNo3V882FNgYca7vu5pxKDg1LoOP5ixsEMYfR89OCMwYebrro5pxKDg1LoOPyvG8iBTaN1fPNhTYGHGu77uacSg4NS6Dj8rxvIgU2jdXzzYU2Bhxru+7mnEoODUug4/K8byIFNo3V882FNgYca7vu5pxKDg1LoOP'),
        complete: () => new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSBAIRZ/h8rxuIgU2jdXzzYU2Bhxru+7mnEoODUug4/K8byIFNo3V882FNgYca7vu5pxKDg1LoOP5ixsEMYfR89OCMwYebrro5pxKDg1LoOPyvG8iBTaN1fPNhTYGHGu77uacSg4NS6Dj8rxvIgU2jdXzzYU2Bhxru+7mnEoODUug4/K8byIFNo3V882FNgYca7vu5pxKDg1LoOP')
    };
    
    const sound = sounds[type];
    if (sound) {
        const audio = sound();
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Sound play failed:', e));
    }
}

function showConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Create confetti manually since we don't have canvas-confetti library
        for (let i = 0; i < particleCount; i++) {
            createConfettiParticle();
        }
    }, 250);
}

function createConfettiParticle() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-particle';
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
    confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 5000);
}

function updateStreak() {
    const today = new Date().toDateString();
    
    if (lastTestDate === today) {
        return; // Вже пройшли тест сьогодні
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastTestDate === yesterdayStr) {
        streak++;
    } else if (lastTestDate !== today) {
        streak = 1;
    }
    
    localStorage.setItem('streak', streak);
    localStorage.setItem('lastTestDate', today);
    
    updateStreakDisplay();
    checkAchievements();
}

function updateStreakDisplay() {
    const streakEl = document.getElementById('streakCounter');
    if (streakEl) {
        streakEl.innerHTML = `
            <span class="streak-icon">🔥</span>
            <span class="streak-number">${streak}</span>
            <span class="streak-label">днів поспіль</span>
        `;
        if (streak > 0) {
            streakEl.style.display = 'flex';
            streakEl.style.animation = 'pulse 2s infinite';
        }
    }
}

function checkAchievements() {
    const newAchievements = [];
    
    // Перший тест
    if (currentUser && currentUser.tests_completed === 1 && !achievements.includes('first_test')) {
        newAchievements.push(ACHIEVEMENTS.first_test);
    }
    
    // Досягнення за streak
    if (streak >= 7 && !achievements.includes('streak_7')) {
        newAchievements.push(ACHIEVEMENTS.streak_7);
    }
    if (streak >= 30 && !achievements.includes('streak_30')) {
        newAchievements.push(ACHIEVEMENTS.streak_30);
    }
    
    // Досягнення за кількість тестів
    if (currentUser && currentUser.tests_completed >= 10 && !achievements.includes('tests_10')) {
        newAchievements.push(ACHIEVEMENTS.tests_10);
    }
    if (currentUser && currentUser.tests_completed >= 50 && !achievements.includes('tests_50')) {
        newAchievements.push(ACHIEVEMENTS.tests_50);
    }
    if (currentUser && currentUser.tests_completed >= 100 && !achievements.includes('tests_100')) {
        newAchievements.push(ACHIEVEMENTS.tests_100);
    }
    
    // Часові досягнення
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
        if (hour >= 22 && !achievements.includes('night_owl')) {
            newAchievements.push(ACHIEVEMENTS.night_owl);
        }
        if (hour < 6 && !achievements.includes('early_bird')) {
            newAchievements.push(ACHIEVEMENTS.early_bird);
        }
    }
    
    // Показати нові досягнення
    newAchievements.forEach(achievement => {
        achievements.push(achievement.id);
        showAchievementNotification(achievement);
        addXP(achievement.xp, achievement.title);
    });
    
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-content">
            <div class="achievement-title">Нове досягнення!</div>
            <div class="achievement-name">${achievement.title}</div>
            <div class="achievement-desc">${achievement.description}</div>
        </div>
    `;
    document.body.appendChild(notification);
    
    playSound('complete');
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function toggleFavorite(quizId) {
    const index = favorites.indexOf(quizId);
    if (index > -1) {
        favorites.splice(index, 1);
        playSound('click');
    } else {
        favorites.push(quizId);
        playSound('complete');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadQuizzes(); // Перезавантажити список
}

let currentFilter = 'all';
let searchQuery = '';

function filterQuizzes(filter) {
    currentFilter = filter;
    playSound('click');
    loadQuizzes();
}

function searchQuizzes(query) {
    searchQuery = query.toLowerCase();
    loadQuizzes();
}

async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
        if (window.location.pathname !== '/auth.html') {
            window.location.href = '/auth.html';
        }
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            initializeApp();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            if (window.location.pathname !== '/auth.html') {
                window.location.href = '/auth.html';
            }
        }
    } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        if (window.location.pathname !== '/auth.html') {
            window.location.href = '/auth.html';
        }
    }
}

function initializeApp() {
    // Update user info
    const nameEl = document.getElementById('currentUserName');
    const roleEl = document.getElementById('currentUserRole');
    
    if (nameEl) nameEl.textContent = currentUser.email || 'Студент';
    if (roleEl) roleEl.textContent = currentUser.role || 'student';

    setupEventListeners();
    updateStreakDisplay();
    loadDashboard();
    updateLevelDisplay(); // Додано ініціалізацію гейміфікації
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            playSound('click');
            const section = this.dataset.section;
            navigateToSection(section);
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Quiz controls
    const prevBtn = document.getElementById('prevQuestion');
    const nextBtn = document.getElementById('nextQuestion');
    const submitBtn = document.getElementById('submitQuiz');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playSound('click');
            previousQuestion();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playSound('click');
            nextQuestion();
        });
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            submitQuiz();
        });
    }

    // Results actions
    const backToQuizzesBtn = document.getElementById('backToQuizzes');
    const viewDetailedBtn = document.getElementById('viewDetailedResults');
    const backToResultsBtn = document.getElementById('backToResults');
    
    if (backToQuizzesBtn) {
        backToQuizzesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playSound('click');
            navigateToSection('quizzes');
        });
    }
    
    if (viewDetailedBtn) {
        viewDetailedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playSound('click');
            showDetailedResults();
        });
    }
    
    if (backToResultsBtn) {
        backToResultsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playSound('click');
            navigateToSection('quiz-results');
        });
    }
    
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterQuizzes(btn.dataset.filter);
        });
    });
    
    const searchInput = document.getElementById('quizSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuizzes(e.target.value);
        });
    }
}

function navigateToSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetNav = document.querySelector(`[data-section="${sectionName}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    // Show section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'quizzes':
            loadQuizzes();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
        case 'statistics':
            loadStatistics();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'achievements':
            window.showAchievements();
            break;
    }
}

async function loadDashboard() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${currentUser.id}/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        document.getElementById('userTestsCompleted').textContent = data.stats?.testsCompleted || 0;
        document.getElementById('userAverageScore').textContent = `${data.stats?.averageScore || 0}%`;
        document.getElementById('userTotalScore').textContent = data.stats?.totalScore || 0;

        const recentResults = document.getElementById('recentResults');
        if (data.recentResults && data.recentResults.length > 0) {
            recentResults.innerHTML = data.recentResults.map(result => `
                <div class="result-item">
                    <div class="result-info">
                        <h4>${result.quiz_title}</h4>
                        <div class="result-date">${new Date(result.completed_at).toLocaleDateString('uk-UA')}</div>
                    </div>
                    <div class="result-score">${result.score}%</div>
                </div>
            `).join('');
        } else {
            recentResults.innerHTML = '<p class="no-data">Результати з\'являться після проходження тестів</p>';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadQuizzes() {
    try {
        const response = await fetch('/api/quizzes');
        const data = await response.json();
        
        let quizzes = Array.isArray(data) ? data : [];
        
        if (currentFilter !== 'all') {
            if (currentFilter === 'favorites') {
                quizzes = quizzes.filter(q => favorites.includes(q.id));
            } else {
                quizzes = quizzes.filter(q => q.difficulty === currentFilter);
            }
        }
        
        if (searchQuery) {
            quizzes = quizzes.filter(q => 
                q.title.toLowerCase().includes(searchQuery) ||
                (q.description && q.description.toLowerCase().includes(searchQuery))
            );
        }

        const container = document.getElementById('quizzesList');
        if (quizzes.length === 0) {
            container.innerHTML = '<p class="no-data">Тести не знайдено</p>';
            return;
        }

        container.innerHTML = quizzes.map(quiz => `
            <div class="quiz-card" data-quiz-id="${quiz.id}">
                <div class="quiz-card-header">
                    <h3 class="quiz-title">${quiz.title}</h3>
                    <button class="favorite-btn ${favorites.includes(quiz.id) ? 'active' : ''}" 
                            onclick="event.stopPropagation(); toggleFavorite(${quiz.id})">
                        ${favorites.includes(quiz.id) ? '❤️' : '🤍'}
                    </button>
                </div>
                <p class="quiz-description">${quiz.description || ''}</p>
                <div class="quiz-meta">
                    <span>📝 ${quiz.questionCount || quiz.question_count || 0} питань</span>
                    <span>⏱️ ${quiz.timeLimit || 30} хв</span>
                    <span class="quiz-difficulty difficulty-${quiz.difficulty}">${getDifficultyText(quiz.difficulty)}</span>
                </div>
                <button class="start-quiz-btn" onclick="startQuiz(${quiz.id})">
                    Розпочати тест →
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading quizzes:', error);
        const container = document.getElementById('quizzesList');
        if (container) {
            container.innerHTML = '<p class="no-data">Помилка завантаження тестів</p>';
        }
    }
}

function getDifficultyText(difficulty) {
    const difficulties = {
        easy: 'Легкий',
        medium: 'Середній',
        hard: 'Складний'
    };
    return difficulties[difficulty] || difficulty;
}

async function startQuiz(quizId) {
    try {
        playSound('click');
        const response = await fetch(`/api/quizzes/${quizId}`);
        currentQuiz = await response.json();
        currentQuestionIndex = 0;
        userAnswers = new Array(currentQuiz.questions.length).fill(null);
        quizStartTime = new Date();

        navigateToSection('quiz-taking');
        document.getElementById('quizTitle').textContent = currentQuiz.title;
        
        isTimeUp = false;
        timeRemaining = (currentQuiz.timeLimit || 30) * 60;
        
        startTimer();
        loadQuestion();
    } catch (error) {
        console.error('Error starting quiz:', error);
        alert('Помилка завантаження тесту');
    }
}

function startTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerBar = document.getElementById('timerBar');
    const totalTime = timeRemaining;
    
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    quizTimer = setInterval(() => {
        if (isTimeUp) {
            clearInterval(quizTimer);
            return;
        }
        
        timeRemaining--;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const percentage = (timeRemaining / totalTime) * 100;
        timerBar.style.width = `${percentage}%`;
        
        if (percentage > 50) {
            timerBar.style.background = 'linear-gradient(to right, #10b981, #059669)';
            timerDisplay.style.color = '#059669';
        } else if (percentage > 25) {
            timerBar.style.background = 'linear-gradient(to right, #f59e0b, #d97706)';
            timerDisplay.style.color = '#f59e0b';
        } else {
            timerBar.style.background = 'linear-gradient(to right, #ef4444, #dc2626)';
            timerDisplay.style.color = '#ef4444';
            timerDisplay.style.animation = 'pulse 1s infinite';
        }
        
        if (timeRemaining <= 0) {
            timeIsUp();
        }
    }, 1000);
}

function timeIsUp() {
    isTimeUp = true;
    clearInterval(quizTimer);
    playSound('wrong');
    
    const overlay = document.createElement('div');
    overlay.id = 'timeUpOverlay';
    overlay.innerHTML = `
        <div class="time-up-content">
            <div class="time-up-icon">⏰</div>
            <h2>Час закінчився!</h2>
            <p>Ваш тест автоматично завершено</p>
            <p class="time-up-info">Перевіряємо ваші відповіді...</p>
        </div>
    `;
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        submitQuiz();
        document.body.removeChild(overlay);
    }, 2000);
}

function loadQuestion() {
    const question = currentQuiz.questions[currentQuestionIndex];
    
    const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `Питання ${currentQuestionIndex + 1} з ${currentQuiz.questions.length}`;
    
    document.getElementById('questionText').textContent = question.question;
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <div class="option ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}" 
             onclick="selectOption(${index})">
            <span class="option-letter">${String.fromCharCode(65 + index)}.</span>
            <span class="option-text">${option}</span>
        </div>
    `).join('');
    
    document.getElementById('prevQuestion').disabled = currentQuestionIndex === 0;
    
    if (currentQuestionIndex === currentQuiz.questions.length - 1) {
        document.getElementById('nextQuestion').style.display = 'none';
        document.getElementById('submitQuiz').style.display = 'block';
    } else {
        document.getElementById('nextQuestion').style.display = 'block';
        document.getElementById('submitQuiz').style.display = 'none';
    }
}

function selectOption(optionIndex) {
    playSound('click');
    userAnswers[currentQuestionIndex] = optionIndex;
    document.querySelectorAll('.option').forEach((option, index) => {
        option.classList.toggle('selected', index === optionIndex);
    });
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    }
}

async function submitQuiz() {
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    try {
        const timeSpent = Math.round((new Date() - quizStartTime) / 1000 / 60);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/quizzes/${currentQuiz.id}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                answers: userAnswers,
                timeSpent: timeSpent,
                wasTimedOut: isTimeUp
            })
        });

        const result = await response.json();
        
        if (result.success) {
            detailedResults = {
                ...result.result,
                questions: currentQuiz.questions,
                userAnswers: userAnswers,
                wasTimedOut: isTimeUp,
                timeLimit: currentQuiz.timeLimit,
                actualTime: timeSpent
            };
            
            updateStreak();
            
            if (currentQuiz.category) {
                updateCategoryProgress(currentQuiz.category);
            }
            
            const baseXP = Math.round(result.result.score / 2); // 50 XP за 100%
            const timeBonus = timeSpent < (currentQuiz.timeLimit / 2) ? 20 : 0;
            const perfectBonus = result.result.score === 100 ? 30 : 0;
            
            addXP(baseXP, `Завершення тесту (${result.result.score}%)`);
            if (timeBonus > 0) {
                addXP(timeBonus, 'Швидкість виконання');
                if (!achievements.includes('speed_demon')) {
                    achievements.push('speed_demon');
                    showAchievementNotification(ACHIEVEMENTS.speed_demon);
                    addXP(ACHIEVEMENTS.speed_demon.xp, ACHIEVEMENTS.speed_demon.title);
                }
            }
            if (perfectBonus > 0) {
                addXP(perfectBonus, 'Ідеальний результат!');
                if (!achievements.includes('perfect_score')) {
                    achievements.push('perfect_score');
                    showAchievementNotification(ACHIEVEMENTS.perfect_score);
                    addXP(ACHIEVEMENTS.perfect_score.xp, ACHIEVEMENTS.perfect_score.title);
                }
            }
            
            if (result.result.score >= 80) {
                playSound('complete');
                showConfetti();
            } else if (result.result.score >= 60) {
                playSound('correct');
            } else {
                playSound('wrong');
            }
            
            showResults(result.result);
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Помилка збереження результатів');
    }
}

function showResults(result) {
    navigateToSection('quiz-results');
    
    const scoreElement = document.getElementById('finalScore');
    scoreElement.textContent = `${result.score}%`;
    
    const scoreCircle = document.querySelector('.score-circle');
    if (result.score >= 80) {
        scoreCircle.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        scoreElement.style.animation = 'celebrate 0.5s ease';
    } else if (result.score >= 60) {
        scoreCircle.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    } else {
        scoreCircle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    }
    
    document.getElementById('correctCount').textContent = result.correctAnswers;
    document.getElementById('totalCount').textContent = result.totalQuestions;
    
    const message = getMotivationalMessage(result.score);
    const resultsContainer = document.querySelector('.results-container');
    const existingMessage = resultsContainer.querySelector('.motivational-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'motivational-message';
    messageEl.innerHTML = `<p>${message}</p>`;
    resultsContainer.insertBefore(messageEl, resultsContainer.querySelector('.results-summary'));
}

function getMotivationalMessage(score) {
    if (score >= 90) {
        return '🎉 Вітаємо! Відмінний результат! Ви справжній експерт!';
    } else if (score >= 80) {
        return '⭐ Чудова робота! Ви на правильному шляху!';
    } else if (score >= 70) {
        return '👍 Добре! Ще трохи практики і буде ідеально!';
    } else if (score >= 60) {
        return '📚 Непогано! Варто повторити матеріал для кращого результату.';
    } else {
        return '💪 Не здавайтеся! Кожна спроба робить вас сильнішими!';
    }
}

function showDetailedResults() {
    if (!detailedResults) return;
    
    navigateToSection('detailed-results');
    document.getElementById('detailedScore').textContent = `${detailedResults.score}%`;
    document.getElementById('detailedCorrect').textContent = detailedResults.correctAnswers;
    document.getElementById('detailedIncorrect').textContent = detailedResults.totalQuestions - detailedResults.correctAnswers;
    document.getElementById('detailedTime').textContent = `${detailedResults.actualTime} / ${detailedResults.timeLimit} хв`;
    
    const reviewContainer = document.getElementById('questionsReview');
    reviewContainer.innerHTML = '<h3>Перегляд відповідей</h3>' + detailedResults.questions.map((question, index) => {
        const userAnswer = detailedResults.userAnswers[index];
        const isCorrect = userAnswer === question.correct;
        const wasAnswered = userAnswer !== null;
        
        return `
            <div class="question-review ${isCorrect ? 'correct' : wasAnswered ? 'incorrect' : 'unanswered'}">
                <div class="question-review-header">
                    <span class="question-number">Питання ${index + 1}</span>
                    <span class="question-status">
                        ${isCorrect ? '✅ Правильно' : wasAnswered ? '❌ Неправильно' : '⚠️ Не відповіли'}
                    </span>
                </div>
                <p class="question-review-text">${question.question}</p>
                <div class="question-review-options">
                    ${question.options.map((option, optIndex) => {
                        let className = 'review-option';
                        if (optIndex === question.correct) {
                            className += ' correct-answer';
                        }
                        if (optIndex === userAnswer && !isCorrect) {
                            className += ' user-wrong-answer';
                        }
                        return `
                            <div class="${className}">
                                <span class="option-letter">${String.fromCharCode(65 + optIndex)}.</span>
                                <span>${option}</span>
                                ${optIndex === question.correct ? '<span class="badge-correct">✓ Правильна відповідь</span>' : ''}
                                ${optIndex === userAnswer && !isCorrect ? '<span class="badge-wrong">✗ Ваша відповідь</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${!wasAnswered ? '<p class="not-answered-note">⚠️ Ви не відповіли на це питання</p>' : ''}
            </div>
        `;
    }).join('');
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        const leaderboard = Array.isArray(data) ? data : [];
        
        const container = document.getElementById('leaderboardList');
        if (leaderboard.length === 0) {
            container.innerHTML = '<p class="no-data">Рейтинг порожній</p>';
            return;
        }
        
        container.innerHTML = leaderboard.map((user, index) => {
            let medal = '';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            
            const userTitles = [];
            if (completedCategories) {
                Object.entries(completedCategories).forEach(([category, count]) => {
                    const title = getCategoryTitle(category, count);
                    if (title) {
                        userTitles.push(title.title);
                    }
                });
            }
            
            return `
                <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}" style="animation: slideInUp 0.3s ease ${index * 0.05}s backwards;">
                    <div class="leaderboard-rank">${medal || (index + 1)}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${user.name || user.email}</div>
                        ${userTitles.length > 0 ? `
                            <div class="leaderboard-titles">
                                ${userTitles.slice(0, 2).map(t => `<span class="user-title">${t}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="leaderboard-stats">${user.testsCompleted || 0} тестів</div>
                    </div>
                    <div class="leaderboard-score-container">
                        <div class="leaderboard-score">${user.averageScore || 0}%</div>
                        <div class="leaderboard-xp">XP: ${user.totalScore || 0}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        const container = document.getElementById('leaderboardList');
        if (container) {
            container.innerHTML = '<p class="no-data">Помилка завантаження рейтингу</p>';
        }
    }
}

async function loadStatistics() {
    try {
        const response = await fetch('/api/stats/overview');
        const stats = await response.json();
        
        document.getElementById('totalTestsCount').textContent = stats.totalTests || 0;
        document.getElementById('totalUsersCount').textContent = stats.totalUsers || 0;
        document.getElementById('averageScoreAll').textContent = `${stats.averageScore || 0}%`;
        
        const categoryStats = document.getElementById('categoryStats');
        if (stats.categoryStats && Object.keys(stats.categoryStats).length > 0) {
            categoryStats.innerHTML = '<h3>За категоріями</h3>' + Object.entries(stats.categoryStats).map(([category, data], index) => `
                <div class="category-item" style="animation: slideInLeft 0.4s ease ${index * 0.1}s backwards;">
                    <div class="category-name">
                        <span class="category-icon">${getCategoryIcon(category)}</span>
                        <span>${getCategoryName(category)}</span>
                    </div>
                    <div class="category-data">
                        <span class="category-score">${data.averageScore}%</span>
                        <span class="category-count">(${data.count} тестів)</span>
                    </div>
                </div>
            `).join('');
        } else {
            categoryStats.innerHTML = '<p class="no-data">Статистика за категоріями відсутня</p>';
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// ==================== PROFILE SECTION ====================

async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const userData = await response.json();
        
        // Оновити аватар
        const avatarLetter = (userData.first_name?.[0] || userData.email[0]).toUpperCase();
        const avatarElement = document.getElementById('avatarLetter');
        if (avatarElement) {
          avatarElement.textContent = avatarLetter;
        }

        const avatarLargeElement = document.getElementById('profileAvatarLarge');
        if (avatarLargeElement && localStorage.getItem('avatarGradient')) {
            avatarLargeElement.style.background = localStorage.getItem('avatarGradient');
        } else if (avatarLargeElement) {
            // Apply default gradient if none stored
            const defaultColors = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            ];
            const randomDefaultBg = defaultColors[Math.floor(Math.random() * defaultColors.length)];
            avatarLargeElement.style.background = randomDefaultBg;
            localStorage.setItem('avatarGradient', randomDefaultBg);
        }
        
        // Заповнити форму
        document.getElementById('firstName').value = userData.first_name || '';
        document.getElementById('lastName').value = userData.last_name || '';
        document.getElementById('email').value = userData.email || '';
        document.getElementById('birthDate').value = userData.birth_date || '';
        document.getElementById('phone').value = userData.phone || '';
        document.getElementById('city').value = userData.city || '';
        document.getElementById('school').value = userData.school || '';
        document.getElementById('grade').value = userData.grade || '';
        
        // Улюблені предмети
        if (userData.subjects) {
            const subjects = JSON.parse(userData.subjects);
            subjects.forEach(subject => {
                const checkbox = document.querySelector(`input[value="${subject}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // Оновити статистику профілю
        document.getElementById('profileLevel').textContent = userLevel;
        document.getElementById('profileTotalXP').textContent = totalXP;
        document.getElementById('profileTestsCompleted').textContent = userData.tests_completed || 0;
        document.getElementById('profileAvgScore').textContent = `${userData.average_score || 0}%`;
        document.getElementById('profileStreak').textContent = `🔥 ${streak} днів`;
        
        // Завантажити досягнення
        loadProfileAchievements();
        
        // Завантажити титули
        loadProfileTitles();
        
        // Завантажити історію тестів
        loadProfileTestHistory();
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function loadProfileAchievements() {
    const container = document.getElementById('profileAchievementsPreview');
    if (!container) return; // Ensure element exists

    const unlockedAchievements = Object.values(ACHIEVEMENTS)
        .filter(a => achievements.includes(a.id))
        .slice(0, 6);
    
    if (unlockedAchievements.length > 0) {
        container.innerHTML = unlockedAchievements.map(a => `
            <div class="achievement-preview" title="${a.title}: ${a.description}">
                <div class="achievement-preview-icon">${a.icon}</div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="no-data">Поки немає досягнень. Пройдіть тести, щоб отримати!</p>';
    }
}

function loadProfileTitles() {
    const container = document.getElementById('profileTitles');
    if (!container) return; // Ensure element exists

    const userTitles = [];
    
    Object.entries(completedCategories).forEach(([category, count]) => {
        const title = getCategoryTitle(category, count);
        if (title) {
            userTitles.push({
                ...title,
                category: getCategoryName(category),
                tests: count
            });
        }
    });
    
    if (userTitles.length > 0) {
        container.innerHTML = userTitles.map(t => `
            <div class="profile-title-card">
                <div class="profile-title-icon">${t.icon}</div>
                <div class="profile-title-info">
                    <div class="profile-title-name">${t.title}</div>
                    <div class="profile-title-category">${t.category}</div>
                    <div class="profile-title-progress">${t.tests} тестів пройдено</div>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="no-data">Пройдіть тести, щоб отримати титули!</p>';
    }
}

async function loadProfileTestHistory() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${currentUser.id}/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('profileTestHistory');
        if (!container) return; // Ensure element exists
        
        if (data.recentResults && data.recentResults.length > 0) {
            container.innerHTML = data.recentResults.map((result, index) => `
                <div class="test-history-item" style="animation: slideInUp 0.3s ease ${index * 0.05}s backwards;">
                    <div class="test-history-info">
                        <div class="test-history-title">${result.quiz_title}</div>
                        <div class="test-history-date">${new Date(result.completed_at).toLocaleDateString('uk-UA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</div>
                    </div>
                    <div class="test-history-score ${result.score >= 80 ? 'score-excellent' : result.score >= 60 ? 'score-good' : 'score-poor'}">
                        ${result.score}%
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="no-data">Історія тестів порожня. Пройдіть перший тест!</p>';
        }
    } catch (error) {
        console.error('Error loading test history:', error);
    }
}

window.toggleEditMode = function() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    const inputs = form.querySelectorAll('input, select');
    const checkboxes = document.querySelectorAll('.subject-checkbox input');
    const button = document.getElementById('editProfileBtn');
    const actions = document.getElementById('formActions');
    
    const isDisabled = inputs[0].disabled; // Check the disabled state of the first input
    
    inputs.forEach(input => input.disabled = !isDisabled);
    checkboxes.forEach(checkbox => checkbox.disabled = !isDisabled);
    
    if (isDisabled) { // If currently disabled, we are enabling edit mode
        button.textContent = 'Скасувати';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
        if (actions) actions.style.display = 'flex';
    } else { // If currently enabled, we are disabling edit mode (cancelling)
        button.textContent = 'Редагувати';
        button.classList.remove('btn-secondary');
        button.classList.add('btn-primary');
        if (actions) actions.style.display = 'none';
        loadProfile(); // Reload original data to discard changes
    }
    
    playSound('click');
};

window.cancelEditMode = function() {
    toggleEditMode(); // Re-use toggleEditMode to revert changes
};

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                birthDate: document.getElementById('birthDate').value,
                phone: document.getElementById('phone').value,
                city: document.getElementById('city').value,
                school: document.getElementById('school').value,
                grade: document.getElementById('grade').value,
                subjects: Array.from(document.querySelectorAll('.subject-checkbox input:checked')).map(cb => cb.value)
            };
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    playSound('complete');
                    showNotification('Профіль успішно оновлено!', 'success');
                    toggleEditMode(); // Exit edit mode after successful save
                    loadProfile(); // Reload profile to show updated data
                } else {
                    const errorData = await response.json(); // Get error details if available
                    console.error('Profile update error response:', errorData);
                    playSound('wrong');
                    showNotification(errorData.message || 'Помилка оновлення профілю', 'error');
                }
            } catch (error) {
                console.error('Profile update error:', error);
                playSound('wrong');
                showNotification('Помилка оновлення профілю', 'error');
            }
        });
    }
});

window.changeAvatar = function() {
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
    ];
    
    const avatar = document.getElementById('profileAvatarLarge');
    if (!avatar) return; // Ensure element exists

    const currentBg = avatar.style.background;
    let newBg;
    
    do {
        newBg = colors[Math.floor(Math.random() * colors.length)];
    } while (newBg === currentBg);
    
    avatar.style.background = newBg;
    localStorage.setItem('avatarGradient', newBg);
    
    playSound('click');
    showNotification('Аватар змінено!', 'success');
};

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== GAMIFICATION SECTION ====================

// Система досягнень
const ACHIEVEMENTS = {
  first_test: { id: 'first_test', title: 'Перший крок', icon: '🎯', description: 'Пройшли перший тест', xp: 10 },
  perfect_score: { id: 'perfect_score', title: 'Ідеально!', icon: '💯', description: 'Отримали 100%', xp: 50 },
  speed_demon: { id: 'speed_demon', title: 'Швидкість', icon: '⚡', description: 'Пройшли тест швидше за половину часу', xp: 30 },
  streak_7: { id: 'streak_7', title: '7 днів поспіль!', icon: '🔥', description: 'Пройшли тести 7 днів поспіль', xp: 100 },
  streak_30: { id: 'streak_30', title: 'Місяць поспіль!', icon: '🏆', description: 'Пройшли тести 30 днів поспіль', xp: 500 },
  tests_10: { id: 'tests_10', title: 'Початківець', icon: '⭐', description: 'Пройшли 10 тестів', xp: 50 },
  tests_50: { id: 'tests_50', title: 'Досвідчений', icon: '🌟', description: 'Пройшли 50 тестів', xp: 250 },
  tests_100: { id: 'tests_100', title: 'Майстер', icon: '💎', description: 'Пройшли 100 тестів', xp: 1000 },
  category_master: { id: 'category_master', title: 'Експерт категорії', icon: '🎓', description: 'Пройшли всі тести категорії', xp: 150 },
  night_owl: { id: 'night_owl', title: 'Нічна сова', icon: '🦉', description: 'Пройшли тест після 22:00', xp: 20 },
  early_bird: { id: 'early_bird', title: 'Рання пташка', icon: '🐦', description: 'Пройшли тест до 6:00', xp: 20 }
};

function getXPForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function addXP(amount, reason = '') {
  userXP += amount;
  totalXP += amount;
  
  const xpForNextLevel = getXPForLevel(userLevel + 1);
  
  // Перевірка на підвищення рівня
  if (userXP >= xpForNextLevel) {
    userXP -= xpForNextLevel;
    userLevel++;
    showLevelUpNotification();
    playSound('complete');
    showConfetti();
  }
  
  localStorage.setItem('userXP', userXP);
  localStorage.setItem('totalXP', totalXP);
  localStorage.setItem('userLevel', userLevel);
  
  updateLevelDisplay();
  
  // Показати XP повідомлення
  if (amount > 0 && reason) {
    showXPGain(amount, reason);
  }
}

function showXPGain(amount, reason) {
  const xpNotif = document.createElement('div');
  xpNotif.className = 'xp-gain-notification';
  xpNotif.innerHTML = `
    <div class="xp-icon">✨</div>
    <div class="xp-content">
      <div class="xp-amount">+${amount} XP</div>
      <div class="xp-reason">${reason}</div>
    </div>
  `;
  document.body.appendChild(xpNotif);
  
  setTimeout(() => xpNotif.classList.add('show'), 100);
  setTimeout(() => {
    xpNotif.classList.remove('show');
    setTimeout(() => xpNotif.remove(), 300);
  }, 3000);
}

function showLevelUpNotification() {
  const notification = document.createElement('div');
  notification.className = 'level-up-notification';
  notification.innerHTML = `
    <div class="level-up-bg"></div>
    <div class="level-up-content">
      <div class="level-up-icon">🎉</div>
      <h2>Підвищення рівня!</h2>
      <div class="new-level">Рівень ${userLevel}</div>
      <p>Вітаємо! Ви досягли нового рівня!</p>
    </div>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 500);
  }, 4000);
}

function updateLevelDisplay() {
  const levelDisplay = document.getElementById('userLevelDisplay');
  if (levelDisplay) {
    const xpForNextLevel = getXPForLevel(userLevel + 1);
    const progress = (userXP / xpForNextLevel) * 100;
    
    levelDisplay.innerHTML = `
      <div class="level-badge">
        <div class="level-number">${userLevel}</div>
      </div>
      <div class="level-progress-container">
        <div class="level-info">
          <span class="level-label">Рівень ${userLevel}</span>
          <span class="xp-text">${userXP} / ${xpForNextLevel} XP</span>
        </div>
        <div class="level-progress-bar">
          <div class="level-progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
  }
}

window.showAchievements = function() {
  const modal = document.createElement('div');
  modal.className = 'achievements-modal';
  modal.innerHTML = `
    <div class="achievements-modal-content">
      <div class="modal-header">
        <h2>🏆 Мої досягнення</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
      </div>
      <div class="achievements-grid">
        ${Object.values(ACHIEVEMENTS).map(achievement => {
          const unlocked = achievements.includes(achievement.id);
          return `
            <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
              <div class="achievement-card-icon">${unlocked ? achievement.icon : '🔒'}</div>
              <div class="achievement-card-title">${achievement.title}</div>
              <div class="achievement-card-desc">${achievement.description}</div>
              <div class="achievement-card-xp">+${achievement.xp} XP</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="achievements-stats">
        <div class="stat-item">
          <span>Відкрито: ${achievements.length} / ${Object.keys(ACHIEVEMENTS).length}</span>
        </div>
        <div class="stat-item">
          <span>Загальний XP: ${totalXP}</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  playSound('click');
};

// Make functions globally accessible
window.startQuiz = startQuiz;
window.selectOption = selectOption;
window.toggleFavorite = toggleFavorite;
window.logout = logout;
window.showAchievements = window.showAchievements;
window.toggleEditMode = toggleEditMode;
window.cancelEditMode = cancelEditMode;
window.changeAvatar = changeAvatar;

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    playSound('click');
    window.location.href = '/auth.html';
}

function getCategoryName(category) {
    const names = {
        mathematics: 'Математика',
        physics: 'Фізика',
        chemistry: 'Хімія',
        biology: 'Біологія',
        history: 'Історія',
        literature: 'Література',
        geography: 'Географія',
        english: 'Англійська мова',
        informatics: 'Інформатика',
        economics: 'Економіка'
    };
    return names[category] || category;
}

function getCategoryIcon(category) {
    const icons = {
        mathematics: '🔢',
        physics: '⚡',
        chemistry: '⚗️',
        biology: '🧬',
        history: '📜',
        literature: '📚',
        geography: '🌍',
        english: '🗣️',
        informatics: '💻',
        economics: '💰'
    };
    return icons[category] || '📝';
}
