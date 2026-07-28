import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import "./hazard-pack.js";

const LAB_VERSION = "hazard-batch-lab-v1";
const INITIAL_SPAWN = Object.freeze({ x: 0, y: 0.12, z: 8 });
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);

const LAB_MANIFEST = Object.freeze({
  version: LAB_VERSION,
  pieces: Object.freeze([
    { id: "hazard-start", assetId: "platform-square-blue", position: [0, 0, 8], colliders: PLATFORM_COLLIDERS },
    { id: "damage-platform", assetId: "platform-square-blue", position: [0, 0, 3.8], colliders: PLATFORM_COLLIDERS },
    {
      id: "hazard-checkpoint-one", assetId: "platform-square-blue", position: [0, 0, -0.4], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "hazard-checkpoint-1", label: "Damage checkpoint", index: 1, spawn: [0, 0.12, -0.4] }
    },
    { id: "bomb-platform", assetId: "platform-square-blue", position: [0, 0, -4.6], colliders: PLATFORM_COLLIDERS },
    {
      id: "hazard-checkpoint-two", assetId: "platform-square-blue", position: [0, 0, -8.8], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "hazard-checkpoint-2", label: "Explosion checkpoint", index: 2, spawn: [0, 0.12, -8.8] }
    },
    { id: "bridge-approach", assetId: "platform-square-blue", position: [0, 0, -13], colliders: PLATFORM_COLLIDERS },
    {
      id: "hazard-checkpoint-three", assetId: "platform-square-blue", position: [0, 0, -25.2], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "hazard-checkpoint-3", label: "Bridge checkpoint", index: 3, spawn: [0, 0.12, -25.2] }
    },
    { id: "hazard-finish-platform", assetId: "platform-square-blue", position: [0, 0, -29.4], colliders: PLATFORM_COLLIDERS },
    {
      id: "hazard-finish-gate", assetId: "finish-wide", position: [0, 1, -30.5], scale: 0.45,
      finish: { radiusX: 1.85, radiusZ: 0.75, minRigY: -0.3, maxRigY: 4.6 }
    }
  ]),
  bridgePieces: 6,
  expectedColliderCount: 22,
  checkpointCount: 3,
  hazardCount: 1,
  bombCount: 1
});

function positionString(values) {
  return values.map((value) => Number(value).toFixed(3)).join(" ");
}

function createEntity(tag = "a-entity") {
  return document.createElement(tag);
}

function createCollider(parent, definition, id) {
  const collider = createEntity();
  collider.setAttribute("data-course-collider", id);
  collider.setAttribute("position", positionString(definition.position));
  collider.setAttribute("locomotion-collider", `type: box; size: ${positionString(definition.size)}`);
  parent.appendChild(collider);
}

