// Next local-physics batch: constrained grabbing, weighted pressure plates, and
// physics-triggered doors. This remains isolated from generated courses and multiplayer.

import { gamepadTriggerOrGripPressed, resolveXRGamepad } from "./lever-input-fix.js";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function pointInsideHorizontalBox(point, center, size, verticalTolerance = 1.2) {
  if (!point || !center || !size) return false;
  return (
    Math.abs(finiteNumber(point.x) - finiteNumber(center.x)) <= Math.max(0, finiteNumber(size.x)) * 0.5 &&
    Math.abs(finiteNumber(point.z) - finiteNumber(center.z)) <= Math.max(0, finiteNumber(size.z)) * 0.5 &&
    Math.abs(finiteNumber(point.y) - finiteNumber(center.y)) <= Math.max(0.1, finiteNumber(verticalTolerance, 1.2))
  );
}

export function weightInsidePlate(bodies, center, size, verticalTolerance = 1.2) {
  let total = 0;
  for (const body of bodies || []) {
    if (!body || finiteNumber(body.mass) <= 0) continue;
    if (pointInsideHorizontalBox(body.position, center, size, verticalTolerance)) total += finiteNumber(body.mass);
  }
  return total;
}

export function doorStep(current, target, speed, deltaSeconds) {
  const now = finiteNumber(current);
  const destination = finiteNumber(target);
  const amount = Math.max(0, finiteNumber(speed, 3)) * Math.max(0, finiteNumber(deltaSeconds, 0));
  if (Math.abs(destination - now) <= amount) return destination;
  return now + Math.sign(destination - now) * amount;
}

function physicsWorld(scene) {
  return scene?.systems?.physics?.driver?.world || scene?.systems?.physics?.world || null;
}

const handOwners = new Map();

function registerGrabbable() {
  if (!window.AFRAME || AFRAME.components["physics-grabbable"]) return;
  AFRAME.registerComponent("physics-grabbable", {
    schema: {
      leftHand: { type: "selector" },
      rightHand: { type: "selector" },
      grabRadius: { default: 0.72 },
      threshold: { default: 0.55 },
      maxForce: { default: 6500 }
    },

    init: function () {
      this.previousPressed = { left: false, right: false };
      this.grab = null;
      this.objectWorld = new THREE.Vector3();
      this.handWorld = new THREE.Vector3();
      this.onReset = () => this.release("reset");
      window.addEventListener("course-request-reset", this.onReset);
    },

    remove: function () {
      window.removeEventListener("course-request-reset", this.onReset);
      this.release("removed");
    },

    handNear: function (hand) {
      if (!hand?.object3D || !this.el.object3D) return false;
      hand.object3D.getWorldPosition(this.handWorld);
      this.el.object3D.getWorldPosition(this.objectWorld);
      return this.handWorld.distanceTo(this.objectWorld) <= Math.max(0.2, this.data.grabRadius);
    },

    tryGrab: function (hand, key) {
      if (this.grab || !hand?.body || !this.el.body || handOwners.has(hand)) return false;
      if (!this.handNear(hand) || !window.CANNON) return false;
      const world = physicsWorld(this.el.sceneEl);
      if (!world?.addConstraint) return false;
      const constraint = new CANNON.LockConstraint(hand.body, this.el.body, {
        maxForce: Math.max(100, this.data.maxForce)
      });
      constraint.collideConnected = false;
      world.addConstraint(constraint);
      handOwners.set(hand, this);
      this.grab = { hand, key, constraint, world };
      this.el.body.wakeUp?.();
      this.el.setAttribute("material", "emissiveIntensity", 0.48);
      window.dispatchEvent(new CustomEvent("physics-object-grabbed", {
        detail: { objectId: this.el.id, hand: key, mass: finiteNumber(this.el.body.mass) }
      }));
      return true;
    },

    release: function (reason = "released") {
      if (!this.grab) return false;
      const { hand, key, constraint, world } = this.grab;
      world?.removeConstraint?.(constraint);
      if (handOwners.get(hand) === this) handOwners.delete(hand);
      this.grab = null;
      this.el.setAttribute("material", "emissiveIntensity", 0.12);
      window.dispatchEvent(new CustomEvent("physics-object-released", {
        detail: { objectId: this.el.id, hand: key, reason }
      }));
      return true;
    },

    pollHand: function (hand, key) {
      const pressed = gamepadTriggerOrGripPressed(resolveXRGamepad(hand), this.data.threshold);
      const wasPressed = this.previousPressed[key];
      if (pressed && !wasPressed) this.tryGrab(hand, key);
      if (!pressed && wasPressed && this.grab?.hand === hand) this.release("button-up");
      this.previousPressed[key] = pressed;
    },

    tick: function () {
      this.pollHand(this.data.leftHand, "left");
      this.pollHand(this.data.rightHand, "right");
    }
  });
}

