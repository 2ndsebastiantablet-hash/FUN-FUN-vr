import { getPlatformerAsset } from "./assets/platformer/registry.js";
import {
  generateAdvancedExtensionPlan,
  readAdvancedRequest
} from "./advanced-integrated-modules.js";
import "./hazard-retune-v2.js";
import "./real-physics-objects.js";
import "./solid-physics-hands.js";
import "./physics-interactions.js";

const PLATFORM_STEP = 4.2;
const BUILD = "20260729-advanced-integrated-v1";
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createEntity(tag = "a-entity") {
  return document.createElement(tag);
}

function positionString(values) {
  return values.map((value) => finiteNumber(value).toFixed(3)).join(" ");
}

function refreshLocomotion() {
  const locomotion = document.getElementById("player-rig")?.components?.["gorilla-locomotion"];
  if (locomotion) locomotion.colliders = Array.from(document.querySelectorAll("[locomotion-collider]"));
}

function createPlatform(root, { id, z, physicsFloor = false }) {
  const platform = createEntity();
  platform.id = id;
  platform.setAttribute("data-advanced-platform", id);
  platform.setAttribute("position", `0 0 ${z}`);
  root.appendChild(platform);

  const asset = getPlatformerAsset("platform-square-blue");
  if (asset) {
    const model = createEntity();
    model.setAttribute("gltf-model", asset.url);
    model.setAttribute("data-course-model", id);
    platform.appendChild(model);
  } else {
    const fallback = createEntity("a-box");
    fallback.setAttribute("position", "0 0.5 0");
    fallback.setAttribute("width", "4");
    fallback.setAttribute("height", "1");
    fallback.setAttribute("depth", "4");
    fallback.setAttribute("color", "#0EA5E9");
    platform.appendChild(fallback);
  }

  PLATFORM_COLLIDERS.forEach((collider, index) => {
    const solid = createEntity();
    solid.setAttribute("position", positionString(collider.position));
    solid.setAttribute("locomotion-collider", `type: box; size: ${positionString(collider.size)}`);
    solid.setAttribute("data-advanced-collider", `${id}-${index}`);
    if (physicsFloor) solid.setAttribute("static-body", "shape: box");
    platform.appendChild(solid);
  });
  return platform;
}

function createCheckpoint(platform, index, label) {
  const ring = createEntity("a-ring");
  ring.setAttribute("position", "0 1.025 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.72");
  ring.setAttribute("radius-outer", "0.92");
  ring.setAttribute("color", "#22C55E");
  ring.setAttribute("material", "emissive: #15803D; emissiveIntensity: 0.55");
  platform.appendChild(ring);

  const trigger = createEntity();
  trigger.setAttribute("position", "0 1.25 0");
  const world = platform.object3D.position;
  trigger.setAttribute(
    "advanced-checkpoint-trigger",
    `rig: #player-rig; checkpointId: advanced-${index}; label: ${label}; index: ${index}; spawn: ${world.x} 0.12 ${world.z}; radius: 1.45`
  );
  platform.appendChild(trigger);
}

function registerAdvancedCheckpoint() {
  if (!window.AFRAME || AFRAME.components["advanced-checkpoint-trigger"]) return;
  AFRAME.registerComponent("advanced-checkpoint-trigger", {
    schema: {
      rig: { type: "selector" },
      checkpointId: { default: "" },
      label: { default: "Advanced checkpoint" },
      index: { default: 6 },
      spawn: { type: "vec3" },
      radius: { default: 1.45 }
    },
    init: function () {
      this.activated = false;
      this.center = new THREE.Vector3();
      this.onReset = () => { this.activated = false; };
      window.addEventListener("course-request-reset", this.onReset);
    },
    remove: function () {
      window.removeEventListener("course-request-reset", this.onReset);
    },
    tick: function () {
      if (this.activated || !this.data.rig?.object3D?.position) return;
      this.el.object3D.getWorldPosition(this.center);
      const p = this.data.rig.object3D.position;
      const dx = p.x - this.center.x;
      const dz = p.z - this.center.z;
      if (dx * dx + dz * dz > this.data.radius * this.data.radius || Math.abs(p.y - this.center.y) > 2.1) return;
      this.activated = true;
      window.dispatchEvent(new CustomEvent("course-checkpoint", {
        detail: {
          id: this.data.checkpointId,
          label: this.data.label,
          index: this.data.index,
          spawn: { x: this.data.spawn.x, y: this.data.spawn.y, z: this.data.spawn.z }
        }
      }));
    }
  });
}

