// Global State
let currentUser = null;
let diagnosticItems = [];
let diagnosticResponses = [];
let currentDiagnosticIndex = 0;
let sessionData = null;
let currentSessionSection = 0;
let sessionResponses = [];
let sessionStartTime = null;
let sessionTimer = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check if user exists in localStorage
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showPage('dashboard');
    loadDashboard();
  }

  // Form handler
  document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;

    try {
      const response = await axios.post('/api/users', { name, email });
      currentUser = response.data;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      // Load diagnostic test
      await loadDiagnosticTest();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user. Please try again.');
    }
  });
});

// Show/Hide Pages
function showPage(page) {
  const pages = ['welcome', 'diagnostic', 'dashboard', 'session', 'progress', 'agents'];
  pages.forEach(p => {
    document.getElementById(`${p}-screen`).classList.add('hidden');
  });
  document.getElementById(`${page}-screen`).classList.remove('hidden');

  if (page !== 'welcome') {
    document.getElementById('nav-links').classList.remove('hidden');
  }

  if (page === 'progress') {
    loadProgress();
  }
  if (page === 'agents') {
    loadAgents();
  }
}

// Logout
function logout() {
  localStorage.removeItem('currentUser');
  currentUser = null;
  location.reload();
}

// ========================================
// Diagnostic Test
// ========================================
async function loadDiagnosticTest() {
  try {
    const response = await axios.get('/api/diagnostic');
    diagnosticItems = response.data.items;
    diagnosticResponses = new Array(diagnosticItems.length).fill(null);
    currentDiagnosticIndex = 0;
    
    document.getElementById('diagnostic-total').textContent = diagnosticItems.length;
    
    showPage('diagnostic');
    renderDiagnosticItem();
  } catch (error) {
    console.error('Error loading diagnostic:', error);
    alert('Error loading diagnostic test. Please try again.');
  }
}

