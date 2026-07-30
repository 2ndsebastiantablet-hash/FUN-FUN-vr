// Solid puzzle controls for Quest.
// Buttons use spring-loaded dynamic collision bodies. Levers use a real Cannon
// hinge with a compound rod/knob body. Exact shape-contact checks supplement
// Cannon collision events so quick tracked-hand motion cannot miss a press.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value)));
}

export function sphereBoxContact(sphere, radius, center, halfSize) {
  if (!sphere || !center || !halfSize) return false;
  const closestX = clamp(sphere.x, center.x - halfSize.x, center.x + halfSize.x);
  const closestY = clamp(sphere.y, center.y - halfSize.y, center.y + halfSize.y);
  const closestZ = clamp(sphere.z, center.z - halfSize.z, center.z + halfSize.z);
  const dx = finiteNumber(sphere.x) - closestX;
  const dy = finiteNumber(sphere.y) - closestY;
  const dz = finiteNumber(sphere.z) - closestZ;
  const safeRadius = Math.max(0.01, finiteNumber(radius, 0.16));
  return dx * dx + dy * dy + dz * dz <= safeRadius * safeRadius;
}

export function pointSegmentDistanceSquared(point, start, end) {
  if (!point || !start || !end) return Infinity;
  const abx = finiteNumber(end.x) - finiteNumber(start.x);
  const aby = finiteNumber(end.y) - finiteNumber(start.y);
  const abz = finiteNumber(end.z) - finiteNumber(start.z);
  const apx = finiteNumber(point.x) - finiteNumber(start.x);
  const apy = finiteNumber(point.y) - finiteNumber(start.y);
  const apz = finiteNumber(point.z) - finiteNumber(start.z);
  const lengthSquared = abx * abx + aby * aby + abz * abz;
  const t = lengthSquared > 1e-8 ? clamp((apx * abx + apy * aby + apz * abz) / lengthSquared, 0, 1) : 0;
  const dx = apx - abx * t;
  const dy = apy - aby * t;
  const dz = apz - abz * t;
  return dx * dx + dy * dy + dz * dz;
}

export function sphereCapsuleContact(sphere, sphereRadius, start, end, capsuleRadius) {
  const combined = Math.max(0.01, finiteNumber(sphereRadius, 0.16)) + Math.max(0.01, finiteNumber(capsuleRadius, 0.17));
  return pointSegmentDistanceSquared(sphere, start, end) <= combined * combined;
}

export function normalizeAngle(angle) {
  let current = finiteNumber(angle);
  while (current > Math.PI) current -= Math.PI * 2;
  while (current < -Math.PI) current += Math.PI * 2;
  return current;
}

export function angleFromZQuaternion(quaternion) {
  if (!quaternion) return 0;
  return normalizeAngle(2 * Math.atan2(finiteNumber(quaternion.z), finiteNumber(quaternion.w, 1)));
}

export function leverHandAngle(pivot, hand) {
  if (!pivot || !hand) return 0;
  return Math.atan2(
    -(finiteNumber(hand.x) - finiteNumber(pivot.x)),
    finiteNumber(hand.y) - finiteNumber(pivot.y)
  );
}

function colorOf(element, fallback = "#38BDF8") {
  const material = element?.getAttribute?.("material");
  const color = element?.getAttribute?.("color") || material?.color;
  return typeof color === "string" ? color : fallback;
}

function isSolidHandEntity(entity) {
  return Boolean(entity?.components?.["solid-physics-hand"] || entity?.hasAttribute?.("solid-physics-hand"));
}

function bodyOtherEntity(event) {
  return event?.body?.el || event?.detail?.body?.el || null;
}

function worldOf(element, target) {
  if (!element?.object3D || !target) return target;
  element.object3D.getWorldPosition(target);
  return target;
}

function physicsWorld(scene) {
  return scene?.systems?.physics?.driver?.world || scene?.systems?.physics?.world || null;
}

