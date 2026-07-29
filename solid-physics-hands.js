// Solid tracked-controller hands for local Cannon physics interaction.
// The hand bodies are kinematic: controller tracking owns their pose, while Cannon
// uses their velocity and collision shape to push, roll, tip, and catch dynamic bodies.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function cappedVector(vector, maximum = 12) {
  const x = finiteNumber(vector?.x);
  const y = finiteNumber(vector?.y);
  const z = finiteNumber(vector?.z);
  const limit = Math.max(0.1, finiteNumber(maximum, 12));
  const length = Math.hypot(x, y, z);
  if (length <= limit || length <= 1e-8) return { x, y, z };
  const scale = limit / length;
  return { x: x * scale, y: y * scale, z: z * scale };
}

export function trackedVelocity(current, previous, deltaSeconds, maximum = 12) {
  const dt = Math.min(0.05, Math.max(1 / 240, finiteNumber(deltaSeconds, 1 / 60)));
  return cappedVector({
    x: (finiteNumber(current?.x) - finiteNumber(previous?.x)) / dt,
    y: (finiteNumber(current?.y) - finiteNumber(previous?.y)) / dt,
    z: (finiteNumber(current?.z) - finiteNumber(previous?.z)) / dt
  }, maximum);
}

function registerSolidHandComponent() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  if (AFRAME.components["solid-physics-hand"]) return;

  AFRAME.registerComponent("solid-physics-hand", {
    schema: {
      hand: { default: "left", oneOf: ["left", "right"] },
      radius: { default: 0.16 },
      maximumSpeed: { default: 12 },
      contactCooldown: { default: 90 }
    },

    init: function () {
      this.currentWorld = new THREE.Vector3();
      this.previousWorld = new THREE.Vector3();
      this.worldQuaternion = new THREE.Quaternion();
      this.havePrevious = false;
      this.bodyReady = false;
      this.lastContact = -Infinity;
      this.onBodyLoaded = this.onBodyLoaded.bind(this);
      this.onBodyCollide = this.onBodyCollide.bind(this);
      this.el.addEventListener("body-loaded", this.onBodyLoaded);
      if (this.el.body) this.onBodyLoaded();
    },

    remove: function () {
      this.el.removeEventListener("body-loaded", this.onBodyLoaded);
      this.el.body?.removeEventListener?.("collide", this.onBodyCollide);
    },

    onBodyLoaded: function () {
      const body = this.el.body;
      if (!body || !window.CANNON) return;
      body.removeEventListener?.("collide", this.onBodyCollide);
      body.type = CANNON.Body.KINEMATIC;
      body.mass = 0;
      body.allowSleep = false;
      body.collisionResponse = true;
      body.updateMassProperties?.();
      body.addEventListener?.("collide", this.onBodyCollide);
      this.bodyReady = true;
      this.havePrevious = false;
      window.dispatchEvent(new CustomEvent("solid-hand-ready", {
        detail: { hand: this.data.hand, radius: this.data.radius, id: this.el.id }
      }));
    },

    onBodyCollide: function (event) {
      const now = performance.now();
      if (now - this.lastContact < Math.max(20, this.data.contactCooldown)) return;
      const other = event?.body || event?.detail?.body;
      if (!other || finiteNumber(other.mass) <= 0) return;
      this.lastContact = now;
      window.dispatchEvent(new CustomEvent("solid-hand-contact", {
        detail: {
          hand: this.data.hand,
          handId: this.el.id,
          objectId: other.el?.id || "physics-object",
          mass: finiteNumber(other.mass)
        }
      }));
    },

    tock: function (time, deltaMs) {
      const body = this.el.body;
      if (!this.bodyReady || !body) return;
      this.el.object3D.getWorldPosition(this.currentWorld);
      this.el.object3D.getWorldQuaternion(this.worldQuaternion);

      const dt = Math.min(0.05, Math.max(1 / 240, finiteNumber(deltaMs, 16.67) / 1000));
      if (!this.havePrevious) {
        this.previousWorld.copy(this.currentWorld);
        this.havePrevious = true;
      }
      const velocity = trackedVelocity(this.currentWorld, this.previousWorld, dt, this.data.maximumSpeed);
      this.previousWorld.copy(this.currentWorld);

      body.position.set(this.currentWorld.x, this.currentWorld.y, this.currentWorld.z);
      body.quaternion.set(
        this.worldQuaternion.x,
        this.worldQuaternion.y,
        this.worldQuaternion.z,
        this.worldQuaternion.w
      );
      body.velocity.set(velocity.x, velocity.y, velocity.z);
      body.angularVelocity.set(0, 0, 0);
      body.aabbNeedsUpdate = true;
      body.wakeUp?.();
    }
  });
}

registerSolidHandComponent();