function renderDiagnosticItem() {
  const item = diagnosticItems[currentDiagnosticIndex];
  if (!item) return;
  
  const content = JSON.parse(item.content);
  const container = document.getElementById('diagnostic-item-container');
  
  let html = `
    <div class="mb-6">
      <div class="flex items-center space-x-2 mb-2">
        <span class="skill-badge level-${item.level.toLowerCase()}">${item.level}</span>
        <span class="skill-badge" style="background: #f3f4f6; color: #374151;">${item.type}</span>
        <span class="text-sm text-gray-500">${item.theme}</span>
      </div>
      <h3 class="text-xl font-bold mb-4">${item.title}</h3>
    </div>
  `;
  
  if (item.type === 'reading' || item.type === 'listening') {
    html += `
      <div class="bg-gray-50 p-6 rounded-lg mb-6">
        ${item.type === 'listening' ? '<p class="text-sm text-gray-500 mb-2"><i class="fas fa-headphones"></i> Listen to the audio:</p>' : ''}
        ${item.type === 'listening' ? '<p class="italic text-gray-700 mb-4">[Audio: ' + content.audio_prompt + ']</p>' : ''}
        <div class="whitespace-pre-wrap text-gray-800">${content.text || content.transcript}</div>
      </div>
      
      <div class="mb-4">
        <p class="font-semibold mb-3">${content.question}</p>
        <div class="space-y-2">
    `;
    
    content.options.forEach((option, idx) => {
      html += `
        <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50">
          <input type="radio" name="diagnostic-answer" value="${idx}" class="mr-3" ${diagnosticResponses[currentDiagnosticIndex]?.answer === idx ? 'checked' : ''}>
          <span>${option}</span>
        </label>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // Update progress
  document.getElementById('diagnostic-current').textContent = currentDiagnosticIndex + 1;
  document.getElementById('diagnostic-progress').style.width = `${((currentDiagnosticIndex + 1) / diagnosticItems.length) * 100}%`;
  
  // Update buttons
  document.getElementById('prev-diagnostic-btn').disabled = currentDiagnosticIndex === 0;
  
  // Add change listener
  document.querySelectorAll('input[name="diagnostic-answer"]').forEach(input => {
    input.addEventListener('change', (e) => {
      saveDiagnosticAnswer(parseInt(e.target.value));
    });
  });
}

function saveDiagnosticAnswer(answer) {
  const item = diagnosticItems[currentDiagnosticIndex];
  const content = JSON.parse(item.content);
  
  diagnosticResponses[currentDiagnosticIndex] = {
    itemId: item.id,
    answer,
    isCorrect: answer === content.correct_answer
  };
}

function previousDiagnosticItem() {
  if (currentDiagnosticIndex > 0) {
    currentDiagnosticIndex--;
    renderDiagnosticItem();
  }
}

async function nextDiagnosticItem() {
  if (currentDiagnosticIndex < diagnosticItems.length - 1) {
    currentDiagnosticIndex++;
    renderDiagnosticItem();
  } else {
    // Submit diagnostic
    await submitDiagnostic();
  }
}

async function submitDiagnostic() {
  try {
    document.getElementById('next-diagnostic-btn').disabled = true;
    document.getElementById('next-diagnostic-btn').textContent = 'Analyzing...';
    
    const response = await axios.post('/api/diagnostic/submit', {
      userId: currentUser.userId,
      responses: diagnosticResponses.filter(r => r !== null)
    });
    
    currentUser.level = Object.values(response.data.skillLevels)[0]?.level || 'A0';
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    alert(`Great job! Your starting level: ${currentUser.level}\n\nLet's begin your learning journey!`);
    showPage('dashboard');
    loadDashboard();
  } catch (error) {
    console.error('Error submitting diagnostic:', error);
    alert('Error submitting diagnostic. Please try again.');
    document.getElementById('next-diagnostic-btn').disabled = false;
    document.getElementById('next-diagnostic-btn').textContent = 'Submit';
  }
}

// ========================================
// Dashboard
// ========================================
async function loadDashboard() {
  try {
    const response = await axios.get(`/api/progress/${currentUser.userId}`);
    const data = response.data;
    
    // Update stats
    document.getElementById('user-level').textContent = data.user.current_level || 'A0';
    document.getElementById('user-streak').textContent = data.user.streak_days || 0;
    document.getElementById('user-time').textContent = data.totalTimeMinutes || 0;
    
    // Update skills overview
    const skillsHtml = data.skills.map(skill => {
      const percentage = Math.round(skill.mastery_score * 100);
      return `
        <div>
          <div class="flex justify-between mb-2">
            <span class="font-semibold capitalize">${skill.skill}</span>
            <span class="skill-badge level-${skill.level.toLowerCase()}">${skill.level}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>
          <p class="text-xs text-gray-500 mt-1">${percentage}% mastery</p>
        </div>
      `;
    }).join('');
    
    document.getElementById('skills-overview').innerHTML = skillsHtml;
    
    // Update weak areas
    const weakAreasHtml = data.weakAreas.length > 0 
      ? data.weakAreas.map(area => `
          <div class="flex items-center justify-between py-2 border-b">
            <span class="capitalize">${area.skill}: ${area.theme} (${area.tactic})</span>
            <span class="text-red-600 font-semibold">${Math.round(area.mastery_score * 100)}%</span>
          </div>
        `).join('')
      : '<p class="text-gray-500">No weak areas yet. Keep practicing!</p>';
    
    document.getElementById('weak-areas-list').innerHTML = weakAreasHtml;
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// ========================================
// Daily Session
// ========================================
async function startDailySession() {
  try {
    const response = await axios.get(`/api/session/daily/${currentUser.userId}`);
    sessionData = response.data;
    sessionResponses = [];
    currentSessionSection = 0;
    sessionStartTime = Date.now();
    
    showPage('session');
    startSessionTimer();
    renderSessionSection();
  } catch (error) {
    console.error('Error starting session:', error);
    alert('Error starting session. Please try again.');
  }
}

function startSessionTimer() {
  sessionTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('session-timer-display').textContent = 
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

function stopSessionTimer() {
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
}

function renderSessionSection() {
  const sections = [
    { key: 'warmup', title: 'Warm-up', icon: 'fire', desc: 'Review vocabulary flashcards' },
    { key: 'listening', title: 'Listening', icon: 'headphones', desc: 'Practice comprehension' },
    { key: 'reading', title: 'Reading', icon: 'book', desc: 'Understand written texts' },
    { key: 'speaking', title: 'Speaking', icon: 'microphone', desc: 'Practice conversation' },
    { key: 'writing', title: 'Writing', icon: 'pen', desc: 'Written expression' },
    { key: 'wrapup', title: 'Wrap-up', icon: 'check-circle', desc: 'Review and summary' }
  ];
  
  const section = sections[currentSessionSection];
  
  // Update header
  document.getElementById('session-section-title').innerHTML = `<i class="fas fa-${section.icon}"></i> ${section.title}`;
  document.getElementById('session-section-desc').textContent = section.desc;
  document.getElementById('session-progress').style.width = `${((currentSessionSection + 1) / 6) * 100}%`;
  document.getElementById('session-progress-text').textContent = `Section ${currentSessionSection + 1} of 6`;
  
  // Update buttons
  document.getElementById('prev-session-btn').disabled = currentSessionSection === 0;
  
  // Render content
  const container = document.getElementById('session-content-container');
  
  if (section.key === 'warmup') {
    renderWarmup(container);
  } else if (section.key === 'listening' || section.key === 'reading') {
    renderContentItems(container, sessionData[section.key]);
  } else if (section.key === 'speaking') {
    renderSpeaking(container);
  } else if (section.key === 'writing') {
    renderWriting(container);
  } else if (section.key === 'wrapup') {
    renderWrapup(container);
  }
}

function renderWarmup(container) {
  const vocabItems = sessionData.warmup || [];
  
  if (vocabItems.length === 0) {
    container.innerHTML = '<p class="text-gray-600">No vocabulary to review today. Great job staying on top of your reviews!</p>';
    return;
  }
  
  let html = '<div class="grid md:grid-cols-2 gap-4">';
  
  vocabItems.forEach((item, idx) => {
    html += `
      <div class="vocab-card" onclick="flipVocabCard(${idx})">
        <div class="front">
          <div class="text-2xl font-bold text-purple-600 mb-2">${item.word}</div>
          <div class="text-sm text-gray-500">Click to reveal</div>
        </div>
        <div class="back">
          <div class="text-xl font-semibold mb-2">${item.translation}</div>
          <div class="text-sm text-gray-700 italic">${item.example_sentence || ''}</div>
          <div class="mt-3 space-x-2">
            <button onclick="rateVocab(event, ${item.item_id}, 5)" class="px-3 py-1 bg-green-500 text-white rounded text-xs">Easy</button>
            <button onclick="rateVocab(event, ${item.item_id}, 3)" class="px-3 py-1 bg-yellow-500 text-white rounded text-xs">Good</button>
            <button onclick="rateVocab(event, ${item.item_id}, 1)" class="px-3 py-1 bg-red-500 text-white rounded text-xs">Hard</button>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function flipVocabCard(idx) {
  const cards = document.querySelectorAll('.vocab-card');
  if (cards[idx]) {
    cards[idx].classList.toggle('flipped');
  }
}

async function rateVocab(event, vocabId, quality) {
  event.stopPropagation();
  try {
    await axios.post('/api/vocabulary/review', {
      userId: currentUser.userId,
      vocabId,
      quality
    });
    
    // Remove the card
    event.target.closest('.vocab-card').style.opacity = '0.3';
    event.target.closest('.vocab-card').style.pointerEvents = 'none';
  } catch (error) {
    console.error('Error rating vocab:', error);
  }
}

function renderContentItems(container, items) {
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="text-gray-600">No items available for this section.</p>';
    return;
  }
  
  let html = '';
  items.forEach((item, idx) => {
    const content = JSON.parse(item.content);
    
    html += `
      <div class="mb-8 p-6 bg-gray-50 rounded-lg" id="item-${item.id}">
        <div class="flex items-center space-x-2 mb-4">
          <span class="skill-badge level-${item.level.toLowerCase()}">${item.level}</span>
          <span class="skill-badge" style="background: #f3f4f6; color: #374151;">${item.theme}</span>
          <span class="text-sm text-gray-500">${item.tactic}</span>
        </div>
        
        <h3 class="text-lg font-bold mb-4">${item.title}</h3>
        
        ${item.type === 'listening' ? `<p class="text-sm text-purple-600 mb-2"><i class="fas fa-headphones"></i> Listen to the audio</p><p class="italic text-gray-600 mb-4">[Audio: ${content.audio_prompt}]</p>` : ''}
        
        <div class="bg-white p-4 rounded-lg mb-4 whitespace-pre-wrap">${content.text || content.transcript}</div>
        
        <p class="font-semibold mb-3">${content.question}</p>
        
        <div class="space-y-2">
    `;
    
    content.options.forEach((option, optIdx) => {
      html += `
        <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50">
          <input type="radio" name="item-${item.id}" value="${optIdx}" class="mr-3">
          <span>${option}</span>
        </label>
      `;
    });
    
    html += `
        </div>
        <div id="feedback-${item.id}" class="mt-4"></div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Add listeners
  items.forEach(item => {
    document.querySelectorAll(`input[name="item-${item.id}"]`).forEach(input => {
      input.addEventListener('change', (e) => {
        checkAnswer(item.id, parseInt(e.target.value));
      });
    });
  });
}

function checkAnswer(itemId, answer) {
  const section = ['listening', 'reading'][currentSessionSection - 1];
  const item = sessionData[section].find(i => i.id === itemId);
  if (!item) return;
  
  const content = JSON.parse(item.content);
  const isCorrect = answer === content.correct_answer;
  
  sessionResponses.push({
    itemId,
    userAnswer: answer,
    isCorrect,
    timeSpent: Math.floor((Date.now() - sessionStartTime) / 1000)
  });
  
  const feedbackDiv = document.getElementById(`feedback-${itemId}`);
  feedbackDiv.className = isCorrect ? 'feedback-correct' : 'feedback-incorrect';
  feedbackDiv.innerHTML = `
    <div class="flex items-start">
      <i class="fas fa-${isCorrect ? 'check-circle text-green-600' : 'times-circle text-red-600'} text-xl mr-3 mt-1"></i>
      <div>
        <p class="font-semibold mb-1">${isCorrect ? 'Correct!' : 'Not quite right'}</p>
        <p class="text-sm">${content.explanation}</p>
        ${content.strategy_hint ? `<p class="text-sm mt-2 italic"><i class="fas fa-lightbulb"></i> Tip: ${content.strategy_hint}</p>` : ''}
      </div>
    </div>
  `;
  
  // Disable other options
  document.querySelectorAll(`input[name="item-${itemId}"]`).forEach(input => {
    input.disabled = true;
  });
}

function renderSpeaking(container) {
  const item = sessionData.speaking && sessionData.speaking[0];
  if (!item) {
    container.innerHTML = '<p class="text-gray-600">No speaking task available.</p>';
    return;
  }
  
  const content = JSON.parse(item.content);
  
  container.innerHTML = `
    <div class="mb-8">
      <div class="flex items-center space-x-2 mb-4">
        <span class="skill-badge level-${item.level.toLowerCase()}">${item.level}</span>
        <span class="skill-badge" style="background: #f3f4f6; color: #374151;">Role-play</span>
        <span class="text-sm text-gray-500">${item.theme}</span>
      </div>
      
      <h3 class="text-lg font-bold mb-4">${item.title}</h3>
      
      <div class="bg-gray-50 p-6 rounded-lg mb-6">
        <h4 class="font-semibold mb-2">Scenario:</h4>
        <p class="mb-4">${content.scenario}</p>
        
        <h4 class="font-semibold mb-2">Your tasks:</h4>
        <ul class="list-disc list-inside space-y-1">
          ${content.tasks.map(task => `<li>${task}</li>`).join('')}
        </ul>
      </div>
      
      <div class="speaking-recorder" id="recorder">
        <i class="fas fa-microphone text-4xl text-purple-600 mb-4"></i>
        <p class="text-lg font-semibold mb-2">Record Your Response</p>
        <p class="text-sm text-gray-600 mb-4">Click the button to start/stop recording</p>
        <button onclick="toggleRecording()" id="record-btn" class="btn-primary">
          <i class="fas fa-microphone"></i> Start Recording
        </button>
        <p class="text-xs text-gray-500 mt-2">Aim for 1-2 minutes</p>
      </div>
      
      <div id="speaking-feedback" class="hidden mt-6 p-6 bg-blue-50 rounded-lg">
        <h4 class="font-semibold mb-3">Sample Answer:</h4>
        <div class="bg-white p-4 rounded-lg italic">${content.sample_answer}</div>
        
        <div class="mt-4 grid md:grid-cols-4 gap-4">
          <div class="text-center p-3 bg-white rounded-lg">
            <div class="text-sm text-gray-600">Fluency</div>
            <div class="text-2xl font-bold text-purple-600">4/5</div>
          </div>
          <div class="text-center p-3 bg-white rounded-lg">
            <div class="text-sm text-gray-600">Range</div>
            <div class="text-2xl font-bold text-blue-600">4/5</div>
          </div>
          <div class="text-center p-3 bg-white rounded-lg">
            <div class="text-sm text-gray-600">Accuracy</div>
            <div class="text-2xl font-bold text-green-600">3/5</div>
          </div>
          <div class="text-center p-3 bg-white rounded-lg">
            <div class="text-sm text-gray-600">Task</div>
            <div class="text-2xl font-bold text-orange-600">5/5</div>
          </div>
        </div>
        
        <p class="text-sm text-gray-600 mt-4">
          <i class="fas fa-info-circle"></i> Note: In production, this would use speech recognition and AI scoring. For now, compare your response with the sample answer.
        </p>
      </div>
    </div>
  `;
}

function toggleRecording() {
  const btn = document.getElementById('record-btn');
  const recorder = document.getElementById('recorder');
  const feedback = document.getElementById('speaking-feedback');
  
  if (!isRecording) {
    // Start recording
    isRecording = true;
    recorder.classList.add('recording-active');
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
    btn.classList.remove('btn-primary');
    btn.classList.add('bg-red-600', 'text-white');
    
    // In production, you would use Web Speech API here
    // navigator.mediaDevices.getUserMedia({ audio: true })
  } else {
    // Stop recording
    isRecording = false;
    recorder.classList.remove('recording-active');
    btn.innerHTML = '<i class="fas fa-check"></i> Recording Complete';
    btn.disabled = true;
    
    // Show feedback
    feedback.classList.remove('hidden');
    
    // Add to responses
    sessionResponses.push({
      itemId: sessionData.speaking[0].id,
      userAnswer: 'audio_recording',
      isCorrect: true,
      timeSpent: Math.floor((Date.now() - sessionStartTime) / 1000)
    });
  }
}

function renderWriting(container) {
  const item = sessionData.writing && sessionData.writing[0];
  if (!item) {
    container.innerHTML = '<p class="text-gray-600">No writing task available.</p>';
    return;
  }
  
  const content = JSON.parse(item.content);
  
  container.innerHTML = `
    <div class="mb-8">
      <div class="flex items-center space-x-2 mb-4">
        <span class="skill-badge level-${item.level.toLowerCase()}">${item.level}</span>
        <span class="skill-badge" style="background: #f3f4f6; color: #374151;">Writing</span>
        <span class="text-sm text-gray-500">${item.theme}</span>
      </div>
      
      <h3 class="text-lg font-bold mb-4">${item.title}</h3>
      
      <div class="bg-gray-50 p-6 rounded-lg mb-6">
        <p class="mb-4">${content.prompt}</p>
        
        <h4 class="font-semibold mb-2">Include:</h4>
        <ul class="list-disc list-inside space-y-1">
          ${content.tasks.map(task => `<li>${task}</li>`).join('')}
        </ul>
        
        <p class="text-sm text-gray-600 mt-3">
          <i class="fas fa-info-circle"></i> Word count: ${content.word_count.min}-${content.word_count.max} words
        </p>
      </div>
      
      <textarea id="writing-input" class="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="Write your response here..."></textarea>
      
      <div class="mt-3 text-sm text-gray-600">
        <span id="word-count">0</span> words
      </div>
      
      <button onclick="submitWriting()" class="btn-primary mt-4">
        <i class="fas fa-check"></i> Submit Writing
      </button>
      
      <div id="writing-feedback" class="hidden mt-6"></div>
    </div>
  `;
  
  // Add word counter
  document.getElementById('writing-input').addEventListener('input', (e) => {
    const words = e.target.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('word-count').textContent = words;
  });
}

function submitWriting() {
  const text = document.getElementById('writing-input').value;
  const item = sessionData.writing[0];
  const content = JSON.parse(item.content);
  
  if (!text.trim()) {
    alert('Please write something first!');
    return;
  }
  
  // Add to responses
  sessionResponses.push({
    itemId: item.id,
    userAnswer: text,
    isCorrect: true, // Auto-mark as correct for now
    timeSpent: Math.floor((Date.now() - sessionStartTime) / 1000)
  });
  
  // Show feedback
  const feedbackDiv = document.getElementById('writing-feedback');
  feedbackDiv.classList.remove('hidden');
  feedbackDiv.className = 'feedback-correct';
  feedbackDiv.innerHTML = `
    <h4 class="font-semibold mb-3">Sample Answer:</h4>
    <div class="bg-white p-4 rounded-lg mb-4 whitespace-pre-wrap">${content.sample_answer}</div>
    
    <h4 class="font-semibold mb-2">Checklist:</h4>
    <ul class="space-y-1">
      ${content.checklist.map(item => `
        <li class="flex items-center">
          <i class="fas fa-check-circle text-green-600 mr-2"></i>
          <span>${item}</span>
        </li>
      `).join('')}
    </ul>
    
    <p class="text-sm text-gray-600 mt-4">
      <i class="fas fa-info-circle"></i> In production, this would provide automated feedback on grammar, vocabulary, and structure. For now, compare your answer with the sample.
    </p>
  `;
  
  document.getElementById('writing-input').disabled = true;
  document.querySelector('button[onclick="submitWriting()"]').disabled = true;
}

function renderWrapup(container) {
  const strategyTip = sessionData.strategyTip;
  
  container.innerHTML = `
    <div class="text-center mb-8">
      <i class="fas fa-trophy text-6xl text-yellow-500 mb-4"></i>
      <h3 class="text-2xl font-bold mb-2">Great Session!</h3>
      <p class="text-gray-600">You've completed today's 30-minute practice</p>
    </div>
    
    ${strategyTip ? `
      <div class="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg mb-6">
        <h4 class="font-bold text-lg mb-2">
          <i class="fas fa-lightbulb text-yellow-600"></i> Strategy Tip of the Day
        </h4>
        <h5 class="font-semibold mb-2">${strategyTip.tip_title}</h5>
        <p class="text-gray-700 mb-3">${strategyTip.tip_content}</p>
        ${strategyTip.example ? `<p class="text-sm italic text-gray-600">Example: ${strategyTip.example}</p>` : ''}
      </div>
    ` : ''}
    
    <div class="bg-white p-6 rounded-lg border-2 border-purple-200">
      <h4 class="font-semibold mb-4">Today's Summary</h4>
      <div class="grid md:grid-cols-3 gap-4">
        <div class="text-center">
          <div class="text-3xl font-bold text-purple-600">${sessionResponses.length}</div>
          <div class="text-sm text-gray-600">Items Completed</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">${sessionResponses.filter(r => r.isCorrect).length}</div>
          <div class="text-sm text-gray-600">Correct Answers</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">${Math.round((sessionResponses.filter(r => r.isCorrect).length / sessionResponses.length) * 100)}%</div>
          <div class="text-sm text-gray-600">Accuracy</div>
        </div>
      </div>
    </div>
    
    <button onclick="finishSession()" class="btn-primary w-full mt-6">
      <i class="fas fa-check-circle"></i> Finish Session
    </button>
  `;
}

function previousSessionSection() {
  if (currentSessionSection > 0) {
    currentSessionSection--;
    renderSessionSection();
  }
}

function nextSessionSection() {
  if (currentSessionSection < 5) {
    currentSessionSection++;
    renderSessionSection();
  }
}

async function finishSession() {
  try {
    stopSessionTimer();
    
    const response = await axios.post('/api/session/submit', {
      userId: currentUser.userId,
      responses: sessionResponses,
      sessionType: 'daily'
    });
    
    alert(`Session complete! 🎉\n\nAccuracy: ${Math.round(response.data.accuracy * 100)}%\nStreak: ${response.data.streak} days`);
    
    showPage('dashboard');
    loadDashboard();
  } catch (error) {
    console.error('Error finishing session:', error);
    alert('Error saving session. Please try again.');
  }
}

// ========================================
// Progress
// ========================================
async function loadProgress() {
  try {
    const response = await axios.get(`/api/progress/${currentUser.userId}`);
    const data = response.data;
    
    // Update skill levels
    data.skills.forEach(skill => {
      const elem = document.getElementById(`progress-${skill.skill}`);
      if (elem) elem.textContent = skill.level;
    });
    
    // Recent sessions
    const sessionsHtml = data.recentSessions.map(session => {
      const date = new Date(session.started_at).toLocaleDateString();
      const accuracy = Math.round(session.accuracy * 100);
      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <span class="font-semibold">${session.session_type}</span>
            <span class="text-sm text-gray-500 ml-2">${date}</span>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">${session.items_completed} items</span>
            <span class="font-semibold text-purple-600">${accuracy}%</span>
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('recent-sessions-list').innerHTML = sessionsHtml || '<p class="text-gray-500">No sessions yet</p>';
    
    // Load strategy tips
    loadStrategyTips();
    
  } catch (error) {
    console.error('Error loading progress:', error);
  }
}

async function loadStrategyTips() {
  try {
    const response = await axios.get('/api/tips');
    const tips = response.data.tips;
    
    const tipsHtml = tips.map(tip => `
      <div class="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
        <p class="font-semibold text-sm mb-1">${tip.tip_title}</p>
        <p class="text-xs text-gray-600">${tip.tip_content.substring(0, 100)}...</p>
      </div>
    `).join('');
    
    document.getElementById('strategy-tips-list').innerHTML = tipsHtml;
  } catch (error) {
    console.error('Error loading tips:', error);
  }
}

async function startMock(type) {
  try {
    const response = await axios.get(`/api/mock/${currentUser.userId}?type=${type}`);
    alert(`Mock exam loaded! This feature is coming soon.\n\nYour level: ${response.data.targetLevel}\nType: ${type}`);
  } catch (error) {
    console.error('Error loading mock:', error);
    alert('Error loading mock exam. Please try again.');
  }
}

// ========================================
// Agents Overview
// ========================================
const agentTypeIcons = {
  writing_feedback: 'pen',
  speaking_coach: 'microphone',
  reading_tutor: 'book',
  listening_tutor: 'headphones',
  conversation: 'comments'
};

const agentTypeColors = {
  writing_feedback: 'orange',
  speaking_coach: 'green',
  reading_tutor: 'purple',
  listening_tutor: 'blue',
  conversation: 'pink'
};

async function loadAgents() {
  try {
    const response = await axios.get('/api/agents');
    const agents = response.data.agents;

    // Update summary stats
    const activeCount = agents.filter(a => a.status === 'active').length;
    const totalInteractions = agents.reduce((sum, a) => sum + (a.total_interactions || 0), 0);
    const ratedAgents = agents.filter(a => a.avg_rating > 0);
    const avgRating = ratedAgents.length > 0
      ? (ratedAgents.reduce((sum, a) => sum + a.avg_rating, 0) / ratedAgents.length).toFixed(1)
      : '--';

    document.getElementById('active-agents-count').textContent = activeCount;
    document.getElementById('total-interactions-count').textContent = totalInteractions;
    document.getElementById('avg-agent-rating').textContent = avgRating;

    // Render agent cards
    const grid = document.getElementById('agents-grid');
    grid.innerHTML = agents.map(agent => {
      const icon = agentTypeIcons[agent.type] || 'robot';
      const color = agentTypeColors[agent.type] || 'gray';
      const levels = JSON.parse(agent.levels || '[]');
      const isActive = agent.status === 'active';

      return `
        <div class="card p-6 relative">
          <div class="absolute top-4 right-4">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" ${isActive ? 'checked' : ''} class="sr-only peer" onchange="toggleAgentStatus('${agent.id}', this.checked)">
              <div class="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div class="flex items-center mb-4">
            <div class="w-12 h-12 rounded-full bg-${color}-100 flex items-center justify-center mr-4">
              <i class="fas fa-${icon} text-${color}-600 text-xl"></i>
            </div>
            <div>
              <h3 class="font-bold text-lg">${agent.name}</h3>
              <span class="text-xs px-2 py-1 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">${agent.status}</span>
            </div>
          </div>

          <p class="text-sm text-gray-600 mb-4">${agent.description || ''}</p>

          ${agent.skill ? `<div class="mb-3"><span class="skill-badge" style="background: #f3f4f6; color: #374151;">Skill: ${agent.skill}</span></div>` : ''}

          <div class="mb-3">
            ${levels.map(l => `<span class="skill-badge level-${l.toLowerCase()}">${l}</span>`).join('')}
          </div>

          <div class="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div class="text-center">
              <div class="text-lg font-bold text-purple-600">${agent.total_interactions || 0}</div>
              <div class="text-xs text-gray-500">Interactions</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-yellow-600">${agent.avg_rating > 0 ? agent.avg_rating.toFixed(1) + '/5' : '--'}</div>
              <div class="text-xs text-gray-500">Rating</div>
            </div>
          </div>

          <div class="text-xs text-gray-400 mt-3">Model: ${agent.model || 'default'}</div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading agents:', error);
    document.getElementById('agents-grid').innerHTML = '<p class="text-gray-500 col-span-3 text-center">Could not load agents.</p>';
  }
}

async function toggleAgentStatus(agentId, isActive) {
  try {
    await axios.patch(`/api/agents/${agentId}/status`, {
      status: isActive ? 'active' : 'inactive'
    });
    loadAgents();
  } catch (error) {
    console.error('Error toggling agent:', error);
    loadAgents();
  }
}
