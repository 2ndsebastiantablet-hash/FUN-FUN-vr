import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import {
  generateIntegratedPlan,
  normalizeIntegratedSeed,
  randomIntegratedSeed,
  readIntegratedRequest
} from "./integrated-procedural-modules.js";
import "./moving-platform.js";
import "./falling-platform.js";
import "./timed-platform.js";
import "./rotating-obstacle.js";
import "./rotating-overdrive.js";
import "./interaction-switch.js";
import "./lever-input-fix.js";

const BUILD = "20260729-integrated-procedural-v1";
const INITIAL_SPAWN = Object.freeze({ x: 0, y: 0.12, z: 8 });
const PLATFORM_STEP = 4.2;
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);

function positionString(values) {
  return values.map((value) => Number(value).toFixed(3)).join(" ");
}

function createEntity(tag = "a-entity") {
  return document.createElement(tag);
}

function createPlatform(root, { id, x = 0, y = 0, z, color = "#0EA5E9", dynamic = "" }) {
  const platform = createEntity();
  platform.id = id;
  platform.setAttribute("data-integrated-platform", id);
  platform.setAttribute("position", positionString([x, y, z]));
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
    fallback.setAttribute("color", color);
    platform.appendChild(fallback);
  }

  for (let index = 0; index < PLATFORM_COLLIDERS.length; index += 1) {
    const collider = PLATFORM_COLLIDERS[index];
    const solid = createEntity();
    solid.setAttribute("data-integrated-collider", `${id}-${index}`);
    solid.setAttribute("position", positionString(collider.position));
    solid.setAttribute("locomotion-collider", `type: box; size: ${positionString(collider.size)}`);
    platform.appendChild(solid);
  }

  if (dynamic) platform.setAttribute(dynamic, "");
  return platform;
}

function addWarningRing(parent, dataAttribute, color) {
  const ring = createEntity("a-ring");
  ring.setAttribute(dataAttribute, "true");
  ring.setAttribute("position", "0 1.025 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.76");
  ring.setAttribute("radius-outer", "0.96");
  ring.setAttribute("color", color);
  ring.setAttribute("material", `emissive: ${color}; emissiveIntensity: 0.6; opacity: 0.9; transparent: true`);
  ring.setAttribute("visible", false);
  parent.appendChild(ring);
}

function addCheckpoint(platform, index, label) {
  const ring = createEntity("a-ring");
  ring.setAttribute("position", "0 1.025 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.72");
  ring.setAttribute("radius-outer", "0.92");
  ring.setAttribute("color", "#22C55E");
  ring.setAttribute("material", "emissive: #15803D; emissiveIntensity: 0.5");
  platform.appendChild(ring);

  const trigger = createEntity();
  trigger.setAttribute("position", "0 1.25 0");
  const p = platform.object3D.position;
  trigger.setAttribute(
    "course-checkpoint-trigger",
    `rig: #player-rig; checkpointId: integrated-${index}; label: ${label}; index: ${index}; spawn: ${p.x} ${p.y + 0.12} ${p.z}; radius: 1.45`
  );
  platform.appendChild(trigger);
}

function createGate(root, { id, z, color }) {
  const gate = createEntity();
  gate.id = id;
  gate.setAttribute("position", `0 2.8 ${z}`);
  gate.setAttribute("switch-target-gate", "openOffsetY: 5.1; duration: 620; startsOpen: false");
  gate.setAttribute("data-integrated-gate", id);

  const visual = createEntity("a-box");
  visual.setAttribute("width", "3.75");
  visual.setAttribute("height", "3.6");
  visual.setAttribute("depth", "0.42");
  visual.setAttribute("material", `color: ${color}; emissive: ${color}; emissiveIntensity: 0.28; opacity: 0.92; transparent: true`);
  gate.appendChild(visual);

  const collider = createEntity();
  collider.setAttribute("data-gate-collider", id);
  collider.setAttribute("locomotion-collider", "type: box; size: 3.75 3.6 0.42");
  gate.appendChild(collider);
  root.appendChild(gate);
  return gate;
}

