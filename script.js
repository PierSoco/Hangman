/* ========= Constantes y estado ========= */
const MAX_MISTAKES = 6;
const MAX_HINTS = 3;
const HINT_COST = 15;

const DIFFICULTY_CONFIG = {
  easy:   { maxMistakes: 8, minLength: 3, maxLength: 5,  name: "Fácil" },
  medium: { maxMistakes: 6, minLength: 6, maxLength: 8,  name: "Medio" },
  hard:   { maxMistakes: 4, minLength: 9, maxLength: 20, name: "Difícil" }
};

const KEYBOARD_LAYOUT = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M"]
];

const STAR_POINTS = [10, 40, 70, 100];

const LS_KEYS = {
  SCORE: "ahorcado_score",
  STREAK: "ahorcado_streak",
  THEME: "ahorcado_theme",
  ACCENT: "ahorcado_accent",
  GRAD_A: "ahorcado_grad_a",
  GRAD_B: "ahorcado_grad_b",
  GAMES: "ahorcado_games_played"
};

let WORDS_DB = [];
let currentDifficulty = "easy";

let gameState = {
  secret: "",
  revealed: [],
  used: new Set(),
  mistakes: 0,
  mode: "random",
  hints: [],
  usedHintsIdx: [],
  nextHintIdx: 0,
  over: false,
  difficulty: "easy"
};

/* ========= DOM ========= */
const screens = {
  menu: document.getElementById("screen-menu"),
  setup: document.getElementById("screen-setup"),
  game: document.getElementById("screen-game"),
  history: document.getElementById("screen-history"),
  settings: document.getElementById("screen-settings"),
};

const btnRandom = document.getElementById("btn-random");
const btnFriends = document.getElementById("btn-friends");
const btnBackMenu = document.getElementById("btn-back-menu");

const navLinks = document.querySelectorAll('.nav-link');
const themeInputs = document.querySelectorAll('input[name="theme"]');
const soundEnabled = document.getElementById('sound-enabled');
const totalPointsEl = document.getElementById('total-points');
const currentStreakEl = document.getElementById('current-streak');
const gamesPlayedEl = document.getElementById('games-played');

const setupForm = document.getElementById("setup-form");
const inputSecret = document.getElementById("secret-word");
const toggleVisibility = document.getElementById("toggle-visibility");
const btnSetupBack = document.getElementById("btn-setup-back");
const setupError = document.getElementById("setup-error");

const wordEl = document.getElementById("word");
const usedEl = document.getElementById("used-letters");
const keyboardEl = document.querySelector(".keyboard");

const hintsArea = document.getElementById("hints-area");
const btnHint = document.getElementById("btn-hint");
const hintCountEl = document.getElementById("hint-count");
const hintCostEl = document.getElementById("hint-cost");
const hintChipsEl = document.getElementById("hint-chips");

const mistakesEl = document.getElementById("mistakes");
const maxMistakesEl = document.getElementById("max-mistakes");

const hintModal = document.getElementById("hint-modal");
const hintText = document.getElementById("hint-text");
const btnCloseHint = document.getElementById("btn-close-hint");

const modal = document.getElementById("result-modal");
const resultTitle = document.getElementById("result-title");
const resultMsg = document.getElementById("result-message");
const resultExtra = document.getElementById("result-extra");
const resultPoints = document.getElementById("result-points");
const starsEl = document.getElementById("stars");
const btnPlayAgain = document.getElementById("btn-play-again");
const btnShareWhatsapp = document.getElementById("btn-share-whatsapp");
const btnGoMenu = document.getElementById("btn-go-menu");

const parts = [...document.querySelectorAll(".part")];

const confettiCanvas = document.getElementById("confetti");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");

