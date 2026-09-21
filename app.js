const STORAGE_KEY = "skillTreeAppProgressV03";

const DEFAULT_PROGRESS = {
  pushupMax: 0,
  pushupTotal: 0,
  pushupStreak: 0,
  lastTrainingDate: null,
  trainingHistory: []
};

// Unsere bisherige Rangfolge + die schon geplanten nächsten Ränge.
const RANKS = [
  { name: "Start", target: 0 },
  { name: "Holz", target: 5 },
  { name: "Stein", target: 10 },
  { name: "Eisen", target: 20 },
  { name: "Gold", target: 30 },
  { name: "Kristall", target: 50 },
  { name: "Diamant", target: 75 },
  { name: "Meister", target: 100 }
];

// Ein bewusst einfacher "hässlicher" Testbaum.
// x/y sind Pixelpositionen im 650x650-Baum.
const SKILL_NODES = [
  { id: "start", type: "start", label: "Start", target: 0, x: 269, y: 530 },

  { id: "wood", type: "max", label: "Holz", target: 5, x: 269, y: 410, parent: "start" },
  { id: "stone", type: "max", label: "Stein", target: 10, x: 145, y: 300, parent: "wood" },
  { id: "iron", type: "max", label: "Eisen", target: 20, x: 393, y: 300, parent: "wood" },
  { id: "gold", type: "max", label: "Gold", target: 30, x: 269, y: 190, parent: "stone" },
  { id: "crystal", type: "max", label: "Kristall", target: 50, x: 269, y: 70, parent: "gold" },

  { id: "total50", type: "total", label: "Gesamt", target: 50, x: 22, y: 190, parent: "stone" },
  { id: "total100", type: "total", label: "Gesamt", target: 100, x: 22, y: 70, parent: "total50" },

  { id: "streak2", type: "streak", label: "Serie", target: 2, x: 516, y: 190, parent: "iron" },
  { id: "streak3", type: "streak", label: "Serie", target: 3, x: 516, y: 70, parent: "streak2" }
];

let progress = loadProgress();
let cameraStream = null;
let workoutStartedAt = null;
let timerInterval = null;
let elapsedSeconds = 0;
let cameraWasStarted = false;

// ---------- DOM ----------
const skillTree = document.getElementById("skillTree");
const maxStat = document.getElementById("maxStat");
const totalStat = document.getElementById("totalStat");
const streakStat = document.getElementById("streakStat");
const rankStat = document.getElementById("rankStat");

const trainingModal = document.getElementById("trainingModal");
const exerciseStep = document.getElementById("exerciseStep");
const cameraStep = document.getElementById("cameraStep");
const resultStep = document.getElementById("resultStep");
const successStep = document.getElementById("successStep");
const trainingTitle = document.getElementById("trainingTitle");
const backBtn = document.getElementById("backBtn");

const cameraVideo = document.getElementById("cameraVideo");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const cameraStatus = document.getElementById("cameraStatus");
const timerOverlay = document.getElementById("timerOverlay");
const timerDisplay = document.getElementById("timerDisplay");
const finalTime = document.getElementById("finalTime");
const repInput = document.getElementById("repInput");
const successDetails = document.getElementById("successDetails");

const startCameraBtn = document.getElementById("startCameraBtn");
const continueWithoutCameraBtn = document.getElementById("continueWithoutCameraBtn");
const startWorkoutBtn = document.getElementById("startWorkoutBtn");
const finishWorkoutBtn = document.getElementById("finishWorkoutBtn");