export function setSwitchActive(element, active, source = "v3-state", emit = false) {
  const component = element?.components?.["quest-switch"];
  if (!component) return false;
  component.active = Boolean(active);
  component.lastActivation = component.active ? performance.now() : -Infinity;
  component.renderState?.();
  if (emit) component.emitState?.(source);
  return true;
}

function disableLegacyInput(element, component) {
  if (!component) return;
  component.data.pressureRadius = 0.001;
  component.data.radius = 0.001;
  component.data.leftHand?.removeEventListener?.("triggerdown", component.onTrigger);
  component.data.rightHand?.removeEventListener?.("triggerdown", component.onTrigger);
  component.data.leftHand?.removeEventListener?.("gripdown", component.onTrigger);
  component.data.rightHand?.removeEventListener?.("gripdown", component.onTrigger);
  component.tick = () => {};
  element.setAttribute("data-solid-control-v3", "true");
}

function patchControlRendering(element, component) {
  const press = element.querySelector("[data-switch-press]");
  const handle = element.querySelector("[data-lever-handle]");
  const rod = handle?.querySelector("a-box");
  const knob = handle?.querySelector("a-sphere");
  const pressColor = press?.dataset?.inactiveColor || colorOf(press, "#38BDF8");
  const handleColor = handle?.dataset?.inactiveColor || colorOf(rod, "#F59E0B");
  if (press?.dataset) press.dataset.inactiveColor = pressColor;
  if (handle?.dataset) handle.dataset.inactiveColor = handleColor;

  component.indicator = null;
  component.renderState = function renderSolidControlState() {
    const active = Boolean(this.active);
    const currentPress = element.querySelector("[data-switch-press]");
    const currentHandle = element.querySelector("[data-lever-handle]");
    if (currentPress) {
      const currentColor = active ? "#22C55E" : (currentPress.dataset?.inactiveColor || pressColor);
      currentPress.setAttribute("material", `color: ${currentColor}; emissive: ${active ? "#15803D" : "#000000"}; emissiveIntensity: ${active ? 0.68 : 0.08}; roughness: 0.55`);
    }
    if (currentHandle) {
      const currentColor = active ? "#22C55E" : (currentHandle.dataset?.inactiveColor || handleColor);
      for (const child of Array.from(currentHandle.children || [])) {
        if (child?.setAttribute) child.setAttribute("material", `color: ${currentColor}; emissive: ${active ? "#15803D" : "#000000"}; emissiveIntensity: ${active ? 0.62 : 0.08}; roughness: 0.58`);
      }
    }
    element.setAttribute("data-physical-switch-active", active ? "true" : "false");
  };
  component.renderState();

  // Rebuild the lever visual so it rotates around its physical base instead of
  // around the middle of the old decorative handle.
  if (handle && rod && knob) {
    handle.setAttribute("position", "0 0.14 0");
    rod.setAttribute("position", "0 0.51 0");
    rod.setAttribute("width", "0.20");
    rod.setAttribute("height", "1.02");
    rod.setAttribute("depth", "0.20");
    knob.setAttribute("position", "0 1.02 0");
    knob.setAttribute("radius", "0.25");
  }
}

