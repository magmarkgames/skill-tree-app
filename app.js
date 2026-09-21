import {
  FaceDetector,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm";

const STORAGE_KEY = "skillTreeAppProgressV06";
const OLD_STORAGE_KEYS = [
  "skillTreeAppProgressV05",
  "skillTreeAppProgressV041",
  "skillTreeAppProgressV04",
  "skillTreeAppProgressV03",
  "skillTreeProgress",
  "skillTreeAppProgress",
  "progress"
];

const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

const QUICK_CONFIG = {
  // Schnelleres Tracking für zügige Wiederholungen.
  detectIntervalMs: 34,
  minDetectionConfidence: 0.46,

  // Setup bleibt bewusst großzügig.
  readyMinMetric: 0.095,
  readyMaxMetric: 0.52,
  readyMinCenterX: 0.12,
  readyMaxCenterX: 0.88,
  readyMinCenterY: 0.08,
  readyMaxCenterY: 0.92,

  // Weniger Weg nötig, damit schnelle Push-ups nicht am Schwellenwert hängen bleiben.
  downRatio: 1.18,
  upRatio: 1.09,
  minDownDelta: 0.024,

  // Ein guter Frame reicht pro Zustand; die Phase verhindert Doppelzählungen.
  stableFrames: 1,
  minRepIntervalMs: 330,

  // Wenn das Gesicht unten aus dem Bild verschwindet, ist das jetzt erlaubt.
  faceLossGraceMs: 950,
  hardResetLossMs: 2200,
  inferDownAfterLossMs: 90,
  inferDownMinRatio: 1.055,

  // Reagiert deutlich schneller als v0.5.
  metricSmoothing: 0.58,
  baselineAdaptation: 0.01
};

const DEFAULT_PROGRESS = {
  pushupMax: 0,
  pushupTotal: 0,
  pushupStreak: 0,
  lastTrainingDate: null,
  trainingHistory: []
};

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
let faceDetector = null;
let faceDetectorLoading = null;
let detectionFrameId = null;
let lastDetectionAt = 0;
let lastVideoTime = -1;

let currentFace = null;
let smoothedMetric = null;
let lastFaceSeenAt = 0;
let goodPositionSince = 0;
let readyForCountdown = false;

let workoutStartedAt = null;
let timerInterval = null;
let elapsedSeconds = 0;
let workoutActive = false;
let cameraWasStarted = false;
let manualMode = false;
let countdownActive = false;

let repCount = 0;
let phase = "up";
let baselineTopMetric = null;
let downThreshold = null;
let upThreshold = null;
let downFrames = 0;
let upFrames = 0;
let calibrationSamples = [];
let lastMetric = null;
let maxMetricSinceTop = null;
let inferredBottomFromLoss = false;
let lastRepAt = 0;

// ---------- DOM ----------
const skillTree = document.getElementById("skillTree");
const maxStat = document.getElementById("maxStat");
const totalStat = document.getElementById("totalStat");
const streakStat = document.getElementById("streakStat");
const rankStat = document.getElementById("rankStat");

const trainingModal = document.getElementById("trainingModal");
const exerciseStep = document.getElementById("exerciseStep");
const quickStep = document.getElementById("quickStep");
const resultStep = document.getElementById("resultStep");
const successStep = document.getElementById("successStep");
const trainingTitle = document.getElementById("trainingTitle");
const backBtn = document.getElementById("backBtn");

const cameraVideo = document.getElementById("cameraVideo");
const liveRepCount = document.getElementById("liveRepCount");
const timerDisplay = document.getElementById("timerDisplay");
const motionCue = document.getElementById("motionCue");
const positionStatus = document.getElementById("positionStatus");
const positionEmoji = document.getElementById("positionEmoji");
const positionTitle = document.getElementById("positionTitle");
const positionHint = document.getElementById("positionHint");
const cameraStatus = document.getElementById("cameraStatus");
const countdownBox = document.getElementById("countdownBox");
const countdownNumber = document.getElementById("countdownNumber");

const startCameraBtn = document.getElementById("startCameraBtn");
const startWorkoutBtn = document.getElementById("startWorkoutBtn");
const finishWorkoutBtn = document.getElementById("finishWorkoutBtn");
const manualModeBtn = document.getElementById("manualModeBtn");

const finalTime = document.getElementById("finalTime");
const detectedResult = document.getElementById("detectedResult");
const repInput = document.getElementById("repInput");
const successDetails = document.getElementById("successDetails");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const manualRepWrap = document.getElementById("manualRepWrap");
const autoResultNote = document.getElementById("autoResultNote");
const resultRepLabel = document.getElementById("resultRepLabel");

// ---------- Daten ----------
function loadProgress() {
  const current = safeReadJson(STORAGE_KEY);
  if (current) return normalizeProgress(current);

  for (const key of OLD_STORAGE_KEYS) {
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
  return !!value && typeof value === "object" && (
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

// ---------- Skill Tree ----------
function render() {
  maxStat.textContent = progress.pushupMax;
  totalStat.textContent = progress.pushupTotal;
  streakStat.textContent = progress.pushupStreak;
  rankStat.textContent = getRank(progress.pushupMax).name;
  renderTree();
  renderHistory();
}

function getRank(maxReps) {
  return RANKS.reduce((current, rank) => maxReps >= rank.target ? rank : current, RANKS[0]);
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

  SKILL_NODES.forEach(node => {
    if (!node.parent) return;
    const parent = SKILL_NODES.find(n => n.id === node.parent);
    if (!parent) return;
    const line = createConnector(parent, node);
    if (isNodeDone(parent) && isNodeDone(node)) line.classList.add("done");
    skillTree.appendChild(line);
  });

  SKILL_NODES.forEach(node => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "skill-node";
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;

    const done = isNodeDone(node);
    const available = isNodeAvailable(node);
    if (done) el.classList.add("done");
    else if (available) el.classList.add("next");
    else el.classList.add("locked");

    const unit = node.type === "total" ? "gesamt" : node.type === "streak" ? "Tage" : node.type === "start" ? "" : "am Stück";

    el.innerHTML = `
      <span class="node-rank">${node.label}</span>
      <span class="node-target">${node.type === "start" ? "✓" : node.target}</span>
      <span class="node-label">${unit}</span>
    `;

    el.addEventListener("click", () => {
      const current = node.type === "max" ? progress.pushupMax : node.type === "total" ? progress.pushupTotal : node.type === "streak" ? progress.pushupStreak : 0;
      if (node.type === "start") alert("Startpunkt deines Push-up Skill Trees.");
      else alert(`${node.label}: Ziel ${node.target} ${unit}.\nAktuell: ${current}.`);
    });

    skillTree.appendChild(el);
  });
}


function renderHistory() {
  const items = Array.isArray(progress.trainingHistory)
    ? progress.trainingHistory.slice(0, 30)
    : [];

  historyCount.textContent = `${items.length} ${items.length === 1 ? "Training" : "Trainings"}`;
  historyList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "Noch kein Training gespeichert.";
    historyList.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const entry = document.createElement("div");
    entry.className = "history-entry";

    const main = document.createElement("div");
    main.className = "history-entry-main";

    const when = document.createElement("strong");
    when.textContent = formatWorkoutDate(item.date);

    const details = document.createElement("span");
    const duration = Number.isFinite(Number(item.durationSeconds))
      ? formatTime(Math.max(0, Number(item.durationSeconds)))
      : "–";
    const mode = String(item.mode || "").startsWith("face-quick")
      ? "Quick Mode"
      : "Manuell";
    details.textContent = `${mode} · ${duration}`;

    main.append(when, details);

    const reps = document.createElement("div");
    reps.className = "history-entry-reps";
    const count = Math.max(0, Number(item.reps) || 0);
    reps.textContent = `${count} Push-up${count === 1 ? "" : "s"}`;

    entry.append(main, reps);
    historyList.appendChild(entry);
  });
}

function formatWorkoutDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unbekanntes Datum";

  const now = new Date();
  const today = localDateString(now);
  const itemDay = localDateString(date);

  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = localDateString(yesterdayDate);

  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

  if (itemDay === today) return `Heute, ${time} Uhr`;
  if (itemDay === yesterday) return `Gestern, ${time} Uhr`;

  const datePart = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);

  return `${datePart}, ${time} Uhr`;
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
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  line.style.left = `${x1}px`;
  line.style.top = `${y1}px`;
  line.style.width = `${length}px`;
  line.style.transform = `rotate(${angle}deg)`;
  return line;
}

