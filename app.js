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
  baselineAdaptation: 0.01,
  autoSetEndLossMs: 1700
};

const DEFAULT_PROGRESS = {
  pushupMax: 0,
  pushupTotal: 0,
  pushupBestDay: 0,
  pushupBestWeek: 0,
  // Nur für saubere Migration älterer Versionen behalten; v0.8 zeigt/benutzt keine Streak mehr.
  pushupStreak: 0,
  lastTrainingDate: null,
  heroGender: "male",
  variantStats: {},
  challengeProgress: createEmptyChallengeProgress(),
  trainingHistory: [],
  entrySetupDone: false,
  entryPath: null,
  entryAssessmentPending: false,
  accountName: "Athlete",
  accountXp: 0,
  selectedAvatar: "starter",
  selectedAccent: "blue",
  selectedBackground: "ara"
};

const VARIANT_META = {
  standard: { label: "Standard", shortLabel: "Standard", color: "#4DA3FF" },
  wall: { label: "Wall", shortLabel: "Wall", color: "#6C9CFF" },
  wide: { label: "Wide", shortLabel: "Wide", color: "#E65BC8" },
  military: { label: "Military", shortLabel: "Military", color: "#FF5D6C" },
  diamond: { label: "Diamond", shortLabel: "Diamond", color: "#F2A65A" },
  pike: { label: "Pike", shortLabel: "Pike", color: "#43C889" },
  incline: { label: "Incline", shortLabel: "Incline", color: "#9B6CFF" },
  decline: { label: "Decline", shortLabel: "Decline", color: "#4EDCE6" },
  explosive: { label: "Explosive", shortLabel: "Explosive", color: "#F0B429" },
  archer: { label: "Archer", shortLabel: "Archer", color: "#6D7CF6" },
  handstand: { label: "Handstand", shortLabel: "Handstand", color: "#28B8A7" },
  pseudoPlanche: { label: "Pseudo Planche", shortLabel: "Planche", color: "#D05CE3" }
};

const VARIANT_XP_PER_REP = {
  wall: 1,
  incline: 1.5,
  standard: 2,
  wide: 2.25,
  military: 2.4,
  decline: 2.4,
  diamond: 2.5,
  pike: 3,
  explosive: 3,
  archer: 3.5,
  handstand: 4,
  pseudoPlanche: 4.5
};

const ACCOUNT_AVATARS = [
  { id: "starter", label: "Starter", icon: "BP", level: 1 },
  { id: "bolt", label: "Bolt", icon: "⚡", level: 1 },
  { id: "peak", label: "Peak", icon: "▲", level: 1 },
  { id: "crown", label: "Champion", icon: "♛", level: 1 }
];

const ACCOUNT_ACCENTS = [
  { id: "blue", label: "BodyPath Blue", color: "#4DA3FF", level: 1 },
  { id: "violet", label: "Violet", color: "#9B6CFF", level: 1 },
  { id: "emerald", label: "Emerald", color: "#43C889", level: 1 },
  { id: "crimson", label: "Crimson", color: "#FF5D6C", level: 1 }
];

const ACCOUNT_BACKGROUNDS = [
  { id: "ara", label: "Jungle Ara", level: 1, type: "image", value: "bg-ara-banner.webp" },
  { id: "turtle", label: "Sea Turtle", level: 1, type: "image", value: "bg-turtle-banner.webp" },
  { id: "fox", label: "Autumn Fox", level: 1, type: "image", value: "bg-fox-banner.webp" },
  { id: "owl", label: "Moon Owl", level: 1, type: "image", value: "bg-owl-banner.webp" }
];


// Varianten mit einem echten Freischalt-Knoten erscheinen im Training erst,
// sobald dieser Knoten im Skill Tree erreichbar ist. Varianten ohne Eintrag
// bleiben vorerst Basis-Varianten. Neue Spezialübungen können später einfach
// hier an ihren Unlock-Knoten gekoppelt werden.
const VARIANT_UNLOCK_NODES = {
  standard: null,
  wall: null,
  wide: "wideSkill",
  military: "militarySkill",
  diamond: "diamondSkill",
  pike: null,
  incline: null,
  decline: null,
  explosive: "explosiveSkill",
  archer: "archerSkill",
  handstand: "handstandSkill",
  pseudoPlanche: "pseudoPlancheSkill"
};

const VARIANT_TREE_MILESTONES = {
  max: [1, 3, 8, 17, 30],
  total: [10, 25, 75, 150, 300]
};

// v0.10.19: Jede Variante hat jetzt einen eigenen kleinen Unter-Skill-Tree.
// Der Hauptbaum zeigt nur noch den großen Varianten-Knoten und einen
// Prozentwert, wie weit dieser Unterbaum bereits abgeschlossen ist.
const VARIANT_SUBTREE_MILESTONES = {
  max: [3, 8, 15],
  sets: [3, 10, 25],
  day: [10, 25, 50],
  week: [20, 60, 150],
  total: [10, 30, 75]
};

const VARIANT_SUBTREE_LAYOUT = {
  root: { x: 50, y: 84 },
  max: { x: 14, y: 18 },
  day: { x: 50, y: 10 },
  total: { x: 86, y: 18 },
  sets: { x: 28, y: 46 },
  week: { x: 72, y: 46 }
};

const RANK_ORDER = ["Starter", "Holz", "Stein", "Bronze", "Silber", "Gold", "Platin", "Diamant I", "Diamant II", "Diamant III", "Diamant IV"];
const HOME_CHALLENGE_TIERS = {
  day: [
    { id: "day-1", level: "I", target: 50, unlockRank: "Bronze" },
    { id: "day-2", level: "II", target: 100, unlockRank: "Silber" },
    { id: "day-3", level: "III", target: 150, unlockRank: "Gold" },
    { id: "day-4", level: "IV", target: 200, unlockRank: "Platin" }
  ],
  week: [
    { id: "week-1", level: "I", target: 250, unlockRank: "Bronze" },
    { id: "week-2", level: "II", target: 500, unlockRank: "Silber" },
    { id: "week-3", level: "III", target: 750, unlockRank: "Gold" },
    { id: "week-4", level: "IV", target: 1000, unlockRank: "Platin" }
  ]
};

function createEmptyChallengeProgress() {
  return {
    day: { completed: [], activeId: null, periodKey: null, baseline: 0 },
    week: { completed: [], activeId: null, periodKey: null, baseline: 0 }
  };
}

function createEmptyVariantStats() {
  return Object.fromEntries(
    Object.keys(VARIANT_META).map(key => [key, { max: 0, total: 0 }])
  );
}


// ---------- v0.10.1 Generated Asset Icon System ----------
const ASSET_PATHS = {
  variants: {
    standard: "variant-standard-v1134.webp",
    wall: "variant-wall-v1134.webp",
    wide: "variant-wide-v1134.webp",
    military: "variant-military-v1134.webp",
    diamond: "variant-diamond-v1134.webp",
    pike: "variant-pike.webp",
    incline: "variant-incline-v1134.webp",
    decline: "variant-decline-v1134.webp",
    explosive: "variant-explosive.webp",
    archer: "variant-archer.webp",
    handstand: "variant-handstand.webp",
    pseudoPlanche: "variant-pseudo-planche.webp"
  },
  metrics: {
    max: "metric-max.webp",
    total: "metric-total.webp",
    day: "metric-day.webp",
    week: "metric-week.webp"
  },
  ranks: {
    Holz: { frame: "rank-frame-wood.webp", icon: "rank-skill-pushup.webp" },
    Stein: { frame: "rank-frame-stone.webp", icon: "rank-skill-pushup.webp" },
    Bronze: { frame: "rank-frame-bronze.webp", icon: "rank-skill-pushup.webp" },
    Silber: { frame: "rank-frame-silver.webp", icon: "rank-skill-pushup.webp" },
    Gold: { frame: "rank-frame-gold.webp", icon: "rank-skill-pushup.webp" },
    Platin: { frame: "rank-frame-platinum.webp", icon: "rank-skill-pushup.webp" },
    Diamant: { frame: "rank-frame-diamond.webp", icon: "rank-skill-pushup.webp" }
  }
};

function assetImg(src, alt = "", className = "") {
  return `<img class="app-asset-icon ${className}" src="${src}" alt="${alt}" loading="eager" decoding="async" draggable="false" />`;
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
  const assetRank = String(rank || "").startsWith("Diamant") ? "Diamant" : rank;
  const asset = ASSET_PATHS.ranks[assetRank] || ASSET_PATHS.ranks.Holz;
  const outerClass = ["rank-asset-stack", className].filter(Boolean).join(" ");
  return `
    <span class="${outerClass}" role="img" aria-label="${rank} Rank">
      <img class="rank-frame-img" src="${asset.frame}" alt="" loading="eager" decoding="async" draggable="false" />
      <img class="rank-skill-img" src="${asset.icon}" alt="" loading="eager" decoding="async" draggable="false" />
    </span>
  `;
}

function renderStaticIcons() {
  document.querySelectorAll("[data-variant-icon]").forEach(el => {
    const variant = el.dataset.variantIcon || "standard";
    const src = ASSET_PATHS.variants[variant] || ASSET_PATHS.variants.standard;
    const current = el.querySelector("img.app-asset-icon");
    if (current?.getAttribute("src") === src) return;
    el.innerHTML = getVariantIconSvg(variant);
  });
  document.querySelectorAll("[data-metric-icon]").forEach(el => {
    const metric = ["max", "total", "day", "week"].includes(el.dataset.metricIcon) ? el.dataset.metricIcon : "max";
    const src = ASSET_PATHS.metrics[metric];
    const current = el.querySelector("img.app-asset-icon");
    if (current?.getAttribute("src") === src) return;
    el.innerHTML = getMetricIconSvg(metric);
  });
}

