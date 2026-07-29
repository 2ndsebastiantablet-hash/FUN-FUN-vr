import { pointInsideHorizontalBox, weightInsidePlate } from "./physics-interactions.js";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function allPadsSatisfied(requiredIds, states) {
  const required = Array.from(requiredIds || []);
  if (!required.length) return false;
  return required.every((id) => Boolean(states instanceof Map ? states.get(id) : states?.[id]));
}

export function sequenceAdvance(order, progress, input) {
  const safeOrder = Array.from(order || []);
  const current = Math.max(0, Math.min(safeOrder.length, Math.floor(finiteNumber(progress))));
  if (!safeOrder.length) return { progress: 0, complete: false, reset: true };
  if (input === safeOrder[current]) {
    const next = current + 1;
    return { progress: next, complete: next >= safeOrder.length, reset: false };
  }
  return { progress: input === safeOrder[0] ? 1 : 0, complete: false, reset: true };
}

export function relayAdvance({ firstId, secondId, state = "idle", inputId, now = 0, expiresAt = 0, windowMs = 7000 } = {}) {
  const time = finiteNumber(now);
  const duration = Math.max(500, finiteNumber(windowMs, 7000));
  if (state === "complete") return { state: "complete", expiresAt, success: true, reset: false };
  if (state === "armed" && time > finiteNumber(expiresAt)) {
    if (inputId === firstId) return { state: "armed", expiresAt: time + duration, success: false, reset: true };
    return { state: "idle", expiresAt: 0, success: false, reset: true };
  }
  if (state === "idle") {
    if (inputId === firstId) return { state: "armed", expiresAt: time + duration, success: false, reset: false };
    return { state: "idle", expiresAt: 0, success: false, reset: true };
  }
  if (state === "armed" && inputId === secondId) return { state: "complete", expiresAt: 0, success: true, reset: false };
  if (state === "armed" && inputId === firstId) return { state: "armed", expiresAt: time + duration, success: false, reset: true };
  return { state: "idle", expiresAt: 0, success: false, reset: true };
}

function setDoorOpen(door, open, immediate = false) {
  door?.components?.["physics-door"]?.setOpen(Boolean(open), immediate);
}

function resetQuestSwitch(id) {
  const element = typeof document !== "undefined" ? document.getElementById(id) : null;
  const component = element?.components?.["quest-switch"];
  if (!component) return false;
  component.active = false;
  component.lastActivation = -Infinity;
  component.renderState?.();
  component.emitState?.("creative-reset");
  return true;
}

