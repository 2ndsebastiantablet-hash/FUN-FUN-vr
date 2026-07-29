import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import "./real-physics-objects.js";
import "./paired-model-collider.js";

const LAB_VERSION = "real-physics-collision-twins-v2";
const INITIAL_SPAWN = Object.freeze({ x: 0, y: 0.12, z: 8 });
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);

const LAB_MANIFEST = Object.freeze({
  version: LAB_VERSION,
  pieces: Object.freeze([
    { id: "structure-start", assetId: "platform-square-blue", position: [0, 0, 8], colliders: PLATFORM_COLLIDERS },
    { id: "ball-platform", assetId: "platform-square-blue", position: [0, 0, 3.8], colliders: PLATFORM_COLLIDERS },
    {
      id: "structure-checkpoint-one", assetId: "platform-square-blue", position: [0, 0, -0.4], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "structure-checkpoint-1", label: "Ball physics checkpoint", index: 1, spawn: [0, 0.12, -0.4] }
    },
    { id: "crate-platform", assetId: "platform-square-blue", position: [0, 0, -4.6], colliders: PLATFORM_COLLIDERS },
    {
      id: "structure-checkpoint-two", assetId: "platform-square-blue", position: [0, 0, -8.8], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "structure-checkpoint-2", label: "Crate physics checkpoint", index: 2, spawn: [0, 0.12, -8.8] }
    },
    { id: "tunnel-entrance", assetId: "platform-square-blue", position: [0, 0, -13], colliders: PLATFORM_COLLIDERS },
    { id: "tunnel-exit", assetId: "platform-square-blue", position: [0, 0, -17.2], colliders: PLATFORM_COLLIDERS },
    {
      id: "structure-checkpoint-three", assetId: "platform-square-blue", position: [0, 0, -21.4], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "structure-checkpoint-3", label: "Collision-twin checkpoint", index: 3, spawn: [0, 0.12, -21.4] }
    },
    { id: "slope-top", assetId: "platform-square-blue", position: [0, 1.2, -25.6], colliders: PLATFORM_COLLIDERS },
    { id: "structure-finish-platform", assetId: "platform-square-blue", position: [0, 1.2, -29.8], colliders: PLATFORM_COLLIDERS },
    {
      id: "structure-finish-gate", assetId: "finish-wide", position: [0, 2.2, -30.9], scale: 0.45,
      finish: { radiusX: 1.85, radiusZ: 0.75, minRigY: 0.6, maxRigY: 5.8 }
    }
  ]),
  expectedBaseColliders: 35,
  expectedPairedModels: 5,
  expectedPairedProxies: 21,
  expectedFinalColliders: 56,
  checkpointCount: 3,
  dynamicBodyCount: 2,
  goalCount: 2
});

function positionString(values) {
  return values.map((value) => Number(value).toFixed(3)).join(" ");
}

function createEntity(tag = "a-entity") {
  return document.createElement(tag);
}

function createSolidBox(parent, position, size, id, options = {}) {
  const box = createEntity("a-box");
  box.setAttribute("data-structure-collider", id);
  box.setAttribute("position", positionString(position));
  box.setAttribute("width", String(size[0]));
  box.setAttribute("height", String(size[1]));
  box.setAttribute("depth", String(size[2]));
  box.setAttribute("material", options.visible
    ? `color: ${options.color || "#64748B"}; opacity: ${options.opacity ?? 1}; transparent: ${Number(options.opacity ?? 1) < 1}`
    : "color: #FFFFFF; opacity: 0.001; transparent: true; depthWrite: false");
  box.setAttribute("locomotion-collider", `type: box; size: ${positionString(size)}`);
  box.setAttribute("static-body", "shape: box");
  parent.appendChild(box);
  return box;
}