function createSpikeStrip(root, z, config) {
  const hazard = createEntity();
  hazard.id = "advanced-spike-strip";
  hazard.setAttribute("position", `${config.spikeX} 0 ${z}`);
  hazard.setAttribute(
    "damage-volume-v2",
    "rig: #player-rig; size: 3 0.34 0.48; offset: 0 1.08 0; label: ADVANCED SPIKE CONTACT; cooldown: 900"
  );
  const base = createEntity("a-box");
  base.setAttribute("position", "0 1.03 0");
  base.setAttribute("width", "3");
  base.setAttribute("height", "0.1");
  base.setAttribute("depth", "0.48");
  base.setAttribute("color", "#DC2626");
  hazard.appendChild(base);
  for (let index = 0; index < 12; index += 1) {
    const spike = createEntity("a-cone");
    const x = -1.32 + (index % 6) * 0.53;
    const row = Math.floor(index / 6);
    spike.setAttribute("position", `${x.toFixed(2)} 1.27 ${(row ? 0.12 : -0.12).toFixed(2)}`);
    spike.setAttribute("radius-bottom", "0.105");
    spike.setAttribute("radius-top", "0");
    spike.setAttribute("height", "0.38");
    spike.setAttribute("color", "#F87171");
    hazard.appendChild(spike);
  }
  root.appendChild(hazard);
}

function createBomb(root, z, config) {
  const bomb = createEntity();
  bomb.id = "advanced-proximity-bomb";
  bomb.setAttribute("position", `${config.bombX} 1.42 ${z}`);
  bomb.setAttribute(
    "explosive-launch-hazard-v2",
    `rig: #player-rig; triggerRadius: ${config.triggerRadius}; maxVerticalDifference: 3; fuseMs: ${config.fuseMs}; cooldownMs: ${config.cooldownMs}; horizontalSpeed: 24; upwardSpeed: 12`
  );

  const body = createEntity("a-sphere");
  body.setAttribute("data-bomb-body", "true");
  body.setAttribute("radius", "0.42");
  body.setAttribute("color", "#111827");
  body.setAttribute("material", "metalness: 0.35; roughness: 0.5");
  bomb.appendChild(body);

  const detection = createEntity("a-ring");
  detection.setAttribute("data-bomb-detection", "true");
  detection.setAttribute("position", "0 -0.4 0");
  detection.setAttribute("rotation", "-90 0 0");
  detection.setAttribute("radius-inner", String(config.triggerRadius - 0.2));
  detection.setAttribute("radius-outer", String(config.triggerRadius));
  detection.setAttribute("color", "#FDBA74");
  detection.setAttribute("material", "emissive: #EA580C; emissiveIntensity: 0.55; opacity: 0.34; transparent: true");
  bomb.appendChild(detection);

  const warning = createEntity("a-ring");
  warning.setAttribute("data-bomb-warning", "true");
  warning.setAttribute("position", "0 -0.4 0");
  warning.setAttribute("rotation", "-90 0 0");
  warning.setAttribute("radius-inner", "0.75");
  warning.setAttribute("radius-outer", "1.05");
  warning.setAttribute("color", "#F97316");
  warning.setAttribute("visible", "false");
  bomb.appendChild(warning);

  const blast = createEntity("a-sphere");
  blast.setAttribute("data-bomb-blast", "true");
  blast.setAttribute("radius", "1.5");
  blast.setAttribute("material", "color: #FDE047; opacity: 0.35; transparent: true; side: double");
  blast.setAttribute("visible", "false");
  bomb.appendChild(blast);
  root.appendChild(bomb);
}