function registerCreativePadComponents() {
  if (!window.AFRAME || !window.THREE) return;

  if (!AFRAME.components["creative-object-pad"]) {
    AFRAME.registerComponent("creative-object-pad", {
      schema: {
        objects: { type: "selectorAll" },
        puzzleId: { default: "puzzle" },
        padId: { default: "pad" },
        size: { type: "vec3", default: { x: 1.4, y: 0.4, z: 1.4 } },
        minimumMass: { default: 3.5 },
        verticalTolerance: { default: 1.25 },
        latched: { default: false }
      },
      init: function () {
        this.center = new THREE.Vector3();
        this.bodyWorld = new THREE.Vector3();
        this.active = false;
        this.lastWeight = -1;
        this.lastCheck = -Infinity;
        this.baseY = this.el.object3D.position.y;
        this.onReset = () => this.apply(false, 0, true);
        window.addEventListener("course-request-reset", this.onReset);
      },
      remove: function () {
        window.removeEventListener("course-request-reset", this.onReset);
      },
      syncBody: function () {
        const body = this.el.body;
        if (!body) return;
        this.el.object3D.getWorldPosition(this.bodyWorld);
        body.position.set(this.bodyWorld.x, this.bodyWorld.y, this.bodyWorld.z);
        body.velocity.set(0, 0, 0);
        body.aabbNeedsUpdate = true;
      },
      apply: function (active, weight, force = false) {
        const next = this.data.latched && this.active ? true : Boolean(active);
        if (!force && next === this.active && Math.abs(weight - this.lastWeight) < 0.05) return;
        const changed = next !== this.active;
        this.active = next;
        this.lastWeight = weight;
        this.el.object3D.position.y = this.baseY - (this.active ? 0.08 : 0);
        this.syncBody();
        this.el.setAttribute("color", this.active ? "#22C55E" : "#A855F7");
        if (changed || force) {
          window.dispatchEvent(new CustomEvent("creative-pad-changed", {
            detail: {
              puzzleId: this.data.puzzleId,
              padId: this.data.padId,
              active: this.active,
              weight,
              minimumMass: this.data.minimumMass,
              source: "object"
            }
          }));
        }
      },
      tick: function (time) {
        if (time - this.lastCheck < 50) return;
        this.lastCheck = time;
        this.el.object3D.getWorldPosition(this.center);
        const bodies = Array.from(this.data.objects || []).map((entity) => entity?.body).filter(Boolean);
        const weight = weightInsidePlate(bodies, this.center, this.data.size, this.data.verticalTolerance);
        this.apply(weight >= Math.max(0.1, this.data.minimumMass), weight);
      }
    });
  }

  if (!AFRAME.components["creative-player-pad"]) {
    AFRAME.registerComponent("creative-player-pad", {
      schema: {
        rig: { type: "selector" },
        puzzleId: { default: "puzzle" },
        padId: { default: "player-pad" },
        size: { type: "vec3", default: { x: 1.4, y: 0.5, z: 1.4 } },
        verticalTolerance: { default: 1.3 },
        latched: { default: false }
      },
      init: function () {
        this.center = new THREE.Vector3();
        this.bodyWorld = new THREE.Vector3();
        this.active = false;
        this.baseY = this.el.object3D.position.y;
        this.onReset = () => this.apply(false, true);
        window.addEventListener("course-request-reset", this.onReset);
      },
      remove: function () {
        window.removeEventListener("course-request-reset", this.onReset);
      },
      syncBody: function () {
        const body = this.el.body;
        if (!body) return;
        this.el.object3D.getWorldPosition(this.bodyWorld);
        body.position.set(this.bodyWorld.x, this.bodyWorld.y, this.bodyWorld.z);
        body.velocity.set(0, 0, 0);
        body.aabbNeedsUpdate = true;
      },
      apply: function (active, force = false) {
        const next = this.data.latched && this.active ? true : Boolean(active);
        if (!force && next === this.active) return;
        this.active = next;
        this.el.object3D.position.y = this.baseY - (this.active ? 0.08 : 0);
        this.syncBody();
        this.el.setAttribute("color", this.active ? "#22C55E" : "#0EA5E9");
        window.dispatchEvent(new CustomEvent("creative-pad-changed", {
          detail: {
            puzzleId: this.data.puzzleId,
            padId: this.data.padId,
            active: this.active,
            weight: this.active ? 1 : 0,
            source: "player"
          }
        }));
      },
      tick: function () {
        const rig = this.data.rig;
        if (!rig?.object3D?.position) return;
        this.el.object3D.getWorldPosition(this.center);
        const active = pointInsideHorizontalBox(rig.object3D.position, this.center, this.data.size, this.data.verticalTolerance);
        this.apply(active);
      }
    });
  }
}

