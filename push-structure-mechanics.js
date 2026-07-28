// Deterministic hand-driven pushables for Quest browser VR.
// This intentionally avoids unrestricted rigid-body physics so the motion is
// predictable, inexpensive, and suitable for later multiplayer replication.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value)));
}

export function planarDistanceSquared(a, b) {
  if (!a || !b) return Infinity;
  const dx = finiteNumber(a.x) - finiteNumber(b.x);
  const dz = finiteNumber(a.z) - finiteNumber(b.z);
  return dx * dx + dz * dz;
}

export function calculateHandPushVelocity({
  handCurrent,
  handPrevious,
  objectPosition,
  interactionRadius = 0.82,
  deltaSeconds = 1 / 60,
  strength = 0.92,
  maximumSpeed = 4.4
} = {}) {
  if (!handCurrent || !handPrevious || !objectPosition) return { x: 0, z: 0, active: false };
  const radius = Math.max(0.1, finiteNumber(interactionRadius, 0.82));
  if (planarDistanceSquared(handCurrent, objectPosition) > radius * radius) return { x: 0, z: 0, active: false };
  const dt = clamp(deltaSeconds, 1 / 240, 0.08);
  let vx = (finiteNumber(handCurrent.x) - finiteNumber(handPrevious.x)) / dt * finiteNumber(strength, 0.92);
  let vz = (finiteNumber(handCurrent.z) - finiteNumber(handPrevious.z)) / dt * finiteNumber(strength, 0.92);
  const speed = Math.hypot(vx, vz);
  const maxSpeed = Math.max(0.1, finiteNumber(maximumSpeed, 4.4));
  if (speed > maxSpeed) {
    vx = vx / speed * maxSpeed;
    vz = vz / speed * maxSpeed;
  }
  return { x: vx, z: vz, active: speed > 0.04 };
}

export function applyPlanarFriction(velocity, friction = 4.2, deltaSeconds = 1 / 60) {
  const dt = clamp(deltaSeconds, 0, 0.08);
  const factor = Math.exp(-Math.max(0, finiteNumber(friction, 4.2)) * dt);
  return {
    x: finiteNumber(velocity?.x) * factor,
    z: finiteNumber(velocity?.z) * factor
  };
}

export function pointInsideGoal(point, center, size) {
  if (!point || !center || !size) return false;
  return (
    Math.abs(finiteNumber(point.x) - finiteNumber(center.x)) <= Math.max(0, finiteNumber(size.x)) * 0.5 &&
    Math.abs(finiteNumber(point.y) - finiteNumber(center.y)) <= Math.max(0, finiteNumber(size.y)) * 0.5 &&
    Math.abs(finiteNumber(point.z) - finiteNumber(center.z)) <= Math.max(0, finiteNumber(size.z)) * 0.5
  );
}

export function steppedSlopeDefinitions({ steps = 5, startZ = -23.2, stepDepth = 0.72, risePerStep = 0.24 } = {}) {
  const count = Math.max(1, Math.floor(finiteNumber(steps, 5)));
  const result = [];
  for (let index = 0; index < count; index += 1) {
    const height = (index + 1) * Math.max(0.05, finiteNumber(risePerStep, 0.24));
    result.push({
      index,
      position: { x: 0, y: height * 0.5, z: finiteNumber(startZ, -23.2) - index * finiteNumber(stepDepth, 0.72) },
      size: { x: 2.7, y: height, z: Math.max(0.3, finiteNumber(stepDepth, 0.72)) }
    });
  }
  return result;
}