function createModel(parent, piece, asset) {
  const scale = Number(piece.scale || 1);
  const fallback = createEntity("a-box");
  fallback.setAttribute("position", `0 ${(asset.bounds.size[1] * scale * 0.5).toFixed(3)} 0`);
  fallback.setAttribute("width", String(asset.bounds.size[0] * scale));
  fallback.setAttribute("height", String(asset.bounds.size[1] * scale));
  fallback.setAttribute("depth", String(asset.bounds.size[2] * scale));
  fallback.setAttribute("color", "#2563EB");
  fallback.setAttribute("material", "opacity: 0.2; transparent: true; wireframe: true");
  fallback.setAttribute("data-course-fallback", piece.id);
  parent.appendChild(fallback);

  const model = createEntity();
  model.setAttribute("gltf-model", asset.url);
  model.setAttribute("scale", `${scale} ${scale} ${scale}`);
  model.setAttribute("data-course-model", piece.id);
  model.addEventListener("model-loaded", () => {
    fallback.setAttribute("visible", false);
    window.dispatchEvent(new CustomEvent("course-asset-loaded", { detail: { pieceId: piece.id } }));
  });
  model.addEventListener("model-error", () => {
    fallback.setAttribute("visible", true);
    window.dispatchEvent(new CustomEvent("course-asset-error", { detail: { pieceId: piece.id } }));
  });
  parent.appendChild(model);
}

function createModelPair(root, { id, assetId, position, scale = 1, profile, rotation = [0, 0, 0] }) {
  const asset = getPlatformerAsset(assetId);
  if (!asset) return null;
  const parent = createEntity();
  parent.id = id;
  parent.setAttribute("data-model-pair", profile);
  parent.setAttribute("position", positionString(position));
  parent.setAttribute("rotation", positionString(rotation));
  root.appendChild(parent);

  const visible = createEntity();
  visible.id = `${id}-visible`;
  visible.setAttribute("data-visible-model", assetId);
  visible.setAttribute("gltf-model", asset.url);
  visible.setAttribute("scale", `${scale} ${scale} ${scale}`);
  parent.appendChild(visible);

  const twin = createEntity();
  twin.id = `${id}-collision-twin`;
  twin.setAttribute("data-collision-twin", assetId);
  twin.setAttribute("gltf-model", asset.url);
  twin.setAttribute("scale", `${scale} ${scale} ${scale}`);
  twin.setAttribute("paired-model-collider", `profile: ${profile}; idPrefix: ${id}-solid; minimumDepth: ${Math.max(0.18, asset.bounds.size[2] * scale)}`);
  parent.appendChild(twin);
  return parent;
}

function addCheckpoint(pieceEntity, checkpoint) {
  const ring = createEntity("a-ring");
  ring.setAttribute("position", "0 1.025 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.72");
  ring.setAttribute("radius-outer", "0.92");
  ring.setAttribute("color", "#22C55E");
  ring.setAttribute("material", "emissive: #16A34A; emissiveIntensity: 0.45");
  ring.setAttribute("animation", "property: rotation; to: -90 360 0; loop: true; dur: 6500; easing: linear");
  pieceEntity.appendChild(ring);

  const trigger = createEntity();
  trigger.setAttribute("position", "0 1.3 0");
  trigger.setAttribute(
    "course-checkpoint-trigger",
    `rig: #player-rig; checkpointId: ${checkpoint.id}; label: ${checkpoint.label}; index: ${checkpoint.index}; spawn: ${positionString(checkpoint.spawn)}; radius: 1.45`
  );
  pieceEntity.appendChild(trigger);
}

function addFinishTrigger(pieceEntity, finish) {
  const trigger = createEntity();
  trigger.setAttribute("position", "0 1.1 0");
  trigger.setAttribute(
    "course-finish-trigger",
    `rig: #player-rig; radiusX: ${finish.radiusX}; radiusZ: ${finish.radiusZ}; minRigY: ${finish.minRigY}; maxRigY: ${finish.maxRigY}`
  );
  pieceEntity.appendChild(trigger);
}

function createGoal(root, { id, target, position, label, size = [1.45, 1.7, 1.05] }) {
  const goal = createEntity("a-box");
  goal.id = id;
  goal.setAttribute("position", positionString(position));
  goal.setAttribute("width", String(size[0]));
  goal.setAttribute("height", "0.08");
  goal.setAttribute("depth", String(size[2]));
  goal.setAttribute("color", "#FACC15");
  goal.setAttribute("material", "emissive: #A16207; emissiveIntensity: 0.55; opacity: 0.9; transparent: true");
  goal.setAttribute("push-object-goal", `target: #${target}; size: ${positionString(size)}; label: ${label}`);
  root.appendChild(goal);
  return goal;
}

