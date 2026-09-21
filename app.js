import { FilesetResolver, PoseLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm";

const STORAGE_KEY = "skillTreeAppProgressV041";
const OLD_STORAGE_KEYS = ["skillTreeAppProgressV04", "skillTreeAppProgressV03", "skillTreeProgress", "skillTreeAppProgress", "progress"];
const MEDIAPIPE_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const PUSHUP_CONFIG = {
  upAngle: 142,
  downAngle: 112,
  minVisibility: 0.38,
  stableFrames: 2,
  minTransitionMs: 180,
  smoothing: 0.18,
  landmarkGraceMs: 650,
  resetAfterLossMs: 1800,
  minCalibratedTop: 138,
  calibrationDrop: 34,
  uiAngleIntervalMs: 120
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
let poseLandmarker = null;
let poseLoadingPromise = null;
let detectionFrameId = null;
let lastVideoTime = -1;
let workoutStartedAt = null;
let timerInterval = null;
let elapsedSeconds = 0;
let cameraWasStarted = false;
let autoDetectionAvailable = false;
let workoutActive = false;
let repCount = 0;
let pushupPhase = "unknown";
let smoothedArmAngles = { left: null, right: null };
let upFrames = 0;
let downFrames = 0;
let lastTransitionAt = 0;
let lastGoodPoseAt = 0;
let lastAngleUiAt = 0;
let calibratedTopAngle = 0;
let effectiveUpAngle = PUSHUP_CONFIG.upAngle;
let effectiveDownAngle = PUSHUP_CONFIG.downAngle;

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
const poseCanvas = document.getElementById("poseCanvas");
const poseCtx = poseCanvas.getContext("2d");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const cameraStatus = document.getElementById("cameraStatus");
const timerOverlay = document.getElementById("timerOverlay");
const timerDisplay = document.getElementById("timerDisplay");
const counterOverlay = document.getElementById("counterOverlay");
const liveRepCount = document.getElementById("liveRepCount");
const formOverlay = document.getElementById("formOverlay");
const formCue = document.getElementById("formCue");
const angleDisplay = document.getElementById("angleDisplay");
const poseQuality = document.getElementById("poseQuality");
const poseQualityText = document.getElementById("poseQualityText");
const finalTime = document.getElementById("finalTime");
const detectedResult = document.getElementById("detectedResult");
const repInput = document.getElementById("repInput");
const successDetails = document.getElementById("successDetails");
const startCameraBtn = document.getElementById("startCameraBtn");
const continueWithoutCameraBtn = document.getElementById("continueWithoutCameraBtn");
const startWorkoutBtn = document.getElementById("startWorkoutBtn");
const finishWorkoutBtn = document.getElementById("finishWorkoutBtn");

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
    "pushupMax" in value || "pushupTotal" in value || "pushupStreak" in value || "lastTrainingDate" in value
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

function render() {
  maxStat.textContent = progress.pushupMax;
  totalStat.textContent = progress.pushupTotal;
  streakStat.textContent = progress.pushupStreak;
  rankStat.textContent = getRank(progress.pushupMax).name;
  renderTree();
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
  return node.type === "start" || nodeValue(node) >= node.target;
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

    const unit = node.type === "total" ? "gesamt" : node.type === "streak" ? "Tage" : node.type === "start" ? "" : "am Stück";
    element.innerHTML = `<span class="node-rank">${node.label}</span><span class="node-target">${node.type === "start" ? "✓" : node.target}</span><span class="node-label">${unit}</span>`;
    skillTree.appendChild(element);
  });
}

function createConnector(from, to) {
  const line = document.createElement("div");
  line.className = "connector";
  const x1 = from.x + 56, y1 = from.y + 49, x2 = to.x + 56, y2 = to.y + 49;
  const dx = x2 - x1, dy = y2 - y1;
  line.style.left = `${x1}px`;
  line.style.top = `${y1}px`;
  line.style.width = `${Math.hypot(dx, dy)}px`;
  line.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
  return line;
}

