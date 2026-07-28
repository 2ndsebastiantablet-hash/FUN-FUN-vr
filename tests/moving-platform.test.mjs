import assert from "node:assert/strict";
import fs from "node:fs";
import {
  pingPongProgress,
  normalizeAxis,
  sampleMovingPlatformPosition,
  bodySupportedByBox,
  carryLocomotionState
} from "../moving-platform.js";

class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  add(vector) {
    this.x += vector.x;
    this.y += vector.y;
    this.z += vector.z;
    return this;
  }
}

assert.equal(pingPongProgress(0, 1000, 0), 0);
assert.equal(pingPongProgress(500, 1000, 0), 0.5);
assert.equal(pingPongProgress(1000, 1000, 0), 1);
assert.equal(pingPongProgress(1500, 1000, 0), 0.5);
assert.equal(pingPongProgress(2000, 1000, 0), 0);
assert.equal(pingPongProgress(0, 1000, 0.5), 1, "half-cycle phase should begin at the far endpoint");

const axis = normalizeAxis({ x: 3, y: 4, z: 0 });
assert.ok(Math.abs(axis.x - 0.6) < 1e-9);
assert.ok(Math.abs(axis.y - 0.8) < 1e-9);
assert.equal(axis.z, 0);
assert.deepEqual(normalizeAxis({ x: 0, y: 0, z: 0 }), { x: 1, y: 0, z: 0 });

const sampled = sampleMovingPlatformPosition({
  basePosition: { x: 2, y: 1, z: -3 },
  axis: { x: 0, y: 1, z: 0 },
  distance: 4,
  duration: 1000,
  phase: 0,
  timeMs: 1000
});
assert.deepEqual(sampled, { x: 2, y: 5, z: -3 });

assert.equal(bodySupportedByBox({
  rigPosition: { x: 0, y: 0.12, z: 0 },
  bodyHeight: 1.2,
  bodyRadius: 0.32,
  boxCenter: { x: 0, y: 0.5, z: 0 },
  boxSize: { x: 4, y: 1, z: 4 }
}), true, "comfort-height body should rest on a one-meter platform");

assert.equal(bodySupportedByBox({
  rigPosition: { x: 3, y: 0.12, z: 0 },
  bodyHeight: 1.2,
  bodyRadius: 0.32,
  boxCenter: { x: 0, y: 0.5, z: 0 },
  boxSize: { x: 4, y: 1, z: 4 }
}), false, "player outside the platform footprint must not be carried");

const locomotion = {
  rig: { position: new Vector3(1, 2, 3) },
  currentLeftWorld: new Vector3(-1, 1, 0),
  currentRightWorld: new Vector3(1, 1, 0),
  currentHeadWorld: new Vector3(0, 2, 0),
  previousLeftWorld: new Vector3(-1, 1, 0),
  previousRightWorld: new Vector3(1, 1, 0),
  leftResolved: new Vector3(-1, 1, 0),
  rightResolved: new Vector3(1, 1, 0),
  velocity: new Vector3(4, 0, -2),
  launchVelocity: new Vector3(4, 0, -2),
  grounded: false
};

assert.equal(carryLocomotionState(locomotion, { x: 0.25, y: 0.1, z: -0.5 }), true);
assert.deepEqual(
  { x: locomotion.rig.position.x, y: locomotion.rig.position.y, z: locomotion.rig.position.z },
  { x: 1.25, y: 2.1, z: 2.5 }
);
assert.deepEqual(
  { x: locomotion.previousLeftWorld.x, y: locomotion.previousLeftWorld.y, z: locomotion.previousLeftWorld.z },
  { x: -0.75, y: 1.1, z: -0.5 },
  "previous controller positions must move with the rig to avoid a fake push"
);
assert.deepEqual(
  { x: locomotion.velocity.x, y: locomotion.velocity.y, z: locomotion.velocity.z },
  { x: 4, y: 0, z: -2 },
  "platform carry must not overwrite intentional locomotion velocity"
);
assert.equal(locomotion.grounded, true);

const labSource = fs.readFileSync("mechanics-lab.js", "utf8");
const labHtml = fs.readFileSync("mechanics-lab.html", "utf8");
assert.equal((labSource.match(/moving: \{/g) || []).length, 3, "lab should define exactly three moving platform tests");
assert.match(labSource, /expectedColliderCount: 18/);
assert.match(labSource, /forward-shuttle/);
assert.match(labSource, /vertical-lift/);
assert.match(labSource, /side-shuttle/);
assert.match(labHtml, /moving-platform mechanics laboratory/i);
assert.match(labHtml, /comfort-fixes\.js/);
assert.match(labHtml, /mechanics-lab\.js/);

console.log("Moving-platform timing, support, carry, and lab structure tests passed.");
