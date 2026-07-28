import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import "./interaction-switch.js";

const LAB_VERSION = "interaction-lab-v1";
const INITIAL_SPAWN = { x: 0, y: 0.12, z: 8 };
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);

const LAB_MANIFEST = {
  version: LAB_VERSION,
  pieces: [
    { id: "interaction-start", assetId: "platform-square-blue", position: [0, 0, 8], colliders: PLATFORM_COLLIDERS },
    { id: "button-platform", assetId: "platform-square-blue", position: [0, 0, 3.8], colliders: PLATFORM_COLLIDERS },
    {
      id: "interaction-checkpoint-one", assetId: "platform-square-blue", position: [0, 0, -0.4], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "interaction-checkpoint-1", label: "Button gate checkpoint", index: 1, spawn: [0, 0.12, -0.4] }
    },
    { id: "lever-platform", assetId: "platform-square-blue", position: [0, 0, -4.6], colliders: PLATFORM_COLLIDERS },
    {
      id: "interaction-checkpoint-two", assetId: "platform-square-blue", position: [0, 0, -8.8], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "interaction-checkpoint-2", label: "Lever gate checkpoint", index: 2, spawn: [0, 0.12, -8.8] }
    },
    { id: "interaction-finish-platform", assetId: "platform-square-blue", position: [0, 0, -13], colliders: PLATFORM_COLLIDERS },
    {
      id: "interaction-finish-gate", assetId: "finish-wide", position: [0, 1, -14.1], scale: 0.45,
      finish: { radiusX: 1.85, radiusZ: 0.75, minRigY: -0.3, maxRigY: 4.6 }
    }
  ],
  expectedColliderCount: 14,
  checkpointCount: 2,
  switchCount: 2,
  gateCount: 2
};

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
  fallback.setAttribute("material", "opacity: 0.25; transparent: true; wireframe: true");
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
  ring.setAttribute("material", "emissive: #16A34A; emissiveIntensity: 0.4");
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

function createGate(root, { id, position, color }) {
  const gate = createEntity();
  gate.id = id;
  gate.setAttribute("position", positionString(position));
  gate.setAttribute("switch-target-gate", "openOffsetY: 4.8; duration: 650; startsOpen: false");
  gate.setAttribute("data-switch-gate", id);

  const visual = createEntity("a-box");
  visual.setAttribute("width", "3.8");
  visual.setAttribute("height", "3.6");
  visual.setAttribute("depth", "0.5");
  visual.setAttribute("color", color);
  visual.setAttribute("material", `emissive: ${color}; emissiveIntensity: 0.25; opacity: 0.9; transparent: true`);
  gate.appendChild(visual);

  const collider = createEntity();
  collider.setAttribute("locomotion-collider", "type: box; size: 3.8 3.6 0.5");
  collider.setAttribute("data-gate-collider", id);
  gate.appendChild(collider);

  root.appendChild(gate);
}

function createFloorButton(root) {
  const button = createEntity();
  button.id = "floor-button";
  button.setAttribute("position", "0 0.12 3.8");
  button.setAttribute(
    "quest-switch",
    "type: button; targetId: button-gate; mode: toggle; rig: #player-rig; leftHand: #left-hand; rightHand: #right-hand; pressureRadius: 0.9; radius: 0.8; cooldown: 450"
  );

  const base = createEntity("a-cylinder");
  base.setAttribute("position", "0 0.82 0");
  base.setAttribute("radius", "0.68");
  base.setAttribute("height", "0.18");
  base.setAttribute("color", "#5B21B6");
  button.appendChild(base);

  const press = createEntity("a-cylinder");
  press.setAttribute("data-switch-press", "true");
  press.setAttribute("position", "0 0.94 0");
  press.setAttribute("radius", "0.5");
  press.setAttribute("height", "0.18");
  press.setAttribute("color", "#C084FC");
  press.setAttribute("material", "emissive: #7E22CE; emissiveIntensity: 0.65");
  button.appendChild(press);

  const indicator = createEntity("a-sphere");
  indicator.setAttribute("data-switch-indicator", "true");
  indicator.setAttribute("position", "0 1.28 0");
  indicator.setAttribute("radius", "0.12");
  button.appendChild(indicator);
  root.appendChild(button);
}

