import assert from "node:assert/strict";
import fs from "node:fs";
import { cappedVector, trackedVelocity, removeScriptedPushers } from "../solid-physics-hands.js";
import { pointInsideHorizontalBox, weightInsidePlate, doorStep } from "../physics-interactions.js";

const capped = cappedVector({ x: 30, y: 0, z: 0 }, 12);
assert.ok(Math.abs(capped.x - 12) < 1e-6, "Hand velocity must be capped for Quest stability");
const velocity = trackedVelocity({ x: 0.2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0.02, 12);
assert.ok(velocity.x > 0 && velocity.x <= 12, "Tracked motion should become a bounded kinematic velocity");

let removed = 0;
const mockDocument = {
  querySelectorAll() {
    return [
      { removeAttribute(name) { if (name === "real-physics-hand-pusher") removed += 1; } },
      { removeAttribute(name) { if (name === "real-physics-hand-pusher") removed += 1; } }
    ];
  }
};
assert.equal(removeScriptedPushers(mockDocument), 2);
assert.equal(removed, 2, "The scripted pusher path must be removed from both physics objects");

const center = { x: 0, y: 1.1, z: 0 };
const size = { x: 1.75, y: 0.45, z: 1.5 };
assert.equal(pointInsideHorizontalBox({ x: 0.4, y: 1.48, z: 0.3 }, center, size, 1.25), true);
assert.equal(pointInsideHorizontalBox({ x: 1.2, y: 1.48, z: 0.3 }, center, size, 1.25), false);
const orb = { mass: 2.5, position: { x: 0, y: 1.42, z: 0 } };
const block = { mass: 7.5, position: { x: 0.2, y: 1.48, z: 0.1 } };
assert.equal(weightInsidePlate([orb], center, size, 1.25), 2.5);
assert.equal(weightInsidePlate([block], center, size, 1.25), 7.5);
assert.equal(weightInsidePlate([orb, block], center, size, 1.25), 10);
assert.equal(doorStep(2, 6, 3, 0.5), 3.5);
assert.equal(doorStep(5.8, 6, 3, 0.5), 6);

const solidHands = fs.readFileSync("solid-physics-hands.js", "utf8");
const interactions = fs.readFileSync("physics-interactions.js", "utf8");
const structureHtml = fs.readFileSync("structure-lab.html", "utf8");
const interactionHtml = fs.readFileSync("physics-interaction-lab.html", "utf8");
const interactionLab = fs.readFileSync("physics-interaction-lab.js", "utf8");
const boundaries = fs.readFileSync("physics-interaction-boundaries.js", "utf8");
const labs = fs.readFileSync("labs.html", "utf8");

assert.match(solidHands, /CANNON\.Body\.KINEMATIC/);
assert.match(solidHands, /solid-hand-contact/);
assert.match(solidHands, /removeScriptedPushers/);
assert.match(structureHtml, /static-body="shape: sphere; sphereRadius: 0\.16"/);
assert.match(structureHtml, /solid-physics-hand="hand: left/);
assert.match(structureHtml, /solid-physics-hand="hand: right/);
assert.match(interactions, /CANNON\.LockConstraint/);
assert.match(interactions, /weighted-pressure-plate/);
assert.match(interactions, /physics-door/);
assert.match(interactionLab, /minimumMass: 6/);
assert.match(interactionLab, /minimumMass: 9\.5/);
assert.match(interactionLab, /data-physics-weight/);
assert.match(boundaries, /interaction-start-boundary/);
assert.match(boundaries, /interaction-finish-boundary/);
assert.match(interactionHtml, /physics-interaction-boundaries\.js/);
assert.match(interactionHtml, /PUSH • GRAB • CARRY • WEIGH • OPEN/);
assert.match(labs, /Grab, Weight &amp; Door Batch/);

console.log("Solid kinematic hands, real contact, grabbing, weighted plates, and physics doors tests passed.");
