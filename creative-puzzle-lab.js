import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import {
  generateCreativePuzzlePlan,
  normalizeCreativeSeed,
  randomCreativeSeed,
  readCreativeRequest
} from "./creative-puzzle-plan.js";
import "./moving-platform.js";
import "./falling-platform.js";
import "./timed-platform.js";
import "./interaction-switch.js";
import "./lever-input-fix.js";
import "./real-physics-objects.js";
import "./solid-physics-hands.js";
import "./physics-interactions.js";
import "./creative-puzzle-systems.js";

const BUILD = "20260729-creative-puzzle-v1";
const INITIAL_SPAWN = Object.freeze({ x: 0, y: 0.12, z: 8 });
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function entity(tag = "a-entity") {
  return document.createElement(tag);
}

function vector(values) {
  return values.map((value) => finiteNumber(value).toFixed(3)).join(" ");
}

function createSolidBox(parent, { id, position, size, color = "#64748B", opacity = 1, collider = true, physics = true }) {
  const box = entity("a-box");
  if (id) box.id = id;
  box.setAttribute("position", vector(position));
  box.setAttribute("width", String(size[0]));
  box.setAttribute("height", String(size[1]));
  box.setAttribute("depth", String(size[2]));
  box.setAttribute("material", `color: ${color}; opacity: ${opacity}; transparent: ${opacity < 1}; roughness: 0.72`);
  if (collider) box.setAttribute("locomotion-collider", `type: box; size: ${vector(size)}`);
  if (physics) box.setAttribute("static-body", "shape: box");
  parent.appendChild(box);
  return box;
}

function createPlatform(root, { id, x = 0, y = 0, z, size = 4, color = "#0EA5E9", physics = true }) {
  const platform = entity();
  platform.id = id;
  platform.setAttribute("data-creative-platform", id);
  platform.setAttribute("position", vector([x, y, z]));
  root.appendChild(platform);

  const asset = size === 4 ? getPlatformerAsset("platform-square-blue") : null;
  if (asset) {
    const model = entity();
    model.setAttribute("gltf-model", asset.url);
    model.setAttribute("data-course-model", id);
    platform.appendChild(model);
  } else {
    createSolidBox(platform, {
      id: `${id}-visual`, position: [0, 0.5, 0], size: [size, 1, size], color, collider: false, physics: false
    });
  }

  if (size === 4) {
    PLATFORM_COLLIDERS.forEach((collider, index) => {
      createSolidBox(platform, {
        id: `${id}-collider-${index}`,
        position: collider.position,
        size: collider.size,
        color: "#FFFFFF",
        opacity: 0.001,
        physics
      });
    });
  } else {
    createSolidBox(platform, {
      id: `${id}-collider`,
      position: [0, 0.5, 0],
      size: [Math.max(0.5, size - 0.08), 1, Math.max(0.5, size - 0.08)],
      color: "#FFFFFF",
      opacity: 0.001,
      physics
    });
  }
  return platform;
}

function createDoor(root, { id, z, color = "#EF4444", speed = 3.4 }) {
  const door = createSolidBox(root, {
    id,
    position: [0, 2.62, z],
    size: [3.58, 3.25, 0.36],
    color
  });
  door.setAttribute("physics-door", `openHeight: 4.2; speed: ${speed}`);
  return door;
}

function createSign(root, { position, rotation = [0, 0, 0], text, width = 6, height = 1.1, color = "#FFFFFF" }) {
  const sign = entity("a-plane");
  sign.setAttribute("position", vector(position));
  sign.setAttribute("rotation", vector(rotation));
  sign.setAttribute("width", String(width));
  sign.setAttribute("height", String(height));
  sign.setAttribute("color", color);
  const label = entity("a-text");
  label.setAttribute("position", "0 0 0.01");
  label.setAttribute("align", "center");
  label.setAttribute("width", String(width * 0.9));
  label.setAttribute("color", "#0F172A");
  label.setAttribute("wrap-count", "44");
  label.setAttribute("value", text);
  sign.appendChild(label);
  root.appendChild(sign);
  return sign;
}

