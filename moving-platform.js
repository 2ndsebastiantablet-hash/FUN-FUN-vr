// Reusable deterministic moving-platform mechanic for the Phase 3 mechanics lab.
// The component moves existing KayKit platform entities and carries a supported
// Gorilla-locomotion rig without adding fake controller motion or changing
// the pinned movement system's velocity, launch, gravity, or collision rules.

const TRACKED_WORLD_VECTORS = Object.freeze([
  "currentLeftWorld",
  "currentRightWorld",
  "currentHeadWorld",
  "previousLeftWorld",
  "previousRightWorld",
  "leftResolved",
  "rightResolved"
]);

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function pingPongProgress(timeMs, oneWayDurationMs, phase = 0) {
  const duration = Math.max(250, finiteNumber(oneWayDurationMs, 3000));
  const cycle = duration * 2;
  const phaseOffset = positiveModulo(finiteNumber(phase, 0), 1) * cycle;
  const localTime = positiveModulo(finiteNumber(timeMs, 0) + phaseOffset, cycle);
  const linear = localTime <= duration
    ? localTime / duration
    : 2 - localTime / duration;

  // Smoothstep provides zero speed at both endpoints, avoiding sharp reversals
  // that would otherwise throw a standing VR player.
  return linear * linear * (3 - 2 * linear);
}

export function normalizeAxis(axis) {
  const x = finiteNumber(axis?.x, 0);
  const y = finiteNumber(axis?.y, 0);
  const z = finiteNumber(axis?.z, 0);
  const length = Math.hypot(x, y, z);
  if (length < 0.000001) return { x: 1, y: 0, z: 0 };
  return { x: x / length, y: y / length, z: z / length };
}

export function sampleMovingPlatformPosition({
  basePosition,
  axis,
  distance,
  duration,
  phase,
  timeMs
}) {
  const origin = basePosition || { x: 0, y: 0, z: 0 };
  const direction = normalizeAxis(axis);
  const travel = finiteNumber(distance, 0) * pingPongProgress(timeMs, duration, phase);
  return {
    x: finiteNumber(origin.x, 0) + direction.x * travel,
    y: finiteNumber(origin.y, 0) + direction.y * travel,
    z: finiteNumber(origin.z, 0) + direction.z * travel
  };
}

export function bodySupportedByBox({
  rigPosition,
  bodyHeight,
  bodyRadius,
  boxCenter,
  boxSize,
  verticalTolerance = 0.2,
  edgePadding = 0.12
}) {
  if (!rigPosition || !boxCenter || !boxSize) return false;
  const radius = Math.max(0, finiteNumber(bodyRadius, 0.32));
  const bottom = finiteNumber(rigPosition.y, 0) + finiteNumber(bodyHeight, 1.2) - radius;
  const top = finiteNumber(boxCenter.y, 0) + finiteNumber(boxSize.y, 0) * 0.5;
  const padding = radius * Math.max(0, finiteNumber(edgePadding, 0.12));
  const halfX = Math.max(0, finiteNumber(boxSize.x, 0) * 0.5) + padding;
  const halfZ = Math.max(0, finiteNumber(boxSize.z, 0) * 0.5) + padding;
  const insideXZ =
    Math.abs(finiteNumber(rigPosition.x, 0) - finiteNumber(boxCenter.x, 0)) <= halfX &&
    Math.abs(finiteNumber(rigPosition.z, 0) - finiteNumber(boxCenter.z, 0)) <= halfZ;
  return insideXZ && Math.abs(bottom - top) <= Math.max(0.02, finiteNumber(verticalTolerance, 0.2));
}

export function carryLocomotionState(locomotion, delta) {
  if (!locomotion || !delta) return false;
  const dx = finiteNumber(delta.x, 0);
  const dy = finiteNumber(delta.y, 0);
  const dz = finiteNumber(delta.z, 0);
  if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 0.0000001) return false;

  const translation = { x: dx, y: dy, z: dz };
  const addToVector = (vector) => {
    if (!vector) return;
    if (typeof vector.add === "function") {
      vector.add(translation);
      return;
    }
    vector.x = finiteNumber(vector.x, 0) + dx;
    vector.y = finiteNumber(vector.y, 0) + dy;
    vector.z = finiteNumber(vector.z, 0) + dz;
  };

  addToVector(locomotion.rig?.position);
  for (const key of TRACKED_WORLD_VECTORS) addToVector(locomotion[key]);
  locomotion.grounded = true;
  return true;
}