function createLever(root) {
  const lever = createEntity();
  lever.id = "hand-lever";
  lever.setAttribute("position", "0 1.48 -4.6");
  lever.setAttribute(
    "quest-switch",
    "type: lever; targetId: lever-gate; mode: toggle; rig: #player-rig; leftHand: #left-hand; rightHand: #right-hand; radius: 0.85; cooldown: 500"
  );

  const pedestal = createEntity("a-box");
  pedestal.setAttribute("position", "0 -0.45 0");
  pedestal.setAttribute("width", "0.75");
  pedestal.setAttribute("height", "0.9");
  pedestal.setAttribute("depth", "0.7");
  pedestal.setAttribute("color", "#475569");
  lever.appendChild(pedestal);

  const handle = createEntity();
  handle.setAttribute("data-lever-handle", "true");
  const rod = createEntity("a-cylinder");
  rod.setAttribute("position", "0 0.42 0");
  rod.setAttribute("radius", "0.09");
  rod.setAttribute("height", "0.95");
  rod.setAttribute("color", "#F59E0B");
  handle.appendChild(rod);
  const knob = createEntity("a-sphere");
  knob.setAttribute("position", "0 0.9 0");
  knob.setAttribute("radius", "0.2");
  knob.setAttribute("color", "#FDE047");
  knob.setAttribute("material", "emissive: #CA8A04; emissiveIntensity: 0.5");
  handle.appendChild(knob);
  lever.appendChild(handle);

  const indicator = createEntity("a-sphere");
  indicator.setAttribute("data-switch-indicator", "true");
  indicator.setAttribute("position", "0.42 0 0");
  indicator.setAttribute("radius", "0.12");
  lever.appendChild(indicator);
  root.appendChild(lever);
}

function addInstructionSigns(root) {
  const signs = [
    { position: [-3.35, 2.55, 3.8], rotation: "0 90 0", text: "1. STAND ON THE PURPLE BUTTON" },
    { position: [3.35, 2.55, -4.6], rotation: "0 -90 0", text: "2. PUT A HAND NEAR THE LEVER — PRESS TRIGGER OR GRIP" }
  ];
  for (const sign of signs) {
    const plane = createEntity("a-plane");
    plane.setAttribute("position", positionString(sign.position));
    plane.setAttribute("rotation", sign.rotation);
    plane.setAttribute("width", "5.4");
    plane.setAttribute("height", "0.9");
    plane.setAttribute("color", "#FFFFFF");
    const text = createEntity("a-text");
    text.setAttribute("value", sign.text);
    text.setAttribute("align", "center");
    text.setAttribute("width", "5");
    text.setAttribute("color", "#0F172A");
    text.setAttribute("position", "0 0 0.01");
    plane.appendChild(text);
    root.appendChild(plane);
  }
}

