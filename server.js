const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.static('.'));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');

async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`File not found or empty: ${filePath}, returning empty array`);
    return [];
  }
}

async function writeJSON(filePath, data) {
  try {
    await fs.mkdir(path.dirname(filePath), {
      recursive: true
    });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

async function initDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, {
      recursive: true
    });

    // Initialize files if they don't exist
    const files = [{
        path: USERS_FILE,
        data: []
      },
      {
        path: QUIZZES_FILE,
        data: []
      },
      {
        path: RESULTS_FILE,
        data: []
      }
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch {
        await writeJSON(file.path, file.data);
        console.log(`Created ${file.path}`);
      }
    }

    console.log('Data directory initialized');
  } catch (error) {
    console.error('Error initializing data directory:', error);
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Токен доступу відсутній'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: 'Недійсний токен'
      });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === decoded.userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access required'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      message: 'Invalid or expired token'
    });
  }
};

app.post('/api/register', async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email та пароль обов\'язкові'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Пароль повинен містити мінімум 6 символів'
      });
    }

    const users = await readJSON(USERS_FILE);

    if (users.find(u => u.email === email)) {
      return res.status(400).json({
        message: 'Користувач з таким email вже існує'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      email,
      password_hash: passwordHash,
      first_name: null,
      last_name: null,
      role: 'student',
      total_score: 0,
      tests_completed: 0,
      average_score: 0,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    await writeJSON(USERS_FILE, users);

    const token = jwt.sign({
      userId: newUser.id,
      email: newUser.email
    }, JWT_SECRET, {
      expiresIn: '24h'
    });

    res.status(201).json({
      message: 'Користувач успішно зареєстрований',
      token,
      userId: newUser.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Внутрішня помилка сервера'
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email та пароль обов\'язкові'
      });
    }

    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({
        message: 'Невірний email або пароль'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Невірний email або пароль'
      });
    }

    const token = jwt.sign({
      userId: user.id,
      email: user.email
    }, JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({
      message: 'Успішний вхід',
      token,
      userId: user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Внутрішня помилка сервера'
    });
  }
});

// Admin Authentication Endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const {
      password
    } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '319560';

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Невірний пароль'
      });
    }

    const users = await readJSON(USERS_FILE);
    let admin = users.find(u => u.role === 'admin');

    if (!admin) {
      admin = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        email: 'admin@nmt.gov.ua',
        first_name: 'Адмін',
        last_name: 'Користувач',
        role: 'admin',
        password_hash: 'default_hash',
        total_score: 0,
        tests_completed: 0,
        average_score: 0,
        created_at: new Date().toISOString()
      };
      users.push(admin);
      await writeJSON(USERS_FILE, users);
    }

    const token = jwt.sign({
      userId: admin.id,
      email: admin.email,
      role: admin.role
    }, JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({
      success: true,
      token,
      user: admin
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Внутрішня помилка сервера'
    });
  }
});

// Get profile endpoint
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: 'Користувач не знайдений'
      });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Внутрішня помилка сервера'
    });
  }
});

// Update profile endpoint
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      birthDate,
      phone,
      school,
      grade,
      city,
      subjects
    } = req.body;
    const users = await readJSON(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === req.user.userId);

    if (userIndex === -1) {
      return res.status(404).json({
        message: 'Користувач не знайдений'
      });
    }

    users[userIndex] = {
      ...users[userIndex],
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      phone,
      school,
      grade,
      city,
      subjects: JSON.stringify(subjects)
    };

    await writeJSON(USERS_FILE, users);

    res.json({
      message: 'Профіль успішно оновлено',
      user: users[userIndex]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Внутрішня помилка сервера'
    });
  }
});

app.get('/api/quizzes', async (req, res) => {
  try {
    const quizzes = await readJSON(QUIZZES_FILE);
    const quizzesList = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      difficulty: quiz.difficulty,
      questionCount: quiz.questions ? quiz.questions.length : 0,
      question_count: quiz.questions ? quiz.questions.length : 0
    }));
    res.json(quizzesList);
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json([]);
  }
});

