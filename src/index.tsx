import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================
// API Routes
// ============================================

// Get or create user
app.post('/api/users', async (c) => {
  const { name, email } = await c.req.json()
  const userId = crypto.randomUUID()
  
  await c.env.DB.prepare(`
    INSERT INTO users (id, name, email) VALUES (?, ?, ?)
  `).bind(userId, name, email || null).run()
  
  // Initialize skill levels
  const skills = ['reading', 'listening', 'speaking', 'writing']
  for (const skill of skills) {
    await c.env.DB.prepare(`
      INSERT INTO user_skills (user_id, skill, level) VALUES (?, ?, 'A0')
    `).bind(userId, skill).run()
  }
  
  return c.json({ userId, name, level: 'A0' })
})

// Get user profile
app.get('/api/users/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  const user = await c.env.DB.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(userId).first()
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  const skills = await c.env.DB.prepare(`
    SELECT skill, level, mastery_score FROM user_skills WHERE user_id = ?
  `).bind(userId).all()
  
  return c.json({ user, skills: skills.results })
})

// Get diagnostic test items (placement test)
app.get('/api/diagnostic', async (c) => {
  const levels = ['A0', 'A1', 'A2', 'B1']
  const skills = ['reading', 'listening']
  const items = []
  
  // Get 2 items per skill per level (16 total items, ~15-20 minutes)
  for (const level of levels) {
    for (const skill of skills) {
      const levelItems = await c.env.DB.prepare(`
        SELECT * FROM content_items 
        WHERE type = ? AND level = ?
        ORDER BY RANDOM()
        LIMIT 2
      `).bind(skill, level).all()
      
      items.push(...levelItems.results)
    }
  }
  
  return c.json({ items })
})

// Submit diagnostic results
app.post('/api/diagnostic/submit', async (c) => {
  const { userId, responses } = await c.req.json()
  
  // Calculate accuracy per skill and level
  const skillLevels: Record<string, { level: string; score: number }> = {}
  
  for (const response of responses) {
    const item = await c.env.DB.prepare(`
      SELECT type, level FROM content_items WHERE id = ?
    `).bind(response.itemId).first()
    
    if (!item) continue
    
    const key = item.type as string
    if (!skillLevels[key]) {
      skillLevels[key] = { level: 'A0', score: 0 }
    }
    
    // Determine level based on accuracy
    if (response.isCorrect) {
      skillLevels[key].score++
      skillLevels[key].level = item.level as string
    }
  }
  
  // Update user skills
  for (const [skill, data] of Object.entries(skillLevels)) {
    await c.env.DB.prepare(`
      UPDATE user_skills 
      SET level = ?, mastery_score = ? 
      WHERE user_id = ? AND skill = ?
    `).bind(data.level, data.score / 4, userId, skill).run()
  }
  
  // Update user onboarding
  await c.env.DB.prepare(`
    UPDATE users 
    SET onboarding_completed = 1, current_level = ?
    WHERE id = ?
  `).bind(skillLevels['reading']?.level || 'A0', userId).run()
  
  return c.json({ skillLevels })
})

// Get adaptive daily session items
app.get('/api/session/daily/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  // Get user's current skill levels
  const skills = await c.env.DB.prepare(`
    SELECT skill, level FROM user_skills WHERE user_id = ?
  `).bind(userId).all()
  
  const userSkills = skills.results as Array<{ skill: string; level: string }>
  
  // Get mastery nodes to determine weak areas
  const masteryNodes = await c.env.DB.prepare(`
    SELECT skill, theme, tactic, level, mastery_score 
    FROM mastery_nodes 
    WHERE user_id = ?
    ORDER BY mastery_score ASC
    LIMIT 10
  `).bind(userId).all()
  
  const weakNodes = masteryNodes.results as Array<{
    skill: string;
    theme: string;
    tactic: string;
    level: string;
    mastery_score: number;
  }>
  
  // Build session structure
  const session: Record<string, any> = {
    warmup: [],
    listening: [],
    reading: [],
    speaking: [],
    writing: []
  }
  
  // 1. Warm-up: 10 SRS flashcards
  const srsItems = await c.env.DB.prepare(`
    SELECT sq.*, v.word, v.translation, v.example_sentence
    FROM srs_queue sq
    JOIN vocabulary v ON sq.item_id = v.id
    WHERE sq.user_id = ? AND sq.due_date <= date('now') AND sq.item_type = 'vocab'
    ORDER BY sq.due_date ASC
    LIMIT 10
  `).bind(userId).all()
  
  session.warmup = srsItems.results
  
  // 2. Listening (7 min = 2 items)
  const listeningLevel = userSkills.find(s => s.skill === 'reading')?.level || 'A0'
  const listeningItems = await c.env.DB.prepare(`
    SELECT * FROM content_items
    WHERE type = 'listening' AND level = ?
    ORDER BY RANDOM()
    LIMIT 2
  `).bind(listeningLevel).all()
  session.listening = listeningItems.results
  
  // 3. Reading (7 min = 2 items)
  const readingLevel = userSkills.find(s => s.skill === 'reading')?.level || 'A0'
  const readingItems = await c.env.DB.prepare(`
    SELECT * FROM content_items
    WHERE type = 'reading' AND level = ?
    ORDER BY RANDOM()
    LIMIT 2
  `).bind(readingLevel).all()
  session.reading = readingItems.results
  
  // 4. Speaking (7 min = 1 role-play)
  const speakingLevel = userSkills.find(s => s.skill === 'speaking')?.level || 'A0'
  const speakingItems = await c.env.DB.prepare(`
    SELECT * FROM content_items
    WHERE type = 'speaking' AND level = ?
    ORDER BY RANDOM()
    LIMIT 1
  `).bind(speakingLevel).all()
  session.speaking = speakingItems.results
  
  // 5. Writing (4 min = 1 micro-task)
  const writingLevel = userSkills.find(s => s.skill === 'writing')?.level || 'A0'
  const writingItems = await c.env.DB.prepare(`
    SELECT * FROM content_items
    WHERE type = 'writing' AND level = ?
    ORDER BY RANDOM()
    LIMIT 1
  `).bind(writingLevel).all()
  session.writing = writingItems.results
  
  // Get strategy tip of the day
  const strategyTip = await c.env.DB.prepare(`
    SELECT * FROM strategy_tips
    ORDER BY RANDOM()
    LIMIT 1
  `).all()
  
  session.strategyTip = strategyTip.results[0] || null
  
  return c.json(session)
})

