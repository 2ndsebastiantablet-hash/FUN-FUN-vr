// Real weighted rigid-body interaction for the isolated Push & Structure Lab.
// Dynamic movement, gravity, friction, bounce, angular velocity and sleeping are
// provided by the pinned A-Frame Cannon physics system. Hands apply impulses to
// the real bodies instead of directly moving their Three.js transforms.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clampPlanarVelocity(vector, maximum = 6) {
  const x = finiteNumber(vector?.x);
  const y = finiteNumber(vector?.y);
  const z = finiteNumber(vector?.z);
  const limit = Math.max(0.01, finiteNumber(maximum, 6));
  const length = Math.hypot(x, y, z);
  if (length <= limit || length <= 1e-8) return { x, y, z };
  const scale = limit / length;
  return { x: x * scale, y: y * scale, z: z * scale };
}

export function calculateWeightedImpulse({
  handVelocity,
  mass = 2,
  impulseScale = 0.28,
  maximumHandSpeed = 8,
  maximumImpulse = 9
} = {}) {
  const velocity = clampPlanarVelocity(handVelocity, maximumHandSpeed);
  const bodyMass = Math.max(0.1, finiteNumber(mass, 2));
  const scale = Math.max(0, finiteNumber(impulseScale, 0.28));
  const impulse = {
    x: velocity.x * bodyMass * scale,
    y: velocity.y * bodyMass * scale,
    z: velocity.z * bodyMass * scale
  };
  return clampPlanarVelocity(impulse, Math.max(0.1, finiteNumber(maximumImpulse, 9)));
}

export function sphereHandContact(hand, center, radius, handRadius = 0.13) {
  if (!hand || !center) return false;
  const combined = Math.max(0.01, finiteNumber(radius, 0.5)) + Math.max(0, finiteNumber(handRadius, 0.13));
  return Math.hypot(
    finiteNumber(hand.x) - finiteNumber(center.x),
    finiteNumber(hand.y) - finiteNumber(center.y),
    finiteNumber(hand.z) - finiteNumber(center.z)
  ) <= combined;
}

export function boxHandContact(localHand, halfExtents, handRadius = 0.13) {
  if (!localHand || !halfExtents) return false;
  const padding = Math.max(0, finiteNumber(handRadius, 0.13));
  return (
    Math.abs(finiteNumber(localHand.x)) <= Math.max(0.01, finiteNumber(halfExtents.x, 0.5)) + padding &&
    Math.abs(finiteNumber(localHand.y)) <= Math.max(0.01, finiteNumber(halfExtents.y, 0.5)) + padding &&
    Math.abs(finiteNumber(localHand.z)) <= Math.max(0.01, finiteNumber(halfExtents.z, 0.5)) + padding
  );
}

export function pointInsideGoal(point, center, size) {
  if (!point || !center || !size) return false;
  return (
    Math.abs(finiteNumber(point.x) - finiteNumber(center.x)) <= Math.max(0, finiteNumber(size.x)) * 0.5 &&
    Math.abs(finiteNumber(point.y) - finiteNumber(center.y)) <= Math.max(0, finiteNumber(size.y)) * 0.5 &&
    Math.abs(finiteNumber(point.z) - finiteNumber(center.z)) <= Math.max(0, finiteNumber(size.z)) * 0.5
  );
}