function showStep(stepName) {
  [exerciseStep, cameraStep, resultStep, successStep].forEach(el => el.classList.add("hidden"));
  if (stepName === "exercise") {
    exerciseStep.classList.remove("hidden"); trainingTitle.textContent = "Übung auswählen"; backBtn.classList.add("hidden");
  } else if (stepName === "camera") {
    cameraStep.classList.remove("hidden"); trainingTitle.textContent = "Push-up Training"; backBtn.classList.remove("hidden");
  } else if (stepName === "result") {
    resultStep.classList.remove("hidden"); trainingTitle.textContent = "Training prüfen"; backBtn.classList.remove("hidden");
  } else if (stepName === "success") {
    successStep.classList.remove("hidden"); trainingTitle.textContent = "Fertig"; backBtn.classList.add("hidden");
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
  stopCamera();
  stopTimer();
  stopDetectionLoop();
  trainingModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function resetTrainingSession() {
  workoutActive = false;
  stopCamera(); stopTimer(); stopDetectionLoop();
  workoutStartedAt = null; elapsedSeconds = 0; cameraWasStarted = false; autoDetectionAvailable = false;
  repCount = 0;
  pushupPhase = "unknown";
  smoothedArmAngles = { left: null, right: null };
  upFrames = 0;
  downFrames = 0;
  lastTransitionAt = 0;
  lastGoodPoseAt = 0;
  lastAngleUiAt = 0;
  calibratedTopAngle = 0;
  effectiveUpAngle = PUSHUP_CONFIG.upAngle;
  effectiveDownAngle = PUSHUP_CONFIG.downAngle;
  lastVideoTime = -1;
  repInput.value = ""; liveRepCount.textContent = "0"; timerDisplay.textContent = "00:00"; finalTime.textContent = "00:00"; detectedResult.textContent = "–"; angleDisplay.textContent = "Arme: –°"; formCue.textContent = "Position finden …";
  clearPoseCanvas();
  cameraPlaceholder.classList.remove("hidden"); timerOverlay.classList.add("hidden"); counterOverlay.classList.add("hidden"); formOverlay.classList.add("hidden");
  startCameraBtn.classList.remove("hidden"); startCameraBtn.disabled = false; startCameraBtn.textContent = "Kamera + Erkennung starten";
  continueWithoutCameraBtn.classList.remove("hidden"); startWorkoutBtn.classList.add("hidden"); finishWorkoutBtn.classList.add("hidden");
  setPoseQuality("neutral", "Kamera noch nicht aktiv");
  cameraStatus.textContent = "Starte die Kamera. Beim ersten Mal fragt dein Browser nach der Berechtigung.";
}

async function initPoseLandmarker() {
  if (poseLandmarker) return poseLandmarker;
  if (poseLoadingPromise) return poseLoadingPromise;

  poseLoadingPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
    const base = {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.6,
      minPosePresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
      outputSegmentationMasks: false
    };

    try {
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, base);
    } catch (gpuError) {
      console.warn("GPU nicht verfügbar, CPU-Fallback", gpuError);
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        ...base,
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "CPU" }
      });
    }
    return poseLandmarker;
  })();

  try { return await poseLoadingPromise; }
  finally { poseLoadingPromise = null; }
}

