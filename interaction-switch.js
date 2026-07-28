// Reusable button, lever, and gate mechanics for the Phase 3 interaction lab.
// Buttons support pressure activation and nearby controller-trigger activation.
// Levers toggle with either controller while the hand is inside the interaction radius.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function pointWithinRadius(point, center, radius = 0.5) {
  if (!point || !center) return false;
  const dx = finiteNumber(point.x) - finiteNumber(center.x);
  const dy = finiteNumber(point.y) - finiteNumber(center.y);
  const dz = finiteNumber(point.z) - finiteNumber(center.z);
  return dx * dx + dy * dy + dz * dz <= Math.max(0.01, finiteNumber(radius, 0.5)) ** 2;
}

export function pressureButtonPressed({ rigPosition, center, radius = 0.78, maxHeight = 0.48 } = {}) {
  if (!rigPosition || !center) return false;
  const horizontal = pointWithinRadius(
    { x: rigPosition.x, y: center.y, z: rigPosition.z },
    center,
    radius
  );
  const vertical = Math.abs(finiteNumber(rigPosition.y) - finiteNumber(center.y)) <= Math.max(0.08, finiteNumber(maxHeight, 0.48));
  return horizontal && vertical;
}

export function nextToggleState(current, mode = "toggle") {
  if (mode === "momentary") return true;
  return !Boolean(current);
}

export function gateTravelPosition({ closed = 0, open = 4.5, progress = 0 } = {}) {
  const t = Math.min(1, Math.max(0, finiteNumber(progress)));
  return finiteNumber(closed) + (finiteNumber(open, 4.5) - finiteNumber(closed)) * (t * t * (3 - 2 * t));
}

