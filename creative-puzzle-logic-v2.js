// Puzzle-state upgrade for clear, persistent feedback.
// Relay controls stay green while armed, reset on failure, and remain green on success.
// Sequence controls stay green as correct steps are entered and all reset after a mistake.

import { setSwitchActive } from "./creative-puzzle-input-v2.js";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function relayCountdown(now, expiresAt, windowMs) {
  const duration = Math.max(1, finiteNumber(windowMs, 7000));
  const remaining = Math.max(0, finiteNumber(expiresAt) - finiteNumber(now));
  return {
    remaining,
    seconds: remaining / 1000,
    progress: Math.min(1, Math.max(0, remaining / duration))
  };
}

function setDoor(door, open, immediate = false) {
  door?.components?.["physics-door"]?.setOpen(Boolean(open), immediate);
}

function setControl(id, active) {
  const element = document.getElementById(id);
  return setSwitchActive(element, active, "v2-state", false);
}

function resetControls(ids) {
  for (const id of ids) setControl(id, false);
}

function registerRelayController() {
  if (typeof window === "undefined" || !window.AFRAME) return;
  if (AFRAME.components["creative-relay-controller-v2"]) return;

  AFRAME.registerComponent("creative-relay-controller-v2", {
    schema: {
      firstId: { default: "relay-button" },
      secondId: { default: "relay-lever" },
      windowMs: { default: 7000 },
      door: { type: "selector" }
    },

    init: function () {
      this.state = "idle";
      this.expiresAt = 0;
      this.onSwitch = this.onSwitch.bind(this);
      this.onReset = this.onReset.bind(this);
      window.addEventListener("lab-switch-changed", this.onSwitch);
      window.addEventListener("course-request-reset", this.onReset);
      this.onReset();
    },

    remove: function () {
      window.removeEventListener("lab-switch-changed", this.onSwitch);
      window.removeEventListener("course-request-reset", this.onReset);
    },

    emitState: function (extra = {}) {
      window.dispatchEvent(new CustomEvent("creative-relay-v2-state", {
        detail: {
          state: this.state,
          expiresAt: this.expiresAt,
          windowMs: this.data.windowMs,
          firstId: this.data.firstId,
          secondId: this.data.secondId,
          ...extra
        }
      }));
    },

    clearAttempt: function (reason = "reset") {
      this.state = "idle";
      this.expiresAt = 0;
      resetControls([this.data.firstId, this.data.secondId]);
      setDoor(this.data.door, false);
      this.emitState({ reason, failed: reason !== "restart" });
    },

    onSwitch: function (event) {
      const detail = event.detail || {};
      if (!detail.active || ![this.data.firstId, this.data.secondId].includes(detail.switchId)) return;
      if (["initial", "reset", "creative-reset", "v2-state"].includes(detail.source)) return;
      const now = performance.now();

      if (this.state === "complete") return;
      if (this.state === "idle") {
        if (detail.switchId !== this.data.firstId) {
          this.clearAttempt("wrong-first-control");
          return;
        }
        this.state = "armed";
        this.expiresAt = now + Math.max(500, this.data.windowMs);
        setControl(this.data.firstId, true);
        setControl(this.data.secondId, false);
        this.emitState({ started: true });
        return;
      }

      if (this.state === "armed") {
        if (now > this.expiresAt) {
          this.clearAttempt("expired");
          return;
        }
        if (detail.switchId !== this.data.secondId) {
          this.clearAttempt("wrong-second-control");
          return;
        }
        this.state = "complete";
        this.expiresAt = 0;
        setControl(this.data.firstId, true);
        setControl(this.data.secondId, true);
        setDoor(this.data.door, true);
        this.emitState({ success: true });
      }
    },

    onReset: function () {
      this.state = "idle";
      this.expiresAt = 0;
      resetControls([this.data.firstId, this.data.secondId]);
      setDoor(this.data.door, false, true);
      this.emitState({ reason: "restart" });
    },

    tick: function () {
      if (this.state !== "armed") return;
      if (performance.now() > this.expiresAt) this.clearAttempt("expired");
    }
  });
}