async function startCamera() {
  cameraStatus.textContent = "Kamera wird geöffnet …";
  startCameraBtn.disabled = true;
  startCameraBtn.textContent = "Wird geladen …";

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = "Dieser Browser unterstützt den Kamerazugriff hier nicht. Du kannst trotzdem ohne Kamera trainieren.";
    startCameraBtn.disabled = false; startCameraBtn.textContent = "Kamera + Erkennung starten";
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } },
      audio: false
    });

    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    cameraWasStarted = true;
    cameraPlaceholder.classList.add("hidden");
    formOverlay.classList.remove("hidden");
    resizePoseCanvas();
    setPoseQuality("warn", "Körpererkennung wird geladen …");
    cameraStatus.textContent = "Pose-Modell wird geladen. Beim ersten Start braucht das kurz Internetzugriff.";

    try {
      await initPoseLandmarker();
      autoDetectionAvailable = true;
      setPoseQuality("warn", "Bring Schultern und Arme ins Bild");
      cameraStatus.textContent = "Erkennung bereit. Stell das Handy ca. 0,7–1 m vor dich, niedrig und etwa 30–45° schräg. Schulter, Ellenbogen und Handgelenke sollten sichtbar sein.";
      startDetectionLoop();
    } catch (modelError) {
      console.error(modelError);
      autoDetectionAvailable = false;
      setPoseQuality("bad", "Automatische Erkennung nicht verfügbar");
      cameraStatus.textContent = "Die Kamera läuft, aber die Körpererkennung konnte nicht geladen werden. Du kannst trotzdem manuell trainieren.";
    }

    startCameraBtn.classList.add("hidden");
    continueWithoutCameraBtn.classList.add("hidden");
    startWorkoutBtn.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    setPoseQuality("bad", "Kamerazugriff nicht verfügbar");
    cameraStatus.textContent = "Kamerazugriff wurde nicht erlaubt oder ist nicht verfügbar. Du kannst ohne Kamera weitermachen.";
    startCameraBtn.disabled = false; startCameraBtn.textContent = "Kamera + Erkennung starten";
  }
}

function continueWithoutCamera() {
  stopCamera(); stopDetectionLoop(); cameraWasStarted = false; autoDetectionAvailable = false;
  startCameraBtn.classList.add("hidden"); continueWithoutCameraBtn.classList.add("hidden"); startWorkoutBtn.classList.remove("hidden");
  formOverlay.classList.add("hidden"); setPoseQuality("neutral", "Manueller Modus");
  cameraStatus.textContent = "Starte das Training und trage die Wiederholungen anschließend selbst ein.";
}

function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
}

function resizePoseCanvas() {
  if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) return;
  poseCanvas.width = cameraVideo.videoWidth;
  poseCanvas.height = cameraVideo.videoHeight;
}

function startDetectionLoop() {
  stopDetectionLoop();
  const loop = () => { detectPoseFrame(); detectionFrameId = requestAnimationFrame(loop); };
  detectionFrameId = requestAnimationFrame(loop);
}

function stopDetectionLoop() {
  if (detectionFrameId) cancelAnimationFrame(detectionFrameId);
  detectionFrameId = null;
}

function detectPoseFrame() {
  if (!poseLandmarker || !cameraStream || cameraVideo.readyState < 2) return;
  if (cameraVideo.videoWidth !== poseCanvas.width || cameraVideo.videoHeight !== poseCanvas.height) resizePoseCanvas();
  if (cameraVideo.currentTime === lastVideoTime) return;
  lastVideoTime = cameraVideo.currentTime;

  try {
    const result = poseLandmarker.detectForVideo(cameraVideo, performance.now());
    processPoseResult(result);
  } catch (error) {
    console.error("Pose-Erkennung:", error);
  }
}

function processPoseResult(result) {
  clearPoseCanvas();

  const now = performance.now();
  const landmarks = result?.landmarks?.[0];
  const worldLandmarks = result?.worldLandmarks?.[0] || null;

  if (!landmarks) {
    handlePoseLoss(now, "Kein Körper erkannt");
    return;
  }

  const analysis = analyzePushupPose(landmarks, worldLandmarks);
  drawUpperBodyPose(landmarks, analysis?.visibleSides || []);

  if (!analysis) {
    handlePoseLoss(now, "Arme nicht sicher erkannt");
    return;
  }

  lastGoodPoseAt = now;

  if (analysis.armCount >= 2) {
    setPoseQuality("good", "Beide Arme erkannt");
  } else {
    setPoseQuality(
      "warn",
      `${analysis.visibleSides[0] === "left" ? "Linker" : "Rechter"} Arm erkannt · zweiter Arm darf besser sichtbar sein`
    );
  }

  updatePushupState(analysis, now);
}

