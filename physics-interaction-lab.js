import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import "./real-physics-objects.js";
import "./physics-interactions.js";

const LAB_VERSION = "solid-hands-interactions-v1";
const INITIAL_SPAWN = Object.freeze({ x: 0, y: 0.12, z: 8 });
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);

const PLATFORM_POSITIONS = Object.freeze([8, 3.8, -0.4, -4.6, -8.8, -13]);
const EXPECTED_BASE_COLLIDERS = PLATFORM_POSITIONS.length * 2 + 6;

function positionString(values) {
  return values.map((value) => Number(value).toFixed(3)).join(" ");
}

function entity(tag = "a-entity") {
  return document.createElement(tag);
}

function createSolidBox(parent, { id, position, size, color = "#64748B", opacity = 1, collider = true, physics = true }) {
  const box = entity("a-box");
  box.id = id;
  box.setAttribute("position", positionString(position));
  box.setAttribute("width", String(size[0]));
  box.setAttribute("height", String(size[1]));
  box.setAttribute("depth", String(size[2]));
  box.setAttribute("material", `color: ${color}; opacity: ${opacity}; transparent: ${opacity < 1}`);
  if (collider) box.setAttribute("locomotion-collider", `type: box; size: ${positionString(size)}`);
  if (physics) box.setAttribute("static-body", "shape: box");
  parent.appendChild(box);
  return box;
}

function createPlatform(root, index, z) {
  const asset = getPlatformerAsset("platform-square-blue");
  const platform = entity();
  platform.id = `interaction-platform-${index}`;
  platform.setAttribute("position", `0 0 ${z}`);
  root.appendChild(platform);

  if (asset) {
    const model = entity();
    model.setAttribute("gltf-model", asset.url);
    model.setAttribute("data-course-model", platform.id);
    platform.appendChild(model);
  } else {
    createSolidBox(platform, {
      id: `${platform.id}-fallback`, position: [0, 0.5, 0], size: [4, 1, 4], color: "#0EA5E9", collider: false, physics: false
    });
  }

  for (let i = 0; i < PLATFORM_COLLIDERS.length; i += 1) {
    const collider = PLATFORM_COLLIDERS[i];
    createSolidBox(platform, {
      id: `${platform.id}-collider-${i}`,
      position: collider.position,
      size: collider.size,
      color: "#FFFFFF",
      opacity: 0.001
    });
  }
  return platform;
}

function createDynamicObjects(root) {
  const orb = entity("a-sphere");
  orb.id = "grab-orb";
  orb.setAttribute("data-physics-weight", "2.5");
  orb.setAttribute("position", "-0.72 1.42 4.15");
  orb.setAttribute("radius", "0.42");
  orb.setAttribute("material", "color: #F59E0B; emissive: #92400E; emissiveIntensity: 0.12; roughness: 0.48");
  orb.setAttribute("dynamic-body", "shape: sphere; sphereRadius: 0.42; mass: 2.5; linearDamping: 0.12; angularDamping: 0.1");
  orb.setAttribute("physics-grabbable", "leftHand: #left-hand; rightHand: #right-hand; grabRadius: 0.72; threshold: 0.55; maxForce: 5200");
  orb.setAttribute("real-physics-reset", "minimumY: -5; minimumX: -2.2; maximumX: 2.2; minimumZ: -11; maximumZ: 6.2");
  root.appendChild(orb);

  const block = entity("a-box");
  block.id = "grab-block";
  block.setAttribute("data-physics-weight", "7.5");
  block.setAttribute("position", "0.72 1.48 4.15");
  block.setAttribute("width", "0.86");
  block.setAttribute("height", "0.86");
  block.setAttribute("depth", "0.86");
  block.setAttribute("material", "color: #B45309; emissive: #78350F; emissiveIntensity: 0.12; roughness: 0.84");
  block.setAttribute("dynamic-body", "shape: box; mass: 7.5; linearDamping: 0.25; angularDamping: 0.3");
  block.setAttribute("physics-grabbable", "leftHand: #left-hand; rightHand: #right-hand; grabRadius: 0.75; threshold: 0.55; maxForce: 7200");
  block.setAttribute("real-physics-reset", "minimumY: -5; minimumX: -2.2; maximumX: 2.2; minimumZ: -11; maximumZ: 6.2");
  root.appendChild(block);
}