// v0.10.18: Rang-Kapitel statt Statistik-Matrix.
//
// Der Hauptpfad besteht pro Kapitel aus wenigen, unterschiedlichen Zielen,
// einer sichtbaren Rang-Prüfung (Boss-Knoten) und optionalen Variantenästen.
// Dadurch bleibt der Tree übersichtlich, wirkt aber deutlich mehr wie ein
// gewachsener Skill Tree als wie vier parallele Zahlenlisten.
//
// x benutzt weiterhin die fünf responsiven Spalten. y läuft von unten nach oben.
const SKILL_NODES = [
  // -----------------------------------------------------------------------
  // START -> HOLZ
  // -----------------------------------------------------------------------
  { id: "standard1", type: "metric", metric: "standardMax", branch: "max", target: 1, x: 328, y: 5380, tier: "holz", discoveryGroup: "main:max" },
  { id: "woodRank", type: "rank", branch: "rank", rank: "Holz", rankAsset: "Holz", x: 328, y: 5220, parents: ["standard1"], requirementCount: 1, tier: "holz" },

  // -----------------------------------------------------------------------
  // HOLZ-KAPITEL — Basics + erster Seitenast
  // -----------------------------------------------------------------------
  { id: "standard5", type: "metric", metric: "standardMax", branch: "max", target: 5, x: 188, y: 5040, parents: ["woodRank"], tier: "holz", discoveryGroup: "main:max" },
  { id: "total25", type: "metric", metric: "total", branch: "total", target: 25, x: 468, y: 5040, parents: ["woodRank"], tier: "holz", discoveryGroup: "main:total" },
  { id: "trainingDays2", type: "metric", metric: "trainingDays", branch: "week", target: 2, x: 328, y: 4890, parents: ["woodRank"], tier: "holz", discoveryGroup: "main:days" },

  // Wide ist ein optionaler Mini-Ast. Der große Skill-Knoten ist der Unlock;
  // danach kann der Ast unabhängig vom Rang weiter gemeistert werden.
  { id: "wideSkill", type: "skill", metric: "variantTotal", variant: "wide", branch: "variant", target: 5, x: 595, y: 4950, parents: ["woodRank"], tier: "holz" },
  { id: "wideMastery", type: "metric", metric: "variantMax", variant: "wide", branch: "variant", target: 10, x: 595, y: 4780, parents: ["wideSkill"], tier: "holz", discoveryGroup: "variant:wide" },

  { id: "stoneTrial", type: "challenge", metric: "workoutTotal", branch: "challenge", target: 20, x: 328, y: 4680, parents: ["woodRank"], tier: "holz", challengeTitle: "BASIS-PRÜFUNG", challengeShort: "20 WDH.", challengeIcon: "★" },
  { id: "stoneRank", type: "rank", branch: "rank", rank: "Stein", rankAsset: "Stein", x: 328, y: 4500, parents: ["standard5", "total25", "trainingDays2", "stoneTrial"], requirementCount: 3, requiredParents: ["stoneTrial"], tier: "stein" },

  // -----------------------------------------------------------------------
  // STEIN-KAPITEL — erste echte Routine
  // -----------------------------------------------------------------------
  { id: "standard12", type: "metric", metric: "standardMax", branch: "max", target: 12, x: 92, y: 4320, parents: ["stoneRank"], tier: "stein", discoveryGroup: "main:max" },
  { id: "total100", type: "metric", metric: "total", branch: "total", target: 100, x: 328, y: 4320, parents: ["stoneRank"], tier: "stein", discoveryGroup: "main:total" },
  { id: "week75", type: "metric", metric: "week", branch: "week", target: 75, x: 468, y: 4320, parents: ["stoneRank"], tier: "stein", discoveryGroup: "main:week" },

  { id: "bronzeTrial", type: "challenge", metric: "workoutTotal", branch: "challenge", target: 50, x: 328, y: 4140, parents: ["stoneRank"], tier: "stein", challengeTitle: "KRAFT-PROBE", challengeShort: "50 WDH.", challengeIcon: "★" },
  { id: "bronzeRank", type: "rank", branch: "rank", rank: "Bronze", rankAsset: "Bronze", x: 328, y: 3960, parents: ["standard12", "total100", "week75", "bronzeTrial"], requirementCount: 3, requiredParents: ["bronzeTrial"], tier: "bronze" },

  // -----------------------------------------------------------------------
  // BRONZE-KAPITEL — Konstanz + Diamond-Seitenast
  // -----------------------------------------------------------------------
  { id: "standard20", type: "metric", metric: "standardMax", branch: "max", target: 20, x: 52, y: 3780, parents: ["bronzeRank"], tier: "bronze", discoveryGroup: "main:max" },
  { id: "total250", type: "metric", metric: "total", branch: "total", target: 250, x: 328, y: 3780, parents: ["bronzeRank"], tier: "bronze", discoveryGroup: "main:total" },
  { id: "trainingDays7", type: "metric", metric: "trainingDays", branch: "week", target: 7, x: 468, y: 3780, parents: ["bronzeRank"], tier: "bronze", discoveryGroup: "main:days" },

  { id: "diamondSkill", type: "skill", metric: "variantTotal", variant: "diamond", branch: "variant", target: 5, x: 595, y: 3780, parents: ["bronzeRank"], tier: "bronze" },
  { id: "diamondMastery", type: "metric", metric: "variantMax", variant: "diamond", branch: "variant", target: 10, x: 595, y: 3610, parents: ["diamondSkill"], tier: "bronze", discoveryGroup: "variant:diamond" },

  { id: "silverTrial", type: "challenge", metric: "workoutSets", branch: "challenge", target: 2, x: 328, y: 3600, parents: ["bronzeRank"], tier: "bronze", challengeTitle: "SET-RHYTHMUS", challengeShort: "2 SETS", challengeIcon: "★" },
  { id: "silverRank", type: "rank", branch: "rank", rank: "Silber", rankAsset: "Silber", x: 328, y: 3420, parents: ["standard20", "total250", "trainingDays7", "silverTrial"], requirementCount: 3, requiredParents: ["silverTrial"], tier: "silber" },

  // -----------------------------------------------------------------------
  // SILBER-KAPITEL — Volumen + Explosive (Pflicht für Gold)
  // -----------------------------------------------------------------------
  { id: "standard50", type: "metric", metric: "standardMax", branch: "max", target: 50, x: 52, y: 3240, parents: ["silverRank"], tier: "silber", discoveryGroup: "main:max" },
  { id: "total1000", type: "metric", metric: "total", branch: "total", target: 1000, x: 328, y: 3240, parents: ["silverRank"], tier: "silber", discoveryGroup: "main:total" },
  { id: "week500", type: "metric", metric: "week", branch: "week", target: 500, x: 468, y: 3240, parents: ["silverRank"], tier: "silber", discoveryGroup: "main:week" },

  { id: "explosiveSkill", type: "skill", metric: "variantTotal", variant: "explosive", branch: "variant", target: 10, x: 595, y: 3240, parents: ["silverRank"], tier: "silber" },
  { id: "explosiveMastery", type: "metric", metric: "variantMax", variant: "explosive", branch: "variant", target: 10, x: 595, y: 3070, parents: ["explosiveSkill"], tier: "silber", discoveryGroup: "variant:explosive" },

  { id: "goldTrial", type: "challenge", metric: "workoutTotal", branch: "challenge", target: 100, x: 328, y: 3060, parents: ["silverRank"], tier: "silber", challengeTitle: "GOLD-PRÜFUNG", challengeShort: "100 WDH.", challengeIcon: "★" },
  { id: "goldRank", type: "rank", branch: "rank", rank: "Gold", rankAsset: "Gold", x: 328, y: 2880, parents: ["standard50", "total1000", "week500", "explosiveSkill", "goldTrial"], requirementCount: 4, requiredParents: ["explosiveSkill", "goldTrial"], tier: "gold" },

  // -----------------------------------------------------------------------
  // GOLD-KAPITEL — fortgeschrittene Kraft + Archer
  // -----------------------------------------------------------------------
  { id: "standard75", type: "metric", metric: "standardMax", branch: "max", target: 75, x: 52, y: 2700, parents: ["goldRank"], tier: "gold", discoveryGroup: "main:max" },
  { id: "total5000", type: "metric", metric: "total", branch: "total", target: 5000, x: 328, y: 2700, parents: ["goldRank"], tier: "gold", discoveryGroup: "main:total" },
  { id: "trainingDays20", type: "metric", metric: "trainingDays", branch: "week", target: 20, x: 468, y: 2700, parents: ["goldRank"], tier: "gold", discoveryGroup: "main:days" },

  { id: "archerSkill", type: "skill", metric: "variantTotal", variant: "archer", branch: "variant", target: 10, x: 595, y: 2700, parents: ["goldRank"], tier: "gold" },
  { id: "archerMastery", type: "metric", metric: "variantMax", variant: "archer", branch: "variant", target: 10, x: 595, y: 2530, parents: ["archerSkill"], tier: "gold", discoveryGroup: "variant:archer" },

  { id: "platinumTrial", type: "challenge", metric: "workoutVariants", branch: "challenge", target: 3, x: 328, y: 2520, parents: ["goldRank"], tier: "gold", challengeTitle: "MASTER-MIX", challengeShort: "3 VARIANTEN", challengeIcon: "★" },
  { id: "platinumRank", type: "rank", branch: "rank", rank: "Platin", rankAsset: "Platin", x: 328, y: 2340, parents: ["standard75", "total5000", "trainingDays20", "archerSkill", "platinumTrial"], requirementCount: 4, requiredParents: ["archerSkill", "platinumTrial"], tier: "platin" },

  // -----------------------------------------------------------------------
  // PLATIN-KAPITEL — Handstand öffnet die Diamant-Mastery
  // -----------------------------------------------------------------------
  { id: "standard100", type: "metric", metric: "standardMax", branch: "max", target: 100, x: 52, y: 2160, parents: ["platinumRank"], tier: "platin", discoveryGroup: "main:max" },
  { id: "total10000", type: "metric", metric: "total", branch: "total", target: 10000, x: 328, y: 2160, parents: ["platinumRank"], tier: "platin", discoveryGroup: "main:total" },
  { id: "week1500", type: "metric", metric: "week", branch: "week", target: 1500, x: 468, y: 2160, parents: ["platinumRank"], tier: "platin", discoveryGroup: "main:week" },

  { id: "handstandSkill", type: "skill", metric: "variantTotal", variant: "handstand", branch: "variant", target: 5, x: 595, y: 2160, parents: ["platinumRank"], tier: "platin" },
  { id: "handstandMastery", type: "metric", metric: "variantMax", variant: "handstand", branch: "variant", target: 10, x: 595, y: 1990, parents: ["handstandSkill"], tier: "platin", discoveryGroup: "variant:handstand" },

  { id: "diamond1Trial", type: "challenge", metric: "workoutSets", branch: "challenge", target: 4, x: 328, y: 1980, parents: ["platinumRank"], tier: "platin", challengeTitle: "DIAMANT-PRÜFUNG", challengeShort: "4 SETS", challengeIcon: "◆" },
  { id: "diamondRank", type: "rank", branch: "rank", rank: "Diamant I", rankAsset: "Diamant", x: 328, y: 1800, parents: ["standard100", "total10000", "week1500", "handstandSkill", "diamond1Trial"], requirementCount: 4, requiredParents: ["handstandSkill", "diamond1Trial"], tier: "diamant" },

  // -----------------------------------------------------------------------
  // DIAMANT I -> II — erste echte Mastery-Stufe
  // -----------------------------------------------------------------------
  { id: "standard125", type: "metric", metric: "standardMax", branch: "max", target: 125, x: 52, y: 1620, parents: ["diamondRank"], tier: "diamant", discoveryGroup: "main:max" },
  { id: "total25000", type: "metric", metric: "total", branch: "total", target: 25000, x: 328, y: 1620, parents: ["diamondRank"], tier: "diamant", discoveryGroup: "main:total" },
  { id: "trainingDays50", type: "metric", metric: "trainingDays", branch: "week", target: 50, x: 468, y: 1620, parents: ["diamondRank"], tier: "diamant", discoveryGroup: "main:days" },

  { id: "diamond2Trial", type: "challenge", metric: "workoutTotal", branch: "challenge", target: 150, x: 328, y: 1440, parents: ["diamondRank"], tier: "diamant", challengeTitle: "DIAMANT II", challengeShort: "150 WDH.", challengeIcon: "◆" },
  { id: "diamond2Rank", type: "rank", branch: "rank", rank: "Diamant II", rankAsset: "Diamant", x: 328, y: 1260, parents: ["standard125", "total25000", "trainingDays50", "handstandSkill", "diamond2Trial"], requirementCount: 4, requiredParents: ["handstandSkill", "diamond2Trial"], tier: "diamant" },

  // -----------------------------------------------------------------------
  // DIAMANT II -> III — Pseudo Planche als neuer Geheim-/Mastery-Ast
  // -----------------------------------------------------------------------
  { id: "standard150", type: "metric", metric: "standardMax", branch: "max", target: 150, x: 52, y: 1080, parents: ["diamond2Rank"], tier: "diamant", discoveryGroup: "main:max" },
  { id: "total50000", type: "metric", metric: "total", branch: "total", target: 50000, x: 328, y: 1080, parents: ["diamond2Rank"], tier: "diamant", discoveryGroup: "main:total" },
  { id: "week3000", type: "metric", metric: "week", branch: "week", target: 3000, x: 468, y: 1080, parents: ["diamond2Rank"], tier: "diamant", discoveryGroup: "main:week" },

  { id: "pseudoPlancheSkill", type: "skill", metric: "variantTotal", variant: "pseudoPlanche", branch: "variant", target: 5, x: 595, y: 1080, parents: ["diamond2Rank"], tier: "diamant" },
  { id: "pseudoPlancheMastery", type: "metric", metric: "variantMax", variant: "pseudoPlanche", branch: "variant", target: 10, x: 595, y: 910, parents: ["pseudoPlancheSkill"], tier: "diamant", discoveryGroup: "variant:pseudoPlanche" },

  { id: "diamond3Trial", type: "challenge", metric: "workoutVariants", branch: "challenge", target: 4, x: 328, y: 900, parents: ["diamond2Rank"], tier: "diamant", challengeTitle: "DIAMANT III", challengeShort: "4 VARIANTEN", challengeIcon: "◆" },
  { id: "diamond3Rank", type: "rank", branch: "rank", rank: "Diamant III", rankAsset: "Diamant", x: 328, y: 720, parents: ["standard150", "total50000", "week3000", "pseudoPlancheSkill", "diamond3Trial"], requirementCount: 4, requiredParents: ["pseudoPlancheSkill", "diamond3Trial"], tier: "diamant" },

  // -----------------------------------------------------------------------
  // DIAMANT III -> IV — derzeitiges Endgame
  // -----------------------------------------------------------------------
  { id: "standard200", type: "metric", metric: "standardMax", branch: "max", target: 200, x: 52, y: 540, parents: ["diamond3Rank"], tier: "diamant", discoveryGroup: "main:max" },
  { id: "total100000", type: "metric", metric: "total", branch: "total", target: 100000, x: 328, y: 540, parents: ["diamond3Rank"], tier: "diamant", discoveryGroup: "main:total" },
  { id: "trainingDays100", type: "metric", metric: "trainingDays", branch: "week", target: 100, x: 468, y: 540, parents: ["diamond3Rank"], tier: "diamant", discoveryGroup: "main:days" },

  { id: "diamond4Trial", type: "challenge", metric: "workoutTotal", branch: "challenge", target: 250, x: 328, y: 360, parents: ["diamond3Rank"], tier: "diamant", challengeTitle: "FINAL-PRÜFUNG", challengeShort: "250 WDH.", challengeIcon: "◆" },
  { id: "diamond4Rank", type: "rank", branch: "rank", rank: "Diamant IV", rankAsset: "Diamant", x: 328, y: 180, parents: ["standard200", "total100000", "trainingDays100", "pseudoPlancheSkill", "diamond4Trial"], requirementCount: 4, requiredParents: ["pseudoPlancheSkill", "diamond4Trial"], tier: "diamant" }
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
let autoCountdownPending = false;
let lastRailNextKey = null;

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

// v0.10.9: Ein Workout kann aus mehreren Sets und Varianten bestehen.
let trainingPhase = "prep"; // prep | countdown | active | transition | pause | result
let workoutSessionStartedAt = null;
let workoutSets = [];
let sessionTotalReps = 0;
let currentSetStartedAt = null;
let setEnding = false;
let pauseStartedAt = null;
let pauseInterval = null;
let pauseSeconds = 0;
let lastPauseVibrationMark = 0;
let entryAssessmentActive = false;

// ---------- DOM ----------
const homeView = document.getElementById("homeView");
const treeView = document.getElementById("treeView");
const historyView = document.getElementById("historyView");
const profileView = document.getElementById("profileView");
const skillsView = document.getElementById("skillsView");
const treeScroll = document.getElementById("treeScroll");
const skillTree = document.getElementById("skillTree");

const maxStat = document.getElementById("maxStat");
const dayStat = document.getElementById("dayStat");
const weekStat = document.getElementById("weekStat");
const totalStat = document.getElementById("totalStat");
const rankStat = document.getElementById("rankStat");
const treeStatsSheet = document.getElementById("treeStatsSheet");

const homePushMeta = document.getElementById("homePushMeta");
const homeTodayStat = document.getElementById("homeTodayStat");
const homeWeekStat = document.getElementById("homeWeekStat");
const homeTotalStat = document.getElementById("homeTotalStat");
const historyHomeHint = document.getElementById("historyHomeHint");
const homeRankIcon = document.getElementById("homeRankIcon");
const homeRankName = document.getElementById("homeRankName");
const homeNextGoalTitle = document.getElementById("homeNextGoalTitle");
const homeNextGoalText = document.getElementById("homeNextGoalText");
const homeNextGoalValue = document.getElementById("homeNextGoalValue");
const homeNextGoalProgress = document.getElementById("homeNextGoalProgress");
const homeRankPaths = document.getElementById("homeRankPaths");
const homeDayGoalValue = document.getElementById("homeDayGoalValue");
const homeDayGoalBar = document.getElementById("homeDayGoalBar");
const homeDayGoalHint = document.getElementById("homeDayGoalHint");
const homeWeekGoalValue = document.getElementById("homeWeekGoalValue");
const homeWeekGoalBar = document.getElementById("homeWeekGoalBar");
const homeWeekGoalHint = document.getElementById("homeWeekGoalHint");
const homeHeroGreeting = document.getElementById("homeHeroGreeting");
const homeHeroHeadline = document.getElementById("homeHeroHeadline");
const homeHeroSubline = document.getElementById("homeHeroSubline");
const profilePushRankIcon = document.getElementById("profilePushRankIcon");
const profilePushRankName = document.getElementById("profilePushRankName");
const profilePushRankHint = document.getElementById("profilePushRankHint");
const profileHistorySummary = document.getElementById("profileHistorySummary");
const profileGenderMaleBtn = document.getElementById("profileGenderMaleBtn");
const profileGenderFemaleBtn = document.getElementById("profileGenderFemaleBtn");
const homeNextRankName = document.getElementById("homeNextRankName");
const skillsPushupRank = document.getElementById("skillsPushupRank");
const homeAccountAvatar = document.getElementById("homeAccountAvatar");
const homeAccountName = document.getElementById("homeAccountName");
const homeAccountLevelPill = document.getElementById("homeAccountLevelPill");
const homeAccountRank = document.getElementById("homeAccountRank");
const homeAccountXpBar = document.getElementById("homeAccountXpBar");
const homeAccountXpText = document.getElementById("homeAccountXpText");
const profileAvatarLive = document.getElementById("profileAvatarLive");
const profileNameInput = document.getElementById("profileNameInput");
const profileAccountXpText = document.getElementById("profileAccountXpText");
const profileAccountLevel = document.getElementById("profileAccountLevel");
const profileNextRewardText = document.getElementById("profileNextRewardText");
const profileAvatarChoices = document.getElementById("profileAvatarChoices");
const profileAccentChoices = document.getElementById("profileAccentChoices");
const profileBackgroundChoices = document.getElementById("profileBackgroundChoices");

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
const workoutVariantButtons = Array.from(document.querySelectorAll(".workout-variant-btn[data-workout-variant]"));

const cameraVideo = document.getElementById("cameraVideo");
const liveRepCount = document.getElementById("liveRepCount");
const setNumberLabel = document.getElementById("setNumberLabel");
const setPrepPanel = document.getElementById("setPrepPanel");
const activeSetPanel = document.getElementById("activeSetPanel");
const pausePanel = document.getElementById("pausePanel");
const prepCameraHint = document.getElementById("prepCameraHint");
const pauseTimerDisplay = document.getElementById("pauseTimerDisplay");
const lastSetSummary = document.getElementById("lastSetSummary");
const pauseReadyHint = document.getElementById("pauseReadyHint");
const pauseChallengesList = document.getElementById("pauseChallengesList");
const appToast = document.getElementById("appToast");
const setCompleteOverlay = document.getElementById("setCompleteOverlay");
const setCompleteReps = document.getElementById("setCompleteReps");
const setCompleteLabel = document.getElementById("setCompleteLabel");
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
const pauseSetBtn = document.getElementById("pauseSetBtn");
const manualModeBtn = document.getElementById("manualModeBtn");

const finalTime = document.getElementById("finalTime");
const detectedResult = document.getElementById("detectedResult");
const repInput = document.getElementById("repInput");
const successDetails = document.getElementById("successDetails");
const manualRepWrap = document.getElementById("manualRepWrap");
const autoResultNote = document.getElementById("autoResultNote");
const resultRepLabel = document.getElementById("resultRepLabel");
const resultSetCount = document.getElementById("resultSetCount");
const resultSetsList = document.getElementById("resultSetsList");

const variantModal = document.getElementById("variantModal");
const variantSheetPanel = document.getElementById("variantSheetPanel");
const closeVariantModalBtn = document.getElementById("closeVariantModalBtn");
const variantModalTitle = document.getElementById("variantModalTitle");
const variantModalIcon = document.getElementById("variantModalIcon");
const variantModalSubtitle = document.getElementById("variantModalSubtitle");
const variantModalProgress = document.getElementById("variantModalProgress");
const variantTree = document.getElementById("variantTree");
const variantQuickStats = document.getElementById("variantQuickStats");
const liveGoalsList = document.getElementById("liveGoalsList");
const liveGoalText = document.getElementById("liveGoalText");
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

  return { ...DEFAULT_PROGRESS, challengeProgress: createEmptyChallengeProgress(), trainingHistory: [] };
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

function normalizeChallengeProgress(value) {
  const fresh = createEmptyChallengeProgress();
  for (const metric of ["day", "week"]) {
    const source = value?.[metric];
    if (!source || typeof source !== "object") continue;
    const validIds = new Set((HOME_CHALLENGE_TIERS[metric] || []).map(tier => tier.id));
    fresh[metric].completed = Array.isArray(source.completed)
      ? [...new Set(source.completed.filter(id => validIds.has(id)))]
      : [];
    fresh[metric].activeId = validIds.has(source.activeId) ? source.activeId : null;
    fresh[metric].periodKey = typeof source.periodKey === "string" ? source.periodKey : null;
    fresh[metric].baseline = Math.max(0, Number(source.baseline) || 0);
  }
  return fresh;
}

function normalizeProgress(value) {
  const trainingHistory = Array.isArray(value?.trainingHistory) ? value.trainingHistory : [];
  const pushupMax = Math.max(0, Number(value?.pushupMax) || 0);
  const pushupTotal = Math.max(0, Number(value?.pushupTotal) || 0);

  const variantStats = createEmptyVariantStats();
  for (const item of trainingHistory) {
    if (item?.exercise && item.exercise !== "pushups") continue;
    const sets = Array.isArray(item?.sets) ? item.sets : [];
    if (sets.length) {
      for (const set of sets) {
        const variant = VARIANT_META[set?.variant] ? set.variant : "standard";
        const reps = Math.max(0, Number(set?.reps) || 0);
        variantStats[variant].total += reps;
        variantStats[variant].max = Math.max(variantStats[variant].max, reps);
      }
      continue;
    }
    const variant = VARIANT_META[item?.variant] ? item.variant : "standard";
    const reps = getWorkoutRepCount(item);
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
    heroGender: value?.heroGender === "female" ? "female" : "male",
    variantStats,
    challengeProgress: normalizeChallengeProgress(value?.challengeProgress),
    trainingHistory,
    entrySetupDone: !!value?.entrySetupDone,
    entryPath: value?.entryPath === "beginner" || value?.entryPath === "assessment" ? value.entryPath : null,
    entryAssessmentPending: !!value?.entryAssessmentPending,
    accountName: typeof value?.accountName === "string" && value.accountName.trim() ? value.accountName.trim().slice(0, 18) : "Athlete",
    accountXp: Math.max(0, Math.floor(Number(value?.accountXp) || 0)),
    selectedAvatar: ACCOUNT_AVATARS.some(item => item.id === value?.selectedAvatar) ? value.selectedAvatar : "starter",
    selectedAccent: ACCOUNT_ACCENTS.some(item => item.id === value?.selectedAccent) ? value.selectedAccent : "blue",
    selectedBackground: ACCOUNT_BACKGROUNDS.some(item => item.id === value?.selectedBackground) ? value.selectedBackground : "ara"
  };
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function buildBackupPayload() {
  return {
    format: "power-push-backup",
    version: 1,
    appVersion: "0.11.58",
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    progress: normalizeProgress(progress)
  };
}

function getBackupFilename() {
  const now = new Date();
  const pad = value => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `power-push-backup-${date}-${time}.json`;
}

function exportProgressBackup() {
  try {
    const payload = buildBackupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getBackupFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showAppToast("Backup gespeichert");
  } catch (error) {
    console.error("Backup export failed", error);
    alert("Das Backup konnte nicht exportiert werden.");
  }
}

function extractProgressFromBackup(value) {
  if (!value || typeof value !== "object") return null;
  if (value.format === "power-push-backup" && value.progress && typeof value.progress === "object") {
    return value.progress;
  }
  if (looksLikeOldProgress(value)) return value;
  return null;
}

async function importProgressBackup(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = extractProgressFromBackup(parsed);
    if (!imported) throw new Error("invalid-backup");

    const normalized = normalizeProgress(imported);
    const historyCount = Array.isArray(normalized.trainingHistory) ? normalized.trainingHistory.length : 0;
    const confirmed = confirm(
      `Backup importieren?\n\n${historyCount} Trainings · ${normalized.pushupTotal} Push-ups gesamt · Rekord ${normalized.pushupMax}\n\nDeine aktuell lokal gespeicherten Daten werden dadurch ersetzt.`
    );
    if (!confirmed) return;

    progress = normalized;
    saveProgress();
    render();
    renderProfile();
    showAppToast("Backup wiederhergestellt");
  } catch (error) {
    console.error("Backup import failed", error);
    alert("Diese Datei ist kein gültiges Power-Push-Backup.");
  } finally {
    const input = document.getElementById("backupFileInput");
    if (input) input.value = "";
  }
}

function getAccountLevelInfo(xp = progress.accountXp) {
  const totalXp = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  let spent = 0;
  let need = 100;
  while (totalXp >= spent + need) {
    spent += need;
    level += 1;
    need = 100 + (level - 1) * 50;
    if (level > 500) break;
  }
  const inLevel = totalXp - spent;
  return {
    level,
    totalXp,
    inLevel,
    need,
    percent: Math.max(0, Math.min(100, (inLevel / need) * 100))
  };
}

function getXpForWorkoutSets(sets) {
  return sets.reduce((sum, set) => {
    const variant = VARIANT_META[set?.variant] ? set.variant : "standard";
    const reps = Math.max(0, Math.floor(Number(set?.reps) || 0));
    const perRep = VARIANT_XP_PER_REP[variant] || 2;
    return sum + Math.max(0, Math.round(reps * perRep));
  }, 0);
}

function getNewlyAvailableCosmetics(oldLevel, newLevel) {
  const all = [
    ...ACCOUNT_AVATARS.map(item => ({ ...item, kind: "Profile picture" })),
    ...ACCOUNT_ACCENTS.map(item => ({ ...item, kind: "App color" })),
    ...ACCOUNT_BACKGROUNDS.map(item => ({ ...item, kind: "Background" }))
  ];
  return all.filter(item => item.level > oldLevel && item.level <= newLevel);
}

function getNextCosmeticReward(level) {
  const all = [...ACCOUNT_AVATARS, ...ACCOUNT_ACCENTS, ...ACCOUNT_BACKGROUNDS]
    .filter(item => item.level > level)
    .sort((a,b) => a.level - b.level);
  return all[0] || null;
}

function getSelectedAvatar() {
  return ACCOUNT_AVATARS.find(item => item.id === progress.selectedAvatar) || ACCOUNT_AVATARS[0];
}

function applyAccountCustomization() {
  const level = getAccountLevelInfo().level;
  const accent = ACCOUNT_ACCENTS.find(item => item.id === progress.selectedAccent) || ACCOUNT_ACCENTS[0];
  const background = ACCOUNT_BACKGROUNDS.find(item => item.id === progress.selectedBackground) || ACCOUNT_BACKGROUNDS[0];
  const avatar = ACCOUNT_AVATARS.find(item => item.id === progress.selectedAvatar) || ACCOUNT_AVATARS[0];

  document.documentElement.style.setProperty("--user-accent", accent.color);
  document.body.dataset.accountBackground = background.id;
  if (background.type === "image") {
    document.documentElement.style.setProperty("--account-hero-image", `url("${background.value}")`);
    document.documentElement.style.setProperty("--account-hero-gradient", "none");
  } else {
    document.documentElement.style.setProperty("--account-hero-image", "none");
    document.documentElement.style.setProperty("--account-hero-gradient", background.value);
  }

  if (homeAccountAvatar) homeAccountAvatar.textContent = avatar.icon;
  if (profileAvatarLive) profileAvatarLive.textContent = avatar.icon;
}

function renderAccountHome(rankName) {
  const info = getAccountLevelInfo();
  if (homeAccountName) homeAccountName.textContent = progress.accountName || "Athlete";
  if (homeAccountLevelPill) homeAccountLevelPill.textContent = `LVL ${info.level}`;
  if (homeAccountXpBar) homeAccountXpBar.style.width = `${info.percent}%`;
  if (homeAccountXpText) homeAccountXpText.textContent = `${formatTreeNumber(info.inLevel)} / ${formatTreeNumber(info.need)} XP`;
}

function renderCustomizationChoices() {
  const level = getAccountLevelInfo().level;
  if (profileAvatarChoices) {
    profileAvatarChoices.innerHTML = ACCOUNT_AVATARS.map(item => {
      const unlocked = level >= item.level;
      const selected = progress.selectedAvatar === item.id;
      return `<button class="customize-choice avatar-choice ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}" type="button" data-avatar-choice="${item.id}" ${unlocked ? "" : "disabled"}><span>${item.icon}</span><strong>${item.label}</strong><small>${unlocked ? (selected ? "Selected" : "Available") : `Level ${item.level}`}</small></button>`;
    }).join("");
  }
  if (profileAccentChoices) {
    profileAccentChoices.innerHTML = ACCOUNT_ACCENTS.map(item => {
      const unlocked = level >= item.level;
      const selected = progress.selectedAccent === item.id;
      return `<button class="customize-choice color-choice ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}" type="button" data-accent-choice="${item.id}" ${unlocked ? "" : "disabled"}><span class="color-swatch" style="--choice-color:${item.color}"></span><strong>${item.label}</strong><small>${unlocked ? (selected ? "Selected" : "Available") : `Level ${item.level}`}</small></button>`;
    }).join("");
  }
  if (profileBackgroundChoices) {
    profileBackgroundChoices.innerHTML = ACCOUNT_BACKGROUNDS.map(item => {
      const unlocked = level >= item.level;
      const selected = progress.selectedBackground === item.id;
      const bgStyle = item.type === "image" ? `background-image:url('${item.value}')` : `background:${item.value}`;
      return `<button class="customize-choice background-choice ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}" type="button" data-background-choice="${item.id}" ${unlocked ? "" : "disabled"}><span class="background-preview" style="${bgStyle}"></span><strong>${item.label}</strong><small>${unlocked ? (selected ? "Selected" : "Available") : `Level ${item.level}`}</small></button>`;
    }).join("");
  }

  document.querySelectorAll("[data-avatar-choice]").forEach(btn => btn.addEventListener("click", () => {
    progress.selectedAvatar = btn.dataset.avatarChoice;
    saveProgress(); applyAccountCustomization(); renderProfile(); renderAccountHome(getV012CurrentRankName());
  }));
  document.querySelectorAll("[data-accent-choice]").forEach(btn => btn.addEventListener("click", () => {
    progress.selectedAccent = btn.dataset.accentChoice;
    saveProgress(); applyAccountCustomization(); renderProfile(); render();
  }));
  document.querySelectorAll("[data-background-choice]").forEach(btn => btn.addEventListener("click", () => {
    progress.selectedBackground = btn.dataset.backgroundChoice;
    saveProgress(); applyAccountCustomization(); renderProfile(); render();
  }));
}

// ---------- Views / Dashboard ----------
function setBottomNavActive(name) {
  const groups = {
    home: [document.getElementById("homeNavHomeBtn"), document.getElementById("skillsNavHomeBtn"), document.getElementById("profileNavHomeBtn"), document.getElementById("historyNavHomeBtn")],
    skills: [document.getElementById("homeNavSkillsBtn"), document.getElementById("skillsNavSkillsBtn"), document.getElementById("profileNavSkillsBtn"), document.getElementById("historyNavSkillsBtn")],
    history: [document.getElementById("homeNavHistoryBtn"), document.getElementById("skillsNavHistoryBtn"), document.getElementById("profileNavHistoryBtn"), document.getElementById("historyNavHistoryBtn")],
    profile: [document.getElementById("homeNavProfileBtn"), document.getElementById("skillsNavProfileBtn"), document.getElementById("profileNavProfileBtn"), document.getElementById("historyNavProfileBtn")]
  };
  Object.values(groups).flat().forEach(btn => btn?.classList.remove("active"));
  (groups[name] || []).forEach(btn => btn?.classList.add("active"));
}

function showView(name) {
  homeView.classList.toggle("hidden", name !== "home");
  treeView.classList.toggle("hidden", name !== "tree");
  historyView.classList.toggle("hidden", name !== "history");
  profileView.classList.toggle("hidden", name !== "profile");
  skillsView?.classList.toggle("hidden", name !== "skills");

  setBottomNavActive(name);
  window.scrollTo(0, 0);

  if (name === "tree") {
    renderTree();

    const scrollTreeToCurrent = () => {
      syncTreeCanvasHeight();
      treeScroll.scrollLeft = 0;
      const currentSection = skillTree.querySelector('[data-tree-current="true"]');
      if (!currentSection) {
        treeScroll.scrollTop = 0;
        return;
      }
      const targetTop = Math.max(0, currentSection.offsetTop - 118);
      treeScroll.scrollTop = targetTop;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollTreeToCurrent);
    });
    setTimeout(scrollTreeToCurrent, 120);
  }

  if (name === "history") renderHistory();
  if (name === "profile") renderProfile();
  if (name === "skills") renderSkills();
}

function renderSkills() {
  if (skillsPushupRank) {
    const rankName = getV012CurrentRankName();
    skillsPushupRank.textContent = `${getRankDisplayName(rankName)} · Active push-up skill`;
  }
}

function render() {
  renderStaticIcons();
  applyHeroGender();
  applyAccountCustomization();
  const todayTotal = getTodayTotal();
  const weekTotal = getCurrentWeekTotal();
  const rankName = getCurrentRankName();

  maxStat.textContent = progress.pushupMax;
  dayStat.textContent = todayTotal;
  weekStat.textContent = weekTotal;
  totalStat.textContent = progress.pushupTotal;
  rankStat.textContent = rankName;

  if (homePushMeta) homePushMeta.textContent = "";
  homeTodayStat.textContent = todayTotal;
  homeWeekStat.textContent = weekTotal;
  if (homeTotalStat) homeTotalStat.textContent = progress.pushupTotal;
  renderHomeDashboard(todayTotal, weekTotal, rankName);
  renderAccountHome(getV012CurrentRankName());

  historyTodayStat.textContent = todayTotal;
  historyWeekStat.textContent = weekTotal;
  historyTotalStat.textContent = progress.pushupTotal;

  const history = Array.isArray(progress.trainingHistory) ? progress.trainingHistory : [];
  if (historyHomeHint) {
    if (history.length) {
      historyHomeHint.textContent = `${history.length} ${history.length === 1 ? "workout" : "workouts"} · latest ${formatWorkoutDate(history[0].date)}`;
    } else {
      historyHomeHint.textContent = "No workouts saved yet";
    }
  }

  updateVariantAvailability();
  updateQuickVariantPill();
  if (!treeView.classList.contains("hidden")) renderTree();
  if (!historyView.classList.contains("hidden")) renderHistory();
  if (!profileView.classList.contains("hidden")) renderProfile();
  if (!skillsView?.classList.contains("hidden")) renderSkills();
  renderLiveGoals();
}