function createRealPhysicsObjects(root) {
  createModelPair(root, {
    id: "ball-hoop-pair",
    assetId: "hoop-blue",
    position: [0, 1, 2.72],
    scale: 0.72,
    profile: "hoop"
  });

  const ball = createEntity("a-sphere");
  ball.id = "physics-ball";
  ball.setAttribute("data-real-physics-object", "ball");
  ball.setAttribute("position", "0 1.48 4.9");
  ball.setAttribute("radius", "0.48");
  ball.setAttribute("color", "#F59E0B");
  ball.setAttribute("material", "emissive: #B45309; emissiveIntensity: 0.28; roughness: 0.52; metalness: 0.05");
  ball.setAttribute("dynamic-body", "shape: sphere; sphereRadius: 0.48; mass: 2.4; linearDamping: 0.12; angularDamping: 0.1");
  ball.setAttribute("real-physics-hand-pusher", "leftHand: #left-hand; rightHand: #right-hand; shape: sphere; sphereRadius: 0.48; impulseScale: 0.34; maximumHandSpeed: 8; maximumImpulse: 8.5; cooldownMs: 55");
  ball.setAttribute("real-physics-reset", "minimumY: -4; minimumX: -2.1; maximumX: 2.1; minimumZ: 1.55; maximumZ: 6.1");
  root.appendChild(ball);
  createGoal(root, { id: "ball-goal", target: "physics-ball", position: [0, 1.05, 2.72], label: "BALL PHYSICS GOAL" });

  createSolidBox(root, [-1.35, 1.45, -4.6], [0.22, 0.9, 3.3], "crate-rail-left", { visible: true, color: "#64748B" });
  createSolidBox(root, [1.35, 1.45, -4.6], [0.22, 0.9, 3.3], "crate-rail-right", { visible: true, color: "#64748B" });

  const crate = createEntity("a-box");
  crate.id = "physics-crate";
  crate.setAttribute("data-real-physics-object", "crate");
  crate.setAttribute("position", "0 1.45 -3.55");
  crate.setAttribute("width", "0.9");
  crate.setAttribute("height", "0.9");
  crate.setAttribute("depth", "0.9");
  crate.setAttribute("color", "#B45309");
  crate.setAttribute("material", "roughness: 0.88; metalness: 0.03");
  crate.setAttribute("dynamic-body", "shape: box; mass: 9; linearDamping: 0.28; angularDamping: 0.34");
  crate.setAttribute("real-physics-hand-pusher", "leftHand: #left-hand; rightHand: #right-hand; shape: box; halfExtents: 0.45 0.45 0.45; impulseScale: 0.12; maximumHandSpeed: 8; maximumImpulse: 7; cooldownMs: 65");
  crate.setAttribute("real-physics-reset", "minimumY: -4; minimumX: -1.1; maximumX: 1.1; minimumZ: -6.15; maximumZ: -2.95");
  root.appendChild(crate);
  createGoal(root, { id: "crate-goal", target: "physics-crate", position: [0, 1.05, -5.55], label: "HEAVY CRATE GOAL" });
}

function createRealPipeTunnel(root) {
  for (let index = 0; index < 3; index += 1) {
    createModelPair(root, {
      id: `pipe-segment-${index + 1}`,
      assetId: "pipe-straight-blue",
      position: [0, 1, -13.95 - index * 1.45],
      scale: 1.35,
      profile: "pipe",
      rotation: [90, 0, 0]
    });
  }
}

function createArchBeamAndPillars(root) {
  createModelPair(root, {
    id: "exit-arch-pair",
    assetId: "arch-blue",
    position: [0, 1, -17.95],
    scale: 0.78,
    profile: "arch"
  });

  createSolidBox(root, [0, 1.18, -19.35], [0.72, 0.36, 4.05], "narrow-beam-collider", {
    visible: true,
    color: "#FACC15"
  });

  for (const x of [-1.42, 1.42]) {
    createSolidBox(root, [x, 2, -21.4], [0.5, 2, 0.5], `pillar-${x}`, {
      visible: true,
      color: "#475569"
    });
  }
}

function createSteppedSlope(root) {
  const baseHeight = 1;
  const risePerStep = 0.24;
  const stepDepth = 0.72;
  for (let index = 0; index < 5; index += 1) {
    const height = baseHeight + (index + 1) * risePerStep;
    const z = -23.05 - index * stepDepth;
    createSolidBox(root, [0, height * 0.5, z], [2.7, height, stepDepth], `slope-step-${index}`, {
      visible: true,
      color: index % 2 ? "#38BDF8" : "#0EA5E9"
    }).setAttribute("data-slope-step", String(index));
  }
}