function createPlateAndDoor(root, { number, plateZ, doorZ, minimumMass, label }) {
  const door = createSolidBox(root, {
    id: `physics-door-${number}`,
    position: [0, 2.62, doorZ],
    size: [3.5, 3.25, 0.34],
    color: number === 1 ? "#EF4444" : "#F97316"
  });
  door.setAttribute("physics-door", `openHeight: 4.2; speed: ${number === 1 ? 3.4 : 3.8}`);

  const plate = createSolidBox(root, {
    id: `weighted-plate-${number}`,
    position: [0, 1.10, plateZ],
    size: [1.75, 0.18, 1.5],
    color: "#A855F7",
    collider: false,
    physics: true
  });
  plate.setAttribute(
    "weighted-pressure-plate",
    `door: #physics-door-${number}; targets: [data-physics-weight]; size: 1.75 0.45 1.5; minimumMass: ${minimumMass}; verticalTolerance: 1.25`
  );
  plate.setAttribute("data-plate-label", label);

  const sign = entity("a-plane");
  sign.setAttribute("position", `-3.15 2.65 ${plateZ}`);
  sign.setAttribute("rotation", "0 90 0");
  sign.setAttribute("width", "5.6");
  sign.setAttribute("height", "0.9");
  sign.setAttribute("color", "#FFFFFF");
  const text = entity("a-text");
  text.setAttribute("position", "0 0 0.01");
  text.setAttribute("align", "center");
  text.setAttribute("width", "5.1");
  text.setAttribute("color", "#0F172A");
  text.setAttribute("value", label);
  sign.appendChild(text);
  root.appendChild(sign);
}

function createRouteRails(root) {
  createSolidBox(root, { id: "interaction-rail-left", position: [-1.92, 1.24, -2.5], size: [0.18, 0.48, 17.8], color: "#475569" });
  createSolidBox(root, { id: "interaction-rail-right", position: [1.92, 1.24, -2.5], size: [0.18, 0.48, 17.8], color: "#475569" });
}

function addCheckpoint(platform, index, spawnZ) {
  const ring = entity("a-ring");
  ring.setAttribute("position", "0 1.03 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.72");
  ring.setAttribute("radius-outer", "0.92");
  ring.setAttribute("color", "#22C55E");
  ring.setAttribute("course-checkpoint-trigger", `rig: #player-rig; checkpointId: interaction-${index}; label: Interaction checkpoint ${index}; index: ${index}; spawn: 0 0.12 ${spawnZ}; radius: 1.45`);
  platform.appendChild(ring);
}

function addFinish(root) {
  const gate = createSolidBox(root, {
    id: "interaction-finish-gate", position: [0, 2.15, -14.05], size: [3.6, 2.3, 0.18], color: "#22C55E", collider: false, physics: false
  });
  gate.setAttribute("course-finish-trigger", "rig: #player-rig; radiusX: 1.8; radiusZ: 0.8; minRigY: -1; maxRigY: 6");
}

