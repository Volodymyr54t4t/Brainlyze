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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
});

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
    loadDashboard();
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
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
            previousQuestion();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
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
            navigateToSection('quizzes');
        });
    }
    
    if (viewDetailedBtn) {
        viewDetailedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showDetailedResults();
        });
    }
    
    if (backToResultsBtn) {
        backToResultsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection('quiz-results');
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
        
        // Ensure data is an array
        const quizzes = Array.isArray(data) ? data : [];

        const container = document.getElementById('quizzesList');
        if (quizzes.length === 0) {
            container.innerHTML = '<p class="no-data">Тести не знайдено</p>';
            return;
        }

        container.innerHTML = quizzes.map(quiz => `
            <div class="quiz-card" onclick="startQuiz(${quiz.id})">
                <h3 class="quiz-title">${quiz.title}</h3>
                <p class="quiz-description">${quiz.description || ''}</p>
                <div class="quiz-meta">
                    <span>${quiz.questionCount || quiz.question_count || 0} питань</span>
                    <span class="quiz-difficulty difficulty-${quiz.difficulty}">${getDifficultyText(quiz.difficulty)}</span>
                </div>
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
        const response = await fetch(`/api/quizzes/${quizId}`);
        currentQuiz = await response.json();
        currentQuestionIndex = 0;
        userAnswers = new Array(currentQuiz.questions.length).fill(null);
        quizStartTime = new Date();

        navigateToSection('quiz-taking');
        document.getElementById('quizTitle').textContent = currentQuiz.title;
        loadQuestion();
    } catch (error) {
        console.error('Error starting quiz:', error);
        alert('Помилка завантаження тесту');
    }
}

function loadQuestion() {
    const question = currentQuiz.questions[currentQuestionIndex];
    
    const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${currentQuestionIndex + 1} з ${currentQuiz.questions.length}`;
    
    document.getElementById('questionText').textContent = question.question;
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <div class="option ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}" 
             onclick="selectOption(${index})">
            ${option}
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
                timeSpent: timeSpent
            })
        });

        const result = await response.json();
        
        if (result.success) {
            detailedResults = {
                ...result.result,
                questions: currentQuiz.questions,
                userAnswers: userAnswers
            };
            showResults(result.result);
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Помилка збереження результатів');
    }
}

function showResults(result) {
    navigateToSection('quiz-results');
    document.getElementById('finalScore').textContent = `${result.score}%`;
    document.getElementById('correctCount').textContent = result.correctAnswers;
    document.getElementById('totalCount').textContent = result.totalQuestions;
}

function showDetailedResults() {
    if (!detailedResults) return;
    
    navigateToSection('detailed-results');
    document.getElementById('detailedScore').textContent = `${detailedResults.score}%`;
    document.getElementById('detailedCorrect').textContent = detailedResults.correctAnswers;
    document.getElementById('detailedIncorrect').textContent = detailedResults.totalQuestions - detailedResults.correctAnswers;
    document.getElementById('detailedTime').textContent = `${detailedResults.timeSpent} хв`;
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
        
        container.innerHTML = leaderboard.map((user, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${user.name || user.email}</div>
                    <div>${user.testsCompleted} тестів</div>
                </div>
                <div class="leaderboard-score">${user.averageScore}%</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
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
            categoryStats.innerHTML = '<h3>За категоріями</h3>' + Object.entries(stats.categoryStats).map(([category, data]) => `
                <div class="category-item">
                    <span>${getCategoryName(category)}</span>
                    <span>${data.averageScore}% (${data.count} тестів)</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function getCategoryName(category) {
    const categories = {
        mathematics: 'Математика',
        history: 'Історія',
        science: 'Наука',
        literature: 'Література'
    };
    return categories[category] || category;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/auth.html';
}

// Make functions globally accessible
window.startQuiz = startQuiz;
window.selectOption = selectOption;
window.logout = logout;
