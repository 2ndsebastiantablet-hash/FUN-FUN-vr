// Quest comfort adjustments layered around the pinned Gorilla locomotion source.
// This file does not replace the source movement system or its collision solver.

const ORIGINAL_RIG_Y_FROM_PLATFORM_BASE = 0.32;
const COMFORT_RIG_Y_FROM_PLATFORM_BASE = 0.12;
const SPAWN_Y_ADJUSTMENT = COMFORT_RIG_Y_FROM_PLATFORM_BASE - ORIGINAL_RIG_Y_FROM_PLATFORM_BASE;
const PLAYER_HEIGHT_OFFSET = 0.88;
const BODY_RADIUS = 0.32;
const BODY_HEIGHT = PLAYER_HEIGHT_OFFSET + BODY_RADIUS;
const IDLE_STOP_SPEED = 0.42;
const GROUND_BRAKE_STRENGTH = 9.5;
const adjustedSpawns = new WeakSet();
const adjustedManifests = new WeakSet();

function colliderBounds(colliderEl, center, min, max) {
  const component = colliderEl?.components?.["locomotion-collider"];
  if (!component || component.data.type !== "box") return false;
  colliderEl.object3D.getWorldPosition(center);
  const size = component.data.size;
  min.set(center.x - size.x * 0.5, center.y - size.y * 0.5, center.z - size.z * 0.5);
  max.set(center.x + size.x * 0.5, center.y + size.y * 0.5, center.z + size.z * 0.5);
  return true;
}

function registerComfortGrounding() {
  if (!window.AFRAME || AFRAME.components["comfort-grounding"]) return;

  AFRAME.registerComponent("comfort-grounding", {
    init: function () {
      this.center = new THREE.Vector3();
      this.min = new THREE.Vector3();
      this.max = new THREE.Vector3();
    },

    bodySupported: function (locomotion) {
      const bodyCenterY = locomotion.rig.position.y + locomotion.data.bodyHeight;
      const bodyBottom = bodyCenterY - locomotion.data.bodyRadius;
      const x = locomotion.rig.position.x;
      const z = locomotion.rig.position.z;
      const colliders = locomotion.colliders || [];

      for (const colliderEl of colliders) {
        if (!colliderBounds(colliderEl, this.center, this.min, this.max)) continue;
        const insideXZ =
          x >= this.min.x - locomotion.data.bodyRadius * 0.35 &&
          x <= this.max.x + locomotion.data.bodyRadius * 0.35 &&
          z >= this.min.z - locomotion.data.bodyRadius * 0.35 &&
          z <= this.max.z + locomotion.data.bodyRadius * 0.35;
        if (insideXZ && bodyBottom >= this.max.y - 0.16 && bodyBottom <= this.max.y + 0.16) return true;
      }
      return false;
    },

    tock: function (_time, deltaMs) {
      const locomotion = this.el.components["gorilla-locomotion"];
      if (!locomotion?.velocity || !this.bodySupported(locomotion)) return;

      locomotion.grounded = true;
      if (locomotion.velocity.y < 0.08) locomotion.velocity.y = 0;

      const activePush = locomotion.frameMovement?.lengthSq?.() > 0.000025;
      const launching = locomotion.velocity.y > 0.08;
      if (activePush || launching) return;

      const horizontalSpeed = Math.hypot(locomotion.velocity.x, locomotion.velocity.z);
      if (horizontalSpeed <= IDLE_STOP_SPEED) {
        locomotion.velocity.x = 0;
        locomotion.velocity.z = 0;
        locomotion.launchVelocity.x = 0;
        locomotion.launchVelocity.z = 0;
        return;
      }

      const deltaTime = Math.min(Math.max(Number(deltaMs) || 0, 0) / 1000, 0.05);
      const factor = Math.exp(-GROUND_BRAKE_STRENGTH * deltaTime);
      locomotion.velocity.x *= factor;
      locomotion.velocity.z *= factor;

      if (Math.hypot(locomotion.velocity.x, locomotion.velocity.z) <= IDLE_STOP_SPEED) {
        locomotion.velocity.x = 0;
        locomotion.velocity.z = 0;
      }
    }
  });
}

function adjustSpawnObject(spawn) {
  if (!spawn || typeof spawn !== "object" || adjustedSpawns.has(spawn)) return spawn;
  if (Number.isFinite(Number(spawn.y))) spawn.y = Number(spawn.y) + SPAWN_Y_ADJUSTMENT;
  adjustedSpawns.add(spawn);
  return spawn;
}

