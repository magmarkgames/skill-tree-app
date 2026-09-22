const STORAGE_KEY = "skillTreeAppProgressV010";
const OLD_STORAGE_KEYS = [
  "skillTreeAppProgressV09",
  "skillTreeAppProgressV08",
  "skillTreeAppProgressV07",
  "skillTreeAppProgressV06",
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

// Die Quick-Mode-Erkennung ist absichtlich aus v0.6 übernommen.
// Der UI-/Skill-Tree-Umbau soll die funktionierende Zählung nicht verändern.
const QUICK_CONFIG = {
  detectIntervalMs: 34,
  minDetectionConfidence: 0.46,
  readyMinMetric: 0.095,
  readyMaxMetric: 0.52,
  readyMinCenterX: 0.12,
  readyMaxCenterX: 0.88,
  readyMinCenterY: 0.08,
  readyMaxCenterY: 0.92,
  downRatio: 1.18,
  upRatio: 1.09,
  minDownDelta: 0.024,
  stableFrames: 1,
  minRepIntervalMs: 330,
  faceLossGraceMs: 950,
  hardResetLossMs: 2200,
  inferDownAfterLossMs: 90,
  inferDownMinRatio: 1.055,
  metricSmoothing: 0.58,
  baselineAdaptation: 0.01
};

const DEFAULT_PROGRESS = {
  pushupMax: 0,
  pushupTotal: 0,
  pushupBestDay: 0,
  pushupBestWeek: 0,
  // Nur für saubere Migration älterer Versionen behalten; v0.8 zeigt/benutzt keine Streak mehr.
  pushupStreak: 0,
  lastTrainingDate: null,
  variantStats: {},
  trainingHistory: []
};

const VARIANT_META = {
  standard: { label: "Standard", shortLabel: "Standard", color: "#4A90FF" },
  wide: { label: "Wide", shortLabel: "Wide", color: "#8B6CFF" },
  diamond: { label: "Diamond", shortLabel: "Diamond", color: "#F05C82" },
  pike: { label: "Pike", shortLabel: "Pike", color: "#43C889" },
  incline: { label: "Incline", shortLabel: "Incline", color: "#F3A94F" },
  decline: { label: "Decline", shortLabel: "Decline", color: "#35BFE6" }
};

const VARIANT_TREE_MILESTONES = {
  max: [1, 3, 8, 17, 30],
  total: [10, 25, 75, 150, 300]
};

const RANK_ORDER = ["Starter", "Holz", "Stein", "Bronze", "Silber"];

function createEmptyVariantStats() {
  return Object.fromEntries(
    Object.keys(VARIANT_META).map(key => [key, { max: 0, total: 0 }])
  );
}


// ---------- v0.10.1 Generated Asset Icon System ----------
const ASSET_PATHS = {
  variants: {
    standard: "variant-standard.png",
    wide: "variant-wide.png",
    diamond: "variant-diamond.png",
    pike: "variant-pike.png",
    incline: "variant-incline.png",
    decline: "variant-decline.png"
  },
  metrics: {
    max: "metric-max.png",
    total: "metric-total.png",
    day: "metric-day.png",
    week: "metric-week.png"
  },
  ranks: {
    Holz: "rank-wood.png",
    Stein: "rank-stone.png",
    Bronze: "rank-bronze.png",
    Silber: "rank-silver.png"
  }
};

function assetImg(src, alt = "", className = "") {
  return `<img class="app-asset-icon ${className}" src="${src}" alt="${alt}" draggable="false" />`;
}

function getVariantIconSvg(variant, className = "") {
  const meta = VARIANT_META[variant] || VARIANT_META.standard;
  const src = ASSET_PATHS.variants[variant] || ASSET_PATHS.variants.standard;
  return assetImg(src, `${meta.label} Push-up`, className);
}

function getMetricIconSvg(metric, className = "") {
  const key = ["max", "total", "day", "week"].includes(metric) ? metric : "max";
  const labels = {
    max: "Max Reps",
    total: "Gesamt",
    day: "24 Stunden",
    week: "7 Tage"
  };
  return assetImg(ASSET_PATHS.metrics[key], labels[key], className);
}

function getRankIconSvg(rank, className = "") {
  const src = ASSET_PATHS.ranks[rank] || ASSET_PATHS.ranks.Holz;
  return assetImg(src, `${rank} Rang`, className);
}

function renderStaticIcons() {
  document.querySelectorAll("[data-variant-icon]").forEach(el => {
    const variant = el.dataset.variantIcon || "standard";
    el.innerHTML = getVariantIconSvg(variant);
  });
  document.querySelectorAll("[data-metric-icon]").forEach(el => {
    const metric = el.dataset.metricIcon || "max";
    el.innerHTML = getMetricIconSvg(metric);
  });
}

// v0.10: vertikaler Hauptbaum mit fünf Fortschrittsrichtungen.
const SKILL_NODES = [
  { id: "standard1", type: "metric", metric: "standardMax", branch: "max", target: 1, x: 328, y: 1630 },
  { id: "woodRank", type: "rank", branch: "rank", rank: "Holz", x: 315, y: 1472, parents: ["standard1"], requirementCount: 1 },

  // Holz -> Stein: drei gleichwertige Wege
  { id: "standard3", type: "metric", metric: "standardMax", branch: "max", target: 3, x: 92, y: 1325, parents: ["woodRank"] },
  { id: "total8", type: "metric", metric: "total", branch: "total", target: 8, x: 328, y: 1308, parents: ["woodRank"] },
  { id: "wide2", type: "metric", metric: "variantMax", variant: "wide", branch: "variant", target: 2, x: 564, y: 1325, parents: ["woodRank"] },
  { id: "stoneRank", type: "rank", branch: "rank", rank: "Stein", x: 315, y: 1150, parents: ["standard3", "total8", "wide2"], requirementCount: 1 },

  // Stein -> Bronze: fünf Richtungen
  { id: "standard8", type: "metric", metric: "standardMax", branch: "max", target: 8, x: 52, y: 1010, parents: ["stoneRank"] },
  { id: "standard12", type: "metric", metric: "standardMax", branch: "max", target: 12, x: 52, y: 860, parents: ["standard8"] },

  { id: "day25", type: "metric", metric: "day", branch: "day", target: 25, x: 188, y: 1000, parents: ["stoneRank"] },
  { id: "day50", type: "metric", metric: "day", branch: "day", target: 50, x: 188, y: 850, parents: ["day25"] },

  { id: "total20", type: "metric", metric: "total", branch: "total", target: 20, x: 328, y: 995, parents: ["stoneRank"] },
  { id: "total75", type: "metric", metric: "total", branch: "total", target: 75, x: 328, y: 845, parents: ["total20"] },

  { id: "week50", type: "metric", metric: "week", branch: "week", target: 50, x: 468, y: 1000, parents: ["stoneRank"] },
  { id: "week150", type: "metric", metric: "week", branch: "week", target: 150, x: 468, y: 850, parents: ["week50"] },

  { id: "wideSkill", type: "skill", metric: "variantPoints", variant: "wide", branch: "variant", target: 1, x: 595, y: 985, parents: ["stoneRank"] },
  { id: "wideStage2", type: "metric", metric: "variantPoints", variant: "wide", branch: "variant", target: 3, x: 596, y: 840, parents: ["wideSkill"] },

  { id: "bronzeRank", type: "rank", branch: "rank", rank: "Bronze", x: 315, y: 675, parents: ["standard12", "day50", "total75", "week150", "wideStage2"], requirementCount: 1 },

  // Bronze -> Silber: langfristigere Ziele + Diamond
  { id: "standard20", type: "metric", metric: "standardMax", branch: "max", target: 20, x: 52, y: 520, parents: ["bronzeRank"] },
  { id: "standard50", type: "metric", metric: "standardMax", branch: "max", target: 50, x: 52, y: 360, parents: ["standard20"] },

  { id: "day100", type: "metric", metric: "day", branch: "day", target: 100, x: 188, y: 520, parents: ["bronzeRank"] },
  { id: "day200", type: "metric", metric: "day", branch: "day", target: 200, x: 188, y: 360, parents: ["day100"] },

  { id: "total250", type: "metric", metric: "total", branch: "total", target: 250, x: 328, y: 520, parents: ["bronzeRank"] },
  { id: "total1000", type: "metric", metric: "total", branch: "total", target: 1000, x: 328, y: 360, parents: ["total250"] },

  { id: "week250", type: "metric", metric: "week", branch: "week", target: 250, x: 468, y: 520, parents: ["bronzeRank"] },
  { id: "week500", type: "metric", metric: "week", branch: "week", target: 500, x: 468, y: 360, parents: ["week250"] },

  { id: "diamondSkill", type: "skill", metric: "variantPoints", variant: "diamond", branch: "variant", target: 1, x: 595, y: 510, parents: ["bronzeRank"] },
  { id: "diamondStage2", type: "metric", metric: "variantPoints", variant: "diamond", branch: "variant", target: 3, x: 596, y: 355, parents: ["diamondSkill"] },

  { id: "silverRank", type: "rank", branch: "rank", rank: "Silber", x: 315, y: 170, parents: ["standard50", "day200", "total1000", "week500", "diamondStage2"], requirementCount: 1 }
];

let progress = loadProgress();

let cameraStream = null;
let FaceDetector = null;
let FilesetResolver = null;
let mediaPipeModuleLoading = null;
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
let currentTrainingVariant = "standard";

// ---------- DOM ----------
const homeView = document.getElementById("homeView");
const treeView = document.getElementById("treeView");
const historyView = document.getElementById("historyView");
const treeScroll = document.getElementById("treeScroll");
const skillTree = document.getElementById("skillTree");

const maxStat = document.getElementById("maxStat");
const dayStat = document.getElementById("dayStat");
const weekStat = document.getElementById("weekStat");
const totalStat = document.getElementById("totalStat");
const rankStat = document.getElementById("rankStat");

const homePushMeta = document.getElementById("homePushMeta");
const homeTodayStat = document.getElementById("homeTodayStat");
const homeWeekStat = document.getElementById("homeWeekStat");
const homeTotalStat = document.getElementById("homeTotalStat");
const historyHomeHint = document.getElementById("historyHomeHint");

const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const historyTodayStat = document.getElementById("historyTodayStat");
const historyWeekStat = document.getElementById("historyWeekStat");
const historyTotalStat = document.getElementById("historyTotalStat");

const trainingModal = document.getElementById("trainingModal");
const exerciseStep = document.getElementById("exerciseStep");
const variantStep = document.getElementById("variantStep");
const quickStep = document.getElementById("quickStep");
const resultStep = document.getElementById("resultStep");
const successStep = document.getElementById("successStep");
const trainingTitle = document.getElementById("trainingTitle");
const backBtn = document.getElementById("backBtn");
const quickVariantPill = document.getElementById("quickVariantPill");
const variantCards = Array.from(document.querySelectorAll(".variant-card[data-variant]"));
const startSelectedVariantBtn = document.getElementById("startSelectedVariantBtn");

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
const manualRepWrap = document.getElementById("manualRepWrap");
const autoResultNote = document.getElementById("autoResultNote");
const resultRepLabel = document.getElementById("resultRepLabel");

const variantModal = document.getElementById("variantModal");
const closeVariantModalBtn = document.getElementById("closeVariantModalBtn");
const variantModalTitle = document.getElementById("variantModalTitle");
const variantModalIcon = document.getElementById("variantModalIcon");
const variantModalSubtitle = document.getElementById("variantModalSubtitle");
const variantModalProgress = document.getElementById("variantModalProgress");
const variantMaxMilestones = document.getElementById("variantMaxMilestones");
const variantTotalMilestones = document.getElementById("variantTotalMilestones");
const liveGoalsList = document.getElementById("liveGoalsList");
const liveGoalsVariantHint = document.getElementById("liveGoalsVariantHint");

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
    "lastTrainingDate" in value ||
    "trainingHistory" in value
  );
}