app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const quizzes = await readJSON(QUIZZES_FILE);
    const quiz = quizzes.find(q => q.id === parseInt(req.params.id));

    if (!quiz) {
      return res.status(404).json({
        error: 'Тест не знайдено'
      });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({
      error: 'Помилка отримання тесту'
    });
  }
});

app.post('/api/quizzes/:id/submit', authenticateToken, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    const {
      answers,
      timeSpent
    } = req.body;
    const userId = req.user.userId;

    const quizzes = await readJSON(QUIZZES_FILE);
    const quiz = quizzes.find(q => q.id === quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Тест не знайдено'
      });
    }

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    quiz.questions.forEach((question, index) => {
      totalPoints += question.points || 1;
      if (answers[index] === question.correct) {
        correctAnswers++;
        earnedPoints += question.points || 1;
      }
    });

    const score = Math.round((earnedPoints / totalPoints) * 100);

    // Save result
    const results = await readJSON(RESULTS_FILE);
    const newResult = {
      id: results.length > 0 ? Math.max(...results.map(r => r.id)) + 1 : 1,
      user_id: userId,
      quiz_id: quizId,
      score,
      correct_answers: correctAnswers,
      total_questions: quiz.questions.length,
      time_spent: timeSpent || 0,
      category: quiz.category,
      difficulty: quiz.difficulty,
      completed_at: new Date().toISOString()
    };

    results.push(newResult);
    await writeJSON(RESULTS_FILE, results);

    // Update user statistics
    const users = await readJSON(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex !== -1) {
      users[userIndex].tests_completed = (users[userIndex].tests_completed || 0) + 1;
      users[userIndex].total_score = (users[userIndex].total_score || 0) + score;
      users[userIndex].average_score = Math.round(users[userIndex].total_score / users[userIndex].tests_completed);
      await writeJSON(USERS_FILE, users);
    }

    // Update quiz statistics
    const quizIndex = quizzes.findIndex(q => q.id === quizId);
    if (quizIndex !== -1) {
      quizzes[quizIndex].timesTaken = (quizzes[quizIndex].timesTaken || 0) + 1;
      const quizResults = results.filter(r => r.quiz_id === quizId);
      const avgScore = quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length;
      quizzes[quizIndex].averageScore = Math.round(avgScore);
      await writeJSON(QUIZZES_FILE, quizzes);
    }

    res.json({
      success: true,
      result: {
        score,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        earnedPoints,
        totalPoints,
        timeSpent: timeSpent || 0
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Помилка збереження результатів'
    });
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (req.user.userId !== userId) {
      return res.status(403).json({
        message: 'Доступ заборонено'
      });
    }

    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        message: 'Користувач не знайдений'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Помилка сервера'
    });
  }
});

app.get('/api/users/:id/stats', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (req.user.userId !== userId) {
      return res.status(403).json({
        message: 'Доступ заборонено'
      });
    }

    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        message: 'Користувач не знайдений'
      });
    }

    const results = await readJSON(RESULTS_FILE);
    const quizzes = await readJSON(QUIZZES_FILE);
    const userResults = results.filter(r => r.user_id === userId);

    const recentResults = userResults
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, 5)
      .map(r => {
        const quiz = quizzes.find(q => q.id === r.quiz_id);
        return {
          quiz_title: quiz ? quiz.title : 'Невідомий тест',
          score: r.score,
          completed_at: r.completed_at
        };
      });

    res.json({
      stats: {
        testsCompleted: user.tests_completed || 0,
        averageScore: Math.round(user.average_score || 0),
        totalScore: user.total_score || 0
      },
      recentResults
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      message: 'Помилка сервера'
    });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await readJSON(USERS_FILE);
    const leaderboard = users
      .filter(u => u.role !== 'admin')
      .map(user => ({
        id: user.id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        email: user.email,
        testsCompleted: user.tests_completed || 0,
        averageScore: Math.round(user.average_score || 0),
        totalScore: user.total_score || 0
      }))
      .sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore)
      .slice(0, 50);

    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json([]);
  }
});

