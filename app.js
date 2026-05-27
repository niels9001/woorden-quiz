/* Woorden Quiz - game logic */

const HIGHSCORE_KEY = 'woorden-quiz-highscore-v1';
const LETTERS = ['A', 'B', 'C', 'D'];

const screens = {
  start: document.getElementById('start-screen'),
  quiz: document.getElementById('quiz-screen'),
  end: document.getElementById('end-screen'),
};

const els = {
  btnStart: document.getElementById('btn-start'),
  btnAgain: document.getElementById('btn-again'),
  highscoreLine: document.getElementById('highscore-line'),
  endHighscore: document.getElementById('end-highscore'),
  wordText: document.getElementById('word-text'),
  wordCard: document.getElementById('word-card'),
  answers: document.getElementById('answers'),
  progressFill: document.getElementById('progress-fill'),
  questionCount: document.getElementById('question-count'),
  score: document.getElementById('score'),
  finalScore: document.getElementById('final-score'),
  finalTotal: document.getElementById('final-total'),
  endTitle: document.getElementById('end-title'),
  trophy: document.getElementById('trophy'),
  stars: document.getElementById('stars'),
  confetti: document.getElementById('confetti'),
};

let state = {
  queue: [],
  index: 0,
  score: 0,
  total: 0,
  locked: false,
};

/* --- Utilities --- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function getHighscore() {
  const v = localStorage.getItem(HIGHSCORE_KEY);
  return v ? JSON.parse(v) : null;
}
function setHighscore(score, total) {
  const prev = getHighscore();
  const pct = score / total;
  if (!prev || pct > prev.score / prev.total) {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify({ score, total }));
    return true;
  }
  return false;
}
function renderHighscore(el) {
  const hs = getHighscore();
  if (hs) {
    el.textContent = `🏆 Beste score: ${hs.score} / ${hs.total}`;
  } else {
    el.textContent = '';
  }
}

/* --- Audio (Web Audio API beeps) --- */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
  return audioCtx;
}
function playTone(freq, duration = 0.15, type = 'sine', vol = 0.2) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}
function soundCorrect() {
  playTone(660, 0.12, 'triangle', 0.25);
  setTimeout(() => playTone(880, 0.18, 'triangle', 0.25), 120);
}
function soundWrong() {
  playTone(220, 0.18, 'sawtooth', 0.18);
  setTimeout(() => playTone(160, 0.22, 'sawtooth', 0.18), 140);
}
function soundFinish() {
  [523, 659, 784, 1046].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.25), i * 130);
  });
}

/* --- Game flow --- */
function startGame() {
  ensureAudio();
  state.queue = shuffle(WORDS);
  state.index = 0;
  state.score = 0;
  state.total = state.queue.length;
  state.locked = false;
  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  state.locked = false;
  const current = state.queue[state.index];

  // 3 random wrong options from all other words
  const others = WORDS.filter(w => w.omschrijving !== current.omschrijving);
  const wrongs = shuffle(others).slice(0, 3);
  const options = shuffle([current, ...wrongs]);

  els.wordText.textContent = current.woord;
  els.wordCard.style.animation = 'none';
  void els.wordCard.offsetWidth;
  els.wordCard.style.animation = '';

  els.answers.innerHTML = '';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.dataset.letter = LETTERS[i];
    btn.textContent = opt.omschrijving;
    btn.addEventListener('click', () => handleAnswer(btn, opt, current));
    els.answers.appendChild(btn);
  });

  // progress + counter
  const pct = (state.index / state.total) * 100;
  els.progressFill.style.width = `${pct}%`;
  els.questionCount.textContent = `${state.index + 1} / ${state.total}`;
  els.score.textContent = state.score;
}

function handleAnswer(btn, chosen, correct) {
  if (state.locked) return;
  state.locked = true;

  const buttons = els.answers.querySelectorAll('.answer-btn');
  buttons.forEach(b => { b.disabled = true; });

  if (chosen.omschrijving === correct.omschrijving) {
    btn.classList.add('correct');
    state.score++;
    els.score.textContent = state.score;
    soundCorrect();
  } else {
    btn.classList.add('wrong');
    soundWrong();
    // reveal correct one
    buttons.forEach(b => {
      if (b.textContent === correct.omschrijving) b.classList.add('correct');
      else if (b !== btn) b.classList.add('dimmed');
    });
  }

  setTimeout(() => {
    state.index++;
    if (state.index >= state.total) {
      finishGame();
    } else {
      renderQuestion();
    }
  }, 1100);
}

function finishGame() {
  // final progress fill
  els.progressFill.style.width = '100%';

  const pct = state.score / state.total;
  els.finalScore.textContent = state.score;
  els.finalTotal.textContent = state.total;

  let stars = 1;
  if (pct >= 0.6) stars = 2;
  if (pct >= 0.8) stars = 3;
  if (pct === 1) stars = 4;
  els.stars.textContent = '⭐'.repeat(stars) + '☆'.repeat(Math.max(0, 4 - stars));

  let title = 'Goed gedaan!';
  let trophy = '🎉';
  if (pct === 1) { title = 'Perfect! 🤩'; trophy = '🏆'; }
  else if (pct >= 0.8) { title = 'Super! 🌟'; trophy = '🥇'; }
  else if (pct >= 0.6) { title = 'Lekker bezig!'; trophy = '🥈'; }
  else if (pct >= 0.4) { title = 'Goed geprobeerd!'; trophy = '🥉'; }
  else { title = 'Blijf oefenen!'; trophy = '💪'; }
  els.endTitle.textContent = title;
  els.trophy.textContent = trophy;

  const beat = setHighscore(state.score, state.total);
  renderHighscore(els.endHighscore);
  if (beat) els.endHighscore.textContent += '   🎊 Nieuw record!';

  showScreen('end');
  soundFinish();
  if (pct >= 0.6) runConfetti();
}

/* --- Confetti --- */
function runConfetti() {
  const canvas = els.confetti;
  const ctx = canvas.getContext('2d');
  const rect = screens.end.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const colors = ['#fd79a8', '#fdcb6e', '#6c5ce7', '#00b894', '#74b9ff', '#ffeaa7'];
  const pieces = [];
  for (let i = 0; i < 140; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height,
      r: 4 + Math.random() * 6,
      c: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      rot: Math.random() * Math.PI,
      vr: -0.1 + Math.random() * 0.2,
    });
  }
  let frames = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
    });
    frames++;
    if (frames < 260) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  tick();
}

/* --- Wire up --- */
els.btnStart.addEventListener('click', startGame);
els.btnAgain.addEventListener('click', startGame);
renderHighscore(els.highscoreLine);
