// State Management
let currentUser = null
let currentQuiz = null
let currentQuestionIndex = 0
let userAnswers = []
let quizStartTime = null
let quizResults = null

// API Base URL
const API_URL = window.location.origin

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
  setupEventListeners()
  checkAuthentication()
})

// Initialize Application
function initializeApp() {
  setupNavigation()
  loadDashboardData()
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation
  const navItems = document.querySelectorAll(".nav-item[data-section]")
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section
      navigateToSection(section)
    })
  })

  // Mobile menu toggle
  const mobileToggle = document.getElementById("mobileToggle")
  const sidebar = document.querySelector(".sidebar")
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active")
    })
  }

  // Quiz controls
  const prevBtn = document.getElementById("prevQuestion")
  const nextBtn = document.getElementById("nextQuestion")
  const submitBtn = document.getElementById("submitQuiz")

  if (prevBtn) prevBtn.addEventListener("click", previousQuestion)
  if (nextBtn) nextBtn.addEventListener("click", nextQuestion)
  if (submitBtn) submitBtn.addEventListener("click", submitQuiz)

  // Results buttons
  const backToQuizzesBtn = document.getElementById("backToQuizzes")
  const viewDetailedBtn = document.getElementById("viewDetailedResults")
  const backToResultsBtn = document.getElementById("backToResults")

  if (backToQuizzesBtn) {
    backToQuizzesBtn.addEventListener("click", () => navigateToSection("quizzes"))
  }
  if (viewDetailedBtn) {
    viewDetailedBtn.addEventListener("click", showDetailedResults)
  }
  if (backToResultsBtn) {
    backToResultsBtn.addEventListener("click", () => navigateToSection("quiz-results"))
  }
}

// Check Authentication
async function checkAuthentication() {
  const token = localStorage.getItem("token")
  const userId = localStorage.getItem("userId")

  if (!token || !userId) {
    // Create demo user for testing
    currentUser = {
      id: 1,
      email: "demo@student.com",
      role: "student",
    }
    localStorage.setItem("userId", "1")
    localStorage.setItem("token", "demo-token")
    updateUserInfo()
    return
  }

  try {
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.ok) {
      currentUser = await response.json()
      updateUserInfo()
    } else {
      // Fallback to demo user
      currentUser = {
        id: Number.parseInt(userId),
        email: "demo@student.com",
        role: "student",
      }
      updateUserInfo()
    }
  } catch (error) {
    console.error("Auth error:", error)
    currentUser = {
      id: 1,
      email: "demo@student.com",
      role: "student",
    }
    updateUserInfo()
  }
}

// Update User Info in UI
function updateUserInfo() {
  const userName = document.getElementById("currentUserName")
  const userRole = document.getElementById("currentUserRole")

  if (currentUser) {
    if (userName) userName.textContent = currentUser.email || "Студент"
    if (userRole) userRole.textContent = currentUser.role || "student"
  }
}

// Navigation
function setupNavigation() {
  const sections = document.querySelectorAll(".content-section")
  sections.forEach((section) => section.classList.remove("active"))
  const dashboard = document.getElementById("dashboard")
  if (dashboard) dashboard.classList.add("active")
}

