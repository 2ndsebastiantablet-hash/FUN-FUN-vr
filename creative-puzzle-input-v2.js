// Physical puzzle-control upgrade.
// Buttons activate from a real hand press and levers activate from a direct pull.
// The old floating red indicator spheres and Trigger/Grip proximity shortcuts are disabled.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function buttonHandContact(hand, button, horizontalRadius = 0.48, verticalRange = 0.28) {
  if (!hand || !button) return false;
  const dx = finiteNumber(hand.x) - finiteNumber(button.x);
  const dz = finiteNumber(hand.z) - finiteNumber(button.z);
  const horizontal = dx * dx + dz * dz <= Math.max(0.05, finiteNumber(horizontalRadius, 0.48)) ** 2;
  const dy = finiteNumber(hand.y) - finiteNumber(button.y);
  return horizontal && dy >= -0.2 && dy <= Math.max(0.08, finiteNumber(verticalRange, 0.28));
}

export function leverPullReached(start, current, threshold = 0.24) {
  if (!start || !current) return false;
  const dx = finiteNumber(current.x) - finiteNumber(start.x);
  const dy = finiteNumber(current.y) - finiteNumber(start.y);
  const dz = finiteNumber(current.z) - finiteNumber(start.z);
  const pull = Math.max(-dy, Math.hypot(dx, dz) * 0.82);
  return pull >= Math.max(0.12, finiteNumber(threshold, 0.24));
}

function colorOf(element, fallback = "#38BDF8") {
  const color = element?.getAttribute?.("color") || element?.getAttribute?.("material")?.color;
  return typeof color === "string" ? color : fallback;
}

export function setSwitchActive(element, active, source = "v2-visual", emit = false) {
  const component = element?.components?.["quest-switch"];
  if (!component) return false;
  component.active = Boolean(active);
  component.lastActivation = component.active ? performance.now() : -Infinity;
  component.renderState?.();
  if (emit) component.emitState?.(source);
  return true;
}

function removeLegacyShortcuts(element, component) {
  if (!component) return;
  component.data.pressureRadius = 0.001;
  component.data.radius = 0.001;
  component.data.leftHand?.removeEventListener?.("triggerdown", component.onTrigger);
  component.data.rightHand?.removeEventListener?.("triggerdown", component.onTrigger);
  component.data.leftHand?.removeEventListener?.("gripdown", component.onTrigger);
  component.data.rightHand?.removeEventListener?.("gripdown", component.onTrigger);
  component.tick = () => {};
  element.setAttribute("data-physical-input-only", "true");
}

function patchRenderState(element, component) {
  const press = element.querySelector("[data-switch-press]");
  const handle = element.querySelector("[data-lever-handle]");
  const originalPressColor = press?.dataset?.inactiveColor || colorOf(press, "#38BDF8");
  const originalHandleColor = handle?.dataset?.inactiveColor || colorOf(handle.querySelector?.("a-box"), "#F59E0B");
  if (press?.dataset) press.dataset.inactiveColor = originalPressColor;
  if (handle?.dataset) handle.dataset.inactiveColor = originalHandleColor;

  component.pressVisual = press;
  component.leverHandle = handle;
  component.indicator = null;
  component.renderState = function renderPhysicalState() {
    const active = Boolean(this.active);
    const currentPress = element.querySelector("[data-switch-press]");
    const currentHandle = element.querySelector("[data-lever-handle]");
    if (currentPress?.object3D?.position) {
      currentPress.object3D.position.y = active ? 0.045 : 0.16;
      currentPress.setAttribute("color", active ? "#22C55E" : (currentPress.dataset?.inactiveColor || originalPressColor));
      currentPress.setAttribute("material", `color: ${active ? "#22C55E" : (currentPress.dataset?.inactiveColor || originalPressColor)}; emissive: ${active ? "#15803D" : "#000000"}; emissiveIntensity: ${active ? 0.65 : 0.08}; roughness: 0.55`);
    }
    if (currentHandle?.object3D?.rotation) {
      currentHandle.object3D.rotation.z = THREE.MathUtils.degToRad(active ? -48 : 42);
      for (const child of Array.from(currentHandle.children || [])) {
        if (!child.setAttribute) continue;
        child.setAttribute("color", active ? "#22C55E" : (currentHandle.dataset?.inactiveColor || originalHandleColor));
      }
    }
    element.setAttribute("data-physical-switch-active", active ? "true" : "false");
  };
  component.renderState();
}

