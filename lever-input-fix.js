// Quest controller fallback for the Button & Lever Lab.
// The lab's hand entities intentionally use plain tracked-controls for Gorilla locomotion.
// Some Quest Browser/A-Frame combinations provide poses but do not emit triggerdown or
// gripdown on those entities. This module supports both WebXR session events and direct
// gamepad polling, while preserving the original quest-switch event listeners.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function gamepadTriggerOrGripPressed(gamepad, threshold = 0.55) {
  const buttons = gamepad?.buttons;
  if (!buttons || typeof buttons.length !== "number") return false;

  // WebXR standard mapping: button 0 is the index trigger and button 1 is squeeze/grip.
  return [0, 1].some((index) => {
    const button = buttons[index];
    if (!button) return false;
    return button.pressed === true || finiteNumber(button.value, 0) >= threshold;
  });
}

export function inferHandedness(hand) {
  if (!hand) return "";

  for (const attributeName of ["tracked-controls", "oculus-touch-controls", "meta-touch-controls"]) {
    const value = hand.getAttribute?.(attributeName);
    if (value && typeof value === "object" && (value.hand === "left" || value.hand === "right")) {
      return value.hand;
    }
    if (typeof value === "string") {
      const match = value.match(/hand\s*:\s*(left|right)/i);
      if (match) return match[1].toLowerCase();
    }
  }

  const id = String(hand.id || "").toLowerCase();
  if (id.includes("left")) return "left";
  if (id.includes("right")) return "right";
  return "";
}

function gamepadFromComponent(component) {
  if (!component) return null;
  return (
    component.gamepad ||
    component.controller?.gamepad ||
    component.controller?.inputSource?.gamepad ||
    component.inputSource?.gamepad ||
    null
  );
}

export function resolveXRGamepad(hand) {
  if (!hand) return null;

  for (const componentName of [
    "tracked-controls",
    "tracked-controls-webxr",
    "oculus-touch-controls",
    "meta-touch-controls"
  ]) {
    const gamepad = gamepadFromComponent(hand.components?.[componentName]);
    if (gamepad) return gamepad;
  }

  const session = hand.sceneEl?.renderer?.xr?.getSession?.();
  const handedness = inferHandedness(hand);
  if (!session?.inputSources || !handedness) return null;

  for (const source of session.inputSources) {
    if (source?.handedness === handedness && source.gamepad) return source.gamepad;
  }
  return null;
}

export function attachLeverGamepadFallback(documentLike = globalThis.document) {
  const lever = documentLike?.getElementById?.("hand-lever");
  if (!lever?.setAttribute) return false;
  if (!lever.hasAttribute?.("quest-lever-gamepad-fallback")) {
    lever.setAttribute(
      "quest-lever-gamepad-fallback",
      "target: #hand-lever; leftHand: #left-hand; rightHand: #right-hand; threshold: 0.55"
    );
  }
  return true;
}

function registerBrowserComponent() {
  if (typeof window === "undefined" || !window.AFRAME) return;
  if (AFRAME.components["quest-lever-gamepad-fallback"]) return;

  AFRAME.registerComponent("quest-lever-gamepad-fallback", {
    schema: {
      target: { type: "selector" },
      leftHand: { type: "selector" },
      rightHand: { type: "selector" },
      threshold: { default: 0.55 }
    },

    init: function () {
      this.previousPressed = { left: false, right: false };
      this.boundSession = null;
      this.onXRInput = this.onXRInput.bind(this);
      this.onEnterVR = this.onEnterVR.bind(this);
      this.onReset = this.onReset.bind(this);

      this.el.sceneEl?.addEventListener("enter-vr", this.onEnterVR);
      window.addEventListener("course-request-reset", this.onReset);
      this.bindSession();
    },

    remove: function () {
      this.el.sceneEl?.removeEventListener("enter-vr", this.onEnterVR);
      window.removeEventListener("course-request-reset", this.onReset);
      this.unbindSession();
    },

    onReset: function () {
      this.previousPressed.left = false;
      this.previousPressed.right = false;
    },

    onEnterVR: function () {
      window.setTimeout(() => this.bindSession(), 0);
      window.setTimeout(() => this.bindSession(), 250);
    },

    bindSession: function () {
      const session = this.el.sceneEl?.renderer?.xr?.getSession?.() || null;
      if (session === this.boundSession) return;
      this.unbindSession();
      this.boundSession = session;
      session?.addEventListener?.("selectstart", this.onXRInput);
      session?.addEventListener?.("squeezestart", this.onXRInput);
    },

    unbindSession: function () {
      this.boundSession?.removeEventListener?.("selectstart", this.onXRInput);
      this.boundSession?.removeEventListener?.("squeezestart", this.onXRInput);
      this.boundSession = null;
    },

    switchComponent: function () {
      return this.data.target?.components?.["quest-switch"] || null;
    },

    handForSource: function (inputSource) {
      if (inputSource?.handedness === "left") return this.data.leftHand;
      if (inputSource?.handedness === "right") return this.data.rightHand;
      return null;
    },

    tryActivate: function (hand, source) {
      const component = this.switchComponent();
      if (!component || !hand || !component.handNear?.(hand)) return false;
      return Boolean(component.activate?.(performance.now(), source));
    },

    onXRInput: function (event) {
      this.tryActivate(this.handForSource(event.inputSource), `xr-${event.type}`);
    },

    pollHand: function (hand, key) {
      const pressed = gamepadTriggerOrGripPressed(resolveXRGamepad(hand), this.data.threshold);
      const wasPressed = this.previousPressed[key];
      if (pressed && !wasPressed) this.tryActivate(hand, "xr-gamepad");
      this.previousPressed[key] = pressed;
    },

    tick: function () {
      this.bindSession();
      this.pollHand(this.data.leftHand, "left");
      this.pollHand(this.data.rightHand, "right");
    }
  });
}

function attachWhenReady() {
  attachLeverGamepadFallback();
}

registerBrowserComponent();

if (typeof window !== "undefined") {
  window.addEventListener("course-built", attachWhenReady);
  document.addEventListener("DOMContentLoaded", attachWhenReady, { once: true });
  window.setTimeout(attachWhenReady, 100);
  window.setTimeout(attachWhenReady, 500);
}