function registerSafety() {
  if (!window.AFRAME || AFRAME.components["interaction-lab-safety"]) return;
  AFRAME.registerComponent("interaction-lab-safety", {
    init: function () {
      this.spawn = new THREE.Vector3(INITIAL_SPAWN.x, INITIAL_SPAWN.y, INITIAL_SPAWN.z);
      this.lastReset = -Infinity;
    },
    tick: function () {
      const p = this.el.object3D.position;
      if (![p.x, p.y, p.z].every(Number.isFinite) || p.y < -8 || p.y > 12 || Math.abs(p.x) > 11 || p.z < -20 || p.z > 14) {
        this.resetPlayer("Returned to latest interaction checkpoint");
      }
    },
    setSpawn: function (spawn) {
      if (!spawn) return;
      const values = [Number(spawn.x), Number(spawn.y), Number(spawn.z)];
      if (values.every(Number.isFinite)) this.spawn.set(...values);
    },
    clearMotion: function () {
      const locomotion = this.el.components["gorilla-locomotion"];
      locomotion?.velocity?.set?.(0, 0, 0);
      locomotion?.launchVelocity?.set?.(0, 0, 0);
      if (locomotion) {
        locomotion.pushHistory = [];
        locomotion.hasPreviousHands = false;
        locomotion.wasTouchingSurface = false;
        locomotion.wasTouchingFloor = false;
      }
    },
    resetPlayer: function (message = "Returned to checkpoint") {
      const now = performance.now();
      if (now - this.lastReset < 300) return;
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
    for (const collider of piece.colliders || []) createCollider(pieceEntity, collider, `${piece.id}-collider`);
    if (piece.checkpoint) addCheckpoint(pieceEntity, piece.checkpoint);
    if (piece.finish) addFinishTrigger(pieceEntity, piece.finish);
  }

  createGate(root, { id: "button-gate", position: [0, 1.8, 1.7], color: "#7C3AED" });
  createGate(root, { id: "lever-gate", position: [0, 1.8, -6.7], color: "#F59E0B" });
  createFloorButton(root);
  createLever(root);
  addInstructionSigns(root);

  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("interaction-lab-safety", "");
  window.funFunCourseManifest = LAB_MANIFEST;
  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: LAB_VERSION,
      colliderCount: root.querySelectorAll("[locomotion-collider]").length,
      switchCount: root.querySelectorAll("[quest-switch]").length,
      gateCount: root.querySelectorAll("[switch-target-gate]").length
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

  const state = { checkpoint: 0, activeSwitches: new Set(), completed: false };
  const updateDetails = () => {
    details.textContent = `Checkpoint ${state.checkpoint}/2 • Switches ${state.activeSwitches.size}/2 • Gates 2 • ${LAB_VERSION}`;
  };
  const safety = () => rig.components["interaction-lab-safety"];

  function restartLab() {
    state.checkpoint = 0;
    state.activeSwitches.clear();
    state.completed = false;
    document.querySelectorAll("[course-checkpoint-trigger]").forEach((entity) => {
      if (entity.components["course-checkpoint-trigger"]) entity.components["course-checkpoint-trigger"].activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((entity) => {
      if (entity.components["course-finish-trigger"]) entity.components["course-finish-trigger"].completed = false;
    });
    safety()?.setSpawn(INITIAL_SPAWN);
    window.dispatchEvent(new CustomEvent("course-request-reset", { detail: { spawn: INITIAL_SPAWN } }));
    safety()?.resetPlayer("Interaction lab restarted");
    status.textContent = "Lab restarted. Both gates are closed.";
    status.dataset.state = "ready";
    worldStatus.setAttribute("value", "Button and lever lab ready");
    updateDetails();
  }

  window.addEventListener("lab-switch-changed", (event) => {
    if (event.detail?.source === "initial" || event.detail?.source === "reset") return;
    if (event.detail?.active) state.activeSwitches.add(event.detail.switchId);
    else state.activeSwitches.delete(event.detail.switchId);
    status.textContent = `${event.detail.type === "lever" ? "Lever" : "Button"} ${event.detail.active ? "activated — gate opening" : "deactivated — gate closing"}.`;
    status.dataset.state = "ready";
    worldStatus.setAttribute("value", event.detail.active ? "Gate opening" : "Gate closing");
    updateDetails();
  });

  window.addEventListener("course-checkpoint-reached", (event) => {
    const index = Number(event.detail?.index || 0);
    if (index <= state.checkpoint) return;
    state.checkpoint = index;
    safety()?.setSpawn(event.detail?.spawn);
    status.textContent = `Checkpoint ${index} reached.`;
    updateDetails();
  });

  window.addEventListener("course-finished", () => {
    if (state.completed) return;
    state.completed = true;
    status.textContent = "Button and lever lab complete.";
    status.dataset.state = "ready";
    worldStatus.setAttribute("value", "INTERACTION LAB COMPLETE");
  });

  window.addEventListener("playtest-reset", (event) => {
    status.textContent = event.detail?.message || "Returned to checkpoint";
    status.dataset.state = "warning";
  });

  restartButton.addEventListener("click", restartLab);
  scene.addEventListener("enter-vr", () => document.body.classList.add("vr-active"));
  scene.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));

  window.setTimeout(async () => {
    const problems = [];
    const colliders = document.querySelectorAll("[locomotion-collider]");
    const switches = document.querySelectorAll("[quest-switch]");
    const gates = document.querySelectorAll("[switch-target-gate]");
    if (window.__LOCOMOTION_LOAD_FAILED__ || !AFRAME.components["gorilla-locomotion"]) problems.push("Gorilla locomotion did not load");
    if (!AFRAME.components["quest-switch"]) problems.push("quest-switch component is missing");
    if (!AFRAME.components["switch-target-gate"]) problems.push("switch-target-gate component is missing");
    if (colliders.length !== LAB_MANIFEST.expectedColliderCount) problems.push(`expected ${LAB_MANIFEST.expectedColliderCount} colliders, found ${colliders.length}`);
    if (switches.length !== LAB_MANIFEST.switchCount) problems.push(`expected ${LAB_MANIFEST.switchCount} switches, found ${switches.length}`);
    if (gates.length !== LAB_MANIFEST.gateCount) problems.push(`expected ${LAB_MANIFEST.gateCount} gates, found ${gates.length}`);

    if (problems.length) {
      note.textContent = `Lab preflight failed: ${problems.join("; ")}`;
      note.dataset.state = "error";
      status.textContent = "Fix the reported setup error before entering VR.";
      status.dataset.state = "error";
      return;
    }

    rig.components["gorilla-locomotion"].colliders = Array.from(colliders);
    note.textContent = "Button-and-lever lab passed preflight. Enter VR and test both interactions.";
    note.dataset.state = "ready";
    status.textContent = "Lab ready: pressure button, controller lever, and two moving gates.";
    status.dataset.state = "ready";
    worldStatus.setAttribute("value", "Enter VR to test switches");
    updateDetails();

    if (window.isSecureContext && navigator.xr?.isSessionSupported) {
      try {
        if (!await navigator.xr.isSessionSupported("immersive-vr")) note.dataset.state = "warning";
      } catch {
        note.dataset.state = "warning";
      }
    }
  }, 900);
}

registerGeneratedComponents();
registerSafety();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { buildLab(); setupLifecycle(); }, { once: true });
} else {
  buildLab();
  setupLifecycle();
}