// ---------- Daten ----------
function loadProgress() {
  const saved = safeReadJson(STORAGE_KEY);
  if (saved) return normalizeProgress(saved);

  // Migration: v0.2 hatte bereits pushupMax / pushupTotal / pushupStreak.
  // Falls der genaue alte Key anders hieß, suchen wir einmal nach einem passenden Objekt.
  const possibleKeys = ["skillTreeProgress", "skillTreeAppProgress", "progress"];

  for (const key of possibleKeys) {
    const candidate = safeReadJson(key);
    if (looksLikeOldProgress(candidate)) {
      const migrated = normalizeProgress(candidate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key === STORAGE_KEY) continue;

    const candidate = safeReadJson(key);
    if (looksLikeOldProgress(candidate)) {
      const migrated = normalizeProgress(candidate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  }

  return { ...DEFAULT_PROGRESS, trainingHistory: [] };
}

function safeReadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function looksLikeOldProgress(value) {
  return !!value &&
    typeof value === "object" &&
    (
      "pushupMax" in value ||
      "pushupTotal" in value ||
      "pushupStreak" in value ||
      "lastTrainingDate" in value
    );
}

function normalizeProgress(value) {
  return {
    pushupMax: Math.max(0, Number(value?.pushupMax) || 0),
    pushupTotal: Math.max(0, Number(value?.pushupTotal) || 0),
    pushupStreak: Math.max(0, Number(value?.pushupStreak) || 0),
    lastTrainingDate: value?.lastTrainingDate || null,
    trainingHistory: Array.isArray(value?.trainingHistory) ? value.trainingHistory : []
  };
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ---------- UI / Tree ----------
function render() {
  maxStat.textContent = progress.pushupMax;
  totalStat.textContent = progress.pushupTotal;
  streakStat.textContent = progress.pushupStreak;
  rankStat.textContent = getRank(progress.pushupMax).name;
  renderTree();
}

function getRank(maxReps) {
  return RANKS.reduce((current, rank) => {
    return maxReps >= rank.target ? rank : current;
  }, RANKS[0]);
}

function nodeValue(node) {
  if (node.type === "max") return progress.pushupMax;
  if (node.type === "total") return progress.pushupTotal;
  if (node.type === "streak") return progress.pushupStreak;
  return Infinity;
}

function isNodeDone(node) {
  if (node.type === "start") return true;
  return nodeValue(node) >= node.target;
}

function isNodeAvailable(node) {
  if (!node.parent) return true;
  const parent = SKILL_NODES.find(n => n.id === node.parent);
  return parent ? isNodeDone(parent) : true;
}

function renderTree() {
  skillTree.innerHTML = "";

  // Linien zuerst
  SKILL_NODES.forEach(node => {
    if (!node.parent) return;
    const parent = SKILL_NODES.find(n => n.id === node.parent);
    if (!parent) return;

    const line = createConnector(parent, node);
    if (isNodeDone(parent) && isNodeDone(node)) {
      line.classList.add("done");
    }
    skillTree.appendChild(line);
  });

  // Dann Hexagons
  SKILL_NODES.forEach(node => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "skill-node";
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;

    const done = isNodeDone(node);
    const available = isNodeAvailable(node);

    if (done) element.classList.add("done");
    else if (available) element.classList.add("next");
    else element.classList.add("locked");

    const unit =
      node.type === "total" ? "gesamt" :
      node.type === "streak" ? "Tage" :
      node.type === "start" ? "" :
      "am Stück";

    element.innerHTML = `
      <span class="node-rank">${node.label}</span>
      <span class="node-target">${node.type === "start" ? "✓" : node.target}</span>
      <span class="node-label">${unit}</span>
    `;

    element.addEventListener("click", () => {
      const current =
        node.type === "max" ? progress.pushupMax :
        node.type === "total" ? progress.pushupTotal :
        node.type === "streak" ? progress.pushupStreak :
        0;

      if (node.type === "start") {
        alert("Startpunkt deines Push-up Skill Trees.");
      } else {
        alert(`${node.label}: Ziel ${node.target} ${unit}.\nAktuell: ${current}.`);
      }
    });

    skillTree.appendChild(element);
  });
}

function createConnector(from, to) {
  const line = document.createElement("div");
  line.className = "connector";

  const nodeW = 112;
  const nodeH = 98;

  const x1 = from.x + nodeW / 2;
  const y1 = from.y + nodeH / 2;
  const x2 = to.x + nodeW / 2;
  const y2 = to.y + nodeH / 2;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  line.style.left = `${x1}px`;
  line.style.top = `${y1}px`;
  line.style.width = `${length}px`;
  line.style.transform = `rotate(${angle}deg)`;

  return line;
}

// ---------- Modal / Steps ----------
function showStep(stepName) {
  [exerciseStep, cameraStep, resultStep, successStep].forEach(el => el.classList.add("hidden"));

  if (stepName === "exercise") {
    exerciseStep.classList.remove("hidden");
    trainingTitle.textContent = "Übung auswählen";
    backBtn.classList.add("hidden");
  }

  if (stepName === "camera") {
    cameraStep.classList.remove("hidden");
    trainingTitle.textContent = "Push-up Training";
    backBtn.classList.remove("hidden");
  }

  if (stepName === "result") {
    resultStep.classList.remove("hidden");
    trainingTitle.textContent = "Training eintragen";
    backBtn.classList.remove("hidden");
  }

  if (stepName === "success") {
    successStep.classList.remove("hidden");
    trainingTitle.textContent = "Fertig";
    backBtn.classList.add("hidden");
  }
}

function openTraining() {
  resetTrainingSession();
  trainingModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  showStep("exercise");
}

function closeTraining() {
  stopCamera();
  stopTimer();
  trainingModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function resetTrainingSession() {
  stopCamera();
  stopTimer();
  workoutStartedAt = null;
  elapsedSeconds = 0;
  cameraWasStarted = false;
  repInput.value = "";
  timerDisplay.textContent = "00:00";
  finalTime.textContent = "00:00";
  cameraPlaceholder.classList.remove("hidden");
  timerOverlay.classList.add("hidden");
  startCameraBtn.classList.remove("hidden");
  continueWithoutCameraBtn.classList.remove("hidden");
  startWorkoutBtn.classList.add("hidden");
  finishWorkoutBtn.classList.add("hidden");
  cameraStatus.textContent = "Starte zuerst die Kamera. Danach kannst du das Training beginnen.";
}

// ---------- Kamera ----------
async function startCamera() {
  cameraStatus.textContent = "Kamera wird geöffnet …";

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = "Dieser Browser unterstützt den Kamerazugriff hier nicht. Du kannst trotzdem ohne Kamera trainieren.";
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 1280 }
      },
      audio: false
    });

    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();

    cameraWasStarted = true;
    cameraPlaceholder.classList.add("hidden");
    startCameraBtn.classList.add("hidden");
    continueWithoutCameraBtn.classList.add("hidden");
    startWorkoutBtn.classList.remove("hidden");
    cameraStatus.textContent = "Kamera läuft. Stelle das Handy so auf, dass dein Körper später möglichst vollständig zu sehen ist.";
  } catch (error) {
    console.error("Kamera konnte nicht gestartet werden:", error);
    cameraStatus.textContent = "Kamerazugriff wurde nicht erlaubt oder ist nicht verfügbar. Du kannst ohne Kamera weitermachen.";
  }
}

