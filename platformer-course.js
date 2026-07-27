import { getPlatformerAsset } from "./assets/platformer/registry.js";

const COURSE_VERSION = "mechanics-course-v1";
const INITIAL_SPAWN = Object.freeze({ x: 0, y: 0.32, z: 8 });
const COLOR_FALLBACKS = {
  blue: "#2563EB",
  green: "#22C55E",
  yellow: "#FACC15",
  red: "#EF4444",
  neutral: "#A16207"
};

const PLATFORM_COLLIDER = Object.freeze({
  position: [0, 0.5, 0],
  size: [4, 1, 4]
});

const COURSE_MANIFEST = Object.freeze({
  version: COURSE_VERSION,
  seed: "PHASE-2-HANDCRAFTED",
  spawn: INITIAL_SPAWN,
  pieces: [
    {
      id: "start-platform",
      assetId: "platform-square-blue",
      position: [0, 0, 8],
      colliders: [PLATFORM_COLLIDER]
    },
    {
      id: "approach-platform",
      assetId: "platform-square-blue",
      position: [0, 0, 3.3],
      colliders: [PLATFORM_COLLIDER]
    },
    {
      id: "slope-platform",
      assetId: "platform-slope-blue",
      position: [0, -1, -1],
      colliderFactory: "slope-steps"
    },
    {
      id: "checkpoint-platform",
      assetId: "platform-square-blue",
      position: [0, 2, -5.3],
      colliders: [PLATFORM_COLLIDER],
      checkpoint: {
        id: "checkpoint-1",
        label: "Slope checkpoint",
        spawn: [0, 2.32, -5.3],
        index: 1
      }
    },
    {
      id: "spring-platform",
      assetId: "platform-square-blue",
      position: [0, 2, -10],
      colliders: [PLATFORM_COLLIDER]
    },
    {
      id: "spring-pad",
      assetId: "spring-pad-green",
      position: [0, 3, -10],
      colliders: [{ position: [0, 0.5, 0], size: [1.5, 1, 1.5] }],
      spring: {
        launchSpeed: 8.4,
        forwardSpeed: 4.5,
        cooldown: 950
      }
    },
    {
      id: "spring-landing",
      assetId: "platform-square-blue",
      position: [0, 4.5, -15],
      colliders: [PLATFORM_COLLIDER],
      checkpoint: {
        id: "checkpoint-2",
        label: "Spring checkpoint",
        spawn: [0, 4.82, -15],
        index: 2
      }
    },
    {
      id: "high-platform",
      assetId: "platform-square-blue",
      position: [0, 4.5, -19.7],
      colliders: [PLATFORM_COLLIDER]
    },
    {
      id: "descent-platform",
      assetId: "platform-square-blue",
      position: [0, 3, -24.4],
      colliders: [PLATFORM_COLLIDER]
    },
    {
      id: "finish-platform",
      assetId: "platform-square-blue",
      position: [0, 2, -29.1],
      colliders: [PLATFORM_COLLIDER]
    },
    {
      id: "finish-gate",
      assetId: "finish-wide",
      position: [0, 3, -30.2],
      scale: 0.45,
      finish: {
        radiusX: 1.85,
        radiusZ: 0.65,
        minRigY: 1.8,
        maxRigY: 5.6
      }
    }
  ]
});

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