function addInstructionSigns(root) {
  const signs = [
    { position: [-3.45, 2.7, 3.8], rotation: "0 90 0", text: "1. REAL 2.4 KG BALL — PUSH IT THROUGH THE KAYKIT HOOP" },
    { position: [3.45, 2.7, -4.6], rotation: "0 -90 0", text: "2. REAL 9 KG CRATE — HEAVIER, SLOWER, AND HARDER TO TURN" },
    { position: [-3.45, 2.7, -13], rotation: "0 90 0", text: "3. VISIBLE KAYKIT MODELS + INVISIBLE SOLID COLLISION TWINS" }
  ];
  for (const sign of signs) {
    const plane = createEntity("a-plane");
    plane.setAttribute("position", positionString(sign.position));
    plane.setAttribute("rotation", sign.rotation);
    plane.setAttribute("width", "5.8");
    plane.setAttribute("height", "0.9");
    plane.setAttribute("color", "#FFFFFF");
    const text = createEntity("a-text");
    text.setAttribute("value", sign.text);
    text.setAttribute("align", "center");
    text.setAttribute("width", "5.2");
    text.setAttribute("color", "#0F172A");
    text.setAttribute("position", "0 0 0.01");
    plane.appendChild(text);
    root.appendChild(plane);
  }
}

function registerSafety() {
  if (!window.AFRAME || AFRAME.components["structure-lab-safety"]) return;
  AFRAME.registerComponent("structure-lab-safety", {
    init: function () {
      this.spawn = new THREE.Vector3(INITIAL_SPAWN.x, INITIAL_SPAWN.y, INITIAL_SPAWN.z);
      this.lastReset = -Infinity;
    },
    tick: function (time) {
      if (time - this.lastReset < 260) return;
      const p = this.el.object3D.position;
      const invalid = ![p.x, p.y, p.z].every(Number.isFinite);
      const outside = p.y < -8 || p.y > 14 || Math.abs(p.x) > 12 || p.z < -35 || p.z > 14;
      if (invalid || outside) this.resetPlayer("Returned to the latest structure checkpoint");
    },
    setSpawn: function (spawn) {
      if (!spawn) return;
      const values = [Number(spawn.x), Number(spawn.y), Number(spawn.z)];
      if (values.every(Number.isFinite)) this.spawn.set(values[0], values[1], values[2]);
    },
    clearMotion: function () {
      const locomotion = this.el.components["gorilla-locomotion"];
      for (const vector of [locomotion?.velocity, locomotion?.launchVelocity, locomotion?.leftDelta, locomotion?.rightDelta, locomotion?.frameMovement]) {
        if (vector) {
          vector.x = 0;
          vector.y = 0;
          vector.z = 0;
        }
      }
      if (locomotion) {
        locomotion.pushHistory = [];
        locomotion.hasPreviousHands = false;
        locomotion.wasTouchingSurface = false;
        locomotion.wasTouchingFloor = false;
      }
    },
    resetPlayer: function (message = "Returned to checkpoint") {
      const now = performance.now();
      if (now - this.lastReset < 260) return;
      this.lastReset = now;
      this.el.object3D.position.copy(this.spawn);
      this.clearMotion();
      window.dispatchEvent(new CustomEvent("playtest-reset", { detail: { message } }));
    }
  });
}