function createCheckpoint(platform, index, label, spawn) {
  const ring = entity("a-ring");
  ring.setAttribute("position", "0 1.025 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.72");
  ring.setAttribute("radius-outer", "0.92");
  ring.setAttribute("color", "#22C55E");
  ring.setAttribute("material", "emissive: #15803D; emissiveIntensity: 0.55");
  ring.setAttribute(
    "course-checkpoint-trigger",
    `rig: #player-rig; checkpointId: creative-${index}; label: ${label}; index: ${index}; spawn: ${spawn.x} ${spawn.y} ${spawn.z}; radius: 1.45`
  );
  platform.appendChild(ring);
}

function createPhysicsObject(root, { id, position, mass, shape = "box", color, size = 0.82, classes = "", label = "" }) {
  const object = entity(shape === "sphere" ? "a-sphere" : "a-box");
  object.id = id;
  object.setAttribute("position", vector(position));
  object.setAttribute("data-creative-weight", String(mass));
  object.setAttribute("data-physics-weight", String(mass));
  if (classes) for (const attribute of classes.split(" ").filter(Boolean)) object.setAttribute(attribute, "true");
  if (shape === "sphere") object.setAttribute("radius", String(size * 0.5));
  else {
    object.setAttribute("width", String(size));
    object.setAttribute("height", String(size));
    object.setAttribute("depth", String(size));
  }
  object.setAttribute("material", `color: ${color}; emissive: ${color}; emissiveIntensity: 0.08; roughness: ${shape === "sphere" ? 0.48 : 0.82}`);
  object.setAttribute(
    "dynamic-body",
    shape === "sphere"
      ? `shape: sphere; sphereRadius: ${size * 0.5}; mass: ${mass}; linearDamping: 0.14; angularDamping: 0.12`
      : `shape: box; mass: ${mass}; linearDamping: 0.24; angularDamping: 0.3`
  );
  object.setAttribute("physics-grabbable", "leftHand: #left-hand; rightHand: #right-hand; grabRadius: 0.78; threshold: 0.55; maxForce: 7600");
  object.setAttribute("real-physics-reset", "minimumY: -8; minimumX: -13; maximumX: 13; minimumZ: -58; maximumZ: 12");
  root.appendChild(object);

  if (label) {
    const text = entity("a-text");
    text.setAttribute("position", `0 ${size * 0.78} 0`);
    text.setAttribute("align", "center");
    text.setAttribute("width", "3.4");
    text.setAttribute("color", "#0F172A");
    text.setAttribute("value", label);
    object.appendChild(text);
  }
  return object;
}

function createPad(root, { id, position, color = "#A855F7", size = [1.25, 0.18, 1.25] }) {
  return createSolidBox(root, { id, position, size, color, collider: false, physics: true });
}

function createSwitchVisual(root, { id, type, position, color, targetId }) {
  const holder = entity();
  holder.id = id;
  holder.setAttribute("position", vector(position));
  holder.setAttribute(
    "quest-switch",
    `type: ${type}; targetId: ${targetId}; mode: toggle; rig: #player-rig; leftHand: #left-hand; rightHand: #right-hand; radius: 0.78; pressureRadius: 0.82; cooldown: 300`
  );

  if (type === "button") {
    const base = entity("a-cylinder");
    base.setAttribute("radius", "0.52");
    base.setAttribute("height", "0.16");
    base.setAttribute("color", "#334155");
    holder.appendChild(base);
    const press = entity("a-cylinder");
    press.setAttribute("data-switch-press", "true");
    press.setAttribute("position", "0 0.16 0");
    press.setAttribute("radius", "0.38");
    press.setAttribute("height", "0.18");
    press.setAttribute("color", color);
    holder.appendChild(press);
  } else {
    const base = entity("a-cylinder");
    base.setAttribute("radius", "0.48");
    base.setAttribute("height", "0.2");
    base.setAttribute("color", "#334155");
    holder.appendChild(base);
    const handle = entity();
    handle.setAttribute("data-lever-handle", "true");
    handle.setAttribute("position", "0 0.55 0");
    const rod = entity("a-box");
    rod.setAttribute("width", "0.16");
    rod.setAttribute("height", "0.95");
    rod.setAttribute("depth", "0.16");
    rod.setAttribute("color", color);
    handle.appendChild(rod);
    const knob = entity("a-sphere");
    knob.setAttribute("position", "0 0.52 0");
    knob.setAttribute("radius", "0.22");
    knob.setAttribute("color", color);
    handle.appendChild(knob);
    holder.appendChild(handle);
  }

  const indicator = entity("a-sphere");
  indicator.setAttribute("data-switch-indicator", "true");
  indicator.setAttribute("position", "0 1.45 0");
  indicator.setAttribute("radius", "0.13");
  indicator.setAttribute("color", "#EF4444");
  holder.appendChild(indicator);
  root.appendChild(holder);
  return holder;
}