function registerSolidButtonComponent() {
  if (!window.AFRAME || AFRAME.components["solid-puzzle-button-v3"]) return;
  AFRAME.registerComponent("solid-puzzle-button-v3", {
    schema: {
      control: { type: "selector" },
      leftHand: { type: "selector" },
      rightHand: { type: "selector" },
      travel: { default: 0.115 },
      cooldown: { default: 220 }
    },

    init: function () {
      this.basePosition = this.el.object3D.position.clone();
      this.center = new THREE.Vector3();
      this.handWorld = new THREE.Vector3();
      this.halfSize = { x: 0.41, y: 0.11, z: 0.41 };
      this.lastActivation = -Infinity;
      this.lastExactContact = new Map();
      this.bodyReady = false;
      this.onBodyLoaded = this.onBodyLoaded.bind(this);
      this.onCollide = this.onCollide.bind(this);
      this.onReset = () => {
        this.lastExactContact.clear();
        this.restoreBody(true);
      };
      this.el.addEventListener("body-loaded", this.onBodyLoaded);
      window.addEventListener("course-request-reset", this.onReset);
      if (this.el.body) this.onBodyLoaded();
    },

    remove: function () {
      this.el.removeEventListener("body-loaded", this.onBodyLoaded);
      this.el.body?.removeEventListener?.("collide", this.onCollide);
      window.removeEventListener("course-request-reset", this.onReset);
    },

    onBodyLoaded: function () {
      const body = this.el.body;
      if (!body) return;
      body.removeEventListener?.("collide", this.onCollide);
      body.addEventListener?.("collide", this.onCollide);
      body.allowSleep = false;
      body.linearDamping = 0.92;
      body.angularDamping = 1;
      this.bodyReady = true;
      this.restoreBody(true);
    },

    isHand: function (entity) {
      return entity === this.data.leftHand || entity === this.data.rightHand || isSolidHandEntity(entity);
    },

    onCollide: function (event) {
      const other = bodyOtherEntity(event);
      if (this.isHand(other)) this.activate("solid-button-collision");
    },

    activate: function (source) {
      const component = this.data.control?.components?.["quest-switch"];
      const now = performance.now();
      if (!component || component.active || now - this.lastActivation < Math.max(100, this.data.cooldown)) return false;
      this.lastActivation = now;
      component.activate(now, source);
      return true;
    },

    restoreBody: function (immediate = false) {
      const body = this.el.body;
      if (!body) return;
      const active = Boolean(this.data.control?.components?.["quest-switch"]?.active);
      const targetY = this.basePosition.y - (active ? this.data.travel : 0);
      if (immediate) {
        body.position.set(this.basePosition.x, targetY, this.basePosition.z);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.quaternion.set(0, 0, 0, 1);
      }
      body.aabbNeedsUpdate = true;
      body.wakeUp?.();
    },

    exactContact: function () {
      const body = this.el.body;
      if (!body) return;
      this.center.set(body.position.x, body.position.y, body.position.z);
      for (const hand of [this.data.leftHand, this.data.rightHand]) {
        if (!hand?.object3D) continue;
        worldOf(hand, this.handWorld);
        const touching = sphereBoxContact(this.handWorld, 0.16, this.center, this.halfSize);
        const previous = Boolean(this.lastExactContact.get(hand));
        if (touching && !previous) this.activate("solid-button-shape-contact");
        this.lastExactContact.set(hand, touching);
      }
    },

    tick: function (time, deltaMs) {
      const body = this.el.body;
      if (!this.bodyReady || !body) return;
      this.exactContact();
      const active = Boolean(this.data.control?.components?.["quest-switch"]?.active);
      const targetY = this.basePosition.y - (active ? this.data.travel : 0);
      const dt = Math.min(0.05, Math.max(1 / 240, finiteNumber(deltaMs, 16.67) / 1000));
      const error = targetY - body.position.y;
      body.velocity.x = 0;
      body.velocity.z = 0;
      body.angularVelocity.set(0, 0, 0);
      body.quaternion.set(0, 0, 0, 1);
      body.position.x = this.basePosition.x;
      body.position.z = this.basePosition.z;
      body.position.y = clamp(body.position.y, this.basePosition.y - this.data.travel - 0.018, this.basePosition.y + 0.015);
      body.velocity.y += error * 34 * dt;
      body.velocity.y *= active ? 0.34 : 0.58;
      body.aabbNeedsUpdate = true;

      const press = this.data.control?.querySelector?.("[data-switch-press]");
      if (press?.object3D?.position) {
        const depression = clamp(this.basePosition.y - body.position.y, 0, this.data.travel);
        press.object3D.position.y = 0.16 - depression;
      }
    }
  });
}