// ---------- Modal ----------
function showStep(stepName) {
  [exerciseStep, quickStep, resultStep, successStep].forEach(el => el.classList.add("hidden"));

  if (stepName === "exercise") {
    exerciseStep.classList.remove("hidden");
    trainingTitle.textContent = "Übung auswählen";
    backBtn.classList.add("hidden");
  }
  if (stepName === "quick") {
    quickStep.classList.remove("hidden");
    trainingTitle.textContent = "Push-up Quick Mode";
    backBtn.classList.remove("hidden");
  }
  if (stepName === "result") {
    resultStep.classList.remove("hidden");
    trainingTitle.textContent = "Training prüfen";
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
  workoutActive = false;
  countdownActive = false;
  stopTimer();
  stopDetectionLoop();
  stopCamera();
  trainingModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function resetTrainingSession() {
  workoutActive = false;
  countdownActive = false;
  manualMode = false;
  cameraWasStarted = false;
  stopTimer();
  stopDetectionLoop();
  stopCamera();

  currentFace = null;
  smoothedMetric = null;
  lastFaceSeenAt = 0;
  goodPositionSince = 0;
  readyForCountdown = false;
  lastVideoTime = -1;
  lastDetectionAt = 0;

  workoutStartedAt = null;
  elapsedSeconds = 0;
  repCount = 0;
  phase = "up";
  baselineTopMetric = null;
  downThreshold = null;
  upThreshold = null;
  downFrames = 0;
  upFrames = 0;
  calibrationSamples = [];
  lastMetric = null;
  maxMetricSinceTop = null;
  inferredBottomFromLoss = false;
  lastRepAt = 0;

  liveRepCount.textContent = "0";
  timerDisplay.textContent = "00:00";
  motionCue.textContent = "Handy hinlegen und Kamera starten";
  finalTime.textContent = "00:00";
  detectedResult.textContent = "–";
  repInput.value = "";

  startCameraBtn.classList.remove("hidden");
  startCameraBtn.disabled = false;
  startCameraBtn.textContent = "Kamera starten";
  startWorkoutBtn.classList.add("hidden");
  startWorkoutBtn.disabled = true;
  finishWorkoutBtn.classList.add("hidden");
  manualModeBtn.classList.remove("hidden");
  countdownBox.classList.add("hidden");

  setPositionStatus("neutral", "⬜", "Kamera noch nicht aktiv", "Display nach oben, ungefähr unter bzw. leicht vor deinem Gesicht.");
  cameraStatus.textContent = "Kein Kamerabild auf dem Screen: Die Zahl und die Position-Ampel haben Vorrang.";
}

// ---------- Face Detector ----------
async function initFaceDetector() {
  if (faceDetector) return faceDetector;
  if (faceDetectorLoading) return faceDetectorLoading;

  faceDetectorLoading = (async () => {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);

    const commonOptions = {
      runningMode: "VIDEO",
      minDetectionConfidence: QUICK_CONFIG.minDetectionConfidence,
      minSuppressionThreshold: 0.3
    };

    try {
      faceDetector = await FaceDetector.createFromOptions(vision, {
        ...commonOptions,
        baseOptions: {
          modelAssetPath: FACE_MODEL,
          delegate: "GPU"
        }
      });
    } catch (gpuError) {
      console.warn("GPU nicht verfügbar, nutze CPU:", gpuError);
      faceDetector = await FaceDetector.createFromOptions(vision, {
        ...commonOptions,
        baseOptions: {
          modelAssetPath: FACE_MODEL,
          delegate: "CPU"
        }
      });
    }

    return faceDetector;
  })();

  try {
    return await faceDetectorLoading;
  } finally {
    faceDetectorLoading = null;
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setPositionStatus("bad", "🟥", "Kamera nicht verfügbar", "Du kannst unten in den manuellen Modus wechseln.");
    return;
  }

  startCameraBtn.disabled = true;
  startCameraBtn.textContent = "Wird geladen …";
  cameraStatus.textContent = "Frontkamera und Gesichtserkennung werden gestartet …";

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    const track = cameraStream.getVideoTracks()[0];

    // Wenn das Gerät einen echten Zoom-Regler anbietet, nutzen wir den kleinsten Zoom.
    // Das reduziert unnötiges digitales Reinzoomen auf unterstützten Smartphones.
    try {
      const caps = track.getCapabilities?.();
      if (caps?.zoom && Number.isFinite(caps.zoom.min)) {
        await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min }] });
      }
    } catch (zoomError) {
      console.info("Minimaler Kamera-Zoom konnte nicht gesetzt werden:", zoomError);
    }

    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    cameraWasStarted = true;

    setPositionStatus("warn", "🟨", "Erkennung wird geladen", "Bleib kurz über dem Handy.");
    await initFaceDetector();

    startCameraBtn.classList.add("hidden");
    startWorkoutBtn.classList.remove("hidden");
    manualModeBtn.classList.add("hidden");
    cameraStatus.textContent = "Leg das Handy flach hin. Sobald die Ampel grün ist, kannst du direkt den 3‑Sekunden-Countdown starten.";
    motionCue.textContent = "Bring dein Gesicht über das Handy";

    startDetectionLoop();
  } catch (error) {
    console.error("Kamera/FaceDetector konnte nicht gestartet werden:", error);
    setPositionStatus("bad", "🟥", "Kamera konnte nicht gestartet werden", "Berechtigung prüfen oder manuellen Modus verwenden.");
    cameraStatus.textContent = "Kamerazugriff wurde nicht erlaubt oder die Gesichtserkennung konnte nicht geladen werden.";
    startCameraBtn.disabled = false;
    startCameraBtn.textContent = "Kamera erneut versuchen";
  }
}

