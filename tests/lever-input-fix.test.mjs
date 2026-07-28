import assert from "node:assert/strict";
import fs from "node:fs";
import {
  gamepadTriggerOrGripPressed,
  inferHandedness,
  resolveXRGamepad,
  attachLeverGamepadFallback
} from "../lever-input-fix.js";

const released = { pressed: false, value: 0 };
const pressed = { pressed: true, value: 1 };
const analogPressed = { pressed: false, value: 0.8 };

assert.equal(gamepadTriggerOrGripPressed({ buttons: [pressed, released] }), true, "trigger should activate");
assert.equal(gamepadTriggerOrGripPressed({ buttons: [released, pressed] }), true, "grip should activate");
assert.equal(gamepadTriggerOrGripPressed({ buttons: [released, analogPressed] }), true, "analog squeeze value should activate");
assert.equal(gamepadTriggerOrGripPressed({ buttons: [released, released, pressed] }), false, "unrelated buttons must not activate");
assert.equal(gamepadTriggerOrGripPressed(null), false);

const leftHand = {
  id: "left-hand",
  getAttribute(name) {
    return name === "tracked-controls" ? { hand: "left" } : null;
  }
};
assert.equal(inferHandedness(leftHand), "left");
assert.equal(inferHandedness({ id: "right-hand", getAttribute() { return null; } }), "right");

const directGamepad = { buttons: [pressed, released] };
assert.equal(resolveXRGamepad({ components: { "tracked-controls": { controller: { gamepad: directGamepad } } } }), directGamepad);

const sessionGamepad = { buttons: [released, pressed] };
const sessionHand = {
  id: "right-hand",
  components: {},
  getAttribute() { return null; },
  sceneEl: {
    renderer: {
      xr: {
        getSession() {
          return { inputSources: [{ handedness: "right", gamepad: sessionGamepad }] };
        }
      }
    }
  }
};
assert.equal(resolveXRGamepad(sessionHand), sessionGamepad);

let attachedValue = "";
const lever = {
  hasAttribute() { return false; },
  setAttribute(name, value) {
    assert.equal(name, "quest-lever-gamepad-fallback");
    attachedValue = value;
  }
};
assert.equal(attachLeverGamepadFallback({ getElementById(id) { return id === "hand-lever" ? lever : null; } }), true);
assert.match(attachedValue, /leftHand: #left-hand/);
assert.match(attachedValue, /rightHand: #right-hand/);

const html = fs.readFileSync("interaction-lab.html", "utf8");
const source = fs.readFileSync("lever-input-fix.js", "utf8");
assert.match(html, /lever-input-fix\.js\?build=20260728-lever-input-v2/);
assert.match(source, /selectstart/);
assert.match(source, /squeezestart/);
assert.match(source, /xr-gamepad/);
assert.match(source, /buttons\[index\]/);

console.log("Quest lever Trigger/Grip gamepad polling, WebXR event fallback, handedness resolution, and lab attachment tests passed.");
