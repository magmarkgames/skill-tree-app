const STORAGE_KEY = "skillTreePrototypeV01";

const defaultProgress = {
  pushupMax: 0,
  pushupTotal: 0,
  pushupStreak: 0
};

let progress = loadProgress();

const nodes = [
  {
    id: "power",
    title: "Power",
    kind: "category",
    icon: "🔥",
    x: 450,
    y: 100,
    alwaysVisible: true,
    informational: true
  },
  {
    id: "pushups",
    title: "Push-ups am Stück",
    kind: "category",
    icon: "💪",
    x: 450,
    y: 220,
    parents: ["power"],
    alwaysVisible: true,
    informational: true
  },

  {
    id: "max-1",
    title: "1 Push-up",
    type: "max",
    goal: 1,
    x: 450,
    y: 355,
    parents: ["pushups"]
  },
  {
    id: "max-3",
    title: "3 Push-ups",
    type: "max",
    goal: 3,
    x: 320,
    y: 495,
    parents: ["max-1"]
  },
  {
    id: "max-5",
    title: "5 Push-ups",
    type: "max",
    goal: 5,
    x: 260,
    y: 635,
    parents: ["max-3"]
  },
  {
    id: "max-10",
    title: "10 Push-ups",
    type: "max",
    goal: 10,
    x: 245,
    y: 790,
    parents: ["max-5"]
  },
  {
    id: "max-20",
    title: "20 Push-ups",
    type: "max",
    goal: 20,
    x: 245,
    y: 930,
    parents: ["max-10"]
  },
  {
    id: "max-30",
    title: "30 Push-ups",
    type: "max",
    goal: 30,
    x: 245,
    y: 1070,
    parents: ["max-20"]
  },

  {
    id: "total-branch",
    title: "Push-ups insgesamt",
    kind: "branch",
    icon: "Σ",
    x: 585,
    y: 495,
    parents: ["max-1"],
    informational: true
  },
  {
    id: "total-10",
    title: "10 insgesamt",
    type: "total",
    goal: 10,
    x: 610,
    y: 635,
    parents: ["total-branch"]
  },
  {
    id: "total-50",
    title: "50 insgesamt",
    type: "total",
    goal: 50,
    x: 610,
    y: 775,
    parents: ["total-10"]
  },
  {
    id: "total-100",
    title: "100 insgesamt",
    type: "total",
    goal: 100,
    x: 610,
    y: 915,
    parents: ["total-50"]
  },
  {
    id: "total-200",
    title: "200 insgesamt",
    type: "total",
    goal: 200,
    x: 535,
    y: 1065,
    parents: ["total-100"]
  },

  {
    id: "streak-branch",
    title: "Push-up Streak",
    kind: "branch",
    icon: "🔥",
    x: 700,
    y: 1065,
    parents: ["total-100"],
    informational: true
  },
  {
    id: "streak-1",
    title: "1 Tag",
    type: "streak",
    goal: 1,
    x: 700,
    y: 1205,
    parents: ["streak-branch"]
  },
  {
    id: "streak-3",
    title: "3 Tage",
    type: "streak",
    goal: 3,
    x: 700,
    y: 1335,
    parents: ["streak-1"]
  },
  {
    id: "streak-7",
    title: "7 Tage",
    type: "streak",
    goal: 7,
    x: 700,
    y: 1460,
    parents: ["streak-3"]
  }
];

const nodeMap = new Map(nodes.map(node => [node.id, node]));

const tree = document.getElementById("tree");
const connectionsSvg = document.getElementById("connections");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalType = document.getElementById("modalType");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalProgressText = document.getElementById("modalProgressText");
const modalProgressBar = document.getElementById("modalProgressBar");
const progressInput = document.getElementById("progressInput");
const inputLabel = document.getElementById("inputLabel");
const inputArea = document.getElementById("inputArea");
const completedMessage = document.getElementById("completedMessage");

let selectedNode = null;

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultProgress, ...(saved || {}) };
  } catch {
    return { ...defaultProgress };
  }
}

function saveProgressToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getMetricValue(node) {
  if (node.type === "max") return progress.pushupMax;
  if (node.type === "total") return progress.pushupTotal;
  if (node.type === "streak") return progress.pushupStreak;
  return 0;
}

function isComplete(node) {
  if (node.alwaysVisible && node.informational) return true;
  if (node.informational) return isUnlocked(node);
  if (!node.type) return false;
  return getMetricValue(node) >= node.goal;
}

function isUnlocked(node) {
  if (node.alwaysVisible) return true;
  if (!node.parents || node.parents.length === 0) return true;

  return node.parents.every(parentId => {
    const parent = nodeMap.get(parentId);
    return parent ? isComplete(parent) : false;
  });
}

function nodeState(node) {
  if (node.informational && isUnlocked(node)) return "complete";
  if (isComplete(node)) return "complete";
  if (isUnlocked(node)) return "available";
  return "locked";
}

function getTypeLabel(node) {
  if (node.kind === "category") return "KATEGORIE";
  if (node.kind === "branch") return "SKILL-AST";
  if (node.type === "max") return "MAX AM STÜCK";
  if (node.type === "total") return "GESAMTVOLUMEN";
  if (node.type === "streak") return "STREAK";
  return "SKILL";
}