function createModel(parent, piece, asset) {
  const scale = Number(piece.scale || 1);
  const fallback = createEntity("a-box");
  fallback.setAttribute("position", `0 ${(asset.bounds.size[1] * scale * 0.5).toFixed(3)} 0`);
  fallback.setAttribute("width", String(asset.bounds.size[0] * scale));
  fallback.setAttribute("height", String(asset.bounds.size[1] * scale));
  fallback.setAttribute("depth", String(asset.bounds.size[2] * scale));
  fallback.setAttribute("color", "#2563EB");
  fallback.setAttribute("material", "opacity: 0.22; transparent: true; wireframe: true");
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

function createDamageStrip(root) {
  const hazard = createEntity();
  hazard.id = "red-damage-strip";
  hazard.setAttribute("position", "0 1.02 3.8");
  hazard.setAttribute("damage-volume", "rig: #player-rig; size: 3.5 1.15 0.9; label: RED DAMAGE STRIP; cooldown: 900");

  const visual = createEntity("a-box");
  visual.setAttribute("width", "3.5");
  visual.setAttribute("height", "0.12");
  visual.setAttribute("depth", "0.9");
  visual.setAttribute("color", "#EF4444");
  visual.setAttribute("material", "emissive: #B91C1C; emissiveIntensity: 0.9; opacity: 0.96; transparent: true");
  visual.setAttribute("animation", "property: material.emissiveIntensity; from: 0.45; to: 1.2; dir: alternate; loop: true; dur: 420");
  hazard.appendChild(visual);

  for (let x = -1.35; x <= 1.35; x += 0.45) {
    const spike = createEntity("a-cone");
    spike.setAttribute("position", `${x.toFixed(2)} 0.24 0`);
    spike.setAttribute("radius-bottom", "0.12");
    spike.setAttribute("radius-top", "0");
    spike.setAttribute("height", "0.42");
    spike.setAttribute("color", "#FCA5A5");
    hazard.appendChild(spike);
  }
  root.appendChild(hazard);
}

function createBomb(root) {
  const bomb = createEntity();
  bomb.id = "proximity-bomb";
  bomb.setAttribute("position", "1.05 1.42 -4.6");
  bomb.setAttribute(
    "explosive-launch-hazard",
    "rig: #player-rig; triggerRadius: 1.55; fuseMs: 520; cooldownMs: 3200; horizontalSpeed: 24; upwardSpeed: 12"
  );

  const body = createEntity("a-sphere");
  body.setAttribute("data-bomb-body", "true");
  body.setAttribute("radius", "0.46");
  body.setAttribute("color", "#111827");
  body.setAttribute("material", "metalness: 0.55; roughness: 0.34; emissive: #7C2D12; emissiveIntensity: 0.22");
  bomb.appendChild(body);

  const fuse = createEntity("a-cylinder");
  fuse.setAttribute("position", "0 0.48 0");
  fuse.setAttribute("radius", "0.055");
  fuse.setAttribute("height", "0.32");
  fuse.setAttribute("color", "#FBBF24");
  bomb.appendChild(fuse);

  const warning = createEntity("a-ring");
  warning.setAttribute("data-bomb-warning", "true");
  warning.setAttribute("position", "0 -0.4 0");
  warning.setAttribute("rotation", "-90 0 0");
  warning.setAttribute("radius-inner", "1.25");
  warning.setAttribute("radius-outer", "1.5");
  warning.setAttribute("color", "#F97316");
  warning.setAttribute("material", "emissive: #EA580C; emissiveIntensity: 0.9; opacity: 0.9; transparent: true");
  warning.setAttribute("visible", false);
  bomb.appendChild(warning);

  const blast = createEntity("a-sphere");
  blast.setAttribute("data-bomb-blast", "true");
  blast.setAttribute("radius", "2.2");
  blast.setAttribute("color", "#FDE047");
  blast.setAttribute("material", "emissive: #F97316; emissiveIntensity: 1.3; opacity: 0.42; transparent: true; side: double");
  blast.setAttribute("visible", false);
  bomb.appendChild(blast);
  root.appendChild(bomb);
}

function createBridge(root) {
  const startZ = -16.1;
  const spacing = 1.35;
  for (let index = 0; index < LAB_MANIFEST.bridgePieces; index += 1) {
    const plank = createEntity();
    plank.id = `collapsing-bridge-${index + 1}`;
    plank.setAttribute("position", `0 0.88 ${(startZ - index * spacing).toFixed(3)}`);
    plank.setAttribute(
      "collapsing-bridge-piece",
      `rig: #player-rig; order: ${index}; warningMs: 260; fallMs: 480; hiddenMs: 2100; fallDistance: 11; chainDelayMs: 110`
    );
    plank.setAttribute("data-bridge-piece", String(index));

    const visual = createEntity("a-box");
    visual.setAttribute("width", "2.8");
    visual.setAttribute("height", "0.35");
    visual.setAttribute("depth", "1.22");
    visual.setAttribute("color", index % 2 ? "#92400E" : "#B45309");
    visual.setAttribute("material", "roughness: 0.9; metalness: 0.02");
    plank.appendChild(visual);

    const collider = createEntity();
    collider.setAttribute("position", "0 0 0");
    collider.setAttribute("locomotion-collider", "type: box; size: 2.8 0.35 1.22");
    collider.setAttribute("data-bridge-collider", String(index));
    plank.appendChild(collider);

    const warning = createEntity("a-ring");
    warning.setAttribute("data-bridge-warning", "true");
    warning.setAttribute("position", "0 0.205 0");
    warning.setAttribute("rotation", "-90 0 0");
    warning.setAttribute("radius-inner", "0.42");
    warning.setAttribute("radius-outer", "0.58");
    warning.setAttribute("color", "#FDE047");
    warning.setAttribute("material", "emissive: #F59E0B; emissiveIntensity: 1; opacity: 0.95; transparent: true");
    warning.setAttribute("visible", false);
    plank.appendChild(warning);
    root.appendChild(plank);
  }
}

function addInstructionSigns(root) {
  const signs = [
    { position: [-3.4, 2.65, 3.8], rotation: "0 90 0", text: "1. JUMP THE RED STRIP — TOUCHING IT RESETS YOU" },
    { position: [3.4, 2.65, -4.6], rotation: "0 -90 0", text: "2. ORANGE RING = BOMB FUSE — MOVE AWAY FAST" },
    { position: [-3.4, 2.65, -13], rotation: "0 90 0", text: "3. THE ENTIRE BRIDGE COLLAPSES IN A CHAIN" }
  ];
  for (const sign of signs) {
    const plane = createEntity("a-plane");
    plane.setAttribute("position", positionString(sign.position));
    plane.setAttribute("rotation", sign.rotation);
    plane.setAttribute("width", "5.6");
    plane.setAttribute("height", "0.9");
    plane.setAttribute("color", "#FFFFFF");
    const text = createEntity("a-text");
    text.setAttribute("value", sign.text);
    text.setAttribute("align", "center");
    text.setAttribute("width", "5.1");
    text.setAttribute("color", "#0F172A");
    text.setAttribute("position", "0 0 0.01");
    plane.appendChild(text);
    root.appendChild(plane);
  }
}

function registerSafety() {
  if (!window.AFRAME || AFRAME.components["hazard-lab-safety"]) return;
  AFRAME.registerComponent("hazard-lab-safety", {
    init: function () {
      this.spawn = new THREE.Vector3(INITIAL_SPAWN.x, INITIAL_SPAWN.y, INITIAL_SPAWN.z);
      this.lastReset = -Infinity;
      this.onHazard = (event) => this.resetPlayer(event.detail?.reason || "Hazard contact", event.detail?.color || "#EF4444");
      window.addEventListener("hazard-player-reset", this.onHazard);
    },
    remove: function () {
      window.removeEventListener("hazard-player-reset", this.onHazard);
    },
    tick: function (time) {
      if (time - this.lastReset < 260) return;
      const p = this.el.object3D.position;
      const invalid = ![p.x, p.y, p.z].every(Number.isFinite);
      const outside = p.y < -8 || p.y > 16 || Math.abs(p.x) > 18 || p.z < -36 || p.z > 14;
      if (invalid || outside) this.resetPlayer("Out of bounds — checkpoint recovery", "#38BDF8");
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
        locomotion.wasTwoHandTouchingFloor = false;
      }
    },
    resetPlayer: function (message = "Returned to checkpoint", color = "#FFFFFF") {
      const now = performance.now();
      if (now - this.lastReset < 260) return;
      this.lastReset = now;
      this.el.object3D.position.copy(this.spawn);
      this.clearMotion();
      window.dispatchEvent(new CustomEvent("playtest-reset", {
        detail: { message, color, spawn: { x: this.spawn.x, y: this.spawn.y, z: this.spawn.z } }
      }));
    }
  });
}

