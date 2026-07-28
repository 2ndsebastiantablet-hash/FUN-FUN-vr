import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import { steppedSlopeDefinitions } from "./push-structure-mechanics.js";
import "./push-structure-mechanics.js";

const LAB_VERSION = "push-structure-lab-v1";
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
      checkpoint: { id: "structure-checkpoint-1", label: "Ball test checkpoint", index: 1, spawn: [0, 0.12, -0.4] }
    },
    { id: "crate-platform", assetId: "platform-square-blue", position: [0, 0, -4.6], colliders: PLATFORM_COLLIDERS },
    {
      id: "structure-checkpoint-two", assetId: "platform-square-blue", position: [0, 0, -8.8], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "structure-checkpoint-2", label: "Crate test checkpoint", index: 2, spawn: [0, 0.12, -8.8] }
    },
    { id: "tunnel-entrance", assetId: "platform-square-blue", position: [0, 0, -13], colliders: PLATFORM_COLLIDERS },
    { id: "tunnel-exit", assetId: "platform-square-blue", position: [0, 0, -17.2], colliders: PLATFORM_COLLIDERS },
    {
      id: "structure-checkpoint-three", assetId: "platform-square-blue", position: [0, 0, -21.4], colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "structure-checkpoint-3", label: "Beam checkpoint", index: 3, spawn: [0, 0.12, -21.4] }
    },
    { id: "slope-top", assetId: "platform-square-blue", position: [0, 1.2, -25.6], colliders: PLATFORM_COLLIDERS },
    { id: "structure-finish-platform", assetId: "platform-square-blue", position: [0, 1.2, -29.8], colliders: PLATFORM_COLLIDERS },
    {
      id: "structure-finish-gate", assetId: "finish-wide", position: [0, 2.2, -30.9], scale: 0.45,
      finish: { radiusX: 1.85, radiusZ: 0.75, minRigY: 0.6, maxRigY: 5.8 }
    }
  ]),
  expectedColliderCount: 40,
  checkpointCount: 3,
  pushableCount: 2,
  goalCount: 2,
  structureGroups: 6
});

function positionString(values) {
  return values.map((value) => Number(value).toFixed(3)).join(" ");
}

function createEntity(tag = "a-entity") {
  return document.createElement(tag);
}