function navigateToSection(sectionId) {
  // Update sections
  const sections = document.querySelectorAll(".content-section")
  sections.forEach((section) => section.classList.remove("active"))
  const targetSection = document.getElementById(sectionId)
  if (targetSection) targetSection.classList.add("active")

  // Update nav items
  const navItems = document.querySelectorAll(".nav-item")
  navItems.forEach((item) => item.classList.remove("active"))
  const activeNav = document.querySelector(`[data-section="${sectionId}"]`)
  if (activeNav) activeNav.classList.add("active")

  // Load section data
  loadSectionData(sectionId)

  // Close mobile menu
  const sidebar = document.querySelector(".sidebar")
  if (sidebar && window.innerWidth <= 1024) {
    sidebar.classList.remove("active")
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" })
}

// Load Section Data
function loadSectionData(sectionId) {
  switch (sectionId) {
    case "dashboard":
      loadDashboardData()
      break
    case "quizzes":
      loadQuizzes()
      break
    case "leaderboard":
      loadLeaderboard()
      break
    case "statistics":
      loadStatistics()
      break
    case "detailed-results":
      if (quizResults) {
        displayDetailedResults()
      }
      break
  }
}

// Dashboard Data
async function loadDashboardData() {
  try {
    if (!currentUser) return

    const response = await fetch(`${API_URL}/api/users/${currentUser.id}/stats`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      updateDashboardStats(data.stats)
      updateRecentResults(data.recentResults)
    } else {
      // Use mock data
      updateDashboardStats({
        testsCompleted: 0,
        averageScore: 0,
        totalScore: 0,
      })
    }
  } catch (error) {
    console.error("Error loading dashboard:", error)
    // Use mock data on error
    updateDashboardStats({
      testsCompleted: 0,
      averageScore: 0,
      totalScore: 0,
    })
  }
}

function updateDashboardStats(stats) {
  const testsEl = document.getElementById("userTestsCompleted")
  const avgEl = document.getElementById("userAverageScore")
  const totalEl = document.getElementById("userTotalScore")

  if (testsEl) testsEl.textContent = stats.testsCompleted || 0
  if (avgEl) avgEl.textContent = (stats.averageScore || 0) + "%"
  if (totalEl) totalEl.textContent = stats.totalScore || 0
}

function updateRecentResults(results) {
  const container = document.getElementById("recentResults")
  if (!container) return

  if (!results || results.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Результати з\'являться після проходження тестів</p></div>'
    return
  }

  container.innerHTML = results
    .map(
      (result) => `
    <div class="result-item">
      <div class="result-info">
        <h4>${result.quiz_title || "Тест"}</h4>
        <div class="result-date">${new Date(result.completed_at).toLocaleDateString("uk-UA")}</div>
      </div>
      <div class="result-score">${result.score}%</div>
    </div>
  `,
    )
    .join("")
}

// Load Quizzes
async function loadQuizzes() {
  const container = document.getElementById("quizzesList")
  if (!container) return

  container.innerHTML = '<div class="loading">Завантаження тестів...</div>'

  try {
    const response = await fetch(`${API_URL}/api/quizzes`)

    if (response.ok) {
      const quizzes = await response.json()
      displayQuizzes(quizzes)
    } else {
      throw new Error("Failed to load quizzes")
    }
  } catch (error) {
    console.error("Error loading quizzes:", error)
    // Show mock quizzes on error
    displayQuizzes(getMockQuizzes())
  }
}

function displayQuizzes(quizzes) {
  const container = document.getElementById("quizzesList")
  if (!container) return

  if (quizzes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Немає доступних тестів</p></div>'
    return
  }

  container.innerHTML = quizzes
    .map(
      (quiz) => `
    <div class="quiz-card" onclick="startQuiz(${quiz.id})">
      <h3 class="quiz-title">${quiz.title}</h3>
      <p class="quiz-description">${quiz.description || "Опис відсутній"}</p>
      <div class="quiz-meta">
        <span>${quiz.questionCount || quiz.question_count || 0} питань</span>
        <span class="quiz-difficulty difficulty-${quiz.difficulty}">
          ${getDifficultyText(quiz.difficulty)}
        </span>
      </div>
    </div>
  `,
    )
    .join("")
}

function getDifficultyText(difficulty) {
  const texts = {
    easy: "Легкий",
    medium: "Середній",
    hard: "Складний",
  }
  return texts[difficulty] || difficulty
}

function getMockQuizzes() {
  return [
    {
      id: 1,
      title: "Математика (Базовий рівень)",
      description: "Тест з основ математики для підготовки до іспитів",
      difficulty: "easy",
      questionCount: 10,
    },
    {
      id: 2,
      title: "Українська мова",
      description: "Тест з української мови та літератури",
      difficulty: "medium",
      questionCount: 15,
    },
  ]
}

// Start Quiz
async function startQuiz(quizId) {
  try {
    const response = await fetch(`${API_URL}/api/quizzes/${quizId}`)

    if (response.ok) {
      currentQuiz = await response.json()
    } else {
      throw new Error("Failed to load quiz")
    }
  } catch (error) {
    console.error("Error loading quiz:", error)
    currentQuiz = {
      id: quizId,
      title: "Демонстраційний тест",
      questions: generateMockQuestions(10),
    }
  }

  currentQuestionIndex = 0
  userAnswers = new Array(currentQuiz.questions.length).fill(null)
  quizStartTime = Date.now()

  const titleEl = document.getElementById("quizTitle")
  if (titleEl) titleEl.textContent = currentQuiz.title

  navigateToSection("quiz-taking")
  displayQuestion()
}

// Generate Mock Questions
function generateMockQuestions(count) {
  const questions = []
  for (let i = 0; i < count; i++) {
    questions.push({
      id: i + 1,
      question: `Питання ${i + 1}: Скільки буде 2 + 2 × ${i + 1}?`,
      options: [`${2 + 2 * (i + 1)}`, `${(2 + 2) * (i + 1)}`, `${2 * (i + 1)}`, `${4 + (i + 1)}`],
      correct: 0,
    })
  }
  return questions
}

// Display Question
function displayQuestion() {
  if (!currentQuiz || !currentQuiz.questions) return

  const question = currentQuiz.questions[currentQuestionIndex]
  const totalQuestions = currentQuiz.questions.length

  // Update progress
  const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100
  const progressFill = document.getElementById("progressFill")
  const progressText = document.getElementById("progressText")

  if (progressFill) progressFill.style.width = progressPercent + "%"
  if (progressText) progressText.textContent = `${currentQuestionIndex + 1} з ${totalQuestions}`

  // Display question
  const questionText = document.getElementById("questionText")
  if (questionText) {
    questionText.textContent = question.question || question.question_text
  }

  // Display options
  const optionsContainer = document.getElementById("optionsContainer")
  if (optionsContainer) {
    optionsContainer.innerHTML = question.options
      .map(
        (option, index) => `
      <div class="option ${userAnswers[currentQuestionIndex] === index ? "selected" : ""}" 
           onclick="selectOption(${index})">
        ${option}
      </div>
    `,
      )
      .join("")
  }

  // Update buttons
  const prevBtn = document.getElementById("prevQuestion")
  const nextBtn = document.getElementById("nextQuestion")
  const submitBtn = document.getElementById("submitQuiz")

  if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0

  if (currentQuestionIndex === totalQuestions - 1) {
    if (nextBtn) nextBtn.style.display = "none"
    if (submitBtn) submitBtn.style.display = "block"
  } else {
    if (nextBtn) nextBtn.style.display = "block"
    if (submitBtn) submitBtn.style.display = "none"
  }
}

// Select Option
function selectOption(optionIndex) {
  userAnswers[currentQuestionIndex] = optionIndex
  displayQuestion()
}

// Previous Question
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--
    displayQuestion()
  }
}

