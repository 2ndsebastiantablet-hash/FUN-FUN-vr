import assert from "node:assert/strict";
import fs from "node:fs";
import {
  pointWithinRadius,
  pressureButtonPressed,
  nextToggleState,
  gateTravelPosition
} from "../interaction-switch.js";

assert.equal(pointWithinRadius({ x: 0.2, y: 0, z: 0.2 }, { x: 0, y: 0, z: 0 }, 0.5), true);
assert.equal(pointWithinRadius({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0.5), false);

assert.equal(pressureButtonPressed({
  rigPosition: { x: 0.3, y: 0.12, z: 0.2 },
  center: { x: 0, y: 0.12, z: 0 },
  radius: 0.9,
  maxHeight: 0.55
}), true);
assert.equal(pressureButtonPressed({
  rigPosition: { x: 1.4, y: 0.12, z: 0 },
  center: { x: 0, y: 0.12, z: 0 },
  radius: 0.9,
  maxHeight: 0.55
}), false);

assert.equal(nextToggleState(false, "toggle"), true);
assert.equal(nextToggleState(true, "toggle"), false);
assert.equal(nextToggleState(false, "momentary"), true);

assert.equal(gateTravelPosition({ closed: 1.8, open: 6.6, progress: 0 }), 1.8);
assert.equal(gateTravelPosition({ closed: 1.8, open: 6.6, progress: 1 }), 6.6);
const halfway = gateTravelPosition({ closed: 1.8, open: 6.6, progress: 0.5 });
assert.ok(halfway > 1.8 && halfway < 6.6);

const html = fs.readFileSync("interaction-lab.html", "utf8");
const source = fs.readFileSync("interaction-lab.js", "utf8");
const mechanic = fs.readFileSync("interaction-switch.js", "utf8");
assert.match(html, /Button and Lever Lab/);
assert.match(html, /interaction-lab\.js/);
assert.match(source, /floor-button/);
assert.match(source, /hand-lever/);
assert.match(source, /button-gate/);
assert.match(source, /lever-gate/);
assert.match(source, /expectedColliderCount: 14/);
assert.match(mechanic, /triggerdown/);
assert.match(mechanic, /gripdown/);
assert.match(mechanic, /pressureButtonPressed/);

console.log("Button proximity, pressure activation, lever toggling, gate travel, and interaction lab structure tests passed.");