function getDescription(node) {
  if (node.informational) {
    if (node.id === "power") return "Die Kategorie für körperliche Kraft-Skills.";
    if (node.id === "pushups") return "Verbessere deine Push-up-Leistung und schalte weitere Äste frei.";
    if (node.id === "total-branch") return "Dieser Ast zählt alle eingetragenen Push-ups zusammen.";
    if (node.id === "streak-branch") return "Dieser Ast zeigt, wie viele Trainingstage du in Folge geschafft hast.";
  }

  if (node.type === "max") {
    return `Schaffe mindestens ${node.goal} Push-up${node.goal === 1 ? "" : "s"} am Stück.`;
  }
  if (node.type === "total") {
    return `Erreiche insgesamt ${node.goal} eingetragene Push-ups.`;
  }
  if (node.type === "streak") {
    return `Erreiche eine Push-up-Streak von ${node.goal} Tag${node.goal === 1 ? "" : "en"}.`;
  }
  return "";
}

function getMetricName(node) {
  if (node.type === "max") return "Bestleistung";
  if (node.type === "total") return "Gesamtzahl";
  if (node.type === "streak") return "Streak";
  return "Fortschritt";
}

function drawTree() {
  tree.querySelectorAll(".node").forEach(el => el.remove());
  connectionsSvg.innerHTML = "";

  nodes.forEach(node => {
    const el = document.createElement("button");
    const state = nodeState(node);
    el.className = `node ${state} ${node.kind || ""}`;
    el.dataset.nodeId = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;

    const icon = node.icon || (state === "complete" ? "✓" : state === "locked" ? "🔒" : "●");
    let meta = "";

    if (!node.informational && node.type) {
      const current = getMetricValue(node);
      meta = state === "complete"
        ? "Geschafft"
        : state === "locked"
          ? "Gesperrt"
          : `${Math.min(current, node.goal)} / ${node.goal}`;
    }

    el.innerHTML = `
      <div class="node-icon">${icon}</div>
      <div class="node-title">${node.title}</div>
      ${meta ? `<div class="node-meta">${meta}</div>` : ""}
    `;

    el.addEventListener("click", () => {
      if (nodeState(node) === "locked") return;
      openNode(node);
    });

    tree.appendChild(el);
  });

  drawConnections();
  updateStats();
}

function drawConnections() {
  nodes.forEach(node => {
    if (!node.parents) return;

    node.parents.forEach(parentId => {
      const parent = nodeMap.get(parentId);
      if (!parent) return;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

      const startX = parent.x;
      const startY = parent.y + 35;
      const endX = node.x;
      const endY = node.y - 35;

      const midY = (startY + endY) / 2;

      const d = [
        `M ${startX} ${startY}`,
        `C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
      ].join(" ");

      path.setAttribute("d", d);
      path.setAttribute(
        "class",
        `connection ${nodeState(node) === "locked" ? "locked" : ""}`
      );

      connectionsSvg.appendChild(path);
    });
  });
}

function openNode(node) {
  selectedNode = node;
  modalType.textContent = getTypeLabel(node);
  modalTitle.textContent = node.title;
  modalDescription.textContent = getDescription(node);

  if (node.informational) {
    modalProgressText.textContent = "—";
    modalProgressBar.style.width = "0%";
    inputArea.classList.add("hidden");
    completedMessage.classList.add("hidden");
  } else {
    const value = getMetricValue(node);
    const percent = Math.max(0, Math.min(100, (value / node.goal) * 100));

    modalProgressText.textContent = `${Math.min(value, node.goal)} / ${node.goal}`;
    modalProgressBar.style.width = `${percent}%`;

    if (isComplete(node)) {
      inputArea.classList.add("hidden");
      completedMessage.classList.remove("hidden");
    } else {
      inputArea.classList.remove("hidden");
      completedMessage.classList.add("hidden");

      inputLabel.textContent = `${getMetricName(node)} eintragen`;
      progressInput.value = value;
      progressInput.max = "";
      progressInput.focus();
    }
  }

  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  selectedNode = null;
}

document.getElementById("closeModal").addEventListener("click", closeModal);

modalBackdrop.addEventListener("click", event => {
  if (event.target === modalBackdrop) closeModal();
});

document.getElementById("saveProgress").addEventListener("click", () => {
  if (!selectedNode || selectedNode.informational) return;

  const value = Number(progressInput.value);
  if (!Number.isFinite(value) || value < 0) return;

  if (selectedNode.type === "max") {
    progress.pushupMax = Math.max(progress.pushupMax, Math.floor(value));
  }

  if (selectedNode.type === "total") {
    progress.pushupTotal = Math.max(progress.pushupTotal, Math.floor(value));
  }

  if (selectedNode.type === "streak") {
    progress.pushupStreak = Math.max(progress.pushupStreak, Math.floor(value));
  }

  saveProgressToStorage();
  closeModal();
  drawTree();
});

document.getElementById("resetButton").addEventListener("click", () => {
  const confirmed = confirm("Wirklich den gesamten Test-Fortschritt zurücksetzen?");
  if (!confirmed) return;

  progress = { ...defaultProgress };
  saveProgressToStorage();
  drawTree();
});

function updateStats() {
  document.getElementById("bestStat").textContent = progress.pushupMax;
  document.getElementById("totalStat").textContent = progress.pushupTotal;
  document.getElementById("streakStat").textContent = progress.pushupStreak;
}

drawTree();

// Startposition: ungefähr auf die Mitte des Trees scrollen.
window.addEventListener("load", () => {
  const viewport = document.getElementById("viewport");
  const targetLeft = Math.max(0, (900 - window.innerWidth) / 2);
  viewport.scrollLeft = targetLeft;
  viewport.scrollTop = 0;
});