// Submit session responses
app.post('/api/session/submit', async (c) => {
  const { userId, responses, sessionType } = await c.req.json()
  
  // Create session record
  const sessionResult = await c.env.DB.prepare(`
    INSERT INTO sessions (user_id, session_type, started_at)
    VALUES (?, ?, datetime('now'))
    RETURNING id
  `).bind(userId, sessionType || 'daily').first()
  
  const sessionId = (sessionResult as any).id
  let correctCount = 0
  let totalCount = 0
  
  // Process each response
  for (const response of responses) {
    const isCorrect = response.isCorrect ? 1 : 0
    correctCount += isCorrect
    totalCount++
    
    // Save session item
    await c.env.DB.prepare(`
      INSERT INTO session_items (session_id, content_item_id, user_response, is_correct, time_spent_seconds)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      response.itemId,
      JSON.stringify(response.userAnswer),
      isCorrect,
      response.timeSpent || 0
    ).run()
    
    // Update mastery node
    const item = await c.env.DB.prepare(`
      SELECT type, theme, tactic, level FROM content_items WHERE id = ?
    `).bind(response.itemId).first()
    
    if (item) {
      // Check if mastery node exists
      const existingNode = await c.env.DB.prepare(`
        SELECT * FROM mastery_nodes
        WHERE user_id = ? AND skill = ? AND theme = ? AND tactic = ? AND level = ?
      `).bind(
        userId,
        item.type,
        item.theme,
        item.tactic,
        item.level
      ).first()
      
      if (existingNode) {
        // Update existing node
        const newCorrectCount = (existingNode.correct_count as number) + isCorrect
        const newAttempts = (existingNode.attempts as number) + 1
        const newMastery = newCorrectCount / newAttempts
        
        await c.env.DB.prepare(`
          UPDATE mastery_nodes
          SET mastery_score = ?, attempts = ?, correct_count = ?, last_practiced = datetime('now')
          WHERE id = ?
        `).bind(newMastery, newAttempts, newCorrectCount, existingNode.id).run()
      } else {
        // Create new node
        await c.env.DB.prepare(`
          INSERT INTO mastery_nodes (user_id, skill, theme, tactic, level, mastery_score, attempts, correct_count, last_practiced)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
        `).bind(
          userId,
          item.type,
          item.theme,
          item.tactic,
          item.level,
          isCorrect ? 1.0 : 0.0,
          isCorrect
        ).run()
      }
    }
    
    // Add to SRS queue if incorrect
    if (!isCorrect && item) {
      await c.env.DB.prepare(`
        INSERT INTO srs_queue (user_id, item_type, item_id, due_date, interval_days)
        VALUES (?, 'content_item', ?, date('now', '+1 day'), 1)
      `).bind(userId, response.itemId).run()
    }
  }
  
  // Update session completion
  const accuracy = totalCount > 0 ? correctCount / totalCount : 0
  await c.env.DB.prepare(`
    UPDATE sessions
    SET completed_at = datetime('now'),
        items_completed = ?,
        accuracy = ?
    WHERE id = ?
  `).bind(totalCount, accuracy, sessionId).run()
  
  // Update user streak
  const user = await c.env.DB.prepare(`
    SELECT last_session_date, streak_days FROM users WHERE id = ?
  `).bind(userId).first()
  
  const today = new Date().toISOString().split('T')[0]
  let newStreak = 1
  
  if (user && user.last_session_date) {
    const lastDate = new Date(user.last_session_date as string)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      newStreak = (user.streak_days as number) + 1
    } else if (diffDays === 0) {
      newStreak = user.streak_days as number
    }
  }
  
  await c.env.DB.prepare(`
    UPDATE users
    SET last_session_date = ?, streak_days = ?
    WHERE id = ?
  `).bind(today, newStreak, userId).run()
  
  return c.json({ sessionId, accuracy, correctCount, totalCount, streak: newStreak })
})

// Get user progress dashboard
app.get('/api/progress/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  // Get user info
  const user = await c.env.DB.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(userId).first()
  
  // Get skill levels
  const skills = await c.env.DB.prepare(`
    SELECT skill, level, mastery_score FROM user_skills WHERE user_id = ?
  `).bind(userId).all()
  
  // Get recent sessions
  const sessions = await c.env.DB.prepare(`
    SELECT * FROM sessions WHERE user_id = ?
    ORDER BY started_at DESC
    LIMIT 10
  `).bind(userId).all()
  
  // Get weak areas (lowest mastery nodes)
  const weakAreas = await c.env.DB.prepare(`
    SELECT skill, theme, tactic, mastery_score
    FROM mastery_nodes
    WHERE user_id = ?
    ORDER BY mastery_score ASC
    LIMIT 5
  `).bind(userId).all()
  
  // Calculate total time spent
  const totalTime = await c.env.DB.prepare(`
    SELECT SUM(duration_seconds) as total FROM sessions WHERE user_id = ? AND completed_at IS NOT NULL
  `).bind(userId).first()
  
  return c.json({
    user,
    skills: skills.results,
    recentSessions: sessions.results,
    weakAreas: weakAreas.results,
    totalTimeMinutes: Math.floor(((totalTime?.total as number) || 0) / 60)
  })
})

// Get vocabulary for SRS review
app.get('/api/vocabulary/due/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  const dueItems = await c.env.DB.prepare(`
    SELECT sq.*, v.word, v.translation, v.example_sentence, v.level, v.theme
    FROM srs_queue sq
    JOIN vocabulary v ON sq.item_id = v.id
    WHERE sq.user_id = ? AND sq.due_date <= date('now') AND sq.item_type = 'vocab'
    ORDER BY sq.due_date ASC
    LIMIT 20
  `).bind(userId).all()
  
  return c.json({ items: dueItems.results })
})

// Submit vocabulary review
app.post('/api/vocabulary/review', async (c) => {
  const { userId, vocabId, quality } = await c.req.json() // quality: 0-5 (SM-2 algorithm)
  
  // Get current SRS item
  const srsItem = await c.env.DB.prepare(`
    SELECT * FROM srs_queue WHERE user_id = ? AND item_id = ? AND item_type = 'vocab'
  `).bind(userId, vocabId).first()
  
  if (!srsItem) {
    return c.json({ error: 'SRS item not found' }, 404)
  }
  
  // SM-2 algorithm
  let easinessFactor = srsItem.easiness_factor as number
  let intervalDays = srsItem.interval_days as number
  let repetitions = srsItem.repetitions as number
  
  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      intervalDays = 1
    } else if (repetitions === 1) {
      intervalDays = 3
    } else {
      intervalDays = Math.round(intervalDays * easinessFactor)
    }
    repetitions++
  } else {
    // Incorrect response - reset
    repetitions = 0
    intervalDays = 1
  }
  
  // Update ease factor
  easinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  easinessFactor = Math.max(1.3, easinessFactor) // Minimum 1.3
  
  // Update SRS queue
  await c.env.DB.prepare(`
    UPDATE srs_queue
    SET due_date = date('now', '+' || ? || ' days'),
        interval_days = ?,
        easiness_factor = ?,
        repetitions = ?,
        last_reviewed = datetime('now')
    WHERE id = ?
  `).bind(intervalDays, intervalDays, easinessFactor, repetitions, srsItem.id).run()
  
  return c.json({ success: true, nextReview: intervalDays })
})

// Get strategy tips
app.get('/api/tips', async (c) => {
  const { skill, level } = c.req.query()
  
  let query = 'SELECT * FROM strategy_tips WHERE 1=1'
  const bindings = []
  
  if (skill) {
    query += ' AND skill = ?'
    bindings.push(skill)
  }
  
  if (level) {
    query += ' AND level = ?'
    bindings.push(level)
  }
  
  query += ' ORDER BY RANDOM() LIMIT 5'
  
  const tips = await c.env.DB.prepare(query).bind(...bindings).all()
  
  return c.json({ tips: tips.results })
})

// Get mock exam items
app.get('/api/mock/:userId', async (c) => {
  const userId = c.req.param('userId')
  const { type } = c.req.query() // 'mini-mock' or 'full-mock'
  
  const user = await c.env.DB.prepare(`
    SELECT current_level FROM users WHERE id = ?
  `).bind(userId).first()
  
  const targetLevel = user?.current_level || 'A1'
  
  // Mini-mock: 6 items (2 reading, 2 listening, 1 speaking, 1 writing) - 30 min
  // Full-mock: 12 items (3 reading, 3 listening, 3 speaking, 3 writing) - 60-70 min
  const itemsPerSkill = type === 'full-mock' ? 3 : 2
  
  const mockItems: Record<string, any[]> = {}
  const skills = ['reading', 'listening', 'speaking', 'writing']
  
  for (const skill of skills) {
    const limit = skill === 'speaking' || skill === 'writing' ? (type === 'full-mock' ? 3 : 1) : itemsPerSkill
    
    const items = await c.env.DB.prepare(`
      SELECT * FROM content_items
      WHERE type = ? AND level = ?
      ORDER BY RANDOM()
      LIMIT ?
    `).bind(skill, targetLevel, limit).all()
    
    mockItems[skill] = items.results
  }
  
  return c.json({ mockItems, targetLevel, type })
})

// ============================================
// Cartoon Love Story Page
// ============================================
app.get('/story', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>A Love Story in Colors</title>
      <link rel="stylesheet" href="/static/story.css">
    </head>
    <body>
      <a href="/" class="back-link">&#8592; Back Home</a>

      <!-- Floating hearts background -->
      <div class="floating-hearts" id="hearts-container"></div>

      <div class="story-header">
        <h1>A Love Story in Colors</h1>
        <p>Where two souls found each other across the world...</p>
      </div>

      <div class="story-container">

        <!-- =============================== -->
        <!-- SCENE 1: Girl Flying in Colors  -->
        <!-- =============================== -->
        <div class="scene">
          <div class="scene-number">1</div>
          <svg class="scene-svg" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sky1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea"/>
                <stop offset="30%" style="stop-color:#c084fc"/>
                <stop offset="60%" style="stop-color:#f472b6"/>
                <stop offset="100%" style="stop-color:#fbbf24"/>
              </linearGradient>
              <linearGradient id="rainbow1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ef4444"/>
                <stop offset="16%" style="stop-color:#f97316"/>
                <stop offset="32%" style="stop-color:#eab308"/>
                <stop offset="48%" style="stop-color:#22c55e"/>
                <stop offset="64%" style="stop-color:#3b82f6"/>
                <stop offset="80%" style="stop-color:#6366f1"/>
                <stop offset="100%" style="stop-color:#a855f7"/>
              </linearGradient>
              <linearGradient id="dress1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#fbbf24"/>
                <stop offset="100%" style="stop-color:#f59e0b"/>
              </linearGradient>
              <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#fde68a;stop-opacity:0.8"/>
                <stop offset="100%" style="stop-color:#fde68a;stop-opacity:0"/>
              </radialGradient>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <!-- Sky background -->
            <rect width="800" height="500" fill="url(#sky1)"/>

            <!-- Stars twinkling -->
            <circle cx="100" cy="60" r="3" fill="white" opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="250" cy="100" r="2" fill="white" opacity="0.6">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="680" cy="80" r="3" fill="white" opacity="0.7">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="550" cy="40" r="2" fill="white" opacity="0.9">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="420" cy="70" r="2.5" fill="white" opacity="0.6">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="730" cy="150" r="2" fill="white" opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3s" repeatCount="indefinite"/>
            </circle>

            <!-- Rainbow trail -->
            <path d="M 100 350 Q 200 200 350 250 Q 500 300 400 180" stroke="url(#rainbow1)" stroke-width="20" fill="none" opacity="0.6" stroke-linecap="round">
              <animate attributeName="stroke-dashoffset" from="600" to="0" dur="3s" repeatCount="indefinite"/>
            </path>
            <path d="M 120 370 Q 220 220 370 270 Q 520 320 420 200" stroke="url(#rainbow1)" stroke-width="12" fill="none" opacity="0.4" stroke-linecap="round"/>

            <!-- Color swirls around the girl -->
            <ellipse cx="400" cy="200" rx="120" ry="100" fill="url(#glow1)" opacity="0.5">
              <animate attributeName="rx" values="120;140;120" dur="3s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="100;115;100" dur="3s" repeatCount="indefinite"/>
            </ellipse>

            <!-- Sparkle particles -->
            <circle cx="320" cy="150" r="4" fill="#fbbf24" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0s"/>
              <animate attributeName="r" values="2;6;2" dur="1.5s" repeatCount="indefinite" begin="0s"/>
            </circle>
            <circle cx="480" cy="170" r="4" fill="#f472b6" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
              <animate attributeName="r" values="2;5;2" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
            </circle>
            <circle cx="360" cy="120" r="4" fill="#60a5fa" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.6s"/>
              <animate attributeName="r" values="2;7;2" dur="2s" repeatCount="indefinite" begin="0.6s"/>
            </circle>
            <circle cx="440" cy="260" r="3" fill="#34d399" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="1.3s" repeatCount="indefinite" begin="0.9s"/>
            </circle>
            <circle cx="350" cy="230" r="3" fill="#c084fc" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="1.6s" repeatCount="indefinite" begin="0.2s"/>
            </circle>

            <!-- THE GIRL - flying pose -->
            <g transform="translate(370, 180)" filter="url(#softGlow)">
              <animateTransform attributeName="transform" type="translate" values="370,180;370,165;370,180" dur="4s" repeatCount="indefinite"/>

              <!-- Hair flowing behind -->
              <path d="M -5 -35 Q -40 -20 -55 10 Q -65 30 -50 15 Q -30 -5 -5 -20" fill="#1a1a2e" opacity="0.9"/>
              <path d="M 5 -35 Q -30 -15 -45 15 Q -55 35 -40 20 Q -25 0 5 -15" fill="#2d2d44" opacity="0.8"/>
              <path d="M 10 -30 Q 35 -20 50 5 Q 55 15 40 10 Q 25 0 10 -15" fill="#1a1a2e" opacity="0.85"/>

              <!-- Head -->
              <ellipse cx="0" cy="-25" rx="22" ry="26" fill="#f5c6a0"/>

              <!-- Face features -->
              <ellipse cx="-8" cy="-28" rx="3.5" ry="4" fill="#2d2d44"/>
              <ellipse cx="8" cy="-28" rx="3.5" ry="4" fill="#2d2d44"/>
              <ellipse cx="-8" cy="-28" rx="1.5" ry="2" fill="white"/>
              <ellipse cx="8" cy="-28" rx="1.5" ry="2" fill="white"/>
              <!-- Blush -->
              <ellipse cx="-14" cy="-20" rx="6" ry="3" fill="#f9a8d4" opacity="0.5"/>
              <ellipse cx="14" cy="-20" rx="6" ry="3" fill="#f9a8d4" opacity="0.5"/>
              <!-- Smile -->
              <path d="M -8 -16 Q 0 -8 8 -16" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>
              <!-- Eyebrows -->
              <path d="M -13 -35 Q -8 -38 -4 -35" stroke="#1a1a2e" stroke-width="1.5" fill="none"/>
              <path d="M 4 -35 Q 8 -38 13 -35" stroke="#1a1a2e" stroke-width="1.5" fill="none"/>

              <!-- Earrings -->
              <circle cx="-20" cy="-20" r="3" fill="#fbbf24"/>
              <circle cx="20" cy="-20" r="3" fill="#fbbf24"/>

              <!-- Yellow/Green dress (like the photo) -->
              <path d="M -15 0 Q -25 40 -30 70 L 30 70 Q 25 40 15 0 Z" fill="url(#dress1)"/>
              <!-- Dress details -->
              <path d="M -10 10 Q 0 20 10 10" stroke="#d97706" stroke-width="1" fill="none" opacity="0.5"/>
              <path d="M -15 30 Q 0 42 15 30" stroke="#d97706" stroke-width="1" fill="none" opacity="0.5"/>

              <!-- Arms spread out (flying) -->
              <path d="M -15 10 Q -40 -10 -65 -5" stroke="#f5c6a0" stroke-width="8" fill="none" stroke-linecap="round"/>
              <path d="M 15 10 Q 40 -10 65 -5" stroke="#f5c6a0" stroke-width="8" fill="none" stroke-linecap="round"/>
              <!-- Hands -->
              <circle cx="-65" cy="-5" r="6" fill="#f5c6a0"/>
              <circle cx="65" cy="-5" r="6" fill="#f5c6a0"/>

              <!-- Legs -->
              <path d="M -10 70 Q -15 95 -20 110" stroke="#f5c6a0" stroke-width="7" fill="none" stroke-linecap="round"/>
              <path d="M 10 70 Q 15 95 25 105" stroke="#f5c6a0" stroke-width="7" fill="none" stroke-linecap="round"/>
              <!-- Shoes -->
              <ellipse cx="-22" cy="113" rx="8" ry="5" fill="#e91e63"/>
              <ellipse cx="27" cy="108" rx="8" ry="5" fill="#e91e63"/>
            </g>

            <!-- Colorful clouds -->
            <g opacity="0.5">
              <ellipse cx="120" cy="420" rx="80" ry="30" fill="#f9a8d4"/>
              <ellipse cx="160" cy="410" rx="60" ry="25" fill="#c4b5fd"/>
              <ellipse cx="650" cy="440" rx="90" ry="28" fill="#93c5fd"/>
              <ellipse cx="700" cy="430" rx="60" ry="22" fill="#a5f3fc"/>
              <ellipse cx="400" cy="460" rx="100" ry="25" fill="#fde68a"/>
            </g>

            <!-- Text bubble -->
            <g transform="translate(560, 100)">
              <rect x="-70" y="-25" width="140" height="50" rx="25" fill="white" opacity="0.9"/>
              <polygon points="0,25 -15,25 5,45" fill="white" opacity="0.9"/>
              <text x="0" y="5" text-anchor="middle" font-size="14" font-family="Comic Sans MS, cursive" fill="#7b1fa2" font-weight="bold">Free as colors!</text>
            </g>
          </svg>
          <div class="scene-caption">
            <h2>She Flew in Colors</h2>
            <p>A vibrant girl, full of life and dreams, soaring through a world painted in every shade of the rainbow. She was magic, she was free, she was everything the world needed to see.</p>
          </div>
        </div>

        <!-- =============================== -->
        <!-- SCENE 2: Boy Flirting with Girls -->
        <!-- =============================== -->
        <div class="scene">
          <div class="scene-number">2</div>
          <svg class="scene-svg" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sky2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#1e1b4b"/>
                <stop offset="50%" style="stop-color:#312e81"/>
                <stop offset="100%" style="stop-color:#4c1d95"/>
              </linearGradient>
              <linearGradient id="plaid1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#dc2626"/>
                <stop offset="50%" style="stop-color:#b91c1c"/>
                <stop offset="100%" style="stop-color:#991b1b"/>
              </linearGradient>
            </defs>

            <!-- Night scene / party background -->
            <rect width="800" height="500" fill="url(#sky2)"/>

            <!-- Disco / city lights -->
            <circle cx="150" cy="50" r="40" fill="#fbbf24" opacity="0.15">
              <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="650" cy="80" r="35" fill="#ec4899" opacity="0.15">
              <animate attributeName="opacity" values="0.15;0.3;0.15" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="400" cy="40" r="45" fill="#8b5cf6" opacity="0.12">
              <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2.5s" repeatCount="indefinite"/>
            </circle>

            <!-- Floor -->
            <rect x="0" y="380" width="800" height="120" fill="#1e1b4b" opacity="0.8"/>
            <line x1="0" y1="380" x2="800" y2="380" stroke="#6366f1" stroke-width="2" opacity="0.3"/>

            <!-- Background girl 1 (left) -->
            <g transform="translate(180, 240)">
              <!-- Hair -->
              <path d="M -5 -30 Q -25 -35 -20 0 Q -18 15 -10 10" fill="#92400e"/>
              <path d="M 5 -30 Q 25 -35 20 0 Q 18 15 10 10" fill="#92400e"/>
              <!-- Head -->
              <ellipse cx="0" cy="-20" rx="18" ry="22" fill="#deb887"/>
              <!-- Eyes -->
              <ellipse cx="-6" cy="-22" rx="3" ry="3.5" fill="#2d2d44"/>
              <ellipse cx="6" cy="-22" rx="3" ry="3.5" fill="#2d2d44"/>
              <circle cx="-5" cy="-22.5" r="1.2" fill="white"/>
              <circle cx="7" cy="-22.5" r="1.2" fill="white"/>
              <!-- Eyelashes -->
              <path d="M -10 -25 L -12 -28" stroke="#2d2d44" stroke-width="1"/>
              <path d="M 10 -25 L 12 -28" stroke="#2d2d44" stroke-width="1"/>
              <!-- Smile -->
              <path d="M -5 -14 Q 0 -9 5 -14" stroke="#c2410c" stroke-width="1.5" fill="none"/>
              <!-- Blush -->
              <ellipse cx="-12" cy="-16" rx="5" ry="3" fill="#f9a8d4" opacity="0.4"/>
              <ellipse cx="12" cy="-16" rx="5" ry="3" fill="#f9a8d4" opacity="0.4"/>
              <!-- Dress -->
              <path d="M -12 5 Q -20 50 -25 90 L 25 90 Q 20 50 12 5 Z" fill="#ec4899"/>
              <!-- Arms -->
              <path d="M -12 15 Q -25 25 -20 35" stroke="#deb887" stroke-width="6" fill="none" stroke-linecap="round"/>
              <path d="M 12 15 Q 25 25 20 35" stroke="#deb887" stroke-width="6" fill="none" stroke-linecap="round"/>
              <!-- Legs -->
              <line x1="-8" y1="90" x2="-10" y2="130" stroke="#deb887" stroke-width="6" stroke-linecap="round"/>
              <line x1="8" y1="90" x2="10" y2="130" stroke="#deb887" stroke-width="6" stroke-linecap="round"/>
              <!-- Heart emoji floating -->
              <text x="25" y="-35" font-size="18" opacity="0.7">&#x1F495;</text>
            </g>

            <!-- THE BOY (center, with plaid shirt like photo) -->
            <g transform="translate(400, 230)">
              <!-- Hair (short, styled) -->
              <path d="M -18 -45 Q -5 -55 18 -45 Q 22 -40 20 -35 L -20 -35 Q -22 -40 -18 -45" fill="#1a1a2e"/>
              <!-- Head -->
              <ellipse cx="0" cy="-22" rx="20" ry="24" fill="#d4a574"/>
              <!-- Beard stubble -->
              <ellipse cx="0" cy="-5" rx="14" ry="8" fill="#c4956a" opacity="0.3"/>
              <!-- Eyes (confident look) -->
              <ellipse cx="-7" cy="-25" rx="3.5" ry="3" fill="#2d2d44"/>
              <ellipse cx="7" cy="-25" rx="3.5" ry="3" fill="#2d2d44"/>
              <circle cx="-6" cy="-25.5" r="1.3" fill="white"/>
              <circle cx="8" cy="-25.5" r="1.3" fill="white"/>
              <!-- Eyebrows (raised, confident) -->
              <path d="M -12 -32 Q -7 -36 -3 -32" stroke="#1a1a2e" stroke-width="2" fill="none"/>
              <path d="M 3 -32 Q 7 -36 12 -32" stroke="#1a1a2e" stroke-width="2" fill="none"/>
              <!-- Smirk -->
              <path d="M -6 -12 Q 2 -5 10 -10" stroke="#8b4513" stroke-width="2" fill="none" stroke-linecap="round"/>
              <!-- Plaid Shirt (red like in photo) -->
              <path d="M -18 5 Q -22 50 -25 100 L 25 100 Q 22 50 18 5 Z" fill="url(#plaid1)"/>
              <!-- Plaid pattern lines -->
              <line x1="-18" y1="20" x2="18" y2="20" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <line x1="-20" y1="40" x2="20" y2="40" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <line x1="-22" y1="60" x2="22" y2="60" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <line x1="-10" y1="5" x2="-14" y2="100" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <line x1="10" y1="5" x2="14" y2="100" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <!-- Arms out (gesturing) -->
              <path d="M -18 15 Q -45 10 -60 25" stroke="#d4a574" stroke-width="7" fill="none" stroke-linecap="round"/>
              <path d="M 18 15 Q 45 10 60 25" stroke="#d4a574" stroke-width="7" fill="none" stroke-linecap="round"/>
              <!-- Hands -->
              <circle cx="-60" cy="25" r="6" fill="#d4a574"/>
              <circle cx="60" cy="25" r="6" fill="#d4a574"/>
              <!-- Jeans -->
              <path d="M -14 100 L -16 150" stroke="#1e40af" stroke-width="12" stroke-linecap="round"/>
              <path d="M 14 100 L 16 150" stroke="#1e40af" stroke-width="12" stroke-linecap="round"/>
              <!-- Sunglasses on head -->
              <path d="M -16 -42 Q 0 -46 16 -42" stroke="#1a1a2e" stroke-width="2" fill="none"/>
              <rect x="-18" y="-44" width="14" height="8" rx="4" fill="#1a1a2e" opacity="0.6"/>
              <rect x="4" y="-44" width="14" height="8" rx="4" fill="#1a1a2e" opacity="0.6"/>
            </g>

            <!-- Background girl 2 (right) -->
            <g transform="translate(600, 245)">
              <!-- Hair (long, blonde) -->
              <path d="M -5 -30 Q -20 -35 -22 10 Q -20 25 -12 15" fill="#fbbf24"/>
              <path d="M 5 -30 Q 20 -35 22 10 Q 20 25 12 15" fill="#fbbf24"/>
              <!-- Head -->
              <ellipse cx="0" cy="-18" rx="17" ry="21" fill="#fde8d0"/>
              <!-- Eyes -->
              <ellipse cx="-6" cy="-20" rx="3" ry="3.5" fill="#2d2d44"/>
              <ellipse cx="6" cy="-20" rx="3" ry="3.5" fill="#2d2d44"/>
              <circle cx="-5" cy="-20.5" r="1.2" fill="white"/>
              <circle cx="7" cy="-20.5" r="1.2" fill="white"/>
              <!-- Smile -->
              <path d="M -5 -12 Q 0 -7 5 -12" stroke="#c2410c" stroke-width="1.5" fill="none"/>
              <!-- Blush -->
              <ellipse cx="-11" cy="-14" rx="5" ry="3" fill="#f9a8d4" opacity="0.4"/>
              <ellipse cx="11" cy="-14" rx="5" ry="3" fill="#f9a8d4" opacity="0.4"/>
              <!-- Dress -->
              <path d="M -11 5 Q -18 45 -22 85 L 22 85 Q 18 45 11 5 Z" fill="#8b5cf6"/>
              <!-- Arms -->
              <path d="M -11 12 Q -25 5 -30 15" stroke="#fde8d0" stroke-width="6" fill="none" stroke-linecap="round"/>
              <path d="M 11 12 Q 22 8 28 18" stroke="#fde8d0" stroke-width="6" fill="none" stroke-linecap="round"/>
              <!-- Legs -->
              <line x1="-7" y1="85" x2="-9" y2="125" stroke="#fde8d0" stroke-width="6" stroke-linecap="round"/>
              <line x1="7" y1="85" x2="9" y2="125" stroke="#fde8d0" stroke-width="6" stroke-linecap="round"/>
              <!-- Heart -->
              <text x="-35" y="-30" font-size="16" opacity="0.7">&#x1F496;</text>
            </g>

            <!-- Chat bubbles / phone notification emojis -->
            <g opacity="0.6">
              <text x="300" y="180" font-size="20">&#x1F4AC;</text>
              <text x="480" y="175" font-size="18">&#x1F4AC;</text>
              <text x="350" y="150" font-size="14">&#x1F60E;</text>
            </g>

            <!-- "Mr. Popular" text -->
            <g transform="translate(400, 440)">
              <rect x="-80" y="-20" width="160" height="36" rx="18" fill="rgba(255,255,255,0.15)"/>
              <text x="0" y="2" text-anchor="middle" font-size="16" font-family="Comic Sans MS, cursive" fill="white" font-weight="bold">Mr. Popular &#x1F60E;</text>
            </g>
          </svg>
          <div class="scene-caption">
            <h2>Meanwhile, He Was Busy...</h2>
            <p>The boy? Oh, he was a charmer alright. Surrounded by attention, living the social life, not knowing that destiny had someone special waiting for him. He was Mr. Popular... but his heart was still empty.</p>
          </div>
        </div>

        <!-- =============================== -->
        <!-- SCENE 3: Girl Enters His Life   -->
        <!-- =============================== -->
        <div class="scene">
          <div class="scene-number">3</div>
          <svg class="scene-svg" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sky3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#fce4ec"/>
                <stop offset="50%" style="stop-color:#f8bbd0"/>
                <stop offset="100%" style="stop-color:#f48fb1"/>
              </linearGradient>
              <radialGradient id="heartGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#ff1744;stop-opacity:0.3"/>
                <stop offset="100%" style="stop-color:#ff1744;stop-opacity:0"/>
              </radialGradient>
              <filter id="glow3">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <!-- Warm, romantic background -->
            <rect width="800" height="500" fill="url(#sky3)"/>

            <!-- Soft bokeh circles -->
            <circle cx="100" cy="80" r="30" fill="#e91e63" opacity="0.08"/>
            <circle cx="700" cy="120" r="40" fill="#e91e63" opacity="0.06"/>
            <circle cx="300" cy="50" r="25" fill="#f48fb1" opacity="0.1"/>
            <circle cx="600" cy="60" r="35" fill="#f48fb1" opacity="0.07"/>
            <circle cx="500" cy="100" r="20" fill="#fce4ec" opacity="0.15"/>

            <!-- Ground / park setting -->
            <ellipse cx="400" cy="450" rx="500" ry="80" fill="#81c784" opacity="0.3"/>
            <ellipse cx="400" cy="470" rx="450" ry="60" fill="#66bb6a" opacity="0.2"/>

            <!-- Heart glow between them -->
            <circle cx="400" cy="230" r="100" fill="url(#heartGlow)">
              <animate attributeName="r" values="80;110;80" dur="3s" repeatCount="indefinite"/>
            </circle>

            <!-- Floating hearts -->
            <text x="350" y="120" font-size="24" opacity="0.3">&#x2764;&#xFE0F;</text>
            <text x="440" y="100" font-size="18" opacity="0.25">&#x2764;&#xFE0F;</text>
            <text x="380" y="80" font-size="20" opacity="0.2">&#x1F49D;</text>
            <text x="300" y="150" font-size="14" opacity="0.35">&#x1F495;</text>
            <text x="480" y="140" font-size="16" opacity="0.3">&#x1F496;</text>

            <!-- THE GIRL (left side, entering) -->
            <g transform="translate(280, 220)">
              <!-- Hair -->
              <path d="M -5 -30 Q -25 -30 -20 5 Q -18 20 -8 12" fill="#1a1a2e"/>
              <path d="M 5 -30 Q 20 -28 18 5 Q 16 18 8 12" fill="#1a1a2e"/>
              <!-- Head -->
              <ellipse cx="0" cy="-20" rx="20" ry="24" fill="#f5c6a0"/>
              <!-- Eyes (looking right, shy) -->
              <ellipse cx="-5" cy="-22" rx="3.5" ry="4" fill="#2d2d44"/>
              <ellipse cx="8" cy="-22" rx="3.5" ry="4" fill="#2d2d44"/>
              <circle cx="-3.5" cy="-22.5" r="1.5" fill="white"/>
              <circle cx="9.5" cy="-22.5" r="1.5" fill="white"/>
              <!-- Blush (shy) -->
              <ellipse cx="-14" cy="-15" rx="7" ry="4" fill="#f9a8d4" opacity="0.6"/>
              <ellipse cx="14" cy="-15" rx="7" ry="4" fill="#f9a8d4" opacity="0.6"/>
              <!-- Shy smile -->
              <path d="M -5 -10 Q 0 -5 5 -10" stroke="#c2410c" stroke-width="1.5" fill="none"/>
              <!-- Earrings -->
              <circle cx="-18" cy="-16" r="3" fill="#fbbf24"/>
              <circle cx="18" cy="-16" r="3" fill="#fbbf24"/>
              <!-- Yellow dress -->
              <path d="M -14 5 Q -22 50 -28 100 L 28 100 Q 22 50 14 5 Z" fill="#fbbf24"/>
              <path d="M -14 5 Q -22 50 -28 100 L 28 100 Q 22 50 14 5 Z" fill="#f59e0b" opacity="0.3"/>
              <!-- Left arm (holding dupatta/scarf) -->
              <path d="M -14 15 Q -28 20 -30 35" stroke="#f5c6a0" stroke-width="7" fill="none" stroke-linecap="round"/>
              <!-- Right arm (waving slightly) -->
              <path d="M 14 15 Q 30 10 38 20" stroke="#f5c6a0" stroke-width="7" fill="none" stroke-linecap="round"/>
              <circle cx="38" cy="20" r="5" fill="#f5c6a0"/>
              <!-- Legs -->
              <line x1="-8" y1="100" x2="-10" y2="145" stroke="#f5c6a0" stroke-width="7" stroke-linecap="round"/>
              <line x1="8" y1="100" x2="10" y2="145" stroke="#f5c6a0" stroke-width="7" stroke-linecap="round"/>
              <!-- Shoes -->
              <ellipse cx="-12" cy="148" rx="9" ry="5" fill="#e91e63"/>
              <ellipse cx="12" cy="148" rx="9" ry="5" fill="#e91e63"/>
              <!-- Colorful scarf/dupatta flowing -->
              <path d="M -14 5 Q -40 -10 -55 10 Q -60 25 -45 30 Q -30 20 -14 15" fill="#c084fc" opacity="0.7"/>
            </g>

            <!-- THE BOY (right side, stunned) -->
            <g transform="translate(520, 218)">
              <!-- Hair -->
              <path d="M -18 -43 Q -5 -52 18 -43 Q 22 -38 20 -33 L -20 -33 Q -22 -38 -18 -43" fill="#1a1a2e"/>
              <!-- Head -->
              <ellipse cx="0" cy="-20" rx="20" ry="24" fill="#d4a574"/>
              <!-- Eyes WIDE (surprised/smitten) -->
              <ellipse cx="-7" cy="-23" rx="5" ry="5.5" fill="white"/>
              <ellipse cx="7" cy="-23" rx="5" ry="5.5" fill="white"/>
              <ellipse cx="-7" cy="-23" rx="3" ry="3.5" fill="#2d2d44"/>
              <ellipse cx="7" cy="-23" rx="3" ry="3.5" fill="#2d2d44"/>
              <circle cx="-6" cy="-24" r="1.2" fill="white"/>
              <circle cx="8" cy="-24" r="1.2" fill="white"/>
              <!-- Raised eyebrows (surprise) -->
              <path d="M -13 -33 Q -7 -38 -2 -33" stroke="#1a1a2e" stroke-width="2" fill="none"/>
              <path d="M 2 -33 Q 7 -38 13 -33" stroke="#1a1a2e" stroke-width="2" fill="none"/>
              <!-- Open mouth (wow) -->
              <ellipse cx="0" cy="-10" rx="6" ry="5" fill="#8b4513" opacity="0.6"/>
              <!-- Blush -->
              <ellipse cx="-14" cy="-15" rx="6" ry="3" fill="#f9a8d4" opacity="0.5"/>
              <ellipse cx="14" cy="-15" rx="6" ry="3" fill="#f9a8d4" opacity="0.5"/>
              <!-- Plaid Shirt -->
              <path d="M -18 5 Q -22 50 -25 100 L 25 100 Q 22 50 18 5 Z" fill="#dc2626"/>
              <line x1="-18" y1="20" x2="18" y2="20" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <line x1="-20" y1="40" x2="20" y2="40" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <line x1="-22" y1="60" x2="22" y2="60" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <line x1="-10" y1="5" x2="-14" y2="100" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <line x1="10" y1="5" x2="14" y2="100" stroke="#450a0a" stroke-width="1" opacity="0.3"/>
              <!-- Arms (one hand on heart) -->
              <path d="M -18 15 Q -30 25 -22 35" stroke="#d4a574" stroke-width="7" fill="none" stroke-linecap="round"/>
              <path d="M 18 15 Q 10 30 5 25" stroke="#d4a574" stroke-width="7" fill="none" stroke-linecap="round"/>
              <circle cx="5" cy="25" r="5" fill="#d4a574"/>
              <!-- Jeans -->
              <path d="M -14 100 L -16 150" stroke="#1e40af" stroke-width="12" stroke-linecap="round"/>
              <path d="M 14 100 L 16 150" stroke="#1e40af" stroke-width="12" stroke-linecap="round"/>
            </g>

            <!-- Thought bubble from boy: heart eyes -->
            <g transform="translate(580, 120)">
              <ellipse cx="0" cy="0" rx="35" ry="25" fill="white" opacity="0.9"/>
              <circle cx="-15" cy="30" r="8" fill="white" opacity="0.9"/>
              <circle cx="-8" cy="42" r="5" fill="white" opacity="0.9"/>
              <text x="0" y="8" text-anchor="middle" font-size="28">&#x1F60D;</text>
            </g>

            <!-- Sparkle where their eyes meet -->
            <g transform="translate(400, 230)" filter="url(#glow3)">
              <polygon points="0,-15 4,-4 15,-4 6,3 9,15 0,8 -9,15 -6,3 -15,-4 -4,-4" fill="#fbbf24" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/>
                <animateTransform attributeName="transform" type="rotate" values="0;180;360" dur="4s" repeatCount="indefinite"/>
              </polygon>
            </g>
          </svg>
          <div class="scene-caption">
            <h2>Then She Walked Into His World</h2>
            <p>And just like that... everything changed. The moment their eyes met, the whole world stopped spinning. She walked in like a dream he never knew he had. His heart skipped beats it didn't know it could skip.</p>
          </div>
        </div>

        <!-- =============================== -->
        <!-- SCENE 4: Long Distance / Phone  -->
        <!-- =============================== -->
        <div class="scene">
          <div class="scene-number">4</div>
          <svg class="scene-svg" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="nightSky" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#0f0c29"/>
                <stop offset="50%" style="stop-color:#302b63"/>
                <stop offset="100%" style="stop-color:#24243e"/>
              </linearGradient>
              <linearGradient id="phoneGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#60a5fa"/>
                <stop offset="100%" style="stop-color:#3b82f6"/>
              </linearGradient>
              <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#fef9c3"/>
                <stop offset="60%" style="stop-color:#fef08a;stop-opacity:0.3"/>
                <stop offset="100%" style="stop-color:#fef08a;stop-opacity:0"/>
              </radialGradient>
            </defs>

            <!-- Night sky -->
            <rect width="800" height="500" fill="url(#nightSky)"/>

            <!-- Moon -->
            <circle cx="400" cy="60" r="50" fill="url(#moonGlow)"/>
            <circle cx="400" cy="60" r="30" fill="#fef9c3"/>
            <circle cx="390" cy="50" r="8" fill="#fde68a" opacity="0.5"/>
            <circle cx="410" cy="65" r="5" fill="#fde68a" opacity="0.4"/>

            <!-- Stars -->
            <circle cx="80" cy="50" r="2" fill="white" opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="200" cy="100" r="1.5" fill="white" opacity="0.6">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="650" cy="40" r="2" fill="white" opacity="0.7">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="720" cy="100" r="1.5" fill="white" opacity="0.9">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="550" cy="30" r="1" fill="white" opacity="0.6"/>
            <circle cx="300" cy="25" r="1.5" fill="white" opacity="0.7"/>
            <circle cx="150" cy="140" r="1" fill="white" opacity="0.5"/>
            <circle cx="500" cy="80" r="1.5" fill="white" opacity="0.8"/>

            <!-- Divider - shows distance -->
            <line x1="400" y1="130" x2="400" y2="500" stroke="white" stroke-width="1" stroke-dasharray="8,8" opacity="0.15"/>

            <!-- LEFT SIDE: Girl at window -->
            <g transform="translate(0,0)">
              <!-- Window frame -->
              <rect x="80" y="200" width="220" height="250" rx="12" fill="#1e3a5f" opacity="0.8"/>
              <rect x="90" y="210" width="200" height="230" rx="8" fill="#1e293b"/>
              <!-- Window glow from phone -->
              <rect x="90" y="210" width="200" height="230" rx="8" fill="#60a5fa" opacity="0.05"/>
              <!-- Curtain -->
              <path d="M 90 210 Q 120 220 90 280" fill="#c084fc" opacity="0.4"/>
              <path d="M 290 210 Q 260 220 290 280" fill="#c084fc" opacity="0.4"/>

              <!-- Girl sitting -->
              <g transform="translate(190, 310)">
                <!-- Hair (loose, nighttime) -->
                <path d="M -5 -28 Q -28 -25 -25 10 Q -22 30 -12 20" fill="#1a1a2e"/>
                <path d="M 5 -28 Q 22 -25 20 10 Q 18 25 10 18" fill="#1a1a2e"/>
                <!-- Head -->
                <ellipse cx="0" cy="-18" rx="18" ry="22" fill="#f5c6a0"/>
                <!-- Eyes (looking at phone, happy) -->
                <path d="M -9 -20 Q -6 -16 -3 -20" stroke="#2d2d44" stroke-width="2" fill="none"/>
                <path d="M 3 -20 Q 6 -16 9 -20" stroke="#2d2d44" stroke-width="2" fill="none"/>
                <!-- Happy smile -->
                <path d="M -7 -10 Q 0 -3 7 -10" stroke="#c2410c" stroke-width="2" fill="none"/>
                <!-- Blush -->
                <ellipse cx="-12" cy="-13" rx="5" ry="3" fill="#f9a8d4" opacity="0.6"/>
                <ellipse cx="12" cy="-13" rx="5" ry="3" fill="#f9a8d4" opacity="0.6"/>
                <!-- PJs / comfortable top -->
                <path d="M -12 5 Q -16 30 -18 60 L 18 60 Q 16 30 12 5 Z" fill="#e879f9"/>
                <!-- Arms holding phone -->
                <path d="M -12 12 Q -8 30 0 35" stroke="#f5c6a0" stroke-width="6" fill="none" stroke-linecap="round"/>
                <path d="M 12 12 Q 8 30 0 35" stroke="#f5c6a0" stroke-width="6" fill="none" stroke-linecap="round"/>
                <!-- Phone in hands -->
                <rect x="-10" y="28" width="20" height="32" rx="4" fill="#1e293b" stroke="#60a5fa" stroke-width="1"/>
                <rect x="-7" y="31" width="14" height="22" rx="2" fill="url(#phoneGlow)" opacity="0.8"/>
                <!-- Phone glow on face -->
                <ellipse cx="0" cy="0" rx="25" ry="30" fill="#60a5fa" opacity="0.05"/>
                <!-- His photo on phone screen -->
                <circle cx="0" cy="40" r="5" fill="#d4a574"/>
                <text x="0" y="50" text-anchor="middle" font-size="5" fill="white">&#x2764;</text>
              </g>

              <!-- City skyline behind her -->
              <rect x="70" y="430" width="30" height="70" fill="#1e293b" opacity="0.5"/>
              <rect x="105" y="410" width="25" height="90" fill="#1e293b" opacity="0.4"/>
              <rect x="60" y="445" width="20" height="55" fill="#1e293b" opacity="0.3"/>
              <!-- City lights -->
              <rect x="75" y="440" r="1" width="4" height="4" fill="#fbbf24" opacity="0.6"/>
              <rect x="112" y="425" r="1" width="4" height="4" fill="#fbbf24" opacity="0.5"/>
            </g>

            <!-- RIGHT SIDE: Boy at window -->
            <g transform="translate(0,0)">
              <!-- Window frame -->
              <rect x="500" y="200" width="220" height="250" rx="12" fill="#1e3a5f" opacity="0.8"/>
              <rect x="510" y="210" width="200" height="230" rx="8" fill="#1e293b"/>
              <rect x="510" y="210" width="200" height="230" rx="8" fill="#60a5fa" opacity="0.05"/>
              <!-- Curtain -->
              <path d="M 510 210 Q 540 220 510 280" fill="#6366f1" opacity="0.3"/>
              <path d="M 710 210 Q 680 220 710 280" fill="#6366f1" opacity="0.3"/>

              <!-- Boy sitting -->
              <g transform="translate(610, 310)">
                <!-- Hair -->
                <path d="M -16 -40 Q -5 -48 16 -40 Q 20 -35 18 -30 L -18 -30 Q -20 -35 -16 -40" fill="#1a1a2e"/>
                <!-- Head -->
                <ellipse cx="0" cy="-18" rx="18" ry="22" fill="#d4a574"/>
                <!-- Eyes (looking at phone, happy) -->
                <path d="M -9 -20 Q -6 -16 -3 -20" stroke="#2d2d44" stroke-width="2" fill="none"/>
                <path d="M 3 -20 Q 6 -16 9 -20" stroke="#2d2d44" stroke-width="2" fill="none"/>
                <!-- Happy grin -->
                <path d="M -8 -9 Q 0 -1 8 -9" stroke="#8b4513" stroke-width="2" fill="none"/>
                <!-- Blush -->
                <ellipse cx="-12" cy="-12" rx="5" ry="3" fill="#f9a8d4" opacity="0.4"/>
                <ellipse cx="12" cy="-12" rx="5" ry="3" fill="#f9a8d4" opacity="0.4"/>
                <!-- T-shirt (casual) -->
                <path d="M -14 5 Q -18 30 -20 60 L 20 60 Q 18 30 14 5 Z" fill="#6366f1"/>
                <!-- Arms holding phone -->
                <path d="M -14 12 Q -8 30 0 35" stroke="#d4a574" stroke-width="6" fill="none" stroke-linecap="round"/>
                <path d="M 14 12 Q 8 30 0 35" stroke="#d4a574" stroke-width="6" fill="none" stroke-linecap="round"/>
                <!-- Phone -->
                <rect x="-10" y="28" width="20" height="32" rx="4" fill="#1e293b" stroke="#60a5fa" stroke-width="1"/>
                <rect x="-7" y="31" width="14" height="22" rx="2" fill="url(#phoneGlow)" opacity="0.8"/>
                <!-- Phone glow -->
                <ellipse cx="0" cy="0" rx="25" ry="30" fill="#60a5fa" opacity="0.05"/>
                <!-- Her photo on phone screen -->
                <circle cx="0" cy="40" r="5" fill="#f5c6a0"/>
                <text x="0" y="50" text-anchor="middle" font-size="5" fill="white">&#x2764;</text>
              </g>

              <!-- Mountain skyline behind him -->
              <path d="M 490 460 L 530 420 L 560 450 L 590 400 L 630 440 L 670 410 L 720 460 Z" fill="#1e293b" opacity="0.4"/>
            </g>

            <!-- CONNECTION: Signal waves between phones -->
            <g opacity="0.4">
              <path d="M 200 360 Q 300 300 400 280 Q 500 300 600 360" stroke="#f472b6" stroke-width="2" fill="none" stroke-dasharray="6,4">
                <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite"/>
              </path>
              <path d="M 210 370 Q 310 290 400 265 Q 490 290 590 370" stroke="#c084fc" stroke-width="1.5" fill="none" stroke-dasharray="4,6">
                <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1.2s" repeatCount="indefinite"/>
              </path>
            </g>

            <!-- Hearts traveling between them -->
            <text font-size="16" fill="#e91e63">
              <textPath>&#x2764;&#xFE0F;</textPath>
              <animateMotion dur="4s" repeatCount="indefinite" path="M 200,350 Q 400,200 600,350"/>
            </text>
            <text font-size="14" fill="#f472b6">
              <textPath>&#x1F49C;</textPath>
              <animateMotion dur="4s" repeatCount="indefinite" begin="2s" path="M 600,350 Q 400,200 200,350"/>
            </text>

            <!-- "Miles apart, hearts together" -->
            <g transform="translate(400, 170)">
              <rect x="-120" y="-18" width="240" height="36" rx="18" fill="rgba(255,255,255,0.1)"/>
              <text x="0" y="5" text-anchor="middle" font-size="14" font-family="Comic Sans MS, cursive" fill="white" font-weight="bold">Miles apart, hearts together &#x1F49E;</text>
            </g>

            <!-- Chat bubbles -->
            <g transform="translate(240, 240)">
              <rect x="-45" y="-14" width="90" height="24" rx="12" fill="white" opacity="0.15"/>
              <text x="0" y="2" text-anchor="middle" font-size="10" fill="white">Good night &#x1F31C;</text>
            </g>
            <g transform="translate(560, 240)">
              <rect x="-55" y="-14" width="110" height="24" rx="12" fill="white" opacity="0.15"/>
              <text x="0" y="2" text-anchor="middle" font-size="10" fill="white">Miss you so much &#x2764;</text>
            </g>
          </svg>
          <div class="scene-caption">
            <h2>Connected Across the Miles</h2>
            <p>Different cities, different time zones, but the same heartbeat. Every night, under the same moon, they'd talk for hours. The phone became their bridge, their lifeline, their love letter written in real time.</p>
          </div>
        </div>

      </div>

      <!-- To Be Continued -->
      <div class="to-be-continued">
        <h2>To Be Continued...</h2>
        <p>The best love stories are the ones still being written &#x2764;&#xFE0F;</p>
      </div>

      <script>
        // Create floating hearts in background
        const container = document.getElementById('hearts-container');
        const heartEmojis = ['&#x2764;', '&#x1F495;', '&#x1F496;', '&#x1F49C;', '&#x1F49B;', '&#x2728;'];

        function createHeart() {
          const heart = document.createElement('div');
          heart.className = 'heart';
          heart.innerHTML = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
          heart.style.left = Math.random() * 100 + '%';
          heart.style.animationDuration = (4 + Math.random() * 4) + 's';
          heart.style.animationDelay = Math.random() * 3 + 's';
          heart.style.fontSize = (12 + Math.random() * 16) + 'px';
          container.appendChild(heart);

          setTimeout(() => heart.remove(), 10000);
        }

        // Create hearts periodically
        setInterval(createHeart, 800);
        // Initial batch
        for (let i = 0; i < 8; i++) {
          setTimeout(createHeart, i * 200);
        }
      </script>
    </body>
    </html>
  `)
})

// ============================================
// Main HTML Page
// ============================================
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Schweizer Deutsch Coach - A0 to B1 in 30 Minutes a Day</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .card { background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .btn-primary { background: #667eea; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; transition: all 0.3s; }
          .btn-primary:hover { background: #5568d3; transform: translateY(-2px); }
          .skill-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 4px; }
          .level-a0 { background: #fef3c7; color: #92400e; }
          .level-a1 { background: #dbeafe; color: #1e40af; }
          .level-a2 { background: #dcfce7; color: #166534; }
          .level-b1 { background: #e9d5ff; color: #6b21a8; }
          .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s; }
          .hidden { display: none; }
          .session-timer { position: fixed; top: 20px; right: 20px; background: white; padding: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; }
          .speaking-recorder { border: 2px dashed #667eea; border-radius: 12px; padding: 24px; text-align: center; margin: 16px 0; }
          .recording-active { background: #fef3c7; border-color: #f59e0b; animation: pulse 2s infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
          .feedback-correct { background: #dcfce7; border-left: 4px solid #16a34a; padding: 12px; margin: 8px 0; border-radius: 8px; }
          .feedback-incorrect { background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 8px 0; border-radius: 8px; }
          .vocab-card { background: white; padding: 16px; border-radius: 8px; margin: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.3s; }
          .vocab-card:hover { transform: scale(1.05); }
          .vocab-card.flipped .front { display: none; }
          .vocab-card.flipped .back { display: block; }
          .vocab-card .back { display: none; }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Navigation -->
        <nav class="gradient-bg text-white p-4 shadow-lg">
            <div class="container mx-auto flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-graduation-cap text-2xl"></i>
                    <h1 class="text-xl font-bold">Schweizer Deutsch Coach</h1>
                </div>
                <div id="nav-links" class="hidden space-x-4">
                    <a href="#" onclick="showPage('dashboard')" class="hover:underline">Dashboard</a>
                    <a href="#" onclick="showPage('session')" class="hover:underline">Daily Session</a>
                    <a href="#" onclick="showPage('progress')" class="hover:underline">Progress</a>
                    <a href="#" onclick="logout()" class="hover:underline">Logout</a>
                </div>
            </div>
        </nav>

        <div class="container mx-auto px-4 py-8 max-w-6xl">
            <!-- Welcome / Onboarding Screen -->
            <div id="welcome-screen">
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-flag text-red-600"></i> Master Swiss German
                    </h1>
                    <p class="text-xl text-gray-600 mb-2">A0 → B1 in just 30 minutes per day</p>
                    <p class="text-gray-500">Adaptive learning • Test strategies • Real Swiss contexts</p>
                </div>

                <div class="card p-8 max-w-md mx-auto">
                    <h2 class="text-2xl font-bold mb-6 text-center">Get Started</h2>
                    <form id="onboarding-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold mb-2">Your Name</label>
                            <input type="text" id="user-name" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="Enter your name" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Email (optional)</label>
                            <input type="email" id="user-email" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="your@email.com">
                        </div>
                        <button type="submit" class="btn-primary w-full">
                            Start Diagnostic Test (15 min) <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    </form>
                </div>

                <div class="grid md:grid-cols-3 gap-6 mt-12">
                    <div class="card p-6 text-center">
                        <i class="fas fa-brain text-4xl text-purple-600 mb-4"></i>
                        <h3 class="font-bold text-lg mb-2">Adaptive Learning</h3>
                        <p class="text-gray-600 text-sm">AI-powered system focuses on your weak areas</p>
                    </div>
                    <div class="card p-6 text-center">
                        <i class="fas fa-clipboard-check text-4xl text-blue-600 mb-4"></i>
                        <h3 class="font-bold text-lg mb-2">Test Strategies</h3>
                        <p class="text-gray-600 text-sm">Learn proven tactics for fide/SDC exams</p>
                    </div>
                    <div class="card p-6 text-center">
                        <i class="fas fa-mountain text-4xl text-red-600 mb-4"></i>
                        <h3 class="font-bold text-lg mb-2">Swiss Contexts</h3>
                        <p class="text-gray-600 text-sm">Real scenarios: housing, doctors, Gemeinde, work</p>
                    </div>
                </div>

                <div class="text-center mt-8">
                    <a href="/story" class="inline-block px-8 py-4 rounded-xl text-white font-bold text-lg" style="background: linear-gradient(135deg, #e91e63, #9c27b0); box-shadow: 0 4px 15px rgba(233,30,99,0.4); transition: all 0.3s;">
                        <i class="fas fa-heart mr-2"></i> View Our Love Story
                    </a>
                </div>
            </div>

            <!-- Diagnostic Test Screen -->
            <div id="diagnostic-screen" class="hidden">
                <div class="card p-8">
                    <div class="mb-8">
                        <h2 class="text-2xl font-bold mb-2">
                            <i class="fas fa-stethoscope"></i> Placement Test
                        </h2>
                        <p class="text-gray-600">This 15-minute test will determine your starting level (A0-B1)</p>
                        <div class="progress-bar mt-4">
                            <div id="diagnostic-progress" class="progress-fill" style="width: 0%"></div>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">
                            Question <span id="diagnostic-current">1</span> of <span id="diagnostic-total">16</span>
                        </p>
                    </div>

                    <div id="diagnostic-item-container"></div>

                    <div class="mt-6 flex justify-between">
                        <button onclick="previousDiagnosticItem()" id="prev-diagnostic-btn" class="px-6 py-3 bg-gray-300 rounded-lg font-semibold" disabled>
                            <i class="fas fa-arrow-left"></i> Previous
                        </button>
                        <button onclick="nextDiagnosticItem()" id="next-diagnostic-btn" class="btn-primary">
                            Next <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Dashboard Screen -->
            <div id="dashboard-screen" class="hidden">
                <div class="grid md:grid-cols-3 gap-6 mb-8">
                    <div class="card p-6">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-gray-500 text-sm font-semibold">Current Level</h3>
                                <p class="text-3xl font-bold text-purple-600" id="user-level">A0</p>
                            </div>
                            <i class="fas fa-trophy text-4xl text-yellow-500"></i>
                        </div>
                        <p class="text-sm text-gray-600">Target: <span class="font-semibold">B1</span></p>
                    </div>

                    <div class="card p-6">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-gray-500 text-sm font-semibold">Streak</h3>
                                <p class="text-3xl font-bold text-orange-600" id="user-streak">0</p>
                            </div>
                            <i class="fas fa-fire text-4xl text-orange-500"></i>
                        </div>
                        <p class="text-sm text-gray-600">Keep it going!</p>
                    </div>

                    <div class="card p-6">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-gray-500 text-sm font-semibold">Total Time</h3>
                                <p class="text-3xl font-bold text-blue-600" id="user-time">0</p>
                            </div>
                            <i class="fas fa-clock text-4xl text-blue-500"></i>
                        </div>
                        <p class="text-sm text-gray-600">minutes practiced</p>
                    </div>
                </div>

                <div class="card p-8 mb-8">
                    <h2 class="text-2xl font-bold mb-6">
                        <i class="fas fa-chart-line"></i> Your Skill Levels
                    </h2>
                    <div id="skills-overview" class="space-y-4"></div>
                </div>

                <div class="grid md:grid-cols-2 gap-6">
                    <div class="card p-6">
                        <h3 class="font-bold text-lg mb-4">
                            <i class="fas fa-play-circle text-purple-600"></i> Ready for Today?
                        </h3>
                        <p class="text-gray-600 mb-4">Start your 30-minute daily session</p>
                        <button onclick="startDailySession()" class="btn-primary w-full">
                            <i class="fas fa-rocket"></i> Start Daily Session
                        </button>
                    </div>

                    <div class="card p-6">
                        <h3 class="font-bold text-lg mb-4">
                            <i class="fas fa-exclamation-triangle text-yellow-600"></i> Areas to Improve
                        </h3>
                        <div id="weak-areas-list" class="text-sm text-gray-600"></div>
                    </div>
                </div>
            </div>

            <!-- Daily Session Screen -->
            <div id="session-screen" class="hidden">
                <div class="session-timer">
                    <div class="text-sm text-gray-500 mb-1">Session Time</div>
                    <div class="text-2xl font-bold text-purple-600" id="session-timer-display">00:00</div>
                    <div class="text-xs text-gray-500 mt-1">Target: 30:00</div>
                </div>

                <div class="card p-8">
                    <div class="mb-8">
                        <h2 class="text-2xl font-bold mb-2" id="session-section-title">
                            <i class="fas fa-fire"></i> Warm-up
                        </h2>
                        <p class="text-gray-600" id="session-section-desc">Review vocabulary with spaced repetition</p>
                        <div class="progress-bar mt-4">
                            <div id="session-progress" class="progress-fill" style="width: 0%"></div>
                        </div>
                        <p class="text-sm text-gray-500 mt-2" id="session-progress-text">Section 1 of 6</p>
                    </div>

                    <div id="session-content-container"></div>

                    <div class="mt-6 flex justify-between">
                        <button onclick="previousSessionSection()" id="prev-session-btn" class="px-6 py-3 bg-gray-300 rounded-lg font-semibold" disabled>
                            <i class="fas fa-arrow-left"></i> Previous
                        </button>
                        <button onclick="nextSessionSection()" id="next-session-btn" class="btn-primary">
                            Next <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Progress Screen -->
            <div id="progress-screen" class="hidden">
                <div class="card p-8 mb-8">
                    <h2 class="text-2xl font-bold mb-6">
                        <i class="fas fa-chart-bar"></i> Your Progress
                    </h2>
                    
                    <div class="grid md:grid-cols-4 gap-4 mb-8">
                        <div class="text-center p-4 bg-purple-50 rounded-lg">
                            <div class="text-sm text-gray-600 mb-1">Reading</div>
                            <div class="text-2xl font-bold text-purple-600" id="progress-reading">A0</div>
                        </div>
                        <div class="text-center p-4 bg-blue-50 rounded-lg">
                            <div class="text-sm text-gray-600 mb-1">Listening</div>
                            <div class="text-2xl font-bold text-blue-600" id="progress-listening">A0</div>
                        </div>
                        <div class="text-center p-4 bg-green-50 rounded-lg">
                            <div class="text-sm text-gray-600 mb-1">Speaking</div>
                            <div class="text-2xl font-bold text-green-600" id="progress-speaking">A0</div>
                        </div>
                        <div class="text-center p-4 bg-orange-50 rounded-lg">
                            <div class="text-sm text-gray-600 mb-1">Writing</div>
                            <div class="text-2xl font-bold text-orange-600" id="progress-writing">A0</div>
                        </div>
                    </div>

                    <h3 class="font-bold text-lg mb-4">Recent Sessions</h3>
                    <div id="recent-sessions-list" class="space-y-2"></div>
                </div>

                <div class="grid md:grid-cols-2 gap-6">
                    <div class="card p-6">
                        <h3 class="font-bold text-lg mb-4">
                            <i class="fas fa-clipboard-check text-blue-600"></i> Take a Mock Exam
                        </h3>
                        <p class="text-sm text-gray-600 mb-4">Test your skills with a timed practice exam</p>
                        <button onclick="startMock('mini-mock')" class="btn-primary w-full mb-2">
                            30-Minute Mini Mock
                        </button>
                        <button onclick="startMock('full-mock')" class="px-6 py-3 bg-gray-200 rounded-lg font-semibold w-full">
                            60-Minute Full Mock
                        </button>
                    </div>

                    <div class="card p-6">
                        <h3 class="font-bold text-lg mb-4">
                            <i class="fas fa-lightbulb text-yellow-600"></i> Strategy Tips
                        </h3>
                        <div id="strategy-tips-list" class="text-sm space-y-2"></div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