function renderHomeDashboardLegacy(todayTotal, weekTotal, rankName) {
  if (!homeRankIcon) return;

  homeRankName.textContent = rankName;
  homeRankIcon.innerHTML = rankName === "Starter"
    ? getVariantIconSvg("standard", "home-starter-icon")
    : getRankIconSvg(rankName, "home-rank-asset");

  const nextRank = getNextRankName(rankName);
  homeNextRankLabel.textContent = nextRank || "Endgame";

  const goalNode = getHomeNextGoalNode();
  if (homeNextGoalTitle && homeNextGoalValue && homeNextGoalProgress && homeNextGoalText) {
    if (goalNode) {
      const current = Math.max(0, nodeValue(goalNode));
      const target = Math.max(1, Number(goalNode.target) || 1);
      const percent = Math.max(0, Math.min(100, current / target * 100));
      homeNextGoalTitle.textContent = getNodeRequirementLabel(goalNode);
      homeNextGoalValue.textContent = `${Math.min(current, target)} / ${target}`;
      homeNextGoalProgress.style.width = `${percent}%`;
      homeNextGoalText.textContent = getHomeGoalHint(goalNode, current, target);
    } else {
      homeNextGoalTitle.textContent = "Push-up Tree gemeistert";
      homeNextGoalValue.textContent = "100 %";
      homeNextGoalProgress.style.width = "100%";
      homeNextGoalText.textContent = "Alle aktuell eingebauten Push-up Ziele sind abgeschlossen.";
    }
  }

  renderHomeTimedGoal("day", todayTotal, homeDayGoalValue, homeDayGoalBar, homeDayGoalHint);
  renderHomeTimedGoal("week", weekTotal, homeWeekGoalValue, homeWeekGoalBar, homeWeekGoalHint);
}

function getNextRankName(currentRank) {
  const currentIndex = RANK_ORDER.indexOf(currentRank);
  if (currentIndex < 0) return "Holz";
  return RANK_ORDER[currentIndex + 1] || null;
}

function getHomeNextGoalNode() {
  const candidates = SKILL_NODES.filter(node => {
    if (!shouldRenderTreeNode(node) || isNodeDone(node) || node.type === "rank") return false;
    return getNodeDiscoveryState(node) === "current";
  });

  const scoringValue = node => {
    const target = Math.max(1, Number(node.target) || 1);
    const value = Math.max(0, nodeValue(node));
    return Math.max(0, (target - value) / target);
  };

  candidates.sort((a, b) => scoringValue(a) - scoringValue(b) || (a.target || 0) - (b.target || 0));
  if (candidates.length) return candidates[0];

  return SKILL_NODES.find(node => !isNodeDone(node) && (node.type === "skill" || node.type === "metric" || node.type === "challenge")) || null;
}

function getHomeGoalHint(node, current, target) {
  const left = Math.max(0, target - current);
  if (left <= 0) return "Ziel erreicht – der nächste Knoten wartet.";
  if (node.metric === "standardMax") return `Noch ${left} bis zum nächsten Am-Stück-Meilenstein.`;
  if (node.metric === "total") return `Noch ${left} Push-ups bis zum nächsten Gesamt-Meilenstein.`;
  if (node.metric === "day") return `Noch ${left} Push-ups für dieses Tagesziel.`;
  if (node.metric === "week") return `Noch ${left} Push-ups für dieses Wochenziel.`;
  if (node.metric === "trainingDays") return `Noch ${left} Trainingstage bis zum nächsten Kapitelziel.`;
  if (node.metric === "workoutTotal") return `Noch ${left} Push-ups in einem Workout bis zur Prüfung.`;
  if (node.metric === "workoutSets") return `Noch ${left} Sets in einem Workout bis zur Prüfung.`;
  if (node.metric === "workoutVariants") return `Noch ${left} Varianten in einem Workout bis zur Prüfung.`;
  if (node.variant) return `Noch ${left} ${VARIANT_META[node.variant]?.label || "Varianten"}-Push-ups bis zum Unlock.`;
  return `Noch ${left} bis zum nächsten Skill.`;
}

function getTimedChallengePeriodKey(metric, now = new Date()) {
  return metric === "day"
    ? localDateString(now)
    : localDateString(startOfLocalWeek(now));
}

function isV012RankAtLeast(currentRank, requiredRank) {
  return V012_RANKS.indexOf(currentRank) >= V012_RANKS.indexOf(requiredRank);
}

function getHeroGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getHomeAccountName() {
  const profileName = document.querySelector(".profile-identity h2")?.textContent?.trim() || "";
  if (!profileName || /^dein name$/i.test(profileName) || /^your name$/i.test(profileName)) return "";
  return profileName;
}

function ensureChallengeProgressBucket(metric) {
  if (!progress.challengeProgress || typeof progress.challengeProgress !== "object") {
    progress.challengeProgress = createEmptyChallengeProgress();
  }
  if (!progress.challengeProgress[metric] || typeof progress.challengeProgress[metric] !== "object") {
    progress.challengeProgress[metric] = createEmptyChallengeProgress()[metric];
  }
  const bucket = progress.challengeProgress[metric];
  if (!Array.isArray(bucket.completed)) bucket.completed = [];
  bucket.baseline = Math.max(0, Number(bucket.baseline) || 0);
  return bucket;
}

function getTimedChallengeState(metric, currentValue) {
  const tiers = HOME_CHALLENGE_TIERS[metric] || [];
  const bucket = ensureChallengeProgressBucket(metric);
  const rankName = getV012CurrentRankName();
  const unlocked = tiers.filter(tier => isV012RankAtLeast(rankName, tier.unlockRank));
  const periodKey = getTimedChallengePeriodKey(metric);
  const current = Math.max(0, Number(currentValue) || 0);
  let changed = false;

  // Nothing runs before Bronze. Remember the current total so the first
  // challenge really starts at the moment it becomes unlocked, not earlier.
  if (!unlocked.length) {
    if (bucket.activeId !== null || bucket.periodKey !== periodKey || bucket.baseline !== current) {
      bucket.activeId = null;
      bucket.periodKey = periodKey;
      bucket.baseline = current;
      changed = true;
    }
    if (changed) saveProgress();
    return { status: "locked", tier: tiers[0] || null, current: 0, target: tiers[0]?.target || 0, percent: 0 };
  }

  const completedIds = new Set(bucket.completed);
  let tier = unlocked.find(item => !completedIds.has(item.id)) || null;

  // Every currently unlocked challenge is already completed. If the next tier
  // is still rank-locked, keep the last completed tier visible with a green tick.
  if (!tier) {
    const lastCompleted = unlocked[unlocked.length - 1];
    const nextTier = tiers[unlocked.length] || null;
    if (bucket.activeId !== null) {
      bucket.activeId = null;
      changed = true;
    }
    if (bucket.periodKey !== periodKey) {
      bucket.periodKey = periodKey;
      bucket.baseline = current;
      changed = true;
    }
    if (changed) saveProgress();
    return {
      status: nextTier ? "waiting-next" : "complete",
      tier: lastCompleted,
      nextTier,
      current: lastCompleted?.target || 0,
      target: lastCompleted?.target || 0,
      percent: 100
    };
  }

  // A tier is newly available (rank-up, or the previous tier has just been
  // completed). Start it from THIS point in the day/week.
  if (bucket.activeId !== tier.id) {
    bucket.activeId = tier.id;
    bucket.periodKey = periodKey;
    bucket.baseline = current;
    changed = true;
  } else if (bucket.periodKey !== periodKey) {
    // An unfinished challenge carries into the next day/week, but its counter
    // starts fresh for the new period. Its identity does not fall back to I.
    bucket.periodKey = periodKey;
    bucket.baseline = 0;
    changed = true;
  }

  let earned = Math.max(0, current - bucket.baseline);

  if (earned >= tier.target) {
    if (!bucket.completed.includes(tier.id)) {
      bucket.completed.push(tier.id);
      changed = true;
    }
    bucket.activeId = null;
    bucket.periodKey = periodKey;
    bucket.baseline = current;
    changed = true;

    const completedNow = new Set(bucket.completed);
    const nextAvailable = unlocked.find(item => !completedNow.has(item.id)) || null;
    if (nextAvailable) {
      // Challenge II is already unlocked: continue immediately, but only reps
      // performed after Challenge I was completed count towards II.
      bucket.activeId = nextAvailable.id;
      bucket.periodKey = periodKey;
      bucket.baseline = current;
      saveProgress();
      return {
        status: "active",
        tier: nextAvailable,
        current: 0,
        target: nextAvailable.target,
        percent: 0,
        advancedFrom: tier
      };
    }

    saveProgress();
    const nextTier = tiers.find(item => !completedNow.has(item.id)) || null;
    return {
      status: nextTier ? "waiting-next" : "complete",
      tier,
      nextTier,
      current: tier.target,
      target: tier.target,
      percent: 100,
      justCompleted: true
    };
  }

  if (changed) saveProgress();
  return {
    status: "active",
    tier,
    current: Math.min(earned, tier.target),
    target: tier.target,
    percent: Math.max(0, Math.min(100, earned / Math.max(1, tier.target) * 100))
  };
}

function renderHomeTimedGoal(metric, currentValue, valueEl, barEl, hintEl) {
  if (!valueEl || !barEl || !hintEl) return;
  const state = getTimedChallengeState(metric, currentValue);
  const isDay = metric === "day";
  const card = document.getElementById(isDay ? "homeDayGoalCard" : "homeWeekGoalCard");
  const icon = document.getElementById(isDay ? "homeDayGoalIcon" : "homeWeekGoalIcon");
  const title = document.getElementById(isDay ? "homeDayGoalTitle" : "homeWeekGoalTitle");
  const label = isDay ? "Daily Challenge" : "Weekly Challenge";
  const tier = state.tier;

  card?.classList.toggle("challenge-complete", state.status === "waiting-next" || state.status === "complete");
  card?.classList.toggle("challenge-locked", state.status === "locked");

  if (title) title.textContent = `${label} ${tier?.level || "I"}`;

  if (state.status === "locked") {
    valueEl.textContent = "🔒";
    barEl.style.width = "0%";
    if (icon) icon.textContent = isDay ? "◎" : "▣";
    hintEl.textContent = tier?.unlockRank ? `Unlocks at ${tier.unlockRank}.` : "Still locked.";
    return;
  }

  if (state.status === "waiting-next" || state.status === "complete") {
    valueEl.textContent = "✓";
    barEl.style.width = "100%";
    if (icon) icon.textContent = "✓";
    hintEl.textContent = state.nextTier
      ? `Completed · Challenge ${state.nextTier.level} unlocks at ${state.nextTier.unlockRank}.`
      : "Challenge completed!";
    return;
  }

  valueEl.textContent = `${Math.round(state.current)} / ${state.target}`;
  barEl.style.width = `${state.percent}%`;
  if (icon) icon.textContent = isDay ? "◎" : "▣";
  const left = Math.max(0, state.target - state.current);
  hintEl.textContent = isDay
    ? `${left} push-ups left for your daily badge.`
    : `${left} push-ups left for your weekly badge.`;
}

function getCurrentRankName() {
  return getV012CurrentRankName();
}

function getNode(id) {
  return SKILL_NODES.find(node => node.id === id);
}

function getWorkoutRepCount(item) {
  if (!item || typeof item !== "object") return 0;
  const direct = Math.max(0, Number(item.reps) || 0);
  const sets = Array.isArray(item.sets) ? item.sets : [];
  const setTotal = sets.reduce((sum, set) => sum + Math.max(0, Number(set?.reps) || 0), 0);
  const legacy = Math.max(0, Number(item.totalReps ?? item.count ?? item.pushups) || 0);
  return Math.max(direct, setTotal, legacy);
}

function getWorkoutDate(item) {
  const raw = item?.date ?? item?.timestamp ?? item?.createdAt ?? item?.savedAt;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
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
    const date = getWorkoutDate(item);
    if (!date || date < start || date >= end) return sum;
    return sum + getWorkoutRepCount(item);
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

function getVariantSetEntries(variant) {
  const entries = [];
  for (const workout of getPushupHistory()) {
    const workoutDate = workout?.date;
    const sets = Array.isArray(workout?.sets) ? workout.sets : [];
    if (sets.length) {
      for (const set of sets) {
        const setVariant = VARIANT_META[set?.variant] ? set.variant : "standard";
        if (setVariant !== variant) continue;
        entries.push({
          date: workoutDate,
          reps: Math.max(0, Number(set?.reps) || 0)
        });
      }
      continue;
    }
    const fallbackVariant = VARIANT_META[workout?.variant] ? workout.variant : "standard";
    if (fallbackVariant !== variant) continue;
    entries.push({
      date: workoutDate,
      reps: Math.max(0, Number(workout?.reps) || 0)
    });
  }
  return entries;
}

function getVariantHistoryTotalBetween(variant, start, end) {
  return getVariantSetEntries(variant).reduce((sum, entry) => {
    const date = new Date(entry?.date);
    if (Number.isNaN(date.getTime()) || date < start || date >= end) return sum;
    return sum + Math.max(0, Number(entry?.reps) || 0);
  }, 0);
}

function getVariantDynamicStats(variant) {
  const persisted = getVariantStats(variant);
  const entries = getVariantSetEntries(variant);
  const max = Math.max(persisted.max || 0, ...entries.map(entry => Math.max(0, Number(entry.reps) || 0)));
  const totalFromHistory = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.reps) || 0), 0);
  const total = Math.max(persisted.total || 0, totalFromHistory);

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  const startWeek = startOfLocalWeek(now);
  const endWeek = new Date(startWeek);
  endWeek.setDate(endWeek.getDate() + 7);

  return {
    max,
    total,
    sets: entries.filter(entry => Math.max(0, Number(entry.reps) || 0) > 0).length,
    day: getVariantHistoryTotalBetween(variant, startToday, endToday),
    week: getVariantHistoryTotalBetween(variant, startWeek, endWeek)
  };
}

function getVariantTreeMetricState(variant, metricKey) {
  const stats = getVariantDynamicStats(variant);
  const current = Math.max(0, Number(stats[metricKey]) || 0);
  const milestones = VARIANT_SUBTREE_MILESTONES[metricKey] || [];
  const completed = milestones.filter(target => current >= target).length;
  const total = milestones.length;
  const done = completed >= total && total > 0;
  const nextTarget = done ? milestones[total - 1] || 0 : milestones[completed] || 0;
  const progress = done ? 100 : Math.max(0, Math.min(100, Math.round((current / Math.max(1, nextTarget)) * 100)));
  return { metricKey, current, milestones, completed, total, done, nextTarget, progress };
}

function getVariantSubtreeSummary(variant) {
  const metricKeys = ["max", "sets", "day", "week", "total"];
  const states = metricKeys.map(metricKey => getVariantTreeMetricState(variant, metricKey));
  const completed = states.reduce((sum, state) => sum + state.completed, 0);
  const total = states.reduce((sum, state) => sum + state.total, 0);
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return { states, completed, total, percent };
}

function getVariantTreeMetricLabel(metricKey) {
  return ({
    max: "am Stück",
    sets: "Sets",
    day: "24h",
    week: "7 Tage",
    total: "gesamt"
  })[metricKey] || metricKey;
}

function getVariantTreeMetricIcon(metricKey) {
  if (metricKey === "max") return getMetricIconSvg("max");
  if (metricKey === "day") return getMetricIconSvg("day");
  if (metricKey === "week") return getMetricIconSvg("week");
  if (metricKey === "total") return getMetricIconSvg("total");
  return '<span class="variant-mini-emoji">▦</span>';
}

function hexToRgbString(hex) {
  const normalized = String(hex || "#8B6CFF").replace('#', '');
  const full = normalized.length === 3 ? normalized.split('').map(ch => ch + ch).join('') : normalized;
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num)) return '139, 108, 255';
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function getPushupHistory() {
  return (Array.isArray(progress.trainingHistory) ? progress.trainingHistory : [])
    .filter(item => !item?.exercise || item.exercise === "pushups");
}

function getTrainingDayCount() {
  const days = new Set();
  for (const item of getPushupHistory()) {
    const date = new Date(item?.date);
    if (!Number.isNaN(date.getTime())) days.add(localDateString(date));
  }
  return days.size;
}

function getBestWorkoutTotal() {
  return getPushupHistory().reduce((best, item) => Math.max(best, Math.max(0, Number(item?.reps) || 0)), 0);
}

function getBestWorkoutSetCount() {
  return getPushupHistory().reduce((best, item) => {
    const sets = Array.isArray(item?.sets) ? item.sets.filter(set => Number(set?.reps) > 0) : [];
    const count = sets.length || (Number(item?.reps) > 0 ? 1 : 0);
    return Math.max(best, count);
  }, 0);
}

function getBestWorkoutVariantCount() {
  return getPushupHistory().reduce((best, item) => {
    const sets = Array.isArray(item?.sets) ? item.sets.filter(set => Number(set?.reps) > 0) : [];
    let count = 0;
    if (sets.length) {
      count = new Set(sets.map(set => VARIANT_META[set?.variant] ? set.variant : "standard")).size;
    } else if (Number(item?.reps) > 0) {
      count = 1;
    }
    return Math.max(best, count);
  }, 0);
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
    case "variantTotal":
      return getVariantStats(node.variant).total;
    case "trainingDays":
      return getTrainingDayCount();
    case "workoutTotal":
      return getBestWorkoutTotal();
    case "workoutSets":
      return getBestWorkoutSetCount();
    case "workoutVariants":
      return getBestWorkoutVariantCount();
    default:
      return 0;
  }
}

function isNodeDone(node) {
  if (!node) return false;
  if ((node.type === "challenge" || node.type === "skill") && node.parents?.length) {
    const chapterAvailable = node.parents.every(parentId => isNodeDone(getNode(parentId)));
    if (!chapterAvailable) return false;
  }
  if (node.type === "rank") {
    const parents = node.parents || [];
    const requiredParents = node.requiredParents || [];
    const requiredDone = requiredParents.every(parentId => isNodeDone(getNode(parentId)));
    if (!requiredDone) return false;
    const doneCount = parents.filter(parentId => isNodeDone(getNode(parentId))).length;
    return doneCount >= (node.requirementCount || parents.length || 1);
  }
  return nodeValue(node) >= (node.target || 0);
}

function isNodeAvailable(node) {
  if (!node) return false;
  if (!node.parents?.length) return true;

  if (node.type === "rank") {
    // Ranks stay visibly locked until their real completion conditions are met.
    return isNodeDone(node);
  }

  return node.parents.every(parentId => isNodeDone(getNode(parentId)));
}

function isVariantAvailable(variant) {
  return isV012VariantAvailable(variant);
}

function getDiscoveryGroupKey(node) {
  if (!node || node.type !== "metric") return null;
  return node.discoveryGroup || `${node.metric}:${node.variant || "base"}`;
}

function getNodeDiscoveryState(node) {
  if (!node) return "mystery";
  if (isNodeDone(node)) return "done";

  // Ränge und große Übungs-Freischaltungen bleiben bewusst sichtbar. Sie sind
  // die großen Orientierungspunkte des Trees und dürfen Vorfreude erzeugen.
  if (node.type === "rank" || node.type === "skill" || node.type === "challenge") {
    return isNodeAvailable(node) ? "current" : "locked";
  }

  const groupKey = getDiscoveryGroupKey(node);
  const group = SKILL_NODES
    .filter(candidate => candidate.type === "metric" && getDiscoveryGroupKey(candidate) === groupKey)
    .sort((a, b) => (a.target || 0) - (b.target || 0));
  const unfinished = group.filter(candidate => !isNodeDone(candidate));
  const index = unfinished.findIndex(candidate => candidate.id === node.id);

  if (index < 0) return "done";

  const blockedByVariant = node.variant && !isVariantAvailable(node.variant);
  const firstReachable = index === 0 && isNodeAvailable(node) && !blockedByVariant;
  if (firstReachable) return "current";

  // Ist das erste offene Ziel noch durch einen Rang/Skill blockiert, darf genau
  // dieses Ziel sichtbar bleiben. Danach beginnt bereits das Geheimnis.
  if (index === 0) return "locked";
  if (index === 1 && isNodeAvailable(unfinished[0]) && !blockedByVariant) return "locked";
  return "mystery";
}

function shouldRenderTreeNode(node) {
  if (!node) return false;
  // Varianten-Fortschritt lebt ab v0.10.19 komplett im Unter-Skill-Tree.
  // Im Hauptbaum bleibt nur noch der große Varianten-Knoten sichtbar.
  if (node.type === "metric" && node.variant) return false;
  return true;
}

function updateVariantAvailability() {
  const apply = (element, variant) => {
    const unlocked = isVariantAvailable(variant);
    element.classList.toggle("unlock-hidden", !unlocked);
    element.disabled = !unlocked;
    element.setAttribute("aria-hidden", unlocked ? "false" : "true");
  };

  variantCards.forEach(card => apply(card, card.dataset.variant));
  workoutVariantButtons.forEach(button => apply(button, button.dataset.workoutVariant));

  if (!isVariantAvailable(currentTrainingVariant)) {
    currentTrainingVariant = isVariantAvailable("standard") ? "standard" : "wall";
  }
}

