import { getPlatformerAsset } from "./assets/platformer/registry.js";
import { generateCourseManifest, readCourseRequest } from "./course-modules.js";
import { registerGeneratedComponents, refreshLocomotionColliders } from "./generated-components.js";

const COLOR_FALLBACKS = Object.freeze({
  blue: "#2563EB",
  green: "#22C55E",
  yellow: "#FACC15",
  red: "#EF4444",
  neutral: "#A16207"
});

const request = readCourseRequest();
const COURSE_MANIFEST = generateCourseManifest(request.seed);

function toPositionString(values) {
  return values.map((value) => Number(value).toFixed(3)).join(" ");
}

function createEntity(tag = "a-entity") {
  return document.createElement(tag);
}

function createCollider(parent, definition, id) {
  const collider = createEntity();
  collider.setAttribute("data-course-collider", id);
  collider.setAttribute("position", toPositionString(definition.position));
  collider.setAttribute("locomotion-collider", `type: box; size: ${toPositionString(definition.size)}`);
  parent.appendChild(collider);
  return collider;
}

function createFallback(asset, scale) {
  const fallback = createEntity("a-box");
  const size = asset.bounds.size.map((value) => value * scale);
  const center = asset.bounds.min.map((minimum, index) => {
    return (minimum + asset.bounds.max[index]) * 0.5 * scale;
  });

  fallback.setAttribute("position", toPositionString(center));
  fallback.setAttribute("width", String(Math.max(0.08, size[0])));
  fallback.setAttribute("height", String(Math.max(0.08, size[1])));
  fallback.setAttribute("depth", String(Math.max(0.08, size[2])));
  fallback.setAttribute("color", COLOR_FALLBACKS[asset.color] || "#94A3B8");
  fallback.setAttribute("material", "opacity: 0.28; transparent: true; wireframe: true");
  fallback.setAttribute("data-course-fallback", asset.id);
  return fallback;
}

function createModel(parent, piece, asset) {
  const scale = Number(piece.scale || 1);
  const fallback = createFallback(asset, scale);
  parent.appendChild(fallback);

  const model = createEntity();
  model.setAttribute("gltf-model", asset.url);
  model.setAttribute("scale", `${scale} ${scale} ${scale}`);
  model.setAttribute("data-course-model", piece.id);

  model.addEventListener("model-loaded", () => {
    fallback.setAttribute("visible", false);
    window.dispatchEvent(new CustomEvent("course-asset-loaded", {
      detail: { pieceId: piece.id, assetId: asset.id }
    }));
  });

  model.addEventListener("model-error", (event) => {
    fallback.setAttribute("visible", true);
    window.dispatchEvent(new CustomEvent("course-asset-error", {
      detail: {
        pieceId: piece.id,
        assetId: asset.id,
        message: event?.detail ? String(event.detail) : "Model failed to load"
      }
    }));
  });

  parent.appendChild(model);
  return model;
}

function createCheckpointMarker(pieceEntity, checkpoint) {
  const ring = createEntity("a-ring");
  ring.setAttribute("position", "0 1.025 0");
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.72");
  ring.setAttribute("radius-outer", "0.92");
  ring.setAttribute("color", "#22C55E");
  ring.setAttribute("material", "emissive: #16A34A; emissiveIntensity: 0.35");
  ring.setAttribute("animation", "property: rotation; to: -90 360 0; loop: true; dur: 7000; easing: linear");
  pieceEntity.appendChild(ring);

  const trigger = createEntity();
  trigger.setAttribute("position", "0 1.3 0");
  trigger.setAttribute(
    "course-checkpoint-trigger",
    `rig: #player-rig; checkpointId: ${checkpoint.id}; label: ${checkpoint.label}; index: ${checkpoint.index}; spawn: ${toPositionString(checkpoint.spawn)}`
  );
  pieceEntity.appendChild(trigger);
}

function createFinishMessage(root) {
  const finishGate = COURSE_MANIFEST.pieces.find((piece) => piece.finish);
  if (!finishGate) return;

  const panel = createEntity("a-plane");
  panel.setAttribute(
    "position",
    toPositionString([
      finishGate.position[0],
      finishGate.position[1] + 4.2,
      finishGate.position[2] - 1.05
    ])
  );
  panel.setAttribute("width", "7.6");
  panel.setAttribute("height", "1.9");
  panel.setAttribute("color", "#FFFFFF");

  const heading = createEntity("a-text");
  heading.setAttribute("value", "GENERATED FINISH");
  heading.setAttribute("position", "0 0.36 0.01");
  heading.setAttribute("align", "center");
  heading.setAttribute("width", "6");
  heading.setAttribute("color", "#0F172A");
  panel.appendChild(heading);

  const message = createEntity("a-text");
  message.id = "finish-message";
  message.setAttribute("value", `Seed ${COURSE_MANIFEST.seed} • pass through the gate`);
  message.setAttribute("position", "0 -0.32 0.01");
  message.setAttribute("align", "center");
  message.setAttribute("width", "6.5");
  message.setAttribute("color", "#334155");
  panel.appendChild(message);
  root.appendChild(panel);
}

