import assert from "node:assert/strict";
import fs from "node:fs";
import {
  rotatingAngleDegrees,
  worldPointToBarLocal,
  capsuleTouchesRotatingBars,
  tangentialKnockback,
  applyRotatingObstacleKnockback
} from "../rotating-obstacle.js";

assert.equal(rotatingAngleDegrees(0, 45, 0), 0);
assert.equal(rotatingAngleDegrees(1000, 45, 0), 45);
assert.equal(rotatingAngleDegrees(2000, -45, 0), 270);
assert.equal(rotatingAngleDegrees(1000, 30, 15), 45);

const localAtZero = worldPointToBarLocal(
  { x: 1, y: 2, z: 0 },
  { x: 0, y: 1, z: 0 },
  0
);
assert.deepEqual(localAtZero, { x: 1, y: 1, z: 0 });

const localAtNinety = worldPointToBarLocal(
  { x: 0, y: 1.4, z: -1 },
  { x: 0, y: 1.4, z: 0 },
  90
);
assert.ok(Math.abs(localAtNinety.x - 1) < 1e-9, "90-degree bar should align with negative world Z");
assert.ok(Math.abs(localAtNinety.z) < 1e-9);

const commonContact = {
  rigPosition: { x: 1, y: 0.12, z: 0 },
  bodyHeight: 1.2,
  bodyRadius: 0.32,
  center: { x: 0, y: 1.42, z: 0 },
  angleDegrees: 0,
  barCount: 1,
  barLength: 4.55,
  barWidth: 0.3,
  barHeight: 0.28
};
assert.equal(capsuleTouchesRotatingBars(commonContact).hit, true, "player body should touch the aligned sweeper");
assert.equal(capsuleTouchesRotatingBars({ ...commonContact, rigPosition: { x: 0, y: 0.12, z: 2 } }).hit, false, "player outside bar width must not be hit");
assert.equal(capsuleTouchesRotatingBars({ ...commonContact, rigPosition: { x: 0, y: 2.5, z: 0 } }).hit, false, "player above the sweeper must not be hit");

const twinContact = capsuleTouchesRotatingBars({
  ...commonContact,
  rigPosition: { x: 0, y: 0.12, z: 1 },
  barCount: 2
});
assert.equal(twinContact.hit, true, "second crossbar should detect a perpendicular contact");
assert.equal(twinContact.barIndex, 1);

const impulse = tangentialKnockback({
  angleDegrees: 0,
  localX: 1,
  degreesPerSecond: 45,
  horizontalSpeed: 4.6,
  upwardSpeed: 2.2
});
assert.ok(Math.abs(impulse.x) < 1e-9);
assert.equal(impulse.y, 2.2);
assert.equal(impulse.z, -4.6);

const locomotion = {
  velocity: { x: 0, y: -1, z: 0 },
  launchVelocity: { x: 0, y: 0, z: 0 },
  pushHistory: [1, 2],
  grounded: true,
  wasTouchingSurface: true,
  wasTouchingFloor: true,
  wasTwoHandTouchingFloor: true
};
assert.equal(applyRotatingObstacleKnockback(locomotion, impulse), true);
assert.deepEqual(locomotion.velocity, { x: 0, y: 2.2, z: -4.6 });
assert.deepEqual(locomotion.launchVelocity, { x: 0, y: 2.2, z: -4.6 });
assert.deepEqual(locomotion.pushHistory, []);
assert.equal(locomotion.grounded, false);
assert.equal(locomotion.wasTouchingFloor, false);

const rotatingSource = fs.readFileSync("rotating-lab.js", "utf8");
const rotatingHtml = fs.readFileSync("rotating-lab.html", "utf8");
const movingHtml = fs.readFileSync("mechanics-lab.html", "utf8");
const tuningSource = fs.readFileSync("lab-collision-tuning.js", "utf8");

assert.equal((rotatingSource.match(/rotating: \{/g) || []).length, 3, "lab should define exactly three rotating obstacle tests");
assert.match(rotatingSource, /expectedColliderCount: 16/);
assert.match(rotatingSource, /expectedRotatorCount: 3/);
assert.match(rotatingSource, /slow-sweeper-arena/);
assert.match(rotatingSource, /twin-spinner-arena/);
assert.match(rotatingSource, /reverse-sweeper-arena/);
assert.match(rotatingHtml, /rotating-obstacle mechanics laboratory/i);
assert.match(rotatingHtml, /rotating-lab\.js/);
assert.match(movingHtml, /lab-collision-tuning\.js/);
assert.match(movingHtml, /rotating-lab\.html/);
assert.match(tuningSource, /size: \[3\.92, 1, 1\.94\]/);
assert.match(tuningSource, /size: \[2\.54, 0\.65, 1\.26\]/);

console.log("Rotating-obstacle timing, contact, knockback, lab structure, and collider tuning tests passed.");