function getNodeTitle(node) {
  if (node.metric === "standardMax") return "am Stück";
  if (node.metric === "total") return "gesamt";
  if (node.metric === "day") return "in 24h";
  if (node.metric === "week") return "in 7 Tagen";
  if (node.metric === "trainingDays") return "Trainingstage";
  if (node.metric === "workoutTotal") return "in 1 Workout";
  if (node.metric === "workoutSets") return "Sets in 1 Workout";
  if (node.metric === "workoutVariants") return "Varianten in 1 Workout";
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

function getNodeRankTier(node) {
  if (!node) return "holz";
  if (node.tier) return node.tier;
  if (node.type === "rank" && node.rank) return node.rank.toLowerCase();

  // The tree is built in vertical rank chapters. A milestone inherits the
  // material/style of the rank chapter it belongs to, independent of branch.
  if ((node.y ?? 9999) < 170) return "silber";
  if ((node.y ?? 9999) < 675) return "bronze";
  if ((node.y ?? 9999) < 1150) return "stein";
  return "holz";
}

function getNodeRequirementLabel(node) {
  if (!node) return "";
  if (node.type === "challenge") {
    if (node.metric === "workoutTotal") return `${node.target} Push-ups in einem Workout`;
    if (node.metric === "workoutSets") return `${node.target} Sets in einem Workout`;
    if (node.metric === "workoutVariants") return `${node.target} Varianten in einem Workout`;
    return node.challengeTitle || "Rang-Prüfung";
  }
  if (node.type === "skill") {
    if (node.metric === "variantTotal") {
      return `${node.target || 10} ${VARIANT_META[node.variant]?.label || "Variante"} Push-ups`;
    }
    return `${VARIANT_META[node.variant]?.label || "Variante"} freischalten`;
  }
  if (node.metric === "variantPoints") {
    return `${VARIANT_META[node.variant]?.label || "Variante"} ${node.target}/10 Meilensteine`;
  }
  if (node.metric === "variantMax") {
    return `${node.target} ${VARIANT_META[node.variant]?.label || "Variante"} am Stück`;
  }
  if (node.metric === "standardMax") return `${node.target} Push-ups am Stück`;
  if (node.metric === "total") return `${node.target} Push-ups gesamt`;
  if (node.metric === "day") return `${node.target} Push-ups in 24h`;
  if (node.metric === "week") return `${node.target} Push-ups in 7 Tagen`;
  if (node.metric === "trainingDays") return `${node.target} Trainingstage`;
  if (node.metric === "workoutTotal") return `${node.target} Push-ups in einem Workout`;
  if (node.metric === "workoutSets") return `${node.target} Sets in einem Workout`;
  if (node.metric === "workoutVariants") return `${node.target} Varianten in einem Workout`;
  return `${node.target}`;
}

const TREE_COLUMN_ANCHORS = [52, 188, 328, 468, 595];
const TREE_VERTICAL_SCALE = 0.84;
const TREE_TOP_PADDING = 18;

function getScaledTreeY(y) {
  return Math.round((Number(y) || 0) * TREE_VERTICAL_SCALE) + TREE_TOP_PADDING;
}

function getTreeColumnIndex(node) {
  let closestIndex = 0;
  let closestDistance = Infinity;
  TREE_COLUMN_ANCHORS.forEach((anchor, index) => {
    const distance = Math.abs((node.x ?? TREE_COLUMN_ANCHORS[2]) - anchor);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return closestIndex;
}

function getTreeColumnCenters() {
  const width = Math.max(280, skillTree.clientWidth || treeScroll.clientWidth || window.innerWidth || 360);
  // Matches the responsive CSS node size closely. The extra side padding keeps
  // the first/last badges comfortably inside the viewport.
  const nodeSize = Math.min(70, Math.max(52, ((window.innerWidth || width) - 76) / 5));
  const sidePadding = nodeSize / 2 + 16;
  const usableWidth = Math.max(0, width - sidePadding * 2);
  return TREE_COLUMN_ANCHORS.map((_, index) => sidePadding + (usableWidth * index / 4));
}

function positionTreeNode(el, node, columnCenters) {
  const column = getTreeColumnIndex(node);
  const centerX = columnCenters[column];
  el.style.left = `${Math.round(centerX - el.offsetWidth / 2)}px`;
  el.style.top = `${getScaledTreeY(node.y)}px`;
}

function syncTreeCanvasHeightLegacy() {
  const renderedNodes = Array.from(skillTree.querySelectorAll(".skill-node"));
  if (!renderedNodes.length) {
    skillTree.style.height = `${Math.max(treeScroll.clientHeight || 0, 640)}px`;
    return 0;
  }

  const deepestBottom = renderedNodes.reduce((max, el) => {
    return Math.max(max, el.offsetTop + el.offsetHeight);
  }, 0);

  // Only a small breathing room below the true first/lowest nodes.
  // This is intentionally based on the rendered DOM instead of SKILL_NODES y
  // estimates, so responsive node sizes cannot clip the bottom of the tree.
  const bottomBreathingRoom = 128;
  skillTree.style.height = `${Math.ceil(deepestBottom + bottomBreathingRoom)}px`;
  return deepestBottom;
}

function renderTreeLegacy() {
  skillTree.innerHTML = "";

  const visibleNodes = SKILL_NODES.filter(node => shouldRenderTreeNode(node));
  const roughBottom = visibleNodes.reduce((max, node) => {
    const approxSize = node.type === "rank" ? 128 : (node.type === "skill" ? 124 : 114);
    return Math.max(max, getScaledTreeY(node.y) + approxSize);
  }, 0);
  skillTree.style.height = `${Math.max(820, roughBottom + 220)}px`;

  const nodeElements = new Map();
  const columnCenters = getTreeColumnCenters();

  // Render nodes first so we can use their real responsive dimensions for the
  // connector geometry. This keeps all five columns aligned on every phone.
  SKILL_NODES.forEach(node => {
    if (!shouldRenderTreeNode(node)) return;
    const el = document.createElement("button");
    el.type = "button";
    el.className = `skill-node branch-${node.branch}`;
    el.classList.add(`tier-${getNodeRankTier(node)}`);
    if (node.variant && VARIANT_META[node.variant]) {
      el.style.setProperty("--branch", VARIANT_META[node.variant].color);
    }

    const done = isNodeDone(node);
    const available = isNodeAvailable(node);
    const discoveryState = getNodeDiscoveryState(node);
    el.dataset.discovery = discoveryState;
    if (discoveryState === "done") el.classList.add("done");
    else if (discoveryState === "current") el.classList.add("next", "current");
    else if (discoveryState === "locked") el.classList.add("locked", "preview-locked");
    else el.classList.add("locked", "mystery");

    if (node.type === "rank") {
      el.classList.add("rank-node", `rank-${String(node.rankAsset || node.rank).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
      el.innerHTML = `
        <span class="rank-symbol">${getRankIconSvg(node.rankAsset || node.rank)}</span>
        <span class="node-target">${node.rank.toUpperCase()}</span>
        <span class="node-label">RANG</span>
        ${done ? '<span class="rank-complete-pill">RANG ERREICHT</span>' : (discoveryState === "locked" ? '<span class="node-lock">🔒</span>' : '')}
      `;
      el.addEventListener("click", () => alert(getRankDescription(node)));
    } else if (node.type === "challenge") {
      const current = nodeValue(node);
      const target = Math.max(1, Number(node.target) || 1);
      const progress = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
      el.classList.add("challenge-node");
      el.innerHTML = `
        <span class="challenge-icon">${node.challengeIcon || "★"}</span>
        <span class="node-target">${node.challengeShort || node.target}</span>
        <span class="node-label">${node.challengeTitle || "RANG-PRÜFUNG"}</span>
        ${discoveryState === "current" && !done ? `<span class="challenge-progress-text">${Math.min(current, target)}/${target}</span>` : ""}
        ${discoveryState === "current" && !done ? `<span class="node-progress"><span style="width:${progress}%"></span></span>` : ""}
        ${done ? '<span class="node-complete-pill">GESCHAFFT</span>' : (discoveryState === "locked" ? '<span class="node-lock">🔒</span>' : '')}
      `;
      el.addEventListener("click", () => {
        let detail = `${node.challengeTitle || "Rang-Prüfung"}\n${getNodeRequirementLabel(node)}\nAktuell: ${current}/${target}`;
        if (discoveryState === "locked") detail += "\n\nDieser Kapitel-Test wird mit dem Rang davor freigeschaltet.";
        alert(detail);
      });
    } else if (node.type === "skill") {
      const meta = VARIANT_META[node.variant] || { label: node.variant, color: "#8B6CFF" };
      const subtree = getVariantSubtreeSummary(node.variant);
      const progressPercent = subtree.percent;
      const statusText = progressPercent >= 100 ? '100%' : (done ? 'AKTIV' : (discoveryState === "locked" ? '🔒' : 'ÖFFNEN'));
      el.classList.add("variant-skill-node", `variant-${node.variant}`);
      el.style.setProperty("--variant-color", meta.color);
      el.innerHTML = `
        <span class="variant-skill-node-icon">${getVariantIconSvg(node.variant)}</span>
        <span class="node-target">${(meta.shortLabel || meta.label).toUpperCase()}</span>
        <span class="node-label">${progressPercent}% Skill Tree</span>
        <span class="node-complete-pill">${statusText}</span>
      `;
      el.addEventListener("click", () => openVariantModal(node.variant));
    } else {
      const current = nodeValue(node);
      const title = getNodeTitle(node);
      const progress = Math.max(0, Math.min(100, Math.round((current / Math.max(1, node.target)) * 100)));
      const metricIcon = node.metric === "variantMax"
        ? getVariantIconSvg(node.variant)
        : getMetricIconSvg(
            node.metric === "standardMax" ? "max"
              : node.metric === "trainingDays" ? "week"
              : node.metric === "workoutTotal" ? "total"
              : node.metric === "workoutSets" ? "max"
              : node.metric === "workoutVariants" ? "week"
              : node.metric
          );

      if (discoveryState === "mystery") {
        el.innerHTML = `
          <span class="mystery-mark">?</span>
        `;
        el.setAttribute("aria-label", "Geheimes Ziel");
      } else {
        el.innerHTML = `
          <span class="node-icon">${metricIcon}</span>
          <span class="node-target">${node.target}</span>
          <span class="node-label">${discoveryState === "current" ? `${current}/${node.target} · ${title}` : title}</span>
          ${discoveryState === "current" || done ? `<span class="node-progress"><span style="width:${progress}%"></span></span>` : '<span class="node-progress locked-progress"><span></span></span>'}
          ${done ? '<span class="node-complete-pill">GESCHAFFT</span>' : (discoveryState === "locked" ? '<span class="node-lock">🔒</span>' : '')}
        `;
      }

      el.addEventListener("click", () => {
        if (discoveryState === "mystery") return;
        const currentValue = nodeValue(node);
        let detail = `${getNodeRequirementLabel(node)}\nAktuell: ${currentValue}`;
        if (discoveryState === "locked") detail += `\n\nSchließe zuerst das vorherige Ziel ab.`;
        if (node.metric === "week") detail += `\n\nEine Woche läuft von Montag bis Sonntag.`;
        if (node.metric === "variantMax") detail += `\n\nDiese Wiederholungen zählen nur für ${VARIANT_META[node.variant]?.label || "diese Variante"}.`;
        alert(detail);
      });
    }

    skillTree.appendChild(el);
    positionTreeNode(el, node, columnCenters);
    nodeElements.set(node.id, el);
  });

  // Connectors are appended after the nodes but remain visually behind them
  // through z-index. Using actual element sizes avoids misalignment when the
  // five columns shrink on narrower displays.
  SKILL_NODES.forEach(node => {
    if (!nodeElements.has(node.id)) return;
    (node.parents || []).forEach(parentId => {
      const parent = getNode(parentId);
      if (!parent || !nodeElements.has(parentId)) return;
      const line = createConnector(parent, node, nodeElements);
      if (!line) return;
      if (isNodeDone(parent) && isNodeDone(node)) line.classList.add("done");
      else if (isNodeDone(parent) && isNodeAvailable(node)) line.classList.add("active");
      skillTree.appendChild(line);
    });
  });

  syncTreeCanvasHeight();
}

function openVariantModal(variant) {
  const meta = VARIANT_META[variant] || { label: variant, color: "#8B6CFF" };
  const subtree = getVariantSubtreeSummary(variant);
  const stats = getVariantDynamicStats(variant);
  const colorRgb = hexToRgbString(meta.color);

  variantModalTitle.textContent = `${meta.label} Push-Up`;
  variantModalIcon.innerHTML = getVariantIconSvg(variant);
  variantModalIcon.style.setProperty("--variant-color", meta.color);
  variantModalSubtitle.textContent = `Eigener Unter-Skill-Tree für ${meta.label}. Hier siehst du Max Reps, Sets, 24h, 7 Tage und Gesamt-Fortschritt.`;
  variantModalProgress.textContent = `${subtree.percent}%`;
  variantModal.style.setProperty("--variant-color", meta.color);
  variantModal.style.setProperty("--variant-rgb", colorRgb);
  variantSheetPanel?.style.setProperty("--variant-color", meta.color);
  variantSheetPanel?.style.setProperty("--variant-rgb", colorRgb);

  if (variantQuickStats) {
    variantQuickStats.innerHTML = `
      <div class="variant-quick-stat"><strong>${stats.max}</strong><span>Max</span></div>
      <div class="variant-quick-stat"><strong>${stats.sets}</strong><span>Sets</span></div>
      <div class="variant-quick-stat"><strong>${stats.day}</strong><span>24h</span></div>
      <div class="variant-quick-stat"><strong>${stats.week}</strong><span>7 Tage</span></div>
      <div class="variant-quick-stat"><strong>${stats.total}</strong><span>Gesamt</span></div>
    `;
  }

  if (variantTree) {
    const layout = VARIANT_SUBTREE_LAYOUT;
    const root = layout.root;
    const stateByKey = Object.fromEntries(subtree.states.map(state => [state.metricKey, state]));
    const metricKeys = ["max", "day", "total", "sets", "week"];

    const lines = metricKeys.map(metricKey => {
      const pos = layout[metricKey];
      return `<line x1="${root.x}" y1="${root.y}" x2="${pos.x}" y2="${pos.y}"></line>`;
    }).join('');

    const nodes = metricKeys.map(metricKey => {
      const state = stateByKey[metricKey];
      const pos = layout[metricKey];
      const classes = ['variant-mini-node', `metric-${metricKey}`];
      if (state?.done) classes.push('done');
      const targetText = state?.done ? '✓' : `${state?.nextTarget || 0}`;
      const footerText = state?.done ? `${state.completed}/${state.total}` : `${Math.min(state.current, state.nextTarget || state.current)}/${state.nextTarget || 0}`;
      return `
        <div class="${classes.join(' ')}" style="left:${pos.x}%; top:${pos.y}%">
          <span class="variant-mini-icon">${getVariantTreeMetricIcon(metricKey)}</span>
          <strong class="variant-mini-target">${targetText}</strong>
          <span class="variant-mini-label">${getVariantTreeMetricLabel(metricKey)}</span>
          <small class="variant-mini-progress">${footerText}</small>
        </div>
      `;
    }).join('');

    variantTree.innerHTML = `
      <svg class="variant-mini-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>
      ${nodes}
      <div class="variant-mini-node variant-mini-root ${subtree.percent >= 100 ? 'done' : ''}" style="left:${root.x}%; top:${root.y}%">
        <span class="variant-mini-icon">${getVariantIconSvg(variant)}</span>
        <strong class="variant-mini-target">${subtree.percent}%</strong>
        <span class="variant-mini-label">${meta.shortLabel || meta.label}</span>
        <small class="variant-mini-progress">${subtree.completed}/${subtree.total} Knoten</small>
      </div>
    `;
  }

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

function uniqueSortedTargets(targets) {
  return [...new Set(targets.filter(Number.isFinite))].sort((a, b) => a - b);
}

function getCompletedSessionReps() {
  return workoutSets.reduce((sum, set) => sum + Math.max(0, Number(set.reps) || 0), 0);
}

function getSessionVariantTotal(variant, includeCurrent = true) {
  const completed = workoutSets
    .filter(set => set.variant === variant)
    .reduce((sum, set) => sum + Math.max(0, Number(set.reps) || 0), 0);
  const current = includeCurrent && currentTrainingVariant === variant && (trainingPhase === "active" || trainingPhase === "countdown")
    ? repCount
    : 0;
  return completed + current;
}

function getSessionVariantMax(variant) {
  const completedMax = workoutSets
    .filter(set => set.variant === variant)
    .reduce((max, set) => Math.max(max, Math.max(0, Number(set.reps) || 0)), 0);
  const current = currentTrainingVariant === variant && (trainingPhase === "active" || trainingPhase === "countdown")
    ? repCount
    : 0;
  return Math.max(completedMax, current);
}

function getLiveMilestoneCandidates() {
  const variant = currentTrainingVariant;
  const meta = VARIANT_META[variant] || VARIANT_META.standard;
  const candidates = [];
  const treeNodes = V012_CHAPTERS.flatMap(chapter => chapter.paths.flatMap(getV012PathNodes));
  const stats = getVariantStats(variant);
  const sessionVariantTotal = getSessionVariantTotal(variant);
  const sessionVariantMax = getSessionVariantMax(variant);

  const pushCandidate = ({ key, target, title, short, detail, tone, icon, cost, currentValue, priority }) => {
    candidates.push({
      key, target, title, short, detail, tone, icon, priority,
      milestoneCost: Math.max(1, Math.ceil(cost)),
      currentValue: Math.max(0, currentValue),
      passed: currentValue >= target,
      remaining: Math.max(0, Math.ceil(target - currentValue)),
      progressFraction: clamp(target > 0 ? currentValue / target : 1, 0, 1)
    });
  };

  const maxTargets = uniqueSortedTargets(treeNodes
    .filter(node => node.metric === "variantMax" && node.variant === variant)
    .map(node => node.target));
  maxTargets.forEach(target => {
    if (target <= stats.max) return;
    pushCandidate({
      key: `${variant}-max-${target}`, target,
      title: `${target} ${meta.label} in one set`, short: `${target}`, detail: "Best Set", tone: variant === "standard" ? "max" : "variant",
      icon: getVariantIconSvg(variant), priority: 1,
      cost: target,
      currentValue: Math.max(stats.max, sessionVariantMax)
    });
  });

  const totalTargets = uniqueSortedTargets(treeNodes
    .filter(node => node.metric === "variantTotal" && node.variant === variant)
    .map(node => node.target));
  totalTargets.forEach(target => {
    if (target <= stats.total) return;
    pushCandidate({
      key: `${variant}-total-${target}`, target,
      title: `${target} ${meta.label} total`, short: `${target}`, detail: "Total", tone: variant === "standard" ? "total" : "variant-soft",
      icon: getVariantIconSvg(variant), priority: 2,
      cost: target - stats.total,
      currentValue: stats.total + sessionVariantTotal
    });
  });

  return candidates;
}

function getLiveMilestoneState() {
  const all = getLiveMilestoneCandidates();
  const passed = all.filter(goal => goal.passed)
    .sort((a, b) => a.milestoneCost - b.milestoneCost || a.priority - b.priority);
  const upcoming = all.filter(goal => !goal.passed)
    .sort((a, b) => a.remaining - b.remaining || a.priority - b.priority || a.target - b.target);
  const lastPassed = passed.length ? passed[passed.length - 1] : null;
  const next = upcoming[0] || null;
  const segmentProgress = next ? next.progressFraction : 1;
  return { all, passed, upcoming, lastPassed, next, segmentProgress };
}

function renderLiveGoals() {
  if (!liveGoalsList) return;
  const meta = VARIANT_META[currentTrainingVariant] || VARIANT_META.standard;
  const state = getLiveMilestoneState();
  const previousNextKey = lastRailNextKey;
  lastRailNextKey = state.next?.key || null;
  const setNo = workoutSets.length + 1;

  liveGoalsVariantHint.textContent = `${meta.label} · Set ${setNo}`;
  if (liveGoalText) {
    if (state.next) {
      const remaining = state.next.remaining;
      liveGoalText.textContent = `Noch ${remaining} Push-up${remaining === 1 ? "" : "s"} bis ${state.next.title}`;
    } else {
      liveGoalText.textContent = "Alle sichtbaren Ziele in diesem Bereich geschafft.";
    }
  }

  const firstGoalPosition = 64;
  const upcomingPositions = [firstGoalPosition, 82, 95];
  const fillEnd = state.next ? 5 + state.segmentProgress * (firstGoalPosition - 5) : 96;
  const parts = [
    '<div class="milestone-track-line" aria-hidden="true"></div>',
    `<div class="milestone-track-fill" style="left:5%;width:${Math.max(0, fillEnd - 5)}%" aria-hidden="true"></div>`
  ];

  if (state.lastPassed) {
    parts.push(`
      <div class="milestone-emblem completed tone-${state.lastPassed.tone}" data-milestone-key="${state.lastPassed.key}" style="left:5%">
        <span class="milestone-emblem-icon">${state.lastPassed.icon}</span>
        <span class="milestone-check">✓</span>
        <small>${state.lastPassed.short}</small>
      </div>`);
  } else {
    parts.push('<div class="milestone-start-dot" style="left:5%" aria-hidden="true"></div>');
  }

  state.upcoming.slice(0, 3).forEach((goal, index) => {
    parts.push(`
      <div class="milestone-emblem ${index === 0 ? "next" : "future"} tone-${goal.tone}" data-milestone-key="${goal.key}" style="left:${upcomingPositions[index]}%" aria-label="${goal.title}">
        <span class="milestone-emblem-icon">${goal.icon}</span>
        <small>${goal.short}</small>
      </div>`);
  });

  liveGoalsList.innerHTML = parts.join("");
  if (previousNextKey && previousNextKey !== lastRailNextKey && state.lastPassed?.key === previousNextKey) {
    const completed = liveGoalsList.querySelector(`[data-milestone-key="${previousNextKey}"]`);
    if (completed?.animate) {
      completed.animate(
        [{ left: "64%", transform: "translateX(-50%) scale(1.05)" }, { left: "5%", transform: "translateX(-50%) scale(1)" }],
        { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    }
  }
}

function renderPauseChallenges() {
  if (!pauseChallengesList) return;
  const state = getLiveMilestoneState();
  const goals = state.upcoming.slice(0, 3);

  if (!goals.length) {
    pauseChallengesList.innerHTML = '<div class="pause-challenge-empty">Alle sichtbaren Challenges geschafft.</div>';
    return;
  }

  pauseChallengesList.innerHTML = goals.map(goal => {
    const pct = Math.round(clamp(goal.progressFraction, 0, 1) * 100);
    const remaining = Math.max(0, Math.ceil(goal.remaining));
    return `
      <div class="pause-challenge-row tone-${goal.tone}">
        <span class="pause-challenge-icon">${goal.icon}</span>
        <div class="pause-challenge-copy">
          <div class="pause-challenge-line">
            <strong>${goal.title}</strong>
            <small>Noch ${remaining}</small>
          </div>
          <div class="pause-challenge-progress" aria-label="${pct}% Fortschritt">
            <span style="width:${pct}%"></span>
          </div>
        </div>
      </div>`;
  }).join("");
}

let toastTimer = null;
function showAppToast(message = "Training gespeichert") {
  if (!appToast) return;
  window.clearTimeout(toastTimer);
  appToast.textContent = message;
  appToast.classList.add("show");
  toastTimer = window.setTimeout(() => appToast.classList.remove("show"), 2800);
}

function createConnector(from, to, nodeElements) {
  const fromEl = nodeElements.get(from.id);
  const toEl = nodeElements.get(to.id);
  if (!fromEl || !toEl) return null;

  const line = document.createElement("div");
  line.className = `connector branch-${to.branch}`;

  const x1 = fromEl.offsetLeft + fromEl.offsetWidth / 2;
  const y1 = fromEl.offsetTop + fromEl.offsetHeight / 2;
  const x2 = toEl.offsetLeft + toEl.offsetWidth / 2;
  const y2 = toEl.offsetTop + toEl.offsetHeight / 2;
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

function applyHeroGender() {
  const gender = progress?.heroGender === "female" ? "female" : "male";
  document.body.dataset.heroGender = gender;

  if (profileGenderMaleBtn) {
    const active = gender === "male";
    profileGenderMaleBtn.classList.toggle("active", active);
    profileGenderMaleBtn.setAttribute("aria-pressed", String(active));
  }
  if (profileGenderFemaleBtn) {
    const active = gender === "female";
    profileGenderFemaleBtn.classList.toggle("active", active);
    profileGenderFemaleBtn.setAttribute("aria-pressed", String(active));
  }
}

function setHeroGender(gender) {
  const nextGender = gender === "female" ? "female" : "male";
  if (progress.heroGender === nextGender) {
    applyHeroGender();
    return;
  }
  progress.heroGender = nextGender;
  saveProgress();
  applyHeroGender();
}

function renderProfile() {
  applyHeroGender();
  applyAccountCustomization();
  const accountInfo = getAccountLevelInfo();
  if (profileNameInput) profileNameInput.value = progress.accountName || "Athlete";
  if (profileAccountLevel) profileAccountLevel.textContent = accountInfo.level;
  if (profileAccountXpText) profileAccountXpText.textContent = `Level ${accountInfo.level} · ${formatTreeNumber(accountInfo.inLevel)} / ${formatTreeNumber(accountInfo.need)} XP`;
  const nextReward = getNextCosmeticReward(accountInfo.level);
  if (profileNextRewardText) profileNextRewardText.textContent = nextReward ? `Lvl ${nextReward.level}: ${nextReward.label}` : "All alpha rewards unlocked";
  renderCustomizationChoices();
  if (!profilePushRankName || !profilePushRankIcon) return;
  const rankName = getCurrentRankName();
  profilePushRankName.textContent = getRankDisplayName(rankName);
  profilePushRankIcon.innerHTML = rankName === "Starter"
    ? getVariantIconSvg("standard", "profile-starter-icon")
    : getRankIconSvg(rankName, "profile-rank-asset");

  const currentIndex = Math.max(0, RANK_ORDER.indexOf(rankName));
  const nextRank = RANK_ORDER[currentIndex + 1];
  profilePushRankHint.textContent = nextRank
    ? `Next: ${getRankDisplayName(nextRank)}`
    : "Highest push-up rank reached";

  if (profileHistorySummary) {
    const items = Array.isArray(progress.trainingHistory) ? progress.trainingHistory : [];
    if (!items.length) {
      profileHistorySummary.textContent = "No workouts saved yet";
    } else {
      const latest = items[0];
      profileHistorySummary.textContent = `${items.length} ${items.length === 1 ? "workout" : "workouts"} · latest ${formatWorkoutDate(latest.date)}`;
    }
  }
}

function createHistoryEntry(item) {
  const entry = document.createElement("div");
  entry.className = "history-entry";

  const main = document.createElement("div");
  main.className = "history-entry-main";

  const when = document.createElement("strong");
  when.textContent = formatWorkoutDate(item.date);

  const details = document.createElement("span");
  const sets = Array.isArray(item.sets) ? item.sets : [];
  if (sets.length) {
    const variants = [...new Set(sets.map(set => VARIANT_META[set.variant]?.label || "Standard"))];
    details.textContent = `${sets.length} ${sets.length === 1 ? "Set" : "Sets"} · ${variants.join(", ")}`;
  } else {
    details.textContent = VARIANT_META[item?.variant]?.label || "Standard";
  }

  main.append(when, details);

  const reps = document.createElement("div");
  reps.className = "history-entry-reps";
  const count = getWorkoutRepCount(item);
  reps.textContent = `${count} Push-up${count === 1 ? "" : "s"}`;

  entry.append(main, reps);
  return entry;
}

// ---------- Historie ----------
function renderHistory() {
  const items = Array.isArray(progress.trainingHistory)
    ? progress.trainingHistory.slice(0, 200)
    : [];

  historyCount.textContent = `${items.length} ${items.length === 1 ? "Workout" : "Workouts"}`;
  historyList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "Noch kein Training gespeichert.";
    historyList.appendChild(empty);
    return;
  }

  items.forEach(item => historyList.appendChild(createHistoryEntry(item)));
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

  if (itemDay === today) return `Today, ${time}`;
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
  trainingModal.classList.toggle("selection-theme", stepName === "exercise");
  trainingModal.classList.toggle("quick-theme", stepName === "quick");

  if (stepName === "exercise") {
    exerciseStep.classList.remove("hidden");
    trainingTitle.textContent = "Training auswählen";
    backBtn.classList.add("hidden");
  }
  if (stepName === "quick") {
    quickStep.classList.remove("hidden");
    trainingTitle.textContent = "Push-up Workout";
    backBtn.classList.remove("hidden");
  }
  if (stepName === "result") {
    resultStep.classList.remove("hidden");
    trainingTitle.textContent = "Workout prüfen";
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
  updateVariantAvailability();
  document.body.classList.add("training-active");
  trainingModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  showStep("exercise");
}

function closeTraining() {
  workoutActive = false;
  countdownActive = false;
  autoCountdownPending = false;
  trainingPhase = "prep";
  stopTimer();
  stopPauseTimer();
  stopDetectionLoop();
  stopCamera();
  trainingModal.classList.add("hidden");
  document.body.classList.remove("training-active");
  document.body.style.overflow = variantModal.classList.contains("hidden") ? "" : "hidden";
  render();
}

function updateQuickVariantPill() {
  const meta = VARIANT_META[currentTrainingVariant] || VARIANT_META.standard;
  quickVariantPill.innerHTML = `${getVariantIconSvg(currentTrainingVariant)}<span>${meta.label.toUpperCase()} PUSH-UP</span>`;
  quickVariantPill.style.setProperty("--variant-color", meta.color);
}

function setSelectedTrainingVariant(variant) {
  if (!isVariantAvailable(variant)) return;
  currentTrainingVariant = VARIANT_META[variant] ? variant : "standard";
  variantCards.forEach(card => card.classList.toggle("selected", card.dataset.variant === currentTrainingVariant));
  workoutVariantButtons.forEach(button => button.classList.toggle("selected", button.dataset.workoutVariant === currentTrainingVariant));
  updateQuickVariantPill();
  renderLiveGoals();
  if (trainingPhase === "pause") {
    pauseReadyHint.textContent = `${VARIANT_META[currentTrainingVariant].label} gewählt · Training fortsetzen, wenn du bereit bist.`;
    renderPauseChallenges();
  }
}

function showPrepUI() {
  trainingPhase = "prep";
  setPrepPanel.classList.remove("hidden");
  activeSetPanel.classList.add("hidden");
  pausePanel.classList.add("hidden");
  pauseSetBtn.classList.add("hidden");
  finishWorkoutBtn.classList.toggle("hidden", workoutSets.length === 0);
  manualModeBtn.classList.remove("hidden");
  setNumberLabel.textContent = `SET ${workoutSets.length + 1}`;
}

function showActiveUI() {
  setPrepPanel.classList.add("hidden");
  pausePanel.classList.add("hidden");
  activeSetPanel.classList.remove("hidden");
  manualModeBtn.classList.add("hidden");
  finishWorkoutBtn.classList.toggle("hidden", workoutSets.length === 0 && !workoutActive);
  pauseSetBtn.classList.toggle("hidden", !workoutActive);
  setNumberLabel.textContent = `SET ${workoutSets.length + 1}`;
}

function showPauseUI() {
  trainingPhase = "pause";
  setPrepPanel.classList.add("hidden");
  activeSetPanel.classList.add("hidden");
  pausePanel.classList.remove("hidden");
  pauseSetBtn.classList.add("hidden");
  finishWorkoutBtn.classList.toggle("hidden", workoutSets.length === 0);
  manualModeBtn.classList.add("hidden");
  setNumberLabel.textContent = `SET ${workoutSets.length + 1}`;
  const lastSet = workoutSets[workoutSets.length - 1];
  if (lastSet) {
    lastSetSummary.textContent = `${VARIANT_META[lastSet.variant]?.label || "Standard"} · ${lastSet.reps} Push-up${lastSet.reps === 1 ? "" : "s"}`;
  } else {
    lastSetSummary.textContent = "Noch kein Set gespeichert";
  }

  startWorkoutBtn.textContent = "Training fortsetzen";
  startWorkoutBtn.disabled = false;
  startWorkoutBtn.classList.toggle("hidden", autoCountdownPending);
  pauseReadyHint.textContent = autoCountdownPending
    ? "Jetzt in die obere Push-up-Position gehen · der Countdown startet automatisch, sobald du stabil liegst."
    : `${VARIANT_META[currentTrainingVariant]?.label || "Standard"} gewählt · Training fortsetzen, wenn du bereit bist.`;
  renderPauseChallenges();
}

function resetTrainingSession() {
  workoutActive = false;
  countdownActive = false;
  autoCountdownPending = false;
  lastRailNextKey = null;
  manualMode = false;
  cameraWasStarted = false;
  trainingPhase = "prep";
  workoutSessionStartedAt = null;
  workoutSets = [];
  sessionTotalReps = 0;
  currentSetStartedAt = null;
  setEnding = false;
  pauseStartedAt = null;
  pauseSeconds = 0;
  lastPauseVibrationMark = 0;
  stopTimer();
  stopPauseTimer();
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
  motionCue.textContent = "Position einnehmen";
  detectedResult.textContent = "0";
  resultSetCount.textContent = "0";
  resultSetsList.innerHTML = "";
  repInput.value = "";
  setCompleteOverlay.classList.add("hidden");
  countdownBox.classList.add("hidden");

  startCameraBtn.classList.add("hidden");
  startCameraBtn.disabled = false;
  startCameraBtn.textContent = "Kamera erneut versuchen";
  startWorkoutBtn.classList.add("hidden");
  startWorkoutBtn.disabled = true;
  finishWorkoutBtn.classList.add("hidden");
  pauseSetBtn.classList.add("hidden");
  manualModeBtn.classList.remove("hidden");
  prepCameraHint.textContent = "Noch keine Variante ausgewählt.";

  setPositionStatus("neutral", "⬜", "Kamera wird vorbereitet", "Geh in deine obere Push-up-Position.");
  cameraStatus.textContent = "Wähle zuerst eine Variante.";
  showPrepUI();
  renderStaticIcons();
  renderLiveGoals();
}

function selectWorkoutVariant(variant) {
  if (!isVariantAvailable(variant)) return;
  setSelectedTrainingVariant(variant);
  if (trainingPhase === "prep") {
    showActiveUI();
    prepCameraHint.textContent = `${VARIANT_META[currentTrainingVariant].label} gewählt. Kamera wird gestartet …`;
    autoCountdownPending = true;
    startCamera();
    return;
  }
  if (trainingPhase === "pause") {
    // Variantenwechsel während der Pause startet bewusst noch kein neues Set.
    autoCountdownPending = false;
    goodPositionSince = 0;
    startWorkoutBtn.textContent = "Training fortsetzen";
    startWorkoutBtn.disabled = false;
    startWorkoutBtn.classList.remove("hidden");
    pauseReadyHint.textContent = `${VARIANT_META[currentTrainingVariant].label} gewählt · Training fortsetzen, wenn du bereit bist.`;
    renderPauseChallenges();
  }
}

function armNextSetFromPause() {
  if (trainingPhase !== "pause" || countdownActive || workoutActive) return;
  autoCountdownPending = true;
  goodPositionSince = 0;
  readyForCountdown = false;
  startWorkoutBtn.classList.add("hidden");
  pauseReadyHint.textContent = "Jetzt in die obere Push-up-Position gehen · der Countdown startet automatisch, sobald du stabil liegst.";
  setPositionStatus("neutral", "⬜", "Bereit fürs nächste Set", "Geh jetzt in deine obere Push-up-Position.");
  motionCue.textContent = "Position einnehmen";
}

function updatePauseClock() {
  if (!pauseStartedAt) return;
  pauseSeconds = Math.floor((Date.now() - pauseStartedAt) / 1000);
  pauseTimerDisplay.textContent = formatTime(pauseSeconds);

  // Schlicht halten: kein Pausenziel, nur alle 30 Sekunden ein kurzer Vibrationshinweis.
  const vibrationMark = Math.floor(pauseSeconds / 30);
  if (vibrationMark > 0 && vibrationMark > lastPauseVibrationMark) {
    lastPauseVibrationMark = vibrationMark;
    if (navigator.vibrate) navigator.vibrate(45);
  }
}

function startPauseTimer() {
  stopPauseTimer();
  pauseStartedAt = Date.now();
  pauseSeconds = 0;
  lastPauseVibrationMark = 0;
  pauseTimerDisplay.textContent = "00:00";
  pauseInterval = window.setInterval(updatePauseClock, 250);
}

function stopPauseTimer() {
  if (pauseInterval) clearInterval(pauseInterval);
  pauseInterval = null;
}

function finalizePause() {
  if (!pauseStartedAt) return 0;
  updatePauseClock();
  const seconds = pauseSeconds;
  const lastSet = workoutSets[workoutSets.length - 1];
  if (lastSet) lastSet.pauseAfterSeconds = Math.max(0, Number(lastSet.pauseAfterSeconds) || 0) + seconds;
  pauseStartedAt = null;
  stopPauseTimer();
  return seconds;
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
  autoCountdownPending = true;
  startCameraBtn.classList.add("hidden");

  if (!navigator.mediaDevices?.getUserMedia) {
    autoCountdownPending = false;
    setPositionStatus("bad", "🟥", "Kamera nicht verfügbar", "Du kannst unten in den manuellen Modus wechseln.");
    startCameraBtn.classList.remove("hidden");
    startCameraBtn.textContent = "Kamera erneut versuchen";
    return;
  }

  cameraStatus.textContent = "Frontkamera und Gesichtserkennung werden gestartet …";
  setPositionStatus("neutral", "⬜", "Kamera wird vorbereitet", "Leg das Handy schon in Position – der Countdown startet automatisch.");
  motionCue.textContent = "Position einnehmen";

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

    if (!autoCountdownPending || manualMode || quickStep.classList.contains("hidden")) {
      stopCamera();
      return;
    }

    cameraWasStarted = true;
    setPositionStatus("warn", "🟨", "Erkennung wird geladen", "Bleib kurz in der oberen Push-up-Position.");
    await initFaceDetector();

    if (!autoCountdownPending || manualMode || quickStep.classList.contains("hidden")) {
      stopCamera();
      return;
    }

    startCameraBtn.classList.add("hidden");
    startWorkoutBtn.classList.add("hidden");
    cameraStatus.textContent = "Sobald deine obere Position erkannt ist, startet automatisch der 3‑Sekunden-Countdown.";
    motionCue.textContent = "Obere Position finden";

    startDetectionLoop();
  } catch (error) {
    console.error("Kamera/FaceDetector konnte nicht gestartet werden:", error);
    stopCamera();
    autoCountdownPending = false;
    setPositionStatus("bad", "🟥", "Kamera konnte nicht gestartet werden", "Berechtigung prüfen oder manuellen Modus verwenden.");
    cameraStatus.textContent = "Kamerazugriff wurde nicht erlaubt oder die Gesichtserkennung konnte nicht geladen werden.";
    startCameraBtn.disabled = false;
    startCameraBtn.classList.remove("hidden");
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
    if (trainingPhase === "prep" || trainingPhase === "pause" || trainingPhase === "countdown") {
      updateSetupGuidance(currentFace, now);
    }
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
    if (trainingPhase !== "pause" || autoCountdownPending) startWorkoutBtn.disabled = true;
    goodPositionSince = 0;
    if (trainingPhase === "prep" || trainingPhase === "countdown") {
      setPositionStatus("bad", "🟥", "Gesicht nicht erkannt", "Beug dich etwas über das Handy oder schieb es näher zu deinem Gesicht.");
      motionCue.textContent = "Gesicht ins Blickfeld bringen";
    } else if (trainingPhase === "pause" && autoCountdownPending) {
      setPositionStatus("neutral", "⬜", "Warte auf deine Position", "Geh in die obere Push-up-Position, wenn du bereit bist.");
      motionCue.textContent = "Position einnehmen";
    }
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

  setPositionStatus("warn", "🟨", "Kopf wieder über das Handy", "Wenn du das Set beenden willst, geh vollständig aus dem Kamerablickfeld.");

  if (repCount > 0 && lostFor >= QUICK_CONFIG.autoSetEndLossMs && !setEnding) {
    endCurrentSetToPause("face-left");
    return;
  }

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
  if (trainingPhase !== "pause" || autoCountdownPending) startWorkoutBtn.disabled = true;

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
  if (trainingPhase !== "pause" || autoCountdownPending) startWorkoutBtn.disabled = false;

  if (autoCountdownPending && !countdownActive) {
    autoCountdownPending = false;
    setPositionStatus("good", "🟩", "Bereit", "Der Countdown startet automatisch – oben bleiben.");
    if (trainingPhase === "pause") pauseReadyHint.textContent = "Position erkannt · Countdown startet …";
    motionCue.textContent = "COUNTDOWN";
    queueMicrotask(() => startCountdown());
    return;
  }

  setPositionStatus("good", "🟩", "Bereit", "Obere Position erkannt.");
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

  const cameFromPause = trainingPhase === "pause";
  trainingPhase = "countdown";
  countdownActive = true;
  autoCountdownPending = false;
  manualModeBtn.classList.add("hidden");
  calibrationSamples = [];
  lastMetric = null;
  maxMetricSinceTop = null;
  inferredBottomFromLoss = false;
  lastRepAt = 0;
  startWorkoutBtn.disabled = true;
  showActiveUI();
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
    autoCountdownPending = true;
    goodPositionSince = 0;
    countdownBox.classList.add("hidden");
    if (cameFromPause) {
      showPauseUI();
      pauseReadyHint.textContent = "Noch einmal sauber oben positionieren – dann startet der Countdown erneut.";
    } else {
      trainingPhase = "prep";
      showActiveUI();
      setPositionStatus("bad", "🟥", "Noch einmal positionieren", "Sobald du wieder stabil oben bist, startet der Countdown automatisch neu.");
    }
    motionCue.textContent = "Obere Position finden";
    return;
  }

  baselineTopMetric = median(usableSamples);
  calculateThresholds();
  if (cameFromPause || pauseStartedAt) finalizePause();

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
  autoCountdownPending = false;
  workoutActive = true;
  manualMode = false;
  trainingPhase = "active";
  workoutSessionStartedAt = workoutSessionStartedAt || Date.now();
  currentSetStartedAt = Date.now();
  workoutStartedAt = currentSetStartedAt;
  elapsedSeconds = 0;
  repCount = 0;
  phase = "up";
  downFrames = 0;
  upFrames = 0;
  lastMetric = currentFace?.metric ?? baselineTopMetric;
  maxMetricSinceTop = currentFace?.metric ?? baselineTopMetric;
  inferredBottomFromLoss = false;
  lastRepAt = 0;
  setEnding = false;
  liveRepCount.textContent = "0";

  showActiveUI();
  pauseSetBtn.classList.remove("hidden");
  setPositionStatus("good", "🟩", "Set läuft", "Kurzes Verschwinden unten ist okay. Ganz aus dem Bild gehen beendet das Set automatisch.");
  motionCue.textContent = "RUNTER";
  renderLiveGoals();
}

function commitCurrentSet() {
  if (!workoutActive && trainingPhase !== "active") return null;
  const now = Date.now();
  const reps = Math.max(0, Math.floor(Number(repCount) || 0));
  const setStartedAt = currentSetStartedAt || workoutStartedAt;

  // Ein Set existiert erst, sobald mindestens eine Wiederholung geschafft wurde.
  workoutActive = false;
  currentSetStartedAt = null;
  if (reps < 1) return null;

  const set = {
    setNumber: workoutSets.length + 1,
    variant: currentTrainingVariant,
    reps,
    durationSeconds: setStartedAt ? Math.max(0, Math.floor((now - setStartedAt) / 1000)) : 0,
    autoDetectedReps: manualMode ? null : reps,
    pauseAfterSeconds: 0
  };
  workoutSets.push(set);
  sessionTotalReps = getCompletedSessionReps();
  return set;
}

function endCurrentSetToPause(reason = "manual") {
  if (!workoutActive || setEnding) return;
  if (repCount <= 0 && reason === "face-left") return;
  setEnding = true;

  // Versehentlich gestartete Sets mit 0 Wiederholungen werden komplett verworfen.
  if (repCount <= 0) {
    workoutActive = false;
    currentSetStartedAt = null;
    workoutStartedAt = null;
    repCount = 0;
    liveRepCount.textContent = "0";
    phase = "up";
    downFrames = 0;
    upFrames = 0;
    goodPositionSince = 0;
    readyForCountdown = false;
    autoCountdownPending = false;
    pauseSetBtn.classList.add("hidden");
    setEnding = false;

    if (workoutSets.length > 0) {
      showPauseUI();
      startPauseTimer();
      pauseReadyHint.textContent = "0 Wiederholungen · dieses Set wurde nicht gespeichert. Training fortsetzen, wenn du bereit bist.";
    } else {
      showPrepUI();
      prepCameraHint.textContent = "0 Wiederholungen · dieses Set wurde nicht gespeichert. Wähle eine Variante für dein erstes Set.";
    }
    renderLiveGoals();
    return;
  }

  const set = commitCurrentSet();
  if (!set) { setEnding = false; return; }

  trainingPhase = "transition";
  autoCountdownPending = false;
  pauseSetBtn.classList.add("hidden");
  setCompleteReps.textContent = String(set.reps);
  setCompleteLabel.textContent = `${VARIANT_META[set.variant]?.label || "Standard"} Push-ups`;
  setCompleteOverlay.classList.remove("hidden");
  if (navigator.vibrate) navigator.vibrate(45);

  window.setTimeout(() => {
    if (trainingPhase !== "transition") return;
    setCompleteOverlay.classList.add("hidden");
    repCount = 0;
    liveRepCount.textContent = "0";
    phase = "up";
    downFrames = 0;
    upFrames = 0;
    goodPositionSince = 0;
    readyForCountdown = false;
    setEnding = false;
    autoCountdownPending = false;
    showPauseUI();
    startPauseTimer();
    renderLiveGoals();
  }, 900);
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
  autoCountdownPending = false;
  countdownActive = false;
  stopDetectionLoop();
  stopCamera();
  manualMode = true;
  cameraWasStarted = false;
  workoutActive = false;
  trainingPhase = "result";
  workoutSets = [];
  resultSetCount.textContent = "1";
  detectedResult.textContent = "Manuell";
  resultSetsList.innerHTML = '<div class="result-set-row"><span>Manuelles Set</span><strong>Wiederholungen unten eingeben</strong></div>';
  manualRepWrap.classList.remove("hidden");
  autoResultNote.classList.add("hidden");
  showStep("result");
  setTimeout(() => repInput.focus(), 50);
}

function renderWorkoutResult() {
  const total = workoutSets.reduce((sum, set) => sum + Math.max(0, Number(set.reps) || 0), 0);
  resultSetCount.textContent = String(workoutSets.length);
  detectedResult.textContent = String(total);
  resultSetsList.innerHTML = "";
  workoutSets.forEach((set, index) => {
    const row = document.createElement("div");
    row.className = "result-set-row";
    const left = document.createElement("span");
    left.textContent = `Set ${index + 1} · ${VARIANT_META[set.variant]?.label || "Standard"}`;
    const right = document.createElement("strong");
    const pause = Number(set.pauseAfterSeconds) || 0;
    right.textContent = pause > 0 && index < workoutSets.length - 1
      ? `${set.reps} · Pause ${formatTime(pause)}`
      : `${set.reps} Push-ups`;
    row.append(left, right);
    resultSetsList.appendChild(row);
  });
}

function finishWorkout() {
  countdownActive = false;
  autoCountdownPending = false;
  countdownBox.classList.add("hidden");

  if (workoutActive && repCount > 0) {
    commitCurrentSet();
  }
  if (pauseStartedAt) finalizePause();

  workoutActive = false;
  trainingPhase = "result";
  stopTimer();
  stopPauseTimer();
  stopDetectionLoop();
  stopCamera();
  setCompleteOverlay.classList.add("hidden");

  // Kamera-Workouts werden beim Beenden sofort gespeichert und führen direkt zum Skill Tree.
  if (!manualMode) {
    const completedSets = workoutSets.filter(set => Number(set?.reps) >= 1);
    const saved = completedSets.length > 0 ? saveTrainingResult({ showSuccess: false }) : false;
    closeTraining();
    showView("tree");
    if (saved) showAppToast("Training gespeichert");
    return;
  }

  // Der manuelle Fallback behält sein Eingabefeld.
  manualRepWrap.classList.remove("hidden");
  autoResultNote.classList.add("hidden");
  showStep("result");
}

function updateTimer() {
  if (!workoutSessionStartedAt) return;
  elapsedSeconds = Math.floor((Date.now() - workoutSessionStartedAt) / 1000);
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
function saveTrainingResult(options = {}) {
  const showSuccess = options.showSuccess !== false;
  const assessmentWasActive = entryAssessmentActive;
  const oldMax = progress.pushupMax;
  const oldRank = getCurrentRankName();
  const oldAccountLevel = getAccountLevelInfo().level;

  if (manualMode) {
    const reps = Math.floor(Number(repInput.value));
    if (!Number.isFinite(reps) || reps < 1) {
      alert("Ein Set wird erst ab mindestens 1 Wiederholung gespeichert.");
      return;
    }
    workoutSets = [{ setNumber: 1, variant: currentTrainingVariant, reps, durationSeconds: 0, autoDetectedReps: null, pauseAfterSeconds: 0 }];
  }

  const sets = workoutSets.filter(set => Number.isFinite(Number(set.reps)) && Number(set.reps) >= 1);
  const totalReps = sets.reduce((sum, set) => sum + Math.max(0, Number(set.reps) || 0), 0);
  const earnedXp = getXpForWorkoutSets(sets);
  if (!sets.length) {
    alert("Es gibt noch kein abgeschlossenes Set zum Speichern.");
    return;
  }

  progress.variantStats = progress.variantStats || createEmptyVariantStats();
  sets.forEach(set => {
    const variant = VARIANT_META[set.variant] ? set.variant : "standard";
    const reps = Math.max(0, Math.floor(Number(set.reps) || 0));
    if (!progress.variantStats[variant]) progress.variantStats[variant] = { max: 0, total: 0 };
    progress.variantStats[variant].max = Math.max(progress.variantStats[variant].max, reps);
    progress.variantStats[variant].total += reps;
    if (variant === "standard") progress.pushupMax = Math.max(progress.pushupMax, reps);
  });

  progress.pushupTotal += totalReps;
  progress.lastTrainingDate = localDateString(new Date());
  const totalPauseSeconds = sets.reduce((sum, set) => sum + Math.max(0, Number(set.pauseAfterSeconds) || 0), 0);
  const sessionDurationSeconds = workoutSessionStartedAt ? Math.max(0, Math.floor((Date.now() - workoutSessionStartedAt) / 1000)) : 0;

  progress.trainingHistory.unshift({
    exercise: "pushups",
    variant: sets.length === 1 ? sets[0].variant : "mixed",
    reps: totalReps,
    sets: sets.map(set => ({ ...set })),
    pauseSeconds: totalPauseSeconds,
    durationSeconds: sessionDurationSeconds,
    date: new Date().toISOString(),
    usedCamera: !manualMode,
    mode: manualMode ? "manual" : "multi-set-face-v0112"
  });

  const todayTotal = getTodayTotal();
  const weekTotal = getCurrentWeekTotal();
  progress.pushupBestDay = Math.max(progress.pushupBestDay, todayTotal);
  progress.pushupBestWeek = Math.max(progress.pushupBestWeek, weekTotal);
  progress.trainingHistory = progress.trainingHistory.slice(0, 200);
  progress.accountXp = Math.max(0, Math.floor(Number(progress.accountXp) || 0)) + earnedXp;

  if (assessmentWasActive) {
    progress.entrySetupDone = true;
    progress.entryPath = "assessment";
    progress.entryAssessmentPending = false;
    entryAssessmentActive = false;
  }

  saveProgress();
  render();

  const newRank = getCurrentRankName();
  const rankUp = newRank !== oldRank;
  const newStandardRecord = progress.pushupMax > oldMax;
  const newAccountInfo = getAccountLevelInfo();
  const levelUps = Math.max(0, newAccountInfo.level - oldAccountLevel);
  const cosmeticUnlocks = getNewlyAvailableCosmetics(oldAccountLevel, newAccountInfo.level);

  successDetails.innerHTML = "";
  addSuccessLine(`${sets.length} ${sets.length === 1 ? "Set" : "Sets"} · ${totalReps} Push-ups gespeichert`);
  addSuccessLine(`+${earnedXp} XP · Level ${newAccountInfo.level}`, true);
  sets.forEach((set, index) => addSuccessLine(`Set ${index + 1}: ${set.reps} ${VARIANT_META[set.variant]?.label || "Standard"}`));
  addSuccessLine(`Heute: ${todayTotal} Push-ups`);
  addSuccessLine(`Gesamt: ${progress.pushupTotal} Push-ups`);
  if (assessmentWasActive) addSuccessLine(`⚡ Assessment complete · your starting rank was adjusted`, true);
  if (newStandardRecord) addSuccessLine(`🏆 Neuer Standard-Rekord: ${progress.pushupMax}`, true);
  if (levelUps > 0) addSuccessLine(`⬆ Level Up! ${oldAccountLevel} → ${newAccountInfo.level}`, true);
  cosmeticUnlocks.forEach(item => addSuccessLine(`🎁 ${item.kind} unlocked: ${item.label}`, true));
  if (rankUp) addSuccessLine(`⭐ Neuer Rang: ${newRank}`, true);
  else addSuccessLine(`Rang: ${newRank}`);
  if (showSuccess) showStep("success");
  return true;
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

function openTreeStats() {
  treeStatsSheet.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeTreeStats() {
  treeStatsSheet.classList.add("hidden");
  document.body.style.overflow = trainingModal.classList.contains("hidden") && variantModal.classList.contains("hidden") ? "" : "hidden";
}

function createEntrySetupSheet() {
  if (document.getElementById("entrySetupSheet")) return;
  const sheet = document.createElement("div");
  sheet.id = "entrySetupSheet";
  sheet.className = "entry-setup-sheet hidden";
  sheet.innerHTML = `
    <div class="entry-setup-card">
      <span class="entry-setup-eyebrow">START SETUP</span>
      <h2>Can you already do Standard Push-Ups?</h2>
      <p>This decides where your Push-Up Tree starts, so experienced users do not need to begin with Wall Push-Ups.</p>
      <div class="entry-setup-actions">
        <button id="entrySetupNoBtn" class="secondary-btn" type="button">No — start from the beginning</button>
        <button id="entrySetupYesBtn" class="primary-btn" type="button">Yes — do an assessment test</button>
      </div>
      <small class="entry-setup-note">You can always keep training normally afterwards.</small>
    </div>
  `;
  document.body.appendChild(sheet);

  document.getElementById("entrySetupNoBtn")?.addEventListener("click", () => {
    progress.entrySetupDone = true;
    progress.entryPath = "beginner";
    progress.entryAssessmentPending = false;
    saveProgress();
    closeEntrySetupSheet();
    render();
    showAppToast("Starter path selected");
  });

  document.getElementById("entrySetupYesBtn")?.addEventListener("click", () => {
    progress.entrySetupDone = true;
    progress.entryPath = "assessment";
    progress.entryAssessmentPending = true;
    saveProgress();
    closeEntrySetupSheet();
    startEntryAssessment();
  });
}

function openEntrySetupSheet() {
  createEntrySetupSheet();
  const sheet = document.getElementById("entrySetupSheet");
  if (!sheet) return;
  sheet.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeEntrySetupSheet() {
  const sheet = document.getElementById("entrySetupSheet");
  if (!sheet) return;
  sheet.classList.add("hidden");
  document.body.style.overflow = trainingModal.classList.contains("hidden") && variantModal.classList.contains("hidden") ? "" : "hidden";
}

function shouldAskEntrySetup() {
  const hasHistory = Array.isArray(progress.trainingHistory) && progress.trainingHistory.length > 0;
  return !progress.entrySetupDone && !hasHistory && (Number(progress.pushupTotal) || 0) === 0;
}

function startEntryAssessment() {
  entryAssessmentActive = true;
  progress.entryAssessmentPending = true;
  saveProgress();
  openTraining();
  setSelectedTrainingVariant("standard");
  showStep("quick");
  showPrepUI();
  renderStaticIcons();
  trainingTitle.textContent = "Assessment Test";
  prepCameraHint.textContent = "Do one strong set of Standard Push-Ups. The result places you higher in the tree automatically.";
  showAppToast("Assessment started: Standard Push-Ups");
}

function maybePromptEntrySetup() {
  if (shouldAskEntrySetup()) {
    window.setTimeout(openEntrySetupSheet, 120);
  }
}

// =====================================================================
// v0.11.2 — Screen-sized rank chapters with three required paths
// =====================================================================
const V012_RANKS = ["Starter", "Holz", "Stein", "Bronze", "Silber", "Gold", "Platin", "Diamant I", "Diamant II", "Diamant III", "Diamant IV"];

const V012_CHAPTERS = [
  {
    from: "Starter", to: "Holz",
    // Experienced users who already prove a Standard Push-Up skip the very
    // first beginner chapter, so the app still feels rewarding on day one.
    skipIf: { metric: "variantMax", variant: "standard", target: 1 },
    paths: [
      { key: "start-wall-1", title: "1 Wall Push-Up", accent: "#7c8cff", nodes: [ { metric: "variantMax", variant: "wall", target: 1, label: "1 Wall Push-Up" } ] },
      { key: "start-wall-3", title: "3 Wall", accent: "#7c8cff", nodes: [ { metric: "variantMax", variant: "wall", target: 3, label: "3 Wall Push-Ups" } ] },
      { key: "start-wall-total-5", title: "5 Wall Total", accent: "#f3c761", nodes: [ { metric: "variantTotal", variant: "wall", target: 5, label: "5 Wall Push-Ups Total" } ] },
      { key: "start-wall-sets-2", title: "2 Wall Sets", accent: "#62c99c", nodes: [ { metric: "variantSets", variant: "wall", target: 2, label: "2 Wall Sets" } ] },
      { key: "start-wall-5", title: "5 Wall", accent: "#7c8cff", nodes: [ { metric: "variantMax", variant: "wall", target: 5, label: "5 Wall Push-Ups" } ] }
    ],
    rows: [
      { type: "single", path: "start-wall-1" },
      { type: "triple", paths: ["start-wall-3", "start-wall-total-5", "start-wall-sets-2"] },
      { type: "single", path: "start-wall-5" }
    ]
  },
  {
    from: "Holz", to: "Stein",
    // Users who already prove a Standard Push-Up should not have to grind
    // through Wall / basic Incline tasks first.
    skipIf: { metric: "variantMax", variant: "standard", target: 1 },
    paths: [
      { key: "wood-wall-total-10", title: "10 Wall Total", accent: "#f3c761", nodes: [ { metric: "variantTotal", variant: "wall", target: 10, label: "10 Wall Push-Ups Total" } ] },
      { key: "wood-incline-3", title: "3 Incline", accent: "#9B6CFF", nodes: [ { metric: "variantMax", variant: "incline", target: 3, label: "3 Incline Push-Ups" } ] },
      { key: "wood-incline-total-5", title: "5 Incline Total", accent: "#f3c761", nodes: [ { metric: "variantTotal", variant: "incline", target: 5, label: "5 Incline Push-Ups Total" } ] },
      { key: "wood-wall-5", title: "5 Wall", accent: "#7c8cff", nodes: [ { metric: "variantMax", variant: "wall", target: 5, label: "5 Wall Push-Ups" } ] },
      { key: "wood-incline-sets-2", title: "2 Incline Sets", accent: "#62c99c", nodes: [ { metric: "variantSets", variant: "incline", target: 2, label: "2 Incline Sets" } ] },
      { key: "wood-incline-total-15", title: "15 Incline Total", accent: "#f3c761", nodes: [ { metric: "variantTotal", variant: "incline", target: 15, label: "15 Incline Push-Ups Total" } ] },
      { key: "wood-wall-8", title: "8 Wall", accent: "#7c8cff", nodes: [ { metric: "variantMax", variant: "wall", target: 8, label: "8 Wall Push-Ups" } ] },
      { key: "wood-incline-4", title: "4 Incline", accent: "#9B6CFF", nodes: [ { metric: "variantMax", variant: "incline", target: 4, label: "4 Incline Push-Ups" } ] },
      { key: "wood-standard-1", title: "1 Standard", accent: "#4f9cf8", nodes: [ { metric: "variantMax", variant: "standard", target: 1, label: "1 Standard Push-Up" } ] }
    ],
    rows: [
      { type: "single", path: "wood-wall-total-10" },
      { type: "unlock", variant: "incline", title: "Incline Push-Up", eyebrow: "UNLOCK" },
      { type: "single", path: "wood-incline-3" },
      { type: "pair", paths: ["wood-incline-total-5", "wood-wall-5"] },
      { type: "single", path: "wood-incline-sets-2" },
      { type: "triple", paths: ["wood-incline-total-15", "wood-wall-8", "wood-incline-4"] },
      { type: "unlock", variant: "standard", title: "Standard Push-Up", eyebrow: "UNLOCK" },
      { type: "single", path: "wood-standard-1" }
    ]
  },
  {
    from: "Stein", to: "Bronze",
    // A stronger standard base can fast-forward this early bridge chapter.
    skipIf: { metric: "variantMax", variant: "standard", target: 5 },
    paths: [
      { key: "stone-standard-2", title: "2 Standard", accent: "#4f9cf8", nodes: [ { metric: "variantMax", variant: "standard", target: 2, label: "2 Standard Push-Ups" } ] },
      { key: "stone-incline-total-15", title: "15 Incline Total", accent: "#f3c761", nodes: [ { metric: "variantTotal", variant: "incline", target: 15, label: "15 Incline Push-Ups Total" } ] },
      { key: "stone-incline-6", title: "6 Incline", accent: "#9B6CFF", nodes: [ { metric: "variantMax", variant: "incline", target: 6, label: "6 Incline Push-Ups" } ] },
      { key: "stone-standard-3", title: "3 Standard", accent: "#4f9cf8", nodes: [ { metric: "variantMax", variant: "standard", target: 3, label: "3 Standard Push-Ups" } ] },
      { key: "stone-mixed-2", title: "2 Variants", accent: "#62c99c", nodes: [ { metric: "workoutVariants", target: 2, label: "2 Variants in one Workout" } ] },
      { key: "stone-standard-total-10", title: "10 Standard Total", accent: "#f3c761", nodes: [ { metric: "variantTotal", variant: "standard", target: 10, label: "10 Standard Push-Ups Total" } ] },
      { key: "stone-wide-1", title: "1 Wide", accent: "#E65BC8", nodes: [ { metric: "variantMax", variant: "wide", target: 1, label: "1 Wide Push-Up" } ] },
      { key: "stone-wide-total-5", title: "5 Wide Total", accent: "#f3c761", nodes: [ { metric: "variantTotal", variant: "wide", target: 5, label: "5 Wide Push-Ups Total" } ] },
      { key: "stone-wide-sets-2", title: "2 Wide Sets", accent: "#62c99c", nodes: [ { metric: "variantSets", variant: "wide", target: 2, label: "2 Wide Sets" } ] },
      { key: "stone-standard-5", title: "5 Standard", accent: "#4f9cf8", nodes: [ { metric: "variantMax", variant: "standard", target: 5, label: "5 Standard Push-Ups" } ] },
      { key: "stone-wide-3", title: "3 Wide", accent: "#E65BC8", nodes: [ { metric: "variantMax", variant: "wide", target: 3, label: "3 Wide Push-Ups" } ] },
      { key: "stone-standard-total-25", title: "25 Standard Total", accent: "#f3c761", nodes: [ { metric: "variantTotal", variant: "standard", target: 25, label: "25 Standard Push-Ups Total" } ] }
    ],
    rows: [
      { type: "single", path: "stone-standard-2" },
      { type: "single", path: "stone-incline-total-15" },
      { type: "triple", paths: ["stone-incline-6", "stone-standard-3", "stone-mixed-2"] },
      { type: "single", path: "stone-standard-total-10" },
      { type: "landmark", variant: "wide", title: "Wide Push-Up", eyebrow: "NEXT SKILL" },
      { type: "single", path: "stone-wide-1" },
      { type: "single", path: "stone-wide-total-5" },
      { type: "single", path: "stone-wide-sets-2" },
      { type: "triple", paths: ["stone-standard-5", "stone-wide-3", "stone-standard-total-25"] }
    ],
    landmark: {
      variant: "wide",
      title: "Wide Push-Up",
      eyebrow: "NEXT SKILL",
      description: "Complete the revealed goals below to unlock Wide Push-Ups in Training."
    }
  }
];

const V012_VARIANT_UNLOCK_RANK = {
  standard: "Starter",
  wall: "Starter",
  incline: "Starter",
  wide: "Holz",
  diamond: "Stein",
  military: "Silber",
  decline: "Gold",
  pike: "Gold",
  explosive: "Platin",
  archer: "Platin",
  handstand: "Diamant II",
  pseudoPlanche: "Diamant III"
};

function getV012PathNodes(path) {
  if (Array.isArray(path.nodes) && path.nodes.length) {
    return path.nodes.map((node, index) => ({
      key: `${path.key}-${index}`,
      metric: node.metric ?? path.metric,
      variant: node.variant ?? path.variant ?? null,
      target: Number(node.target) || 0,
      label: node.label || path.title,
      title: node.title || path.title,
      lane: Number(node.lane ?? path.lane) || 2
    }));
  }
  return (path.milestones || []).map((target, index) => ({
    key: `${path.key}-${index}`,
    metric: path.metric,
    variant: path.variant ?? null,
    target: Number(target) || 0,
    label: path.key === "kraft" ? "am Stück" : path.key === "workout" ? "Workout" : path.key === "volumen" ? "gesamt" : path.title,
    title: path.title,
    lane: Number(path.lane) || 2
  }));
}

function getV012NodeValue(node) {
  return getV012MetricValue(node.metric, node.variant ?? null);
}

function getV012MetricValue(metric, variant = null) {
  switch (metric) {
    case "standardMax": return Math.max(0, Number(progress.pushupMax) || 0);
    case "workoutTotal": return Math.max(getBestWorkoutTotal(), Math.max(0, Number(progress.pushupMax) || 0));
    case "workoutSets": return Math.max(0, getBestWorkoutSetCount());
    case "workoutVariants": return Math.max(0, getBestWorkoutVariantCount());
    case "trainingDays": return Math.max(0, getTrainingDayCount());
    case "total": return Math.max(0, Number(progress.pushupTotal) || 0);
    case "variantTotal": return getVariantStats(variant).total;
    case "variantMax": return getVariantStats(variant).max;
    case "variantSets": return getVariantDynamicStats(variant).sets;
    default: return 0;
  }
}

function isV012ChapterComplete(chapter) {
  if (!chapter) return false;
  if (chapter.skipIf && getV012NodeValue(chapter.skipIf) >= (chapter.skipIf.target || 1)) return true;
  return chapter.paths.every(path => getV012PathState(path).done);
}

function getV012CurrentRankName() {
  let rank = "Starter";
  for (const chapter of V012_CHAPTERS) {
    if (chapter.from !== rank) break;
    if (!isV012ChapterComplete(chapter)) break;
    rank = chapter.to;
  }
  return rank;
}

function getV012CurrentChapter() {
  const rank = getV012CurrentRankName();
  return V012_CHAPTERS.find(chapter => chapter.from === rank) || null;
}

function getRankDisplayName(rank) {
  const map = {
    "Starter": "Starter",
    "Holz": "Wood",
    "Stein": "Stone",
    "Bronze": "Bronze",
    "Silber": "Silver",
    "Gold": "Gold",
    "Platin": "Platinum",
    "Diamant I": "Diamond I",
    "Diamant II": "Diamond II",
    "Diamant III": "Diamond III",
    "Diamant IV": "Diamond IV"
  };
  return map[rank] || rank || "-";
}

function getV114LandmarkState(chapter) {
  if (!chapter?.landmark) return null;
  const landmark = chapter.landmark;
  const beforeCount = Math.max(0, Math.min(chapter.paths.length, Number(landmark.after) || 0));
  const beforeStates = chapter.paths.slice(0, beforeCount).map(getV012PathState);
  const stats = getVariantStats(landmark.variant);
  const historicalUnlock = stats.max > 0 || stats.total > 0;
  const remainingBefore = beforeStates.filter(state => !state.done).length;
  const unlocked = historicalUnlock || remainingBefore === 0;
  return { ...landmark, unlocked, remainingBefore, historicalUnlock };
}

function getV114LandmarkChapterForVariant(variant) {
  return V012_CHAPTERS.find(chapter => chapter.landmark?.variant === variant) || null;
}

function getV114RankRemaining(rank) {
  const chapter = V012_CHAPTERS.find(item => item.to === rank);
  if (!chapter) return 0;
  if (isV012ChapterComplete(chapter)) return 0;
  return chapter.paths.map(getV012PathState).filter(state => !state.done).length;
}

function getV1150UnlockRowState(chapter, rowIndex) {
  const row = chapter?.rows?.[rowIndex];
  if (!row || !["unlock", "landmark"].includes(row.type)) return null;
  const variant = row.variant || chapter?.landmark?.variant;
  if (!variant) return null;

  const stats = getVariantStats(variant);
  const historicalUnlock = stats.max > 0 || stats.total > 0;
  const priorPathKeys = [];
  (chapter.rows || []).slice(0, rowIndex).forEach(priorRow => {
    if (priorRow.type === "single" && priorRow.path) priorPathKeys.push(priorRow.path);
    if (["pair", "triple"].includes(priorRow.type)) (priorRow.paths || []).forEach(key => priorPathKeys.push(key));
  });
  const requiredStates = priorPathKeys
    .map(key => chapter.paths.find(path => path.key === key))
    .filter(Boolean)
    .map(getV012PathState);
  const unlocked = historicalUnlock || requiredStates.every(state => state.done);
  const remainingBefore = requiredStates.filter(state => !state.done).length;
  return { variant, unlocked, historicalUnlock, remainingBefore };
}

function getV1150VariantUnlockState(variant) {
  for (const chapter of V012_CHAPTERS) {
    const rows = chapter.rows || [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const rowVariant = row.variant || (row.type === "landmark" ? chapter.landmark?.variant : null);
      if (["unlock", "landmark"].includes(row.type) && rowVariant === variant) {
        return getV1150UnlockRowState(chapter, rowIndex);
      }
    }
  }
  return null;
}

function isV012VariantAvailable(variant) {
  if (!VARIANT_META[variant]) return false;
  if (variant === "wall") return true;

  // Never take a skill away from existing testers after an update.
  const stats = getVariantStats(variant);
  if (stats.max > 0 || stats.total > 0) return true;

  const unlockState = getV1150VariantUnlockState(variant);
  if (unlockState) return Boolean(unlockState.unlocked);

  // Upper-rank variants stay locked until their chapters are designed.
  return false;
}

function getV012PathState(path) {
  const nodeDefs = getV012PathNodes(path);
  const nodes = nodeDefs.map(node => {
    const current = getV012NodeValue(node);
    return {
      ...node,
      current,
      done: current >= node.target,
      displayValue: formatTreeNumber(node.target)
    };
  });
  const doneCount = nodes.filter(node => node.done).length;
  const finalCurrent = nodes.length ? nodes[nodes.length - 1].current : 0;
  return {
    ...path,
    current: finalCurrent,
    done: nodes.length ? nodes.every(node => node.done) : false,
    percent: nodes.length ? (doneCount / nodes.length) * 100 : 0,
    nodes
  };
}

function getV012VariantState(node) {
  const current = getV012MetricValue("variantTotal", node.variant);
  return { ...node, current, done: current >= node.target };
}

function formatTreeNumber(value) {
  return new Intl.NumberFormat("de-DE").format(Math.max(0, Number(value) || 0));
}

function getV012RankIcon(rank, className = "") {
  if (rank === "Starter") {
    return `<span class="v112-start-symbol ${className}">${getVariantIconSvg("standard")}</span>`;
  }
  return getRankIconSvg(rank, className);
}

function getV114NodeAccent(node, fallback = "#4f9cf8") {
  if (node.variant && VARIANT_META[node.variant]?.color) return VARIANT_META[node.variant].color;
  if (node.metric === "total") return "#F3C761";
  if (node.metric === "standardMax") return VARIANT_META.standard.color;
  return fallback;
}

function getV114NodeSymbol(node) {
  if (node.metric === "total") return getMetricIconSvg("total", "v114-node-image");
  if (node.metric === "standardMax" && !node.variant) return getVariantIconSvg("standard", "v114-node-image");
  if (node.variant) return getVariantIconSvg(node.variant, "v114-node-image");
  return getVariantIconSvg("standard", "v114-node-image");
}

function getV114NodeProgress(node) {
  const target = Math.max(1, Number(node.target) || 1);
  const raw = Math.max(0, Number(node.current ?? getV012NodeValue(node)) || 0);
  const current = Math.min(raw, target);
  const percent = Math.max(0, Math.min(100, current / target * 100));
  return { current, target, percent };
}

function renderV012Path(pathState, pathIndex) {
  const current = pathState.current;
  return pathState.nodes.map((node, nodeIndex) => {
    const row = 4 - nodeIndex;
    const active = !node.done && nodeIndex === pathState.nodes.findIndex(item => !item.done);
    const classes = ["v112-skill-node", node.done ? "done" : "", active ? "active" : ""].filter(Boolean).join(" ");
    const label = pathState.key === "kraft" ? "am Stück" : pathState.key === "workout" ? "Workout" : "gesamt";
    return `
      <button class="${classes}" type="button" data-tree-node="main" data-path="${pathState.key}" data-target="${node.target}" style="--node-accent:${pathState.accent}; --grid-column:${pathIndex + 1}; --grid-row:${row};">
        <span class="v112-node-mark">${node.done ? "✓" : formatTreeNumber(node.target)}</span>
        <span class="v112-node-mini">${label}</span>
      </button>
    `;
  }).join("");
}

function renderV012VariantBranch(chapter) {
  const states = (chapter.variants || []).map(getV012VariantState);
  if (!states.length) return "";
  return `
    <section class="v112-variant-branch" aria-label="Optionale Varianten">
      <div class="v112-variant-heading">
        <strong>VARIANTEN</strong>
        <small>optional</small>
      </div>
      <div class="v112-variant-chain">
        ${states.map((state) => {
          const meta = VARIANT_META[state.variant] || { label: state.variant };
          return `
            <button class="v112-variant-node ${state.done ? "done" : ""} ${state.newUnlock ? "new" : ""}" type="button" data-tree-node="variant" data-variant="${state.variant}" data-target="${state.target}" aria-label="${state.label}">
              ${state.newUnlock ? '<span class="v112-variant-new">NEU</span>' : ''}
              <span class="v112-variant-icon">${getVariantIconSvg(state.variant)}</span>
              <span class="v112-variant-target">${state.done ? "✓" : state.target}</span>
              <small>${meta.shortLabel || meta.label}</small>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderV012CompletedTree() {
  skillTree.innerHTML = `
    <div class="v112-complete-state">
      <div class="v112-complete-rank">${getRankIconSvg("Diamant")}</div>
      <p class="eyebrow">SKILL TREE</p>
      <h2>Diamant erreicht</h2>
      <p>Alle aktuell eingebauten Rangabschnitte sind abgeschlossen. Weitere Mastery-Ränge können später darauf aufbauen.</p>
    </div>
  `;
}

function bindV012TreeNodeEvents(chapter) {
  skillTree.querySelectorAll('[data-tree-node="main"]').forEach(button => {
    button.addEventListener("click", () => {
      const path = chapter.paths.find(item => item.key === button.dataset.path);
      if (!path) return;
      const target = Number(button.dataset.target) || 0;
      const current = getV012MetricValue(path.metric);
      const text = path.key === "kraft" ? "Push-ups am Stück" : path.key === "workout" ? "Push-ups in einem Workout" : "Push-ups insgesamt";
      alert(`${path.title}\n${formatTreeNumber(target)} ${text}\nAktuell: ${formatTreeNumber(current)}${current >= target ? "\n\n✓ Abgeschlossen" : `\nNoch ${formatTreeNumber(target - current)}`}`);
    });
  });

  skillTree.querySelectorAll('[data-tree-node="variant"]').forEach(button => {
    button.addEventListener("click", () => {
      const variant = button.dataset.variant;
      const target = Number(button.dataset.target) || 0;
      const meta = VARIANT_META[variant] || { label: variant };
      const current = getVariantStats(variant).total;
      alert(`${meta.label} Push-ups · Optional\nZiel: ${formatTreeNumber(target)} gesamt\nAktuell: ${formatTreeNumber(current)}\n\nDieser Zweig ist Bonus-Fortschritt und blockiert deinen Rang nicht.`);
    });
  });
}


function getV114VisibleChapters() {
  // Always render the full skill tree so players can scroll through the whole
  // long-term path at any time.
  return V012_CHAPTERS.slice();
}

function getV114ChapterMode(globalChapterIndex, activeIndex) {
  if (globalChapterIndex < activeIndex) return "complete";
  if (globalChapterIndex === activeIndex) return "current";
  // Future chapters stay fully visible, but locked until earlier ranks are
  // completed. This keeps the entire tree readable without hiding later goals.
  return "locked-preview";
}

function renderV114Path(pathState, pathIndex, chapterIndex, chapterMode, gridColumn) {
  const firstOpenIndex = pathState.nodes.findIndex(item => !item.done);
  const rowMap = pathState.nodes.length <= 1
    ? [3]
    : pathState.nodes.length === 2
      ? [4, 2]
      : [5, 3, 1];

  return pathState.nodes.map((node, nodeIndex) => {
    const isCurrentSection = chapterMode === "current";
    const active = isCurrentSection && !node.done && nodeIndex === firstOpenIndex;
    const forcedLocked = chapterMode === "locked-preview";
    const mystery = chapterMode === "mystery-preview";
    const done = chapterMode === "complete" || (!forcedLocked && !mystery && node.done);
    const classes = [
      "v114-skill-node",
      done ? "done" : "",
      active ? "active" : "",
      forcedLocked ? "preview-locked" : "",
      mystery ? "mystery" : ""
    ].filter(Boolean).join(" ");
    const label = node.label || pathState.title || "Ziel";
    const row = rowMap[nodeIndex] || 5;

    if (mystery) {
      return `
        <button class="${classes}" type="button" data-tree-node="mystery" aria-label="Geheimes Ziel" style="--node-accent:${pathState.accent}; --grid-column:${gridColumn}; --grid-row:${row};">
          <span class="v114-mystery-mark">?</span>
        </button>
      `;
    }

    return `
      <button class="${classes}" type="button" data-tree-node="main" data-chapter-index="${chapterIndex}" data-path="${pathState.key}" data-node-index="${nodeIndex}" data-target="${node.target}" data-preview-locked="${forcedLocked ? "true" : "false"}" style="--node-accent:${pathState.accent}; --grid-column:${gridColumn}; --grid-row:${row};">
        <span class="v114-node-mark">${done ? "✓" : formatTreeNumber(node.target)}</span>
        <span class="v114-node-mini">${label}</span>
        ${forcedLocked ? '<span class="v114-node-lock" aria-hidden="true">🔒</span>' : ''}
      </button>
    `;
  }).join("");
}

function renderV114VariantBranch(chapter, chapterIndex, chapterMode) {
  const states = (chapter.variants || []).map(getV012VariantState);
  if (!states.length) return "";
  const locked = chapterMode === "locked-preview";
  const mystery = chapterMode === "mystery-preview";
  return `
    <aside class="v114-variant-branch ${locked ? "preview-locked" : ""} ${mystery ? "mystery" : ""}" aria-label="Optionale Varianten">
      <div class="v114-variant-heading"><strong>Varianten</strong></div>
      <div class="v114-variant-chain">
        ${states.map((state) => {
          const meta = VARIANT_META[state.variant] || { label: state.variant };
          return `
            <button class="v114-variant-node ${state.done && !locked && !mystery ? "done" : ""} ${state.newUnlock ? "new" : ""}" type="button" data-tree-node="variant" data-chapter-index="${chapterIndex}" data-variant="${state.variant}" data-target="${state.target}" aria-label="${mystery ? "Geheime Variante" : state.label}">
              ${state.newUnlock && !locked && !mystery ? '<span class="v114-variant-new">NEU</span>' : ''}
              <span class="v114-variant-icon">${mystery ? "?" : getVariantIconSvg(state.variant)}</span>
              <span class="v114-variant-target">${mystery ? "?" : (state.done && !locked ? "✓" : formatTreeNumber(state.target))}</span>
              <small>${mystery ? "Geheim" : (meta.shortLabel || meta.label)}</small>
            </button>
          `;
        }).join("")}
      </div>
    </aside>
  `;
}

function renderV114RankAnchor(rank, options = {}) {
  const { locked = false, top = false, bottom = false, remaining = null } = options;
  const label = rank === "Starter" ? "Start" : getRankDisplayName(rank);
  const rankRemaining = remaining === null ? getV114RankRemaining(rank) : remaining;
  const goalLabel = rank === "Starter"
    ? ""
    : locked && rankRemaining > 0
      ? `${rankRemaining} NODE${rankRemaining === 1 ? "" : "S"} TO ${label.toUpperCase()}`
      : "RANK COMPLETE";
  const classes = ["v114-rank-anchor", top ? "top" : "", bottom ? "bottom" : "", locked ? "locked" : ""].filter(Boolean).join(" ");
  return `
    <div class="${classes}">
      <span class="v114-rank-icon">${getV012RankIcon(rank)}</span>
      <span class="v114-rank-label">${label}</span>
      <span class="v114-rank-unlock ${goalLabel ? "" : "is-placeholder"}" ${goalLabel ? "" : 'aria-hidden="true"'}>${goalLabel || "&nbsp;"}</span>
    </div>
  `;
}

function renderV114Landmark(landmarkState, gridRow) {
  if (!landmarkState) return "";
  const meta = VARIANT_META[landmarkState.variant] || { label: landmarkState.title, color: "#8B6CFF" };
  const classes = ["v114-landmark", landmarkState.unlocked ? "unlocked" : "locked"].join(" ");
  const status = landmarkState.unlocked
    ? "UNLOCKED"
    : `${landmarkState.remainingBefore} NODE${landmarkState.remainingBefore === 1 ? "" : "S"}`;
  return `
    <button class="${classes}" type="button" data-tree-node="landmark" data-variant="${landmarkState.variant}" style="--landmark-color:${meta.color}; --grid-column:2; --grid-row:${gridRow};" aria-label="${meta.label} Push-Up: ${status}">
      <span class="v114-landmark-eyebrow">${landmarkState.eyebrow || "NEXT SKILL"}</span>
      <span class="v114-landmark-icon">${getVariantIconSvg(landmarkState.variant, "v114-landmark-image")}</span>
      <span class="v114-landmark-name">${meta.label.toUpperCase()}</span>
      <span class="v114-landmark-status">${landmarkState.unlocked ? "✓ UNLOCKED" : `🔒 ${status}`}</span>
    </button>
  `;
}

function renderV114StaticUnlock(variant, title, gridRow, eyebrow = "UNLOCK") {
  const meta = VARIANT_META[variant] || { label: title || variant, color: "#8B6CFF" };
  return `
    <div class="v114-landmark v114-static-unlock unlocked" style="--landmark-color:${meta.color}; --grid-column:2; --grid-row:${gridRow};" aria-label="${title || meta.label} unlocked">
      <span class="v114-landmark-eyebrow">${eyebrow}</span>
      <span class="v114-landmark-icon">${getVariantIconSvg(variant, "v114-landmark-image")}</span>
      <span class="v114-landmark-name">${(title || meta.label).toUpperCase()}</span>
      <span class="v114-landmark-status">✓ READY</span>
    </div>
  `;
}

function getV114DisplayRows(chapter) {
  if (Array.isArray(chapter?.rows) && chapter.rows.length) return chapter.rows;
  return (chapter?.paths || []).map(path => ({ type: "single", path: path.key }));
}

function getV114RowPathStates(chapter) {
  const lookup = new Map();
  (chapter?.paths || []).forEach(path => lookup.set(path.key, getV012PathState(path)));
  return lookup;
}

function getV114RowIncompleteIndex(rows, pathStates) {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.type === "single") {
      if (!pathStates.get(row.path)?.done) return index;
    } else if (row.type === "pair") {
      const leftDone = pathStates.get(row.paths?.[0])?.done;
      const rightDone = pathStates.get(row.paths?.[1])?.done;
      if (!leftDone || !rightDone) return index;
    }
  }
  return -1;
}

function renderV114ProgressNode(pathState, options = {}) {
  if (!pathState) return "";
  const { chapterIndex = 0, chapterMode = "current", gridColumn = 2, gridRow = 1, mystery = false, active = false } = options;
  const node = pathState.nodes?.[0];
  if (!node) return "";
  const accent = getV114NodeAccent(node, pathState.accent);
  if (mystery) {
    return `
      <button class="v114-skill-node mystery" type="button" data-tree-node="mystery" aria-label="Hidden skill" style="--node-accent:${accent}; --grid-column:${gridColumn}; --grid-row:${gridRow};">
        <span class="v114-node-hex v114-mystery-hex" aria-hidden="true"><span class="v114-mystery-mark">?</span></span>
      </button>
    `;
  }

  const progressState = getV114NodeProgress(node);
  const previewLocked = chapterMode === "locked-preview";
  const done = chapterMode === "complete" || (!previewLocked && pathState.done);
  const classes = ["v114-skill-node", done ? "done" : "", active && !done ? "active" : "", previewLocked ? "preview-locked" : ""].filter(Boolean).join(" ");

  return `
    <button class="${classes}" type="button" data-tree-node="main" data-chapter-index="${chapterIndex}" data-path="${pathState.key}" data-node-index="0" data-target="${node.target}" aria-label="${node.label || pathState.title}: ${formatTreeNumber(progressState.current)} of ${formatTreeNumber(progressState.target)}" style="--node-accent:${accent}; --grid-column:${gridColumn}; --grid-row:${gridRow}; --node-progress:${progressState.percent}%;">
      <span class="v114-node-hex" aria-hidden="true">
        <span class="v114-node-hex-inner">
          <span class="v114-node-symbol">${getV114NodeSymbol(node)}</span>
          ${done ? '<span class="v114-node-check" aria-hidden="true">✓</span>' : ''}
        </span>
      </span>
      <span class="v114-node-progress" aria-hidden="true">
        <span class="v114-node-progress-fill"></span>
        <span class="v114-node-progress-text">${formatTreeNumber(progressState.current)}/${formatTreeNumber(progressState.target)}</span>
      </span>
    </button>
  `;
}

function renderV114Stage(chapter, chapterIndex, chapterMode) {
  const rows = getV114DisplayRows(chapter);
  const pathStates = getV114RowPathStates(chapter);
  const firstIncompleteRowIndex = getV114RowIncompleteIndex(rows, pathStates);
  const displayRowCount = Math.max(1, rows.length);
  const sectionClasses = ["v114-stage-section", chapterMode, `rows-${displayRowCount}`, "no-variants", "v114-discovery-stage", "v114-symmetric-stage"].join(" ");

  const rowYs = rows.map((_, index) => displayRowCount === 1 ? 50 : +(86 - (index * (72 / (displayRowCount - 1)))).toFixed(2));
  const lineSegments = [];
  const points = rowYs.map(y => ({ x: 50, y }));

  if (points.length) {
    lineSegments.push(`<path class="row-link" d="M50 97 L50 ${points[0].y}" />`);
    for (let index = 0; index < points.length - 1; index += 1) {
      lineSegments.push(`<path class="row-link" d="M50 ${points[index].y} L50 ${points[index + 1].y}" />`);
    }
    lineSegments.push(`<path class="row-link" d="M50 ${points[points.length - 1].y} L50 3" />`);
  }

  const gridMarkup = rows.map((row, index) => {
    const gridRow = displayRowCount - index;
    const rowIsFuture = chapterMode === "current" && firstIncompleteRowIndex >= 0 && index > firstIncompleteRowIndex;

    if (row.type === "landmark") {
      const landmarkState = getV114LandmarkState(chapter);
      return landmarkState ? renderV114Landmark(landmarkState, gridRow) : "";
    }

    if (row.type === "unlock") {
      return renderV114StaticUnlock(row.variant, row.title, gridRow, row.eyebrow || "UNLOCK");
    }

    if (row.type === "single") {
      const state = pathStates.get(row.path);
      return renderV114ProgressNode(state, {
        chapterIndex,
        chapterMode,
        gridColumn: 2,
        gridRow,
        mystery: rowIsFuture,
        active: chapterMode === "current" && index === firstIncompleteRowIndex && !(state?.done)
      });
    }

    if (row.type === "pair") {
      const leftState = pathStates.get(row.paths?.[0]);
      const rightState = pathStates.get(row.paths?.[1]);
      lineSegments.push(`<path class="row-link row-branch" d="M50 ${rowYs[index]} L18 ${rowYs[index]}" />`);
      lineSegments.push(`<path class="row-link row-branch" d="M50 ${rowYs[index]} L82 ${rowYs[index]}" />`);
      return `
        ${renderV114ProgressNode(leftState, {
          chapterIndex,
          chapterMode,
          gridColumn: 1,
          gridRow,
          mystery: rowIsFuture,
          active: chapterMode === "current" && index === firstIncompleteRowIndex && !(leftState?.done)
        })}
        ${renderV114ProgressNode(rightState, {
          chapterIndex,
          chapterMode,
          gridColumn: 3,
          gridRow,
          mystery: rowIsFuture,
          active: chapterMode === "current" && index === firstIncompleteRowIndex && !(rightState?.done)
        })}
      `;
    }

    return "";
  }).join("");

  const minHeight = Math.max(880, 520 + displayRowCount * 170);
  return `
    <section class="${sectionClasses}" data-tree-current="${chapterMode === "current" ? "true" : "false"}" data-rank-from="${chapter.from}" style="--discovery-stage-height:${minHeight}px;">
      <div class="v114-tree-stage">
        <svg class="v114-tree-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${lineSegments.join("")}
        </svg>
        <div class="v114-main-grid v114-symmetric-grid" style="--stage-rows:${displayRowCount};">
          ${gridMarkup}
        </div>
        ${renderV114RankAnchor(chapter.from, { bottom: true, locked: false })}
      </div>
    </section>
  `;
}

function getV114NodeRequirementText(node) {
  const meta = node.variant ? (VARIANT_META[node.variant] || { label: node.variant }) : null;
  if (node.metric === "variantMax") return `${formatTreeNumber(node.target)} ${meta?.label || "Push-Up"} Push-Ups in one set`;
  if (node.metric === "variantTotal") return `${formatTreeNumber(node.target)} ${meta?.label || "Push-Up"} Push-Ups total`;
  if (node.metric === "variantSets") return `${formatTreeNumber(node.target)} ${meta?.label || "Push-Up"} sets total`;
  if (node.metric === "workoutTotal") return `${formatTreeNumber(node.target)} Push-Ups in one workout`;
  if (node.metric === "workoutSets") return `${formatTreeNumber(node.target)} sets in one workout`;
  if (node.metric === "workoutVariants") return `${formatTreeNumber(node.target)} different variants in one workout`;
  return `${formatTreeNumber(node.target)} ${node.label || "reps"}`;
}

function bindV114TreeNodeEvents() {
  skillTree.querySelectorAll('[data-tree-node="main"]').forEach(button => {
    button.addEventListener("click", () => {
      const chapter = V012_CHAPTERS[Number(button.dataset.chapterIndex) || 0];
      const path = chapter?.paths.find(item => item.key === button.dataset.path);
      if (!path) return;
      const node = getV012PathState(path).nodes[Number(button.dataset.nodeIndex) || 0];
      if (!node) return;
      const current = getV012NodeValue(node);
      const done = current >= node.target;
      alert(`${node.label || path.title}
${getV114NodeRequirementText(node)}

Progress: ${formatTreeNumber(Math.min(current, node.target))}/${formatTreeNumber(node.target)}
${done ? "✓ Completed" : `Still needed: ${formatTreeNumber(node.target - current)}`}`);
    });
  });

  skillTree.querySelectorAll('[data-tree-node="landmark"]').forEach(button => {
    button.addEventListener("click", () => {
      const variant = button.dataset.variant;
      const chapter = getV114LandmarkChapterForVariant(variant);
      const state = getV114LandmarkState(chapter);
      const meta = VARIANT_META[variant] || { label: variant };
      if (!state) return;
      alert(`${meta.label} Push-Up
${state.unlocked ? "✓ Skill unlocked" : `🔒 ${state.remainingBefore} hidden node${state.remainingBefore === 1 ? "" : "s"} remaining`}

${chapter.landmark.description || "Complete the path to unlock this skill in Training."}`);
    });
  });
}


function getV1150RowPathStates(chapter, row) {
  if (!row) return [];
  const keys = row.type === "single" ? [row.path] : (["pair", "triple"].includes(row.type) ? (row.paths || []) : []);
  return keys.map(key => chapter.paths.find(path => path.key === key)).filter(Boolean).map(getV012PathState);
}

function isV1150TaskRowDone(chapter, row) {
  const states = getV1150RowPathStates(chapter, row);
  return states.length ? states.every(state => state.done) : true;
}

function getV1150FirstIncompleteTaskRow(chapter) {
  const rows = chapter.rows || [];
  for (let i = 0; i < rows.length; i += 1) {
    if (["single", "pair", "triple"].includes(rows[i].type) && !isV1150TaskRowDone(chapter, rows[i])) return i;
  }
  return -1;
}

function renderV1150RankBadge(rank, compact = false, locked = false, remaining = 0) {
  const label = rank === "Starter" ? "Start" : getRankDisplayName(rank);
  return `
    <div class="bp50-rank ${compact ? "compact" : "large"} ${locked ? "locked" : ""}">
      <div class="bp50-rank-icon">${getV012RankIcon(rank)}</div>
      <div class="bp50-rank-copy">
        ${compact ? '<span class="bp50-eyebrow">NEXT RANK</span>' : ''}
        <strong>${label}</strong>
        ${compact && locked ? `<small>${remaining} node${remaining === 1 ? "" : "s"} to ${label}</small>` : (!compact ? '<small>RANK</small>' : '<small>READY</small>')}
      </div>
    </div>
  `;
}

function renderV1150TaskNode(chapter, chapterIndex, pathState, options = {}) {
  const { mystery = false, active = false, forceDone = false } = options;
  const node = pathState?.nodes?.[0];
  if (!node) return "";
  if (mystery) {
    return `
      <button class="bp50-node mystery" type="button" data-tree-node="mystery" aria-label="Hidden goal">
        <span class="bp50-node-core"><span class="bp50-question">?</span></span>
      </button>
    `;
  }

  const progressState = getV114NodeProgress(node);
  const done = progressState.current >= progressState.target;
  const accent = getV114NodeAccent(node, pathState.accent);
  return `
    <button class="bp50-node ${done ? "done" : ""} ${active && !done ? "active" : ""}" type="button"
      data-tree-node="main" data-chapter-index="${chapterIndex}" data-path="${pathState.key}" data-node-index="0"
      style="--bp50-accent:${accent}; --bp50-progress:${progressState.percent}%"
      aria-label="${node.label || pathState.title}: ${formatTreeNumber(progressState.current)} of ${formatTreeNumber(progressState.target)}">
      <span class="bp50-node-core">
        <span class="bp50-node-icon">${getV114NodeSymbol(node)}</span>
        ${done ? '<span class="bp50-check">✓</span>' : ''}
      </span>
      <span class="bp50-progress"><span class="bp50-progress-fill"></span><b>${formatTreeNumber(progressState.current)}/${formatTreeNumber(progressState.target)}</b></span>
    </button>
  `;
}

function renderV1150UnlockCard(chapter, rowIndex, chapterMode) {
  const row = chapter.rows[rowIndex];
  const variant = row.variant || (row.type === "landmark" ? chapter.landmark?.variant : null);
  if (!variant) return "";
  const meta = VARIANT_META[variant] || { label: variant, color: "#8b6cff" };
  const state = getV1150UnlockRowState(chapter, rowIndex) || { unlocked: false, remainingBefore: 0 };
  const historical = getVariantStats(variant).max > 0 || getVariantStats(variant).total > 0;
  const unlocked = chapterMode === "complete" || historical || state.unlocked;
  const title = row.title || chapter.landmark?.title || meta.label;
  const eyebrow = row.eyebrow || chapter.landmark?.eyebrow || "NEXT SKILL";
  return `
    <button class="bp50-unlock ${unlocked ? "unlocked" : "locked"}" type="button" data-tree-node="unlock" data-variant="${variant}" data-chapter-index="${V012_CHAPTERS.indexOf(chapter)}" data-row-index="${rowIndex}" style="--bp50-accent:${meta.color}">
      <span class="bp50-eyebrow">${eyebrow}</span>
      <span class="bp50-unlock-icon">${getVariantIconSvg(variant, "bp50-unlock-image")}</span>
      <strong>${String(title).toUpperCase()}</strong>
      <small>${unlocked ? "✓ UNLOCKED" : `🔒 ${state.remainingBefore} step${state.remainingBefore === 1 ? "" : "s"} left`}</small>
    </button>
  `;
}

function renderV1150RowLines(type) {
  if (type === "pair") {
    return `
      <svg class="bp50-row-lines pair" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="50" y1="0" x2="50" y2="18"></line>
        <line x1="50" y1="18" x2="23" y2="42"></line>
        <line x1="50" y1="18" x2="77" y2="42"></line>
        <line x1="23" y1="58" x2="50" y2="82"></line>
        <line x1="77" y1="58" x2="50" y2="82"></line>
        <line x1="50" y1="82" x2="50" y2="100"></line>
      </svg>
    `;
  }
  if (type === "triple") {
    return `
      <svg class="bp50-row-lines triple" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="50" y1="0" x2="50" y2="16"></line>
        <line x1="50" y1="16" x2="18" y2="40"></line>
        <line x1="50" y1="16" x2="50" y2="40"></line>
        <line x1="50" y1="16" x2="82" y2="40"></line>
        <line x1="18" y1="60" x2="50" y2="84"></line>
        <line x1="50" y1="60" x2="50" y2="84"></line>
        <line x1="82" y1="60" x2="50" y2="84"></line>
        <line x1="50" y1="84" x2="50" y2="100"></line>
      </svg>
    `;
  }
  return "";
}

function renderV1150Row(chapter, chapterIndex, row, rowIndex, chapterMode, firstIncomplete) {
  if (["unlock", "landmark"].includes(row.type)) {
    return `<div class="bp50-row reward">${renderV1150UnlockCard(chapter, rowIndex, chapterMode)}</div>`;
  }

  const states = getV1150RowPathStates(chapter, row);
  const isFutureChapter = chapterMode === "locked-preview";
  const rowIsFuture = chapterMode === "current" && firstIncomplete >= 0 && rowIndex > firstIncomplete;
  const forceDone = chapterMode === "complete";
  const mystery = isFutureChapter || rowIsFuture;
  const active = chapterMode === "current" && rowIndex === firstIncomplete;

  if (row.type === "pair") {
    return `
      <div class="bp50-row pair">
        ${renderV1150RowLines("pair")}
        <div class="bp50-cell left">${renderV1150TaskNode(chapter, chapterIndex, states[0], { mystery, active, forceDone })}</div>
        <div class="bp50-cell right">${renderV1150TaskNode(chapter, chapterIndex, states[1], { mystery, active, forceDone })}</div>
      </div>
    `;
  }

  if (row.type === "triple") {
    return `
      <div class="bp50-row triple">
        ${renderV1150RowLines("triple")}
        <div class="bp50-cell left">${renderV1150TaskNode(chapter, chapterIndex, states[0], { mystery, active, forceDone })}</div>
        <div class="bp50-cell center">${renderV1150TaskNode(chapter, chapterIndex, states[1], { mystery, active, forceDone })}</div>
        <div class="bp50-cell right">${renderV1150TaskNode(chapter, chapterIndex, states[2], { mystery, active, forceDone })}</div>
      </div>
    `;
  }

  return `<div class="bp50-row single"><div class="bp50-cell center">${renderV1150TaskNode(chapter, chapterIndex, states[0], { mystery, active, forceDone })}</div></div>`;
}

function renderV1150Chapter(chapter, chapterIndex, chapterMode) {
  const rows = chapter.rows || [];
  const firstIncomplete = getV1150FirstIncompleteTaskRow(chapter);
  const nextRemaining = getV114RankRemaining(chapter.to);
  // rows are defined from current rank upward. Reverse only for visual DOM flow.
  const visualRows = rows.map((row, originalIndex) => ({ row, originalIndex })).reverse();
  return `
    <section class="bp50-module ${chapterMode}" data-tree-current="${chapterMode === "current" ? "true" : "false"}" data-rank-from="${chapter.from}">
      <div class="bp50-rows">
        ${visualRows.map(({row, originalIndex}) => renderV1150Row(chapter, chapterIndex, row, originalIndex, chapterMode, firstIncomplete)).join("")}
      </div>
      <div class="bp50-current-rank">${renderV1150RankBadge(chapter.from, false, false, 0)}</div>
    </section>
  `;
}

function renderV1150FutureTeaser() {
  const meta = VARIANT_META.diamond || { label: "Diamond", color: "#e75ba8" };
  return `
    <section class="bp50-teaser" aria-label="Future progression preview">
      <div class="bp50-teaser-rank">${renderV1150RankBadge("Silber", true, true, 0)}</div>
      <div class="bp50-teaser-mystery"><span>?</span><span>?</span></div>
      <div class="bp50-unlock locked teaser" style="--bp50-accent:${meta.color}">
        <span class="bp50-eyebrow">NEXT SKILL</span>
        <span class="bp50-unlock-icon">${getVariantIconSvg("diamond", "bp50-unlock-image")}</span>
        <strong>DIAMOND PUSH-UP</strong>
        <small>🔒 COMING AFTER BRONZE</small>
      </div>
    </section>
  `;
}

function bindV1150TreeEvents() {
  skillTree.querySelectorAll('[data-tree-node="main"]').forEach(button => {
    button.addEventListener("click", () => {
      const chapter = V012_CHAPTERS[Number(button.dataset.chapterIndex) || 0];
      const path = chapter?.paths.find(item => item.key === button.dataset.path);
      if (!path) return;
      const node = getV012PathState(path).nodes[0];
      if (!node) return;
      const current = getV012NodeValue(node);
      const done = current >= node.target;
      alert(`${node.label || path.title}\n${getV114NodeRequirementText(node)}\n\nProgress: ${formatTreeNumber(Math.min(current, node.target))}/${formatTreeNumber(node.target)}\n${done ? "✓ Completed" : `Still needed: ${formatTreeNumber(node.target - current)}`}`);
    });
  });

  skillTree.querySelectorAll('[data-tree-node="unlock"]').forEach(button => {
    button.addEventListener("click", () => {
      const variant = button.dataset.variant;
      const chapter = V012_CHAPTERS[Number(button.dataset.chapterIndex) || 0];
      const rowIndex = Number(button.dataset.rowIndex) || 0;
      const state = getV1150UnlockRowState(chapter, rowIndex);
      const meta = VARIANT_META[variant] || { label: variant };
      alert(`${meta.label} Push-Up\n${state?.unlocked ? "✓ Skill unlocked" : `🔒 ${state?.remainingBefore || 0} step${state?.remainingBefore === 1 ? "" : "s"} remaining`}\n\nComplete the goals below this reward to unlock it in Training.`);
    });
  });
}

function renderTree() {
  if (!skillTree) return;
  const currentRank = getV012CurrentRankName();
  const currentIndex = V012_CHAPTERS.findIndex(chapter => chapter.from === currentRank);
  const treeComplete = currentIndex === -1 && currentRank === V012_CHAPTERS[V012_CHAPTERS.length - 1]?.to;
  const activeIndex = treeComplete ? V012_CHAPTERS.length : Math.max(0, currentIndex);

  skillTree.className = "skill-tree-v1150";
  skillTree.innerHTML = `
    <div class="bp50-tree">
      ${renderV1150FutureTeaser()}
      ${[...V012_CHAPTERS].reverse().map(chapter => {
        const chapterIndex = V012_CHAPTERS.indexOf(chapter);
        const chapterMode = getV114ChapterMode(chapterIndex, activeIndex);
        return renderV1150Chapter(chapter, chapterIndex, chapterMode);
      }).join("")}
    </div>
  `;

  bindV1150TreeEvents();
}

function syncTreeCanvasHeight() {
  if (!skillTree) return;
  skillTree.style.height = "auto";
}


function getHomePathProgressState(path) {
  const pathState = getV012PathState(path);
  const nextNode = pathState.nodes.find(node => !node.done) || pathState.nodes[pathState.nodes.length - 1];
  if (!nextNode) {
    return {
      title: path.title,
      current: 0,
      target: 0,
      percent: 0,
      done: false,
      accent: path.accent || "#7f95b2"
    };
  }

  const current = Math.min(nextNode.current, nextNode.target);
  const target = nextNode.target;
  return {
    title: path.title,
    current,
    target,
    percent: target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 100,
    done: current >= target,
    accent: path.accent || "#7f95b2"
  };
}

function renderHomeRankPaths(chapter) {
  if (!homeRankPaths) return;
  if (!chapter || !Array.isArray(chapter.paths) || !chapter.paths.length) {
    homeRankPaths.innerHTML = `
      <div class="home-rank-paths-done">
        <strong>Bronze mastered</strong>
        <small>The next ranks will be added after the opening progression is perfected.</small>
      </div>
    `;
    return;
  }

  const states = chapter.paths.map(getV012PathState);
  const currentIndex = states.findIndex(state => !state.done);
  const currentState = currentIndex >= 0 ? states[currentIndex] : null;
  const currentPath = currentIndex >= 0 ? chapter.paths[currentIndex] : null;
  if (!currentState || !currentPath) {
    homeRankPaths.innerHTML = `<div class="home-rank-paths-done"><strong>${getRankDisplayName(chapter.to)} unlocked</strong><small>Open the Skill Tree to continue.</small></div>`;
    return;
  }

  const state = getHomePathProgressState(currentPath);
  homeRankPaths.innerHTML = `
    <div class="home-rank-path-row" style="--path-accent:${state.accent};">
      <div class="home-rank-path-head">
        <strong>${currentPath.title}</strong>
        <span>${formatTreeNumber(state.current)} / ${formatTreeNumber(state.target)}</span>
      </div>
      <div class="home-rank-path-track"><span style="width:${state.percent}%"></span></div>
    </div>
  `;
}

function buildProgressOrb(label, current, target, type = "side") {
  const safeTarget = Math.max(1, Number(target) || 1);
  const safeCurrent = Math.max(0, Number(current) || 0);
  const percent = Math.max(0, Math.min(100, (Math.min(safeCurrent, safeTarget) / safeTarget) * 100));
  const isRecord = type === "record";
  if (isRecord) {
    return `
      <div class="orb-ring orb-ring-record" style="--progress:100%; --orb-color:#7fbaff;">
        <div class="orb-content orb-content-record">
          <strong>${formatTreeNumber(safeCurrent)}</strong>
        </div>
      </div>
      <span class="home-progress-caption home-progress-caption-record">Best Set</span>
    `;
  }
  return `
    <div class="orb-ring" style="--progress:${percent}%; --orb-color:${type === "daily" ? "#61d98c" : "#63a9ff"};">
      <div class="orb-content orb-content-side">
        <strong>${formatTreeNumber(safeCurrent)}</strong>
        <span class="orb-corner-target">/${formatTreeNumber(safeTarget)}</span>
      </div>
    </div>
    <span class="home-progress-caption">${type === "daily" ? "Today" : "This Week"}</span>
  `;
}

function renderHomeProgressOrbs(todayTotal, weekTotal) {
  const dailyEl = document.getElementById("homeDailyCircle");
  const recordEl = document.getElementById("homeRecordCircle");
  const weeklyEl = document.getElementById("homeWeeklyCircle");
  if (dailyEl) {
    dailyEl.innerHTML = buildProgressOrb("Daily Push Ups", todayTotal, Math.max(progress.pushupBestDay || 0, todayTotal, 1), "daily");
  }
  if (recordEl) {
    recordEl.innerHTML = buildProgressOrb("Rekord", progress.pushupMax, progress.pushupMax || 1, "record");
  }
  if (weeklyEl) {
    weeklyEl.innerHTML = buildProgressOrb("Weekly Push Ups", weekTotal, Math.max(progress.pushupBestWeek || 0, weekTotal, 1), "weekly");
  }
}

function renderHomeDashboard(todayTotal, weekTotal, rankName) {
  if (!homeRankIcon) return;
  const chapter = getV012CurrentChapter();
  const displayRank = getV012CurrentRankName();
  const nextRank = chapter?.to || "Max";

  if (homeHeroGreeting) homeHeroGreeting.textContent = "GOOD EVENING,";
  if (homeHeroHeadline) homeHeroHeadline.textContent = "Keep Going.";
  if (homeHeroSubline) homeHeroSubline.textContent = "“Discipline Today, Success Tomorrow.”";

  homeRankName.textContent = getRankDisplayName(displayRank);
  if (homeNextRankName) homeNextRankName.textContent = nextRank === "Max" ? "Max" : getRankDisplayName(nextRank);
  homeRankIcon.innerHTML = displayRank === "Starter"
    ? getVariantIconSvg("standard", "home-starter-icon")
    : getRankIconSvg(displayRank, "home-rank-asset");

  renderHomeProgressOrbs(todayTotal, weekTotal);
  renderHomeRankPaths(chapter);
}

// ---------- Events ----------
let treeResizeTimer = null;
let lastTreeLayoutWidth = Math.round(document.documentElement.clientWidth || window.innerWidth || 0);
window.addEventListener("resize", () => {
  // Mobile browsers fire resize events while their top/bottom bars collapse during
  // vertical scrolling. The old handler rebuilt the complete tree on those height-
  // only changes, which caused the visible node blinking/jank on Android.
  const nextWidth = Math.round(document.documentElement.clientWidth || window.innerWidth || 0);
  if (Math.abs(nextWidth - lastTreeLayoutWidth) < 2) return;

  lastTreeLayoutWidth = nextWidth;
  if (treeView.classList.contains("hidden")) return;
  clearTimeout(treeResizeTimer);
  treeResizeTimer = setTimeout(() => renderTree(), 120);
});

document.getElementById("openPushTreeBtn").addEventListener("click", () => showView("tree"));
document.getElementById("homeTreeTrainingBtn")?.addEventListener("click", openTraining);
document.getElementById("treeBackBtn").addEventListener("click", () => showView("home"));
document.getElementById("openTreeStatsBtn").addEventListener("click", openTreeStats);
document.getElementById("closeTreeStatsBtn").addEventListener("click", closeTreeStats);
treeStatsSheet.addEventListener("click", (event) => {
  if (event.target === treeStatsSheet) closeTreeStats();
});
document.getElementById("openHistoryBtn")?.addEventListener("click", () => showView("history"));
document.getElementById("openHomeStatsBtn")?.addEventListener("click", openTreeStats);
document.getElementById("homeNavHomeBtn").addEventListener("click", () => showView("home"));
document.getElementById("homeNavTreeBtn")?.addEventListener("click", () => showView("tree"));
document.getElementById("homeNavTrainingBtn").addEventListener("click", openTraining);
document.getElementById("homeNavHistoryBtn")?.addEventListener("click", () => showView("history"));
document.getElementById("homeNavProfileBtn").addEventListener("click", () => showView("profile"));
document.getElementById("profileOpenTreeBtn").addEventListener("click", () => showView("tree"));
document.getElementById("profileHistoryBtn")?.addEventListener("click", () => showView("history"));
document.getElementById("profileNavHomeBtn").addEventListener("click", () => showView("home"));
document.getElementById("profileNavTreeBtn")?.addEventListener("click", () => showView("tree"));
document.getElementById("profileNavTrainingBtn").addEventListener("click", openTraining);
document.getElementById("profileNavHistoryBtn")?.addEventListener("click", () => showView("history"));
document.getElementById("profileNavProfileBtn").addEventListener("click", () => showView("profile"));
profileGenderMaleBtn?.addEventListener("click", () => setHeroGender("male"));
profileGenderFemaleBtn?.addEventListener("click", () => setHeroGender("female"));
profileNameInput?.addEventListener("change", () => {
  const nextName = profileNameInput.value.trim().slice(0, 18) || "Athlete";
  progress.accountName = nextName;
  profileNameInput.value = nextName;
  saveProgress();
  renderAccountHome(getV012CurrentRankName());
  showAppToast("Name updated");
});
document.getElementById("historyNavHomeBtn")?.addEventListener("click", () => showView("home"));
document.getElementById("historyNavTreeBtn")?.addEventListener("click", () => showView("tree"));
document.getElementById("historyNavTrainingBtn")?.addEventListener("click", openTraining);
document.getElementById("historyNavHistoryBtn")?.addEventListener("click", () => showView("history"));
document.getElementById("historyNavProfileBtn")?.addEventListener("click", () => showView("profile"));

document.getElementById("homeNavSkillsBtn")?.addEventListener("click", () => showView("skills"));
document.getElementById("skillsNavHomeBtn")?.addEventListener("click", () => showView("home"));
document.getElementById("skillsNavSkillsBtn")?.addEventListener("click", () => showView("skills"));
document.getElementById("skillsNavTrainingBtn")?.addEventListener("click", openTraining);
document.getElementById("skillsNavHistoryBtn")?.addEventListener("click", () => showView("history"));
document.getElementById("skillsNavProfileBtn")?.addEventListener("click", () => showView("profile"));
document.getElementById("profileNavSkillsBtn")?.addEventListener("click", () => showView("skills"));
document.getElementById("historyNavSkillsBtn")?.addEventListener("click", () => showView("skills"));
document.getElementById("skillsPushupCard")?.addEventListener("click", () => showView("tree"));

document.getElementById("openTrainingBtn")?.addEventListener("click", openTraining);
document.getElementById("closeTrainingBtn").addEventListener("click", closeTraining);

document.querySelector('[data-exercise="pushups"]').addEventListener("click", () => {
  showStep("quick");
  showPrepUI();
  renderStaticIcons();
});

variantCards.forEach(card => {
  card.addEventListener("click", () => setSelectedTrainingVariant(card.dataset.variant));
});
workoutVariantButtons.forEach(button => {
  button.addEventListener("click", () => selectWorkoutVariant(button.dataset.workoutVariant));
});
backBtn.addEventListener("click", () => {
  if (!resultStep.classList.contains("hidden")) {
    showStep("quick");
    return;
  }
  if (!quickStep.classList.contains("hidden")) {
    if (workoutSets.length || workoutActive || trainingPhase === "pause") {
      if (!confirm("Aktuelles Workout wirklich verlassen? Noch nicht gespeicherte Sets gehen verloren.")) return;
    }
    workoutActive = false;
    countdownActive = false;
    autoCountdownPending = false;
    stopPauseTimer();
    stopDetectionLoop();
    stopCamera();
    cameraWasStarted = false;
    resetTrainingSession();
    showStep("exercise");
    return;
  }
  resetTrainingSession();
  showStep("exercise");
});

startCameraBtn.addEventListener("click", () => startCamera());
startWorkoutBtn.addEventListener("click", () => {
  if (trainingPhase === "pause") {
    armNextSetFromPause();
    return;
  }
  startCountdown();
});
pauseSetBtn.addEventListener("click", () => endCurrentSetToPause("manual"));
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

const exportBackupBtn = document.getElementById("exportBackupBtn");
const importBackupBtn = document.getElementById("importBackupBtn");
const backupFileInput = document.getElementById("backupFileInput");
exportBackupBtn?.addEventListener("click", exportProgressBackup);
importBackupBtn?.addEventListener("click", () => backupFileInput?.click());
backupFileInput?.addEventListener("change", () => importProgressBackup(backupFileInput.files?.[0]));

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Wirklich alle lokalen Testdaten löschen?")) return;
  [STORAGE_KEY, ...OLD_STORAGE_KEYS].forEach(key => localStorage.removeItem(key));
  progress = { ...DEFAULT_PROGRESS, challengeProgress: createEmptyChallengeProgress(), trainingHistory: [] };
  saveProgress();
  render();
  showView("home");
  window.setTimeout(() => window.location.reload(), 40);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && !workoutActive && !countdownActive) {
    stopDetectionLoop();
    stopCamera();
  }
});

render();
showView("home");
maybePromptEntrySetup();
