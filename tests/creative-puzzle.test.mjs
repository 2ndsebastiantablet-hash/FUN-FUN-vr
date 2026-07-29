import assert from "node:assert/strict";
import fs from "node:fs";
import {
  generateCreativePuzzlePlan,
  normalizeCreativeSeed,
  validateCreativePuzzlePlan
} from "../creative-puzzle-plan.js";
import {
  allPadsSatisfied,
  relayAdvance,
  sequenceAdvance
} from "../creative-puzzle-systems.js";

assert.equal(normalizeCreativeSeed(" puzzle 01! "), "PUZZLE01");

const planA = generateCreativePuzzlePlan("PUZZLE01");
const planB = generateCreativePuzzlePlan("PUZZLE01");
assert.deepEqual(planA, planB, "The same seed must reproduce the same puzzle plan");
assert.equal(validateCreativePuzzlePlan(planA).valid, true);
assert.equal(planA.cargo.reduce((sum, item) => sum + item.mass, 0), 20);
assert.equal(planA.weightThreshold, 14);
assert.equal(new Set(planA.cargo.map((item) => item.route)).size, 4);

const seenSequences = new Set();
const seenRelayOrders = new Set();
const seenCargoAssignments = new Set();
for (let index = 0; index < 2000; index += 1) {
  const plan = generateCreativePuzzlePlan(`CREATIVE${index}`);
  const validation = validateCreativePuzzlePlan(plan);
  assert.equal(validation.valid, true, validation.errors.join("; "));
  seenSequences.add(plan.sequence.join("-"));
  seenRelayOrders.add(`${plan.relayFirst}>${plan.relaySecond}`);
  seenCargoAssignments.add(plan.cargo.map((item) => `${item.mass}:${item.route}:${item.side}`).join("|"));
  assert.equal(plan.cargo.some((item) => item.mass === 8), true);
  assert.equal(plan.cargo.some((item) => item.mass === 6), true);
  assert.equal(plan.cargo.some((item) => item.mass === 4), true);
  assert.equal(plan.cargo.some((item) => item.mass === 2), true);
}
assert.ok(seenSequences.size >= 6, "All seeded control orders should appear");
assert.equal(seenRelayOrders.size, 2, "Both relay directions should appear");
assert.ok(seenCargoAssignments.size > 100, "Cargo route assignment should vary meaningfully");

const pads = new Map([["left", true], ["center", true], ["right", false]]);
assert.equal(allPadsSatisfied(["left", "center", "right"], pads), false);
pads.set("right", true);
assert.equal(allPadsSatisfied(["left", "center", "right"], pads), true);

assert.deepEqual(sequenceAdvance(["amber", "cyan", "violet"], 0, "amber"), { progress: 1, complete: false, reset: false });
assert.deepEqual(sequenceAdvance(["amber", "cyan", "violet"], 1, "violet"), { progress: 0, complete: false, reset: true });
assert.deepEqual(sequenceAdvance(["amber", "cyan", "violet"], 2, "violet"), { progress: 3, complete: true, reset: false });

let relay = relayAdvance({ firstId: "relay-button", secondId: "relay-lever", state: "idle", inputId: "relay-button", now: 1000, windowMs: 7000 });
assert.equal(relay.state, "armed");
assert.equal(relay.expiresAt, 8000);
relay = relayAdvance({ firstId: "relay-button", secondId: "relay-lever", state: relay.state, inputId: "relay-lever", now: 6200, expiresAt: relay.expiresAt, windowMs: 7000 });
assert.equal(relay.success, true);
assert.equal(relay.state, "complete");
const expired = relayAdvance({ firstId: "relay-button", secondId: "relay-lever", state: "armed", inputId: "relay-lever", now: 9001, expiresAt: 8000, windowMs: 7000 });
assert.equal(expired.reset, true);
assert.equal(expired.state, "idle");

const html = fs.readFileSync("creative-puzzle-lab.html", "utf8");
const lab = fs.readFileSync("creative-puzzle-lab.js", "utf8");
const systems = fs.readFileSync("creative-puzzle-systems.js", "utf8");
const hub = fs.readFileSync("labs.html", "utf8");
assert.match(html, /Creative Puzzle Expedition/);
assert.match(html, /aframe-physics-system@v4\.2\.4/);
assert.match(html, /solid-physics-hand="hand: left/);
assert.match(lab, /TRIPLE LOCK/);
assert.match(lab, /CARGO VAULT — NEED 14 KG/);
assert.match(lab, /TIMED RELAY/);
assert.match(lab, /SEQUENCE CODE/);
assert.match(lab, /minimumMass: \$\{plan\.weightThreshold\}/);
assert.match(lab, /data-room1-weight/);
assert.match(lab, /data-cargo-weight/);
assert.match(lab, /moving-platform/);
assert.match(lab, /timed-platform/);
assert.match(lab, /falling-platform/);
assert.match(systems, /creative-multi-lock/);
assert.match(systems, /creative-relay-controller/);
assert.match(systems, /creative-sequence-controller/);
assert.match(systems, /latchOnComplete/);
assert.match(hub, /Creative Puzzle Expedition/);

console.log("Creative multi-lock, cargo combinations, timed relay, sequence puzzle, and 2,000 seeded plans passed.");