function continueWithoutCamera() {
  stopCamera();
  cameraWasStarted = false;
  startCameraBtn.classList.add("hidden");
  continueWithoutCameraBtn.classList.add("hidden");
  startWorkoutBtn.classList.remove("hidden");
  cameraStatus.textContent = "Manueller Modus. Starte das Training und trage die Wiederholungen anschließend selbst ein.";
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }
  cameraStream = null;
  cameraVideo.srcObject = null;
}

// ---------- Timer ----------
function startWorkout() {
  workoutStartedAt = Date.now();
  elapsedSeconds = 0;

  startWorkoutBtn.classList.add("hidden");
  finishWorkoutBtn.classList.remove("hidden");
  timerOverlay.classList.remove("hidden");
  cameraStatus.textContent = "Training läuft. In v0.3 zählt die App die Wiederholungen noch nicht automatisch.";

  updateTimer();
  timerInterval = window.setInterval(updateTimer, 250);
}

function updateTimer() {
  if (!workoutStartedAt) return;
  elapsedSeconds = Math.floor((Date.now() - workoutStartedAt) / 1000);
  timerDisplay.textContent = formatTime(elapsedSeconds);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function finishWorkout() {
  updateTimer();
  stopTimer();
  stopCamera();

  finalTime.textContent = formatTime(elapsedSeconds);
  showStep("result");

  setTimeout(() => repInput.focus(), 50);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

// ---------- Training speichern ----------
function saveTrainingResult() {
  const reps = Math.floor(Number(repInput.value));

  if (!Number.isFinite(reps) || reps < 0) {
    alert("Bitte gib eine gültige Wiederholungszahl ein.");
    return;
  }

  if (reps === 0) {
    const confirmZero = confirm("0 Wiederholungen speichern?");
    if (!confirmZero) return;
  }

  const oldMax = progress.pushupMax;
  const oldRank = getRank(oldMax);
  const oldStreak = progress.pushupStreak;

  const today = localDateString(new Date());
  const newStreak = calculateStreak(progress.lastTrainingDate, today, progress.pushupStreak);

  progress.pushupMax = Math.max(progress.pushupMax, reps);
  progress.pushupTotal += reps;
  progress.pushupStreak = newStreak;
  progress.lastTrainingDate = today;

  progress.trainingHistory.unshift({
    exercise: "pushups",
    reps,
    durationSeconds: elapsedSeconds,
    date: new Date().toISOString(),
    usedCamera: cameraWasStarted
  });

  // Damit localStorage nicht irgendwann unendlich wächst.
  progress.trainingHistory = progress.trainingHistory.slice(0, 200);

  saveProgress();
  render();

  const newRank = getRank(progress.pushupMax);
  const isNewRecord = reps > oldMax;
  const rankUp = newRank.name !== oldRank.name;

  successDetails.innerHTML = "";

  addSuccessLine(`${reps} Push-ups gespeichert`);
  addSuccessLine(`Gesamt: ${progress.pushupTotal} Push-ups`);

  if (isNewRecord) {
    addSuccessLine(`🏆 Neuer Rekord: ${progress.pushupMax}`, true);
  } else {
    addSuccessLine(`Rekord bleibt bei ${progress.pushupMax}`);
  }

  if (rankUp) {
    addSuccessLine(`⬆️ Neuer Rang: ${newRank.name}`, true);
  } else {
    addSuccessLine(`Rang: ${newRank.name}`);
  }

  if (newStreak > oldStreak) {
    addSuccessLine(`🔥 Trainingsserie: ${newStreak} Tage`, true);
  } else {
    addSuccessLine(`Trainingsserie: ${newStreak} Tage`);
  }

  showStep("success");
}

function addSuccessLine(text, good = false) {
  const line = document.createElement("div");
  line.className = `success-line${good ? " good" : ""}`;
  line.textContent = text;
  successDetails.appendChild(line);
}

function calculateStreak(lastDate, today, currentStreak) {
  if (!lastDate) return 1;
  if (lastDate === today) return Math.max(1, currentStreak);

  const last = parseLocalDate(lastDate);
  const now = parseLocalDate(today);
  const diffDays = Math.round((now - last) / 86400000);

  if (diffDays === 1) return Math.max(1, currentStreak) + 1;
  return 1;
}

function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ---------- Events ----------
document.getElementById("openTrainingBtn").addEventListener("click", openTraining);
document.getElementById("closeTrainingBtn").addEventListener("click", closeTraining);

document.querySelector('[data-exercise="pushups"]').addEventListener("click", () => {
  showStep("camera");
});

backBtn.addEventListener("click", () => {
  if (!resultStep.classList.contains("hidden")) {
    showStep("camera");
    return;
  }

  stopCamera();
  stopTimer();
  showStep("exercise");
});

startCameraBtn.addEventListener("click", startCamera);
continueWithoutCameraBtn.addEventListener("click", continueWithoutCamera);
startWorkoutBtn.addEventListener("click", startWorkout);
finishWorkoutBtn.addEventListener("click", finishWorkout);
document.getElementById("saveTrainingBtn").addEventListener("click", saveTrainingResult);

document.getElementById("doneBtn").addEventListener("click", () => {
  closeTraining();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  const ok = confirm("Wirklich alle Testdaten dieser v0.3 löschen?");
  if (!ok) return;

  localStorage.removeItem(STORAGE_KEY);
  progress = { ...DEFAULT_PROGRESS, trainingHistory: [] };
  render();
});

// Falls die Seite im Hintergrund landet, Kamera freigeben.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && cameraStream && !workoutStartedAt) {
    stopCamera();
  }
});

render();
