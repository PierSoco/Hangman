/*  Ahorcado / Hangman – Vanilla JS
    Autor: Tú :)
    Estructura:
      - Estado y constantes
      - Utilidades
      - Navegación de pantallas
      - Lógica de juego (palabras aleatorias / con amigo)
      - Eventos de teclado físico y teclado en pantalla
*/

/* ========= Estado y constantes ========= */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_MISTAKES = 6; // cabeza, cuerpo, 2 brazos, 2 piernas => 6 intentos

// Lista simple y sin acentos para el modo aleatorio
const RANDOM_WORDS = [
  "GATO","PERRO","FARO","VENTANA","JUEGO","NUBE","LLAVE","CAMINO","PLANTA","BOTELLA",
  "CARRO","CASA","LUNA","SOL","RATON","LIBRO","SILLA","MESA","MONO","PIEDRA",
  "MAR","RIO","BOSQUE","CAMISA","ZAPATO","TEXTO","FUEGO","TIEMPO","FIESTA","PAN"
];

let gameState = {
  secret: "",           // palabra a adivinar en mayúsculas
  revealed: [],         // array de letras reveladas o guiones bajos
  used: new Set(),      // letras usadas
  mistakes: 0,
  mode: "random"        // "random" | "friends"
};

/* ========= Elementos del DOM ========= */
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

const mistakesEl = document.getElementById("mistakes");
const maxMistakesEl = document.getElementById("max-mistakes");

const modal = document.getElementById("result-modal");
const resultTitle = document.getElementById("result-title");
const resultMsg = document.getElementById("result-message");
const btnPlayAgain = document.getElementById("btn-play-again");
const btnGoMenu = document.getElementById("btn-go-menu");

const parts = [...document.querySelectorAll(".part")]; // Partes del ahorcado (SVG)

/* ========= Utilidades ========= */

/** Normaliza string: quita tildes/diéresis y deja solo A-Z */
function normalizeLetters(str){
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // elimina diacríticos
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/** Cambia de pantalla */
function showScreen(name){
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/** Crea teclado en pantalla accesible */
function renderKeyboard(){
  keyboardEl.innerHTML = "";
  ALPHABET.forEach(letter => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = letter;
    btn.className = "key";
    btn.setAttribute("data-letter", letter);
    btn.addEventListener("click", () => handleGuess(letter));
    keyboardEl.appendChild(btn);
  });
}

/** Refresca palabra, letras usadas y estado visual */
function renderState(){
  // Palabra revelada
  wordEl.innerHTML = "";
  gameState.revealed.forEach(ch => {
    const span = document.createElement("span");
    span.className = "slot";
    span.textContent = ch === "_" ? "" : ch;
    wordEl.appendChild(span);
  });

  // Letras usadas
  usedEl.textContent = gameState.used.size
    ? `Letras usadas: ${[...gameState.used].join(" ")}`
    : "";

  // Errores
  mistakesEl.textContent = String(gameState.mistakes);
  maxMistakesEl.textContent = String(MAX_MISTAKES);

  // Partes visibles según errores
  parts.forEach((p, idx) => {
    p.classList.toggle("visible", idx < gameState.mistakes);
  });

  // Deshabilitar teclas ya usadas
  document.querySelectorAll(".key").forEach(k => {
    const letter = k.getAttribute("data-letter");
    k.disabled = gameState.used.has(letter);
  });
}

/** Reinicia estado para una palabra dada */
function startGameWith(word, mode="random"){
  const secret = normalizeLetters(word);
  if(!secret || secret.length < 2){
    throw new Error("La palabra debe tener al menos 2 letras.");
  }
  gameState = {
    secret,
    revealed: Array.from(secret, ch => (ch === "-" ? "-" : "_")),
    used: new Set(),
    mistakes: 0,
    mode
  };
  renderKeyboard();
  renderState();
  showScreen("game");
}

/** Comprueba si ganó */
function hasWon(){
  return gameState.revealed.join("") === gameState.secret;
}
/** Comprueba si perdió */
function hasLost(){
  return gameState.mistakes >= MAX_MISTAKES;
}

/** Maneja un intento de letra */
function handleGuess(rawLetter){
  const letter = normalizeLetters(rawLetter);
  if(!letter) return;

  if(gameState.used.has(letter)) return; // ya usada
  gameState.used.add(letter);

  // ¿Existe en la palabra?
  if(gameState.secret.includes(letter)){
    for(let i=0;i<gameState.secret.length;i++){
      if(gameState.secret[i] === letter){
        gameState.revealed[i] = letter;
      }
    }
  }else{
    gameState.mistakes++;
  }

  renderState();

  if(hasWon()){
    showResult(true);
  }else if(hasLost()){
    showResult(false);
  }
}

/** Muestra modal de resultado */
function showResult(win){
  resultTitle.textContent = win ? "¡Ganaste! 🎉" : "Derrota 😵";
  const revealWord = gameState.secret.split("").join(" ");
  resultMsg.textContent = win
    ? `Adivinaste la palabra: ${revealWord}`
    : `La palabra era: ${revealWord}`;
  modal.showModal();
}

/* ========= Navegación ========= */
btnRandom.addEventListener("click", () => {
  const word = RANDOM_WORDS[Math.floor(Math.random()*RANDOM_WORDS.length)];
  startGameWith(word, "random");
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
  showScreen("menu");
});
btnSetupBack.addEventListener("click", () => showScreen("menu"));

/* Setup amigo */
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
  startGameWith(normalized, "friends");
});

/* ========= Modal acciones ========= */
btnPlayAgain.addEventListener("click", () => {
  modal.close();
  if(gameState.mode === "random"){
    const word = RANDOM_WORDS[Math.floor(Math.random()*RANDOM_WORDS.length)];
    startGameWith(word, "random");
  }else{
    // En modo amigo, regresar a ingresar nueva palabra
    showScreen("setup");
  }
});
btnGoMenu.addEventListener("click", () => {
  modal.close();
  showScreen("menu");
});

/* ========= Teclado físico ========= */
window.addEventListener("keydown", (e) => {
  // Ignorar si modal abierto o si estamos en el form de setup escribiendo
  if(modal.open) return;
  const tag = (document.activeElement && document.activeElement.tagName) || "";
  if(tag === "INPUT" || tag === "TEXTAREA") return;

  const key = e.key || "";
  const normalized = normalizeLetters(key);
  if(normalized.length === 1){
    handleGuess(normalized);
  }
});

/* Render inicial */
renderKeyboard();
