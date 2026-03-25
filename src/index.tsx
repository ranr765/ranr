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
// Analytics API Routes (Power BI Data Source)
// ============================================

// Analytics: User overview (all users with aggregated stats)
app.get('/api/analytics/users', async (c) => {
  const users = await c.env.DB.prepare(`
    SELECT
      u.id,
      u.name,
      u.current_level,
      u.target_level,
      u.streak_days,
      u.daily_goal_minutes,
      u.onboarding_completed,
      u.last_session_date,
      u.created_at,
      COUNT(DISTINCT s.id) as total_sessions,
      COALESCE(SUM(s.duration_seconds), 0) as total_practice_seconds,
      COALESCE(AVG(s.accuracy), 0) as avg_accuracy,
      COALESCE(SUM(s.items_completed), 0) as total_items_completed
    FROM users u
    LEFT JOIN sessions s ON u.id = s.user_id AND s.completed_at IS NOT NULL
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all()
  return c.json({ data: users.results, _meta: { table: 'users_overview', refreshed_at: new Date().toISOString() } })
})

// Analytics: Skill levels across all users
app.get('/api/analytics/skills', async (c) => {
  const skills = await c.env.DB.prepare(`
    SELECT
      us.user_id,
      u.name as user_name,
      us.skill,
      us.level,
      us.mastery_score,
      us.updated_at
    FROM user_skills us
    JOIN users u ON us.user_id = u.id
    ORDER BY us.user_id, us.skill
  `).all()
  return c.json({ data: skills.results, _meta: { table: 'skill_levels', refreshed_at: new Date().toISOString() } })
})

// Analytics: Session history with details
app.get('/api/analytics/sessions', async (c) => {
  const sessions = await c.env.DB.prepare(`
    SELECT
      s.id as session_id,
      s.user_id,
      u.name as user_name,
      u.current_level,
      s.session_type,
      s.started_at,
      s.completed_at,
      s.duration_seconds,
      s.items_completed,
      s.accuracy
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.started_at DESC
  `).all()
  return c.json({ data: sessions.results, _meta: { table: 'sessions', refreshed_at: new Date().toISOString() } })
})

// Analytics: Mastery nodes (skill × theme × tactic granularity)
app.get('/api/analytics/mastery', async (c) => {
  const mastery = await c.env.DB.prepare(`
    SELECT
      mn.user_id,
      u.name as user_name,
      mn.skill,
      mn.theme,
      mn.tactic,
      mn.level,
      mn.mastery_score,
      mn.attempts,
      mn.correct_count,
      mn.last_practiced,
      CASE
        WHEN mn.attempts > 0 THEN ROUND(CAST(mn.correct_count AS REAL) / mn.attempts * 100, 1)
        ELSE 0
      END as accuracy_pct
    FROM mastery_nodes mn
    JOIN users u ON mn.user_id = u.id
    ORDER BY mn.user_id, mn.skill, mn.theme
  `).all()
  return c.json({ data: mastery.results, _meta: { table: 'mastery_nodes', refreshed_at: new Date().toISOString() } })
})

// Analytics: Vocabulary progress
app.get('/api/analytics/vocabulary', async (c) => {
  const vocab = await c.env.DB.prepare(`
    SELECT
      v.id as vocab_id,
      v.word,
      v.translation,
      v.level,
      v.theme,
      COUNT(uv.id) as learner_count,
      AVG(uv.mastery_level) as avg_mastery,
      SUM(uv.times_reviewed) as total_reviews,
      SUM(CASE WHEN uv.mastery_level = 0 THEN 1 ELSE 0 END) as count_new,
      SUM(CASE WHEN uv.mastery_level = 1 THEN 1 ELSE 0 END) as count_learning,
      SUM(CASE WHEN uv.mastery_level = 2 THEN 1 ELSE 0 END) as count_known,
      SUM(CASE WHEN uv.mastery_level = 3 THEN 1 ELSE 0 END) as count_mastered
    FROM vocabulary v
    LEFT JOIN user_vocabulary uv ON v.id = uv.vocab_id
    GROUP BY v.id
    ORDER BY v.level, v.theme
  `).all()
  return c.json({ data: vocab.results, _meta: { table: 'vocabulary_progress', refreshed_at: new Date().toISOString() } })
})

// Analytics: Mock exam results
app.get('/api/analytics/mocks', async (c) => {
  const mocks = await c.env.DB.prepare(`
    SELECT
      mr.id as mock_id,
      mr.user_id,
      u.name as user_name,
      mr.mock_type,
      mr.level as target_level,
      mr.reading_score,
      mr.listening_score,
      mr.speaking_score,
      mr.writing_score,
      mr.overall_score,
      mr.passed,
      mr.completed_at
    FROM mock_results mr
    JOIN users u ON mr.user_id = u.id
    ORDER BY mr.completed_at DESC
  `).all()
  return c.json({ data: mocks.results, _meta: { table: 'mock_results', refreshed_at: new Date().toISOString() } })
})

// Analytics: SRS queue health
app.get('/api/analytics/srs', async (c) => {
  const srs = await c.env.DB.prepare(`
    SELECT
      sq.user_id,
      u.name as user_name,
      sq.item_type,
      COUNT(*) as queue_size,
      SUM(CASE WHEN sq.due_date <= date('now') THEN 1 ELSE 0 END) as overdue_count,
      SUM(CASE WHEN sq.due_date > date('now') THEN 1 ELSE 0 END) as upcoming_count,
      AVG(sq.easiness_factor) as avg_easiness,
      AVG(sq.repetitions) as avg_repetitions,
      AVG(sq.interval_days) as avg_interval_days
    FROM srs_queue sq
    JOIN users u ON sq.user_id = u.id
    GROUP BY sq.user_id, sq.item_type
    ORDER BY sq.user_id
  `).all()
  return c.json({ data: srs.results, _meta: { table: 'srs_health', refreshed_at: new Date().toISOString() } })
})

// Analytics: Content library summary
app.get('/api/analytics/content', async (c) => {
  const content = await c.env.DB.prepare(`
    SELECT
      ci.type as content_type,
      ci.level,
      ci.theme,
      ci.tactic,
      COUNT(*) as item_count,
      AVG(ci.difficulty) as avg_difficulty,
      AVG(ci.time_estimate_seconds) as avg_time_estimate,
      COALESCE(SUM(si.id IS NOT NULL), 0) as times_used,
      COALESCE(AVG(CASE WHEN si.is_correct = 1 THEN 100.0 ELSE 0.0 END), 0) as success_rate
    FROM content_items ci
    LEFT JOIN session_items si ON ci.id = si.content_item_id
    GROUP BY ci.type, ci.level, ci.theme, ci.tactic
    ORDER BY ci.type, ci.level
  `).all()
  return c.json({ data: content.results, _meta: { table: 'content_library', refreshed_at: new Date().toISOString() } })
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
