const STORAGE_KEY = "skillTreePrototypeV02";

const defaultState = {
  pushupMax: 0,
  pushupTotal: 0,
  streak: 0,
  lastTrainingDate: null,
  trainingDates: [],
  trainings: []
};

let state = loadState();

const rankDefinitions = [
  { key: "wood", label: "Holz", min: 5 },
  { key: "stone", label: "Stein", min: 10 },
  { key: "iron", label: "Eisen", min: 20 },
  { key: "gold", label: "Gold", min: 30 },
  { key: "crystal", label: "Kristall", min: 50 },
  { key: "diamond", label: "Diamant", min: 75 },
  { key: "master", label: "Meister", min: 100 }
];

const nodes = [
  { id:"power", title:"POWER", kind:"root", x:450, y:1325, alwaysUnlocked:true, autoComplete:true },

  { id:"max-1", title:"1 PU", metric:"max", goal:1, x:565, y:1160, parents:["power"] },
  { id:"total-5", title:"5 PU", subtitle:"insg.", metric:"total", goal:5, x:335, y:1160, parents:["power"] },

  { id:"total-10", title:"10 PU", subtitle:"insg.", metric:"total", goal:10, x:220, y:990, parents:["total-5"] },
  { id:"streak-1", title:"1 Tag", subtitle:"Streak", metric:"streak", goal:1, x:450, y:990, parents:["power"] },
  { id:"max-3", title:"3 PU", metric:"max", goal:3, x:680, y:990, parents:["max-1"] },

  { id:"total-50", title:"50 PU", subtitle:"insg.", metric:"total", goal:50, x:335, y:820, parents:["total-10"] },
  { id:"max-5", title:"5 PU", metric:"max", goal:5, x:565, y:820, parents:["max-3"], rank:"wood" },

  { id:"total-100", title:"100 PU", subtitle:"insg.", metric:"total", goal:100, x:220, y:650, parents:["total-50"] },
  { id:"streak-3", title:"3 Tage", subtitle:"Streak", metric:"streak", goal:3, x:450, y:650, parents:["streak-1"] },
  { id:"max-10", title:"10 PU", metric:"max", goal:10, x:680, y:650, parents:["max-5"], rank:"stone" },

  { id:"total-500", title:"500 PU", subtitle:"insg.", metric:"total", goal:500, x:335, y:480, parents:["total-100"] },
  { id:"streak-7", title:"7 Tage", subtitle:"Streak", metric:"streak", goal:7, x:565, y:480, parents:["streak-3"] },
  { id:"max-20", title:"20 PU", metric:"max", goal:20, x:795, y:480, parents:["max-10"], rank:"iron" },

  { id:"total-1000", title:"1.000 PU", subtitle:"insg.", metric:"total", goal:1000, x:220, y:310, parents:["total-500"] },
  { id:"streak-30", title:"30 Tage", subtitle:"Streak", metric:"streak", goal:30, x:450, y:310, parents:["streak-7"] },
  { id:"max-30", title:"30 PU", metric:"max", goal:30, x:680, y:310, parents:["max-20"], rank:"gold" }
];

const nodeMap = new Map(nodes.map(node => [node.id, node]));
const tree = document.getElementById("tree");
const svg = document.getElementById("connections");
const modalBackdrop = document.getElementById("modalBackdrop");
const trainingModal = document.getElementById("trainingModal");
const resultModal = document.getElementById("resultModal");
const nodeModal = document.getElementById("nodeModal");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState, ...(saved || {}) };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function metricValue(node) {
  if (node.metric === "max") return state.pushupMax;
  if (node.metric === "total") return state.pushupTotal;
  if (node.metric === "streak") return state.streak;
  return 0;
}

function isComplete(node) {
  if (node.autoComplete) return true;
  if (!node.metric) return false;
  return metricValue(node) >= node.goal;
}

function isUnlocked(node) {
  if (node.alwaysUnlocked) return true;
  if (!node.parents || !node.parents.length) return true;
  return node.parents.every(parentId => {
    const parent = nodeMap.get(parentId);
    return parent && isComplete(parent);
  });
}

function nodeState(node) {
  if (isComplete(node)) return "complete";
  if (isUnlocked(node)) return "available";
  return "locked";
}

function currentRank(max = state.pushupMax) {
  let result = null;
  for (const rank of rankDefinitions) {
    if (max >= rank.min) result = rank;
  }
  return result;
}

function rankByKey(key) {
  return rankDefinitions.find(rank => rank.key === key);
}