function createButton(root, { id, z, targetId }) {
  const button = createEntity();
  button.id = id;
  button.setAttribute("position", `0 0.12 ${z}`);
  button.setAttribute(
    "quest-switch",
    `type: button; targetId: ${targetId}; mode: toggle; rig: #player-rig; leftHand: #left-hand; rightHand: #right-hand; pressureRadius: 0.9; radius: 0.8; cooldown: 450`
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
  return button;
}

function createLever(root, { z, targetId }) {
  const lever = createEntity();
  lever.id = "hand-lever";
  lever.setAttribute("position", `0 1.48 ${z}`);
  lever.setAttribute(
    "quest-switch",
    `type: lever; targetId: ${targetId}; mode: toggle; rig: #player-rig; leftHand: #left-hand; rightHand: #right-hand; radius: 0.9; cooldown: 500`
  );
  lever.setAttribute(
    "quest-lever-gamepad-fallback",
    "target: #hand-lever; leftHand: #left-hand; rightHand: #right-hand; threshold: 0.55"
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
  return lever;
}

function createRotator(root, { id, z, config }) {
  const rotator = createEntity();
  rotator.id = id;
  rotator.setAttribute("position", `0 2.8 ${z}`);
  rotator.setAttribute(
    "rotating-obstacle",
    `rig: #player-rig; degreesPerSecond: ${config.degreesPerSecond}; phaseDegrees: ${config.phaseDegrees}; barCount: 1; barLength: 6.2; barWidth: 0.58; barHeight: 5.6; knockbackSpeed: 26; upwardSpeed: 10; hitCooldown: 1400`
  );
  const bar = createEntity("a-box");
  bar.setAttribute("data-rotating-bar", "true");
  bar.setAttribute("width", "6.2");
  bar.setAttribute("height", "5.6");
  bar.setAttribute("depth", "0.58");
  bar.setAttribute("color", "#EF4444");
  bar.setAttribute("material", "emissive: #991B1B; emissiveIntensity: 0.7; metalness: 0.2; roughness: 0.42");
  rotator.appendChild(bar);
  const post = createEntity("a-cylinder");
  post.setAttribute("position", "0 -1.95 0");
  post.setAttribute("height", "3.9");
  post.setAttribute("radius", "0.3");
  post.setAttribute("color", "#7F1D1D");
  rotator.appendChild(post);
  root.appendChild(rotator);
  return rotator;
}

function moduleMoving(root, state, config) {
  state.z -= PLATFORM_STEP;
  const distance = config.distance;
  const baseX = -config.direction * distance * 0.5;
  const platform = createPlatform(root, { id: `moving-${state.index}`, x: baseX, z: state.z });
  platform.setAttribute(
    "moving-platform",
    `rig: #player-rig; axis: ${config.direction} 0 0; distance: ${distance}; duration: ${config.duration}; phase: ${config.phase}; verticalTolerance: 0.22; edgePadding: 0.1`
  );
  state.z -= PLATFORM_STEP;
  return createPlatform(root, { id: `moving-landing-${state.index}`, z: state.z });
}

function moduleFragile(root, state, config) {
  for (let index = 0; index < config.count; index += 1) {
    state.z -= PLATFORM_STEP;
    const platform = createPlatform(root, { id: `fragile-${state.index}-${index}`, z: state.z });
    addWarningRing(platform, "data-falling-warning", "#FACC15");
    platform.setAttribute(
      "falling-platform",
      `rig: #player-rig; warningDelay: ${config.warningDelay}; fallDuration: ${config.fallDuration}; resetDelay: ${config.resetDelay}; fallDistance: 11`
    );
  }
  state.z -= PLATFORM_STEP;
  return createPlatform(root, { id: `fragile-landing-${state.index}`, z: state.z });
}

function moduleTimed(root, state, config) {
  for (let index = 0; index < config.count; index += 1) {
    state.z -= PLATFORM_STEP;
    const platform = createPlatform(root, { id: `timed-${state.index}-${index}`, z: state.z });
    addWarningRing(platform, "data-timed-warning", "#F97316");
    platform.setAttribute(
      "timed-platform",
      `rig: #player-rig; solidDuration: ${config.solidDuration}; warningDuration: ${config.warningDuration}; hiddenDuration: ${config.hiddenDuration}; phase: ${config.phases[index]}; startDelay: 900`
    );
  }
  state.z -= PLATFORM_STEP;
  return createPlatform(root, { id: `timed-landing-${state.index}`, z: state.z });
}

function moduleRotating(root, state, config) {
  state.z -= PLATFORM_STEP;
  const arena = createPlatform(root, { id: `rotating-arena-${state.index}`, z: state.z });
  createRotator(root, { id: `rotator-${state.index}`, z: state.z, config });
  state.z -= PLATFORM_STEP;
  return createPlatform(root, { id: `rotating-landing-${state.index}`, z: state.z });
}

function moduleSwitch(root, state, config) {
  const controls = config.firstControl === "button" ? ["button", "lever"] : ["lever", "button"];
  for (let index = 0; index < controls.length; index += 1) {
    state.z -= PLATFORM_STEP;
    const platform = createPlatform(root, { id: `switch-${controls[index]}-${state.index}`, z: state.z });
    const targetId = `integrated-gate-${state.index}-${index}`;
    createGate(root, { id: targetId, z: state.z - 1.65, color: index === 0 ? "#DC2626" : "#EA580C" });
    if (controls[index] === "button") createButton(root, { id: `floor-button-${state.index}`, z: state.z + 0.65, targetId });
    else createLever(root, { z: state.z + 0.45, targetId });
    platform.setAttribute("data-switch-control", controls[index]);
  }
  state.z -= PLATFORM_STEP;
  return createPlatform(root, { id: `switch-landing-${state.index}`, z: state.z });
}

const MODULE_BUILDERS = Object.freeze({
  moving: moduleMoving,
  fragile: moduleFragile,
  timed: moduleTimed,
  rotating: moduleRotating,
  switch: moduleSwitch
});

function addFinish(root, z) {
  const asset = getPlatformerAsset("finish-wide");
  const finish = createEntity();
  finish.id = "integrated-finish";
  finish.setAttribute("position", `0 2 ${z - 1.05}`);
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

function registerSafety() {
  if (!window.AFRAME || AFRAME.components["integrated-lab-safety"]) return;
  AFRAME.registerComponent("integrated-lab-safety", {
    init: function () {
      this.spawn = new THREE.Vector3(INITIAL_SPAWN.x, INITIAL_SPAWN.y, INITIAL_SPAWN.z);
      this.minZ = -120;
      this.lastReset = -Infinity;
    },
    setBounds: function (minZ) {
      if (Number.isFinite(Number(minZ))) this.minZ = Number(minZ) - 8;
    },
    setSpawn: function (spawn) {
      if (!spawn) return;
      const values = [Number(spawn.x), Number(spawn.y), Number(spawn.z)];
      if (values.every(Number.isFinite)) this.spawn.set(...values);
    },
    clearMotion: function () {
      const locomotion = this.el.components["gorilla-locomotion"];
      for (const vector of [locomotion?.velocity, locomotion?.launchVelocity, locomotion?.leftDelta, locomotion?.rightDelta, locomotion?.frameMovement]) {
        vector?.set?.(0, 0, 0);
      }
      if (locomotion) {
        locomotion.pushHistory = [];
        locomotion.hasPreviousHands = false;
        locomotion.wasTouchingSurface = false;
        locomotion.wasTouchingFloor = false;
        locomotion.grounded = false;
      }
    },
    resetPlayer: function (message = "Returned to latest integrated checkpoint") {
      const now = performance.now();
      if (now - this.lastReset < 260) return;
      this.lastReset = now;
      this.el.object3D.position.copy(this.spawn);
      this.clearMotion();
      window.dispatchEvent(new CustomEvent("integrated-player-reset", { detail: { message } }));
    },
    tick: function () {
      const p = this.el.object3D.position;
      const invalid = ![p.x, p.y, p.z].every(Number.isFinite);
      if (invalid || p.y < -8 || p.y > 18 || Math.abs(p.x) > 15 || p.z < this.minZ || p.z > 15) this.resetPlayer();
    }
  });
}

function buildCourse(plan) {
  const root = document.getElementById("course-root");
  const rig = document.getElementById("player-rig");
  if (!root || !rig) return null;
  root.innerHTML = "";
  const state = { z: INITIAL_SPAWN.z, index: 0 };
  createPlatform(root, { id: "integrated-start", z: state.z });

  for (const module of plan.modules) {
    state.index += 1;
    const builder = MODULE_BUILDERS[module.id];
    const landing = builder(root, state, module);
    addCheckpoint(landing, state.index, `${module.id.toUpperCase()} module clear`);
  }
  addFinish(root, state.z);

  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("integrated-lab-safety", "");
  rig.components["integrated-lab-safety"]?.setBounds(state.z);
  refreshLocomotionColliders();

  const summary = {
    seed: plan.seed,
    checksum: plan.checksum,
    order: [...plan.order],
    minimumZ: state.z,
    platformCount: root.querySelectorAll("[data-integrated-platform]").length,
    movingCount: root.querySelectorAll("[moving-platform]").length,
    fragileCount: root.querySelectorAll("[falling-platform]").length,
    timedCount: root.querySelectorAll("[timed-platform]").length,
    rotatingCount: root.querySelectorAll("[rotating-obstacle]").length,
    switchCount: root.querySelectorAll("[quest-switch]").length,
    gateCount: root.querySelectorAll("[data-integrated-gate]").length
  };
  window.funFunIntegratedPlan = plan;
  window.dispatchEvent(new CustomEvent("course-built", { detail: summary }));
  return summary;
}

function setupPage(plan, summary) {
  const scene = document.querySelector("a-scene");
  const rig = document.getElementById("player-rig");
  const note = document.getElementById("note");
  const status = document.getElementById("course-status");
  const details = document.getElementById("course-details");
  const seedInput = document.getElementById("seed-input");
  const newSeedButton = document.getElementById("new-seed");
  const loadButton = document.getElementById("load-seed");
  const copyButton = document.getElementById("copy-seed-link");
  const restartButton = document.getElementById("restart-course");
  const worldStatus = document.getElementById("world-status");
  if (!scene || !rig || !note || !status || !details || !seedInput || !newSeedButton || !loadButton || !copyButton || !restartButton || !worldStatus) return;

  seedInput.value = plan.seed;
  const state = { checkpoint: 0, resets: 0, hits: 0, switches: 0, completed: false, startedAt: 0 };
  const setStatus = (message, mode = "ready") => {
    status.textContent = message;
    status.dataset.state = mode;
  };
  const updateDetails = () => {
    details.textContent = `Seed ${plan.seed} • checksum ${plan.checksum} • checkpoint ${state.checkpoint}/5 • resets ${state.resets} • wall hits ${state.hits} • switches ${state.switches}`;
  };
  const courseUrl = (seed) => `${location.pathname}?seed=${encodeURIComponent(normalizeIntegratedSeed(seed))}&build=${BUILD}`;

  function restartCourse() {
    state.checkpoint = 0;
    state.resets = 0;
    state.hits = 0;
    state.switches = 0;
    state.completed = false;
    state.startedAt = 0;
    document.querySelectorAll("[course-checkpoint-trigger]").forEach((el) => {
      if (el.components["course-checkpoint-trigger"]) el.components["course-checkpoint-trigger"].activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((el) => {
      if (el.components["course-finish-trigger"]) el.components["course-finish-trigger"].completed = false;
    });
    rig.components["integrated-lab-safety"]?.setSpawn(INITIAL_SPAWN);
    window.dispatchEvent(new CustomEvent("course-request-reset", { detail: { spawn: { ...INITIAL_SPAWN } } }));
    rig.components["integrated-lab-safety"]?.resetPlayer("Integrated course restarted");
    setStatus("Course restarted with the same seed and mechanic order.", "ready");
    worldStatus.setAttribute("value", `SEED ${plan.seed} — ${plan.order.join(" → ").toUpperCase()}`);
    updateDetails();
  }

  async function preflight() {
    await new Promise((resolve) => window.setTimeout(resolve, 750));
    refreshLocomotionColliders();
    const problems = [];
    const required = ["moving-platform", "falling-platform", "timed-platform", "rotating-obstacle", "quest-switch", "switch-target-gate"];
    for (const name of required) if (!AFRAME.components[name]) problems.push(`${name} missing`);
    if (summary.movingCount !== 1) problems.push("expected one moving platform");
    if (summary.fragileCount !== 3) problems.push("expected three fragile platforms");
    if (summary.timedCount !== 3) problems.push("expected three timed platforms");
    if (summary.rotatingCount !== 1) problems.push("expected one rotating wall");
    if (summary.switchCount !== 2 || summary.gateCount !== 2) problems.push("expected two switches and two gates");
    if (document.querySelectorAll("[course-checkpoint-trigger]").length !== 5) problems.push("expected five checkpoints");
    if (document.querySelectorAll("[locomotion-collider]").length < 20) problems.push("too few active colliders");

    if (problems.length) {
      note.textContent = `Integrated lab preflight failed: ${problems.join("; ")}`;
      note.dataset.state = "error";
      setStatus("Fix the reported setup issue before entering VR.", "error");
      worldStatus.setAttribute("value", "INTEGRATED LAB SETUP ERROR");
      return;
    }
    note.textContent = `Integrated seed ${plan.seed} passed preflight. The same seed always uses the same order, timings, directions, and phases.`;
    note.dataset.state = "ready";
    setStatus(`Ready: ${plan.order.join(" → ")}.`, "ready");
    worldStatus.setAttribute("value", `SEED ${plan.seed} — ${plan.order.join(" → ").toUpperCase()}`);
    updateDetails();
  }

  loadButton.addEventListener("click", () => { location.href = courseUrl(seedInput.value); });
  newSeedButton.addEventListener("click", () => {
    seedInput.value = randomIntegratedSeed();
    location.href = courseUrl(seedInput.value);
  });
  copyButton.addEventListener("click", async () => {
    const url = new URL(courseUrl(seedInput.value), location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Integrated course link copied.", "ready");
    } catch {
      setStatus(`Copy this address: ${url}`, "warning");
    }
  });
  restartButton.addEventListener("click", restartCourse);
  window.addEventListener("course-checkpoint", (event) => {
    const index = Number(event.detail?.index || 0);
    if (index <= state.checkpoint) return;
    state.checkpoint = index;
    rig.components["integrated-lab-safety"]?.setSpawn(event.detail?.spawn);
    setStatus(`${event.detail?.label || "Checkpoint"} activated.`, "ready");
    updateDetails();
  });
  window.addEventListener("integrated-player-reset", (event) => {
    state.resets += 1;
    setStatus(event.detail?.message || "Returned to checkpoint", "warning");
    updateDetails();
  });
  window.addEventListener("rotating-obstacle-hit", () => {
    state.hits += 1;
    setStatus("Rotating wall contact — extreme ejection applied.", "warning");
    updateDetails();
  });
  window.addEventListener("lab-switch-changed", (event) => {
    if (event.detail?.source === "initial" || event.detail?.source === "reset") return;
    state.switches += 1;
    setStatus(`${event.detail?.type || "Switch"} ${event.detail?.active ? "opened" : "closed"} its gate.`, "ready");
    updateDetails();
  });
  window.addEventListener("course-finish", () => {
    if (state.completed) return;
    state.completed = true;
    const seconds = state.startedAt ? (performance.now() - state.startedAt) / 1000 : 0;
    setStatus(`Integrated procedural clear in ${seconds.toFixed(1)} seconds.`, "ready");
    worldStatus.setAttribute("value", `INTEGRATED CLEAR — ${plan.seed}`);
  });
  scene.addEventListener("enter-vr", () => {
    document.body.classList.add("vr-active");
    if (!state.startedAt) state.startedAt = performance.now();
  });
  scene.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));

  if (scene.hasLoaded) preflight();
  else scene.addEventListener("loaded", preflight, { once: true });
}

registerGeneratedComponents();
registerSafety();

function start() {
  const plan = generateIntegratedPlan(readIntegratedRequest().seed);
  const summary = buildCourse(plan);
  if (summary) setupPage(plan, summary);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