function handlePoseLoss(now, reason) {
  const lostFor = lastGoodPoseAt ? now - lastGoodPoseAt : Infinity;

  if (lostFor <= PUSHUP_CONFIG.landmarkGraceMs) {
    setPoseQuality("warn", "Kurz verloren · Bewegung läuft weiter");
    formCue.textContent = "Weiter – ich suche dich wieder …";
    return;
  }

  setPoseQuality("bad", reason);
  formCue.textContent = "Schultern + Arme ins Bild";
  angleDisplay.textContent = "Arme: –°";
  resetStableFrames();

  if (workoutActive && lostFor > PUSHUP_CONFIG.resetAfterLossMs) {
    pushupPhase = "unknown";
  }
}

function analyzePushupPose(landmarks, worldLandmarks) {
  const sides = [
    { name: "left", shoulder: 11, elbow: 13, wrist: 15 },
    { name: "right", shoulder: 12, elbow: 14, wrist: 16 }
  ];

  const validArms = [];

  for (const side of sides) {
    const s2d = landmarks[side.shoulder];
    const e2d = landmarks[side.elbow];
    const w2d = landmarks[side.wrist];

    if (!s2d || !e2d || !w2d) continue;

    const visibility =
      ((s2d.visibility ?? 0) + (e2d.visibility ?? 0) + (w2d.visibility ?? 0)) / 3;

    if (visibility < PUSHUP_CONFIG.minVisibility) continue;

    let rawAngle;

    if (
      worldLandmarks?.[side.shoulder] &&
      worldLandmarks?.[side.elbow] &&
      worldLandmarks?.[side.wrist]
    ) {
      rawAngle = calculateAngle3D(
        worldLandmarks[side.shoulder],
        worldLandmarks[side.elbow],
        worldLandmarks[side.wrist]
      );
    } else {
      rawAngle = calculateAngle2D(s2d, e2d, w2d);
    }

    if (!Number.isFinite(rawAngle)) continue;

    const previous = smoothedArmAngles[side.name];
    const alpha = PUSHUP_CONFIG.smoothing;
    const smoothed =
      previous === null
        ? rawAngle
        : previous * (1 - alpha) + rawAngle * alpha;

    smoothedArmAngles[side.name] = smoothed;

    validArms.push({
      name: side.name,
      angle: smoothed,
      visibility
    });
  }

  if (!validArms.length) return null;

  let usedArms = validArms;

  if (
    validArms.length === 2 &&
    Math.abs(validArms[0].angle - validArms[1].angle) > 38
  ) {
    usedArms = [
      [...validArms].sort((a, b) => b.visibility - a.visibility)[0]
    ];
  }

  const totalWeight = usedArms.reduce(
    (sum, arm) => sum + arm.visibility,
    0
  );

  const combinedAngle =
    usedArms.reduce(
      (sum, arm) => sum + arm.angle * arm.visibility,
      0
    ) / Math.max(totalWeight, 0.001);

  return {
    combinedAngle,
    arms: validArms,
    armCount: validArms.length,
    visibleSides: validArms.map(arm => arm.name)
  };
}

function calculateAngle2D(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);

  if (!magAB || !magCB) return NaN;

  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return Math.acos(cos) * 180 / Math.PI;
}

function calculateAngle3D(a, b, c) {
  const ab = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: (a.z ?? 0) - (b.z ?? 0)
  };
  const cb = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: (c.z ?? 0) - (b.z ?? 0)
  };

  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magAB = Math.hypot(ab.x, ab.y, ab.z);
  const magCB = Math.hypot(cb.x, cb.y, cb.z);

  if (!magAB || !magCB) return NaN;

  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return Math.acos(cos) * 180 / Math.PI;
}

