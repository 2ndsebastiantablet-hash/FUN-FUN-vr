import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

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

function customEventClass() {
  return class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
}

{
  const windowTarget = makeEventTarget();
  const sceneTarget = makeEventTarget();
  const documentTarget = makeEventTarget();
  const AFRAME = {
    components: {},
    registerComponent(name, definition) {
      this.components[name] = definition;
    }
  };
  const document = {
    ...documentTarget,
    getElementById() { return null; },
    querySelector(selector) { return selector === "a-scene" ? sceneTarget : null; },
    querySelectorAll() { return []; }
  };
  const window = { ...windowTarget, AFRAME };
  const CustomEvent = customEventClass();
  const context = vm.createContext({
    window,
    document,
    AFRAME,
    THREE: { Vector3 },
    CustomEvent,
    Math,
    Number,
    Object,
    WeakMap,
    WeakSet,
    console,
    setTimeout() { return 1; }
  });

  vm.runInContext(fs.readFileSync("comfort-fixes-v2.js", "utf8"), context, {
    filename: "comfort-fixes-v2.js"
  });

  assert.ok(AFRAME.components["comfort-grounding"], "comfort-grounding component should register");
  assert.equal(window.FUN_FUN_COMFORT.playerHeightOffset, 0.88);
  assert.equal(window.FUN_FUN_COMFORT.rigYFromPlatformBase, 0.12);
  assert.equal(window.FUN_FUN_COMFORT.bodyHeight, 1.2);

  const frozenSpawn = Object.freeze({ x: 0, y: 0.32, z: 8 });
  const resetEvent = new CustomEvent("course-request-reset", {
    detail: { spawn: frozenSpawn }
  });
  window.dispatchEvent(resetEvent);
  assert.equal(frozenSpawn.y, 0.32, "source frozen spawn must remain unchanged");
  assert.notEqual(resetEvent.detail.spawn, frozenSpawn, "event should receive a mutable adjusted clone");
  assert.equal(resetEvent.detail.spawn.y, 0.12, "adjusted clone should use tuned rig height");
  assert.equal(Object.isFrozen(resetEvent.detail.spawn), false, "adjusted spawn clone should remain mutable");

  const collider = {
    components: {
      "locomotion-collider": {
        data: { type: "box", size: { x: 4, y: 1, z: 4 } }
      }
    },
    object3D: {
      getWorldPosition(target) { target.set(0, 0.5, 0); }
    }
  };
  const locomotion = {
    rig: { position: new Vector3(0, 0.12, 0) },
    data: { bodyHeight: 1.2, bodyRadius: 0.32 },
    colliders: [collider],
    velocity: new Vector3(0.2, 0, 0.1),
    launchVelocity: new Vector3(0.2, 0, 0.1),
    frameMovement: { lengthSq() { return 0; } },
    grounded: false
  };
  const definition = AFRAME.components["comfort-grounding"];
  const instance = { el: { components: { "gorilla-locomotion": locomotion } } };
  Object.assign(instance, definition);
  instance.init();
  instance.tock(0, 16);

  assert.equal(locomotion.velocity.x, 0, "small idle X velocity should stop exactly");
  assert.equal(locomotion.velocity.z, 0, "small idle Z velocity should stop exactly");
  assert.equal(locomotion.grounded, true, "supported player should be marked grounded");

  locomotion.velocity.set(3, 0.5, 0);
  instance.tock(16, 16);
  assert.equal(locomotion.velocity.x, 3, "airborne launch momentum should not be braked");
}

{
  const windowTarget = makeEventTarget();
  const documentTarget = makeEventTarget();
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }
  };
  const document = {
    ...documentTarget,
    getElementById() { return null; }
  };
  const window = { ...windowTarget };
  const CustomEvent = customEventClass();
  const context = vm.createContext({
    window,
    document,
    localStorage,
    CustomEvent,
    Number,
    String
  });

  vm.runInContext(fs.readFileSync("run-progression.js", "utf8"), context, {
    filename: "run-progression.js"
  });

  const progression = window.funFunRunPerformance;
  assert.equal(progression.gradeForFalls(0).grade, "S");
  assert.equal(progression.gradeForFalls(1).grade, "A");
  assert.equal(progression.gradeForFalls(2).grade, "B");
  assert.equal(progression.gradeForFalls(4).grade, "C");
  assert.equal(progression.gradeForFalls(5).grade, "CLEAR");

  for (const listener of documentTarget.listeners.get("DOMContentLoaded") || []) listener();
  assert.equal(progression.state.bestFalls, null, "missing storage should not look like a zero-fall best");

  let gradeDetail = null;
  window.addEventListener("run-grade", (event) => { gradeDetail = event.detail; });
  window.dispatchEvent(new CustomEvent("collectibles-ready", { detail: { total: 3, collected: 0 } }));
  window.dispatchEvent(new CustomEvent("course-started"));
  window.dispatchEvent(new CustomEvent("playtest-reset", { detail: { message: "Fall reset — returned to checkpoint" } }));
  window.dispatchEvent(new CustomEvent("playtest-reset", { detail: { message: "Fall reset — returned to checkpoint" } }));
  window.dispatchEvent(new CustomEvent("course-checkpoint", { detail: { index: 1 } }));
  window.dispatchEvent(new CustomEvent("spring-launched"));
  window.dispatchEvent(new CustomEvent("collectible-collected", { detail: { total: 3, collected: 1 } }));
  window.dispatchEvent(new CustomEvent("collectible-collected", { detail: { total: 3, collected: 2 } }));
  window.dispatchEvent(new CustomEvent("collectible-collected", { detail: { total: 3, collected: 3 } }));
  window.dispatchEvent(new CustomEvent("course-finish"));

  assert.equal(gradeDetail.grade, "B");
  assert.equal(gradeDetail.falls, 2);
  assert.equal(gradeDetail.springLaunches, 1);
  assert.equal(gradeDetail.collectibles, 3);
  assert.equal(gradeDetail.collectibleTotal, 3);
  assert.equal(gradeDetail.fullClear, true);
  assert.equal(gradeDetail.newBest, true);
}

console.log("Comfort grounding, frozen-spawn handling, run progression, and full-clear tests passed.");