function buildTripleLock(root, plan) {
  createPlatform(root, { id: "triple-staging", z: 3.8 });
  const lockPlatform = createPlatform(root, { id: "triple-lock-platform", z: -0.4 });
  createPhysicsObject(root, {
    id: "triple-box-left", position: [plan.tripleLockBoxSides[0] * 0.82, 1.45, 3.8], mass: 4,
    color: "#F97316", size: 0.82, classes: "data-room1-weight", label: "4 KG"
  });
  createPhysicsObject(root, {
    id: "triple-box-right", position: [plan.tripleLockBoxSides[1] * 0.82, 1.45, 3.8], mass: 4,
    color: "#EAB308", size: 0.82, classes: "data-room1-weight", label: "4 KG"
  });

  const left = createPad(root, { id: "triple-pad-left", position: [-1.18, 1.10, -0.4] });
  left.setAttribute("creative-object-pad", "objects: [data-room1-weight]; puzzleId: triple-lock; padId: left; size: 1.25 0.45 1.25; minimumMass: 3.5; verticalTolerance: 1.2");
  const center = createPad(root, { id: "triple-pad-center", position: [0, 1.10, -0.4], color: "#0EA5E9" });
  center.setAttribute("creative-player-pad", "rig: #player-rig; puzzleId: triple-lock; padId: center; size: 1.15 0.45 1.15; verticalTolerance: 1.35");
  const right = createPad(root, { id: "triple-pad-right", position: [1.18, 1.10, -0.4] });
  right.setAttribute("creative-object-pad", "objects: [data-room1-weight]; puzzleId: triple-lock; padId: right; size: 1.25 0.45 1.25; minimumMass: 3.5; verticalTolerance: 1.2");

  const door = createDoor(root, { id: "triple-lock-door", z: -2.5, color: "#DC2626" });
  const controller = entity();
  controller.setAttribute("creative-multi-lock", "puzzleId: triple-lock; requiredPads: left,center,right; door: #triple-lock-door; latchOnComplete: true");
  root.appendChild(controller);
  createSign(root, {
    position: [-3.35, 2.75, -0.4], rotation: [0, 90, 0], width: 5.8, height: 1.3,
    text: "TRIPLE LOCK\nPut one box on each purple pad, then stand on the blue pad. All three must activate together."
  });
  createCheckpoint(createPlatform(root, { id: "checkpoint-one-platform", z: -4.6 }), 1, "Triple Lock cleared", { x: 0, y: 0.12, z: -4.6 });
  return lockPlatform;
}