function buildLab() {
  const root = document.getElementById("course-root");
  const rig = document.getElementById("player-rig");
  if (!root || !rig) return;
  root.innerHTML = "";

  for (const piece of LAB_MANIFEST.pieces) {
    const asset = getPlatformerAsset(piece.assetId);
    if (!asset) continue;
    const pieceEntity = createEntity();
    pieceEntity.id = piece.id;
    pieceEntity.setAttribute("data-course-piece", piece.id);
    pieceEntity.setAttribute("position", positionString(piece.position));
    root.appendChild(pieceEntity);
    createModel(pieceEntity, piece, asset);
    for (const collider of piece.colliders || []) {
      createSolidBox(pieceEntity, collider.position, collider.size, `${piece.id}-platform`);
    }
    if (piece.checkpoint) addCheckpoint(pieceEntity, piece.checkpoint);
    if (piece.finish) addFinishTrigger(pieceEntity, piece.finish);
  }

  createRealPhysicsObjects(root);
  createRealPipeTunnel(root);
  createArchBeamAndPillars(root);
  createSteppedSlope(root);
  addInstructionSigns(root);

  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("structure-lab-safety", "");
  window.funFunCourseManifest = LAB_MANIFEST;
  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: LAB_VERSION,
      baseColliderCount: root.querySelectorAll("[locomotion-collider]").length,
      pairedModelCount: root.querySelectorAll("[data-collision-twin]").length,
      dynamicBodyCount: root.querySelectorAll("[data-real-physics-object]").length,
      goalCount: root.querySelectorAll("[push-object-goal]").length,
      spawn: { ...INITIAL_SPAWN }
    }
  }));

  const scene = root.sceneEl;
  if (scene?.hasLoaded) refreshLocomotionColliders();
  else scene?.addEventListener("loaded", refreshLocomotionColliders, { once: true });
}