function registerSolidLeverComponent() {
  if (!window.AFRAME || AFRAME.components["solid-puzzle-lever-v3"]) return;
  AFRAME.registerComponent("solid-puzzle-lever-v3", {
    schema: {
      control: { type: "selector" },
      anchor: { type: "selector" },
      leftHand: { type: "selector" },
      rightHand: { type: "selector" },
      length: { default: 1.02 },
      rodRadius: { default: 0.17 },
      restAngle: { default: -36 },
      activeAngle: { default: 42 },
      activationAngle: { default: 8 },
      cooldown: { default: 260 }
    },

    init: function () {
      this.pivot = new THREE.Vector3();
      this.rodEnd = new THREE.Vector3();
      this.handWorld = new THREE.Vector3();
      this.bodyReady = false;
      this.anchorReady = false;
      this.constraint = null;
      this.dragHand = null;
      this.lastActivation = -Infinity;
      this.recentHandContactUntil = 0;
      this.onBodyLoaded = this.onBodyLoaded.bind(this);
      this.onAnchorLoaded = this.onAnchorLoaded.bind(this);
      this.onCollide = this.onCollide.bind(this);
      this.onReset = () => {
        this.dragHand = null;
        this.recentHandContactUntil = 0;
        this.resetBody(true);
      };
      this.el.addEventListener("body-loaded", this.onBodyLoaded);
      this.data.anchor?.addEventListener?.("body-loaded", this.onAnchorLoaded);
      window.addEventListener("course-request-reset", this.onReset);
      if (this.el.body) this.onBodyLoaded();
      if (this.data.anchor?.body) this.onAnchorLoaded();
    },

    remove: function () {
      this.el.removeEventListener("body-loaded", this.onBodyLoaded);
      this.data.anchor?.removeEventListener?.("body-loaded", this.onAnchorLoaded);
      this.el.body?.removeEventListener?.("collide", this.onCollide);
      window.removeEventListener("course-request-reset", this.onReset);
      if (this.constraint) physicsWorld(this.el.sceneEl)?.removeConstraint?.(this.constraint);
    },

    onBodyLoaded: function () {
      const body = this.el.body;
      if (!body || !window.CANNON) return;
      body.removeEventListener?.("collide", this.onCollide);
      body.addEventListener?.("collide", this.onCollide);
      body.allowSleep = false;
      body.linearDamping = 0.34;
      body.angularDamping = 0.48;
      if (!body.userData?.solidLeverKnobAdded) {
        body.addShape(new CANNON.Sphere(0.25), new CANNON.Vec3(0, this.data.length * 0.5, 0));
        body.userData = { ...(body.userData || {}), solidLeverKnobAdded: true };
        body.updateMassProperties?.();
      }
      this.bodyReady = true;
      this.tryConstraint();
    },

    onAnchorLoaded: function () {
      this.anchorReady = Boolean(this.data.anchor?.body);
      this.tryConstraint();
    },

    tryConstraint: function () {
      if (this.constraint || !this.bodyReady || !this.anchorReady || !window.CANNON) return;
      const world = physicsWorld(this.el.sceneEl);
      if (!world?.addConstraint) return;
      this.constraint = new CANNON.HingeConstraint(this.data.anchor.body, this.el.body, {
        pivotA: new CANNON.Vec3(0, 0, 0),
        axisA: new CANNON.Vec3(0, 0, 1),
        pivotB: new CANNON.Vec3(0, -this.data.length * 0.5, 0),
        axisB: new CANNON.Vec3(0, 0, 1),
        collideConnected: false,
        maxForce: 7000
      });
      world.addConstraint(this.constraint);
      this.resetBody(true);
    },

    isHand: function (entity) {
      return entity === this.data.leftHand || entity === this.data.rightHand || isSolidHandEntity(entity);
    },

    onCollide: function (event) {
      const other = bodyOtherEntity(event);
      if (!this.isHand(other)) return;
      this.recentHandContactUntil = performance.now() + 340;
      if (!this.dragHand) this.dragHand = other;
    },

    currentAngle: function () {
      return angleFromZQuaternion(this.el.body?.quaternion);
    },

    updateGeometry: function (angle) {
      const anchorBody = this.data.anchor?.body;
      if (!anchorBody) return;
      this.pivot.set(anchorBody.position.x, anchorBody.position.y, anchorBody.position.z);
      this.rodEnd.set(
        this.pivot.x - Math.sin(angle) * this.data.length,
        this.pivot.y + Math.cos(angle) * this.data.length,
        this.pivot.z
      );
    },

    findExactHandContact: function (angle) {
      this.updateGeometry(angle);
      for (const hand of [this.data.leftHand, this.data.rightHand]) {
        if (!hand?.object3D) continue;
        worldOf(hand, this.handWorld);
        if (sphereCapsuleContact(this.handWorld, 0.16, this.pivot, this.rodEnd, this.data.rodRadius)) return hand;
      }
      return null;
    },

    activate: function () {
      const component = this.data.control?.components?.["quest-switch"];
      const now = performance.now();
      if (!component || component.active || now - this.lastActivation < Math.max(120, this.data.cooldown)) return false;
      this.lastActivation = now;
      component.activate(now, "solid-hinged-lever-pull");
      this.dragHand = null;
      return true;
    },

    resetBody: function (immediate = false) {
      const body = this.el.body;
      const anchorBody = this.data.anchor?.body;
      if (!body || !anchorBody) return;
      const active = Boolean(this.data.control?.components?.["quest-switch"]?.active);
      const angle = THREE.MathUtils.degToRad(active ? this.data.activeAngle : this.data.restAngle);
      const centerX = anchorBody.position.x - Math.sin(angle) * this.data.length * 0.5;
      const centerY = anchorBody.position.y + Math.cos(angle) * this.data.length * 0.5;
      if (immediate) {
        body.position.set(centerX, centerY, anchorBody.position.z);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angle);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
      }
      body.aabbNeedsUpdate = true;
      body.wakeUp?.();
    },

    tick: function (time, deltaMs) {
      const body = this.el.body;
      if (!body || !this.constraint) return;
      let angle = this.currentAngle();
      const exactHand = this.findExactHandContact(angle);
      if (!this.dragHand && exactHand) {
        this.dragHand = exactHand;
        this.recentHandContactUntil = performance.now() + 340;
      }

      if (this.dragHand?.object3D) {
        worldOf(this.dragHand, this.handWorld);
        const stillNear = sphereCapsuleContact(this.handWorld, 0.34, this.pivot, this.rodEnd, this.data.rodRadius + 0.24);
        if (!stillNear) {
          this.dragHand = null;
        } else {
          const desired = clamp(leverHandAngle(this.pivot, this.handWorld), THREE.MathUtils.degToRad(-58), THREE.MathUtils.degToRad(58));
          const error = normalizeAngle(desired - angle);
          body.angularVelocity.z = clamp(error * 18, -7.5, 7.5);
          this.recentHandContactUntil = performance.now() + 340;
        }
      }

      angle = this.currentAngle();
      const component = this.data.control?.components?.["quest-switch"];
      const active = Boolean(component?.active);
      if (!active && performance.now() <= this.recentHandContactUntil && angle >= THREE.MathUtils.degToRad(this.data.activationAngle)) {
        this.activate();
      }

      const target = THREE.MathUtils.degToRad(active ? this.data.activeAngle : this.data.restAngle);
      if (!this.dragHand) {
        const dt = Math.min(0.05, Math.max(1 / 240, finiteNumber(deltaMs, 16.67) / 1000));
        const error = normalizeAngle(target - angle);
        body.torque.z += clamp(error * 15 - body.angularVelocity.z * 2.8, -8.5, 8.5) * dt * 60;
      }
      body.position.z = this.data.anchor.body.position.z;
      body.velocity.z = 0;
      body.angularVelocity.x = 0;
      body.angularVelocity.y = 0;
      body.aabbNeedsUpdate = true;

      const handle = this.data.control?.querySelector?.("[data-lever-handle]");
      if (handle?.object3D?.rotation) handle.object3D.rotation.z = angle;
    }
  });
}

