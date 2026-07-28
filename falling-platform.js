// Reusable falling-platform mechanic for the Phase 3 mechanics laboratory.
// Quest playtesting showed the original warning and drop windows were too slow.
// The visible warning remains readable, but effective timings are now sharply
// reduced so players must react immediately.

export const FALLING_PLATFORM_TUNING = Object.freeze({
  warningScale: 0.48,
  fallScale: 0.55,
  minimumWarning: 120,
  minimumFall: 220
});

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function scaledFallingTimings({ warningDelay = 700, fallDuration = 900, resetDelay = 2200 } = {}) {
  return {
    warningDelay: Math.max(
      FALLING_PLATFORM_TUNING.minimumWarning,
      finiteNumber(warningDelay, 700) * FALLING_PLATFORM_TUNING.warningScale
    ),
    fallDuration: Math.max(
      FALLING_PLATFORM_TUNING.minimumFall,
      finiteNumber(fallDuration, 900) * FALLING_PLATFORM_TUNING.fallScale
    ),
    resetDelay: Math.max(200, finiteNumber(resetDelay, 2200))
  };
}

export function fallingPlatformPhase(elapsedMs, warningDelay = 700, fallDuration = 900, resetDelay = 2200) {
  const elapsed = Math.max(0, finiteNumber(elapsedMs, 0));
  const warning = Math.max(100, finiteNumber(warningDelay, 700));
  const falling = Math.max(150, finiteNumber(fallDuration, 900));
  const reset = Math.max(200, finiteNumber(resetDelay, 2200));
  if (elapsed < warning) return "warning";
  if (elapsed < warning + falling) return "falling";
  if (elapsed < warning + falling + reset) return "hidden";
  return "reset";
}

export function sampleFallOffset(elapsedFallMs, fallDistance = 10, fallDuration = 900) {
  const duration = Math.max(150, finiteNumber(fallDuration, 900));
  const progress = Math.min(1, Math.max(0, finiteNumber(elapsedFallMs, 0) / duration));
  // Cubic acceleration makes the platform leave the player much more decisively.
  const eased = progress * progress * progress;
  return Math.max(0, finiteNumber(fallDistance, 10)) * eased;
}

export function bodySupportedByFallingBox({
  rigPosition,
  bodyHeight,
  bodyRadius,
  boxCenter,
  boxSize,
  verticalTolerance = 0.22,
  edgePadding = 0.08
}) {
  if (!rigPosition || !boxCenter || !boxSize) return false;
  const radius = Math.max(0.05, finiteNumber(bodyRadius, 0.32));
  const bottom = finiteNumber(rigPosition.y, 0) + finiteNumber(bodyHeight, 1.2) - radius;
  const top = finiteNumber(boxCenter.y, 0) + finiteNumber(boxSize.y, 0) * 0.5;
  const padding = radius * Math.max(0, finiteNumber(edgePadding, 0.08));
  const halfX = Math.max(0, finiteNumber(boxSize.x, 0) * 0.5) + padding;
  const halfZ = Math.max(0, finiteNumber(boxSize.z, 0) * 0.5) + padding;
  const inside =
    Math.abs(finiteNumber(rigPosition.x, 0) - finiteNumber(boxCenter.x, 0)) <= halfX &&
    Math.abs(finiteNumber(rigPosition.z, 0) - finiteNumber(boxCenter.z, 0)) <= halfZ;
  return inside && Math.abs(bottom - top) <= Math.max(0.04, finiteNumber(verticalTolerance, 0.22));
}