function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
}

function startDetectionLoop() {
  stopDetectionLoop();

  const loop = now => {
    detectFaceFrame(now);
    detectionFrameId = requestAnimationFrame(loop);
  };

  detectionFrameId = requestAnimationFrame(loop);
}

function stopDetectionLoop() {
  if (detectionFrameId) cancelAnimationFrame(detectionFrameId);
  detectionFrameId = null;
}

function detectFaceFrame(now) {
  if (!faceDetector || !cameraStream || cameraVideo.readyState < 2) return;
  if (now - lastDetectionAt < QUICK_CONFIG.detectIntervalMs) return;
  if (cameraVideo.currentTime === lastVideoTime) return;

  lastDetectionAt = now;
  lastVideoTime = cameraVideo.currentTime;

  try {
    const result = faceDetector.detectForVideo(cameraVideo, now);
    processFaceResult(result, now);
  } catch (error) {
    console.error("Face detection error:", error);
  }
}

function processFaceResult(result, now) {
  const detections = Array.isArray(result?.detections) ? result.detections : [];

  if (!detections.length) {
    handleFaceLoss(now);
    return;
  }

  // Höchste Confidence verwenden.
  const detection = [...detections].sort((a, b) => {
    const aScore = a?.categories?.[0]?.score ?? 0;
    const bScore = b?.categories?.[0]?.score ?? 0;
    return bScore - aScore;
  })[0];

  const box = detection?.boundingBox;
  if (!box || !cameraVideo.videoWidth || !cameraVideo.videoHeight) {
    handleFaceLoss(now);
    return;
  }

  const frameW = cameraVideo.videoWidth;
  const frameH = cameraVideo.videoHeight;
  const normW = clamp(box.width / frameW, 0, 1);
  const normH = clamp(box.height / frameH, 0, 1);
  const centerX = clamp((box.originX + box.width / 2) / frameW, 0, 1);
  const centerY = clamp((box.originY + box.height / 2) / frameH, 0, 1);
  const rawMetric = Math.sqrt(Math.max(0.000001, normW * normH));

  smoothedMetric = smoothedMetric === null
    ? rawMetric
    : smoothedMetric * (1 - QUICK_CONFIG.metricSmoothing) + rawMetric * QUICK_CONFIG.metricSmoothing;

  currentFace = {
    metric: smoothedMetric,
    centerX,
    centerY,
    confidence: detection?.categories?.[0]?.score ?? 0
  };

  lastMetric = currentFace.metric;
  if (workoutActive && phase === "up") {
    maxMetricSinceTop = maxMetricSinceTop === null
      ? currentFace.metric
      : Math.max(maxMetricSinceTop, currentFace.metric);
  }

  lastFaceSeenAt = now;

  if (countdownActive) {
    if (isFaceReady(currentFace)) calibrationSamples.push(currentFace.metric);
    return;
  }

  if (!workoutActive) {
    updateSetupGuidance(currentFace, now);
    return;
  }

  updateRepState(currentFace.metric, now);
}

