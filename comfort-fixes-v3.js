// Quest comfort adjustments layered around the pinned Gorilla locomotion source.
// V3 avoids assuming that A-Frame/Three.js vector objects are ready during early
// scene startup on Meta Quest Browser.

const ORIGINAL_RIG_Y_FROM_PLATFORM_BASE = 0.32;
const COMFORT_RIG_Y_FROM_PLATFORM_BASE = 0.12;
const SPAWN_Y_ADJUSTMENT = COMFORT_RIG_Y_FROM_PLATFORM_BASE - ORIGINAL_RIG_Y_FROM_PLATFORM_BASE;
const PLAYER_HEIGHT_OFFSET = 0.88;
const BODY_RADIUS = 0.32;
const BODY_HEIGHT = PLAYER_HEIGHT_OFFSET + BODY_RADIUS;
const IDLE_STOP_SPEED = 0.42;
const GROUND_BRAKE_STRENGTH = 9.5;
const DEPLOYMENT_BUILD = "20260728-comfort-v3";

const adjustedSpawnClones = new WeakSet();

function assignXYZ(target, x, y, z) {
  if (!target) return false;
  target.x = Number(x) || 0;
  target.y = Number(y) || 0;
  target.z = Number(z) || 0;
  return true;
}

function colliderBounds(colliderEl, center, min, max) {
  const component = colliderEl?.components?.["locomotion-collider"];
  if (!component || component.data.type !== "box") return false;
  colliderEl.object3D?.getWorldPosition?.(center);
  const size = component.data.size;
  if (!center || !size || !min || !max) return false;
  assignXYZ(min, center.x - size.x * 0.5, center.y - size.y * 0.5, center.z - size.z * 0.5);
  assignXYZ(max, center.x + size.x * 0.5, center.y + size.y * 0.5, center.z + size.z * 0.5);
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
      if (!locomotion?.rig?.position || !locomotion?.data) return false;
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
      const locomotion = this.el.components?.["gorilla-locomotion"];
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
        if (locomotion.launchVelocity) {
          locomotion.launchVelocity.x = 0;
          locomotion.launchVelocity.z = 0;
        }
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

function adjustedSpawnObject(spawn) {
  if (!spawn || typeof spawn !== "object") return spawn;
  if (adjustedSpawnClones.has(spawn)) return spawn;

  const x = Number(spawn.x);
  const y = Number(spawn.y);
  const z = Number(spawn.z);
  if (![x, y, z].every(Number.isFinite)) return spawn;

  const clone = { ...spawn, x, y: y + SPAWN_Y_ADJUSTMENT, z };
  adjustedSpawnClones.add(clone);
  return clone;
}

function configureRig() {
  const rig = document.getElementById("player-rig");
  if (!rig) return;

  rig.setAttribute("gorilla-locomotion", "playerHeightOffset", PLAYER_HEIGHT_OFFSET);
  rig.setAttribute("gorilla-locomotion", "bodyRadius", BODY_RADIUS);
  rig.setAttribute("gorilla-locomotion", "bodyHeight", BODY_HEIGHT);
  rig.setAttribute("comfort-grounding", "");

  const locomotion = rig.components?.["gorilla-locomotion"];
  if (locomotion?.data) {
    locomotion.data.playerHeightOffset = PLAYER_HEIGHT_OFFSET;
    locomotion.data.bodyRadius = BODY_RADIUS;
    locomotion.data.bodyHeight = BODY_HEIGHT;
  }
}

function placeRig(rig, spawn) {
  if (!rig || !spawn) return false;
  const position = rig.object3D?.position;
  if (position) return assignXYZ(position, spawn.x, spawn.y, spawn.z);
  rig.setAttribute?.("position", `${spawn.x} ${spawn.y} ${spawn.z}`);
  return true;
}

function adjustBuiltCourse() {
  const manifest = window.funFunCourseManifest;
  const comfortSpawn = adjustedSpawnObject(manifest?.spawn);

  document.querySelectorAll("[spring-launcher]").forEach((entity) => {
    const component = entity.components?.["spring-launcher"];
    if (component?.data) component.data.height = 0.92;
  });

  configureRig();

  const rig = document.getElementById("player-rig");
  if (rig && comfortSpawn) placeRig(rig, comfortSpawn);

  const safety = rig?.components?.["playtest-safety"];
  if (safety?.setSpawn && comfortSpawn) safety.setSpawn(comfortSpawn);
}

function adjustEventSpawn(event) {
  const detail = event?.detail;
  if (!detail?.spawn) return;
  const adjusted = adjustedSpawnObject(detail.spawn);
  if (adjusted === detail.spawn) return;
  try {
    detail.spawn = adjusted;
  } catch (error) {
    console.warn("Could not replace an immutable course-event spawn; using source value.", error);
  }
}

function createFreshCourseUrl() {
  const mode = document.getElementById("course-mode")?.value === "generated" ? "generated" : "calibration";
  const seed = String(document.getElementById("course-seed")?.value || "FUNFUN01")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 18) || "FUNFUN01";
  const current = new URL(window.location.href);
  const directory = current.pathname.endsWith("/")
    ? current.pathname
    : current.pathname.slice(0, current.pathname.lastIndexOf("/") + 1);
  current.pathname = mode === "generated" ? `${directory}generated.html` : directory;
  current.search = "";
  if (mode === "generated") {
    current.searchParams.set("mode", "generated");
    current.searchParams.set("seed", seed);
  }
  current.searchParams.set("build", DEPLOYMENT_BUILD);
  current.hash = "";
  return current.toString();
}

function installFreshCourseLoader() {
  const button = document.getElementById("load-course");
  if (!button || button.dataset.freshLoader === "true") return;
  button.dataset.freshLoader = "true";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(createFreshCourseUrl());
  }, true);
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
  installFreshCourseLoader();
  window.setTimeout(adjustBuiltCourse, 0);
  window.setTimeout(adjustBuiltCourse, 200);
});

const scene = document.querySelector("a-scene");
scene?.addEventListener("loaded", adjustBuiltCourse, { once: true });
scene?.addEventListener("enter-vr", () => {
  window.setTimeout(() => {
    adjustBuiltCourse();
    const rig = document.getElementById("player-rig");
    const safety = rig?.components?.["playtest-safety"];
    const spawn = adjustedSpawnObject(window.funFunCourseManifest?.spawn);
    if (spawn && safety?.setSpawn) safety.setSpawn(spawn);
    if (spawn && rig) placeRig(rig, spawn);
    if (safety?.resetMotionOnly) safety.resetMotionOnly();
  }, 575);
});

window.FUN_FUN_COMFORT = Object.freeze({
  playerHeightOffset: PLAYER_HEIGHT_OFFSET,
  bodyHeight: BODY_HEIGHT,
  rigYFromPlatformBase: COMFORT_RIG_Y_FROM_PLATFORM_BASE,
  idleStopSpeed: IDLE_STOP_SPEED,
  groundBrakeStrength: GROUND_BRAKE_STRENGTH,
  deploymentBuild: DEPLOYMENT_BUILD
});