function registerBrowserComponent() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  if (AFRAME.components["falling-platform"]) return;

  AFRAME.registerComponent("falling-platform", {
    schema: {
      rig: { type: "selector" },
      warningDelay: { default: 700 },
      fallDuration: { default: 900 },
      resetDelay: { default: 2200 },
      fallDistance: { default: 11 },
      verticalTolerance: { default: 0.22 },
      edgePadding: { default: 0.08 }
    },

    init: function () {
      this.basePosition = this.el.object3D.position.clone();
      this.boxCenter = new THREE.Vector3();
      this.state = "idle";
      this.armedAt = 0;
      this.fallStartedAt = 0;
      this.resetAt = 0;
      this.colliders = [];
      this.colliderSnapshots = [];
      this.warningVisuals = Array.from(this.el.querySelectorAll("[data-falling-warning]"));
      this.timings = scaledFallingTimings(this.data);
      this.onCourseReset = this.onCourseReset.bind(this);
      window.addEventListener("course-request-reset", this.onCourseReset);
      this.captureColliders();
      this.el.setAttribute("data-falling-platform", "true");
    },

    update: function () {
      this.timings = scaledFallingTimings(this.data);
    },

    remove: function () {
      window.removeEventListener("course-request-reset", this.onCourseReset);
    },

    captureColliders: function () {
      this.colliders = Array.from(this.el.querySelectorAll("[locomotion-collider]"));
      this.colliderSnapshots = this.colliders.map((collider) => {
        const component = collider.components?.["locomotion-collider"];
        const size = component?.data?.size || { x: 1, y: 1, z: 1 };
        return {
          element: collider,
          type: component?.data?.type || "box",
          size: {
            x: finiteNumber(size.x, 1),
            y: finiteNumber(size.y, 1),
            z: finiteNumber(size.z, 1)
          }
        };
      });
    },

    refreshLocomotion: function () {
      const locomotion = this.data.rig?.components?.["gorilla-locomotion"];
      if (locomotion) locomotion.colliders = Array.from(document.querySelectorAll("[locomotion-collider]"));
    },

    bodySupported: function (locomotion) {
      if (!locomotion?.rig?.position || !locomotion?.data) return false;
      if (!this.colliders.length) this.captureColliders();
      this.el.object3D.updateMatrixWorld(true);
      for (const collider of this.colliders) {
        const component = collider.components?.["locomotion-collider"];
        if (!component || component.data.type !== "box") continue;
        collider.object3D.getWorldPosition(this.boxCenter);
        if (bodySupportedByFallingBox({
          rigPosition: locomotion.rig.position,
          bodyHeight: locomotion.data.bodyHeight,
          bodyRadius: locomotion.data.bodyRadius,
          boxCenter: this.boxCenter,
          boxSize: component.data.size,
          verticalTolerance: this.data.verticalTolerance,
          edgePadding: this.data.edgePadding
        })) return true;
      }
      return false;
    },

    setWarningVisible: function (visible, time = 0) {
      for (const visual of this.warningVisuals) {
        visual.setAttribute("visible", visible);
        if (visible && visual.object3D?.scale) {
          const pulse = 1 + Math.sin(time * 0.035) * 0.16;
          visual.object3D.scale.set(pulse, pulse, pulse);
        }
      }
    },

    arm: function (time) {
      this.state = "warning";
      this.armedAt = time;
      this.setWarningVisible(true, time);
      this.el.setAttribute("data-falling-state", "warning");
      window.dispatchEvent(new CustomEvent("falling-platform-armed", {
        detail: {
          platformId: this.el.id || "falling-platform",
          warningDelay: this.timings.warningDelay
        }
      }));
    },

    disableColliders: function () {
      for (const snapshot of this.colliderSnapshots) snapshot.element.removeAttribute("locomotion-collider");
      this.refreshLocomotion();
    },

    restoreColliders: function () {
      for (const snapshot of this.colliderSnapshots) {
        snapshot.element.setAttribute(
          "locomotion-collider",
          `type: ${snapshot.type}; size: ${snapshot.size.x} ${snapshot.size.y} ${snapshot.size.z}`
        );
      }
      this.colliders = this.colliderSnapshots.map((snapshot) => snapshot.element);
      window.setTimeout(() => this.refreshLocomotion(), 0);
    },

    beginFall: function (time) {
      this.state = "falling";
      this.fallStartedAt = time;
      this.disableColliders();
      this.el.setAttribute("data-falling-state", "falling");
      window.dispatchEvent(new CustomEvent("falling-platform-dropped", {
        detail: {
          platformId: this.el.id || "falling-platform",
          fallDistance: this.data.fallDistance,
          fallDuration: this.timings.fallDuration
        }
      }));
    },

    resetPlatform: function (emitEvent = true) {
      this.state = "idle";
      this.armedAt = 0;
      this.fallStartedAt = 0;
      this.resetAt = 0;
      this.timings = scaledFallingTimings(this.data);
      this.el.object3D.position.copy(this.basePosition);
      this.el.object3D.visible = true;
      this.el.object3D.updateMatrixWorld(true);
      this.setWarningVisible(false);
      this.restoreColliders();
      this.el.setAttribute("data-falling-state", "idle");
      if (emitEvent) {
        window.dispatchEvent(new CustomEvent("falling-platform-restored", {
          detail: { platformId: this.el.id || "falling-platform" }
        }));
      }
    },

    onCourseReset: function () {
      this.resetPlatform(false);
    },

    tick: function (time) {
      const locomotion = this.data.rig?.components?.["gorilla-locomotion"];

      if (this.state === "idle") {
        if (locomotion && this.bodySupported(locomotion)) this.arm(time);
        return;
      }

      if (this.state === "warning") {
        this.setWarningVisible(true, time);
        if (time - this.armedAt >= this.timings.warningDelay) this.beginFall(time);
        return;
      }

      if (this.state === "falling") {
        const elapsed = time - this.fallStartedAt;
        const offset = sampleFallOffset(elapsed, this.data.fallDistance, this.timings.fallDuration);
        this.el.object3D.position.y = this.basePosition.y - offset;
        this.el.object3D.updateMatrixWorld(true);
        if (elapsed >= this.timings.fallDuration) {
          this.state = "hidden";
          this.resetAt = time + this.timings.resetDelay;
          this.el.object3D.visible = false;
          this.setWarningVisible(false);
          this.el.setAttribute("data-falling-state", "hidden");
        }
        return;
      }

      if (this.state === "hidden" && time >= this.resetAt) this.resetPlatform(true);
    }
  });
}

registerBrowserComponent();