/* ========= Utils ========= */
function normalizeLetters(str){
  return (str || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

async function loadWordsJSON(){
  if (WORDS_DB.length) return;
  try{
    const res = await fetch("./words.json", { cache:"no-store" });
    if(!res.ok) throw new Error("No se pudo cargar words.json");
    const data = await res.json();
    if(!Array.isArray(data.words)) throw new Error("Formato inválido");

    WORDS_DB = data.words.map(w => ({
      word: normalizeLetters(w.word || ""),
      hints: Array.isArray(w.hints) ? w.hints.slice(0, MAX_HINTS).map(h => String(h||"").trim())
            : (w.hint ? [String(w.hint).trim()] : [])
    })).filter(w => w.word.length >= 2);
  }catch(e){
    console.error(e);
    WORDS_DB = [
      { word:"GATO", hints:["Animal doméstico", "Maúlla", "Empieza con G"] },
      { word:"SOL",  hints:["Es una estrella", "Da luz y calor", "Tiene 3 letras"] }
    ];
  }
}

function getWordsByDifficulty(difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  return WORDS_DB.filter(word =>
    word.word.length >= config.minLength &&
    word.word.length <= config.maxLength
  );
}

function lsGet(key, def=0){
  const v = localStorage.getItem(key);
  if(v === null || v === undefined) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}
function lsSet(key, val){ localStorage.setItem(key, String(val)); }
function refreshScoreUI(){
  if(scoreEl) scoreEl.textContent = Number(lsGet(LS_KEYS.SCORE, 0)) || 0;
  if(streakEl) streakEl.textContent = Number(lsGet(LS_KEYS.STREAK, 0)) || 0;
}

function showScreen(name){
  Object.values(screens).forEach(s => s.classList.remove("active","state-win","state-lose"));
  screens[name].classList.add("active");

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.screen === name) link.classList.add('active');
  });

  if (name === 'settings') updateStatsDisplay();
}

function updateStatsDisplay() {
  if (totalPointsEl) totalPointsEl.textContent = Number(lsGet(LS_KEYS.SCORE, 0)) || 0;
  if (currentStreakEl) currentStreakEl.textContent = Number(lsGet(LS_KEYS.STREAK, 0)) || 0;
  if (gamesPlayedEl) gamesPlayedEl.textContent = Number(lsGet(LS_KEYS.GAMES, 0)) || 0;
}

function renderKeyboard(){
  keyboardEl.innerHTML = "";
  KEYBOARD_LAYOUT.forEach((rowLetters, rowIdx) => {
    const row = document.createElement("div");
    row.className = "keyboard-row";
    row.setAttribute("data-row", String(rowIdx));
    rowLetters.forEach(letter => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = letter;
      btn.className = "key";
      btn.setAttribute("data-letter", letter);
      btn.addEventListener("click", () => handleGuess(letter));
      row.appendChild(btn);
    });
    keyboardEl.appendChild(row);
  });
}

function renderHintUI(){
  hintCountEl.textContent = `${gameState.usedHintsIdx.length}/${Math.min(MAX_HINTS, gameState.hints.length)}`;
  const currentScore = Number(lsGet(LS_KEYS.SCORE, 0)) || 0;
  const hasEnoughPoints = currentScore >= HINT_COST;
  const canGiveMore = gameState.mode === "random"
    && gameState.nextHintIdx < Math.min(MAX_HINTS, gameState.hints.length)
    && !gameState.over
    && hasEnoughPoints;
  btnHint.disabled = !canGiveMore;
  btnHint.classList.toggle("disabled", btnHint.disabled);
  if (hintCostEl) hintCostEl.style.color = hasEnoughPoints ? "var(--gold)" : "var(--danger)";

  hintChipsEl.innerHTML = "";
  gameState.usedHintsIdx.forEach((idx, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "hint-chip";
    chip.title = "Ver pista usada";
    chip.textContent = `P${i+1}`;
    chip.addEventListener("click", () => openHintModal(gameState.hints[idx]));
    hintChipsEl.appendChild(chip);
  });
  hintsArea.style.display = (gameState.mode === "random" && gameState.hints.length) ? "flex" : "none";
}