app.get('/api/stats/overview', async (req, res) => {
  try {
    const results = await readJSON(RESULTS_FILE);
    const users = await readJSON(USERS_FILE);
    const quizzes = await readJSON(QUIZZES_FILE);

    const totalTests = results.length;
    const totalUsers = users.filter(u => u.role !== 'admin').length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalTests > 0 ?
      Math.round(totalScore / totalTests) :
      0;

    // Category stats
    const categoryStats = {};
    results.forEach(result => {
      const quiz = quizzes.find(q => q.id === result.quiz_id);
      if (quiz && quiz.category) {
        if (!categoryStats[quiz.category]) {
          categoryStats[quiz.category] = {
            count: 0,
            totalScore: 0
          };
        }
        categoryStats[quiz.category].count++;
        categoryStats[quiz.category].totalScore += result.score;
      }
    });

    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.averageScore = Math.round(stats.totalScore / stats.count);
    });

    res.json({
      totalTests,
      totalUsers,
      averageScore,
      categoryStats
    });
  } catch (error) {
    console.error('Get stats overview error:', error);
    res.status(500).json({
      error: 'Помилка отримання статистики'
    });
  }
});

// Admin endpoints
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const users = await readJSON(USERS_FILE);
    const quizzes = await readJSON(QUIZZES_FILE);
    const results = await readJSON(RESULTS_FILE);

    const totalUsers = users.filter(u => u.role !== 'admin').length;
    const totalQuizzes = quizzes.length;
    const totalResults = results.length;
    const averageScore = totalResults > 0 ?
      Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalResults) :
      0;

    const recentActivity = results
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, 10)
      .map(r => {
        const user = users.find(u => u.id === r.user_id);
        const quiz = quizzes.find(q => q.id === r.quiz_id);
        return {
          id: r.id,
          score: r.score,
          completed_at: r.completed_at,
          category: r.category,
          user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Невідомий',
          quiz_title: quiz ? quiz.title : 'Невідомий тест'
        };
      });

    const categoryStats = {};
    results.forEach(r => {
      if (r.category) {
        if (!categoryStats[r.category]) {
          categoryStats[r.category] = {
            total_tests: 0,
            total_score: 0
          };
        }
        categoryStats[r.category].total_tests++;
        categoryStats[r.category].total_score += r.score;
      }
    });

    Object.keys(categoryStats).forEach(cat => {
      categoryStats[cat].avg_score = Math.round(categoryStats[cat].total_score / categoryStats[cat].total_tests);
    });

    res.json({
      totalUsers,
      totalQuizzes,
      totalResults,
      averageScore,
      recentActivity,
      categoryStats: Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        ...stats
      }))
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      error: 'Помилка отримання даних дашборду'
    });
  }
});

app.get('/api/admin/results', requireAdmin, async (req, res) => {
  try {
    const results = await readJSON(RESULTS_FILE);
    const users = await readJSON(USERS_FILE);
    const quizzes = await readJSON(QUIZZES_FILE);

    const formattedResults = results
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, 100)
      .map(r => {
        const user = users.find(u => u.id === r.user_id);
        const quiz = quizzes.find(q => q.id === r.quiz_id);
        return {
          id: r.id,
          userName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Невідомий',
          quizTitle: quiz ? quiz.title : 'Невідомий тест',
          category: r.category,
          score: r.score,
          correctAnswers: r.correct_answers,
          totalQuestions: r.total_questions,
          completedAt: r.completed_at
        };
      });

    res.json(formattedResults);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      error: 'Помилка отримання результатів'
    });
  }
});

async function startServer() {
  await initDataDirectory();
  app.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT}`);
    console.log(`Відкрийте http://localhost:${PORT} у браузері`);
  });
}

startServer();