function createCargoSideRoute(root, item, plan) {
  const colors = { 2: "#38BDF8", 4: "#A855F7", 6: "#F59E0B", 8: "#EF4444" };
  if (item.route === "main") {
    createPhysicsObject(root, { id: item.id, position: [0, 1.45, -8.8], mass: item.mass, color: colors[item.mass], size: 0.82, classes: "data-cargo-weight", label: `${item.mass} KG` });
    return;
  }
  if (item.route === "moving") {
    const sideX = item.side * 6;
    const island = createPlatform(root, { id: "cargo-moving-island", x: sideX, z: -13, size: 3.2 });
    const shuttle = createPlatform(root, { id: "cargo-moving-shuttle", x: item.side * 1.7, z: -13, size: 2.5, physics: false });
    shuttle.setAttribute("moving-platform", `rig: #player-rig; axis: ${item.side} 0 0; distance: 4.3; duration: ${plan.movingDuration}; phase: 0; verticalTolerance: 0.24; edgePadding: 0.1`);
    createPhysicsObject(root, { id: item.id, position: [sideX, 1.45, -13], mass: item.mass, color: colors[item.mass], size: 0.82, classes: "data-cargo-weight", label: `${item.mass} KG` });
    createSign(root, { position: [sideX, 2.9, -14.7], text: `MOVING ROUTE — ${item.mass} KG`, width: 4.2, height: 0.8 });
    return island;
  }
  if (item.route === "timed") {
    const sideX = item.side * 6;
    createPlatform(root, { id: "cargo-timed-island", x: sideX, z: -17.2, size: 3.2 });
    for (let index = 0; index < 2; index += 1) {
      const x = item.side * (2.4 + index * 1.55);
      const step = createPlatform(root, { id: `cargo-timed-step-${index}`, x, z: -17.2, size: 1.45, physics: false });
      const warning = entity("a-ring");
      warning.setAttribute("data-timed-warning", "true");
      warning.setAttribute("position", "0 1.025 0");
      warning.setAttribute("rotation", "-90 0 0");
      warning.setAttribute("radius-inner", "0.42");
      warning.setAttribute("radius-outer", "0.58");
      warning.setAttribute("color", "#F97316");
      warning.setAttribute("visible", "false");
      step.appendChild(warning);
      step.setAttribute("timed-platform", `rig: #player-rig; solidDuration: ${plan.timedSolidMs}; warningDuration: 340; hiddenDuration: ${plan.timedHiddenMs}; phase: ${index * 0.45}; startDelay: 600`);
    }
    createPhysicsObject(root, { id: item.id, position: [sideX, 1.45, -17.2], mass: item.mass, color: colors[item.mass], size: 0.82, classes: "data-cargo-weight", label: `${item.mass} KG` });
    createSign(root, { position: [sideX, 2.9, -18.9], text: `TIMED ROUTE — ${item.mass} KG`, width: 4.2, height: 0.8 });
    return;
  }
  const sideX = item.side * 6;
  createPlatform(root, { id: "cargo-fragile-island", x: sideX, z: -21.4, size: 3.2 });
  for (let index = 0; index < 2; index += 1) {
    const x = item.side * (2.4 + index * 1.55);
    const step = createPlatform(root, { id: `cargo-fragile-step-${index}`, x, z: -21.4, size: 1.45, physics: false });
    const warning = entity("a-ring");
    warning.setAttribute("data-falling-warning", "true");
    warning.setAttribute("position", "0 1.025 0");
    warning.setAttribute("rotation", "-90 0 0");
    warning.setAttribute("radius-inner", "0.42");
    warning.setAttribute("radius-outer", "0.58");
    warning.setAttribute("color", "#FACC15");
    warning.setAttribute("visible", "false");
    step.appendChild(warning);
    step.setAttribute("falling-platform", `rig: #player-rig; warningDelay: ${plan.fragileWarningMs}; fallDuration: 520; resetDelay: 1800; fallDistance: 10`);
  }
  createPhysicsObject(root, { id: item.id, position: [sideX, 1.45, -21.4], mass: item.mass, color: colors[item.mass], size: item.mass === 2 ? 0.7 : 0.82, shape: item.mass === 2 ? "sphere" : "box", classes: "data-cargo-weight", label: `${item.mass} KG` });
  createSign(root, { position: [sideX, 2.9, -23.1], text: `FRAGILE ROUTE — ${item.mass} KG`, width: 4.2, height: 0.8 });
}

