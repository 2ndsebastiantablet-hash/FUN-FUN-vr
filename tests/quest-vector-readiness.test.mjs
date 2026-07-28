import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function makeEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
      return true;
    },
    listeners
  };
}

class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const windowTarget = makeEventTarget();
const documentTarget = makeEventTarget();
const sceneTarget = makeEventTarget();
const attributes = new Map();

const rig = {
  object3D: {},
  components: {},
  setAttribute(name, value, third) {
    attributes.set(`${name}:${value}`, third ?? value);
    if (name === "position") attributes.set("position", value);
  }
};

const document = {
  ...documentTarget,
  getElementById(id) {
    if (id === "player-rig") return rig;
    return null;
  },
  querySelector(selector) {
    return selector === "a-scene" ? sceneTarget : null;
  },
  querySelectorAll() {
    return [];
  }
};

const AFRAME = {
  components: {},
  registerComponent(name, definition) {
    this.components[name] = definition;
  }
};

const window = {
  ...windowTarget,
  AFRAME,
  funFunCourseManifest: Object.freeze({
    spawn: Object.freeze({ x: 0, y: 0.32, z: 8 }),
    pieces: []
  }),
  location: { href: "https://example.com/FUN-FUN-vr/" },
  setTimeout(callback) {
    callback();
    return 1;
  }
};

const context = vm.createContext({
  window,
  document,
  AFRAME,
  THREE: { Vector3 },
  CustomEvent,
  URL,
  Math,
  Number,
  Object,
  String,
  WeakSet,
  console
});

assert.doesNotThrow(() => {
  vm.runInContext(fs.readFileSync("comfort-fixes-v3.js", "utf8"), context, {
    filename: "comfort-fixes-v3.js"
  });
}, "v3 runtime should load before the rig position vector exists");

assert.doesNotThrow(() => {
  window.dispatchEvent(new CustomEvent("course-built"));
  document.dispatchEvent(new CustomEvent("DOMContentLoaded"));
  sceneTarget.dispatchEvent(new CustomEvent("loaded"));
}, "course startup should fall back safely while object3D.position is unavailable");

assert.equal(attributes.get("position"), "0 0.12 8");
assert.equal(window.FUN_FUN_COMFORT.deploymentBuild, "20260728-comfort-v3");
assert.ok(AFRAME.components["comfort-grounding"]);

console.log("Quest vector-readiness fallback test passed.");