function registerBrowserComponents() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;

  if (!AFRAME.components["real-physics-hand-pusher"]) {
    AFRAME.registerComponent("real-physics-hand-pusher", {
      schema: {
        leftHand: { type: "selector" },
        rightHand: { type: "selector" },
        shape: { default: "sphere", oneOf: ["sphere", "box"] },
        sphereRadius: { default: 0.48 },
        halfExtents: { type: "vec3", default: { x: 0.45, y: 0.45, z: 0.45 } },
        handRadius: { default: 0.13 },
        impulseScale: { default: 0.28 },
        maximumHandSpeed: { default: 8 },
        maximumImpulse: { default: 9 },
        minimumHandSpeed: { default: 0.18 },
        cooldownMs: { default: 55 }
      },
      init: function () {
        this.previous = { left: new THREE.Vector3(), right: new THREE.Vector3() };
        this.current = { left: new THREE.Vector3(), right: new THREE.Vector3() };
        this.local = { left: new THREE.Vector3(), right: new THREE.Vector3() };
        this.havePrevious = { left: false, right: false };
        this.lastImpulse = { left: -Infinity, right: -Infinity };
        this.bodyReady = false;
        this.onBodyLoaded = () => {
          this.bodyReady = Boolean(this.el.body);
          if (this.el.body) {
            this.el.body.allowSleep = true;
            this.el.body.sleepSpeedLimit = 0.12;
            this.el.body.sleepTimeLimit = 0.8;
          }
        };
        this.el.addEventListener("body-loaded", this.onBodyLoaded);
        if (this.el.body) this.onBodyLoaded();
      },
      remove: function () {
        this.el.removeEventListener("body-loaded", this.onBodyLoaded);
      },
      contactForHand: function (worldPoint, key) {
        if (this.data.shape === "sphere") {
          return sphereHandContact(worldPoint, this.el.object3D.position, this.data.sphereRadius, this.data.handRadius);
        }
        this.local[key].copy(worldPoint);
        this.el.object3D.worldToLocal(this.local[key]);
        return boxHandContact(this.local[key], this.data.halfExtents, this.data.handRadius);
      },
      applyHand: function (handEl, key, time, deltaSeconds) {
        if (!handEl?.object3D) return;
        handEl.object3D.getWorldPosition(this.current[key]);
        if (!this.havePrevious[key]) {
          this.previous[key].copy(this.current[key]);
          this.havePrevious[key] = true;
          return;
        }
        const velocity = {
          x: (this.current[key].x - this.previous[key].x) / deltaSeconds,
          y: (this.current[key].y - this.previous[key].y) / deltaSeconds,
          z: (this.current[key].z - this.previous[key].z) / deltaSeconds
        };
        this.previous[key].copy(this.current[key]);
        const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
        if (speed < Math.max(0.01, this.data.minimumHandSpeed)) return;
        if (time - this.lastImpulse[key] < Math.max(16, this.data.cooldownMs)) return;
        if (!this.contactForHand(this.current[key], key)) return;

        const body = this.el.body;
        if (!body || typeof body.applyImpulse !== "function" || !window.CANNON) return;
        const impulse = calculateWeightedImpulse({
          handVelocity: velocity,
          mass: body.mass,
          impulseScale: this.data.impulseScale,
          maximumHandSpeed: this.data.maximumHandSpeed,
          maximumImpulse: this.data.maximumImpulse
        });
        const impulseVector = new CANNON.Vec3(impulse.x, impulse.y, impulse.z);
        const relativeContactPoint = new CANNON.Vec3(
          this.current[key].x - body.position.x,
          this.current[key].y - body.position.y,
          this.current[key].z - body.position.z
        );
        body.wakeUp();
        body.applyImpulse(impulseVector, relativeContactPoint);
        this.lastImpulse[key] = time;
        window.dispatchEvent(new CustomEvent("pushable-contact", {
          detail: {
            objectId: this.el.id,
            hand: key,
            mass: body.mass,
            impulse: { ...impulse },
            speed
          }
        }));
      },
      tick: function (time, deltaMs) {
        if (!this.bodyReady || !this.el.body) return;
        const deltaSeconds = Math.min(0.05, Math.max(0.008, finiteNumber(deltaMs, 16.67) / 1000));
        this.applyHand(this.data.leftHand, "left", time, deltaSeconds);
        this.applyHand(this.data.rightHand, "right", time, deltaSeconds);
      }
    });
  }

  if (!AFRAME.components["real-physics-reset"]) {
    AFRAME.registerComponent("real-physics-reset", {
      schema: {
        minimumY: { default: -5 },
        minimumX: { default: -4 },
        maximumX: { default: 4 },
        minimumZ: { default: -100 },
        maximumZ: { default: 100 }
      },
      init: function () {
        this.startPosition = this.el.object3D.position.clone();
        this.startQuaternion = this.el.object3D.quaternion.clone();
        this.onReset = () => this.resetBody();
        this.onBodyLoaded = () => {
          this.bodyReady = true;
          this.startPosition.copy(this.el.object3D.position);
          this.startQuaternion.copy(this.el.object3D.quaternion);
        };
        window.addEventListener("course-request-reset", this.onReset);
        this.el.addEventListener("body-loaded", this.onBodyLoaded);
      },
      remove: function () {
        window.removeEventListener("course-request-reset", this.onReset);
        this.el.removeEventListener("body-loaded", this.onBodyLoaded);
      },
      resetBody: function () {
        const body = this.el.body;
        if (!body) return;
        body.position.set(this.startPosition.x, this.startPosition.y, this.startPosition.z);
        body.quaternion.set(
          this.startQuaternion.x,
          this.startQuaternion.y,
          this.startQuaternion.z,
          this.startQuaternion.w
        );
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.force.set(0, 0, 0);
        body.torque.set(0, 0, 0);
        body.wakeUp();
        this.el.object3D.position.copy(this.startPosition);
        this.el.object3D.quaternion.copy(this.startQuaternion);
      },
      tick: function () {
        if (!this.bodyReady || !this.el.body) return;
        const p = this.el.body.position;
        const outside =
          ![p.x, p.y, p.z].every(Number.isFinite) ||
          p.y < this.data.minimumY ||
          p.x < this.data.minimumX || p.x > this.data.maximumX ||
          p.z < this.data.minimumZ || p.z > this.data.maximumZ;
        if (outside) this.resetBody();
      }
    });
  }

  if (!AFRAME.components["push-object-goal"]) {
    AFRAME.registerComponent("push-object-goal", {
      schema: {
        target: { type: "selector" },
        size: { type: "vec3", default: { x: 1.5, y: 1.7, z: 1.15 } },
        label: { default: "Physics goal" }
      },
      init: function () {
        this.center = new THREE.Vector3();
        this.completed = false;
        this.onReset = () => {
          this.completed = false;
          this.el.setAttribute("color", "#FACC15");
        };
        window.addEventListener("course-request-reset", this.onReset);
      },
      remove: function () {
        window.removeEventListener("course-request-reset", this.onReset);
      },
      tick: function () {
        if (this.completed || !this.data.target?.object3D) return;
        this.el.object3D.getWorldPosition(this.center);
        if (!pointInsideGoal(this.data.target.object3D.position, this.center, this.data.size)) return;
        const body = this.data.target.body;
        if (body && Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z) > 2.8) return;
        this.completed = true;
        this.el.setAttribute("color", "#22C55E");
        window.dispatchEvent(new CustomEvent("push-goal-complete", {
          detail: { goalId: this.el.id, targetId: this.data.target.id, label: this.data.label }
        }));
      }
    });
  }
}

registerBrowserComponents();