function renderTree() {
  tree.querySelectorAll(".hex-node").forEach(el => el.remove());
  svg.innerHTML = "";

  for (const node of nodes) {
    const button = document.createElement("button");
    const status = nodeState(node);
    button.className = `hex-node ${status} ${node.kind || ""}`;
    button.style.left = `${node.x}px`;
    button.style.top = `${node.y}px`;

    const value = metricValue(node);
    let sub = node.subtitle || "";
    if (node.metric && !node.subtitle) {
      if (status === "complete") sub = "geschafft";
      else if (status === "available") sub = `${Math.min(value, node.goal)} / ${node.goal}`;
      else sub = "gesperrt";
    }

    let icon = "";
    if (node.kind === "root") icon = "💪";
    else if (status === "complete") icon = "✓";
    else if (status === "locked") icon = "🔒";
    else icon = "•";

    button.innerHTML = `
      <div class="hex-content">
        <div class="hex-icon">${icon}</div>
        <div class="hex-title">${node.title}</div>
        ${sub ? `<div class="hex-sub">${sub}</div>` : ""}
      </div>`;

    if (node.rank) {
      const rank = rankByKey(node.rank);
      const chip = document.createElement("div");
      chip.className = `rank-chip ${node.rank}`;
      chip.textContent = rank ? rank.label : node.rank;
      button.appendChild(chip);
    }

    button.addEventListener("click", () => {
      if (nodeState(node) === "locked") return;
      openNodeInfo(node);
    });

    tree.appendChild(button);
  }

  drawConnections();
  updateOverview();
}

function drawConnections() {
  for (const node of nodes) {
    if (!node.parents) continue;
    for (const parentId of node.parents) {
      const parent = nodeMap.get(parentId);
      if (!parent) continue;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const startX = parent.x;
      const startY = parent.y - 45;
      const endX = node.x;
      const endY = node.y + 45;
      const middleY = (startY + endY) / 2;

      path.setAttribute("d", `M ${startX} ${startY} C ${startX} ${middleY}, ${endX} ${middleY}, ${endX} ${endY}`);
      path.setAttribute("class", `connection ${nodeState(node) === "locked" ? "locked" : ""}`);
      svg.appendChild(path);
    }
  }
}

function updateOverview() {
  document.getElementById("bestStat").textContent = state.pushupMax;
  document.getElementById("totalStat").textContent = state.pushupTotal.toLocaleString("de-DE");
  document.getElementById("streakStat").textContent = state.streak;
  const rank = currentRank();
  document.getElementById("rankStat").textContent = rank ? rank.label : "–";
}

function openOnly(sheet) {
  trainingModal.classList.add("hidden");
  resultModal.classList.add("hidden");
  nodeModal.classList.add("hidden");
  sheet.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  trainingModal.classList.add("hidden");
  resultModal.classList.add("hidden");
  nodeModal.classList.add("hidden");
}

document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeModal));
modalBackdrop.addEventListener("click", event => { if (event.target === modalBackdrop) closeModal(); });

document.getElementById("trainingButton").addEventListener("click", () => {
  document.getElementById("sessionBest").value = "";
  document.getElementById("sessionTotal").value = "";
  document.getElementById("trainingError").classList.add("hidden");
  openOnly(trainingModal);
});