function registerBrowserComponents() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;

  if (!AFRAME.components["switch-target-gate"]) {
    AFRAME.registerComponent("switch-target-gate", {
      schema: {
        openOffsetY: { default: 4.6 },
        duration: { default: 650 },
        startsOpen: { default: false }
      },

      init: function () {
        this.baseY = this.el.object3D.position.y;
        this.open = Boolean(this.data.startsOpen);
        this.progress = this.open ? 1 : 0;
        this.target = this.progress;
        this.onSwitch = (event) => {
          if (event.detail?.targetId !== this.el.id) return;
          this.open = Boolean(event.detail.active);
          this.target = this.open ? 1 : 0;
        };
        this.onReset = () => {
          this.open = Boolean(this.data.startsOpen);
          this.progress = this.open ? 1 : 0;
          this.target = this.progress;
          this.el.object3D.position.y = gateTravelPosition({
            closed: this.baseY,
            open: this.baseY + this.data.openOffsetY,
            progress: this.progress
          });
        };
        window.addEventListener("lab-switch-changed", this.onSwitch);
        window.addEventListener("course-request-reset", this.onReset);
        this.onReset();
      },

      remove: function () {
        window.removeEventListener("lab-switch-changed", this.onSwitch);
        window.removeEventListener("course-request-reset", this.onReset);
      },

      tick: function (time, delta) {
        const duration = Math.max(100, finiteNumber(this.data.duration, 650));
        const step = Math.min(1, Math.max(0, finiteNumber(delta, 16) / duration));
        if (Math.abs(this.progress - this.target) > 0.0001) {
          this.progress += (this.target - this.progress) * Math.min(1, step * 4.5);
          if (Math.abs(this.progress - this.target) < 0.004) this.progress = this.target;
          this.el.object3D.position.y = gateTravelPosition({
            closed: this.baseY,
            open: this.baseY + this.data.openOffsetY,
            progress: this.progress
          });
          this.el.object3D.updateMatrixWorld(true);
        }
      }
    });
  }

  if (!AFRAME.components["quest-switch"]) {
    AFRAME.registerComponent("quest-switch", {
      schema: {
        type: { default: "button", oneOf: ["button", "lever"] },
        targetId: { default: "" },
        mode: { default: "toggle", oneOf: ["toggle", "momentary"] },
        rig: { type: "selector" },
        leftHand: { type: "selector" },
        rightHand: { type: "selector" },
        radius: { default: 0.72 },
        pressureRadius: { default: 0.8 },
        cooldown: { default: 450 },
        startsActive: { default: false }
      },

      init: function () {
        this.active = Boolean(this.data.startsActive);
        this.lastActivation = -Infinity;
        this.worldCenter = new THREE.Vector3();
        this.handPoint = new THREE.Vector3();
        this.pressVisual = this.el.querySelector("[data-switch-press]");
        this.leverHandle = this.el.querySelector("[data-lever-handle]");
        this.indicator = this.el.querySelector("[data-switch-indicator]");
        this.onTrigger = this.onTrigger.bind(this);
        this.onReset = this.onReset.bind(this);
        this.data.leftHand?.addEventListener("triggerdown", this.onTrigger);
        this.data.rightHand?.addEventListener("triggerdown", this.onTrigger);
        this.data.leftHand?.addEventListener("gripdown", this.onTrigger);
        this.data.rightHand?.addEventListener("gripdown", this.onTrigger);
        window.addEventListener("course-request-reset", this.onReset);
        this.renderState();
        window.setTimeout(() => this.emitState("initial"), 0);
      },

      remove: function () {
        this.data.leftHand?.removeEventListener("triggerdown", this.onTrigger);
        this.data.rightHand?.removeEventListener("triggerdown", this.onTrigger);
        this.data.leftHand?.removeEventListener("gripdown", this.onTrigger);
        this.data.rightHand?.removeEventListener("gripdown", this.onTrigger);
        window.removeEventListener("course-request-reset", this.onReset);
      },

      handNear: function (hand) {
        if (!hand?.object3D) return false;
        this.el.object3D.getWorldPosition(this.worldCenter);
        hand.object3D.getWorldPosition(this.handPoint);
        return pointWithinRadius(this.handPoint, this.worldCenter, this.data.radius);
      },

      onTrigger: function (event) {
        const hand = event.currentTarget;
        if (!this.handNear(hand)) return;
        this.activate(performance.now(), "controller");
      },

      activate: function (time, source) {
        if (time - this.lastActivation < Math.max(100, this.data.cooldown)) return false;
        this.lastActivation = time;
        this.active = nextToggleState(this.active, this.data.mode);
        this.renderState();
        this.emitState(source);
        return true;
      },

      releaseMomentary: function (source = "pressure-release") {
        if (this.data.mode !== "momentary" || !this.active) return;
        this.active = false;
        this.renderState();
        this.emitState(source);
      },

      emitState: function (source) {
        window.dispatchEvent(new CustomEvent("lab-switch-changed", {
          detail: {
            switchId: this.el.id || "quest-switch",
            targetId: this.data.targetId,
            active: this.active,
            type: this.data.type,
            source
          }
        }));
      },

      renderState: function () {
        if (this.pressVisual?.object3D?.position) {
          this.pressVisual.object3D.position.y = this.active ? 0.05 : 0.16;
        }
        if (this.leverHandle?.object3D?.rotation) {
          this.leverHandle.object3D.rotation.z = THREE.MathUtils.degToRad(this.active ? -42 : 42);
        }
        if (this.indicator) {
          this.indicator.setAttribute("color", this.active ? "#22C55E" : "#EF4444");
          this.indicator.setAttribute("material", `emissive: ${this.active ? "#15803D" : "#991B1B"}; emissiveIntensity: 0.65`);
        }
      },

      onReset: function () {
        this.active = Boolean(this.data.startsActive);
        this.lastActivation = -Infinity;
        this.renderState();
        this.emitState("reset");
      },

      tick: function (time) {
        if (this.data.type !== "button" || !this.data.rig?.object3D?.position) return;
        this.el.object3D.getWorldPosition(this.worldCenter);
        const pressed = pressureButtonPressed({
          rigPosition: this.data.rig.object3D.position,
          center: this.worldCenter,
          radius: this.data.pressureRadius,
          maxHeight: 0.55
        });
        if (pressed && !this.active) this.activate(time, "pressure");
        else if (!pressed) this.releaseMomentary();
      }
    });
  }
}

registerBrowserComponents();