function buildCargoVault(root, plan) {
  [-8.8, -13, -17.2, -21.4].forEach((z, index) => createPlatform(root, { id: `cargo-main-${index}`, z }));
  plan.cargo.forEach((item) => createCargoSideRoute(root, item, plan));
  const plate = createPad(root, { id: "cargo-weight-plate", position: [0, 1.10, -21.4], size: [3.15, 0.18, 2.35] });
  plate.setAttribute("weighted-pressure-plate", `door: #cargo-vault-door; targets: [data-cargo-weight]; size: 3.15 0.5 2.35; minimumMass: ${plan.weightThreshold}; verticalTolerance: 1.3`);
  const door = createDoor(root, { id: "cargo-vault-door", z: -23.5, color: "#F97316", speed: 3.7 });
  createSign(root, {
    position: [-3.35, 3, -21.4], rotation: [0, 90, 0], width: 6.2, height: 1.5,
    text: "CARGO VAULT — NEED 14 KG\nFind 2, 4, 6, and 8 kg cargo on the main, moving, timed, and fragile routes. More than one combination works."
  });
  createCheckpoint(createPlatform(root, { id: "checkpoint-two-platform", z: -25.6 }), 2, "Cargo Vault cleared", { x: 0, y: 0.12, z: -25.6 });
  return door;
}

function buildRelay(root, plan) {
  const firstPlatform = createPlatform(root, { id: "relay-first-platform", z: -29.8 });
  const shuttle = createPlatform(root, { id: "relay-shuttle", z: -31.9, size: 2.7, physics: false });
  shuttle.setAttribute("moving-platform", `rig: #player-rig; axis: 0 0 -1; distance: 4.2; duration: ${plan.movingDuration}; phase: 0.15; verticalTolerance: 0.24; edgePadding: 0.1`);
  const secondPlatform = createPlatform(root, { id: "relay-second-platform", z: -38.2 });
  const firstType = plan.relayFirst === "relay-button" ? "button" : "lever";
  const secondType = plan.relaySecond === "relay-button" ? "button" : "lever";
  createSwitchVisual(root, { id: plan.relayFirst, type: firstType, position: [0, 1.1, -29.8], color: "#22D3EE", targetId: "relay-controller" });
  createSwitchVisual(root, { id: plan.relaySecond, type: secondType, position: [0, 1.1, -38.2], color: "#F59E0B", targetId: "relay-controller" });
  const door = createDoor(root, { id: "relay-door", z: -40.3, color: "#06B6D4", speed: 4 });
  const controller = entity();
  controller.id = "relay-controller";
  controller.setAttribute("creative-relay-controller", `firstId: ${plan.relayFirst}; secondId: ${plan.relaySecond}; windowMs: ${plan.relayWindowMs}; door: #relay-door`);
  root.appendChild(controller);
  createSign(root, {
    position: [-3.35, 3, -29.8], rotation: [0, 90, 0], width: 6.2, height: 1.45,
    text: `TIMED RELAY — ${(plan.relayWindowMs / 1000).toFixed(1)} SECONDS\nActivate ${plan.relayFirst.replace("relay-", "").toUpperCase()} first, ride the shuttle, then activate ${plan.relaySecond.replace("relay-", "").toUpperCase()}.`
  });
  createCheckpoint(createPlatform(root, { id: "checkpoint-three-platform", z: -42.4 }), 3, "Timed Relay cleared", { x: 0, y: 0.12, z: -42.4 });
  return { firstPlatform, secondPlatform };
}