function updatePushupState(analysis, now) {
  const angle = analysis.combinedAngle;

  if (now - lastAngleUiAt >= PUSHUP_CONFIG.uiAngleIntervalMs) {
    angleDisplay.textContent = `Arme: ${Math.round(angle)}°`;
    lastAngleUiAt = now;
  }

  if (!workoutActive && angle >= 125 && angle <= 172) {
    calibratedTopAngle = Math.max(calibratedTopAngle, angle);
    updateEffectiveThresholds();
  }

  if (!workoutActive) {
    if (angle >= effectiveUpAngle) {
      formCue.textContent = "OBEN erkannt ✓";
    } else if (angle <= effectiveDownAngle) {
      formCue.textContent = "UNTEN erkannt ✓";
    } else {
      formCue.textContent = "Position erkannt";
    }
    return;
  }

  if (angle >= effectiveUpAngle) {
    upFrames += 1;
    downFrames = 0;
  } else if (angle <= effectiveDownAngle) {
    downFrames += 1;
    upFrames = 0;
  } else {
    resetStableFrames();
  }

  const enoughTime =
    now - lastTransitionAt >= PUSHUP_CONFIG.minTransitionMs;

  if (pushupPhase === "unknown") {
    formCue.textContent = "Arme strecken → OBEN";

    if (upFrames >= PUSHUP_CONFIG.stableFrames) {
      pushupPhase = "up";
      lastTransitionAt = now;
      formCue.textContent = "OBEN ✓ · jetzt runter";
      resetStableFrames();
    }
    return;
  }

  if (pushupPhase === "up") {
    formCue.textContent = "Runter";

    if (
      enoughTime &&
      downFrames >= PUSHUP_CONFIG.stableFrames
    ) {
      pushupPhase = "down";
      lastTransitionAt = now;
      formCue.textContent = "UNTEN ✓ · jetzt hoch";
      resetStableFrames();
    }
    return;
  }

  if (pushupPhase === "down") {
    formCue.textContent = "Hoch";

    if (
      enoughTime &&
      upFrames >= PUSHUP_CONFIG.stableFrames
    ) {
      repCount += 1;
      liveRepCount.textContent = String(repCount);
      pushupPhase = "up";
      lastTransitionAt = now;
      formCue.textContent = "✓ Gewertet · wieder runter";
      resetStableFrames();

      if (navigator.vibrate) navigator.vibrate(35);

      if (liveRepCount.animate) {
        liveRepCount.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.35)" },
            { transform: "scale(1)" }
          ],
          { duration: 240, easing: "ease-out" }
        );
      }
    }
  }
}