function handleFaceLoss(now) {
  const lostFor = lastFaceSeenAt ? now - lastFaceSeenAt : Infinity;

  if (countdownActive) {
    if (lostFor <= 450) {
      setPositionStatus("warn", "🟨", "Kurz verloren", "Oben bleiben – ich suche dein Gesicht wieder.");
      return;
    }

    setPositionStatus("bad", "🟥", "Gesicht verloren", "Bleib während des Countdowns oben über dem Handy.");
    return;
  }

  if (!workoutActive) {
    readyForCountdown = false;
    startWorkoutBtn.disabled = true;
    goodPositionSince = 0;
    setPositionStatus("bad", "🟥", "Gesicht nicht erkannt", "Beug dich etwas über das Handy oder schieb es näher zu deinem Gesicht.");
    motionCue.textContent = "Gesicht ins Blickfeld bringen";
    return;
  }

  // Während des Trainings ist ein verschwundenes Gesicht unten NICHT mehr automatisch ein Fehler.
  // Bei schnellen Push-ups verlässt das Gesicht die Short-Range-Erkennung oft genau in der tiefen Position.
  if (phase === "up") {
    const descentWasVisible =
      Number.isFinite(maxMetricSinceTop) &&
      Number.isFinite(baselineTopMetric) &&
      maxMetricSinceTop >= baselineTopMetric * QUICK_CONFIG.inferDownMinRatio;

    if (
      descentWasVisible &&
      lostFor >= QUICK_CONFIG.inferDownAfterLossMs &&
      lostFor <= QUICK_CONFIG.faceLossGraceMs
    ) {
      phase = "down";
      inferredBottomFromLoss = true;
      downFrames = 0;
      upFrames = 0;
      motionCue.textContent = "HOCH";
      setPositionStatus("good", "🟩", "Tief erkannt", "Gesicht darf unten kurz aus dem Bild verschwinden. Jetzt wieder hoch.");
      return;
    }
  }

  if (phase === "down" && lostFor <= QUICK_CONFIG.faceLossGraceMs) {
    motionCue.textContent = "HOCH";
    setPositionStatus("good", "🟩", "Tief erkannt", "Jetzt wieder hoch – sobald du auftauchst, zählt die Wiederholung.");
    return;
  }

  if (lostFor <= QUICK_CONFIG.faceLossGraceMs) {
    setPositionStatus("warn", "🟨", "Kurz verloren", "Weiterbewegen – die Wiederholung bleibt aktiv.");
    return;
  }

  setPositionStatus("warn", "🟨", "Kopf wieder über das Handy", "Die Bewegung bleibt noch kurz gespeichert.");

  if (lostFor > QUICK_CONFIG.hardResetLossMs) {
    downFrames = 0;
    upFrames = 0;
    phase = "up";
    inferredBottomFromLoss = false;
    maxMetricSinceTop = null;
    motionCue.textContent = "RUNTER";
    setPositionStatus("bad", "🟥", "Gesicht länger nicht erkannt", "Kopf wieder über das Handy bringen.");
  }
}

