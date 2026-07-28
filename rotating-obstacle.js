// Reusable rotating-obstacle mechanic for the Phase 3 mechanics lab.
// Rotating bars use lightweight trigger collision instead of locomotion-collider
// boxes because the pinned Gorilla locomotion source only resolves axis-aligned
// surfaces. Contact applies a short, predictable knockback without changing the
// underlying hand-push, gravity, or launch calculations.

const DEGREES_TO_RADIANS = Math.PI / 180;

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function rotatingAngleDegrees(timeMs, degreesPerSecond = 45, phaseDegrees = 0) {
  const timeSeconds = finiteNumber(timeMs, 0) / 1000;
  return positiveModulo(
    finiteNumber(phaseDegrees, 0) + finiteNumber(degreesPerSecond, 45) * timeSeconds,
    360
  );
}

export function worldPointToBarLocal(point, center, angleDegrees) {
  const dx = finiteNumber(point?.x, 0) - finiteNumber(center?.x, 0);
  const dy = finiteNumber(point?.y, 0) - finiteNumber(center?.y, 0);
  const dz = finiteNumber(point?.z, 0) - finiteNumber(center?.z, 0);
  const radians = finiteNumber(angleDegrees, 0) * DEGREES_TO_RADIANS;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  // Inverse of a Three.js Y-axis rotation.
  return {
    x: cosine * dx - sine * dz,
    y: dy,
    z: sine * dx + cosine * dz
  };
}

export function capsuleTouchesRotatingBars({
  rigPosition,
  bodyHeight,
  bodyRadius,
  center,
  angleDegrees,
  barCount = 1,
  barLength = 4.6,
  barWidth = 0.32,
  barHeight = 0.28,
  padding = 0.02
}) {
  if (!rigPosition || !center) return { hit: false };

  const radius = Math.max(0.05, finiteNumber(bodyRadius, 0.32));
  const bodyCenter = {
    x: finiteNumber(rigPosition.x, 0),
    y: finiteNumber(rigPosition.y, 0) + finiteNumber(bodyHeight, 1.2),
    z: finiteNumber(rigPosition.z, 0)
  };
  const count = Math.max(1, Math.min(4, Math.round(finiteNumber(barCount, 1))));
  const halfLength = Math.max(0.1, finiteNumber(barLength, 4.6) * 0.5) + radius + padding;
  const halfWidth = Math.max(0.02, finiteNumber(barWidth, 0.32) * 0.5) + radius + padding;
  const halfHeight = Math.max(0.02, finiteNumber(barHeight, 0.28) * 0.5) + radius + padding;

  for (let index = 0; index < count; index += 1) {
    const barAngle = finiteNumber(angleDegrees, 0) + index * (180 / count);
    const local = worldPointToBarLocal(bodyCenter, center, barAngle);
    if (
      Math.abs(local.x) <= halfLength &&
      Math.abs(local.z) <= halfWidth &&
      Math.abs(local.y) <= halfHeight
    ) {
      return { hit: true, barIndex: index, localX: local.x, angleDegrees: barAngle };
    }
  }

  return { hit: false };
}

export function tangentialKnockback({
  angleDegrees,
  localX,
  degreesPerSecond,
  horizontalSpeed = 4.6,
  upwardSpeed = 2.2
}) {
  const radians = finiteNumber(angleDegrees, 0) * DEGREES_TO_RADIANS;
  const side = finiteNumber(localX, 0) < 0 ? -1 : 1;
  const rotationDirection = finiteNumber(degreesPerSecond, 45) < 0 ? -1 : 1;
  const direction = side * rotationDirection;
  const speed = Math.max(0, finiteNumber(horizontalSpeed, 4.6));

  return {
    x: -Math.sin(radians) * direction * speed,
    y: Math.max(0, finiteNumber(upwardSpeed, 2.2)),
    z: -Math.cos(radians) * direction * speed
  };
}