function createSlopeStepColliders(parent, id) {
  const stepCount = 10;
  const depth = 4 / stepCount;
  const lowTop = 2;
  const highTop = 4;
  const modelBaseY = 0;

  for (let index = 0; index < stepCount; index += 1) {
    const progress = (index + 0.5) / stepCount;
    const topY = lowTop + (highTop - lowTop) * progress;
    const height = topY - modelBaseY;
    const localZ = 2 - depth * (index + 0.5);
    createCollider(parent, {
      position: [0, modelBaseY + height * 0.5, localZ],
      size: [4, height, depth]
    }, `${id}-step-${index + 1}`);
  }
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

  model.addEventListener("model-loaded", function () {
    fallback.setAttribute("visible", false);
    window.dispatchEvent(new CustomEvent("course-asset-loaded", {
      detail: { pieceId: piece.id, assetId: asset.id }
    }));
  });

  model.addEventListener("model-error", function (event) {
    fallback.setAttribute("visible", true);
    window.dispatchEvent(new CustomEvent("course-asset-error", {
      detail: {
        pieceId: piece.id,
        assetId: asset.id,
        message: event && event.detail ? String(event.detail) : "Model failed to load"
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
  const panel = createEntity("a-plane");
  panel.setAttribute("position", "0 6 -31.25");
  panel.setAttribute("width", "7.6");
  panel.setAttribute("height", "1.9");
  panel.setAttribute("color", "#FFFFFF");

  const heading = createEntity("a-text");
  heading.setAttribute("value", "FINISH");
  heading.setAttribute("position", "0 0.36 0.01");
  heading.setAttribute("align", "center");
  heading.setAttribute("width", "6");
  heading.setAttribute("color", "#0F172A");
  panel.appendChild(heading);

  const message = createEntity("a-text");
  message.id = "finish-message";
  message.setAttribute("value", "Pass through the gate to complete the mechanics course");
  message.setAttribute("position", "0 -0.32 0.01");
  message.setAttribute("align", "center");
  message.setAttribute("width", "6.5");
  message.setAttribute("color", "#334155");
  panel.appendChild(message);

  root.appendChild(panel);
}

function refreshLocomotionColliders() {
  const rig = document.getElementById("player-rig");
  const locomotion = rig && rig.components && rig.components["gorilla-locomotion"];
  if (!locomotion) return;
  locomotion.colliders = Array.from(document.querySelectorAll("[locomotion-collider]"));
}

function registerSurfaceExtension() {
  if (!window.AFRAME || AFRAME.components["platformer-surface-extension"]) return;

  AFRAME.registerComponent("platformer-surface-extension", {
    init: function () {
      this.installed = false;
      this.boundsMin = new THREE.Vector3();
      this.boundsMax = new THREE.Vector3();
      this.colliderCenter = new THREE.Vector3();
      this.install = this.install.bind(this);
      if (this.el.sceneEl.hasLoaded) this.install();
      else this.el.sceneEl.addEventListener("loaded", this.install, { once: true });
    },

    remove: function () {
      if (this.locomotion && this.originalTock) {
        this.locomotion.tock = this.originalTock;
      }
    },

    install: function () {
      if (this.installed) return;
      const locomotion = this.el.components["gorilla-locomotion"];
      if (!locomotion) {
        window.setTimeout(this.install, 50);
        return;
      }

      this.installed = true;
      this.locomotion = locomotion;
      this.originalTock = locomotion.tock.bind(locomotion);
      refreshLocomotionColliders();

      locomotion.tock = (time, deltaMs) => {
        this.originalTock(time, deltaMs);
        this.applyPlatformSupport(deltaMs);
      };
    },

    colliderBounds: function (colliderEl, targetMin, targetMax) {
      const component = colliderEl.components["locomotion-collider"];
      if (!component || component.data.type !== "box") return false;

      colliderEl.object3D.getWorldPosition(this.colliderCenter);
      const size = component.data.size;
      targetMin.set(
        this.colliderCenter.x - size.x * 0.5,
        this.colliderCenter.y - size.y * 0.5,
        this.colliderCenter.z - size.z * 0.5
      );
      targetMax.set(
        this.colliderCenter.x + size.x * 0.5,
        this.colliderCenter.y + size.y * 0.5,
        this.colliderCenter.z + size.z * 0.5
      );
      return true;
    },

    handOnTop: function (position, radius) {
      const min = this.boundsMin;
      const max = this.boundsMax;

      for (const colliderEl of this.locomotion.colliders) {
        if (!this.colliderBounds(colliderEl, min, max)) continue;
        const bottom = position.y - radius;
        const insideXZ =
          position.x >= min.x - radius * 0.35 &&
          position.x <= max.x + radius * 0.35 &&
          position.z >= min.z - radius * 0.35 &&
          position.z <= max.z + radius * 0.35;
        if (insideXZ && bottom >= max.y - 0.22 && bottom <= max.y + 0.16) return true;
      }
      return false;
    },

    bodySupported: function () {
      const min = this.boundsMin;
      const max = this.boundsMax;
      const locomotion = this.locomotion;
      const bodyCenterY = locomotion.rig.position.y + locomotion.data.bodyHeight;
      const bodyBottom = bodyCenterY - locomotion.data.bodyRadius;
      const x = locomotion.rig.position.x;
      const z = locomotion.rig.position.z;

      for (const colliderEl of locomotion.colliders) {
        if (!this.colliderBounds(colliderEl, min, max)) continue;
        const insideXZ =
          x >= min.x - locomotion.data.bodyRadius * 0.35 &&
          x <= max.x + locomotion.data.bodyRadius * 0.35 &&
          z >= min.z - locomotion.data.bodyRadius * 0.35 &&
          z <= max.z + locomotion.data.bodyRadius * 0.35;
        if (insideXZ && bodyBottom >= max.y - 0.14 && bodyBottom <= max.y + 0.14) return true;
      }
      return false;
    },

    applyPlatformSupport: function (deltaMs) {
      const locomotion = this.locomotion;
      if (!locomotion || !locomotion.colliders.length) return;

      const leftPosition = locomotion.leftTouchingSurface ? locomotion.leftResolved : locomotion.currentLeftWorld;
      const rightPosition = locomotion.rightTouchingSurface ? locomotion.rightResolved : locomotion.currentRightWorld;
      const leftOnTop = this.handOnTop(leftPosition, locomotion.data.handRadius);
      const rightOnTop = this.handOnTop(rightPosition, locomotion.data.handRadius);
      const supported = this.bodySupported();

      locomotion.leftTouchingFloor = locomotion.leftTouchingFloor || leftOnTop;
      locomotion.rightTouchingFloor = locomotion.rightTouchingFloor || rightOnTop;
      locomotion.wasTouchingFloor = locomotion.wasTouchingFloor || leftOnTop || rightOnTop;
      locomotion.wasTwoHandTouchingFloor =
        locomotion.wasTwoHandTouchingFloor || (leftOnTop && rightOnTop);
      locomotion.grounded = locomotion.grounded || supported;

      if (supported && locomotion.velocity.y < 0.05) {
        locomotion.velocity.y = Math.max(0, locomotion.velocity.y);
        const deltaTime = Math.min(Math.max(deltaMs || 0, 0) / 1000, 0.05);
        const extraGroundDrag = Math.max(0, locomotion.data.groundDrag - locomotion.data.airDrag);
        const factor = Math.max(0, 1 - extraGroundDrag * deltaTime);
        locomotion.velocity.x *= factor;
        locomotion.velocity.z *= factor;
      }
    }
  });
}

function registerSpringLauncher() {
  if (!window.AFRAME || AFRAME.components["spring-launcher"]) return;

  AFRAME.registerComponent("spring-launcher", {
    schema: {
      rig: { type: "selector" },
      launchSpeed: { default: 8.4 },
      forwardSpeed: { default: 4.5 },
      cooldown: { default: 950 },
      radius: { default: 0.92 },
      height: { default: 1 }
    },

    init: function () {
      this.lastLaunch = -Infinity;
      this.center = new THREE.Vector3();
      this.wasInside = false;
    },

    tick: function (time) {
      const rig = this.data.rig;
      if (!rig || !rig.components) return;
      const locomotion = rig.components["gorilla-locomotion"];
      if (!locomotion) return;

      this.el.object3D.getWorldPosition(this.center);
      const rigPosition = rig.object3D.position;
      const dx = rigPosition.x - this.center.x;
      const dz = rigPosition.z - this.center.z;
      const insideXZ = dx * dx + dz * dz <= this.data.radius * this.data.radius;
      const surfaceY = this.center.y + this.data.height * 0.5;
      const nearSurface = rigPosition.y >= surfaceY - 0.95 && rigPosition.y <= surfaceY + 0.38;
      const inside = insideXZ && nearSurface;

      if (
        inside &&
        !this.wasInside &&
        time - this.lastLaunch >= this.data.cooldown &&
        locomotion.velocity.y <= 1.5
      ) {
        this.lastLaunch = time;
        locomotion.velocity.y = Math.max(locomotion.velocity.y, this.data.launchSpeed);
        locomotion.velocity.z = Math.min(locomotion.velocity.z, -this.data.forwardSpeed);
        locomotion.launchVelocity.copy(locomotion.velocity);
        locomotion.pushHistory = [];
        locomotion.hasPreviousHands = false;

        const model = this.el.parentElement && this.el.parentElement.querySelector("[data-course-model]");
        if (model) {
          model.removeAttribute("animation__spring");
          model.setAttribute(
            "animation__spring",
            "property: scale; from: 1 0.72 1; to: 1 1 1; dur: 220; easing: easeOutElastic"
          );
        }

        window.dispatchEvent(new CustomEvent("spring-launched", {
          detail: { launchSpeed: this.data.launchSpeed, forwardSpeed: this.data.forwardSpeed }
        }));
      }

      this.wasInside = inside;
      if (!inside && time - this.lastLaunch > 250) this.wasInside = false;
    }
  });
}

function registerCheckpointTrigger() {
  if (!window.AFRAME || AFRAME.components["course-checkpoint-trigger"]) return;

  AFRAME.registerComponent("course-checkpoint-trigger", {
    schema: {
      rig: { type: "selector" },
      checkpointId: { default: "" },
      label: { default: "Checkpoint" },
      index: { default: 0 },
      spawn: { type: "vec3" },
      radius: { default: 1.45 }
    },

    init: function () {
      this.activated = false;
      this.center = new THREE.Vector3();
    },

    tick: function () {
      if (this.activated || !this.data.rig) return;
      this.el.object3D.getWorldPosition(this.center);
      const rigPosition = this.data.rig.object3D.position;
      const dx = rigPosition.x - this.center.x;
      const dz = rigPosition.z - this.center.z;
      const dy = Math.abs(rigPosition.y - this.center.y);
      if (dx * dx + dz * dz <= this.data.radius * this.data.radius && dy <= 2.1) {
        this.activated = true;
        window.dispatchEvent(new CustomEvent("course-checkpoint", {
          detail: {
            id: this.data.checkpointId,
            label: this.data.label,
            index: this.data.index,
            spawn: {
              x: this.data.spawn.x,
              y: this.data.spawn.y,
              z: this.data.spawn.z
            }
          }
        }));
      }
    }
  });
}

function registerFinishTrigger() {
  if (!window.AFRAME || AFRAME.components["course-finish-trigger"]) return;

  AFRAME.registerComponent("course-finish-trigger", {
    schema: {
      rig: { type: "selector" },
      radiusX: { default: 1.8 },
      radiusZ: { default: 0.65 },
      minRigY: { default: -2 },
      maxRigY: { default: 10 }
    },

    init: function () {
      this.completed = false;
      this.center = new THREE.Vector3();
    },

    tick: function () {
      if (this.completed || !this.data.rig) return;
      this.el.object3D.getWorldPosition(this.center);
      const rigPosition = this.data.rig.object3D.position;
      const inside =
        Math.abs(rigPosition.x - this.center.x) <= this.data.radiusX &&
        Math.abs(rigPosition.z - this.center.z) <= this.data.radiusZ &&
        rigPosition.y >= this.data.minRigY &&
        rigPosition.y <= this.data.maxRigY;

      if (inside) {
        this.completed = true;
        window.dispatchEvent(new CustomEvent("course-finish", {
          detail: { courseVersion: COURSE_VERSION }
        }));
      }
    }
  });
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

    if (piece.colliderFactory === "slope-steps") {
      createSlopeStepColliders(pieceEntity, piece.id);
    } else {
      for (const collider of piece.colliders || []) {
        createCollider(pieceEntity, collider, `${piece.id}-collider`);
      }
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

  const startRing = createEntity("a-ring");
  startRing.setAttribute("position", "0 1.015 8");
  startRing.setAttribute("rotation", "-90 0 0");
  startRing.setAttribute("radius-inner", "0.5");
  startRing.setAttribute("radius-outer", "0.66");
  startRing.setAttribute("color", "#FFFFFF");
  root.appendChild(startRing);

  createFinishMessage(root);

  rig.setAttribute("platformer-surface-extension", "");
  window.funFunCourseManifest = COURSE_MANIFEST;
  window.dispatchEvent(new CustomEvent("course-built", {
    detail: {
      version: COURSE_VERSION,
      expectedModels,
      colliderCount: root.querySelectorAll("[locomotion-collider]").length,
      spawn: INITIAL_SPAWN
    }
  }));

  if (root.sceneEl && root.sceneEl.hasLoaded) refreshLocomotionColliders();
  else if (root.sceneEl) root.sceneEl.addEventListener("loaded", refreshLocomotionColliders, { once: true });
}

function setupCourseManager() {
  const rig = document.getElementById("player-rig");
  const courseStatus = document.getElementById("course-status");
  const courseDetails = document.getElementById("course-details");
  const restartButton = document.getElementById("restart-course");
  if (!rig || !courseStatus || !courseDetails || !restartButton) return;

  function finishMessageElement() {
    return document.getElementById("finish-message");
  }

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

  function setCourseStatus(message, mode = "checking") {
    courseStatus.textContent = message;
    courseStatus.dataset.state = mode;
  }

  function formatTime(milliseconds) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }

  function updateTimer(now) {
    if (now - state.lastUiUpdate < 100) return;
    state.lastUiUpdate = now;

    if (state.running && !state.completed) {
      courseDetails.textContent =
        `Time ${formatTime(now - state.startedAt)} • Checkpoint ${state.checkpointIndex}/2 • Version ${COURSE_VERSION}`;
    }
  }

  function frame(now) {
    if (!state.running && !state.completed && rig.object3D.position.z < 6.1) {
      state.running = true;
      state.startedAt = now;
      setCourseStatus("Run active — reach the finish gate.", "ready");
      window.dispatchEvent(new CustomEvent("course-started", { detail: { startedAt: now } }));
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
    setCourseStatus("Course restarted. Leave the first platform to start the timer.", "ready");
    courseDetails.textContent = `Checkpoint 0/2 • Version ${COURSE_VERSION}`;
    const finishMessage = finishMessageElement();
    if (finishMessage) finishMessage.setAttribute("value", "Pass through the gate to complete the mechanics course");

    document.querySelectorAll("[course-checkpoint-trigger]").forEach((entity) => {
      const component = entity.components["course-checkpoint-trigger"];
      if (component) component.activated = false;
    });
    document.querySelectorAll("[course-finish-trigger]").forEach((entity) => {
      const component = entity.components["course-finish-trigger"];
      if (component) component.completed = false;
    });

    window.dispatchEvent(new CustomEvent("course-request-reset", {
      detail: { spawn: INITIAL_SPAWN, message: "Course restarted" }
    }));
  }

  window.addEventListener("course-built", function (event) {
    state.expectedModels = event.detail.expectedModels;
    setCourseStatus(`Course built. Loading ${state.expectedModels} KayKit models…`, "checking");
  });

  window.addEventListener("course-asset-loaded", function () {
    state.loadedModels += 1;
    const complete = state.loadedModels + state.failedModels >= state.expectedModels;
    setCourseStatus(
      complete
        ? `Course ready. ${state.loadedModels}/${state.expectedModels} models loaded.`
        : `Loading KayKit models: ${state.loadedModels}/${state.expectedModels}`,
      complete && state.failedModels === 0 ? "ready" : "checking"
    );
  });

  window.addEventListener("course-asset-error", function (event) {
    state.failedModels += 1;
    setCourseStatus(
      `A KayKit model failed to load (${event.detail.assetId}). A collision-matched fallback remains available.`,
      "warning"
    );
  });

  window.addEventListener("course-checkpoint", function (event) {
    state.checkpointIndex = Math.max(state.checkpointIndex, event.detail.index || 0);
    setCourseStatus(`${event.detail.label} reached. Falls now return here.`, "ready");
  });

  window.addEventListener("spring-launched", function () {
    setCourseStatus("Spring launched — aim for the high platform.", "ready");
  });

  window.addEventListener("course-finish", function () {
    if (state.completed) return;
    const now = performance.now();
    if (!state.running) {
      state.running = true;
      state.startedAt = now;
    }
    state.completed = true;
    state.completedAt = now;
    const elapsed = Math.max(0, state.completedAt - state.startedAt);
    const oldBest = Number(localStorage.getItem("funfun-mechanics-best") || 0);
    const isBest = !oldBest || elapsed < oldBest;
    if (isBest) localStorage.setItem("funfun-mechanics-best", String(elapsed));

    setCourseStatus(
      `Course complete in ${formatTime(elapsed)}${isBest ? " — new best time!" : ""}`,
      "ready"
    );
    courseDetails.textContent =
      `Finish time ${formatTime(elapsed)} • Best ${formatTime(isBest ? elapsed : oldBest)} • Checkpoints ${state.checkpointIndex}/2`;
    const finishMessage = finishMessageElement();
    if (finishMessage) {
      finishMessage.setAttribute(
        "value",
        `COURSE COMPLETE — ${formatTime(elapsed)}${isBest ? " — NEW BEST" : ""}`
      );
    }
  });

  restartButton.addEventListener("click", restart);
  window.funFunCourse = {
    manifest: COURSE_MANIFEST,
    state,
    restart
  };

  setCourseStatus("Course geometry created. Loading KayKit models…", "checking");
  window.requestAnimationFrame(frame);
}

registerSurfaceExtension();
registerSpringLauncher();
registerCheckpointTrigger();
registerFinishTrigger();

// Module scripts run after the document is parsed. Install listeners before building
// so fast cached model loads cannot outrun the course status manager.
setupCourseManager();
buildCourse();