function setupLifecycle() {
  const scene = document.querySelector("a-scene");
  const rig = document.getElementById("player-rig");
  const note = document.getElementById("note");
  const status = document.getElementById("course-status");
  const details = document.getElementById("course-details");
  const worldStatus = document.getElementById("world-status");
  const restartButton = document.getElementById("restart-course");
  if (!scene || !rig || !note || !status || !details || !worldStatus || !restartButton) return;

  const state = { checkpoint: 0, goals: new Set(), contacts: 0, pairedReady: 0, completed: false, startedAt: 0 };
  const setStatus = (message, mode = "ready") => {
    status.textContent = message;
    status.dataset.state = mode;
  };
  const setWorld = (message) => worldStatus.setAttribute("value", message);
  const updateDetails = () => {
    details.textContent = `Checkpoint ${state.checkpoint}/3 • Physics goals ${state.goals.size}/2 • Hand impulses ${state.contacts} • Collision twins ${state.pairedReady}/${LAB_MANIFEST.expectedPairedModels}`;
  };

  function restartLab() {
    state.checkpoint = 0;
    state.goals.clear();
    state.contacts = 0;
    state.completed = false;
    state.startedAt = 0;
    document.querySelectorAll("[course-checkpoint-trigger]").forEach((entity) => {
      const component = entity.components["course-checkpoint-trigger"];
      if (component) component.activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((entity) => {
      const component = entity.components["course-finish-trigger"];
      if (component) component.completed = false;
    });
    rig.components["structure-lab-safety"]?.setSpawn(INITIAL_SPAWN);
    window.dispatchEvent(new CustomEvent("course-request-reset", { detail: { spawn: { ...INITIAL_SPAWN } } }));
    rig.components["structure-lab-safety"]?.resetPlayer("Real physics and collision-twin lab restarted");
    setStatus("Lab restarted. Rigid bodies, goals, and checkpoints were restored.", "ready");
    setWorld("Real physics lab ready");
    updateDetails();
  }

  async function waitForCollisionTwins(timeoutMs = 10000) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      const ready = document.querySelectorAll("[data-collision-twin-proxy]").length;
      if (ready >= LAB_MANIFEST.expectedPairedProxies) return ready;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return document.querySelectorAll("[data-collision-twin-proxy]").length;
  }

  async function preflight() {
    const pairedProxyCount = await waitForCollisionTwins();
    refreshLocomotionColliders();
    const problems = [];
    const colliders = document.querySelectorAll("[locomotion-collider]");
    const dynamicBodies = document.querySelectorAll("[data-real-physics-object][dynamic-body]");
    const goals = document.querySelectorAll("[push-object-goal]");
    const modelPairs = document.querySelectorAll("[data-model-pair]");
    const twins = document.querySelectorAll("[data-collision-twin]");
    if (window.__LOCOMOTION_LOAD_FAILED__ || !AFRAME.components["gorilla-locomotion"]) problems.push("Gorilla locomotion did not load");
    if (!AFRAME.components["dynamic-body"] || !scene.systems?.physics) problems.push("Cannon rigid-body physics did not load");
    if (!AFRAME.components["real-physics-hand-pusher"]) problems.push("real hand impulse component is missing");
    if (!AFRAME.components["paired-model-collider"]) problems.push("collision-twin component is missing");
    if (dynamicBodies.length !== LAB_MANIFEST.dynamicBodyCount) problems.push(`expected ${LAB_MANIFEST.dynamicBodyCount} dynamic bodies, found ${dynamicBodies.length}`);
    if (goals.length !== LAB_MANIFEST.goalCount) problems.push(`expected ${LAB_MANIFEST.goalCount} goals, found ${goals.length}`);
    if (modelPairs.length !== LAB_MANIFEST.expectedPairedModels || twins.length !== LAB_MANIFEST.expectedPairedModels) problems.push("visible/invisible model pairs are incomplete");
    if (pairedProxyCount !== LAB_MANIFEST.expectedPairedProxies) problems.push(`expected ${LAB_MANIFEST.expectedPairedProxies} solid twin proxies, found ${pairedProxyCount}`);
    if (colliders.length !== LAB_MANIFEST.expectedFinalColliders) problems.push(`expected ${LAB_MANIFEST.expectedFinalColliders} final colliders, found ${colliders.length}`);

    if (problems.length) {
      note.textContent = `Lab preflight failed: ${problems.join("; ")}`;
      note.dataset.state = "error";
      setStatus("Fix the reported setup error before entering VR.", "error");
      setWorld("LAB SETUP ERROR");
      return;
    }

    state.pairedReady = LAB_MANIFEST.expectedPairedModels;
    note.textContent = "Real physics and collision-twin lab passed preflight. Enter VR and compare the light ball, heavy crate, and smooth KayKit structures.";
    note.dataset.state = "ready";
    setStatus("Lab ready: real weighted physics and five visible/invisible model pairs.", "ready");
    setWorld("Enter VR to test real physics and collision twins");
    updateDetails();

    if (window.isSecureContext && navigator.xr?.isSessionSupported) {
      try {
        const supported = await navigator.xr.isSessionSupported("immersive-vr");
        if (!supported) {
          note.textContent = "Lab checks passed, but this browser does not report immersive VR. Use Meta Quest Browser.";
          note.dataset.state = "warning";
        }
      } catch {
        note.dataset.state = "warning";
      }
    }
  }

  window.addEventListener("paired-collider-ready", () => {
    state.pairedReady = Math.min(LAB_MANIFEST.expectedPairedModels, state.pairedReady + 1);
    updateDetails();
  });
  window.addEventListener("course-checkpoint", (event) => {
    const index = Number(event.detail?.index || 0);
    if (index <= state.checkpoint) return;
    state.checkpoint = index;
    rig.components["structure-lab-safety"]?.setSpawn(event.detail?.spawn);
    setStatus(`${event.detail?.label || "Checkpoint"} activated.`, "ready");
    setWorld(`Checkpoint ${index}/3 active`);
    updateDetails();
  });
  window.addEventListener("push-goal-complete", (event) => {
    state.goals.add(event.detail?.goalId || "goal");
    setStatus(`${event.detail?.label || "Physics goal"} completed.`, "ready");
    setWorld(`Physics goals ${state.goals.size}/2 complete`);
    updateDetails();
  });
  window.addEventListener("pushable-contact", (event) => {
    state.contacts += 1;
    const mass = Number(event.detail?.mass || 0).toFixed(1);
    setStatus(`${event.detail?.hand || "Hand"} impulse applied to ${event.detail?.objectId || "object"} (${mass} kg).`, "ready");
    updateDetails();
  });
  window.addEventListener("playtest-reset", (event) => {
    setStatus(event.detail?.message || "Returned to checkpoint", "warning");
  });
  window.addEventListener("course-finish", () => {
    if (state.completed) return;
    state.completed = true;
    const elapsed = state.startedAt ? (performance.now() - state.startedAt) / 1000 : 0;
    setStatus(`Real physics and collision-twin lab clear in ${elapsed.toFixed(1)} seconds.`, "ready");
    setWorld("PHYSICS + COLLISION TWINS CLEAR");
  });
  scene.addEventListener("enter-vr", () => {
    document.body.classList.add("vr-active");
    if (!state.startedAt) state.startedAt = performance.now();
  });
  scene.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));
  restartButton.addEventListener("click", restartLab);

  if (scene.hasLoaded) window.setTimeout(preflight, 150);
  else scene.addEventListener("loaded", () => window.setTimeout(preflight, 150), { once: true });
}

registerGeneratedComponents();
registerSafety();

function start() {
  buildLab();
  setupLifecycle();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
