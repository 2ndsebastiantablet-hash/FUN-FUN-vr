import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import "./falling-platform.js";

const LAB_VERSION = "falling-platform-lab-v1";
const INITIAL_SPAWN = { x: 0, y: 0.32, z: 8 };
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);

const LAB_MANIFEST = {
  version: LAB_VERSION,
  mode: "falling-platform-lab",
  seed: "FALLING-PLATFORM-LAB",
  spawn: { ...INITIAL_SPAWN },
  pieces: [
    { id: "fall-start", assetId: "platform-square-blue", position: [0, 0, 8], colliders: PLATFORM_COLLIDERS },
    {
      id: "tutorial-faller",
      assetId: "platform-square-blue",
      position: [0, 0, 3.8],
      colliders: PLATFORM_COLLIDERS,
      falling: { warningDelay: 1100, fallDuration: 1000, resetDelay: 2400, fallDistance: 11 }
    },
    {
      id: "fall-checkpoint-one",
      assetId: "platform-square-blue",
      position: [0, 0, -0.4],
      colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "fall-checkpoint-1", label: "First falling checkpoint", index: 1, spawn: [0, 0.32, -0.4] }
    },
    {
      id: "quick-faller",
      assetId: "platform-square-blue",
      position: [0, 0, -4.6],
      colliders: PLATFORM_COLLIDERS,
      falling: { warningDelay: 650, fallDuration: 800, resetDelay: 2300, fallDistance: 12 }
    },
    {
      id: "chain-faller-a",
      assetId: "platform-square-blue",
      position: [0, 0, -8.8],
      colliders: PLATFORM_COLLIDERS,
      falling: { warningDelay: 800, fallDuration: 850, resetDelay: 2600, fallDistance: 12 }
    },
    {
      id: "chain-faller-b",
      assetId: "platform-square-blue",
      position: [0, 0, -13],
      colliders: PLATFORM_COLLIDERS,
      falling: { warningDelay: 500, fallDuration: 780, resetDelay: 2600, fallDistance: 12 }
    },
    {
      id: "fall-checkpoint-two",
      assetId: "platform-square-blue",
      position: [0, 0, -17.2],
      colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "fall-checkpoint-2", label: "Chain checkpoint", index: 2, spawn: [0, 0.32, -17.2] }
    },
    {
      id: "final-faller",
      assetId: "platform-square-blue",
      position: [0, 0, -21.4],
      colliders: PLATFORM_COLLIDERS,
      falling: { warningDelay: 420, fallDuration: 720, resetDelay: 2800, fallDistance: 13 }
    },
    { id: "fall-finish-platform", assetId: "platform-square-blue", position: [0, 0, -25.6], colliders: PLATFORM_COLLIDERS },
    {
      id: "fall-finish-gate",
      assetId: "finish-wide",
      position: [0, 1, -26.7],
      scale: 0.45,
      finish: { radiusX: 1.85, radiusZ: 0.75, minRigY: -0.3, maxRigY: 4.6 }
    }
  ],
  bounds: { minX: -10, maxX: 10, minZ: -33, maxZ: 14, minHeight: -8, maxHeight: 12 },
  expectedColliderCount: 18,
  expectedFallingCount: 5,
  checkpointCount: 2
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
  fallback.setAttribute("color", piece.falling ? "#A855F7" : "#2563EB");
  fallback.setAttribute("material", "opacity: 0.25; transparent: true; wireframe: true");
  fallback.setAttribute("data-course-fallback", piece.id);
  parent.appendChild(fallback);

  const model = createEntity();
  model.setAttribute("gltf-model", asset.url);
  model.setAttribute("scale", `${scale} ${scale} ${scale}`);
  model.setAttribute("data-course-model", piece.id);
  model.addEventListener("model-loaded", () => {
    fallback.setAttribute("visible", false);
    window.dispatchEvent(new CustomEvent("course-asset-loaded", {
      detail: { pieceId: piece.id, assetId: piece.assetId }
    }));
  });
  model.addEventListener("model-error", () => {
    fallback.setAttribute("visible", true);
    window.dispatchEvent(new CustomEvent("course-asset-error", {
      detail: { pieceId: piece.id, assetId: piece.assetId, message: "Model failed to load" }
    }));
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
  ring.setAttribute("animation", "property: rotation; to: -90 360 0; loop: true; dur: 7000; easing: linear");
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

function addFallingPlatform(pieceEntity, piece) {
  const settings = piece.falling;
  const warning = createEntity("a-ring");
  warning.setAttribute("data-falling-warning", piece.id);
  warning.setAttribute("position", "0 1.035 0");
  warning.setAttribute("rotation", "-90 0 0");
  warning.setAttribute("radius-inner", "0.88");
  warning.setAttribute("radius-outer", "1.12");
  warning.setAttribute("color", "#E879F9");
  warning.setAttribute("material", "emissive: #A21CAF; emissiveIntensity: 0.75; opacity: 0.92; transparent: true");
  warning.setAttribute("visible", false);
  pieceEntity.appendChild(warning);

  const label = createEntity("a-text");
  label.setAttribute("value", "FRAGILE");
  label.setAttribute("position", "0 1.08 0");
  label.setAttribute("rotation", "-90 0 0");
  label.setAttribute("align", "center");
  label.setAttribute("width", "3.4");
  label.setAttribute("color", "#FFFFFF");
  pieceEntity.appendChild(label);

  pieceEntity.setAttribute(
    "falling-platform",
    `rig: #player-rig; warningDelay: ${settings.warningDelay}; fallDuration: ${settings.fallDuration}; resetDelay: ${settings.resetDelay}; fallDistance: ${settings.fallDistance}; verticalTolerance: 0.22; edgePadding: 0.08`
  );
}

function addInstructionSigns(root) {
  const signs = [
    { position: [-3.4, 2.55, 3.8], rotation: "0 90 0", text: "1. STEP ON, THEN MOVE BEFORE IT DROPS" },
    { position: [3.4, 2.55, -4.6], rotation: "0 -90 0", text: "2. QUICK PLATFORM — DO NOT WAIT" },
    { position: [-3.4, 2.55, -17.2], rotation: "0 90 0", text: "3. FINAL PLATFORM FALLS ALMOST IMMEDIATELY" }
  ];
  for (const sign of signs) {
    const plane = createEntity("a-plane");
    plane.setAttribute("position", positionString(sign.position));
    plane.setAttribute("rotation", sign.rotation);
    plane.setAttribute("width", "5");
    plane.setAttribute("height", "0.8");
    plane.setAttribute("color", "#FFFFFF");
    const text = createEntity("a-text");
    text.setAttribute("value", sign.text);
    text.setAttribute("align", "center");
    text.setAttribute("width", "4.6");
    text.setAttribute("color", "#0F172A");
    text.setAttribute("position", "0 0 0.01");
    plane.appendChild(text);
    root.appendChild(plane);
  }
}

function registerFallingLabSafety() {
  if (!window.AFRAME || AFRAME.components["falling-lab-safety"]) return;
  AFRAME.registerComponent("falling-lab-safety", {
    schema: {
      minX: { default: -10 }, maxX: { default: 10 },
      minZ: { default: -33 }, maxZ: { default: 14 },
      minY: { default: -8 }, maxY: { default: 12 }
    },
    init: function () {
      this.spawn = new THREE.Vector3(0, 0.12, 8);
      this.lastCheck = 0;
      this.lastReset = -Infinity;
    },
    tick: function (time) {
      if (time - this.lastCheck < 120) return;
      this.lastCheck = time;
      const position = this.el.object3D.position;
      const invalid = ![position.x, position.y, position.z].every(Number.isFinite);
      const outside =
        position.x < this.data.minX || position.x > this.data.maxX ||
        position.z < this.data.minZ || position.z > this.data.maxZ ||
        position.y < this.data.minY || position.y > this.data.maxY;
      if (invalid || outside) this.resetPlayer("Fall reset — returned to the latest falling-platform checkpoint");
    },
    setSpawn: function (spawn) {
      if (!spawn) return;
      const values = [Number(spawn.x), Number(spawn.y), Number(spawn.z)];
      if (!values.every(Number.isFinite)) return;
      this.spawn.set(values[0], values[1], values[2]);
    },
    clearMotion: function () {
      const locomotion = this.el.components["gorilla-locomotion"];
      if (!locomotion) return;
      locomotion.velocity?.set?.(0, 0, 0);
      locomotion.launchVelocity?.set?.(0, 0, 0);
      locomotion.leftDelta?.set?.(0, 0, 0);
      locomotion.rightDelta?.set?.(0, 0, 0);
      locomotion.frameMovement?.set?.(0, 0, 0);
      locomotion.pushHistory = [];
      locomotion.hasPreviousHands = false;
      locomotion.wasTouchingSurface = false;
      locomotion.wasTouchingFloor = false;
      locomotion.wasTwoHandTouchingFloor = false;
    },
    resetPlayer: function (message = "Returned to checkpoint") {
      const now = performance.now();
      if (now - this.lastReset < 300) return;
      this.lastReset = now;
      this.el.object3D.position.copy(this.spawn);
      this.clearMotion();
      window.dispatchEvent(new CustomEvent("playtest-reset", {
        detail: { message, spawn: { x: this.spawn.x, y: this.spawn.y, z: this.spawn.z } }
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
    if (!asset) {
      window.dispatchEvent(new CustomEvent("course-asset-error", {
        detail: { pieceId: piece.id, assetId: piece.assetId, message: "Registry entry missing" }
      }));
      continue;
    }

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
    if (piece.falling) addFallingPlatform(pieceEntity, piece);
  }

  addInstructionSigns(root);
  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("falling-lab-safety", "");
  window.funFunCourseManifest = LAB_MANIFEST;
  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: LAB_VERSION,
      expectedModels,
      colliderCount: root.querySelectorAll("[locomotion-collider]").length,
      fallingPlatformCount: root.querySelectorAll("[falling-platform]").length,
      spawn: LAB_MANIFEST.spawn
    }
  }));

  const scene = root.sceneEl;
  if (scene?.hasLoaded) refreshLocomotionColliders();
  else scene?.addEventListener("loaded", refreshLocomotionColliders, { once: true });
}

function setupLabLifecycle() {
  const scene = document.querySelector("a-scene");
  const rig = document.getElementById("player-rig");
  const camera = document.getElementById("player-camera");
  const note = document.getElementById("note");
  const status = document.getElementById("course-status");
  const details = document.getElementById("course-details");
  const worldStatus = document.getElementById("world-status");
  const restartButton = document.getElementById("restart-course");
  const leftHand = document.getElementById("left-hand");
  const rightHand = document.getElementById("right-hand");
  if (!scene || !rig || !camera || !note || !status || !details || !worldStatus || !restartButton) return;

  const state = {
    startedAt: 0,
    completed: false,
    checkpoint: 0,
    drops: 0,
    loadedModels: 0,
    failedModels: 0,
    expectedModels: LAB_MANIFEST.pieces.length,
    lastUi: 0
  };

  function setStatus(message, mode = "ready") {
    status.textContent = message;
    status.dataset.state = mode;
  }

  function setWorld(message) {
    worldStatus.setAttribute("value", message);
  }

  function safety() {
    return rig.components["falling-lab-safety"];
  }

  function restartLab() {
    state.startedAt = 0;
    state.completed = false;
    state.checkpoint = 0;
    state.drops = 0;
    document.querySelectorAll("[course-checkpoint-trigger]").forEach((entity) => {
      const component = entity.components["course-checkpoint-trigger"];
      if (component) component.activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((entity) => {
      const component = entity.components["course-finish-trigger"];
      if (component) component.completed = false;
    });
    setStatus("Lab restarted. Fragile platforms reset to their starting positions.", "ready");
    details.textContent = `Checkpoint 0/2 • Drops 0 • 5 falling platforms • ${LAB_VERSION}`;
    setWorld("Falling-platform lab ready");
    window.dispatchEvent(new CustomEvent("course-request-reset", {
      detail: { spawn: { ...INITIAL_SPAWN }, message: "Falling-platform lab restarted" }
    }));
  }

  async function preflight() {
    const problems = [];
    const pieces = document.querySelectorAll("[data-course-piece]");
    const colliders = document.querySelectorAll("[locomotion-collider]");
    const fallers = document.querySelectorAll("[falling-platform]");
    if (window.__LOCOMOTION_LOAD_FAILED__ || !AFRAME.components["gorilla-locomotion"]) problems.push("Gorilla locomotion did not load");
    if (!AFRAME.components["falling-platform"]) problems.push("falling-platform component is missing");
    if (!AFRAME.components["platformer-surface-extension"]) problems.push("platform support is missing");
    if (pieces.length !== LAB_MANIFEST.pieces.length) problems.push(`expected ${LAB_MANIFEST.pieces.length} lab pieces, found ${pieces.length}`);
    if (colliders.length !== LAB_MANIFEST.expectedColliderCount) problems.push(`expected ${LAB_MANIFEST.expectedColliderCount} colliders, found ${colliders.length}`);
    if (fallers.length !== LAB_MANIFEST.expectedFallingCount) problems.push(`expected ${LAB_MANIFEST.expectedFallingCount} falling platforms, found ${fallers.length}`);
    if (!rig.components["gorilla-locomotion"]) problems.push("player locomotion did not initialize");

    if (problems.length) {
      note.textContent = `Lab preflight failed: ${problems.join("; ")}`;
      note.dataset.state = "error";
      setStatus("Fix the reported setup error before entering VR.", "error");
      setWorld("LAB SETUP ERROR");
      return;
    }

    const locomotion = rig.components["gorilla-locomotion"];
    locomotion.colliders = Array.from(colliders);
    note.textContent = "Falling-platform lab passed preflight. Enter VR and test all five fragile platforms.";
    note.dataset.state = "ready";
    setStatus("Lab ready: slow warning, quick drop, chain drop, and final instant challenge.", "ready");
    setWorld("Enter VR to test falling platforms");

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

  function frame(now) {
    if (!state.startedAt && !state.completed && rig.object3D.position.z < 6.1) {
      state.startedAt = now;
      window.dispatchEvent(new CustomEvent("course-started", { detail: { startedAt: now, mode: "falling-platform-lab" } }));
    }
    if (state.startedAt && !state.completed && now - state.lastUi >= 120) {
      state.lastUi = now;
      details.textContent = `Time ${((now - state.startedAt) / 1000).toFixed(1)}s • Checkpoint ${state.checkpoint}/2 • Drops ${state.drops}`;
    }
    window.requestAnimationFrame(frame);
  }

  window.addEventListener("course-built", (event) => {
    state.expectedModels = event.detail.expectedModels;
    setStatus(`Lab built. Loading ${state.expectedModels} KayKit models…`, "checking");
  });
  window.addEventListener("course-asset-loaded", () => {
    state.loadedModels += 1;
    const done = state.loadedModels + state.failedModels >= state.expectedModels;
    setStatus(
      done ? `Lab ready. ${state.loadedModels}/${state.expectedModels} models loaded.` : `Loading models ${state.loadedModels}/${state.expectedModels}`,
      done && state.failedModels === 0 ? "ready" : "checking"
    );
  });
  window.addEventListener("course-asset-error", (event) => {
    state.failedModels += 1;
    setStatus(`Model ${event.detail?.assetId || "unknown"} failed; a collision-matched fallback remains.`, "warning");
  });
  window.addEventListener("course-checkpoint", (event) => {
    state.checkpoint = Math.max(state.checkpoint, Number(event.detail?.index) || 0);
    safety()?.setSpawn(event.detail?.spawn);
    setStatus(`${event.detail?.label || "Checkpoint"} reached.`, "ready");
    setWorld(`${event.detail?.label || "Checkpoint"} reached`);
  });
  window.addEventListener("course-request-reset", (event) => {
    safety()?.setSpawn(event.detail?.spawn || INITIAL_SPAWN);
    safety()?.resetPlayer(event.detail?.message || "Lab restarted");
  });
  window.addEventListener("playtest-reset", (event) => setWorld(event.detail?.message || "Returned to checkpoint"));
  window.addEventListener("falling-platform-armed", (event) => {
    const id = String(event.detail?.platformId || "falling platform").replaceAll("-", " ");
    setStatus(`${id} is flashing — move now.`, "warning");
    setWorld(`${id.toUpperCase()} ARMED`);
  });
  window.addEventListener("falling-platform-dropped", (event) => {
    state.drops += 1;
    const id = String(event.detail?.platformId || "falling platform").replaceAll("-", " ");
    setStatus(`${id} dropped. It will rebuild automatically.`, "warning");
    setWorld(`${id.toUpperCase()} DROPPED`);
  });
  window.addEventListener("falling-platform-restored", (event) => {
    if (!state.completed) setWorld(`${String(event.detail?.platformId || "platform").replaceAll("-", " ")} restored`);
  });
  window.addEventListener("course-finish", () => {
    if (state.completed) return;
    state.completed = true;
    const elapsed = state.startedAt ? performance.now() - state.startedAt : 0;
    setStatus(`Falling-platform lab complete in ${(elapsed / 1000).toFixed(1)}s.`, "ready");
    details.textContent = `All 5 falling-platform tests completed • Drops ${state.drops} • Checkpoints ${state.checkpoint}/2`;
    setWorld("FALLING-PLATFORM LAB COMPLETE");
  });

  leftHand?.addEventListener("controllerconnected", () => setWorld("Left controller tracked — waiting for right"));
  rightHand?.addEventListener("controllerconnected", () => setWorld("Controllers tracked — move quickly after the warning"));

  scene.addEventListener("enter-vr", () => {
    document.body.classList.add("vr-active");
    camera.setAttribute("position", "0 0 0");
    setWorld("Wait for both controllers before moving");
    window.setTimeout(() => {
      safety()?.setSpawn(LAB_MANIFEST.spawn);
      safety()?.resetPlayer("Lab position initialized");
    }, 575);
  });
  scene.addEventListener("exit-vr", () => {
    document.body.classList.remove("vr-active");
    camera.setAttribute("position", "0 1.6 0");
    safety()?.clearMotion();
    setWorld("Lab ready — press Enter VR");
  });

  restartButton.addEventListener("click", restartLab);
  if (scene.hasLoaded) preflight();
  else scene.addEventListener("loaded", preflight, { once: true });
  window.requestAnimationFrame(frame);
  window.funFunFallingLab = { manifest: LAB_MANIFEST, state, restart: restartLab };
}

registerGeneratedComponents();
registerFallingLabSafety();
setupLabLifecycle();
buildLab();