function registerSafety() {
  if (!window.AFRAME || AFRAME.components["interaction-lab-safety"]) return;
  AFRAME.registerComponent("interaction-lab-safety", {
    init: function () {
      this.spawn = new THREE.Vector3(INITIAL_SPAWN.x, INITIAL_SPAWN.y, INITIAL_SPAWN.z);
      this.lastReset = -Infinity;
    },
    setSpawn: function (spawn) {
      if (!spawn) return;
      this.spawn.set(Number(spawn.x) || 0, Number(spawn.y) || 0.12, Number(spawn.z) || 8);
    },
    clearMotion: function () {
      const locomotion = this.el.components["gorilla-locomotion"];
      for (const vector of [locomotion?.velocity, locomotion?.launchVelocity, locomotion?.leftDelta, locomotion?.rightDelta, locomotion?.frameMovement]) {
        if (vector) vector.set?.(0, 0, 0);
      }
      if (locomotion) {
        locomotion.pushHistory = [];
        locomotion.hasPreviousHands = false;
      }
    },
    resetPlayer: function (message = "Returned to checkpoint") {
      const now = performance.now();
      if (now - this.lastReset < 260) return;
      this.lastReset = now;
      this.el.object3D.position.copy(this.spawn);
      this.clearMotion();
      window.dispatchEvent(new CustomEvent("playtest-reset", { detail: { message } }));
    },
    tick: function () {
      const p = this.el.object3D.position;
      if (![p.x, p.y, p.z].every(Number.isFinite) || p.y < -7 || Math.abs(p.x) > 10 || p.z < -18 || p.z > 13) {
        this.resetPlayer();
      }
    }
  });
}

function buildLab() {
  const root = document.getElementById("course-root");
  const rig = document.getElementById("player-rig");
  if (!root || !rig) return;
  root.innerHTML = "";

  const platforms = PLATFORM_POSITIONS.map((z, index) => createPlatform(root, index, z));
  addCheckpoint(platforms[2], 1, -0.4);
  addCheckpoint(platforms[4], 2, -8.8);
  createRouteRails(root);
  createDynamicObjects(root);
  createPlateAndDoor(root, {
    number: 1,
    plateZ: -0.4,
    doorZ: -2.5,
    minimumMass: 6,
    label: "DOOR 1: THE 2.5 KG ORB IS TOO LIGHT — USE THE 7.5 KG BLOCK"
  });
  createPlateAndDoor(root, {
    number: 2,
    plateZ: -8.8,
    doorZ: -10.9,
    minimumMass: 9.5,
    label: "DOOR 2: PLACE BOTH OBJECTS ON THE PLATE — 10 KG TOTAL"
  });
  addFinish(root);

  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("interaction-lab-safety", "");
  refreshLocomotionColliders();
  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: LAB_VERSION,
      spawn: { ...INITIAL_SPAWN },
      dynamicBodies: root.querySelectorAll("[data-physics-weight]").length,
      plates: root.querySelectorAll("[weighted-pressure-plate]").length,
      doors: root.querySelectorAll("[physics-door]").length,
      colliders: root.querySelectorAll("[locomotion-collider]").length
    }
  }));
}