function updateSetupGuidance(face, now) {
  readyForCountdown = false;
  startWorkoutBtn.disabled = true;

  if (face.metric < QUICK_CONFIG.readyMinMetric) {
    goodPositionSince = 0;
    setPositionStatus("warn", "🟨", "Etwas näher ans Handy", "Schieb das Handy ein Stück weiter nach vorne unter dein Gesicht.");
    motionCue.textContent = "Etwas näher";
    return;
  }

  if (face.metric > QUICK_CONFIG.readyMaxMetric) {
    goodPositionSince = 0;
    setPositionStatus("warn", "🟨", "Etwas weiter weg", "Das Gesicht ist sehr nah an der Frontkamera.");
    motionCue.textContent = "Etwas weiter weg";
    return;
  }

  const centered =
    face.centerX >= QUICK_CONFIG.readyMinCenterX &&
    face.centerX <= QUICK_CONFIG.readyMaxCenterX &&
    face.centerY >= QUICK_CONFIG.readyMinCenterY &&
    face.centerY <= QUICK_CONFIG.readyMaxCenterY;

  if (!centered) {
    goodPositionSince = 0;
    setPositionStatus("warn", "🟨", "Kopf etwas mittiger", "Schieb das Handy kurz so, dass es ungefähr unter deinem Gesicht liegt.");
    motionCue.textContent = "Handy etwas verschieben";
    return;
  }

  if (!goodPositionSince) goodPositionSince = now;
  const stableFor = now - goodPositionSince;

  if (stableFor < 450) {
    setPositionStatus("good", "🟩", "Gut im Blick", "Kurz so bleiben …");
    motionCue.textContent = "Position passt";
    return;
  }

  readyForCountdown = true;
  startWorkoutBtn.disabled = false;
  setPositionStatus("good", "🟩", "Bereit", "Start drücken – im Countdown einfach oben bleiben.");
  motionCue.textContent = "Bereit";
}

