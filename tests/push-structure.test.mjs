import assert from "node:assert/strict";
import fs from "node:fs";
import {
  calculateWeightedImpulse,
  sphereHandContact,
  boxHandContact,
  pointInsideGoal
} from "../real-physics-objects.js";
import { collisionTwinParts } from "../paired-model-collider.js";
import { PHYSICS_LANE_BOUNDARIES } from "../physics-lane-boundaries.js";

const ballImpulse = calculateWeightedImpulse({
  handVelocity: { x: 3, y: 0.4, z: -2 },
  mass: 2.4,
  impulseScale: 0.34,
  maximumImpulse: 8.5
});
assert.ok(Math.hypot(ballImpulse.x, ballImpulse.y, ballImpulse.z) > 0, "Ball should receive a real impulse");
assert.ok(Math.hypot(ballImpulse.x, ballImpulse.y, ballImpulse.z) <= 8.500001, "Ball impulse should be capped");

const crateImpulse = calculateWeightedImpulse({
  handVelocity: { x: 3, y: 0.4, z: -2 },
  mass: 9,
  impulseScale: 0.12,
  maximumImpulse: 7
});
assert.ok(Math.hypot(crateImpulse.x, crateImpulse.y, crateImpulse.z) <= 7.000001, "Heavy crate impulse should be capped");
assert.notDeepEqual(ballImpulse, crateImpulse, "Different mass and impulse tuning must produce different object response");

assert.equal(sphereHandContact({ x: 0.5, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0.48, 0.13), true);
assert.equal(sphereHandContact({ x: 1.2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0.48, 0.13), false);
assert.equal(boxHandContact({ x: 0.5, y: 0, z: 0 }, { x: 0.45, y: 0.45, z: 0.45 }, 0.13), true);
assert.equal(boxHandContact({ x: 0.8, y: 0, z: 0 }, { x: 0.45, y: 0.45, z: 0.45 }, 0.13), false);
assert.equal(pointInsideGoal({ x: 0.2, y: 1.05, z: 2.75 }, { x: 0, y: 1.05, z: 2.72 }, { x: 1.45, y: 1.7, z: 1.05 }), true);
assert.equal(pointInsideGoal({ x: 1.2, y: 1.05, z: 2.75 }, { x: 0, y: 1.05, z: 2.72 }, { x: 1.45, y: 1.7, z: 1.05 }), false);

const centeredBounds = { center: { x: 0, y: 2, z: -4 }, size: { x: 4, y: 4, z: 0.8 } };
const hoopParts = collisionTwinParts("hoop", centeredBounds);
const archParts = collisionTwinParts("arch", centeredBounds);
const pipeParts = collisionTwinParts("pipe", { center: { x: 0, y: 2, z: -14 }, size: { x: 2.7, y: 2.7, z: 2.7 } });
assert.equal(hoopParts.length, 4, "Hoop twin should use four surrounding solids");
assert.equal(archParts.length, 5, "Arch twin should use pillars, shoulders, and top");
assert.equal(pipeParts.length, 4, "Pipe twin should use floor, ceiling, and side walls");
assert.equal(hoopParts.some((part) => part.name === "full"), false, "Hoop opening must not be filled by a full box");
assert.equal(archParts.some((part) => part.name === "full"), false, "Arch opening must remain traversable");
assert.equal(pipeParts.some((part) => part.name === "full"), false, "Pipe tunnel must remain hollow");
assert.equal(PHYSICS_LANE_BOUNDARIES.length, 5, "Real bodies need five physical lane boundaries");

const physics = fs.readFileSync("real-physics-objects.js", "utf8");
const twins = fs.readFileSync("paired-model-collider.js", "utf8");
const source = fs.readFileSync("structure-lab.js", "utf8");
const html = fs.readFileSync("structure-lab.html", "utf8");
const registry = fs.readFileSync("assets/platformer/registry.js", "utf8");
assert.doesNotMatch(source, /deterministic-pushable/);
assert.doesNotMatch(html, /push-structure-mechanics\.js/);
assert.match(physics, /applyImpulse/);
assert.match(physics, /angularVelocity/);
assert.match(physics, /body\.mass/);
assert.match(twins, /data-collision-twin-proxy/);
assert.match(twins, /static-body/);
assert.match(twins, /locomotion-collider/);
assert.match(source, /mass: 2\.4/);
assert.match(source, /mass: 9/);
assert.match(source, /expectedPairedModels: 5/);
assert.match(source, /expectedPairedProxies: 21/);
assert.match(source, /expectedFinalColliders: 56/);
assert.match(source, /data-visible-model/);
assert.match(source, /data-collision-twin/);
assert.match(registry, /blue\/hoop_blue\.gltf/);
assert.match(registry, /blue\/arch_blue\.gltf/);
assert.match(registry, /blue\/pipe_straight_A_blue\.gltf/);
assert.match(html, /aframe-physics-system@v4\.2\.4/);
assert.match(html, /physics="gravity: -9\.8/);
assert.match(html, /structure-lab\.js\?build=20260729-real-physics-v2/);

console.log("Real weighted bodies, hand impulses, physics goals, and visible/invisible collision-twin tests passed.");