function registerBrowserComponents() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;

  if (!AFRAME.components["deterministic-pushable"]) {
    AFRAME.registerComponent("deterministic-pushable", {
      schema: {
        leftHand: { type: "selector" },
        rightHand: { type: "selector" },
        interactionRadius: { default: 0.82 },
        strength: { default: 0.92 },
        maximumSpeed: { default: 4.4 },
        friction: { default: 4.2 },
        minimumX: { default: -1.55 },
        maximumX: { default: 1.55 },
        minimumZ: { default: -100 },
        maximumZ: { default: 100 },
        fixedY: { default: 1.48 },
        shape: { default: "ball", oneOf: ["ball", "crate"] }
      },
      init: function () {
        this.startPosition = this.el.object3D.position.clone();
        this.velocity = { x: 0, z: 0 };
        this.previous = { left: new THREE.Vector3(), right: new THREE.Vector3() };
        this.current = { left: new THREE.Vector3(), right: new THREE.Vector3() };
        this.havePrevious = { left: false, right: false };
        this.onReset = this.onReset.bind(this);
        window.addEventListener("course-request-reset", this.onReset);
      },
      remove: function () {
        window.removeEventListener("course-request-reset", this.onReset);
      },
      onReset: function () {
        this.el.object3D.position.copy(this.startPosition);
        this.el.object3D.position.y = this.data.fixedY;
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.havePrevious.left = false;
        this.havePrevious.right = false;
        this.el.object3D.rotation.set(0, 0, 0);
      },
      sampleHand: function (hand, key, dt) {
        if (!hand?.object3D) return null;
        hand.object3D.getWorldPosition(this.current[key]);
        let result = null;
        if (this.havePrevious[key]) {
          result = calculateHandPushVelocity({
            handCurrent: this.current[key],
            handPrevious: this.previous[key],
            objectPosition: this.el.object3D.position,
            interactionRadius: this.data.interactionRadius,
            deltaSeconds: dt,
            strength: this.data.strength,
            maximumSpeed: this.data.maximumSpeed
          });
        }
        this.previous[key].copy(this.current[key]);
        this.havePrevious[key] = true;
        return result;
      },
      tick: function (time, deltaMs) {
        const dt = clamp(finiteNumber(deltaMs, 16) / 1000, 1 / 240, 0.05);
        const pushes = [
          this.sampleHand(this.data.leftHand, "left", dt),
          this.sampleHand(this.data.rightHand, "right", dt)
        ].filter((result) => result?.active);
        if (pushes.length) {
          let vx = 0;
          let vz = 0;
          for (const push of pushes) {
            vx += push.x;
            vz += push.z;
          }
          this.velocity.x = vx / pushes.length;
          this.velocity.z = vz / pushes.length;
          window.dispatchEvent(new CustomEvent("pushable-contact", { detail: { id: this.el.id, handCount: pushes.length } }));
        } else {
          this.velocity = applyPlanarFriction(this.velocity, this.data.friction, dt);
        }

        const beforeX = this.el.object3D.position.x;
        const beforeZ = this.el.object3D.position.z;
        this.el.object3D.position.x = clamp(beforeX + this.velocity.x * dt, this.data.minimumX, this.data.maximumX);
        this.el.object3D.position.z = clamp(beforeZ + this.velocity.z * dt, this.data.minimumZ, this.data.maximumZ);
        this.el.object3D.position.y = this.data.fixedY;

        if (this.el.object3D.position.x === this.data.minimumX || this.el.object3D.position.x === this.data.maximumX) this.velocity.x = 0;
        if (this.el.object3D.position.z === this.data.minimumZ || this.el.object3D.position.z === this.data.maximumZ) this.velocity.z = 0;

        const movedX = this.el.object3D.position.x - beforeX;
        const movedZ = this.el.object3D.position.z - beforeZ;
        if (this.data.shape === "ball") {
          this.el.object3D.rotation.x += movedZ / 0.48;
          this.el.object3D.rotation.z -= movedX / 0.48;
        }
        if (Math.abs(movedX) + Math.abs(movedZ) > 0.0005) {
          window.dispatchEvent(new CustomEvent("pushable-moved", {
            detail: { id: this.el.id, x: this.el.object3D.position.x, z: this.el.object3D.position.z }
          }));
        }
      }
    });
  }

  if (!AFRAME.components["push-object-goal"]) {
    AFRAME.registerComponent("push-object-goal", {
      schema: {
        target: { type: "selector" },
        size: { type: "vec3", default: { x: 1.5, y: 1.5, z: 1.2 } },
        label: { default: "Object goal" }
      },
      init: function () {
        this.active = false;
        this.center = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.indicator = this.el.querySelector("[data-goal-indicator]");
        this.onReset = () => this.resetGoal();
        window.addEventListener("course-request-reset", this.onReset);
        this.resetGoal();
      },
      remove: function () {
        window.removeEventListener("course-request-reset", this.onReset);
      },
      resetGoal: function () {
        this.active = false;
        this.indicator?.setAttribute("color", "#FDE047");
        this.indicator?.setAttribute("material", "emissive: #CA8A04; emissiveIntensity: 0.55; opacity: 0.7; transparent: true");
      },
      tick: function () {
        if (this.active || !this.data.target?.object3D) return;
        this.el.object3D.getWorldPosition(this.center);
        this.data.target.object3D.getWorldPosition(this.targetPosition);
        if (!pointInsideGoal(this.targetPosition, this.center, this.data.size)) return;
        this.active = true;
        this.indicator?.setAttribute("color", "#22C55E");
        this.indicator?.setAttribute("material", "emissive: #16A34A; emissiveIntensity: 0.9; opacity: 0.85; transparent: true");
        window.dispatchEvent(new CustomEvent("push-goal-complete", {
          detail: { goalId: this.el.id, targetId: this.data.target.id, label: this.data.label }
        }));
      }
    });
  }
}

registerBrowserComponents();