function buildHazardModule(root, state, config) {
  state.z -= PLATFORM_STEP;
  createPlatform(root, { id: "advanced-hazard-spike-platform", z: state.z });
  createSpikeStrip(root, state.z, config);
  state.z -= PLATFORM_STEP;
  createPlatform(root, { id: "advanced-hazard-bomb-platform", z: state.z });
  createBomb(root, state.z, config);
  state.z -= PLATFORM_STEP;
  return createPlatform(root, { id: "advanced-hazard-landing", z: state.z });
}

function createBridgePiece(root, z, order, config) {
  const piece = createEntity();
  piece.id = `advanced-bridge-${order}`;
  piece.setAttribute("position", `0 0.82 ${z}`);
  piece.setAttribute(
    "collapsing-bridge-piece",
    `rig: #player-rig; order: ${order}; warningMs: ${config.warningMs}; fallMs: ${config.fallMs}; hiddenMs: ${config.hiddenMs}; fallDistance: 11; chainDelayMs: ${config.chainDelayMs}`
  );
  const plank = createEntity("a-box");
  plank.setAttribute("width", "2.8");
  plank.setAttribute("height", "0.35");
  plank.setAttribute("depth", "1.22");
  plank.setAttribute("color", "#A16207");
  plank.setAttribute("material", "roughness: 0.88");
  piece.appendChild(plank);
  const collider = createEntity();
  collider.setAttribute("locomotion-collider", "type: box; size: 2.8 0.35 1.22");
  piece.appendChild(collider);
  const warning = createEntity("a-ring");
  warning.setAttribute("data-bridge-warning", "true");
  warning.setAttribute("position", "0 0.2 0");
  warning.setAttribute("rotation", "-90 0 0");
  warning.setAttribute("radius-inner", "0.8");
  warning.setAttribute("radius-outer", "1.05");
  warning.setAttribute("color", "#FACC15");
  warning.setAttribute("visible", "false");
  piece.appendChild(warning);
  root.appendChild(piece);
}

function buildBridgeModule(root, state, config) {
  state.z -= 2.1;
  for (let index = 0; index < config.count; index += 1) {
    createBridgePiece(root, state.z - index * 1.24, index, config);
  }
  state.z -= config.count * 1.24 + 2.1;
  return createPlatform(root, { id: "advanced-bridge-landing", z: state.z });
}

function createSolidBox(root, { id, position, size, color, collider = true, physics = true }) {
  const box = createEntity("a-box");
  box.id = id;
  box.setAttribute("position", positionString(position));
  box.setAttribute("width", String(size[0]));
  box.setAttribute("height", String(size[1]));
  box.setAttribute("depth", String(size[2]));
  box.setAttribute("color", color);
  if (collider) box.setAttribute("locomotion-collider", `type: box; size: ${positionString(size)}`);
  if (physics) box.setAttribute("static-body", "shape: box");
  root.appendChild(box);
  return box;
}

