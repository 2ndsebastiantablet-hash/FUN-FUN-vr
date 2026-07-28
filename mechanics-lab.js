import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";
import "./moving-platform.js";

const LAB_VERSION = "moving-platform-lab-v1";
const INITIAL_SPAWN = { x: 0, y: 0.32, z: 8 };
const PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -1], size: [4, 1, 2] }),
  Object.freeze({ position: [0, 0.5, 1], size: [4, 1, 2] })
]);
const SMALL_PLATFORM_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.325, -0.65], size: [2.6, 0.65, 1.3] }),
  Object.freeze({ position: [0, 0.325, 0.65], size: [2.6, 0.65, 1.3] })
]);

const LAB_MANIFEST = {
  version: LAB_VERSION,
  mode: "mechanics-lab",
  seed: "MOVING-PLATFORM-LAB",
  spawn: { ...INITIAL_SPAWN },
  pieces: [
    { id: "lab-start", assetId: "platform-square-blue", position: [0, 0, 8], colliders: PLATFORM_COLLIDERS },
    { id: "lab-wait", assetId: "platform-square-blue", position: [0, 0, 3.8], colliders: PLATFORM_COLLIDERS },
    {
      id: "forward-shuttle",
      assetId: "platform-square-blue",
      position: [0, 0, -0.7],
      colliders: PLATFORM_COLLIDERS,
      moving: { axis: [0, 0, -1], distance: 4.2, duration: 3600, phase: 0 }
    },
    {
      id: "shuttle-landing",
      assetId: "platform-square-blue",
      position: [0, 0, -7.5],
      colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "lab-checkpoint-1", label: "Shuttle checkpoint", index: 1, spawn: [0, 0.32, -7.5] }
    },
    { id: "lift-approach", assetId: "platform-square-blue", position: [0, 0, -11.7], colliders: PLATFORM_COLLIDERS },
    {
      id: "vertical-lift",
      assetId: "platform-square-blue",
      position: [0, 0, -15.9],
      colliders: PLATFORM_COLLIDERS,
      moving: { axis: [0, 1, 0], distance: 3, duration: 4000, phase: 0.5 }
    },
    {
      id: "upper-landing",
      assetId: "platform-square-blue",
      position: [0, 3, -20.1],
      colliders: PLATFORM_COLLIDERS,
      checkpoint: { id: "lab-checkpoint-2", label: "Lift checkpoint", index: 2, spawn: [0, 3.32, -20.1] }
    },
    {
      id: "side-shuttle",
      assetId: "platform-square-blue",
      position: [-2.4, 3, -23.5],
      scale: 0.65,
      colliders: SMALL_PLATFORM_COLLIDERS,
      moving: { axis: [1, 0, 0], distance: 4.8, duration: 3300, phase: 0.25 }
    },
    { id: "lab-finish-platform", assetId: "platform-square-blue", position: [0, 3, -27], colliders: PLATFORM_COLLIDERS },
    {
      id: "lab-finish-gate",
      assetId: "finish-wide",
      position: [0, 4, -28.1],
      scale: 0.45,
      finish: { radiusX: 1.85, radiusZ: 0.75, minRigY: 2.7, maxRigY: 7.4 }
    }
  ],
  bounds: { minX: -10, maxX: 10, minZ: -34, maxZ: 14, minHeight: -6, maxHeight: 14 },
  expectedColliderCount: 18
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
  fallback.setAttribute("color", piece.moving ? "#FACC15" : "#2563EB");
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

  if (piece.moving) {
    const marker = createEntity("a-ring");
    marker.setAttribute("position", `0 ${(1.03 * scale).toFixed(3)} 0`);
    marker.setAttribute("rotation", "-90 0 0");
    marker.setAttribute("radius-inner", String(0.82 * scale));
    marker.setAttribute("radius-outer", String(0.96 * scale));
    marker.setAttribute("color", "#FACC15");
    marker.setAttribute("material", "emissive: #EAB308; emissiveIntensity: 0.6; opacity: 0.9; transparent: true");
    marker.setAttribute("animation", "property: rotation; to: -90 360 0; loop: true; dur: 5200; easing: linear");
    parent.appendChild(marker);
  }
}

