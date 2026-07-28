import assert from "node:assert/strict";
import fs from "node:fs";
import {
  calculateHandPushVelocity,
  applyPlanarFriction,
  pointInsideGoal,
  steppedSlopeDefinitions
} from "../push-structure-mechanics.js";
import { elevatedStepHeight } from "../structure-slope-base.js";

const activePush = calculateHandPushVelocity({
  handCurrent: { x: 0.2, z: 0.1 },
  handPrevious: { x: 0, z: 0 },
  objectPosition: { x: 0.25, z: 0.12 },
  interactionRadius: 0.82,
  deltaSeconds: 0.05,
  strength: 1,
  maximumSpeed: 4.4
});
assert.equal(activePush.active, true);
assert.ok(Math.hypot(activePush.x, activePush.z) <= 4.400001, "Push speed should be capped");

const distantPush = calculateHandPushVelocity({
  handCurrent: { x: 4, z: 4 },
  handPrevious: { x: 3.8, z: 4 },
  objectPosition: { x: 0, z: 0 },
  interactionRadius: 0.82,
  deltaSeconds: 0.05
});
assert.deepEqual(distantPush, { x: 0, z: 0, active: false });

const slowed = applyPlanarFriction({ x: 4, z: -2 }, 4.2, 0.1);
assert.ok(Math.abs(slowed.x) < 4 && Math.abs(slowed.z) < 2, "Friction should reduce planar velocity");
assert.equal(pointInsideGoal({ x: 0.2, y: 1.45, z: 2.8 }, { x: 0, y: 1.45, z: 2.75 }, { x: 1.5, y: 1.7, z: 1.15 }), true);
assert.equal(pointInsideGoal({ x: 1.2, y: 1.45, z: 2.8 }, { x: 0, y: 1.45, z: 2.75 }, { x: 1.5, y: 1.7, z: 1.15 }), false);

const steps = steppedSlopeDefinitions({ steps: 5, startZ: -23.05, stepDepth: 0.72, risePerStep: 0.24 });
assert.equal(steps.length, 5);
assert.ok(steps.every((step, index) => step.size.y > 0 && (index === 0 || step.size.y > steps[index - 1].size.y)));
assert.ok(steps[4].position.z < steps[0].position.z);
assert.equal(elevatedStepHeight(0, 1, 0.24), 1.24);
assert.equal(elevatedStepHeight(4, 1, 0.24), 2.2);

const mechanic = fs.readFileSync("push-structure-mechanics.js", "utf8");
const slopePatch = fs.readFileSync("structure-slope-base.js", "utf8");
const source = fs.readFileSync("structure-lab.js", "utf8");
const html = fs.readFileSync("structure-lab.html", "utf8");
assert.match(mechanic, /deterministic-pushable/);
assert.match(mechanic, /push-object-goal/);
assert.match(slopePatch, /baseHeight = 1/);
assert.match(slopePatch, /slope-step-/);
assert.match(source, /expectedColliderCount: 40/);
assert.match(source, /pushableCount: 2/);
assert.match(source, /goalCount: 2/);
assert.match(source, /pipe-tunnel/);
assert.match(source, /narrow-beam/);
assert.match(source, /slope-step/);
assert.match(source, /push-ball/);
assert.match(source, /push-crate/);
assert.match(html, /Push &amp; Structure Lab/);
assert.match(html, /structure-slope-base\.js\?build=20260728-structure-push-v1/);
assert.match(html, /structure-lab\.js\?build=20260728-structure-push-v1/);

console.log("Deterministic pushing, goal detection, elevated slope alignment, and structure lab coverage tests passed.");