function buildPhysicsModule(root, state, config) {
  state.z -= PLATFORM_STEP;
  const puzzle = createPlatform(root, { id: "advanced-physics-puzzle", z: state.z, physicsFloor: true });
  state.z -= PLATFORM_STEP;
  const landing = createPlatform(root, { id: "advanced-physics-landing", z: state.z, physicsFloor: true });
  const doorZ = state.z + 2.05;

  createSolidBox(root, {
    id: "advanced-physics-rail-left",
    position: [-1.92, 1.24, state.z + 2.1],
    size: [0.18, 0.48, 8.4],
    color: "#475569"
  });
  createSolidBox(root, {
    id: "advanced-physics-rail-right",
    position: [1.92, 1.24, state.z + 2.1],
    size: [0.18, 0.48, 8.4],
    color: "#475569"
  });

  const door = createSolidBox(root, {
    id: "advanced-weight-door",
    position: [0, 2.62, doorZ],
    size: [3.5, 3.25, 0.34],
    color: "#EF4444"
  });
  door.setAttribute("physics-door", `openHeight: 4.2; speed: ${config.doorSpeed}`);

  const plate = createSolidBox(root, {
    id: "advanced-weight-plate",
    position: [config.plateX, 1.10, state.z + 3.15],
    size: [1.9, 0.18, 1.55],
    color: "#A855F7",
    collider: false,
    physics: true
  });
  plate.setAttribute(
    "weighted-pressure-plate",
    `door: #advanced-weight-door; targets: [data-advanced-weight]; size: 1.9 0.45 1.55; minimumMass: ${config.plateThreshold}; verticalTolerance: 1.25`
  );

  const block = createEntity("a-box");
  block.id = "advanced-weight-block";
  block.setAttribute("data-advanced-weight", String(config.blockMass));
  block.setAttribute("position", `${config.blockStartX} 1.48 ${state.z + 5.25}`);
  block.setAttribute("width", "0.86");
  block.setAttribute("height", "0.86");
  block.setAttribute("depth", "0.86");
  block.setAttribute("material", "color: #B45309; emissive: #78350F; emissiveIntensity: 0.12; roughness: 0.84");
  block.setAttribute("dynamic-body", `shape: box; mass: ${config.blockMass}; linearDamping: 0.25; angularDamping: 0.3`);
  block.setAttribute("physics-grabbable", "leftHand: #left-hand; rightHand: #right-hand; grabRadius: 0.75; threshold: 0.55; maxForce: 7200");
  block.setAttribute("real-physics-reset", `minimumY: -5; minimumX: -2.2; maximumX: 2.2; minimumZ: ${state.z - 1}; maximumZ: ${state.z + 7}`);
  root.appendChild(block);

  const sign = createEntity("a-plane");
  sign.setAttribute("position", `-3.15 2.7 ${state.z + 3.15}`);
  sign.setAttribute("rotation", "0 90 0");
  sign.setAttribute("width", "5.7");
  sign.setAttribute("height", "0.9");
  sign.setAttribute("color", "#FFFFFF");
  const text = createEntity("a-text");
  text.setAttribute("value", "FINAL: PUSH OR GRAB THE 7.5 KG BLOCK ONTO THE PURPLE PLATE");
  text.setAttribute("align", "center");
  text.setAttribute("width", "5.2");
  text.setAttribute("color", "#0F172A");
  text.setAttribute("position", "0 0 0.01");
  sign.appendChild(text);
  root.appendChild(sign);
  puzzle.setAttribute("data-advanced-physics-start", "true");
  return landing;
}

function addFinish(root, z) {
  const finish = createEntity();
  finish.id = "advanced-integrated-finish";
  finish.setAttribute("position", `0 2 ${z - 1.05}`);
  const asset = getPlatformerAsset("finish-wide");
  if (asset) {
    const model = createEntity();
    model.setAttribute("gltf-model", asset.url);
    model.setAttribute("scale", "0.45 0.45 0.45");
    finish.appendChild(model);
  } else {
    const bar = createEntity("a-box");
    bar.setAttribute("width", "3.5");
    bar.setAttribute("height", "0.3");
    bar.setAttribute("depth", "0.3");
    bar.setAttribute("color", "#22C55E");
    finish.appendChild(bar);
  }
  finish.setAttribute("course-finish-trigger", "rig: #player-rig; radiusX: 1.85; radiusZ: 0.75; minRigY: -1; maxRigY: 8");
  root.appendChild(finish);
}

function patchDetailsDenominator() {
  const details = document.getElementById("course-details");
  if (!details || details.dataset.advancedObserver === "true") return;
  details.dataset.advancedObserver = "true";
  let rewriting = false;
  const rewrite = () => {
    if (rewriting) return;
    const next = details.textContent.replace(/checkpoint (\d+)\/5/i, "checkpoint $1/8");
    if (next !== details.textContent) {
      rewriting = true;
      details.textContent = next;
      rewriting = false;
    }
  };
  new MutationObserver(rewrite).observe(details, { childList: true, characterData: true, subtree: true });
  rewrite();
}