function updateEffectiveThresholds() {
  if (calibratedTopAngle < PUSHUP_CONFIG.minCalibratedTop) {
    effectiveUpAngle = PUSHUP_CONFIG.upAngle;
    effectiveDownAngle = PUSHUP_CONFIG.downAngle;
    return;
  }

  effectiveUpAngle = clamp(
    calibratedTopAngle - 8,
    136,
    152
  );

  effectiveDownAngle = clamp(
    effectiveUpAngle - PUSHUP_CONFIG.calibrationDrop,
    100,
    120
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resetStableFrames() { upFrames = 0; downFrames = 0; }

function drawUpperBodyPose(landmarks, visibleSides) {
  if (!poseCanvas.width || !poseCanvas.height) return;

  const sideMap = {
    left: [11, 13, 15],
    right: [12, 14, 16]
  };

  poseCtx.save();
  poseCtx.lineWidth = Math.max(
    4,
    poseCanvas.width * 0.004
  );
  poseCtx.strokeStyle = "rgba(91,201,255,.95)";
  poseCtx.fillStyle = "rgba(255,255,255,.95)";
  poseCtx.lineCap = "round";

  for (const sideName of visibleSides) {
    const ids = sideMap[sideName];
    if (!ids) continue;

    const pts = ids.map(i => landmarks[i]);
    if (pts.some(p => !p)) continue;

    drawLine(pts[0], pts[1]);
    drawLine(pts[1], pts[2]);
    pts.forEach(drawPoint);
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (
    leftShoulder &&
    rightShoulder &&
    (leftShoulder.visibility ?? 0) > 0.25 &&
    (rightShoulder.visibility ?? 0) > 0.25
  ) {
    drawLine(leftShoulder, rightShoulder);
  }

  poseCtx.restore();
}

function drawLine(a,b) {
  poseCtx.beginPath(); poseCtx.moveTo(a.x*poseCanvas.width,a.y*poseCanvas.height); poseCtx.lineTo(b.x*poseCanvas.width,b.y*poseCanvas.height); poseCtx.stroke();
}
function drawPoint(p) {
  poseCtx.beginPath(); poseCtx.arc(p.x*poseCanvas.width,p.y*poseCanvas.height,Math.max(5,poseCanvas.width*.006),0,Math.PI*2); poseCtx.fill();
}
function clearPoseCanvas() { poseCtx.clearRect(0,0,poseCanvas.width,poseCanvas.height); }
function setPoseQuality(state,text) { poseQuality.className = `pose-quality ${state}`; poseQualityText.textContent = text; }

function startWorkout() {
  workoutStartedAt = Date.now(); elapsedSeconds = 0; workoutActive = true;
  repCount = 0;
  liveRepCount.textContent = "0";
  pushupPhase = "unknown";
  smoothedArmAngles = { left: null, right: null };
  resetStableFrames();
  lastTransitionAt = 0;
  lastGoodPoseAt = performance.now();
  updateEffectiveThresholds();
  startWorkoutBtn.classList.add("hidden"); finishWorkoutBtn.classList.remove("hidden"); timerOverlay.classList.remove("hidden");
  if (cameraWasStarted) {
    counterOverlay.classList.remove("hidden"); formOverlay.classList.remove("hidden");
    cameraStatus.textContent = autoDetectionAvailable ? `Training läuft. Gezählt wird bei OBEN → UNTEN → OBEN. Grenzen: oben ab ${Math.round(effectiveUpAngle)}°, unten bis ${Math.round(effectiveDownAngle)}°.` : "Training läuft. Automatische Erkennung ist nicht verfügbar; trage die Zahl danach manuell ein.";
  } else {
    cameraStatus.textContent = "Manuelles Training läuft. Trage die Wiederholungen anschließend ein.";
  }
  updateTimer(); timerInterval = window.setInterval(updateTimer,250);
}

function updateTimer() {
  if (!workoutStartedAt) return;
  elapsedSeconds = Math.floor((Date.now() - workoutStartedAt) / 1000);
  timerDisplay.textContent = formatTime(elapsedSeconds);
}
function stopTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

function finishWorkout() {
  updateTimer(); workoutActive = false; stopTimer(); stopDetectionLoop(); stopCamera();
  finalTime.textContent = formatTime(elapsedSeconds);
  if (cameraWasStarted && autoDetectionAvailable) { detectedResult.textContent = String(repCount); repInput.value = String(repCount); }
  else { detectedResult.textContent = "–"; repInput.value = ""; }
  showStep("result"); setTimeout(() => repInput.focus(),50);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds/60).toString().padStart(2,"0");
  const secs = (seconds%60).toString().padStart(2,"0");
  return `${mins}:${secs}`;
}

function saveTrainingResult() {
  const reps = Math.floor(Number(repInput.value));
  if (!Number.isFinite(reps) || reps < 0) { alert("Bitte gib eine gültige Wiederholungszahl ein."); return; }
  if (reps === 0 && !confirm("0 Wiederholungen speichern?")) return;

  const oldMax = progress.pushupMax;
  const oldRank = getRank(oldMax);
  const oldStreak = progress.pushupStreak;
  const today = localDateString(new Date());
  const newStreak = calculateStreak(progress.lastTrainingDate,today,progress.pushupStreak);

  progress.pushupMax = Math.max(progress.pushupMax,reps);
  progress.pushupTotal += reps;
  progress.pushupStreak = newStreak;
  progress.lastTrainingDate = today;
  progress.trainingHistory.unshift({
    exercise:"pushups", reps,
    autoDetectedReps: cameraWasStarted && autoDetectionAvailable ? repCount : null,
    durationSeconds:elapsedSeconds, date:new Date().toISOString(), usedCamera:cameraWasStarted,
    mode: cameraWasStarted && autoDetectionAvailable ? "camera-auto" : "manual"
  });
  progress.trainingHistory = progress.trainingHistory.slice(0,200);
  saveProgress(); render();

  const newRank = getRank(progress.pushupMax);
  successDetails.innerHTML = "";
  addSuccessLine(`${reps} Push-ups gespeichert`);
  addSuccessLine(`Gesamt: ${progress.pushupTotal} Push-ups`);
  if (cameraWasStarted && autoDetectionAvailable && reps !== repCount) addSuccessLine(`Kamera erkannt: ${repCount} · korrigiert auf: ${reps}`);
  addSuccessLine(reps > oldMax ? `🏆 Neuer Rekord: ${progress.pushupMax}` : `Rekord bleibt bei ${progress.pushupMax}`, reps > oldMax);
  addSuccessLine(newRank.name !== oldRank.name ? `⬆️ Neuer Rang: ${newRank.name}` : `Rang: ${newRank.name}`, newRank.name !== oldRank.name);
  addSuccessLine(newStreak > oldStreak ? `🔥 Trainingsserie: ${newStreak} Tage` : `Trainingsserie: ${newStreak} Tage`, newStreak > oldStreak);
  showStep("success");
}

function addSuccessLine(text, good=false) {
  const line = document.createElement("div"); line.className = `success-line${good ? " good" : ""}`; line.textContent = text; successDetails.appendChild(line);
}

function calculateStreak(lastDate,today,currentStreak) {
  if (!lastDate) return 1;
  if (lastDate === today) return Math.max(1,currentStreak);
  const diffDays = Math.round((parseLocalDate(today)-parseLocalDate(lastDate))/86400000);
  return diffDays === 1 ? Math.max(1,currentStreak)+1 : 1;
}
function localDateString(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function parseLocalDate(value) { const [y,m,d] = value.split("-").map(Number); return new Date(y,m-1,d); }

 document.getElementById("openTrainingBtn").addEventListener("click",openTraining);
 document.getElementById("closeTrainingBtn").addEventListener("click",closeTraining);
 document.querySelector('[data-exercise="pushups"]').addEventListener("click",()=>showStep("camera"));
 backBtn.addEventListener("click",()=>{
   if (!resultStep.classList.contains("hidden")) { showStep("camera"); return; }
   workoutActive=false; stopCamera(); stopDetectionLoop(); stopTimer(); showStep("exercise");
 });
 startCameraBtn.addEventListener("click",startCamera);
 continueWithoutCameraBtn.addEventListener("click",continueWithoutCamera);
 startWorkoutBtn.addEventListener("click",startWorkout);
 finishWorkoutBtn.addEventListener("click",finishWorkout);
 document.getElementById("saveTrainingBtn").addEventListener("click",saveTrainingResult);
 document.getElementById("doneBtn").addEventListener("click",closeTraining);
 document.getElementById("resetBtn").addEventListener("click",()=>{
   if (!confirm("Wirklich alle Testdaten dieser v0.4.1 löschen?")) return;
   localStorage.removeItem(STORAGE_KEY); progress={...DEFAULT_PROGRESS,trainingHistory:[]}; render();
 });
 document.addEventListener("visibilitychange",()=>{
   if (document.hidden && cameraStream && !workoutActive) { stopCamera(); stopDetectionLoop(); }
 });
 window.addEventListener("resize",resizePoseCanvas);

render();
