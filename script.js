/* ========= Constantes y estado ========= */
const MAX_MISTAKES = 6;
const MAX_HINTS = 3;

// Teclado QWERTY (sin Ñ porque normalizamos a A-Z)
const KEYBOARD_LAYOUT = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M"]
];

// Puntuación por estrellas
const STAR_POINTS = [10, 40, 70, 100]; // 0⭐,1⭐,2⭐,3⭐
const LS_KEYS = {
  SCORE: "ahorcado_score",
  STREAK: "ahorcado_streak"
};

let WORDS_DB = []; // [{word:"...", hints:["...","...","..."]}]

let gameState = {
  secret: "",
  revealed: [],
  used: new Set(),
  mistakes: 0,
  mode: "random",   // "random" | "friends"
  hints: [],
  usedHintsIdx: [],
  nextHintIdx: 0,
  over: false
};

/* ========= DOM ========= */
const screens = {
  menu: document.getElementById("screen-menu"),
  setup: document.getElementById("screen-setup"),
  game: document.getElementById("screen-game"),
};

const btnRandom = document.getElementById("btn-random");
const btnFriends = document.getElementById("btn-friends");
const btnBackMenu = document.getElementById("btn-back-menu");

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

function lsGet(key, def=0){
  const v = localStorage.getItem(key);
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function lsSet(key, val){
  localStorage.setItem(key, String(val));
}
function refreshScoreUI(){
  if(scoreEl) scoreEl.textContent = lsGet(LS_KEYS.SCORE, 0);
  if(streakEl) streakEl.textContent = lsGet(LS_KEYS.STREAK, 0);
}

function showScreen(name){
  Object.values(screens).forEach(s => s.classList.remove("active","state-win","state-lose"));
  screens[name].classList.add("active");
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

  const canGiveMore = gameState.mode === "random"
    && gameState.nextHintIdx < Math.min(MAX_HINTS, gameState.hints.length)
    && !gameState.over;

  btnHint.disabled = !canGiveMore;
  btnHint.classList.toggle("disabled", btnHint.disabled);

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
  // palabra
  wordEl.innerHTML = "";
  gameState.revealed.forEach(ch => {
    const span = document.createElement("span");
    span.className = "slot";
    span.textContent = ch === "_" ? "" : ch;
    wordEl.appendChild(span);
  });

  // usadas
  usedEl.textContent = gameState.used.size
    ? `Letras usadas: ${[...gameState.used].join(" ")}`
    : "";

  // errores
  mistakesEl.textContent = String(gameState.mistakes);
  maxMistakesEl.textContent = String(MAX_MISTAKES);

  // partes visibles
  parts.forEach((p, idx) => p.classList.toggle("visible", idx < gameState.mistakes));

  // teclas deshabilitadas
  document.querySelectorAll(".key").forEach(k => {
    const letter = k.getAttribute("data-letter");
    k.disabled = gameState.used.has(letter) || gameState.over;
  });

  // pistas UI
  renderHintUI();
}

function startGameWith(word, mode="random", hints=[]){
  const secret = normalizeLetters(word);
  if(!secret || secret.length < 2) throw new Error("La palabra debe tener al menos 2 letras.");

  // limpiar animaciones previas
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
    over: false
  };
  renderKeyboard();
  renderState();
  showScreen("game");
}

function hasWon(){ return gameState.revealed.join("") === gameState.secret; }
function hasLost(){ return gameState.mistakes >= MAX_MISTAKES; }

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

  if(hasWon()) showResult(true);
  else if(hasLost()) showResult(false);
}

/* ========= Pistas ========= */
function openHintModal(text){
  hintText.textContent = text || "Sin pista disponible.";
  hintModal.showModal();
}

function giveNextHint(){
  const maxAvail = Math.min(MAX_HINTS, gameState.hints.length);
  if(gameState.nextHintIdx >= maxAvail || gameState.over) return;

  const idx = gameState.nextHintIdx;
  const text = gameState.hints[idx] || "Sin pista disponible.";
  openHintModal(text);

  gameState.usedHintsIdx.push(idx);
  gameState.nextHintIdx++;
  renderHintUI();
}

/* ========= Estrellas, resultado y confetti ========= */
function computeStars(){
  const u = gameState.usedHintsIdx.length;
  return Math.max(0, 3 - u);
}

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
  // aparición escalonada
  requestAnimationFrame(() => {
    [...starsEl.children].forEach((el, idx) => {
      el.style.setProperty("--delay", `${idx*80}ms`);
      el.classList.add("bounce-in");
    });
  });
}