function isFaceReady(face) {
  if (!face) return false;
  if (face.metric < QUICK_CONFIG.readyMinMetric || face.metric > QUICK_CONFIG.readyMaxMetric) return false;
  return (
    face.centerX >= QUICK_CONFIG.readyMinCenterX &&
    face.centerX <= QUICK_CONFIG.readyMaxCenterX &&
    face.centerY >= QUICK_CONFIG.readyMinCenterY &&
    face.centerY <= QUICK_CONFIG.readyMaxCenterY
  );
}

function setPositionStatus(state, emoji, title, hint) {
  positionStatus.className = `position-status ${state}`;
  positionEmoji.textContent = emoji;
  positionTitle.textContent = title;
  positionHint.textContent = hint;
}

// ---------- Countdown / Training ----------
async function startCountdown() {
  if (!readyForCountdown || !currentFace || countdownActive) return;

  countdownActive = true;
  calibrationSamples = [];
  lastMetric = null;
  maxMetricSinceTop = null;
  inferredBottomFromLoss = false;
  lastRepAt = 0;
  startWorkoutBtn.disabled = true;
  countdownBox.classList.remove("hidden");
  motionCue.textContent = "Oben bleiben";

  for (const value of [3, 2, 1]) {
    countdownNumber.textContent = String(value);
    await sleep(700);
    if (!countdownActive) return;
  }

  countdownNumber.textContent = "GO";
  await sleep(350);
  if (!countdownActive) return;

  const usableSamples = calibrationSamples.filter(Number.isFinite);
  if (usableSamples.length < 4) {
    countdownActive = false;
    countdownBox.classList.add("hidden");
    setPositionStatus("bad", "🟥", "Kalibrierung nicht geklappt", "Gesicht war im Countdown nicht stabil sichtbar. Versuch es direkt nochmal.");
    startWorkoutBtn.disabled = false;
    return;
  }

  baselineTopMetric = median(usableSamples);
  calculateThresholds();

  countdownActive = false;
  countdownBox.classList.add("hidden");
  beginWorkout();
}

function calculateThresholds() {
  if (!Number.isFinite(baselineTopMetric)) return;
  upThreshold = baselineTopMetric * QUICK_CONFIG.upRatio;
  downThreshold = Math.max(
    baselineTopMetric * QUICK_CONFIG.downRatio,
    baselineTopMetric + QUICK_CONFIG.minDownDelta
  );
}

