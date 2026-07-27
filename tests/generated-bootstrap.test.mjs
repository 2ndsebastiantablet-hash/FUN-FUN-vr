import assert from "node:assert/strict";

class EventHub {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== handler));
  }
  dispatchEvent(event) {
    for (const handler of this.listeners.get(event.type) || []) handler.call(this, event);
    return true;
  }
}

class Position {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = Number(x); this.y = Number(y); this.z = Number(z); return this; }
  copy(other) { return this.set(other.x, other.y, other.z); }
}

class Entity extends EventHub {
  constructor(tagName, document) {
    super();
    this.tagName = tagName;
    this.document = document;
    this.children = [];
    this.attributes = new Map();
    this.components = {};
    this.object3D = {
      position: new Position(),
      getWorldPosition: (target) => target.copy(this.object3D.position)
    };
    this.dataset = {};
    this.sceneEl = document.scene;
    this.parentElement = null;
    this.textContent = "";
    this.value = "";
    this.disabled = false;
  }
  set id(value) { this._id = value; if (value) this.document.ids.set(value, this); }
  get id() { return this._id || ""; }
  setAttribute(name, value) {
    this.attributes.set(name, value === undefined ? "" : value);
    if (name === "position") {
      const values = String(value).trim().split(/\s+/).map(Number);
      if (values.length === 3 && values.every(Number.isFinite)) this.object3D.position.set(...values);
    }
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = String(value);
    }
  }
  appendChild(child) {
    child.parentElement = this;
    child.sceneEl = this.sceneEl;
    this.children.push(child);
    return child;
  }
  querySelectorAll(selector) { return queryAll(this, selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  removeAttribute(name) { this.attributes.delete(name); }
}

function matches(entity, selector) {
  if (selector.startsWith("[")) {
    const body = selector.slice(1, -1);
    const [attribute, rawExpected] = body.split("=");
    if (!entity.attributes.has(attribute)) return false;
    if (rawExpected === undefined) return true;
    return String(entity.attributes.get(attribute)) === rawExpected.replace(/^['"]|['"]$/g, "");
  }
  return selector.startsWith("#") && entity.id === selector.slice(1);
}

function queryAll(root, selector) {
  const result = [];
  const visit = (node) => {
    for (const child of node.children || []) {
      if (matches(child, selector)) result.push(child);
      visit(child);
    }
  };
  visit(root);
  return result;
}

class FakeDocument extends EventHub {
  constructor() {
    super();
    this.ids = new Map();
    this.readyState = "complete";
    this.scene = new Entity("a-scene", this);
    this.scene.sceneEl = this.scene;
    this.scene.hasLoaded = true;
    this.body = new Entity("body", this);
    this.body.appendChild(this.scene);
  }
  createElement(tag) { return new Entity(tag, this); }
  getElementById(id) { return this.ids.get(id) || null; }
  querySelector(selector) { return selector === "a-scene" ? this.scene : this.body.querySelector(selector); }
  querySelectorAll(selector) { return this.body.querySelectorAll(selector); }
}

const document = new FakeDocument();
const windowHub = new EventHub();
const windowObject = Object.assign(windowHub, {
  document,
  requestAnimationFrame() { return 1; },
  setTimeout,
  clearTimeout,
  dispatchEvent: windowHub.dispatchEvent.bind(windowHub),
  addEventListener: windowHub.addEventListener.bind(windowHub),
  removeEventListener: windowHub.removeEventListener.bind(windowHub)
});

function addElement(id, tag = "div", parent = document.body) {
  const entity = document.createElement(tag);
  entity.id = id;
  parent.appendChild(entity);
  return entity;
}

const rig = addElement("player-rig", "a-entity", document.scene);
rig.components["gorilla-locomotion"] = { colliders: [] };
const root = addElement("course-root", "a-entity", document.scene);
root.sceneEl = document.scene;
for (const id of [
  "course-status", "course-details", "restart-course", "course-title", "course-description",
  "course-heading-world", "course-subtitle-world", "course-mode", "course-seed",
  "load-course", "random-seed", "copy-course-link"
]) addElement(id);

globalThis.window = windowObject;
globalThis.document = document;
globalThis.location = {
  href: "https://example.com/FUN-FUN-vr/generated.html?mode=generated&seed=BOOTTEST",
  pathname: "/FUN-FUN-vr/generated.html",
  search: "?mode=generated&seed=BOOTTEST",
  assign() {},
  replace() {}
};
Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
};
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
globalThis.performance = { now() { return 1000; } };
globalThis.AFRAME = {
  components: {},
  registerComponent(name, definition) { this.components[name] = definition; }
};
windowObject.AFRAME = globalThis.AFRAME;
globalThis.THREE = { Vector3: class Vector3 extends Position {} };

await import(`../generated-course.js?bootstrap=${Date.now()}`);

const manifest = windowObject.funFunCourseManifest;
assert.equal(manifest.mode, "generated");
assert.equal(manifest.seed, "BOOTTEST");
assert.equal(manifest.expectedColliderCount, 18);
assert.equal(root.querySelectorAll("[data-course-piece]").length, manifest.pieces.length);
assert.equal(root.querySelectorAll("[locomotion-collider]").length, 18);
assert.equal(root.querySelectorAll("[course-checkpoint-trigger]").length, 2);
assert.equal(root.querySelectorAll("[spring-launcher]").length, 1);
assert.equal(root.querySelectorAll("[course-finish-trigger]").length, 1);
assert.ok(AFRAME.components["platformer-surface-extension"]);
assert.ok(AFRAME.components["spring-launcher"]);
assert.ok(windowObject.funFunCourse);
assert.equal(windowObject.funFunCourse.manifest, manifest);
assert.deepEqual(
  [rig.object3D.position.x, rig.object3D.position.y, rig.object3D.position.z],
  [manifest.spawn.x, manifest.spawn.y, manifest.spawn.z]
);

console.log(`Generated browser bootstrap created ${manifest.pieces.length} pieces and ${manifest.expectedColliderCount} colliders for ${manifest.seed}.`);