function endGameLock(){
  gameState.over = true;
  // deshabilitar teclado
  document.querySelectorAll(".key").forEach(k => k.disabled = true);
  // no más pistas
  renderHintUI();
}

function addPointsAndStreak(win, stars){
  let score = lsGet(LS_KEYS.SCORE, 0);
  let streak = lsGet(LS_KEYS.STREAK, 0);
  if(win){
    score += STAR_POINTS[stars]; // estrellas 0..3
    streak += 1;
  }else{
    streak = 0;
  }
  lsSet(LS_KEYS.SCORE, score);
  lsSet(LS_KEYS.STREAK, streak);
  refreshScoreUI();
  return {scoreGain: win ? STAR_POINTS[stars] : 0, streak};
}

function showConfetti(ms=1200){
  const ctx = confettiCanvas.getContext("2d");
  const cw = confettiCanvas.width = confettiCanvas.offsetWidth;
  const ch = confettiCanvas.height = confettiCanvas.offsetHeight;
  const parts = [];
  const colors = ["#fbbf24","#22c55e","#3b82f6","#ef4444","#a855f7"];

  for(let i=0;i<120;i++){
    parts.push({
      x: Math.random()*cw,
      y: -20 - Math.random()*ch*0.5,
      r: 2 + Math.random()*3,
      c: colors[(Math.random()*colors.length)|0],
      v: 1 + Math.random()*3,
      a: Math.random()*Math.PI*2
    });
  }
  let start = performance.now();
  function tick(t){
    const dt = t - start;
    ctx.clearRect(0,0,cw,ch);
    parts.forEach(p=>{
      p.y += p.v;
      p.x += Math.sin((p.y+p.a)/15);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    });
    if(dt < ms) requestAnimationFrame(tick);
    else ctx.clearRect(0,0,cw,ch);
  }
  requestAnimationFrame(tick);
}

function showResult(win){
  endGameLock();

  // trigger animación de fin
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
    renderStars(stars);
    showConfetti();
  }else{
    resultTitle.textContent = "Derrota 😵";
    resultExtra.textContent = `Pistas usadas: ${gameState.usedHintsIdx.length}`;
    resultMsg.textContent = `La palabra era: ${revealWord}`;
    resultPoints.innerHTML = `Esta vez no sumaste puntos · Racha reiniciada`;
    renderStars(0);
  }

  modal.showModal();
}

/* ========= Navegación / eventos ========= */
btnRandom.addEventListener("click", async () => {
  await loadWordsJSON();
  const pick = WORDS_DB[Math.floor(Math.random() * WORDS_DB.length)];
  startGameWith(pick.word, "random", pick.hints);
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

toggleVisibility.addEventListener("change", () => {
  inputSecret.type = toggleVisibility.checked ? "text" : "password";
});

setupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = inputSecret.value.trim();
  const normalized = normalizeLetters(raw);
  if(!normalized){
    setupError.textContent = "Ingresá solo letras (sin tildes, números ni símbolos).";
    return;
  }
  if(normalized.length < 2){
    setupError.textContent = "La palabra debe tener al menos 2 letras.";
    return;
  }
  startGameWith(normalized, "friends", []);
});

btnHint.addEventListener("click", giveNextHint);
btnCloseHint.addEventListener("click", () => hintModal.close());

btnPlayAgain.addEventListener("click", async () => {
  modal.close();
  if(gameState.mode === "random"){
    await loadWordsJSON();
    const pick = WORDS_DB[Math.floor(Math.random()*WORDS_DB.length)];
    startGameWith(pick.word, "random", pick.hints);
  }else{
    showScreen("setup");
  }
});
btnGoMenu.addEventListener("click", () => { modal.close(); showScreen("menu"); });

// Teclado físico (permanece igual)
window.addEventListener("keydown", (e) => {
  if(modal.open || hintModal.open) return;
  const tag = (document.activeElement && document.activeElement.tagName) || "";
  if(tag === "INPUT" || tag === "TEXTAREA") return;

  const key = e.key || "";
  const normalized = normalizeLetters(key);
  if(normalized.length === 1) handleGuess(normalized);
});

/* Inicialización */
refreshScoreUI();
renderKeyboard();