function beginWorkout() {
  workoutActive = true;
  manualMode = false;
  workoutStartedAt = Date.now();
  elapsedSeconds = 0;
  repCount = 0;
  phase = "up";
  downFrames = 0;
  upFrames = 0;
  lastMetric = currentFace?.metric ?? baselineTopMetric;
  maxMetricSinceTop = currentFace?.metric ?? baselineTopMetric;
  inferredBottomFromLoss = false;
  lastRepAt = 0;
  liveRepCount.textContent = "0";

  startWorkoutBtn.classList.add("hidden");
  finishWorkoutBtn.classList.remove("hidden");
  manualModeBtn.classList.add("hidden");

  setPositionStatus("good", "🟩", "Training läuft", "Du musst nicht auf die Kamera schauen – nur auf Zahl und Ampel.");
  motionCue.textContent = "RUNTER";

  updateTimer();
  timerInterval = window.setInterval(updateTimer, 250);
}

function updateRepState(metric, now) {
  if (
    !Number.isFinite(metric) ||
    !Number.isFinite(downThreshold) ||
    !Number.isFinite(upThreshold)
  ) return;

  if (phase === "up") {
    motionCue.textContent = "RUNTER";

    maxMetricSinceTop = maxMetricSinceTop === null
      ? metric
      : Math.max(maxMetricSinceTop, metric);

    if (metric >= downThreshold) {
      downFrames += 1;
    } else {
      downFrames = 0;
    }

    if (downFrames >= QUICK_CONFIG.stableFrames) {
      phase = "down";
      inferredBottomFromLoss = false;
      downFrames = 0;
      upFrames = 0;
      motionCue.textContent = "HOCH";
      setPositionStatus("good", "🟩", "Tief erkannt", "Jetzt direkt wieder hoch.");
    }

    lastMetric = metric;
    return;
  }

  motionCue.textContent = "HOCH";

  if (metric <= upThreshold) {
    upFrames += 1;
  } else {
    upFrames = 0;
  }

  const repFastEnough =
    lastRepAt === 0 ||
    now - lastRepAt >= QUICK_CONFIG.minRepIntervalMs;

  if (
    upFrames >= QUICK_CONFIG.stableFrames &&
    repFastEnough
  ) {
    repCount += 1;
    lastRepAt = now;
    liveRepCount.textContent = String(repCount);
    pulseCounter();

    if (navigator.vibrate) navigator.vibrate(28);

    if (
      metric > baselineTopMetric * 0.84 &&
      metric < baselineTopMetric * 1.16
    ) {
      baselineTopMetric =
        baselineTopMetric * (1 - QUICK_CONFIG.baselineAdaptation) +
        metric * QUICK_CONFIG.baselineAdaptation;
      calculateThresholds();
    }

    phase = "up";
    inferredBottomFromLoss = false;
    maxMetricSinceTop = metric;
    upFrames = 0;
    downFrames = 0;
    motionCue.textContent = "RUNTER";
    setPositionStatus(
      "good",
      "🟩",
      "Gut im Blick",
      `${repCount} Wiederholung${repCount === 1 ? "" : "en"} erkannt.`
    );
  }

  lastMetric = metric;
}

function pulseCounter() {
  if (!liveRepCount.animate) return;
  liveRepCount.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.12)" },
      { transform: "scale(1)" }
    ],
    { duration: 220, easing: "ease-out" }
  );
}

function startManualMode() {
  stopDetectionLoop();
  stopCamera();
  manualMode = true;
  cameraWasStarted = false;
  workoutActive = true;
  workoutStartedAt = Date.now();
  elapsedSeconds = 0;
  repCount = 0;

  startCameraBtn.classList.add("hidden");
  startWorkoutBtn.classList.add("hidden");
  manualModeBtn.classList.add("hidden");
  finishWorkoutBtn.classList.remove("hidden");

  setPositionStatus("neutral", "✍️", "Manueller Modus", "Nach dem Training gibst du die Wiederholungszahl selbst ein.");
  motionCue.textContent = "Training läuft";

  updateTimer();
  timerInterval = window.setInterval(updateTimer, 250);
}