function registerPhysicalInputComponent() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  if (AFRAME.components["physical-puzzle-input-v2"]) return;

  AFRAME.registerComponent("physical-puzzle-input-v2", {
    schema: {
      type: { default: "button", oneOf: ["button", "lever"] },
      leftHand: { type: "selector" },
      rightHand: { type: "selector" },
      buttonRadius: { default: 0.48 },
      leverContactRadius: { default: 0.38 },
      leverReleaseRadius: { default: 0.82 },
      pullThreshold: { default: 0.24 },
      cooldown: { default: 260 }
    },

    init: function () {
      this.press = this.el.querySelector("[data-switch-press]");
      this.handle = this.el.querySelector("[data-lever-handle]");
      this.knob = this.handle?.querySelector("a-sphere") || this.handle;
      this.buttonWorld = new THREE.Vector3();
      this.handWorld = new THREE.Vector3();
      this.startWorld = new THREE.Vector3();
      this.previousInside = new Map();
      this.pullHand = null;
      this.lastActivation = -Infinity;
      this.onReset = () => {
        this.previousInside.clear();
        this.pullHand = null;
      };
      window.addEventListener("course-request-reset", this.onReset);
    },

    remove: function () {
      window.removeEventListener("course-request-reset", this.onReset);
    },

    activate: function (source) {
      const component = this.el.components?.["quest-switch"];
      const now = performance.now();
      if (!component || component.active || now - this.lastActivation < Math.max(120, this.data.cooldown)) return false;
      this.lastActivation = now;
      component.activate(now, source);
      return true;
    },

    buttonTick: function () {
      const target = this.press || this.el;
      target.object3D.getWorldPosition(this.buttonWorld);
      for (const hand of [this.data.leftHand, this.data.rightHand]) {
        if (!hand?.object3D) continue;
        hand.object3D.getWorldPosition(this.handWorld);
        const inside = buttonHandContact(this.handWorld, this.buttonWorld, this.data.buttonRadius, 0.3);
        const wasInside = Boolean(this.previousInside.get(hand));
        if (inside && !wasInside) this.activate("physical-button-press");
        this.previousInside.set(hand, inside);
      }
    },

    leverTick: function () {
      const knob = this.knob || this.handle || this.el;
      knob.object3D.getWorldPosition(this.buttonWorld);
      if (!this.pullHand) {
        for (const hand of [this.data.leftHand, this.data.rightHand]) {
          if (!hand?.object3D) continue;
          hand.object3D.getWorldPosition(this.handWorld);
          if (this.handWorld.distanceTo(this.buttonWorld) <= this.data.leverContactRadius) {
            this.pullHand = hand;
            this.startWorld.copy(this.handWorld);
            break;
          }
        }
        return;
      }

      if (!this.pullHand.object3D) {
        this.pullHand = null;
        return;
      }
      this.pullHand.object3D.getWorldPosition(this.handWorld);
      if (this.handWorld.distanceTo(this.buttonWorld) > this.data.leverReleaseRadius) {
        this.pullHand = null;
        return;
      }
      if (leverPullReached(this.startWorld, this.handWorld, this.data.pullThreshold)) {
        this.activate("physical-lever-pull");
        this.pullHand = null;
      }
    },

    tick: function () {
      if (this.data.type === "button") this.buttonTick();
      else this.leverTick();
    }
  });
}

export function upgradePhysicalSwitch(element) {
  const component = element?.components?.["quest-switch"];
  if (!element || !component || element.dataset?.physicalSwitchV2 === "true") return false;
  element.dataset.physicalSwitchV2 = "true";
  for (const indicator of Array.from(element.querySelectorAll("[data-switch-indicator]"))) indicator.remove();
  removeLegacyShortcuts(element, component);
  patchRenderState(element, component);
  element.setAttribute(
    "physical-puzzle-input-v2",
    `type: ${component.data.type}; leftHand: #left-hand; rightHand: #right-hand; buttonRadius: 0.48; leverContactRadius: 0.4; leverReleaseRadius: 0.86; pullThreshold: 0.24; cooldown: 260`
  );
  return true;
}

export function upgradeAllPhysicalSwitches(documentLike = globalThis.document) {
  let upgraded = 0;
  for (const element of Array.from(documentLike?.querySelectorAll?.("[quest-switch]") || [])) {
    if (upgradePhysicalSwitch(element)) upgraded += 1;
  }
  return upgraded;
}

registerPhysicalInputComponent();

function apply() {
  upgradeAllPhysicalSwitches();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  window.setTimeout(apply, 250);
  window.setTimeout(apply, 900);
}