// Next Question
function nextQuestion() {
  if (currentQuestionIndex < currentQuiz.questions.length - 1) {
    currentQuestionIndex++
    displayQuestion()
  }
}

// Submit Quiz
async function submitQuiz() {
  try {
    const quizEndTime = Date.now()
    const timeTakenMs = quizEndTime - quizStartTime
    const timeTakenMinutes = Math.floor(timeTakenMs / 1000 / 60)

    // Calculate results
    let correctCount = 0
    currentQuiz.questions.forEach((question, index) => {
      const correctAnswer = question.correct !== undefined ? question.correct : question.correctAnswer
      if (userAnswers[index] === correctAnswer) {
        correctCount++
      }
    })

    const totalQuestions = currentQuiz.questions.length
    const scorePercent = Math.round((correctCount / totalQuestions) * 100)

    // Save to server
    try {
      const response = await fetch(`${API_URL}/api/quizzes/${currentQuiz.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          answers: userAnswers,
          timeSpent: timeTakenMinutes,
        }),
      })

      if (!response.ok) {
        console.warn("Failed to save results to server")
      }
    } catch (error) {
      console.warn("Error saving results:", error)
    }

    // Store results locally
    quizResults = {
      quizId: currentQuiz.id,
      quizTitle: currentQuiz.title,
      totalQuestions,
      correctCount,
      incorrectCount: totalQuestions - correctCount,
      scorePercent,
      timeTakenMs,
      timeTakenMinutes,
      answers: userAnswers,
      questions: currentQuiz.questions,
    }

    displayResults()
    navigateToSection("quiz-results")
    showNotification("Тест успішно завершено!", "success")
  } catch (error) {
    console.error("Error submitting quiz:", error)
    showNotification("Помилка збереження результатів", "error")
  }
}

// Display Results
function displayResults() {
  if (!quizResults) return

  const scoreEl = document.getElementById("finalScore")
  const correctEl = document.getElementById("correctCount")
  const totalEl = document.getElementById("totalCount")
  const summaryEl = document.getElementById("resultsSummary")

  if (scoreEl) scoreEl.textContent = quizResults.scorePercent + "%"
  if (correctEl) correctEl.textContent = quizResults.correctCount
  if (totalEl) totalEl.textContent = quizResults.totalQuestions

  // Add performance feedback
  if (summaryEl) {
    const feedback = getPerformanceFeedback(quizResults.scorePercent)
    const existingFeedback = summaryEl.querySelector(".performance-feedback")
    if (existingFeedback) {
      existingFeedback.remove()
    }

    const feedbackHTML = `
      <div class="performance-feedback">
        <div class="summary-item">
          <span class="summary-label">Оцінка:</span>
          <span style="color: ${feedback.color}; font-weight: 600;">${feedback.text}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Час виконання:</span>
          <span>${formatTime(quizResults.timeTakenMs)}</span>
        </div>
      </div>
    `
    summaryEl.insertAdjacentHTML("beforeend", feedbackHTML)
  }
}

function getPerformanceFeedback(score) {
  if (score >= 90) return { text: "Відмінно!", color: "#10b981" }
  if (score >= 75) return { text: "Добре!", color: "#059669" }
  if (score >= 60) return { text: "Задовільно", color: "#f59e0b" }
  return { text: "Потребує покращення", color: "#ef4444" }
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes} хв ${seconds} сек`
}

// Show Detailed Results
function showDetailedResults() {
  if (!quizResults) {
    showNotification("Немає результатів для відображення", "warning")
    return
  }

  navigateToSection("detailed-results")
  displayDetailedResults()
}

// Display Detailed Results
function displayDetailedResults() {
  if (!quizResults) return

  const scoreEl = document.getElementById("detailedScore")
  const correctEl = document.getElementById("detailedCorrect")
  const incorrectEl = document.getElementById("detailedIncorrect")
  const timeEl = document.getElementById("detailedTime")

  if (scoreEl) scoreEl.textContent = quizResults.scorePercent + "%"
  if (correctEl) correctEl.textContent = quizResults.correctCount
  if (incorrectEl) incorrectEl.textContent = quizResults.incorrectCount
  if (timeEl) timeEl.textContent = formatTime(quizResults.timeTakenMs)

  const reviewContainer = document.getElementById("questionsReview")
  if (!reviewContainer) return

  reviewContainer.innerHTML = quizResults.questions
    .map((question, index) => {
      const userAnswer = quizResults.answers[index]
      const correctAnswer = question.correct !== undefined ? question.correct : question.correctAnswer
      const isCorrect = userAnswer === correctAnswer
      const wasAnswered = userAnswer !== null

      return `
      <div class="question-review ${isCorrect ? "correct" : "incorrect"}">
        <div class="question-header">
          <span class="question-number">Питання ${index + 1}</span>
          <span class="question-status ${isCorrect ? "status-correct" : wasAnswered ? "status-incorrect" : "status-no-answer"}">
            ${isCorrect ? "✓ Правильно" : wasAnswered ? "✗ Неправильно" : "⚠ Не відповів"}
          </span>
        </div>
        <div class="question-text">${question.question || question.question_text}</div>
        <div class="answers-review">
          ${question.options
            .map((option, optIndex) => {
              let className = "answer-option"
              let label = ""

              if (optIndex === correctAnswer) {
                className += " correct-answer"
                label = "(Правильна відповідь)"
              }
              if (optIndex === userAnswer) {
                if (isCorrect) {
                  className += " user-correct-answer"
                  label = "(Ваша відповідь)"
                } else {
                  className += " user-wrong-answer"
                  label = "(Ваша відповідь)"
                }
              }

              return `
              <div class="${className}">
                ${option} ${label ? `<span class="answer-label">${label}</span>` : ""}
              </div>
            `
            })
            .join("")}
        </div>
        ${!wasAnswered ? '<div class="no-answer-note">⚠ Ви не дали відповідь на це питання</div>' : ""}
      </div>
    `
    })
    .join("")
}

// Load Leaderboard
async function loadLeaderboard() {
  const container = document.getElementById("leaderboardList")
  if (!container) return

  container.innerHTML = '<div class="loading">Завантаження рейтингу...</div>'

  try {
    const response = await fetch(`${API_URL}/api/leaderboard`)

    if (response.ok) {
      const leaderboard = await response.json()
      displayLeaderboard(leaderboard)
    } else {
      throw new Error("Failed to load leaderboard")
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error)
    displayLeaderboard(getMockLeaderboard())
  }
}

function displayLeaderboard(leaderboard) {
  const container = document.getElementById("leaderboardList")
  if (!container) return

  if (leaderboard.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Рейтинг порожній</p></div>'
    return
  }

  container.innerHTML = leaderboard
    .map(
      (user, index) => `
    <div class="leaderboard-item">
      <div class="leaderboard-rank">${index + 1}</div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${user.name || user.email}</div>
        <div class="leaderboard-stats">${user.testsCompleted || user.tests_completed || 0} тестів пройдено</div>
      </div>
      <div class="leaderboard-score">${user.averageScore || user.average_score || 0}%</div>
    </div>
  `,
    )
    .join("")
}

function getMockLeaderboard() {
  return [
    { name: "Студент 1", testsCompleted: 5, averageScore: 85 },
    { name: "Студент 2", testsCompleted: 3, averageScore: 78 },
  ]
}

// Load Statistics
async function loadStatistics() {
  try {
    const response = await fetch(`${API_URL}/api/stats/overview`)

    if (response.ok) {
      const stats = await response.json()
      displayStatistics(stats)
    } else {
      throw new Error("Failed to load statistics")
    }
  } catch (error) {
    console.error("Error loading statistics:", error)
    displayStatistics(getMockStatistics())
  }
}

function displayStatistics(stats) {
  const totalTestsEl = document.getElementById("totalTestsCount")
  const totalUsersEl = document.getElementById("totalUsersCount")
  const avgScoreEl = document.getElementById("averageScoreAll")

  if (totalTestsEl) totalTestsEl.textContent = stats.totalTests || 0
  if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0
  if (avgScoreEl) avgScoreEl.textContent = (stats.averageScore || 0) + "%"

  // Category stats
  const categoryContainer = document.getElementById("categoryStats")
  if (!categoryContainer) return

  const categoryStats = stats.categoryStats || {}
  const categories = Object.entries(categoryStats)

  if (categories.length === 0) {
    categoryContainer.innerHTML = '<div class="empty-state"><p>Немає даних за категоріями</p></div>'
    return
  }

  categoryContainer.innerHTML = categories
    .map(
      ([category, data]) => `
    <div class="category-item">
      <span class="category-name">${getCategoryName(category)}</span>
      <span class="category-score">${data.averageScore || 0}% (${data.count || 0} тестів)</span>
    </div>
  `,
    )
    .join("")
}

function getCategoryName(category) {
  const names = {
    mathematics: "Математика",
    history: "Історія",
    ukrainian: "Українська мова",
    english: "Англійська мова",
    science: "Наука",
  }
  return names[category] || category
}

function getMockStatistics() {
  return {
    totalTests: 0,
    totalUsers: 0,
    averageScore: 0,
    categoryStats: {},
  }
}

// Show Notification
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification")
  if (!notification) return

  notification.textContent = message
  notification.className = `notification ${type}`
  notification.classList.remove("hidden")
  notification.classList.add("show")

  setTimeout(() => {
    notification.classList.remove("show")
    setTimeout(() => {
      notification.classList.add("hidden")
    }, 300)
  }, 3000)
}

// Handle window resize
window.addEventListener("resize", () => {
  const sidebar = document.querySelector(".sidebar")
  if (sidebar && window.innerWidth > 1024) {
    sidebar.classList.remove("active")
  }
})