function setupLifecycle() {
  const scene = document.querySelector("a-scene");
  const rig = document.getElementById("player-rig");
  const note = document.getElementById("note");
  const status = document.getElementById("course-status");
  const details = document.getElementById("course-details");
  const worldStatus = document.getElementById("world-status");
  const restart = document.getElementById("restart-course");
  if (!scene || !rig || !note || !status || !details || !worldStatus || !restart) return;

  const state = { hands: new Set(), grabs: 0, releases: 0, plates: new Set(), checkpoint: 0, finished: false };
  const setStatus = (message, mode = "ready") => {
    status.textContent = message;
    status.dataset.state = mode;
  };
  const update = () => {
    details.textContent = `Solid hands ${state.hands.size}/2 • Grabs ${state.grabs} • Releases ${state.releases} • Active plates ${state.plates.size}/2 • Checkpoint ${state.checkpoint}/2`;
  };

  function restartLab() {
    state.grabs = 0;
    state.releases = 0;
    state.plates.clear();
    state.checkpoint = 0;
    state.finished = false;
    document.querySelectorAll("[course-checkpoint-trigger]").forEach((el) => {
      if (el.components["course-checkpoint-trigger"]) el.components["course-checkpoint-trigger"].activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((el) => {
      if (el.components["course-finish-trigger"]) el.components["course-finish-trigger"].completed = false;
    });
    rig.components["interaction-lab-safety"]?.setSpawn(INITIAL_SPAWN);
    window.dispatchEvent(new CustomEvent("course-request-reset", { detail: { spawn: { ...INITIAL_SPAWN } } }));
    rig.components["interaction-lab-safety"]?.resetPlayer("Physics interaction lab restarted");
    setStatus("Lab restarted. Grabbables, plates, and doors were reset.", "ready");
    update();
  }

  async function preflight() {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    refreshLocomotionColliders();
    const problems = [];
    if (!AFRAME.components["solid-physics-hand"]) problems.push("solid hand component missing");
    if (!AFRAME.components["physics-grabbable"]) problems.push("grabbing component missing");
    if (!AFRAME.components["weighted-pressure-plate"]) problems.push("weighted plate component missing");
    if (!AFRAME.components["physics-door"]) problems.push("physics door component missing");
    if (!scene.systems?.physics) problems.push("Cannon physics missing");
    if (document.querySelectorAll("[data-physics-weight]").length !== 2) problems.push("expected two weighted objects");
    if (document.querySelectorAll("[weighted-pressure-plate]").length !== 2) problems.push("expected two pressure plates");
    if (document.querySelectorAll("[physics-door]").length !== 2) problems.push("expected two physics doors");
    if (document.querySelectorAll("[locomotion-collider]").length !== EXPECTED_BASE_COLLIDERS) problems.push(`expected ${EXPECTED_BASE_COLLIDERS} colliders`);

    if (problems.length) {
      note.textContent = `Interaction lab preflight failed: ${problems.join("; ")}`;
      note.dataset.state = "error";
      setStatus("Fix the reported setup issue before entering VR.", "error");
      return;
    }
    note.textContent = "Solid hands and the next physics batch passed preflight. Enter VR to push, grab, carry, weigh, and open both doors.";
    note.dataset.state = "ready";
    setStatus("Lab ready: solid hands, two grabbables, two weighted plates, and two physics doors.", "ready");
    worldStatus.setAttribute("value", "ENTER VR — PUSH, GRAB, WEIGH, OPEN");
    update();
  }

  window.addEventListener("solid-hand-ready", (event) => {
    state.hands.add(event.detail?.hand || event.detail?.id);
    update();
  });
  window.addEventListener("physics-object-grabbed", (event) => {
    state.grabs += 1;
    setStatus(`${event.detail?.hand || "Hand"} grabbed ${event.detail?.objectId || "object"}.`, "ready");
    update();
  });
  window.addEventListener("physics-object-released", () => {
    state.releases += 1;
    update();
  });
  window.addEventListener("weighted-plate-changed", (event) => {
    const id = event.detail?.plateId || "plate";
    if (event.detail?.active) state.plates.add(id);
    else state.plates.delete(id);
    const weight = Number(event.detail?.weight || 0).toFixed(1);
    setStatus(`${id} ${event.detail?.active ? "activated" : "released"} at ${weight} kg.`, event.detail?.active ? "ready" : "warning");
    update();
  });
  window.addEventListener("course-checkpoint", (event) => {
    const index = Number(event.detail?.index || 0);
    if (index <= state.checkpoint) return;
    state.checkpoint = index;
    rig.components["interaction-lab-safety"]?.setSpawn(event.detail?.spawn);
    update();
  });
  window.addEventListener("course-finish", () => {
    if (state.finished) return;
    state.finished = true;
    setStatus("Solid-hand interaction batch clear.", "ready");
    worldStatus.setAttribute("value", "SOLID HAND INTERACTIONS CLEAR");
  });
  window.addEventListener("playtest-reset", (event) => setStatus(event.detail?.message || "Returned to checkpoint", "warning"));
  scene.addEventListener("enter-vr", () => document.body.classList.add("vr-active"));
  scene.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));
  restart.addEventListener("click", restartLab);

  if (scene.hasLoaded) preflight();
  else scene.addEventListener("loaded", preflight, { once: true });
}

registerGeneratedComponents();
registerSafety();

function start() {
  buildLab();
  setupLifecycle();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