function buildLab() {
  const root = document.getElementById("course-root");
  const rig = document.getElementById("player-rig");
  if (!root || !rig) return;
  root.innerHTML = "";

  let expectedModels = 0;
  for (const piece of LAB_MANIFEST.pieces) {
    const asset = getPlatformerAsset(piece.assetId);
    if (!asset) continue;
    expectedModels += 1;
    const pieceEntity = createEntity();
    pieceEntity.id = piece.id;
    pieceEntity.setAttribute("data-course-piece", piece.id);
    pieceEntity.setAttribute("position", positionString(piece.position));
    root.appendChild(pieceEntity);
    createModel(pieceEntity, piece, asset);
    for (const collider of piece.colliders || []) createCollider(pieceEntity, collider, `${piece.id}-collider`);
    if (piece.checkpoint) addCheckpoint(pieceEntity, piece.checkpoint);
    if (piece.finish) addFinishTrigger(pieceEntity, piece.finish);
  }

  createDamageStrip(root);
  createBomb(root);
  createBridge(root);
  addInstructionSigns(root);
  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("hazard-lab-safety", "");
  window.funFunCourseManifest = LAB_MANIFEST;
  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: LAB_VERSION,
      expectedModels,
      colliderCount: root.querySelectorAll("[locomotion-collider]").length,
      hazardCount: root.querySelectorAll("[damage-volume]").length,
      bombCount: root.querySelectorAll("[explosive-launch-hazard]").length,
      bridgeCount: root.querySelectorAll("[collapsing-bridge-piece]").length,
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

  const state = {
    checkpoint: 0,
    resets: 0,
    explosions: 0,
    bridgeStarts: 0,
    completed: false,
    startedAt: 0,
    loadedModels: 0,
    failedModels: 0
  };

  function setStatus(message, mode = "ready") {
    status.textContent = message;
    status.dataset.state = mode;
  }

  function setWorld(message) {
    worldStatus.setAttribute("value", message);
  }

  function updateDetails() {
    details.textContent = `Checkpoint ${state.checkpoint}/3 • Resets ${state.resets} • Explosions ${state.explosions} • Bridge chains ${state.bridgeStarts}`;
  }

  function restartLab() {
    state.checkpoint = 0;
    state.resets = 0;
    state.explosions = 0;
    state.bridgeStarts = 0;
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
    rig.components["hazard-lab-safety"]?.setSpawn(INITIAL_SPAWN);
    window.dispatchEvent(new CustomEvent("course-request-reset", { detail: { spawn: { ...INITIAL_SPAWN } } }));
    rig.components["hazard-lab-safety"]?.resetPlayer("Hazard batch lab restarted", "#FFFFFF");
    setStatus("Lab restarted. All hazards, the bomb, and bridge pieces were reset.", "ready");
    setWorld("Hazard batch lab ready");
    updateDetails();
  }

  async function preflight() {
    const problems = [];
    const colliders = document.querySelectorAll("[locomotion-collider]");
    const hazards = document.querySelectorAll("[damage-volume]");
    const bombs = document.querySelectorAll("[explosive-launch-hazard]");
    const bridge = document.querySelectorAll("[collapsing-bridge-piece]");
    if (window.__LOCOMOTION_LOAD_FAILED__ || !AFRAME.components["gorilla-locomotion"]) problems.push("Gorilla locomotion did not load");
    if (!AFRAME.components["damage-volume"]) problems.push("damage-volume component is missing");
    if (!AFRAME.components["explosive-launch-hazard"]) problems.push("explosive hazard component is missing");
    if (!AFRAME.components["collapsing-bridge-piece"]) problems.push("bridge component is missing");
    if (!AFRAME.components["respawn-flash"]) problems.push("respawn feedback component is missing");
    if (colliders.length !== LAB_MANIFEST.expectedColliderCount) problems.push(`expected ${LAB_MANIFEST.expectedColliderCount} colliders, found ${colliders.length}`);
    if (hazards.length !== LAB_MANIFEST.hazardCount) problems.push(`expected ${LAB_MANIFEST.hazardCount} hazard volume`);
    if (bombs.length !== LAB_MANIFEST.bombCount) problems.push(`expected ${LAB_MANIFEST.bombCount} bomb`);
    if (bridge.length !== LAB_MANIFEST.bridgePieces) problems.push(`expected ${LAB_MANIFEST.bridgePieces} bridge pieces, found ${bridge.length}`);

    if (problems.length) {
      note.textContent = `Lab preflight failed: ${problems.join("; ")}`;
      note.dataset.state = "error";
      setStatus("Fix the reported setup error before entering VR.", "error");
      setWorld("LAB SETUP ERROR");
      return;
    }

    refreshLocomotionColliders();
    note.textContent = "Hazard batch lab passed preflight. Enter VR and test damage, explosion, collapsing bridge, and respawn feedback.";
    note.dataset.state = "ready";
    setStatus("Lab ready: four systems in one route.", "ready");
    setWorld("Enter VR to test the hazard batch");
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

  window.addEventListener("course-checkpoint", (event) => {
    const index = Number(event.detail?.index || 0);
    if (index <= state.checkpoint) return;
    state.checkpoint = index;
    rig.components["hazard-lab-safety"]?.setSpawn(event.detail?.spawn);
    setStatus(`${event.detail?.label || "Checkpoint"} activated.`, "ready");
    setWorld(`Checkpoint ${index}/3 active`);
    updateDetails();
  });

  window.addEventListener("playtest-reset", (event) => {
    state.resets += 1;
    setStatus(event.detail?.message || "Returned to checkpoint", "warning");
    setWorld("Respawn feedback triggered");
    updateDetails();
  });

  window.addEventListener("hazard-explosion", () => {
    state.explosions += 1;
    setStatus("Bomb detonated — launch force applied.", "warning");
    updateDetails();
  });

  window.addEventListener("hazard-bridge-start", () => {
    state.bridgeStarts += 1;
    setStatus("Bridge collapse chain started.", "warning");
    updateDetails();
  });

  window.addEventListener("course-finish", () => {
    if (state.completed) return;
    state.completed = true;
    const elapsed = state.startedAt ? (performance.now() - state.startedAt) / 1000 : 0;
    setStatus(`Hazard batch clear in ${elapsed.toFixed(1)} seconds.`, "ready");
    setWorld("HAZARD BATCH CLEAR");
  });

  scene.addEventListener("enter-vr", () => {
    document.body.classList.add("vr-active");
    if (!state.startedAt) state.startedAt = performance.now();
  });
  scene.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));
  restartButton.addEventListener("click", restartLab);
  window.addEventListener("course-asset-loaded", () => { state.loadedModels += 1; });
  window.addEventListener("course-asset-error", () => { state.failedModels += 1; });

  if (scene.hasLoaded) window.setTimeout(preflight, 120);
  else scene.addEventListener("loaded", () => window.setTimeout(preflight, 120), { once: true });
}

registerGeneratedComponents();
registerSafety();

function start() {
  buildLab();
  setupLifecycle();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