function normalizeProgress(value) {
  const trainingHistory = Array.isArray(value?.trainingHistory) ? value.trainingHistory : [];
  const pushupMax = Math.max(0, Number(value?.pushupMax) || 0);
  const pushupTotal = Math.max(0, Number(value?.pushupTotal) || 0);

  const variantStats = createEmptyVariantStats();
  for (const item of trainingHistory) {
    if (item?.exercise && item.exercise !== "pushups") continue;
    const variant = VARIANT_META[item?.variant] ? item.variant : "standard";
    const reps = Math.max(0, Number(item?.reps) || 0);
    variantStats[variant].total += reps;
    variantStats[variant].max = Math.max(variantStats[variant].max, reps);
  }

  if (value?.variantStats && typeof value.variantStats === "object") {
    for (const [key, stats] of Object.entries(value.variantStats)) {
      if (!variantStats[key]) continue;
      variantStats[key].max = Math.max(variantStats[key].max, Math.max(0, Number(stats?.max) || 0));
      variantStats[key].total = Math.max(variantStats[key].total, Math.max(0, Number(stats?.total) || 0));
    }
  }

  variantStats.standard.max = Math.max(variantStats.standard.max, pushupMax);
  variantStats.standard.total = Math.max(variantStats.standard.total, pushupTotal);

  return {
    pushupMax,
    pushupTotal,
    pushupBestDay: Math.max(
      0,
      Number(value?.pushupBestDay) || 0,
      calculateBestDayFromHistory(trainingHistory)
    ),
    pushupBestWeek: Math.max(
      0,
      Number(value?.pushupBestWeek) || 0,
      calculateBestWeekFromHistory(trainingHistory)
    ),
    pushupStreak: Math.max(0, Number(value?.pushupStreak) || 0),
    lastTrainingDate: value?.lastTrainingDate || null,
    variantStats,
    trainingHistory
  };
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ---------- Views / Dashboard ----------
function showView(name) {
  homeView.classList.toggle("hidden", name !== "home");
  treeView.classList.toggle("hidden", name !== "tree");
  historyView.classList.toggle("hidden", name !== "history");

  window.scrollTo(0, 0);

  if (name === "tree") {
    renderTree();
    requestAnimationFrame(() => {
      treeScroll.scrollLeft = Math.max(0, (treeScroll.scrollWidth - treeScroll.clientWidth) / 2);
      treeScroll.scrollTop = Math.max(0, treeScroll.scrollHeight - treeScroll.clientHeight - 24);
    });
  }

  if (name === "history") renderHistory();
}

function render() {
  renderStaticIcons();
  const todayTotal = getTodayTotal();
  const weekTotal = getCurrentWeekTotal();
  const rankName = getCurrentRankName();

  maxStat.textContent = progress.pushupMax;
  dayStat.textContent = todayTotal;
  weekStat.textContent = weekTotal;
  totalStat.textContent = progress.pushupTotal;
  rankStat.textContent = rankName;

  homePushMeta.textContent = `${rankName} · Rekord ${progress.pushupMax}`;
  homeTodayStat.textContent = todayTotal;
  homeWeekStat.textContent = weekTotal;
  homeTotalStat.textContent = progress.pushupTotal;

  historyTodayStat.textContent = todayTotal;
  historyWeekStat.textContent = weekTotal;
  historyTotalStat.textContent = progress.pushupTotal;

  const history = Array.isArray(progress.trainingHistory) ? progress.trainingHistory : [];
  if (history.length) {
    historyHomeHint.textContent = `${history.length} ${history.length === 1 ? "Training" : "Trainings"} · zuletzt ${formatWorkoutDate(history[0].date)}`;
  } else {
    historyHomeHint.textContent = "Noch kein Training gespeichert";
  }

  updateQuickVariantPill();
  renderTree();
  renderHistory();
  renderLiveGoals();
}

function getCurrentRankName() {
  if (isNodeDone(getNode("silverRank"))) return "Silber";
  if (isNodeDone(getNode("bronzeRank"))) return "Bronze";
  if (isNodeDone(getNode("stoneRank"))) return "Stein";
  if (isNodeDone(getNode("woodRank"))) return "Holz";
  return "Starter";
}

function getNode(id) {
  return SKILL_NODES.find(node => node.id === id);
}

function getTodayTotal() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return getHistoryTotalBetween(start, end);
}