function adjustSpawnArray(spawn) {
  if (!Array.isArray(spawn) || adjustedSpawns.has(spawn)) return spawn;
  if (Number.isFinite(Number(spawn[1]))) spawn[1] = Number(spawn[1]) + SPAWN_Y_ADJUSTMENT;
  adjustedSpawns.add(spawn);
  return spawn;
}

function configureRig() {
  const rig = document.getElementById("player-rig");
  if (!rig) return;

  rig.setAttribute("gorilla-locomotion", "playerHeightOffset", PLAYER_HEIGHT_OFFSET);
  rig.setAttribute("gorilla-locomotion", "bodyRadius", BODY_RADIUS);
  rig.setAttribute("gorilla-locomotion", "bodyHeight", BODY_HEIGHT);
  rig.setAttribute("comfort-grounding", "");

  const locomotion = rig.components?.["gorilla-locomotion"];
  if (locomotion) {
    locomotion.data.playerHeightOffset = PLAYER_HEIGHT_OFFSET;
    locomotion.data.bodyRadius = BODY_RADIUS;
    locomotion.data.bodyHeight = BODY_HEIGHT;
  }
}

function adjustBuiltCourse() {
  const manifest = window.funFunCourseManifest;
  if (manifest && !adjustedManifests.has(manifest)) {
    adjustSpawnObject(manifest.spawn);
    for (const piece of manifest.pieces || []) {
      if (piece.checkpoint?.spawn) adjustSpawnArray(piece.checkpoint.spawn);
    }
    adjustedManifests.add(manifest);
  }

  document.querySelectorAll("[course-checkpoint-trigger]").forEach((entity) => {
    const component = entity.components?.["course-checkpoint-trigger"];
    if (component?.data?.spawn) adjustSpawnObject(component.data.spawn);
  });

  // The slightly raised rig still needs a lower spring detection band than the original demo.
  document.querySelectorAll("[spring-launcher]").forEach((entity) => {
    const component = entity.components?.["spring-launcher"];
    if (component) component.data.height = 0.92;
  });

  configureRig();

  const rig = document.getElementById("player-rig");
  if (rig && manifest?.spawn) {
    rig.object3D.position.set(manifest.spawn.x, manifest.spawn.y, manifest.spawn.z);
  }

  const safety = rig?.components?.["playtest-safety"];
  if (safety?.setSpawn && manifest?.spawn) safety.setSpawn(manifest.spawn);
}

function adjustEventSpawn(event) {
  if (event?.detail?.spawn) adjustSpawnObject(event.detail.spawn);
}

registerComfortGrounding();
window.addEventListener("course-checkpoint", adjustEventSpawn, true);
window.addEventListener("course-request-reset", adjustEventSpawn, true);
window.addEventListener("course-built", () => {
  adjustBuiltCourse();
  window.setTimeout(adjustBuiltCourse, 50);
  window.setTimeout(adjustBuiltCourse, 250);
});

document.addEventListener("DOMContentLoaded", () => {
  configureRig();
  window.setTimeout(adjustBuiltCourse, 0);
  window.setTimeout(adjustBuiltCourse, 200);
});

const scene = document.querySelector("a-scene");
scene?.addEventListener("enter-vr", () => {
  // main.js performs its normal stabilization reset at 500 ms. Reapply the
  // tuned spawn just afterward so an older calibration height cannot return.
  window.setTimeout(() => {
    adjustBuiltCourse();
    const rig = document.getElementById("player-rig");
    const safety = rig?.components?.["playtest-safety"];
    const spawn = window.funFunCourseManifest?.spawn;
    if (spawn && safety?.setSpawn) safety.setSpawn(spawn);
    if (spawn && rig) rig.object3D.position.set(spawn.x, spawn.y, spawn.z);
    if (safety?.resetMotionOnly) safety.resetMotionOnly();
  }, 575);
});

window.FUN_FUN_COMFORT = Object.freeze({
  playerHeightOffset: PLAYER_HEIGHT_OFFSET,
  bodyHeight: BODY_HEIGHT,
  rigYFromPlatformBase: COMFORT_RIG_Y_FROM_PLATFORM_BASE,
  idleStopSpeed: IDLE_STOP_SPEED,
  groundBrakeStrength: GROUND_BRAKE_STRENGTH
});