function renderState(){
  wordEl.innerHTML = "";
  gameState.revealed.forEach(ch => {
    const span = document.createElement("span");
    span.className = "slot";
    span.textContent = ch === "_" ? "" : ch;
    wordEl.appendChild(span);
  });

  usedEl.textContent = gameState.used.size ? `Letras usadas: ${[...gameState.used].join(" ")}` : "";

  mistakesEl.textContent = String(gameState.mistakes);
  const config = DIFFICULTY_CONFIG[gameState.difficulty];
  maxMistakesEl.textContent = String(config.maxMistakes);

  parts.forEach((p, idx) => p.classList.toggle("visible", idx < gameState.mistakes));

  document.querySelectorAll(".key").forEach(k => {
    const letter = k.getAttribute("data-letter");
    k.disabled = gameState.used.has(letter) || gameState.over;
  });

  renderHintUI();
}

function startGameWith(word, mode="random", hints=[], difficulty="easy"){
  const secret = normalizeLetters(word);
  if(!secret || secret.length < 2) throw new Error("La palabra debe tener al menos 2 letras.");

  screens.game.classList.remove("state-win","state-lose");

  gameState = {
    secret,
    revealed: Array.from(secret, () => "_"),
    used: new Set(),
    mistakes: 0,
    mode,
    hints: (Array.isArray(hints) ? hints : (hints ? [hints] : [])).slice(0, MAX_HINTS),
    usedHintsIdx: [],
    nextHintIdx: 0,
    over: false,
    difficulty
  };
  renderKeyboard();
  renderState();
  showScreen("game");
}

function hasWon(){ return gameState.revealed.join("") === gameState.secret; }
function hasLost(){ const c = DIFFICULTY_CONFIG[gameState.difficulty]; return gameState.mistakes >= c.maxMistakes; }

function handleGuess(rawLetter){
  if(gameState.over) return;
  const letter = normalizeLetters(rawLetter);
  if(!letter) return;
  if(gameState.used.has(letter)) return;

  gameState.used.add(letter);

  if(gameState.secret.includes(letter)){
    for(let i=0; i<gameState.secret.length; i++){
      if(gameState.secret[i] === letter) gameState.revealed[i] = letter;
    }
  }else{
    gameState.mistakes++;
  }

  renderState();
  if(hasWon()) showResult(true); else if(hasLost()) showResult(false);
}

/* ========= Pistas ========= */
function openHintModal(text){ hintText.textContent = text || "Sin pista disponible."; hintModal.showModal(); }
function giveNextHint(){
  const maxAvail = Math.min(MAX_HINTS, gameState.hints.length);
  if(gameState.nextHintIdx >= maxAvail || gameState.over) return;
  const currentScore = Number(lsGet(LS_KEYS.SCORE, 0)) || 0;
  if(currentScore < HINT_COST) {
    btnHint.classList.add("insufficient-points");
    setTimeout(() => btnHint.classList.remove("insufficient-points"), 500);
    hintText.textContent = `No tienes suficientes puntos para comprar una pista. Necesitas ${HINT_COST} puntos y tienes ${currentScore}.`;
    hintModal.showModal();
    return;
  }
  const idx = gameState.nextHintIdx;
  const text = gameState.hints[idx] || "Sin pista disponible.";
  const newScore = currentScore - HINT_COST;
  lsSet(LS_KEYS.SCORE, newScore);
  refreshScoreUI();
  const hintWithCost = `${text}\n\n💡 Gastaste ${HINT_COST} puntos por esta pista.`;
  openHintModal(hintWithCost);
  gameState.usedHintsIdx.push(idx);
  gameState.nextHintIdx++;
  renderHintUI();
}