function registerPhysicsDoor() {
  if (!window.AFRAME || AFRAME.components["physics-door"]) return;
  AFRAME.registerComponent("physics-door", {
    schema: {
      openHeight: { default: 4.1 },
      speed: { default: 3.2 }
    },
    init: function () {
      this.closedY = this.el.object3D.position.y;
      this.targetY = this.closedY;
      this.isOpen = false;
      this.onReset = () => this.setOpen(false, true);
      window.addEventListener("course-request-reset", this.onReset);
    },
    remove: function () {
      window.removeEventListener("course-request-reset", this.onReset);
    },
    setOpen: function (open, immediate = false) {
      this.isOpen = Boolean(open);
      this.targetY = this.closedY + (this.isOpen ? Math.max(0.5, this.data.openHeight) : 0);
      if (immediate) this.applyY(this.targetY);
    },
    applyY: function (y) {
      this.el.object3D.position.y = y;
      const body = this.el.body;
      if (body) {
        const world = new THREE.Vector3();
        this.el.object3D.getWorldPosition(world);
        body.position.set(world.x, world.y, world.z);
        body.velocity.set(0, 0, 0);
        body.aabbNeedsUpdate = true;
      }
    },
    tick: function (time, deltaMs) {
      const dt = Math.min(0.05, Math.max(0, finiteNumber(deltaMs, 16.67) / 1000));
      const next = doorStep(this.el.object3D.position.y, this.targetY, this.data.speed, dt);
      this.applyY(next);
    }
  });
}

function registerWeightedPlate() {
  if (!window.AFRAME || AFRAME.components["weighted-pressure-plate"]) return;
  AFRAME.registerComponent("weighted-pressure-plate", {
    schema: {
      door: { type: "selector" },
      targets: { type: "selectorAll" },
      size: { type: "vec3", default: { x: 1.7, y: 0.3, z: 1.5 } },
      minimumMass: { default: 6 },
      verticalTolerance: { default: 1.25 }
    },
    init: function () {
      this.center = new THREE.Vector3();
      this.active = false;
      this.lastWeight = 0;
      this.onReset = () => this.apply(false, 0);
      window.addEventListener("course-request-reset", this.onReset);
    },
    remove: function () {
      window.removeEventListener("course-request-reset", this.onReset);
    },
    apply: function (active, weight) {
      if (this.active === active && Math.abs(this.lastWeight - weight) < 0.01) return;
      const changed = this.active !== active;
      this.active = active;
      this.lastWeight = weight;
      this.el.object3D.position.y = active ? 1.02 : 1.10;
      this.el.setAttribute("color", active ? "#22C55E" : "#A855F7");
      this.data.door?.components?.["physics-door"]?.setOpen(active);
      if (changed) {
        window.dispatchEvent(new CustomEvent("weighted-plate-changed", {
          detail: {
            plateId: this.el.id,
            active,
            weight,
            minimumMass: this.data.minimumMass,
            doorId: this.data.door?.id || ""
          }
        }));
      }
    },
    tick: function (time) {
      if (time % 50 > 18) return;
      this.el.object3D.getWorldPosition(this.center);
      const bodies = Array.from(this.data.targets || []).map((entity) => entity?.body).filter(Boolean);
      const weight = weightInsidePlate(bodies, this.center, this.data.size, this.data.verticalTolerance);
      this.apply(weight >= Math.max(0.1, this.data.minimumMass), weight);
    }
  });
}

function registerAll() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  registerGrabbable();
  registerPhysicsDoor();
  registerWeightedPlate();
}

registerAll();