function registerCreativeControllers() {
  if (!window.AFRAME) return;

  if (!AFRAME.components["creative-multi-lock"]) {
    AFRAME.registerComponent("creative-multi-lock", {
      schema: {
        puzzleId: { default: "triple-lock" },
        requiredPads: { default: "left,center,right" },
        door: { type: "selector" },
        latchOnComplete: { default: true }
      },
      init: function () {
        this.required = this.data.requiredPads.split(",").map((value) => value.trim()).filter(Boolean);
        this.states = new Map(this.required.map((id) => [id, false]));
        this.completed = false;
        this.onPad = (event) => {
          if (event.detail?.puzzleId !== this.data.puzzleId || !this.states.has(event.detail?.padId)) return;
          this.states.set(event.detail.padId, Boolean(event.detail.active));
          const allActive = allPadsSatisfied(this.required, this.states);
          if (allActive) this.completed = true;
          const open = this.data.latchOnComplete ? this.completed : allActive;
          setDoorOpen(this.data.door, open);
          window.dispatchEvent(new CustomEvent("creative-multi-lock-state", {
            detail: { puzzleId: this.data.puzzleId, completed: this.completed, allActive, open, states: Object.fromEntries(this.states) }
          }));
        };
        this.onReset = () => {
          this.completed = false;
          for (const id of this.required) this.states.set(id, false);
          setDoorOpen(this.data.door, false, true);
        };
        window.addEventListener("creative-pad-changed", this.onPad);
        window.addEventListener("course-request-reset", this.onReset);
        this.onReset();
      },
      remove: function () {
        window.removeEventListener("creative-pad-changed", this.onPad);
        window.removeEventListener("course-request-reset", this.onReset);
      }
    });
  }

  if (!AFRAME.components["creative-relay-controller"]) {
    AFRAME.registerComponent("creative-relay-controller", {
      schema: {
        firstId: { default: "relay-button" },
        secondId: { default: "relay-lever" },
        windowMs: { default: 7000 },
        door: { type: "selector" }
      },
      init: function () {
        this.state = "idle";
        this.expiresAt = 0;
        this.onSwitch = (event) => {
          const detail = event.detail || {};
          if (!detail.active || ["initial", "reset", "creative-reset"].includes(detail.source)) return;
          if (![this.data.firstId, this.data.secondId].includes(detail.switchId)) return;
          const result = relayAdvance({
            firstId: this.data.firstId,
            secondId: this.data.secondId,
            state: this.state,
            inputId: detail.switchId,
            now: performance.now(),
            expiresAt: this.expiresAt,
            windowMs: this.data.windowMs
          });
          this.state = result.state;
          this.expiresAt = result.expiresAt;
          if (result.success) setDoorOpen(this.data.door, true);
          window.setTimeout(() => resetQuestSwitch(detail.switchId), 120);
          window.dispatchEvent(new CustomEvent("creative-relay-state", {
            detail: { state: this.state, expiresAt: this.expiresAt, success: result.success, reset: result.reset, inputId: detail.switchId }
          }));
        };
        this.onReset = () => {
          this.state = "idle";
          this.expiresAt = 0;
          setDoorOpen(this.data.door, false, true);
          window.setTimeout(() => {
            resetQuestSwitch(this.data.firstId);
            resetQuestSwitch(this.data.secondId);
          }, 0);
        };
        window.addEventListener("lab-switch-changed", this.onSwitch);
        window.addEventListener("course-request-reset", this.onReset);
        this.onReset();
      },
      remove: function () {
        window.removeEventListener("lab-switch-changed", this.onSwitch);
        window.removeEventListener("course-request-reset", this.onReset);
      },
      tick: function () {
        if (this.state !== "armed" || performance.now() <= this.expiresAt) return;
        this.state = "idle";
        this.expiresAt = 0;
        window.dispatchEvent(new CustomEvent("creative-relay-state", { detail: { state: "idle", expired: true, success: false } }));
      }
    });
  }

  if (!AFRAME.components["creative-sequence-controller"]) {
    AFRAME.registerComponent("creative-sequence-controller", {
      schema: {
        order: { default: "amber,cyan,violet" },
        door: { type: "selector" }
      },
      init: function () {
        this.order = this.data.order.split(",").map((value) => value.trim()).filter(Boolean);
        this.progress = 0;
        this.completed = false;
        this.validSwitchIds = new Set(this.order.map((id) => `sequence-${id}`));
        this.onSwitch = (event) => {
          const detail = event.detail || {};
          if (this.completed || !detail.active || ["initial", "reset", "creative-reset"].includes(detail.source)) return;
          if (!this.validSwitchIds.has(detail.switchId)) return;
          const input = detail.switchId.replace(/^sequence-/, "");
          const result = sequenceAdvance(this.order, this.progress, input);
          this.progress = result.progress;
          this.completed = result.complete;
          if (this.completed) setDoorOpen(this.data.door, true);
          window.setTimeout(() => resetQuestSwitch(detail.switchId), 120);
          window.dispatchEvent(new CustomEvent("creative-sequence-state", {
            detail: { order: [...this.order], input, progress: this.progress, completed: this.completed, reset: result.reset }
          }));
        };
        this.onReset = () => {
          this.progress = 0;
          this.completed = false;
          setDoorOpen(this.data.door, false, true);
          window.setTimeout(() => this.order.forEach((id) => resetQuestSwitch(`sequence-${id}`)), 0);
        };
        window.addEventListener("lab-switch-changed", this.onSwitch);
        window.addEventListener("course-request-reset", this.onReset);
        this.onReset();
      },
      remove: function () {
        window.removeEventListener("lab-switch-changed", this.onSwitch);
        window.removeEventListener("course-request-reset", this.onReset);
      }
    });
  }
}

function registerAll() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  registerCreativePadComponents();
  registerCreativeControllers();
}

registerAll();