/* ========= Estrellas, resultado y confetti ========= */
function computeStars(){ const u = gameState.usedHintsIdx.length; return Math.max(0, 3 - u); }
function renderStars(count){
  starsEl.innerHTML = "";
  for(let i=0;i<3;i++){
    const filled = i < count;
    const svg = `
      <svg class="star ${filled ? "filled" : ""}" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.9L18.18 22 12 18.6 5.82 22 7 14.17l-5-4.9 6.91-1.01L12 2z"/>
      </svg>`;
    starsEl.insertAdjacentHTML("beforeend", svg);
  }
  requestAnimationFrame(() => {
    [...starsEl.children].forEach((el, idx) => {
      el.style.setProperty("--delay", `${idx*80}ms`);
      el.classList.add("bounce-in");
    });
  });
}
function endGameLock(){ gameState.over = true; document.querySelectorAll(".key").forEach(k => k.disabled = true); renderHintUI(); }
function addPointsAndStreak(win, stars){
  let score = Number(lsGet(LS_KEYS.SCORE, 0)) || 0;
  let streak = Number(lsGet(LS_KEYS.STREAK, 0)) || 0;
  let games = Number(lsGet(LS_KEYS.GAMES, 0)) || 0;
  games += 1;
  if(win){ score += STAR_POINTS[stars]; streak += 1; } else { streak = 0; }
  lsSet(LS_KEYS.SCORE, score);
  lsSet(LS_KEYS.STREAK, streak);
  lsSet(LS_KEYS.GAMES, games);
  refreshScoreUI();
  return {scoreGain: win ? STAR_POINTS[stars] : 0, streak};
}
function showConfetti(ms=1200){
  const ctx = confettiCanvas.getContext("2d");
  const cw = confettiCanvas.width = confettiCanvas.offsetWidth;
  const ch = confettiCanvas.height = confettiCanvas.offsetHeight;
  const parts = [];
  const colors = ["#fbbf24","#22c55e","#3b82f6","#ef4444","#a855f7"];
  for(let i=0;i<120;i++) parts.push({ x: Math.random()*cw, y: -20 - Math.random()*ch*0.5, r: 2 + Math.random()*3, c: colors[(Math.random()*colors.length)|0], v: 1 + Math.random()*3, a: Math.random()*Math.PI*2 });
  let start = performance.now();
  function tick(t){
    const dt = t - start; ctx.clearRect(0,0,cw,ch);
    parts.forEach(p=>{ p.y += p.v; p.x += Math.sin((p.y+p.a)/15); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); });
    if(dt < ms) requestAnimationFrame(tick); else ctx.clearRect(0,0,cw,ch);
  }
  requestAnimationFrame(tick);
}
function shareToWhatsApp(win, stars, scoreGain, streak, revealWord) {
  const config = DIFFICULTY_CONFIG[gameState.difficulty];
  const emoji = win ? "🎉" : "😵";
  const status = win ? "¡Gané!" : "Perdí";
  let message = `${emoji} ${status} jugando Ahorcado!\n\n`;
  message += `📝 Palabra: ${revealWord}\n`;
  message += `🎯 Dificultad: ${config.name}\n`;
  message += `💡 Pistas usadas: ${gameState.usedHintsIdx.length}\n`;
  if (win) { message += `⭐ Estrellas: ${stars}/3\n`; message += `🏆 Puntos ganados: +${scoreGain}\n`; message += `🔥 Racha actual: ${streak}\n`; }
  message += `\n🎮 ¡Juega también en: ${window.location.href}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}
function showResult(win){
  endGameLock();
  screens.game.classList.remove("state-win","state-lose");
  screens.game.classList.add(win ? "state-win" : "state-lose");
  const revealWord = gameState.secret.split("").join(" ");
  const stars = win ? computeStars() : 0;
  const { scoreGain, streak } = addPointsAndStreak(win, stars);
  if(win){
    resultTitle.textContent = "¡Ganaste! 🎉";
    resultExtra.textContent = `Pistas usadas: ${gameState.usedHintsIdx.length}`;
    resultMsg.textContent = `Adivinaste la palabra: ${revealWord}`;
    resultPoints.innerHTML = `Sumaste <strong>+${scoreGain}</strong> puntos · Racha: <strong>${streak}</strong>`;
    renderStars(stars); showConfetti();
  }else{
    resultTitle.textContent = "Derrota 😵";
    resultExtra.textContent = `Pistas usadas: ${gameState.usedHintsIdx.length}`;
    resultMsg.textContent = `La palabra era: ${revealWord}`;
    resultPoints.innerHTML = `Esta vez no sumaste puntos · Racha reiniciada`;
    renderStars(0);
  }
  btnShareWhatsapp.onclick = () => shareToWhatsApp(win, stars, scoreGain, streak, revealWord);
  modal.showModal();
}

/* ========= Personalización (solo colores) ========= */
const accentPicker = document.getElementById('accent-picker');
const gradAPicker  = document.getElementById('gradA-picker');
const gradBPicker  = document.getElementById('gradB-picker');
const btnSaveTheme = document.getElementById('btn-save-theme');
const btnResetTheme = document.getElementById('btn-reset-theme');
const presetButtons = document.querySelectorAll('.chip[data-preset]');

function hexToHsl(hex){
  const s = hex.replace('#','');
  const b = s.length===3 ? s.split('').map(c=>c+c).join('') : s;
  const num = parseInt(b, 16);
  const r = (num >> 16) & 255, g = (num >> 8) & 255, bl = num & 255;
  const r1 = r/255, g1 = g/255, b1 = bl/255;
  const max = Math.max(r1,g1,b1), min = Math.min(r1,g1,b1);
  let h, s1, l = (max+min)/2;
  if(max===min){ h = s1 = 0; }
  else{
    const d = max-min;
    s1 = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r1: h = (g1-b1)/d + (g1<b1?6:0); break;
      case g1: h = (b1-r1)/d + 2; break;
      case b1: h = (r1-g1)/d + 4; break;
    }
    h/=6;
  }
  return {h: Math.round(h*360), s: Math.round(s1*100), l: Math.round(l*100)};
}
function hslToHex(h,s,l){
  s/=100; l/=100; const k=n=> (n+ h/30)%12; const a=s*Math.min(l,1-l);
  const f=n=> l - a*Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n),1)));
  const toHex=x=> Math.round(x*255).toString(16).padStart(2,'0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function darkerHex(hex, by=12){
  const {h,s,l} = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - by));
}

function applyAccent(hex){
  document.documentElement.style.setProperty('--primary', hex);
  document.documentElement.style.setProperty('--primary-600', darkerHex(hex, 12));
}
function applyGradient(aHex, bHex){
  document.documentElement.style.setProperty('--bg-grad-a', aHex);
  document.documentElement.style.setProperty('--bg-grad-b', bHex);
}

function saveThemeToLS(){
  lsSet(LS_KEYS.ACCENT, accentPicker.value);
  lsSet(LS_KEYS.GRAD_A, gradAPicker.value);
  lsSet(LS_KEYS.GRAD_B, gradBPicker.value);
  applyAccent(accentPicker.value);
  applyGradient(gradAPicker.value, gradBPicker.value);
}
function resetTheme(){
  accentPicker.value = '#3b82f6';
  gradAPicker.value = '#f7f9fc';
  gradBPicker.value = '#eef3ff';
  saveThemeToLS();
}

function loadCustomizationFromLS(){
  const savedTheme = (localStorage.getItem(LS_KEYS.THEME) || 'light');
  document.body.className = savedTheme === 'dark' ? 'dark-theme' : '';
  const savedThemeInput = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
  if (savedThemeInput) savedThemeInput.checked = true;

  const accent = localStorage.getItem(LS_KEYS.ACCENT) || '#3b82f6';
  const gradA  = localStorage.getItem(LS_KEYS.GRAD_A) || '#f7f9fc';
  const gradB  = localStorage.getItem(LS_KEYS.GRAD_B) || '#eef3ff';
  accentPicker.value = accent; gradAPicker.value = gradA; gradBPicker.value = gradB;
  applyAccent(accent); applyGradient(gradA, gradB);
}

presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    try{
      const preset = JSON.parse(btn.dataset.preset);
      accentPicker.value = preset.primary; gradAPicker.value = preset.gradA; gradBPicker.value = preset.gradB;
      saveThemeToLS();
    }catch(e){ console.warn('Preset inválido', e); }
  });
});
btnSaveTheme?.addEventListener('click', () => { saveThemeToLS(); alert('🎨 Colores guardados'); });
btnResetTheme?.addEventListener('click', () => { resetTheme(); alert('Se restablecieron los colores.'); });

themeInputs.forEach(input => {
  input.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
    lsSet(LS_KEYS.THEME, theme);
  });
});

/* ========= Inicialización ========= */
const initialScore = Number(lsGet(LS_KEYS.SCORE, 0)) || 0;
if (initialScore === 0) { lsSet(LS_KEYS.SCORE, 50); }

loadCustomizationFromLS();
refreshScoreUI();
renderKeyboard();

/* ========= Juego: eventos ========= */
btnRandom.addEventListener("click", async () => {
  await loadWordsJSON();
  const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
  currentDifficulty = selectedDifficulty;
  const wordsForDifficulty = getWordsByDifficulty(selectedDifficulty);
  if (wordsForDifficulty.length === 0) {
    alert(`No hay palabras disponibles para la dificultad ${DIFFICULTY_CONFIG[selectedDifficulty].name}.`);
    return;
  }
  const pick = wordsForDifficulty[Math.floor(Math.random() * wordsForDifficulty.length)];
  startGameWith(pick.word, "random", pick.hints, selectedDifficulty);
});

btnFriends.addEventListener("click", () => {
  inputSecret.value = "";
  inputSecret.type = "password";
  toggleVisibility.checked = false;
  setupError.textContent = "";
  showScreen("setup");
});

btnBackMenu.addEventListener("click", () => {
  modal.open && modal.close();
  hintModal.open && hintModal.close();
  showScreen("menu");
});
btnSetupBack.addEventListener("click", () => showScreen("menu"));

toggleVisibility.addEventListener("change", () => { inputSecret.type = toggleVisibility.checked ? "text" : "password"; });

setupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = inputSecret.value.trim();
  const normalized = normalizeLetters(raw);
  if(!normalized){ setupError.textContent = "Ingresá solo letras (sin tildes, números ni símbolos)."; return; }
  if(normalized.length < 2){ setupError.textContent = "La palabra debe tener al menos 2 letras."; return; }
  startGameWith(normalized, "friends", []);
});

btnHint.addEventListener("click", giveNextHint);
btnCloseHint.addEventListener("click", () => hintModal.close());

btnPlayAgain.addEventListener("click", async () => {
  modal.close();
  if(gameState.mode === "random"){
    await loadWordsJSON();
    const pool = getWordsByDifficulty(currentDifficulty);
    const pick = pool[Math.floor(Math.random()*pool.length)] || WORDS_DB[Math.floor(Math.random()*WORDS_DB.length)];
    startGameWith(pick.word, "random", pick.hints, currentDifficulty);
  }else{
    showScreen("setup");
  }
});
btnGoMenu.addEventListener("click", () => { modal.close(); showScreen("menu"); });

window.addEventListener("keydown", (e) => {
  if(modal.open || hintModal.open) return;
  const tag = (document.activeElement && document.activeElement.tagName) || "";
  if(tag === "INPUT" || tag === "TEXTAREA") return;
  const key = e.key || "";
  const normalized = normalizeLetters(key);
  if(normalized.length === 1) handleGuess(normalized);
});

// Delegación global: abre secciones para cualquier elemento con data-screen
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-screen]');
  if (!target) return;
  e.preventDefault();
  const screen = target.getAttribute('data-screen');
  if (screen) showScreen(screen);
});
