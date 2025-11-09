const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { Pool } = require("pg")
const path = require("path")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/testing_platform",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
})

// Middleware
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: true }))
app.use(express.static("."))

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Токен доступу відсутній" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Недійсний токен" })
    }
    req.user = user
    next()
  })
}

// Initialize Database
async function initDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        birth_date DATE,
        phone VARCHAR(20),
        school VARCHAR(255),
        grade VARCHAR(20),
        city VARCHAR(100),
        subjects TEXT,
        role VARCHAR(20) DEFAULT 'student',
        total_score INTEGER DEFAULT 0,
        tests_completed INTEGER DEFAULT 0,
        average_score DECIMAL(5,2) DEFAULT 0,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create quizzes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'general',
        difficulty VARCHAR(20) DEFAULT 'medium',
        questions JSONB NOT NULL,
        time_limit INTEGER DEFAULT 60,
        passing_score INTEGER DEFAULT 60,
        times_taken INTEGER DEFAULT 0,
        average_score DECIMAL(5,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create test_results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        time_spent INTEGER DEFAULT 0,
        results JSONB NOT NULL,
        category VARCHAR(100),
        difficulty VARCHAR(20),
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Insert demo quizzes if none exist
    const quizCount = await pool.query("SELECT COUNT(*) FROM quizzes")
    if (Number.parseInt(quizCount.rows[0].count) === 0) {
      await pool.query(
        `
        INSERT INTO quizzes (title, description, category, difficulty, questions) VALUES
        ($1, $2, $3, $4, $5),
        ($6, $7, $8, $9, $10)
      `,
        [
          "Математика - Основи",
          "Тест з основ математики для підготовки до іспитів",
          "mathematics",
          "easy",
          JSON.stringify([
            {
              id: 1,
              question: "Скільки буде 2 + 2?",
              options: ["3", "4", "5", "6"],
              correct: 1,
            },
            {
              id: 2,
              question: "Яка формула площі кола?",
              options: ["πr²", "2πr", "πd", "r²"],
              correct: 0,
            },
            {
              id: 3,
              question: "Скільки градусів у прямому куті?",
              options: ["45°", "60°", "90°", "180°"],
              correct: 2,
            },
          ]),
          "Історія України",
          "Тест з історії України для перевірки знань",
          "history",
          "medium",
          JSON.stringify([
            {
              id: 1,
              question: "В якому році Україна отримала незалежність?",
              options: ["1990", "1991", "1992", "1993"],
              correct: 1,
            },
            {
              id: 2,
              question: "Хто був першим президентом України?",
              options: ["Леонід Кравчук", "Леонід Кучма", "Віктор Ющенко", "Петро Порошенко"],
              correct: 0,
            },
          ]),
        ],
      )
      console.log("Demo quizzes created")
    }

    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
  }
}

// API Routes

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email та пароль обов'язкові" })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Пароль повинен містити мінімум 6 символів" })
    }

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Користувач з таким email вже існує" })
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const result = await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email", [
      email,
      passwordHash,
    ])

    const user = result.rows[0]
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" })

    res.status(201).json({ message: "Користувач успішно зареєстрований", token, userId: user.id })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Внутрішня помилка сервера" })
  }
})

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email та пароль обов'язкові" })
    }

    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Невірний email або пароль" })
    }

    const user = result.rows[0]
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Невірний email або пароль" })
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" })

    res.json({ message: "Успішний вхід", token, userId: user.id })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Внутрішня помилка сервера" })
  }
})

// Get user
app.get("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id)

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: "Доступ заборонено" })
    }

    const result = await pool.query(
      "SELECT id, email, first_name, last_name, role, tests_completed, average_score, total_score FROM users WHERE id = $1",
      [userId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Користувач не знайдений" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Помилка сервера" })
  }
})

// Get user stats
app.get("/api/users/:id/stats", authenticateToken, async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id)

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: "Доступ заборонено" })
    }

    const userResult = await pool.query("SELECT tests_completed, average_score, total_score FROM users WHERE id = $1", [
      userId,
    ])

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Користувач не знайдений" })
    }

    const userStats = userResult.rows[0]

    const recentResults = await pool.query(
      `SELECT tr.score, tr.completed_at, q.title as quiz_title
       FROM test_results tr
       JOIN quizzes q ON tr.quiz_id = q.id
       WHERE tr.user_id = $1
       ORDER BY tr.completed_at DESC
       LIMIT 5`,
      [userId],
    )

    res.json({
      stats: {
        testsCompleted: userStats.tests_completed || 0,
        averageScore: Math.round(userStats.average_score || 0),
        totalScore: userStats.total_score || 0,
      },
      recentResults: recentResults.rows,
    })
  } catch (error) {
    console.error("Get user stats error:", error)
    res.status(500).json({ message: "Помилка сервера" })
  }
})