export function applyRotatingObstacleKnockback(locomotion, impulse) {
  if (!locomotion?.velocity || !impulse) return false;
  const x = finiteNumber(impulse.x, 0);
  const y = Math.max(0, finiteNumber(impulse.y, 0));
  const z = finiteNumber(impulse.z, 0);

  locomotion.velocity.x = x;
  locomotion.velocity.y = Math.max(finiteNumber(locomotion.velocity.y, 0), y);
  locomotion.velocity.z = z;

  if (locomotion.launchVelocity) {
    locomotion.launchVelocity.x = x;
    locomotion.launchVelocity.y = Math.max(finiteNumber(locomotion.launchVelocity.y, 0), y);
    locomotion.launchVelocity.z = z;
  }

  locomotion.pushHistory = [];
  locomotion.grounded = false;
  locomotion.wasTouchingSurface = false;
  locomotion.wasTouchingFloor = false;
  locomotion.wasTwoHandTouchingFloor = false;
  return true;
}

function registerBrowserComponent() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  if (AFRAME.components["rotating-obstacle"]) return;

  AFRAME.registerComponent("rotating-obstacle", {
    schema: {
      rig: { type: "selector" },
      degreesPerSecond: { default: 42 },
      phaseDegrees: { default: 0 },
      barCount: { default: 1 },
      barLength: { default: 4.6 },
      barWidth: { default: 0.32 },
      barHeight: { default: 0.28 },
      hitPadding: { default: 0.02 },
      knockbackSpeed: { default: 4.6 },
      upwardSpeed: { default: 2.2 },
      hitCooldown: { default: 900 }
    },

    init: function () {
      this.center = new THREE.Vector3();
      this.lastHit = -Infinity;
      this.onCourseReset = this.onCourseReset.bind(this);
      window.addEventListener("course-request-reset", this.onCourseReset);
      this.el.setAttribute("data-rotating-obstacle", "true");
    },

    remove: function () {
      window.removeEventListener("course-request-reset", this.onCourseReset);
    },

    onCourseReset: function () {
      this.lastHit = -Infinity;
      this.el.object3D.rotation.y = finiteNumber(this.data.phaseDegrees, 0) * DEGREES_TO_RADIANS;
      this.el.object3D.updateMatrixWorld(true);
    },

    tick: function (time) {
      const angleDegrees = rotatingAngleDegrees(
        time,
        this.data.degreesPerSecond,
        this.data.phaseDegrees
      );
      this.el.object3D.rotation.y = angleDegrees * DEGREES_TO_RADIANS;
      this.el.object3D.updateMatrixWorld(true);

      if (time - this.lastHit < Math.max(250, this.data.hitCooldown)) return;
      const rig = this.data.rig;
      const locomotion = rig?.components?.["gorilla-locomotion"];
      if (!locomotion?.rig?.position || !locomotion?.data) return;

      this.el.object3D.getWorldPosition(this.center);
      const contact = capsuleTouchesRotatingBars({
        rigPosition: locomotion.rig.position,
        bodyHeight: locomotion.data.bodyHeight,
        bodyRadius: locomotion.data.bodyRadius,
        center: this.center,
        angleDegrees,
        barCount: this.data.barCount,
        barLength: this.data.barLength,
        barWidth: this.data.barWidth,
        barHeight: this.data.barHeight,
        padding: this.data.hitPadding
      });
      if (!contact.hit) return;

      const impulse = tangentialKnockback({
        angleDegrees: contact.angleDegrees,
        localX: contact.localX,
        degreesPerSecond: this.data.degreesPerSecond,
        horizontalSpeed: this.data.knockbackSpeed,
        upwardSpeed: this.data.upwardSpeed
      });
      if (!applyRotatingObstacleKnockback(locomotion, impulse)) return;

      this.lastHit = time;
      window.dispatchEvent(new CustomEvent("rotating-obstacle-hit", {
        detail: {
          obstacleId: this.el.id || "rotating-obstacle",
          barIndex: contact.barIndex,
          impulse,
          angleDegrees
        }
      }));
    }
  });
}

registerBrowserComponent();