function createCollider(parent, position, size, id) {
  const collider = createEntity();
  collider.setAttribute("data-structure-collider", id);
  collider.setAttribute("position", positionString(position));
  collider.setAttribute("locomotion-collider", `type: box; size: ${positionString(size)}`);
  parent.appendChild(collider);
  return collider;
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

function addCheckpoint(pieceEntity, checkpoint) {
  const ring = createEntity("a-ring");
  ring.setAttribute("position", "0 1.025 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.72");
  ring.setAttribute("radius-outer", "0.92");
  ring.setAttribute("color", "#22C55E");
  ring.setAttribute("material", "emissive: #16A34A; emissiveIntensity: 0.45");
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

function createArch(root, { id, position, width = 2.4, height = 2.5, color = "#8B5CF6" }) {
  const arch = createEntity();
  arch.id = id;
  arch.setAttribute("position", positionString(position));
  arch.setAttribute("data-structure-group", "arch");

  const left = createEntity("a-box");
  left.setAttribute("position", `${(-width * 0.5 - 0.18).toFixed(2)} ${(height * 0.5).toFixed(2)} 0`);
  left.setAttribute("width", "0.36");
  left.setAttribute("height", String(height));
  left.setAttribute("depth", "0.48");
  left.setAttribute("color", color);
  arch.appendChild(left);
  createCollider(arch, [-width * 0.5 - 0.18, height * 0.5, 0], [0.36, height, 0.48], `${id}-left`);

  const right = createEntity("a-box");
  right.setAttribute("position", `${(width * 0.5 + 0.18).toFixed(2)} ${(height * 0.5).toFixed(2)} 0`);
  right.setAttribute("width", "0.36");
  right.setAttribute("height", String(height));
  right.setAttribute("depth", "0.48");
  right.setAttribute("color", color);
  arch.appendChild(right);
  createCollider(arch, [width * 0.5 + 0.18, height * 0.5, 0], [0.36, height, 0.48], `${id}-right`);

  const top = createEntity("a-box");
  top.setAttribute("position", `0 ${(height + 0.18).toFixed(2)} 0`);
  top.setAttribute("width", String(width + 0.72));
  top.setAttribute("height", "0.36");
  top.setAttribute("depth", "0.48");
  top.setAttribute("color", color);
  arch.appendChild(top);
  createCollider(arch, [0, height + 0.18, 0], [width + 0.72, 0.36, 0.48], `${id}-top`);

  const torus = createEntity("a-torus");
  torus.setAttribute("position", `0 ${(height * 0.62).toFixed(2)} 0`);
  torus.setAttribute("radius", String(width * 0.56));
  torus.setAttribute("radius-tubular", "0.12");
  torus.setAttribute("color", "#C4B5FD");
  torus.setAttribute("material", "emissive: #7C3AED; emissiveIntensity: 0.45");
  arch.appendChild(torus);
  root.appendChild(arch);
}

function createPushGoal(root, { id, targetId, position, label }) {
  const goal = createEntity();
  goal.id = id;
  goal.setAttribute("position", positionString(position));
  goal.setAttribute("push-object-goal", `target: #${targetId}; size: 1.5 1.7 1.15; label: ${label}`);
  const ring = createEntity("a-ring");
  ring.setAttribute("data-goal-indicator", "true");
  ring.setAttribute("position", "0 -0.42 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.55");
  ring.setAttribute("radius-outer", "0.75");
  ring.setAttribute("color", "#FDE047");
  goal.appendChild(ring);
  const labelEntity = createEntity("a-text");
  labelEntity.setAttribute("value", label);
  labelEntity.setAttribute("position", "0 0.72 0");
  labelEntity.setAttribute("align", "center");
  labelEntity.setAttribute("width", "3.8");
  labelEntity.setAttribute("color", "#14532D");
  goal.appendChild(labelEntity);
  root.appendChild(goal);
}

function createPushables(root) {
  createArch(root, { id: "ball-hoop", position: [0, 1, 2.75], width: 1.55, height: 1.75, color: "#7C3AED" });

  const ball = createEntity("a-sphere");
  ball.id = "push-ball";
  ball.setAttribute("position", "0 1.48 4.75");
  ball.setAttribute("radius", "0.48");
  ball.setAttribute("color", "#F59E0B");
  ball.setAttribute("material", "emissive: #B45309; emissiveIntensity: 0.35; roughness: 0.55");
  ball.setAttribute(
    "deterministic-pushable",
    "leftHand: #left-hand; rightHand: #right-hand; interactionRadius: 0.82; strength: 0.92; maximumSpeed: 4.4; friction: 4.2; minimumX: -1.35; maximumX: 1.35; minimumZ: 2.55; maximumZ: 5.1; fixedY: 1.48; shape: ball"
  );
  root.appendChild(ball);
  createPushGoal(root, { id: "ball-goal", targetId: "push-ball", position: [0, 1.45, 2.75], label: "BALL GOAL" });

  const leftRail = createEntity("a-box");
  leftRail.setAttribute("position", "-1.35 1.45 -4.6");
  leftRail.setAttribute("width", "0.22");
  leftRail.setAttribute("height", "0.9");
  leftRail.setAttribute("depth", "3.25");
  leftRail.setAttribute("color", "#64748B");
  root.appendChild(leftRail);
  createCollider(root, [-1.35, 1.45, -4.6], [0.22, 0.9, 3.25], "crate-rail-left");

  const rightRail = createEntity("a-box");
  rightRail.setAttribute("position", "1.35 1.45 -4.6");
  rightRail.setAttribute("width", "0.22");
  rightRail.setAttribute("height", "0.9");
  rightRail.setAttribute("depth", "3.25");
  rightRail.setAttribute("color", "#64748B");
  root.appendChild(rightRail);
  createCollider(root, [1.35, 1.45, -4.6], [0.22, 0.9, 3.25], "crate-rail-right");

  const crate = createEntity("a-box");
  crate.id = "push-crate";
  crate.setAttribute("position", "0 1.45 -3.55");
  crate.setAttribute("width", "0.9");
  crate.setAttribute("height", "0.9");
  crate.setAttribute("depth", "0.9");
  crate.setAttribute("color", "#B45309");
  crate.setAttribute("material", "roughness: 0.88; metalness: 0.03");
  crate.setAttribute(
    "deterministic-pushable",
    "leftHand: #left-hand; rightHand: #right-hand; interactionRadius: 0.78; strength: 0.8; maximumSpeed: 3.6; friction: 5; minimumX: -0.88; maximumX: 0.88; minimumZ: -5.75; maximumZ: -3.25; fixedY: 1.45; shape: crate"
  );
  root.appendChild(crate);
  createPushGoal(root, { id: "crate-goal", targetId: "push-crate", position: [0, 1.45, -5.55], label: "CRATE GOAL" });
}

function createPipeTunnel(root) {
  const tunnel = createEntity();
  tunnel.id = "pipe-tunnel";
  tunnel.setAttribute("position", "0 0 -15.1");
  tunnel.setAttribute("data-structure-group", "pipe-tunnel");

  const walkway = createEntity("a-box");
  walkway.setAttribute("position", "0 1.08 0");
  walkway.setAttribute("width", "2.4");
  walkway.setAttribute("height", "0.18");
  walkway.setAttribute("depth", "3.8");
  walkway.setAttribute("color", "#0EA5E9");
  tunnel.appendChild(walkway);
  createCollider(tunnel, [0, 1.08, 0], [2.4, 0.18, 3.8], "tunnel-floor");

  for (const side of [-1, 1]) {
    const wall = createEntity("a-box");
    wall.setAttribute("position", `${(side * 1.35).toFixed(2)} 2.15 0`);
    wall.setAttribute("width", "0.3");
    wall.setAttribute("height", "2.2");
    wall.setAttribute("depth", "3.8");
    wall.setAttribute("color", "#0284C7");
    wall.setAttribute("material", "opacity: 0.48; transparent: true");
    tunnel.appendChild(wall);
    createCollider(tunnel, [side * 1.35, 2.15, 0], [0.3, 2.2, 3.8], `tunnel-wall-${side}`);
  }

  const roof = createEntity("a-box");
  roof.setAttribute("position", "0 3.3 0");
  roof.setAttribute("width", "2.4");
  roof.setAttribute("height", "0.22");
  roof.setAttribute("depth", "3.8");
  roof.setAttribute("color", "#0284C7");
  roof.setAttribute("material", "opacity: 0.48; transparent: true");
  tunnel.appendChild(roof);
  createCollider(tunnel, [0, 3.3, 0], [2.4, 0.22, 3.8], "tunnel-roof");

  for (let z = -1.65; z <= 1.65; z += 0.82) {
    const ring = createEntity("a-torus");
    ring.setAttribute("position", `0 2.18 ${z.toFixed(2)}`);
    ring.setAttribute("radius", "1.28");
    ring.setAttribute("radius-tubular", "0.08");
    ring.setAttribute("color", "#7DD3FC");
    ring.setAttribute("material", "emissive: #0369A1; emissiveIntensity: 0.35; opacity: 0.72; transparent: true");
    tunnel.appendChild(ring);
  }
  root.appendChild(tunnel);
}

function createBeamAndPillars(root) {
  createArch(root, { id: "exit-arch", position: [0, 1, -17.9], width: 2.15, height: 2.35, color: "#14B8A6" });

  const beam = createEntity("a-box");
  beam.id = "narrow-beam";
  beam.setAttribute("position", "0 1.18 -19.3");
  beam.setAttribute("width", "0.72");
  beam.setAttribute("height", "0.36");
  beam.setAttribute("depth", "4.05");
  beam.setAttribute("color", "#FACC15");
  beam.setAttribute("material", "emissive: #A16207; emissiveIntensity: 0.25");
  root.appendChild(beam);
  createCollider(root, [0, 1.18, -19.3], [0.72, 0.36, 4.05], "narrow-beam-collider");

  for (const x of [-1.42, 1.42]) {
    const pillar = createEntity("a-box");
    pillar.setAttribute("position", `${x.toFixed(2)} 2 -21.4`);
    pillar.setAttribute("width", "0.5");
    pillar.setAttribute("height", "2");
    pillar.setAttribute("depth", "0.5");
    pillar.setAttribute("color", "#475569");
    root.appendChild(pillar);
    createCollider(root, [x, 2, -21.4], [0.5, 2, 0.5], `pillar-${x}`);
  }
}

function createSteppedSlope(root) {
  const steps = steppedSlopeDefinitions({ steps: 5, startZ: -23.05, stepDepth: 0.72, risePerStep: 0.24 });
  for (const step of steps) {
    const box = createEntity("a-box");
    box.setAttribute("position", `${step.position.x} ${step.position.y.toFixed(3)} ${step.position.z.toFixed(3)}`);
    box.setAttribute("width", String(step.size.x));
    box.setAttribute("height", String(step.size.y));
    box.setAttribute("depth", String(step.size.z));
    box.setAttribute("color", step.index % 2 ? "#38BDF8" : "#0EA5E9");
    box.setAttribute("data-slope-step", String(step.index));
    root.appendChild(box);
    createCollider(
      root,
      [step.position.x, step.position.y, step.position.z],
      [step.size.x, step.size.y, step.size.z],
      `slope-step-${step.index}`
    );
  }
}

function addInstructionSigns(root) {
  const signs = [
    { position: [-3.45, 2.7, 3.8], rotation: "0 90 0", text: "1. PUSH THE BALL THROUGH THE PURPLE HOOP" },
    { position: [3.45, 2.7, -4.6], rotation: "0 -90 0", text: "2. PUSH THE CRATE DOWN THE RAILING LANE" },
    { position: [-3.45, 2.7, -13], rotation: "0 90 0", text: "3. TEST PIPE, ARCH, BEAM, PILLARS, AND STEPS" }
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
    for (const collider of piece.colliders || []) createCollider(pieceEntity, collider.position, collider.size, `${piece.id}-platform`);
    if (piece.checkpoint) addCheckpoint(pieceEntity, piece.checkpoint);
    if (piece.finish) addFinishTrigger(pieceEntity, piece.finish);
  }

  createPushables(root);
  createPipeTunnel(root);
  createBeamAndPillars(root);
  createSteppedSlope(root);
  addInstructionSigns(root);

  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("structure-lab-safety", "");
  window.funFunCourseManifest = LAB_MANIFEST;
  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: LAB_VERSION,
      expectedModels,
      colliderCount: root.querySelectorAll("[locomotion-collider]").length,
      pushableCount: root.querySelectorAll("[deterministic-pushable]").length,
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

  const state = { checkpoint: 0, goals: new Set(), contacts: 0, completed: false, startedAt: 0 };

  function setStatus(message, mode = "ready") {
    status.textContent = message;
    status.dataset.state = mode;
  }
  function setWorld(message) {
    worldStatus.setAttribute("value", message);
  }
  function updateDetails() {
    details.textContent = `Checkpoint ${state.checkpoint}/3 • Push goals ${state.goals.size}/2 • Hand contacts ${state.contacts}`;
  }
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
    rig.components["structure-lab-safety"]?.resetPlayer("Push and structure lab restarted");
    setStatus("Lab restarted. Pushables and goal zones were restored.", "ready");
    setWorld("Push and structure lab ready");
    updateDetails();
  }

  async function preflight() {
    const problems = [];
    const colliders = document.querySelectorAll("[locomotion-collider]");
    const pushables = document.querySelectorAll("[deterministic-pushable]");
    const goals = document.querySelectorAll("[push-object-goal]");
    if (window.__LOCOMOTION_LOAD_FAILED__ || !AFRAME.components["gorilla-locomotion"]) problems.push("Gorilla locomotion did not load");
    if (!AFRAME.components["deterministic-pushable"]) problems.push("pushable component is missing");
    if (!AFRAME.components["push-object-goal"]) problems.push("push goal component is missing");
    if (colliders.length !== LAB_MANIFEST.expectedColliderCount) problems.push(`expected ${LAB_MANIFEST.expectedColliderCount} colliders, found ${colliders.length}`);
    if (pushables.length !== LAB_MANIFEST.pushableCount) problems.push(`expected ${LAB_MANIFEST.pushableCount} pushables, found ${pushables.length}`);
    if (goals.length !== LAB_MANIFEST.goalCount) problems.push(`expected ${LAB_MANIFEST.goalCount} goals, found ${goals.length}`);

    if (problems.length) {
      note.textContent = `Lab preflight failed: ${problems.join("; ")}`;
      note.dataset.state = "error";
      setStatus("Fix the reported setup error before entering VR.", "error");
      setWorld("LAB SETUP ERROR");
      return;
    }

    refreshLocomotionColliders();
    note.textContent = "Push and structure lab passed preflight. Enter VR and test both objects plus every structural collision section.";
    note.dataset.state = "ready";
    setStatus("Lab ready: two push tests and six structure groups.", "ready");
    setWorld("Enter VR to test pushables and structures");
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
    rig.components["structure-lab-safety"]?.setSpawn(event.detail?.spawn);
    setStatus(`${event.detail?.label || "Checkpoint"} activated.`, "ready");
    setWorld(`Checkpoint ${index}/3 active`);
    updateDetails();
  });
  window.addEventListener("push-goal-complete", (event) => {
    state.goals.add(event.detail?.goalId || "goal");
    setStatus(`${event.detail?.label || "Push goal"} completed.`, "ready");
    setWorld(`Push goals ${state.goals.size}/2 complete`);
    updateDetails();
  });
  window.addEventListener("pushable-contact", () => {
    state.contacts += 1;
    updateDetails();
  });
  window.addEventListener("playtest-reset", (event) => {
    setStatus(event.detail?.message || "Returned to checkpoint", "warning");
  });
  window.addEventListener("course-finish", () => {
    if (state.completed) return;
    state.completed = true;
    const elapsed = state.startedAt ? (performance.now() - state.startedAt) / 1000 : 0;
    const goalText = state.goals.size === 2 ? "FULL PUSH CLEAR" : `${state.goals.size}/2 PUSH GOALS`;
    setStatus(`Structure lab clear in ${elapsed.toFixed(1)} seconds • ${goalText}`, "ready");
    setWorld("PUSH & STRUCTURE LAB CLEAR");
  });

  scene.addEventListener("enter-vr", () => {
    document.body.classList.add("vr-active");
    if (!state.startedAt) state.startedAt = performance.now();
  });
  scene.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));
  restartButton.addEventListener("click", restartLab);

  if (scene.hasLoaded) window.setTimeout(preflight, 140);
  else scene.addEventListener("loaded", () => window.setTimeout(preflight, 140), { once: true });
}

registerGeneratedComponents();
registerSafety();

function start() {
  buildLab();
  setupLifecycle();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