// Get all quizzes
app.get("/api/quizzes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, category, difficulty, 
             jsonb_array_length(questions) as question_count
      FROM quizzes 
      WHERE is_active = true
      ORDER BY created_at DESC
    `)

    const quizzes = result.rows.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      difficulty: quiz.difficulty,
      questionCount: quiz.question_count,
    }))

    res.json(quizzes)
  } catch (error) {
    console.error("Get quizzes error:", error)
    res.status(500).json({ error: "Помилка отримання тестів" })
  }
})

// Get specific quiz
app.get("/api/quizzes/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM quizzes WHERE id = $1", [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Тест не знайдено" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Get quiz error:", error)
    res.status(500).json({ error: "Помилка отримання тесту" })
  }
})

// Submit quiz
app.post("/api/quizzes/:id/submit", authenticateToken, async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const quizId = Number.parseInt(req.params.id)
    const { answers, timeSpent } = req.body
    const userId = req.user.userId

    const quizResult = await client.query("SELECT * FROM quizzes WHERE id = $1", [quizId])
    if (quizResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ success: false, error: "Quiz not found" })
    }

    const quiz = quizResult.rows[0]
    const questions = quiz.questions

    let correctAnswers = 0
    questions.forEach((question, index) => {
      if (answers[index] === question.correct) {
        correctAnswers++
      }
    })

    const totalQuestions = questions.length
    const score = Math.round((correctAnswers / totalQuestions) * 100)

    const resultData = {
      userAnswers: answers,
      questions: questions,
      correctAnswers: correctAnswers,
      totalQuestions: totalQuestions,
      score: score,
    }

    await client.query(
      `INSERT INTO test_results (user_id, quiz_id, score, correct_answers, total_questions, time_spent, results, category, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        quizId,
        score,
        correctAnswers,
        totalQuestions,
        timeSpent || 0,
        JSON.stringify(resultData),
        quiz.category,
        quiz.difficulty,
      ],
    )

    const userUpdateResult = await client.query(
      `UPDATE users SET 
       tests_completed = tests_completed + 1,
       total_score = total_score + $1
       WHERE id = $2 RETURNING tests_completed, total_score`,
      [score, userId],
    )

    if (userUpdateResult.rows.length > 0) {
      const { tests_completed, total_score } = userUpdateResult.rows[0]
      const newAverageScore = Math.round((total_score / tests_completed) * 100) / 100
      await client.query("UPDATE users SET average_score = $1 WHERE id = $2", [newAverageScore, userId])
    }

    await client.query("COMMIT")

    res.json({
      success: true,
      result: {
        score: score,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
      },
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Submit quiz error:", error)
    res.status(500).json({ success: false, error: "Error saving results" })
  } finally {
    client.release()
  }
})

// Get leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        COALESCE(u.first_name || ' ' || u.last_name, SPLIT_PART(u.email, '@', 1)) as name,
        u.email,
        COALESCE(u.total_score, 0) as total_score,
        COALESCE(u.tests_completed, 0) as tests_completed,
        COALESCE(u.average_score, 0) as average_score
      FROM users u
      WHERE u.role = 'student' OR u.role IS NULL
      ORDER BY 
        CASE WHEN COALESCE(u.tests_completed, 0) = 0 THEN 1 ELSE 0 END,
        COALESCE(u.average_score, 0) DESC, 
        COALESCE(u.total_score, 0) DESC
      LIMIT 50
    `)

    const leaderboard = result.rows.map((row, index) => ({
      id: row.id,
      name: row.name || "Невідомий користувач",
      email: row.email,
      totalScore: Number.parseInt(row.total_score) || 0,
      testsCompleted: Number.parseInt(row.tests_completed) || 0,
      averageScore: Math.round(Number.parseFloat(row.average_score) || 0),
      rank: index + 1,
    }))

    res.json(leaderboard)
  } catch (error) {
    console.error("Get leaderboard error:", error)
    res.status(500).json({ error: "Помилка отримання рейтингу" })
  }
})

// Get statistics
app.get("/api/stats/overview", async (req, res) => {
  try {
    const totalTestsResult = await pool.query("SELECT COUNT(*) FROM test_results")
    const totalUsersResult = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'student' OR role IS NULL")
    const averageScoreResult = await pool.query("SELECT COALESCE(AVG(score), 0) as avg_score FROM test_results")

    const categoryStatsResult = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(AVG(score), 0) as average_score
      FROM test_results 
      WHERE category IS NOT NULL
      GROUP BY category
    `)

    const categoryStats = {}
    categoryStatsResult.rows.forEach((row) => {
      categoryStats[row.category] = {
        count: Number.parseInt(row.count),
        averageScore: Math.round(Number.parseFloat(row.average_score)),
      }
    })

    res.json({
      totalTests: Number.parseInt(totalTestsResult.rows[0].count),
      totalUsers: Number.parseInt(totalUsersResult.rows[0].count),
      averageScore: Math.round(Number.parseFloat(averageScoreResult.rows[0].avg_score)),
      categoryStats,
    })
  } catch (error) {
    console.error("Get stats overview error:", error)
    res.status(500).json({ error: "Помилка отримання статистики" })
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  initDatabase()
})
