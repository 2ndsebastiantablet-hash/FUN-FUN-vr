// Phase 4 run-performance layer. Tracks clean platforming without changing
// movement, collisions, procedural geometry, or multiplayer pose sync.

const state = {
  active: false,
  completed: false,
  falls: 0,
  springLaunches: 0,
  checkpoint: 0,
  bestFalls: null
};

let statsElement = null;

function courseIdentity() {
  const manifest = window.funFunCourseManifest || {};
  const mode = manifest.mode || "calibration";
  const seed = manifest.seed || "PHASE-2-HANDCRAFTED";
  const version = manifest.generatorVersion || manifest.version || "course-v1";
  return { mode, seed, version };
}

function storageKey() {
  const identity = courseIdentity();
  return `funfun-clean-run-${identity.mode}-${identity.version}-${identity.seed}`;
}

function gradeForFalls(falls) {
  if (falls === 0) return { grade: "S", label: "Perfect run" };
  if (falls === 1) return { grade: "A", label: "One recovery" };
  if (falls === 2) return { grade: "B", label: "Two recoveries" };
  if (falls <= 4) return { grade: "C", label: "Course cleared" };
  return { grade: "CLEAR", label: "Keep improving" };
}

function ensureStatsElement() {
  if (statsElement?.isConnected) return statsElement;
  const details = document.getElementById("course-details");
  if (!details?.parentElement) return null;

  statsElement = document.createElement("div");
  statsElement.id = "run-performance";
  statsElement.setAttribute("role", "status");
  statsElement.style.marginTop = "5px";
  statsElement.style.color = "#cbd5e1";
  statsElement.style.fontSize = "12px";
  details.insertAdjacentElement("afterend", statsElement);
  return statsElement;
}

function loadBest() {
  try {
    const stored = Number(localStorage.getItem(storageKey()));
    state.bestFalls = Number.isFinite(stored) && stored >= 0 ? stored : null;
  } catch {
    state.bestFalls = null;
  }
}

function saveBest() {
  if (state.bestFalls === null || state.falls < state.bestFalls) {
    state.bestFalls = state.falls;
    try {
      localStorage.setItem(storageKey(), String(state.bestFalls));
    } catch {
      // Private browsing or storage restrictions should not break the run.
    }
    return true;
  }
  return false;
}

function render(message = "") {
  const element = ensureStatsElement();
  if (!element) return;

  if (message) {
    element.textContent = message;
    return;
  }

  const best = state.bestFalls === null ? "none yet" : `${state.bestFalls} fall${state.bestFalls === 1 ? "" : "s"}`;
  element.textContent =
    `Run performance: ${state.falls} fall${state.falls === 1 ? "" : "s"} • ` +
    `checkpoint ${state.checkpoint}/2 • spring ${state.springLaunches} • best ${best}`;
}

function resetRun() {
  state.active = false;
  state.completed = false;
  state.falls = 0;
  state.springLaunches = 0;
  state.checkpoint = 0;
  loadBest();
  render();
}

window.addEventListener("course-built", () => {
  loadBest();
  render();
});

window.addEventListener("course-started", () => {
  if (!state.active || state.completed) {
    state.active = true;
    state.completed = false;
    state.falls = 0;
    state.springLaunches = 0;
    state.checkpoint = 0;
  }
  render();
});

window.addEventListener("course-checkpoint", (event) => {
  state.checkpoint = Math.max(state.checkpoint, Number(event.detail?.index) || 0);
  render();
});

window.addEventListener("spring-launched", () => {
  if (state.active && !state.completed) state.springLaunches += 1;
  render();
});

window.addEventListener("playtest-reset", (event) => {
  const message = String(event.detail?.message || "");
  if (state.active && !state.completed && /fall reset|left the course|outside course/i.test(message)) {
    state.falls += 1;
  }
  render();
});

window.addEventListener("course-request-reset", resetRun);

window.addEventListener("course-finish", () => {
  if (state.completed) return;
  state.completed = true;
  state.active = false;
  const result = gradeForFalls(state.falls);
  const newBest = saveBest();
  render(
    `RUN GRADE ${result.grade} — ${result.label} • ${state.falls} fall${state.falls === 1 ? "" : "s"}` +
    `${newBest ? " • new clean-run best" : ""}`
  );
  window.dispatchEvent(new CustomEvent("run-grade", {
    detail: {
      grade: result.grade,
      label: result.label,
      falls: state.falls,
      springLaunches: state.springLaunches,
      checkpoint: state.checkpoint,
      newBest
    }
  }));
});

document.addEventListener("DOMContentLoaded", resetRun);
window.funFunRunPerformance = { state, reset: resetRun, gradeForFalls };