function buildSequenceVault(root, plan) {
  const platform = createPlatform(root, { id: "sequence-platform", z: -46.6 });
  const controls = [
    { id: "amber", type: "button", x: -1.2, color: "#F59E0B" },
    { id: "cyan", type: "lever", x: 0, color: "#22D3EE" },
    { id: "violet", type: "button", x: 1.2, color: "#A855F7" }
  ];
  controls.forEach((control) => createSwitchVisual(root, {
    id: `sequence-${control.id}`, type: control.type, position: [control.x, 1.1, -46.6], color: control.color, targetId: "sequence-controller"
  }));
  const door = createDoor(root, { id: "sequence-door", z: -48.7, color: "#8B5CF6", speed: 4.1 });
  const controller = entity();
  controller.id = "sequence-controller";
  controller.setAttribute("creative-sequence-controller", `order: ${plan.sequence.join(",")}; door: #sequence-door`);
  root.appendChild(controller);
  createSign(root, {
    position: [0, 3.15, -46.6], width: 6.4, height: 1.2,
    text: `SEQUENCE CODE\n${plan.sequence.map((id, index) => `${index + 1}. ${id.toUpperCase()}`).join("   ")}\nA wrong control resets the code.`
  });
  const finishPlatform = createPlatform(root, { id: "creative-finish-platform", z: -50.8 });
  createCheckpoint(finishPlatform, 4, "Sequence Vault cleared", { x: 0, y: 0.12, z: -50.8 });
  const finish = entity();
  finish.id = "creative-finish";
  finish.setAttribute("position", "0 2 -51.85");
  const asset = getPlatformerAsset("finish-wide");
  if (asset) {
    const model = entity();
    model.setAttribute("gltf-model", asset.url);
    model.setAttribute("scale", "0.45 0.45 0.45");
    finish.appendChild(model);
  }
  finish.setAttribute("course-finish-trigger", "rig: #player-rig; radiusX: 1.85; radiusZ: 0.8; minRigY: -1; maxRigY: 8");
  root.appendChild(finish);
  return platform;
}

function createRouteRails(root) {
  const segments = [
    { z: -12.9, length: 21.5 },
    { z: -34.0, length: 18.5 },
    { z: -46.6, length: 8.5 }
  ];
  for (const segment of segments) {
    createSolidBox(root, { position: [-1.94, 1.28, segment.z], size: [0.16, 0.48, segment.length], color: "#475569" });
    createSolidBox(root, { position: [1.94, 1.28, segment.z], size: [0.16, 0.48, segment.length], color: "#475569" });
  }
}

function registerSafety() {
  if (!window.AFRAME || AFRAME.components["creative-course-safety"]) return;
  AFRAME.registerComponent("creative-course-safety", {
    init: function () {
      this.spawn = new THREE.Vector3(INITIAL_SPAWN.x, INITIAL_SPAWN.y, INITIAL_SPAWN.z);
      this.lastReset = -Infinity;
    },
    setSpawn: function (spawn) {
      if (!spawn) return;
      const values = [Number(spawn.x), Number(spawn.y), Number(spawn.z)];
      if (values.every(Number.isFinite)) this.spawn.set(...values);
    },
    clearMotion: function () {
      const locomotion = this.el.components["gorilla-locomotion"];
      for (const current of [locomotion?.velocity, locomotion?.launchVelocity, locomotion?.leftDelta, locomotion?.rightDelta, locomotion?.frameMovement]) current?.set?.(0, 0, 0);
      if (locomotion) {
        locomotion.pushHistory = [];
        locomotion.hasPreviousHands = false;
        locomotion.grounded = false;
      }
    },
    resetPlayer: function (message = "Returned to latest puzzle checkpoint") {
      const now = performance.now();
      if (now - this.lastReset < 260) return;
      this.lastReset = now;
      this.el.object3D.position.copy(this.spawn);
      this.clearMotion();
      window.dispatchEvent(new CustomEvent("creative-player-reset", { detail: { message } }));
    },
    tick: function () {
      const p = this.el.object3D.position;
      if (![p.x, p.y, p.z].every(Number.isFinite) || p.y < -8 || p.y > 18 || Math.abs(p.x) > 15 || p.z < -58 || p.z > 15) this.resetPlayer();
    }
  });
}

