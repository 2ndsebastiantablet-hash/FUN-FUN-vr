import assert from "node:assert/strict";
import fs from "node:fs";
import {
  pointInsideBox,
  bodySupportedByBridgeBox,
  explosionLaunchVector,
  collapsingBridgePhase,
  collapsingBridgeFallOffset
} from "../hazard-pack.js";
import { applyDamageStripTuning } from "../hazard-contact-adjust.js";

assert.equal(pointInsideBox(
  { x: 0.2, y: 0.1, z: 0.3 },
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 1, z: 1 }
), true);
assert.equal(pointInsideBox(
  { x: 1.2, y: 0, z: 0 },
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 1, z: 1 }
), false);

assert.equal(bodySupportedByBridgeBox({
  rigPosition: { x: 0, y: 0.12, z: -16.1 },
  bodyHeight: 1.2,
  bodyRadius: 0.32,
  boxCenter: { x: 0, y: 0.88, z: -16.1 },
  boxSize: { x: 2.8, y: 0.35, z: 1.22 }
}), true);
assert.equal(bodySupportedByBridgeBox({
  rigPosition: { x: 2.2, y: 0.12, z: -16.1 },
  bodyHeight: 1.2,
  bodyRadius: 0.32,
  boxCenter: { x: 0, y: 0.88, z: -16.1 },
  boxSize: { x: 2.8, y: 0.35, z: 1.22 }
}), false);

const launch = explosionLaunchVector({
  origin: { x: 0, y: 1, z: 0 },
  player: { x: 3, y: 1, z: 4 },
  horizontalSpeed: 25,
  upwardSpeed: 12
});
assert.ok(Math.abs(Math.hypot(launch.x, launch.z) - 25) < 1e-9);
assert.equal(launch.y, 12);
assert.ok(launch.x > 0 && launch.z > 0);
const centeredLaunch = explosionLaunchVector({ origin: { x: 0, y: 0, z: 0 }, player: { x: 0, y: 0, z: 0 } });
assert.equal(centeredLaunch.z < 0, true, "centered explosions need a deterministic fallback direction");

assert.equal(collapsingBridgePhase(0, 260, 480, 2100), "warning");
assert.equal(collapsingBridgePhase(259, 260, 480, 2100), "warning");
assert.equal(collapsingBridgePhase(260, 260, 480, 2100), "falling");
assert.equal(collapsingBridgePhase(739, 260, 480, 2100), "falling");
assert.equal(collapsingBridgePhase(740, 260, 480, 2100), "hidden");
assert.equal(collapsingBridgePhase(2840, 260, 480, 2100), "reset");
assert.equal(collapsingBridgeFallOffset(0, 11, 480), 0);
assert.equal(collapsingBridgeFallOffset(480, 11, 480), 11);
assert.ok(collapsingBridgeFallOffset(240, 11, 480) < 5.5, "bridge fall should accelerate cubically");

const spikePositions = [];
const hazardMock = {
  dataset: {},
  attributes: {},
  setAttribute(name, property, value) {
    if (value === undefined) this.attributes[name] = property;
    else this.attributes[`${name}.${property}`] = value;
  },
  querySelector() {
    return { setAttribute(name, value) { spikePositions.push([name, value]); } };
  },
  querySelectorAll() {
    return [{
      getAttribute() { return { x: -1.35, y: 0.24, z: 0 }; },
      setAttribute(name, value) { spikePositions.push([name, value]); }
    }];
  }
};
assert.equal(applyDamageStripTuning({ getElementById() { return hazardMock; } }), true);
assert.equal(hazardMock.attributes.position, "0 0.45 3.8");
assert.equal(hazardMock.attributes["damage-volume.size"], "3.5 1.2 0.9");
assert.equal(applyDamageStripTuning({ getElementById() { return hazardMock; } }), false, "tuning should be idempotent");

const mechanic = fs.readFileSync("hazard-pack.js", "utf8");
const lab = fs.readFileSync("hazard-lab.js", "utf8");
const html = fs.readFileSync("hazard-lab.html", "utf8");
assert.match(mechanic, /AFRAME\.registerComponent\("damage-volume"/);
assert.match(mechanic, /AFRAME\.registerComponent\("explosive-launch-hazard"/);
assert.match(mechanic, /AFRAME\.registerComponent\("collapsing-bridge-piece"/);
assert.match(mechanic, /AFRAME\.registerComponent\("respawn-flash"/);
assert.match(lab, /expectedColliderCount: 22/);
assert.match(lab, /bridgePieces: 6/);
assert.match(lab, /horizontalSpeed: 24/);
assert.match(lab, /upwardSpeed: 12/);
assert.equal((lab.match(/data-bridge-piece/g) || []).length >= 1, true);
assert.match(html, /Hazard Batch Lab/);
assert.match(html, /respawn-flash-v2/);
assert.match(html, /hazard-retune-v2\.js/);
assert.doesNotMatch(html, /hazard-contact-adjust\.js/);

console.log("Damage volume, bomb launch, bridge collapse, respawn feedback, legacy tuning, and retuned hazard lab structure tests passed.");