function createButtonProxy(control) {
  const press = control.querySelector("[data-switch-press]");
  if (!press || document.getElementById(`${control.id}-solid-button-v3`)) return false;
  const position = new THREE.Vector3();
  worldOf(press, position);
  const proxy = document.createElement("a-box");
  proxy.id = `${control.id}-solid-button-v3`;
  proxy.setAttribute("position", `${position.x} ${position.y} ${position.z}`);
  proxy.setAttribute("width", "0.82");
  proxy.setAttribute("height", "0.22");
  proxy.setAttribute("depth", "0.82");
  proxy.setAttribute("material", "color: #FFFFFF; opacity: 0.001; transparent: true");
  proxy.setAttribute("dynamic-body", "shape: box; mass: 0.42; linearDamping: 0.92; angularDamping: 1; allowSleep: false");
  proxy.setAttribute("solid-puzzle-button-v3", `control: #${control.id}; leftHand: #left-hand; rightHand: #right-hand; travel: 0.115; cooldown: 220`);
  document.getElementById("course-root")?.appendChild(proxy);
  return true;
}

function createLeverProxy(control) {
  const handle = control.querySelector("[data-lever-handle]");
  if (!handle || document.getElementById(`${control.id}-solid-lever-v3`)) return false;
  const pivot = new THREE.Vector3();
  control.object3D.localToWorld(pivot.set(0, 0.14, 0));
  const length = 1.02;
  const restAngle = THREE.MathUtils.degToRad(-36);
  const center = new THREE.Vector3(
    pivot.x - Math.sin(restAngle) * length * 0.5,
    pivot.y + Math.cos(restAngle) * length * 0.5,
    pivot.z
  );

  const anchor = document.createElement("a-sphere");
  anchor.id = `${control.id}-lever-anchor-v3`;
  anchor.setAttribute("position", `${pivot.x} ${pivot.y} ${pivot.z}`);
  anchor.setAttribute("radius", "0.055");
  anchor.setAttribute("material", "color: #FFFFFF; opacity: 0.001; transparent: true");
  anchor.setAttribute("static-body", "shape: sphere; sphereRadius: 0.055");

  const proxy = document.createElement("a-box");
  proxy.id = `${control.id}-solid-lever-v3`;
  proxy.setAttribute("position", `${center.x} ${center.y} ${center.z}`);
  proxy.setAttribute("rotation", `0 0 -36`);
  proxy.setAttribute("width", "0.34");
  proxy.setAttribute("height", String(length));
  proxy.setAttribute("depth", "0.34");
  proxy.setAttribute("material", "color: #FFFFFF; opacity: 0.001; transparent: true");
  proxy.setAttribute("dynamic-body", "shape: box; mass: 0.58; linearDamping: 0.34; angularDamping: 0.48; allowSleep: false");
  proxy.setAttribute("solid-puzzle-lever-v3", `control: #${control.id}; anchor: #${anchor.id}; leftHand: #left-hand; rightHand: #right-hand; length: ${length}; rodRadius: 0.17; restAngle: -36; activeAngle: 42; activationAngle: 8; cooldown: 260`);

  const root = document.getElementById("course-root");
  root?.appendChild(anchor);
  root?.appendChild(proxy);
  return true;
}

export function upgradeSolidControl(control) {
  const component = control?.components?.["quest-switch"];
  if (!control || !component || control.dataset?.solidControlV3 === "true") return false;
  control.dataset.solidControlV3 = "true";
  for (const indicator of Array.from(control.querySelectorAll("[data-switch-indicator]"))) indicator.remove();
  disableLegacyInput(control, component);
  patchControlRendering(control, component);
  return component.data.type === "lever" ? createLeverProxy(control) : createButtonProxy(control);
}

export function upgradeAllSolidControls(documentLike = globalThis.document) {
  let upgraded = 0;
  for (const control of Array.from(documentLike?.querySelectorAll?.("[quest-switch]") || [])) {
    if (upgradeSolidControl(control)) upgraded += 1;
  }
  return upgraded;
}

function registerAll() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  registerSolidButtonComponent();
  registerSolidLeverComponent();
}

registerAll();

function apply() {
  upgradeAllSolidControls();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  window.setTimeout(apply, 260);
  window.setTimeout(apply, 950);
}