function buildCourse(plan) {
  const root = document.getElementById("course-root");
  const rig = document.getElementById("player-rig");
  if (!root || !rig) return null;
  root.innerHTML = "";
  createPlatform(root, { id: "creative-start", z: 8 });
  buildTripleLock(root, plan);
  buildCargoVault(root, plan);
  buildRelay(root, plan);
  buildSequenceVault(root, plan);
  createRouteRails(root);
  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("creative-course-safety", "");
  refreshLocomotionColliders();

  const summary = {
    seed: plan.seed,
    checksum: plan.checksum,
    checkpoints: root.querySelectorAll("[course-checkpoint-trigger]").length,
    physicsObjects: root.querySelectorAll("[data-creative-weight]").length,
    doors: root.querySelectorAll("[physics-door]").length,
    pads: root.querySelectorAll("[creative-object-pad], [creative-player-pad], [weighted-pressure-plate]").length,
    switches: root.querySelectorAll("[quest-switch]").length,
    moving: root.querySelectorAll("[moving-platform]").length,
    timed: root.querySelectorAll("[timed-platform]").length,
    fragile: root.querySelectorAll("[falling-platform]").length,
    colliders: root.querySelectorAll("[locomotion-collider]").length
  };
  window.funFunCreativePlan = plan;
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
  const loadButton = document.getElementById("load-seed");
  const newButton = document.getElementById("new-seed");
  const copyButton = document.getElementById("copy-seed-link");
  const restartButton = document.getElementById("restart-course");
  const worldStatus = document.getElementById("world-status");
  if (!scene || !rig || !note || !status || !details || !seedInput || !loadButton || !newButton || !copyButton || !restartButton || !worldStatus) return;

  seedInput.value = plan.seed;
  const state = { checkpoint: 0, resets: 0, triple: false, relay: "idle", sequence: 0, finished: false };
  const setStatus = (message, mode = "ready") => {
    status.textContent = message;
    status.dataset.state = mode;
  };
  const updateDetails = () => {
    details.textContent = `Seed ${plan.seed} • ${plan.checksum} • checkpoint ${state.checkpoint}/4 • triple ${state.triple ? "open" : "locked"} • relay ${state.relay} • sequence ${state.sequence}/3 • resets ${state.resets}`;
  };
  const urlFor = (seed) => `${location.pathname}?seed=${encodeURIComponent(normalizeCreativeSeed(seed))}&build=${BUILD}`;

  function restartCourse() {
    state.checkpoint = 0;
    state.resets = 0;
    state.triple = false;
    state.relay = "idle";
    state.sequence = 0;
    state.finished = false;
    document.querySelectorAll("[course-checkpoint-trigger]").forEach((element) => {
      if (element.components["course-checkpoint-trigger"]) element.components["course-checkpoint-trigger"].activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((element) => {
      if (element.components["course-finish-trigger"]) element.components["course-finish-trigger"].completed = false;
    });
    rig.components["creative-course-safety"]?.setSpawn(INITIAL_SPAWN);
    window.dispatchEvent(new CustomEvent("course-request-reset", { detail: { spawn: { ...INITIAL_SPAWN } } }));
    rig.components["creative-course-safety"]?.resetPlayer("Creative puzzle course restarted");
    setStatus("All boxes, pads, switches, doors, and routes were reset.", "ready");
    worldStatus.setAttribute("value", `SEED ${plan.seed} — FOUR CONNECTED PUZZLE ROOMS`);
    updateDetails();
  }

  async function preflight() {
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    refreshLocomotionColliders();
    const problems = [];
    const required = ["solid-physics-hand", "physics-grabbable", "physics-door", "creative-object-pad", "creative-player-pad", "creative-multi-lock", "creative-relay-controller", "creative-sequence-controller", "weighted-pressure-plate", "quest-switch", "moving-platform", "timed-platform", "falling-platform"];
    for (const name of required) if (!AFRAME.components[name]) problems.push(`${name} missing`);
    if (summary.checkpoints !== 4) problems.push("expected four checkpoints");
    if (summary.physicsObjects !== 6) problems.push("expected six physics objects");
    if (summary.doors !== 4) problems.push("expected four doors");
    if (summary.switches !== 5) problems.push("expected five relay/sequence controls");
    if (summary.moving < 2 || summary.timed < 2 || summary.fragile < 2) problems.push("side-route mechanics incomplete");
    if (summary.colliders < 45) problems.push("too few solid route colliders");
    if (!scene.systems?.physics) problems.push("Cannon physics missing");

    if (problems.length) {
      note.textContent = `Creative puzzle preflight failed: ${problems.join("; ")}`;
      note.dataset.state = "error";
      setStatus("Fix the setup issue before entering VR.", "error");
      worldStatus.setAttribute("value", "CREATIVE PUZZLE SETUP ERROR");
      return;
    }
    note.textContent = `Creative seed ${plan.seed} passed preflight. Four connected puzzles and multiple solutions are ready.`;
    note.dataset.state = "ready";
    setStatus("Ready: Triple Lock → Cargo Vault → Timed Relay → Sequence Vault.", "ready");
    worldStatus.setAttribute("value", `SEED ${plan.seed} — FOUR CONNECTED PUZZLE ROOMS`);
    updateDetails();
  }

  loadButton.addEventListener("click", () => { location.href = urlFor(seedInput.value); });
  newButton.addEventListener("click", () => { location.href = urlFor(randomCreativeSeed()); });
  copyButton.addEventListener("click", async () => {
    const url = new URL(urlFor(seedInput.value), location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Creative puzzle link copied.", "ready");
    } catch {
      setStatus(`Copy this address: ${url}`, "warning");
    }
  });
  restartButton.addEventListener("click", restartCourse);
  window.addEventListener("course-checkpoint", (event) => {
    const index = Number(event.detail?.index || 0);
    if (index <= state.checkpoint) return;
    state.checkpoint = index;
    rig.components["creative-course-safety"]?.setSpawn(event.detail?.spawn);
    setStatus(`${event.detail?.label || "Puzzle checkpoint"} activated.`, "ready");
    updateDetails();
  });
  window.addEventListener("creative-player-reset", (event) => {
    state.resets += 1;
    setStatus(event.detail?.message || "Returned to checkpoint", "warning");
    updateDetails();
  });
  window.addEventListener("creative-multi-lock-state", (event) => {
    state.triple = Boolean(event.detail?.completed);
    setStatus(state.triple ? "Triple Lock solved — all three pads synchronized." : "Triple Lock pads changed.", state.triple ? "ready" : "warning");
    updateDetails();
  });
  window.addEventListener("creative-relay-state", (event) => {
    state.relay = event.detail?.state || "idle";
    if (event.detail?.success) setStatus("Timed Relay solved before the clock expired.", "ready");
    else if (event.detail?.expired || event.detail?.reset) setStatus("Relay reset — activate the controls in order before time expires.", "warning");
    else setStatus(`Relay armed for ${(plan.relayWindowMs / 1000).toFixed(1)} seconds.`, "warning");
    updateDetails();
  });
  window.addEventListener("creative-sequence-state", (event) => {
    state.sequence = Number(event.detail?.progress || 0);
    if (event.detail?.completed) setStatus("Sequence Vault solved.", "ready");
    else if (event.detail?.reset) setStatus("Wrong sequence control — code reset.", "warning");
    else setStatus(`Sequence progress ${state.sequence}/3.`, "ready");
    updateDetails();
  });
  window.addEventListener("course-finish", () => {
    if (state.finished) return;
    state.finished = true;
    setStatus("CREATIVE PUZZLE EXPEDITION CLEAR", "ready");
    worldStatus.setAttribute("value", "CREATIVE PUZZLE EXPEDITION CLEAR");
  });
  scene.addEventListener("enter-vr", () => document.body.classList.add("vr-active"));
  scene.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));
  if (scene.hasLoaded) preflight();
  else scene.addEventListener("loaded", preflight, { once: true });
}

registerGeneratedComponents();
registerSafety();

function start() {
  const request = readCreativeRequest();
  const plan = generateCreativePuzzlePlan(request.seed);
  const summary = buildCourse(plan);
  if (summary) setupPage(plan, summary);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