function createStartMarker(root) {
  const ring = createEntity("a-ring");
  ring.setAttribute(
    "position",
    toPositionString([
      COURSE_MANIFEST.spawn.x,
      1.015,
      COURSE_MANIFEST.spawn.z
    ])
  );
  ring.setAttribute("rotation", "-90 0 0");
  ring.setAttribute("radius-inner", "0.5");
  ring.setAttribute("radius-outer", "0.66");
  ring.setAttribute("color", "#FFFFFF");
  root.appendChild(ring);
}

function setupCourseIdentity() {
  const title = document.getElementById("course-title");
  const description = document.getElementById("course-description");
  const heading = document.getElementById("course-heading-world");
  const subtitle = document.getElementById("course-subtitle-world");
  if (title) title.textContent = "Seeded Platforming Course";
  if (description) {
    description.textContent = "A validated modular route generated from the seed below. Share the exact link for matching multiplayer maps.";
  }
  if (heading) heading.setAttribute("value", "FUN-FUN VR — GENERATED COURSE");
  if (subtitle) subtitle.setAttribute("value", `SEED ${COURSE_MANIFEST.seed} • MAP ${COURSE_MANIFEST.checksum}`);
}

function setupCourseManager() {
  const rig = document.getElementById("player-rig");
  const courseStatus = document.getElementById("course-status");
  const courseDetails = document.getElementById("course-details");
  const restartButton = document.getElementById("restart-course");
  if (!rig || !courseStatus || !courseDetails || !restartButton) return;

  const state = {
    loadedModels: 0,
    expectedModels: COURSE_MANIFEST.pieces.length,
    failedModels: 0,
    startedAt: 0,
    completedAt: 0,
    running: false,
    completed: false,
    checkpointIndex: 0,
    lastUiUpdate: 0
  };

  const bestKey = `funfun-generated-best-${COURSE_MANIFEST.generatorVersion}-${COURSE_MANIFEST.seed}`;
  const finishMessageElement = () => document.getElementById("finish-message");
  const setCourseStatus = (message, mode = "checking") => {
    courseStatus.textContent = message;
    courseStatus.dataset.state = mode;
  };
  const formatTime = (milliseconds) => `${(milliseconds / 1000).toFixed(1)}s`;

  function updateTimer(now) {
    if (now - state.lastUiUpdate < 100) return;
    state.lastUiUpdate = now;
    if (state.running && !state.completed) {
      courseDetails.textContent =
        `Time ${formatTime(now - state.startedAt)} • Checkpoint ${state.checkpointIndex}/${COURSE_MANIFEST.checkpointCount} • Seed ${COURSE_MANIFEST.seed}`;
    }
  }

  function frame(now) {
    if (!state.running && !state.completed && rig.object3D.position.z < COURSE_MANIFEST.startThresholdZ) {
      state.running = true;
      state.startedAt = now;
      setCourseStatus("Generated run active — reach the finish gate.", "ready");
      window.dispatchEvent(new CustomEvent("course-started", {
        detail: { startedAt: now, seed: COURSE_MANIFEST.seed, checksum: COURSE_MANIFEST.checksum }
      }));
    }
    updateTimer(now);
    window.requestAnimationFrame(frame);
  }

  function restart() {
    state.startedAt = 0;
    state.completedAt = 0;
    state.running = false;
    state.completed = false;
    state.checkpointIndex = 0;
    setCourseStatus("Generated course restarted. Leave the first platform to start the timer.", "ready");
    courseDetails.textContent =
      `Checkpoint 0/${COURSE_MANIFEST.checkpointCount} • Seed ${COURSE_MANIFEST.seed} • Map ${COURSE_MANIFEST.checksum}`;

    const finishMessage = finishMessageElement();
    if (finishMessage) finishMessage.setAttribute("value", `Seed ${COURSE_MANIFEST.seed} • pass through the gate`);

    document.querySelectorAll("[course-checkpoint-trigger]").forEach((entity) => {
      const component = entity.components["course-checkpoint-trigger"];
      if (component) component.activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((entity) => {
      const component = entity.components["course-finish-trigger"];
      if (component) component.completed = false;
    });

    window.dispatchEvent(new CustomEvent("course-request-reset", {
      detail: { spawn: COURSE_MANIFEST.spawn, message: "Generated course restarted" }
    }));
  }

  window.addEventListener("course-built", (event) => {
    state.expectedModels = event.detail.expectedModels;
    setCourseStatus(
      `Generated map ${COURSE_MANIFEST.checksum} built. Loading ${state.expectedModels} KayKit models…`,
      "checking"
    );
  });

  window.addEventListener("course-asset-loaded", () => {
    state.loadedModels += 1;
    const complete = state.loadedModels + state.failedModels >= state.expectedModels;
    setCourseStatus(
      complete
        ? `Generated course ready. ${state.loadedModels}/${state.expectedModels} models loaded.`
        : `Loading KayKit models: ${state.loadedModels}/${state.expectedModels}`,
      complete && state.failedModels === 0 ? "ready" : "checking"
    );
  });

  window.addEventListener("course-asset-error", (event) => {
    state.failedModels += 1;
    setCourseStatus(
      `KayKit model ${event.detail.assetId} failed. A collision-matched fallback remains available.`,
      "warning"
    );
  });

  window.addEventListener("course-checkpoint", (event) => {
    state.checkpointIndex = Math.max(state.checkpointIndex, event.detail.index || 0);
    setCourseStatus(`${event.detail.label} reached. Falls now return here.`, "ready");
  });

  window.addEventListener("spring-launched", () => {
    setCourseStatus("Spring launched — aim for the checkpoint platform.", "ready");
  });

  window.addEventListener("course-finish", () => {
    if (state.completed) return;
    const now = performance.now();
    if (!state.running) {
      state.running = true;
      state.startedAt = now;
    }
    state.completed = true;
    state.completedAt = now;
    const elapsed = Math.max(0, state.completedAt - state.startedAt);
    const oldBest = Number(localStorage.getItem(bestKey) || 0);
    const isBest = !oldBest || elapsed < oldBest;
    if (isBest) localStorage.setItem(bestKey, String(elapsed));

    setCourseStatus(
      `Seed ${COURSE_MANIFEST.seed} complete in ${formatTime(elapsed)}${isBest ? " — new seed best!" : ""}`,
      "ready"
    );
    courseDetails.textContent =
      `Finish ${formatTime(elapsed)} • Best ${formatTime(isBest ? elapsed : oldBest)} • Map ${COURSE_MANIFEST.checksum}`;
    const finishMessage = finishMessageElement();
    if (finishMessage) {
      finishMessage.setAttribute(
        "value",
        `COURSE COMPLETE — ${formatTime(elapsed)}${isBest ? " — NEW SEED BEST" : ""}`
      );
    }
  });

  restartButton.addEventListener("click", restart);
  window.funFunCourse = { manifest: COURSE_MANIFEST, state, restart };
  setCourseStatus(`Generating seed ${COURSE_MANIFEST.seed}…`, "checking");
  window.requestAnimationFrame(frame);
}

function buildCourse() {
  const root = document.getElementById("course-root");
  const rig = document.getElementById("player-rig");
  if (!root || !rig) return;

  let expectedModels = 0;
  for (const piece of COURSE_MANIFEST.pieces) {
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
    pieceEntity.setAttribute("position", toPositionString(piece.position));
    root.appendChild(pieceEntity);

    createModel(pieceEntity, piece, asset);
    for (const [index, collider] of (piece.colliders || []).entries()) {
      createCollider(pieceEntity, collider, `${piece.id}-collider-${index + 1}`);
    }
    if (piece.checkpoint) createCheckpointMarker(pieceEntity, piece.checkpoint);

    if (piece.spring) {
      const springTrigger = createEntity();
      springTrigger.setAttribute("position", "0 0.5 0");
      springTrigger.setAttribute(
        "spring-launcher",
        `rig: #player-rig; launchSpeed: ${piece.spring.launchSpeed}; forwardSpeed: ${piece.spring.forwardSpeed}; cooldown: ${piece.spring.cooldown}; radius: 0.92; height: 1`
      );
      pieceEntity.appendChild(springTrigger);
    }

    if (piece.finish) {
      const finishTrigger = createEntity();
      finishTrigger.setAttribute("position", "0 1.1 0");
      finishTrigger.setAttribute(
        "course-finish-trigger",
        `rig: #player-rig; radiusX: ${piece.finish.radiusX}; radiusZ: ${piece.finish.radiusZ}; minRigY: ${piece.finish.minRigY}; maxRigY: ${piece.finish.maxRigY}`
      );
      pieceEntity.appendChild(finishTrigger);
    }
  }

  createStartMarker(root);
  createFinishMessage(root);
  rig.object3D.position.set(COURSE_MANIFEST.spawn.x, COURSE_MANIFEST.spawn.y, COURSE_MANIFEST.spawn.z);
  rig.setAttribute("platformer-surface-extension", "");
  window.funFunCourseManifest = COURSE_MANIFEST;

  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: COURSE_MANIFEST.version,
      generatorVersion: COURSE_MANIFEST.generatorVersion,
      mode: COURSE_MANIFEST.mode,
      seed: COURSE_MANIFEST.seed,
      checksum: COURSE_MANIFEST.checksum,
      expectedModels,
      colliderCount: root.querySelectorAll("[locomotion-collider]").length,
      checkpointCount: COURSE_MANIFEST.checkpointCount,
      spawn: COURSE_MANIFEST.spawn,
      bounds: COURSE_MANIFEST.bounds
    }
  }));

  if (root.sceneEl?.hasLoaded) refreshLocomotionColliders();
  else root.sceneEl?.addEventListener("loaded", refreshLocomotionColliders, { once: true });
}

registerGeneratedComponents();
setupCourseIdentity();
setupCourseManager();
buildCourse();