function interceptAdvancedNavigation(plan) {
  const courseUrl = (seed) => `${location.pathname}?seed=${encodeURIComponent(seed)}&build=${BUILD}`;
  const seedInput = document.getElementById("seed-input");
  document.getElementById("load-seed")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = courseUrl(seedInput?.value || plan.seed);
  }, true);
  document.getElementById("copy-seed-link")?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const url = new URL(courseUrl(seedInput?.value || plan.seed), location.origin).href;
    try { await navigator.clipboard.writeText(url); } catch { /* existing UI reports copy failures */ }
  }, true);
}

function installExtension(event) {
  if (window.funFunAdvancedExtensionInstalled) return;
  const root = document.getElementById("course-root");
  const rig = document.getElementById("player-rig");
  if (!root || !rig) return;
  window.funFunAdvancedExtensionInstalled = true;

  const request = readAdvancedRequest();
  const plan = generateAdvancedExtensionPlan(request.seed);
  const summary = event.detail || {};
  const oldFinish = document.getElementById("integrated-finish");
  oldFinish?.remove();

  const state = { z: finiteNumber(summary.minimumZ, -55), checkpoint: 5 };
  for (const module of plan.modules) {
    let landing;
    if (module.id === "hazard") landing = buildHazardModule(root, state, module);
    else if (module.id === "bridge") landing = buildBridgeModule(root, state, module);
    else landing = buildPhysicsModule(root, state, module);
    state.checkpoint += 1;
    createCheckpoint(landing, state.checkpoint, `${module.id.toUpperCase()} module clear`);
  }
  addFinish(root, state.z);
  rig.components?.["integrated-lab-safety"]?.setBounds?.(state.z);
  refreshLocomotion();

  Object.assign(summary, {
    advanced: true,
    advancedChecksum: plan.checksum,
    advancedOrder: [...plan.order],
    advancedPlatformCount: root.querySelectorAll("[data-advanced-platform]").length,
    advancedCheckpointCount: root.querySelectorAll("[advanced-checkpoint-trigger]").length,
    bombCount: root.querySelectorAll("[explosive-launch-hazard-v2]").length,
    spikeCount: root.querySelectorAll("[damage-volume-v2]").length,
    bridgePieceCount: root.querySelectorAll("[collapsing-bridge-piece]").length,
    weightedPlateCount: root.querySelectorAll("[weighted-pressure-plate]").length,
    physicsDoorCount: root.querySelectorAll("[physics-door]").length,
    minimumZ: state.z
  });
  window.funFunAdvancedPlan = plan;

  window.addEventListener("hazard-player-reset", (hazardEvent) => {
    rig.components?.["integrated-lab-safety"]?.resetPlayer?.(hazardEvent.detail?.reason || "Hazard reset");
  });
  window.addEventListener("weighted-plate-changed", (plateEvent) => {
    const status = document.getElementById("course-status");
    if (!status) return;
    const weight = finiteNumber(plateEvent.detail?.weight).toFixed(1);
    status.textContent = plateEvent.detail?.active
      ? `Final weighted door opened at ${weight} kg.`
      : `Final weighted door closed at ${weight} kg.`;
    status.dataset.state = plateEvent.detail?.active ? "ready" : "warning";
  });

  patchDetailsDenominator();
  interceptAdvancedNavigation(plan);
  const note = document.getElementById("note");
  if (note) note.textContent = `Building advanced seed ${plan.seed}: core mechanics plus ${plan.order.join(" → ")}.`;
  window.dispatchEvent(new CustomEvent("advanced-course-extended", { detail: { plan, summary } }));
}

registerAdvancedCheckpoint();
window.addEventListener("course-built", installExtension);