function openNodeInfo(node) {
  document.getElementById("nodeModalType").textContent =
    node.metric === "max" ? "MAX AM STÜCK" :
    node.metric === "total" ? "GESAMTVOLUMEN" :
    node.metric === "streak" ? "STREAK" : "KATEGORIE";

  document.getElementById("nodeModalTitle").textContent = node.title;

  let text = "Der Startpunkt dieses Skill Trees.";
  if (node.metric === "max") text = `Schaffe mindestens ${node.goal} Push-up${node.goal === 1 ? "" : "s"} am Stück.`;
  if (node.metric === "total") text = `Erreiche insgesamt ${node.goal.toLocaleString("de-DE")} Push-ups.`;
  if (node.metric === "streak") text = `Trainiere an ${node.goal} aufeinanderfolgenden Tag${node.goal === 1 ? "" : "en"}.`;
  document.getElementById("nodeModalText").textContent = text;

  const value = node.metric ? metricValue(node) : 1;
  const goal = node.metric ? node.goal : 1;
  const percent = Math.min(100, Math.max(0, (value / goal) * 100));
  document.getElementById("nodeModalProgress").textContent = node.metric ? `${Math.min(value, goal)} / ${goal}` : "Start";
  document.getElementById("nodeModalBar").style.width = `${percent}%`;

  const status = nodeState(node);
  const stateBox = document.getElementById("nodeModalState");
  if (status === "complete") stateBox.textContent = "✓ Dieser Skill ist geschafft.";
  else if (status === "available") stateBox.textContent = "Dieser Skill ist erreichbar. Trage ein Training ein, um Fortschritt zu machen.";
  else stateBox.textContent = "Dieser Skill ist noch gesperrt.";

  openOnly(nodeModal);
}

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromLocalString(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayDifference(from, to) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

function calculateNewStreak(todayString) {
  if (!state.lastTrainingDate) return 1;
  if (state.lastTrainingDate === todayString) return state.streak;
  const diff = dayDifference(dateFromLocalString(state.lastTrainingDate), dateFromLocalString(todayString));
  return diff === 1 ? state.streak + 1 : 1;
}

function completedIds() {
  return new Set(nodes.filter(isComplete).map(node => node.id));
}

document.getElementById("saveTraining").addEventListener("click", () => {
  const bestInput = Number(document.getElementById("sessionBest").value);
  const totalInput = Number(document.getElementById("sessionTotal").value);

  if (!Number.isFinite(totalInput) || totalInput <= 0) {
    showTrainingError("Bitte trage ein, wie viele Push-ups du insgesamt gemacht hast.");
    return;
  }

  const sessionBest = Number.isFinite(bestInput) && bestInput >= 0 ? Math.floor(bestInput) : 0;
  const sessionTotal = Math.floor(totalInput);

  if (sessionBest > sessionTotal) {
    showTrainingError("Die Bestleistung am Stück kann nicht größer als die Gesamtzahl des Trainings sein.");
    return;
  }

  document.getElementById("trainingError").classList.add("hidden");

  const beforeCompleted = completedIds();
  const beforeRank = currentRank();
  const oldBest = state.pushupMax;
  const today = localDateString();

  state.pushupMax = Math.max(state.pushupMax, sessionBest);
  state.pushupTotal += sessionTotal;

  const alreadyTrainedToday = state.trainingDates.includes(today);
  if (!alreadyTrainedToday) {
    state.streak = calculateNewStreak(today);
    state.trainingDates.push(today);
    state.lastTrainingDate = today;
  }

  state.trainings.push({ date: today, best: sessionBest, total: sessionTotal });
  saveState();

  const afterCompleted = completedIds();
  const afterRank = currentRank();
  const newlyCompleted = nodes.filter(node => afterCompleted.has(node.id) && !beforeCompleted.has(node.id) && node.id !== "power");
  const newRecord = state.pushupMax > oldBest;

  renderTree();
  showResult({ newRecord, oldBest, newlyCompleted, beforeRank, afterRank, alreadyTrainedToday });
});

function showTrainingError(message) {
  const error = document.getElementById("trainingError");
  error.textContent = message;
  error.classList.remove("hidden");
}

function showResult(data) {
  document.getElementById("resultBest").textContent = state.pushupMax;
  document.getElementById("resultTotal").textContent = state.pushupTotal.toLocaleString("de-DE");
  document.getElementById("resultStreak").textContent = `${state.streak}d`;
  document.getElementById("resultHeadline").textContent = data.newRecord ? "Neuer Rekord!" : "Fortschritt aktualisiert";

  const record = document.getElementById("resultRecord");
  if (data.newRecord) {
    record.textContent = data.oldBest > 0
      ? `🏆 Neuer Max-Rekord: ${data.oldBest} → ${state.pushupMax} Push-ups`
      : `🏆 Deine erste Bestleistung: ${state.pushupMax} Push-ups`;
    record.classList.remove("hidden");
  } else if (data.alreadyTrainedToday) {
    record.textContent = "Training hinzugefügt. Deine Streak wurde heute bereits gezählt.";
    record.classList.remove("hidden");
  } else {
    record.classList.add("hidden");
  }

  const unlockSection = document.getElementById("unlockSection");
  const unlockList = document.getElementById("unlockList");
  unlockList.innerHTML = "";

  if (data.newlyCompleted.length) {
    data.newlyCompleted.forEach(node => {
      const item = document.createElement("div");
      item.className = "unlock-item";
      item.textContent = `✓ ${node.title}${node.subtitle ? ` ${node.subtitle}` : ""}`;
      unlockList.appendChild(item);
    });
    unlockSection.classList.remove("hidden");
  } else {
    unlockSection.classList.add("hidden");
  }

  const rankSection = document.getElementById("rankSection");
  const rankReveal = document.getElementById("rankReveal");
  if (data.afterRank && (!data.beforeRank || data.afterRank.key !== data.beforeRank.key)) {
    rankReveal.textContent = `${data.afterRank.label.toUpperCase()} – ab ${data.afterRank.min} Push-ups am Stück`;
    rankReveal.style.borderColor = `var(--${data.afterRank.key})`;
    rankSection.classList.remove("hidden");
  } else {
    rankSection.classList.add("hidden");
  }

  openOnly(resultModal);
}

document.getElementById("resetButton").addEventListener("click", () => {
  if (!confirm("Wirklich den gesamten Test-Fortschritt löschen?")) return;
  state = { ...defaultState, trainingDates: [], trainings: [] };
  saveState();
  renderTree();
});

renderTree();
window.addEventListener("load", () => {
  const viewport = document.getElementById("viewport");
  viewport.scrollLeft = Math.max(0, (900 - window.innerWidth) / 2);
  viewport.scrollTop = 980;
});