function getCurrentWeekTotal() {
  const now = new Date();
  const start = startOfLocalWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return getHistoryTotalBetween(start, end);
}

function startOfLocalWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay(); // Sonntag = 0
  const daysSinceMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function getHistoryTotalBetween(start, end) {
  const items = Array.isArray(progress.trainingHistory) ? progress.trainingHistory : [];
  return items.reduce((sum, item) => {
    if (item?.exercise && item.exercise !== "pushups") return sum;
    const date = new Date(item?.date);
    if (Number.isNaN(date.getTime()) || date < start || date >= end) return sum;
    return sum + Math.max(0, Number(item?.reps) || 0);
  }, 0);
}

function calculateBestDayFromHistory(items) {
  const totals = new Map();
  for (const item of items || []) {
    if (item?.exercise && item.exercise !== "pushups") continue;
    const date = new Date(item?.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = localDateString(date);
    totals.set(key, (totals.get(key) || 0) + Math.max(0, Number(item?.reps) || 0));
  }
  return Math.max(0, ...totals.values());
}

function calculateBestWeekFromHistory(items) {
  const totals = new Map();
  for (const item of items || []) {
    if (item?.exercise && item.exercise !== "pushups") continue;
    const date = new Date(item?.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = localDateString(startOfLocalWeek(date));
    totals.set(key, (totals.get(key) || 0) + Math.max(0, Number(item?.reps) || 0));
  }
  return Math.max(0, ...totals.values());
}

// ---------- Skill Tree ----------
function getVariantStats(variant) {
  const allStats = progress.variantStats || createEmptyVariantStats();
  return allStats[variant] || { max: 0, total: 0 };
}

function getVariantMilestoneCount(variant) {
  const stats = getVariantStats(variant);
  let count = 0;
  count += VARIANT_TREE_MILESTONES.max.filter(target => stats.max >= target).length;
  count += VARIANT_TREE_MILESTONES.total.filter(target => stats.total >= target).length;
  return count;
}

function nodeValue(node) {
  if (!node) return 0;
  switch (node.metric) {
    case "standardMax":
      return progress.pushupMax;
    case "total":
      return progress.pushupTotal;
    case "day":
      return progress.pushupBestDay;
    case "week":
      return progress.pushupBestWeek;
    case "variantMax":
      return getVariantStats(node.variant).max;
    case "variantPoints":
      return getVariantMilestoneCount(node.variant);
    default:
      return 0;
  }
}

function isNodeDone(node) {
  if (!node) return false;
  if (node.type === "rank") {
    const doneCount = (node.parents || []).filter(parentId => isNodeDone(getNode(parentId))).length;
    return doneCount >= (node.requirementCount || node.parents?.length || 1);
  }
  return nodeValue(node) >= (node.target || 0);
}

function isNodeAvailable(node) {
  if (!node) return false;
  if (!node.parents?.length) return true;

  if (node.type === "rank") {
    return node.parents.some(parentId => {
      const parent = getNode(parentId);
      return isNodeDone(parent) || isNodeAvailable(parent);
    });
  }

  return node.parents.every(parentId => isNodeDone(getNode(parentId)));
}

function getNodeTitle(node) {
  if (node.metric === "standardMax") return "am Stück";
  if (node.metric === "total") return "gesamt";
  if (node.metric === "day") return "in 24h";
  if (node.metric === "week") return "in 7 Tagen";
  if (node.metric === "variantMax") return VARIANT_META[node.variant]?.shortLabel || "Variante";
  if (node.metric === "variantPoints") return `${VARIANT_META[node.variant]?.shortLabel || "Variante"} Stufe`;
  return "";
}

function getRankDescription(node) {
  const requirementCount = node.requirementCount || 1;
  const finished = (node.parents || []).filter(parentId => isNodeDone(getNode(parentId))).length;
  const lines = (node.parents || []).map(parentId => {
    const parent = getNode(parentId);
    return `${isNodeDone(parent) ? "✓" : "○"} ${getNodeRequirementLabel(parent)}`;
  });
  return `${node.rank}-Rang

${finished}/${requirementCount} Wege geschafft
${lines.join("\n")}`;
}

function getNodeRequirementLabel(node) {
  if (!node) return "";
  if (node.type === "skill") {
    return `${VARIANT_META[node.variant]?.label || "Variante"} freischalten`;
  }
  if (node.metric === "variantPoints") {
    return `${VARIANT_META[node.variant]?.label || "Variante"} ${node.target}/10 Meilensteine`;
  }
  if (node.metric === "variantMax") {
    return `${node.target} ${VARIANT_META[node.variant]?.label || "Variante"}`;
  }
  if (node.metric === "standardMax") return `${node.target} Push-ups am Stück`;
  if (node.metric === "total") return `${node.target} Push-ups gesamt`;
  if (node.metric === "day") return `${node.target} Push-ups in 24h`;
  if (node.metric === "week") return `${node.target} Push-ups in 7 Tagen`;
  return `${node.target}`;
}

function renderTree() {
  skillTree.innerHTML = "";

  SKILL_NODES.forEach(node => {
    (node.parents || []).forEach(parentId => {
      const parent = getNode(parentId);
      if (!parent) return;
      const line = createConnector(parent, node);
      if (isNodeDone(parent) && isNodeDone(node)) line.classList.add("done");
      else if (isNodeDone(parent) && isNodeAvailable(node)) line.classList.add("active");
      skillTree.appendChild(line);
    });
  });

  SKILL_NODES.forEach(node => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `skill-node branch-${node.branch}`;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    if (node.variant && VARIANT_META[node.variant]) {
      el.style.setProperty("--branch", VARIANT_META[node.variant].color);
    }

    const done = isNodeDone(node);
    const available = isNodeAvailable(node);
    if (done) el.classList.add("done");
    else if (available) el.classList.add("next");
    else el.classList.add("locked");

    if (node.type === "rank") {
      el.classList.add("rank-node", `rank-${node.rank.toLowerCase()}`);
      el.innerHTML = `
        <span class="rank-symbol">${getRankIconSvg(node.rank)}</span>
        <span class="node-target">${node.rank.toUpperCase()}</span>
        <span class="node-label">RANG</span>
      `;
      el.addEventListener("click", () => alert(getRankDescription(node)));
      skillTree.appendChild(el);
      return;
    }

    if (node.type === "skill") {
      const meta = VARIANT_META[node.variant] || { label: node.variant, color: "#8B6CFF" };
      const progressCount = getVariantMilestoneCount(node.variant);
      el.classList.add("variant-skill-node", `variant-${node.variant}`);
      el.style.setProperty("--variant-color", meta.color);
      el.innerHTML = `
        <span class="variant-skill-node-icon">${getVariantIconSvg(node.variant)}</span>
        <span class="node-target">${meta.label.toUpperCase()}</span>
        <span class="node-label">${progressCount}/10</span>
        ${!done && !available ? '<span class="node-lock">🔒</span>' : '<span class="node-plus">+</span>'}
      `;
      el.addEventListener("click", () => openVariantModal(node.variant));
      skillTree.appendChild(el);
      return;
    }

    const current = nodeValue(node);
    const title = getNodeTitle(node);
    const progress = Math.max(0, Math.min(100, Math.round((current / Math.max(1, node.target)) * 100)));
    const metricIcon = node.metric === "variantMax"
      ? getVariantIconSvg(node.variant)
      : getMetricIconSvg(node.metric === "standardMax" ? "max" : node.metric);
    el.innerHTML = `
      <span class="node-icon">${metricIcon}</span>
      <span class="node-target">${node.target}</span>
      <span class="node-label">${title}</span>
      <span class="node-progress"><span style="width:${progress}%"></span></span>
      ${!done && !available ? '<span class="node-lock">🔒</span>' : ''}
    `;

    el.addEventListener("click", () => {
      const currentValue = nodeValue(node);
      let detail = `${getNodeRequirementLabel(node)}
Aktuell: ${currentValue}`;
      if (node.metric === "week") detail += `\n\nEine Woche läuft von Montag bis Sonntag.`;
      if (node.metric === "variantMax") detail += `

Diese Wiederholungen zählen nur für ${VARIANT_META[node.variant]?.label || "diese Variante"}.`;
      if (node.metric === "variantPoints") detail += `

Große Varianten-Knoten antippen, um die einzelnen Unter-Meilensteine zu sehen.`;
      alert(detail);
    });

    skillTree.appendChild(el);
  });
}

function openVariantModal(variant) {
  const meta = VARIANT_META[variant] || { label: variant, color: "#8B6CFF" };
  const stats = getVariantStats(variant);
  const milestoneCount = getVariantMilestoneCount(variant);

  variantModalTitle.textContent = `${meta.label} Push-Up`;
  variantModalIcon.innerHTML = getVariantIconSvg(variant); 
  variantModalIcon.style.setProperty("--variant-color", meta.color);
  variantModalSubtitle.textContent = `Unter-Skill-Tree für ${meta.label}. Hauptbaum zeigt später nur den großen Knoten, hier drin liegen die Einzel-Meilensteine.`;
  variantModalProgress.textContent = `${milestoneCount} / 10`;

  variantMaxMilestones.innerHTML = "";
  variantTotalMilestones.innerHTML = "";

  VARIANT_TREE_MILESTONES.max.forEach(target => {
    const item = document.createElement("div");
    item.className = `milestone-item${stats.max >= target ? " done" : ""}`;
    item.innerHTML = `<strong>${target}</strong><span>am Stück</span>`;
    variantMaxMilestones.appendChild(item);
  });

  VARIANT_TREE_MILESTONES.total.forEach(target => {
    const item = document.createElement("div");
    item.className = `milestone-item${stats.total >= target ? " done" : ""}`;
    item.innerHTML = `<strong>${target}</strong><span>gesamt</span>`;
    variantTotalMilestones.appendChild(item);
  });

  variantModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeVariantModal() {
  variantModal.classList.add("hidden");
  if (trainingModal.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

function getProjectedMetrics(variant, sessionReps = repCount) {
  const stats = getVariantStats(variant);
  const projectedVariantMax = Math.max(stats.max, sessionReps);
  const projectedVariantTotal = stats.total + sessionReps;
  return {
    total: progress.pushupTotal + sessionReps,
    week: getCurrentWeekTotal() + sessionReps,
    standardMax: variant === "standard" ? Math.max(progress.pushupMax, sessionReps) : progress.pushupMax,
    variantMax: projectedVariantMax,
    variantTotal: projectedVariantTotal,
    variantPoints: getProjectedVariantMilestoneCount(projectedVariantMax, projectedVariantTotal)
  };
}

function getProjectedVariantMilestoneCount(projectedMax, projectedTotal) {
  return VARIANT_TREE_MILESTONES.max.filter(target => projectedMax >= target).length +
    VARIANT_TREE_MILESTONES.total.filter(target => projectedTotal >= target).length;
}

function getNextArrayGoal(currentValue, targets, label, tone, icon) {
  const sorted = [...targets].sort((a, b) => a - b);
  const nextTarget = sorted.find(target => target > currentValue);
  const previousTarget = [...sorted].reverse().find(target => target <= currentValue) || 0;

  if (!nextTarget) {
    return {
      done: true,
      tone,
      icon,
      title: `${label} abgeschlossen`,
      subtitle: `Alles in diesem Bereich geschafft`,
      current: currentValue,
      target: currentValue || sorted[sorted.length - 1] || 1,
      progress: 100
    };
  }

  const span = Math.max(1, nextTarget - previousTarget);
  const progress = Math.max(4, Math.min(100, Math.round(((currentValue - previousTarget) / span) * 100)));
  return {
    done: false,
    tone,
    icon,
    title: `Noch ${nextTarget - currentValue} bis ${label}`,
    subtitle: `${currentValue} / ${nextTarget}`,
    current: currentValue,
    target: nextTarget,
    progress
  };
}

function getLiveGoalCards() {
  const variant = currentTrainingVariant;
  const meta = VARIANT_META[variant] || VARIANT_META.standard;
  const metrics = getProjectedMetrics(variant, repCount);

  if (variant === "standard") {
    return [
      getNextArrayGoal(metrics.total, SKILL_NODES.filter(node => node.metric === "total").map(node => node.target), "Gesamt-Knoten", "total", getMetricIconSvg("total")),
      getNextArrayGoal(metrics.standardMax, SKILL_NODES.filter(node => node.metric === "standardMax").map(node => node.target), "neuem Rekord", "max", getMetricIconSvg("max")),
      getNextArrayGoal(metrics.week, SKILL_NODES.filter(node => node.metric === "week").map(node => node.target), "Wochen-Knoten", "week", getMetricIconSvg("week"))
    ];
  }

  return [
    getNextArrayGoal(metrics.total, SKILL_NODES.filter(node => node.metric === "total").map(node => node.target), "Gesamt-Knoten", "total", getMetricIconSvg("total")),
    getNextArrayGoal(metrics.variantMax, VARIANT_TREE_MILESTONES.max, `${meta.label} am Stück`, "variant", getVariantIconSvg(variant)),
    getNextArrayGoal(metrics.variantTotal, VARIANT_TREE_MILESTONES.total, `${meta.label} gesamt`, "variant-soft", getMetricIconSvg("total"))
  ];
}

function renderLiveGoals() {
  if (!liveGoalsList) return;
  const meta = VARIANT_META[currentTrainingVariant] || VARIANT_META.standard;
  liveGoalsVariantHint.textContent = `${meta.label} · ${repCount} Reps`;
  const cards = getLiveGoalCards();
  liveGoalsList.innerHTML = "";

  cards.forEach(card => {
    const item = document.createElement("article");
    item.className = `live-goal-card tone-${card.tone}${card.done ? " goal-done" : ""}`;
    item.innerHTML = `
      <div class="live-goal-icon">${card.icon}</div>
      <div class="live-goal-copy">
        <strong>${card.title}</strong>
        <div class="live-goal-progress"><span style="width:${card.progress}%"></span></div>
        <small>${card.subtitle}</small>
      </div>
    `;
    liveGoalsList.appendChild(item);
  });
}

function getNodeDimensions(node) {
  if (node.type === "rank") return { width: 130, height: 114 };
  if (node.type === "skill") return { width: 126, height: 112 };
  return { width: 104, height: 104 };
}

function createConnector(from, to) {
  const line = document.createElement("div");
  line.className = `connector branch-${to.branch}`;

  const fromSize = getNodeDimensions(from);
  const toSize = getNodeDimensions(to);
  const x1 = from.x + fromSize.width / 2;
  const y1 = from.y + fromSize.height / 2;
  const x2 = to.x + toSize.width / 2;
  const y2 = to.y + toSize.height / 2;
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

// ---------- Historie ----------
function renderHistory() {
  const items = Array.isArray(progress.trainingHistory)
    ? progress.trainingHistory.slice(0, 200)
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
    const variant = VARIANT_META[item?.variant]?.label || "Standard";
    details.textContent = `${variant} · ${mode} · ${duration}`;

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

// ---------- Training Modal ----------
function showStep(stepName) {
  [exerciseStep, variantStep, quickStep, resultStep, successStep].forEach(el => el.classList.add("hidden"));

  if (stepName === "exercise") {
    exerciseStep.classList.remove("hidden");
    trainingTitle.textContent = "Übung auswählen";
    backBtn.classList.add("hidden");
  }
  if (stepName === "variant") {
    variantStep.classList.remove("hidden");
    trainingTitle.textContent = "Variante wählen";
    backBtn.classList.remove("hidden");
  }
  if (stepName === "quick") {
    quickStep.classList.remove("hidden");
    trainingTitle.textContent = `${VARIANT_META[currentTrainingVariant]?.label || "Push-up"} Training`;
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
  document.body.style.overflow = variantModal.classList.contains("hidden") ? "" : "hidden";
  render();
}

function updateQuickVariantPill() {
  const meta = VARIANT_META[currentTrainingVariant] || VARIANT_META.standard;
  quickVariantPill.innerHTML = `${getVariantIconSvg(currentTrainingVariant)}<span>${meta.label.toUpperCase()} PUSH-UP</span>`;
  quickVariantPill.style.setProperty("--variant-color", meta.color);
}

function setSelectedTrainingVariant(variant) {
  currentTrainingVariant = VARIANT_META[variant] ? variant : "standard";
  variantCards.forEach(card => card.classList.toggle("selected", card.dataset.variant === currentTrainingVariant));
  updateQuickVariantPill();
  renderLiveGoals();
}

function resetTrainingSession() {
  workoutActive = false;
  countdownActive = false;
  manualMode = false;
  cameraWasStarted = false;
  stopTimer();
  stopDetectionLoop();
  stopCamera();
  setSelectedTrainingVariant("standard");

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
  cameraStatus.textContent = "Kein Kamerabild auf dem Screen: Zähler, Variante und nächste Ziele stehen im Fokus.";
  renderLiveGoals();
}
// ---------- Face Detector ----------
async function ensureMediaPipeModule() {
  if (FaceDetector && FilesetResolver) return;
  if (mediaPipeModuleLoading) return mediaPipeModuleLoading;

  mediaPipeModuleLoading = import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm")
    .then(module => {
      FaceDetector = module.FaceDetector;
      FilesetResolver = module.FilesetResolver;
    })
    .catch(error => {
      console.error("MediaPipe konnte nicht geladen werden:", error);
      throw new Error("Die Kamera-Erkennung konnte nicht geladen werden. Bitte prüfe kurz deine Internetverbindung und versuche es erneut.");
    })
    .finally(() => {
      mediaPipeModuleLoading = null;
    });

  return mediaPipeModuleLoading;
}

async function initFaceDetector() {
  await ensureMediaPipeModule();
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
  renderLiveGoals();

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
    renderLiveGoals();

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
  renderLiveGoals();

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

  const variant = currentTrainingVariant;
  const oldMax = progress.pushupMax;
  const oldRank = getCurrentRankName();

  progress.variantStats = progress.variantStats || createEmptyVariantStats();
  if (!progress.variantStats[variant]) progress.variantStats[variant] = { max: 0, total: 0 };

  progress.variantStats[variant].max = Math.max(progress.variantStats[variant].max, reps);
  progress.variantStats[variant].total += reps;

  if (variant === "standard") {
    progress.pushupMax = Math.max(progress.pushupMax, reps);
  }

  progress.pushupTotal += reps;
  progress.lastTrainingDate = localDateString(new Date());

  progress.trainingHistory.unshift({
    exercise: "pushups",
    variant,
    reps,
    autoDetectedReps: cameraWasStarted && !manualMode ? repCount : null,
    durationSeconds: elapsedSeconds,
    date: new Date().toISOString(),
    usedCamera: cameraWasStarted,
    mode: cameraWasStarted && !manualMode ? "face-quick-v06-engine" : "manual",
    calibrationTopMetric: baselineTopMetric
  });

  const todayTotal = getTodayTotal();
  const weekTotal = getCurrentWeekTotal();
  progress.pushupBestDay = Math.max(progress.pushupBestDay, todayTotal);
  progress.pushupBestWeek = Math.max(progress.pushupBestWeek, weekTotal);
  progress.trainingHistory = progress.trainingHistory.slice(0, 200);
  saveProgress();
  render();

  const newRank = getCurrentRankName();
  const isNewRecord = variant === "standard" && reps > oldMax;
  const rankUp = newRank !== oldRank;
  const variantStats = getVariantStats(variant);

  successDetails.innerHTML = "";
  addSuccessLine(`${reps} ${VARIANT_META[variant]?.label || "Push-up"}-Push-ups gespeichert`);
  addSuccessLine(`Heute: ${todayTotal} Push-ups`);
  addSuccessLine(`Diese Woche: ${weekTotal} Push-ups`);
  addSuccessLine(`Gesamt: ${progress.pushupTotal} Push-ups`);
  addSuccessLine(`${VARIANT_META[variant]?.label || "Variante"}: ${variantStats.max} max · ${variantStats.total} gesamt`);

  if (variant === "standard") {
    if (isNewRecord) addSuccessLine(`🏆 Neuer Standard-Rekord: ${progress.pushupMax}`, true);
    else addSuccessLine(`Standard-Rekord bleibt bei ${progress.pushupMax}`);
  }

  if (rankUp) addSuccessLine(`⭐ Neuer Rang: ${newRank}`, true);
  else addSuccessLine(`Rang: ${newRank}`);

  showStep("success");
}

function addSuccessLine(text, good = false) {
  const line = document.createElement("div");
  line.className = `success-line${good ? " good" : ""}`;
  line.textContent = text;
  successDetails.appendChild(line);
}

function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
document.getElementById("openPushTreeBtn").addEventListener("click", () => showView("tree"));
document.getElementById("treeBackBtn").addEventListener("click", () => showView("home"));
document.getElementById("openHistoryBtn").addEventListener("click", () => showView("history"));
document.getElementById("historyBackBtn").addEventListener("click", () => showView("home"));

document.getElementById("openTrainingBtn").addEventListener("click", openTraining);
document.getElementById("closeTrainingBtn").addEventListener("click", closeTraining);

document.querySelector('[data-exercise="pushups"]').addEventListener("click", () => {
  showStep("variant");
});

variantCards.forEach(card => {
  card.addEventListener("click", () => setSelectedTrainingVariant(card.dataset.variant));
});

startSelectedVariantBtn.addEventListener("click", () => {
  updateQuickVariantPill();
  showStep("quick");
});

backBtn.addEventListener("click", () => {
  if (!resultStep.classList.contains("hidden")) {
    showStep("quick");
    return;
  }
  if (!quickStep.classList.contains("hidden")) {
    showStep("variant");
    return;
  }
  if (!variantStep.classList.contains("hidden")) {
    showStep("exercise");
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
document.getElementById("doneBtn").addEventListener("click", () => {
  closeTraining();
  showView("home");
});
closeVariantModalBtn.addEventListener("click", closeVariantModal);
variantModal.addEventListener("click", (event) => {
  if (event.target === variantModal) closeVariantModal();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Wirklich alle lokalen Testdaten löschen?")) return;
  [STORAGE_KEY, ...OLD_STORAGE_KEYS].forEach(key => localStorage.removeItem(key));
  progress = { ...DEFAULT_PROGRESS, trainingHistory: [] };
  saveProgress();
  render();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && !workoutActive && !countdownActive) {
    stopDetectionLoop();
    stopCamera();
  }
});

render();
showView("home");