function finishWorkout() {
  updateTimer();
  workoutActive = false;
  countdownActive = false;
  stopTimer();
  stopDetectionLoop();
  stopCamera();

  finalTime.textContent = formatTime(elapsedSeconds);

  if (cameraWasStarted && !manualMode) {
    detectedResult.textContent = String(repCount);
    resultRepLabel.textContent = "Erkannt";
    manualRepWrap.classList.add("hidden");
    autoResultNote.classList.remove("hidden");
    repInput.value = "";
  } else {
    detectedResult.textContent = "Manuell";
    resultRepLabel.textContent = "Modus";
    manualRepWrap.classList.remove("hidden");
    autoResultNote.classList.add("hidden");
    repInput.value = "";
  }

  showStep("result");

  if (manualMode) {
    setTimeout(() => repInput.focus(), 50);
  }
}

function updateTimer() {
  if (!workoutStartedAt) return;
  elapsedSeconds = Math.floor((Date.now() - workoutStartedAt) / 1000);
  timerDisplay.textContent = formatTime(elapsedSeconds);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

// ---------- Training speichern ----------
function saveTrainingResult() {
  const reps = cameraWasStarted && !manualMode
    ? repCount
    : Math.floor(Number(repInput.value));

  if (!Number.isFinite(reps) || reps < 0) {
    alert("Bitte gib eine gültige Wiederholungszahl ein.");
    return;
  }

  if (reps === 0 && !confirm("0 Wiederholungen speichern?")) return;

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
    autoDetectedReps: cameraWasStarted && !manualMode ? repCount : null,
    durationSeconds: elapsedSeconds,
    date: new Date().toISOString(),
    usedCamera: cameraWasStarted,
    mode: cameraWasStarted && !manualMode ? "face-quick-v06" : "manual",
    calibrationTopMetric: baselineTopMetric
  });

  progress.trainingHistory = progress.trainingHistory.slice(0, 200);
  saveProgress();
  render();

  const newRank = getRank(progress.pushupMax);
  const isNewRecord = reps > oldMax;
  const rankUp = newRank.name !== oldRank.name;

  successDetails.innerHTML = "";
  addSuccessLine(`${reps} Push-ups gespeichert`);
  addSuccessLine(`Gesamt: ${progress.pushupTotal} Push-ups`);


  if (isNewRecord) addSuccessLine(`🏆 Neuer Rekord: ${progress.pushupMax}`, true);
  else addSuccessLine(`Rekord bleibt bei ${progress.pushupMax}`);

  if (rankUp) addSuccessLine(`⬆️ Neuer Rang: ${newRank.name}`, true);
  else addSuccessLine(`Rang: ${newRank.name}`);

  if (newStreak > oldStreak) addSuccessLine(`🔥 Trainingsserie: ${newStreak} Tage`, true);
  else addSuccessLine(`Trainingsserie: ${newStreak} Tage`);

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

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------- Events ----------
document.getElementById("openTrainingBtn").addEventListener("click", openTraining);
document.getElementById("closeTrainingBtn").addEventListener("click", closeTraining);

document.querySelector('[data-exercise="pushups"]').addEventListener("click", () => {
  showStep("quick");
});

backBtn.addEventListener("click", () => {
  if (!resultStep.classList.contains("hidden")) {
    showStep("quick");
    return;
  }
  resetTrainingSession();
  showStep("exercise");
});

startCameraBtn.addEventListener("click", startCamera);
startWorkoutBtn.addEventListener("click", startCountdown);
finishWorkoutBtn.addEventListener("click", finishWorkout);
manualModeBtn.addEventListener("click", startManualMode);
document.getElementById("saveTrainingBtn").addEventListener("click", saveTrainingResult);
document.getElementById("doneBtn").addEventListener("click", closeTraining);

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Wirklich alle Testdaten dieser v0.6 löschen?")) return;
  localStorage.removeItem(STORAGE_KEY);
  progress = { ...DEFAULT_PROGRESS, trainingHistory: [] };
  render();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && !workoutActive && !countdownActive) {
    stopDetectionLoop();
    stopCamera();
  }
});

render();