function createEndpointMarker(root, position, label) {
  const marker = createEntity("a-cylinder");
  marker.setAttribute("position", positionString(position));
  marker.setAttribute("radius", "0.18");
  marker.setAttribute("height", "0.035");
  marker.setAttribute("color", "#FACC15");
  marker.setAttribute("material", "emissive: #EAB308; emissiveIntensity: 0.55; opacity: 0.72; transparent: true");
  marker.setAttribute("data-motion-endpoint", label);
  root.appendChild(marker);
}

function addMotionGuides(root, piece) {
  if (!piece.moving) return;
  const [x, y, z] = piece.position;
  const [axisX, axisY, axisZ] = piece.moving.axis;
  const distance = piece.moving.distance;
  const platformTop = y + Number(piece.scale || 1) + 0.04;
  createEndpointMarker(root, [x, platformTop, z], `${piece.id}-start`);
  createEndpointMarker(
    root,
    [x + axisX * distance, platformTop + axisY * distance, z + axisZ * distance],
    `${piece.id}-end`
  );
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

function addInstructionSigns(root) {
  const signs = [
    { position: [-3.4, 2.55, 3.8], rotation: "0 90 0", text: "1. WAIT FOR THE FORWARD SHUTTLE" },
    { position: [-3.4, 2.55, -11.7], rotation: "0 90 0", text: "2. RIDE THE LIFT TO THE UPPER ROUTE" },
    { position: [3.4, 5.55, -20.1], rotation: "0 -90 0", text: "3. TIME THE SIDE SHUTTLE" }
  ];
  for (const sign of signs) {
    const plane = createEntity("a-plane");
    plane.setAttribute("position", positionString(sign.position));
    plane.setAttribute("rotation", sign.rotation);
    plane.setAttribute("width", "4.6");
    plane.setAttribute("height", "0.8");
    plane.setAttribute("color", "#FFFFFF");
    const text = createEntity("a-text");
    text.setAttribute("value", sign.text);
    text.setAttribute("align", "center");
    text.setAttribute("width", "4.2");
    text.setAttribute("color", "#0F172A");
    text.setAttribute("position", "0 0 0.01");
    plane.appendChild(text);
    root.appendChild(plane);
  }
}

function registerLabSafety() {
  if (!window.AFRAME || AFRAME.components["lab-safety"]) return;
  AFRAME.registerComponent("lab-safety", {
    schema: {
      minX: { default: -10 }, maxX: { default: 10 },
      minZ: { default: -34 }, maxZ: { default: 14 },
      minY: { default: -6 }, maxY: { default: 14 }
    },
    init: function () {
      this.spawn = new THREE.Vector3(0, 0.12, 8);
      this.lastCheck = 0;
      this.lastReset = -Infinity;
    },
    tick: function (time) {
      if (time - this.lastCheck < 180) return;
      this.lastCheck = time;
      const position = this.el.object3D.position;
      const invalid = ![position.x, position.y, position.z].every(Number.isFinite);
      const outside =
        position.x < this.data.minX || position.x > this.data.maxX ||
        position.z < this.data.minZ || position.z > this.data.maxZ ||
        position.y < this.data.minY || position.y > this.data.maxY;
      if (invalid || outside) this.resetPlayer("Fall reset — returned to the latest lab checkpoint");
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
      locomotion.velocity.set(0, 0, 0);
      locomotion.launchVelocity.set(0, 0, 0);
      locomotion.leftDelta.set(0, 0, 0);
      locomotion.rightDelta.set(0, 0, 0);
      locomotion.frameMovement.set(0, 0, 0);
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
    if (piece.moving) {
      const axis = piece.moving.axis.join(" ");
      pieceEntity.setAttribute(
        "moving-platform",
        `rig: #player-rig; axis: ${axis}; distance: ${piece.moving.distance}; duration: ${piece.moving.duration}; phase: ${piece.moving.phase}; verticalTolerance: 0.22; edgePadding: 0.14`
      );
      addMotionGuides(root, piece);
    }
  }

  addInstructionSigns(root);
  rig.setAttribute("platformer-surface-extension", "");
  rig.setAttribute("lab-safety", "");
  window.funFunCourseManifest = LAB_MANIFEST;
  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: LAB_VERSION,
      expectedModels,
      colliderCount: root.querySelectorAll("[locomotion-collider]").length,
      movingPlatformCount: root.querySelectorAll("[moving-platform]").length,
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
    return rig.components["lab-safety"];
  }

  function restartLab() {
    state.startedAt = 0;
    state.completed = false;
    state.checkpoint = 0;
    document.querySelectorAll("[course-checkpoint-trigger]").forEach((entity) => {
      const component = entity.components["course-checkpoint-trigger"];
      if (component) component.activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((entity) => {
      const component = entity.components["course-finish-trigger"];
      if (component) component.completed = false;
    });
    setStatus("Lab restarted. Wait for each yellow-marked platform and ride it safely.", "ready");
    details.textContent = `Checkpoint 0/2 • 3 moving platforms • ${LAB_VERSION}`;
    setWorld("Moving-platform lab ready");
    window.dispatchEvent(new CustomEvent("course-request-reset", {
      detail: { spawn: { ...INITIAL_SPAWN }, message: "Moving-platform lab restarted" }
    }));
  }

  async function preflight() {
    const problems = [];
    const pieces = document.querySelectorAll("[data-course-piece]");
    const colliders = document.querySelectorAll("[locomotion-collider]");
    const movers = document.querySelectorAll("[moving-platform]");
    if (window.__LOCOMOTION_LOAD_FAILED__ || !AFRAME.components["gorilla-locomotion"]) problems.push("Gorilla locomotion did not load");
    if (!AFRAME.components["moving-platform"]) problems.push("moving-platform component is missing");
    if (!AFRAME.components["platformer-surface-extension"]) problems.push("platform support is missing");
    if (pieces.length !== 10) problems.push(`expected 10 lab pieces, found ${pieces.length}`);
    if (colliders.length !== LAB_MANIFEST.expectedColliderCount) problems.push(`expected 18 colliders, found ${colliders.length}`);
    if (movers.length !== 3) problems.push(`expected 3 moving platforms, found ${movers.length}`);
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
    note.textContent = "Moving-platform lab passed preflight. Enter VR and test all three platform motions.";
    note.dataset.state = "ready";
    setStatus("Lab ready: forward shuttle, vertical lift, and side shuttle.", "ready");
    setWorld("Enter VR to test moving platforms");

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
      window.dispatchEvent(new CustomEvent("course-started", { detail: { startedAt: now, mode: "mechanics-lab" } }));
    }
    if (state.startedAt && !state.completed && now - state.lastUi >= 120) {
      state.lastUi = now;
      details.textContent = `Time ${((now - state.startedAt) / 1000).toFixed(1)}s • Checkpoint ${state.checkpoint}/2 • 3 moving platforms`;
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
  window.addEventListener("moving-platform-boarded", (event) => {
    const id = event.detail?.platformId || "moving platform";
    setWorld(`Riding ${id.replaceAll("-", " ")}`);
  });
  window.addEventListener("moving-platform-left", () => {
    if (!state.completed) setWorld("Move toward the next yellow-marked platform");
  });
  window.addEventListener("course-finish", () => {
    if (state.completed) return;
    state.completed = true;
    const elapsed = state.startedAt ? performance.now() - state.startedAt : 0;
    setStatus(`Moving-platform lab complete in ${(elapsed / 1000).toFixed(1)}s.`, "ready");
    details.textContent = `All 3 moving-platform tests completed • Checkpoints ${state.checkpoint}/2`;
    setWorld("MOVING-PLATFORM LAB COMPLETE");
  });

  leftHand?.addEventListener("controllerconnected", () => setWorld("Left controller tracked — waiting for right"));
  rightHand?.addEventListener("controllerconnected", () => setWorld("Controllers tracked — push and ride"));

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
  window.funFunMechanicsLab = { manifest: LAB_MANIFEST, state, restart: restartLab };
}

registerGeneratedComponents();
registerLabSafety();
setupLabLifecycle();
buildLab();