function registerSequenceController() {
  if (typeof window === "undefined" || !window.AFRAME) return;
  if (AFRAME.components["creative-sequence-controller-v2"]) return;

  AFRAME.registerComponent("creative-sequence-controller-v2", {
    schema: {
      order: { default: "amber,cyan,violet" },
      door: { type: "selector" }
    },

    init: function () {
      this.order = this.data.order.split(",").map((value) => value.trim()).filter(Boolean);
      this.ids = this.order.map((color) => `sequence-${color}`);
      this.progress = 0;
      this.complete = false;
      this.onSwitch = this.onSwitch.bind(this);
      this.onReset = this.onReset.bind(this);
      window.addEventListener("lab-switch-changed", this.onSwitch);
      window.addEventListener("course-request-reset", this.onReset);
      this.onReset();
    },

    remove: function () {
      window.removeEventListener("lab-switch-changed", this.onSwitch);
      window.removeEventListener("course-request-reset", this.onReset);
    },

    emitState: function (extra = {}) {
      window.dispatchEvent(new CustomEvent("creative-sequence-v2-state", {
        detail: {
          order: [...this.order],
          progress: this.progress,
          complete: this.complete,
          ...extra
        }
      }));
    },

    resetProgress: function (reason = "wrong-color") {
      this.progress = 0;
      this.complete = false;
      resetControls(this.ids);
      setDoor(this.data.door, false);
      this.emitState({ reset: true, reason });
    },

    onSwitch: function (event) {
      const detail = event.detail || {};
      if (this.complete || !detail.active || !this.ids.includes(detail.switchId)) return;
      if (["initial", "reset", "creative-reset", "v2-state"].includes(detail.source)) return;
      const expected = this.ids[this.progress];
      if (detail.switchId !== expected) {
        this.resetProgress("wrong-color");
        return;
      }
      setControl(detail.switchId, true);
      this.progress += 1;
      if (this.progress >= this.ids.length) {
        this.complete = true;
        setDoor(this.data.door, true);
      }
      this.emitState({ inputId: detail.switchId, correct: true });
    },

    onReset: function () {
      this.progress = 0;
      this.complete = false;
      resetControls(this.ids);
      setDoor(this.data.door, false, true);
      this.emitState({ reason: "restart" });
    }
  });
}

function registerRelayDisplay() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  if (AFRAME.components["creative-relay-display-v2"]) return;

  AFRAME.registerComponent("creative-relay-display-v2", {
    schema: {
      controller: { type: "selector" }
    },

    init: function () {
      this.bar = this.el.querySelector("[data-relay-timer-bar]");
      this.text = this.el.querySelector("[data-relay-timer-text]");
      this.status = this.el.querySelector("[data-relay-timer-status]");
      this.baseScale = this.bar?.object3D?.scale?.clone?.() || new THREE.Vector3(1, 1, 1);
    },

    tick: function () {
      const controller = this.data.controller?.components?.["creative-relay-controller-v2"];
      if (!controller || !this.bar || !this.text) return;
      if (controller.state === "complete") {
        this.bar.object3D.scale.x = 1;
        this.bar.setAttribute("color", "#22C55E");
        this.text.setAttribute("value", "UNLOCKED");
        this.status?.setAttribute("value", "RELAY COMPLETE");
        return;
      }
      if (controller.state !== "armed") {
        this.bar.object3D.scale.x = 1;
        this.bar.setAttribute("color", "#64748B");
        this.text.setAttribute("value", "READY");
        this.status?.setAttribute("value", "PRESS THE FIRST CONTROL");
        return;
      }
      const countdown = relayCountdown(performance.now(), controller.expiresAt, controller.data.windowMs);
      this.bar.object3D.scale.x = Math.max(0.001, countdown.progress);
      this.bar.setAttribute("color", countdown.progress > 0.5 ? "#22C55E" : countdown.progress > 0.22 ? "#FACC15" : "#EF4444");
      this.text.setAttribute("value", `${countdown.seconds.toFixed(1)}s`);
      this.status?.setAttribute("value", "CROSS AND ACTIVATE THE SECOND CONTROL");
    }
  });
}

export function replacePuzzleControllers(documentLike = globalThis.document) {
  const relay = documentLike?.getElementById?.("relay-controller");
  const oldRelay = relay?.components?.["creative-relay-controller"];
  if (relay && oldRelay && !relay.hasAttribute("creative-relay-controller-v2")) {
    const data = oldRelay.data;
    relay.removeAttribute("creative-relay-controller");
    relay.setAttribute("creative-relay-controller-v2", `firstId: ${data.firstId}; secondId: ${data.secondId}; windowMs: ${data.windowMs}; door: #${data.door?.id || "relay-door"}`);
  }

  const sequence = documentLike?.getElementById?.("sequence-controller");
  const oldSequence = sequence?.components?.["creative-sequence-controller"];
  if (sequence && oldSequence && !sequence.hasAttribute("creative-sequence-controller-v2")) {
    const data = oldSequence.data;
    sequence.removeAttribute("creative-sequence-controller");
    sequence.setAttribute("creative-sequence-controller-v2", `order: ${data.order}; door: #${data.door?.id || "sequence-door"}`);
  }
  return Boolean(relay && sequence);
}

registerRelayController();
registerSequenceController();
registerRelayDisplay();

function apply() {
  replacePuzzleControllers();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  window.setTimeout(apply, 320);
  window.setTimeout(apply, 1000);
}