function registerBrowserComponent() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  if (AFRAME.components["moving-platform"]) return;

  AFRAME.registerComponent("moving-platform", {
    schema: {
      rig: { type: "selector" },
      axis: { type: "vec3", default: { x: 1, y: 0, z: 0 } },
      distance: { default: 4 },
      duration: { default: 3600 },
      phase: { default: 0 },
      startDelay: { default: 0 },
      verticalTolerance: { default: 0.2 },
      edgePadding: { default: 0.12 },
      carryMaxUpwardSpeed: { default: 0.35 }
    },

    init: function () {
      this.basePosition = this.el.object3D.position.clone();
      this.nextPosition = new THREE.Vector3();
      this.delta = new THREE.Vector3();
      this.boxCenter = new THREE.Vector3();
      this.wasSupported = false;
      this.colliders = Array.from(this.el.querySelectorAll("[locomotion-collider]"));
      this.resetMotion = this.resetMotion.bind(this);
      this.onCourseReset = this.onCourseReset.bind(this);
      window.addEventListener("course-request-reset", this.onCourseReset);
      this.el.setAttribute("data-moving-platform", "true");
    },

    remove: function () {
      window.removeEventListener("course-request-reset", this.onCourseReset);
    },

    onCourseReset: function () {
      this.resetMotion();
    },

    resetMotion: function () {
      this.el.object3D.position.copy(this.basePosition);
      this.el.object3D.updateMatrixWorld(true);
      this.wasSupported = false;
    },

    refreshColliders: function () {
      this.colliders = Array.from(this.el.querySelectorAll("[locomotion-collider]"));
    },

    bodySupported: function (locomotion) {
      if (!this.colliders.length) this.refreshColliders();
      this.el.object3D.updateMatrixWorld(true);
      for (const colliderEl of this.colliders) {
        const collider = colliderEl.components?.["locomotion-collider"];
        if (!collider || collider.data.type !== "box") continue;
        colliderEl.object3D.getWorldPosition(this.boxCenter);
        if (bodySupportedByBox({
          rigPosition: locomotion.rig.position,
          bodyHeight: locomotion.data.bodyHeight,
          bodyRadius: locomotion.data.bodyRadius,
          boxCenter: this.boxCenter,
          boxSize: collider.data.size,
          verticalTolerance: this.data.verticalTolerance,
          edgePadding: this.data.edgePadding
        })) {
          return true;
        }
      }
      return false;
    },

    tick: function (time) {
      const rig = this.data.rig;
      const locomotion = rig?.components?.["gorilla-locomotion"];
      if (!locomotion || time < this.data.startDelay) return;

      const supported = this.bodySupported(locomotion);
      const sampled = sampleMovingPlatformPosition({
        basePosition: this.basePosition,
        axis: this.data.axis,
        distance: this.data.distance,
        duration: this.data.duration,
        phase: this.data.phase,
        timeMs: time - this.data.startDelay
      });
      this.nextPosition.set(sampled.x, sampled.y, sampled.z);
      this.delta.subVectors(this.nextPosition, this.el.object3D.position);

      const canCarry = supported && locomotion.velocity.y <= this.data.carryMaxUpwardSpeed;
      if (canCarry) carryLocomotionState(locomotion, this.delta);

      this.el.object3D.position.copy(this.nextPosition);
      this.el.object3D.updateMatrixWorld(true);

      if (supported !== this.wasSupported) {
        window.dispatchEvent(new CustomEvent(
          supported ? "moving-platform-boarded" : "moving-platform-left",
          {
            detail: {
              platformId: this.el.id || "moving-platform",
              carried: canCarry,
              axis: { x: this.data.axis.x, y: this.data.axis.y, z: this.data.axis.z }
            }
          }
        ));
        this.wasSupported = supported;
      }
    }
  });
}

registerBrowserComponent();
