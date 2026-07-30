import assert from "node:assert/strict";
import fs from "node:fs";
import {
  sphereBoxContact,
  sphereCapsuleContact,
  leverHandAngle,
  normalizeAngle
} from "../creative-puzzle-input-v2.js";
import { relayCountdown } from "../creative-puzzle-logic-v2.js";
import { removeLegacyCargoRails } from "../creative-puzzle-route-v2.js";

assert.equal(
  sphereBoxContact(
    { x: 0.46, y: 1.42, z: 0 },
    0.16,
    { x: 0, y: 1.3, z: 0 },
    { x: 0.41, y: 0.11, z: 0.41 }
  ),
  true,
  "A solid hand sphere touching the button body should count as contact"
);
assert.equal(
  sphereBoxContact(
    { x: 0.9, y: 1.42, z: 0 },
    0.16,
    { x: 0, y: 1.3, z: 0 },
    { x: 0.41, y: 0.11, z: 0.41 }
  ),
  false,
  "A hand beside the button body should not count as contact"
);

assert.equal(
  sphereCapsuleContact(
    { x: 0.1, y: 1.7, z: 0 },
    0.16,
    { x: 0, y: 1.1, z: 0 },
    { x: 0, y: 2.1, z: 0 },
    0.17
  ),
  true,
  "A hand touching the solid lever rod should be captured"
);
assert.equal(
  sphereCapsuleContact(
    { x: 0.8, y: 1.7, z: 0 },
    0.16,
    { x: 0, y: 1.1, z: 0 },
    { x: 0, y: 2.1, z: 0 },
    0.17
  ),
  false,
  "A hand away from the lever rod should not be captured"
);
assert.ok(leverHandAngle({ x: 0, y: 1, z: 0 }, { x: -0.5, y: 1.7, z: 0 }) > 0);
assert.ok(normalizeAngle(Math.PI * 3) <= Math.PI);

const countdown = relayCountdown(2_000, 8_000, 8_000);
assert.equal(countdown.remaining, 6_000);
assert.equal(countdown.seconds, 6);
assert.equal(countdown.progress, 0.75);
assert.equal(relayCountdown(9_000, 8_000, 8_000).progress, 0);

let removed = 0;
const oldRail = {
  tagName: "A-BOX",
  getAttribute(name) {
    if (name === "position") return { x: 1.94, y: 1.28, z: -12.9 };
    if (name === "depth") return "21.5";
    if (name === "width") return "0.16";
    return null;
  },
  remove() { removed += 1; }
};
const unrelated = {
  tagName: "A-BOX",
  getAttribute(name) {
    if (name === "position") return { x: 1.94, y: 1.28, z: -34 };
    if (name === "depth") return "18.5";
    if (name === "width") return "0.16";
    return null;
  },
  remove() { throw new Error("Unrelated relay rail must remain"); }
};
assert.equal(removeLegacyCargoRails({ children: [oldRail, unrelated] }), 1);
assert.equal(removed, 1);

const compatibility = fs.readFileSync("creative-puzzle-input-v2.js", "utf8");
const input = fs.readFileSync("creative-puzzle-input-v3.js", "utf8");
const logic = fs.readFileSync("creative-puzzle-logic-v2.js", "utf8");
const route = fs.readFileSync("creative-puzzle-route-v2.js", "utf8");
const visuals = fs.readFileSync("creative-puzzle-visual-v2.js", "utf8");
const html = fs.readFileSync("creative-puzzle-lab.html", "utf8");
const labs = fs.readFileSync("labs.html", "utf8");

assert.match(compatibility, /creative-puzzle-input-v3\.js/);
assert.match(input, /solid-puzzle-button-v3/);
assert.match(input, /solid-puzzle-lever-v3/);
assert.match(input, /dynamic-body/);
assert.match(input, /CANNON\.HingeConstraint/);
assert.match(input, /CANNON\.Sphere/);
assert.match(input, /solid-button-collision/);
assert.match(input, /solid-button-shape-contact/);
assert.match(input, /solid-hinged-lever-pull/);
assert.match(input, /sphereBoxContact/);
assert.match(input, /sphereCapsuleContact/);
assert.match(input, /#22C55E/);
assert.match(logic, /creative-relay-controller-v2/);
assert.match(logic, /creative-sequence-controller-v2/);
assert.match(logic, /creative-relay-display-v2/);
assert.match(logic, /wrong-first-control/);
assert.match(logic, /expired/);
assert.match(route, /islandX = side \* 12/);
assert.match(route, /moving\.data\.distance = 8\.85/);
assert.match(route, /positions = \[3\.1, 6\.0, 8\.9\]/);
assert.match(route, /height", "6\.5/);
assert.match(route, /removeLegacyCargoRails/);
assert.match(visuals, /COLOR CODE VAULT/);
assert.match(visuals, /amber: "#F59E0B"/);
assert.match(visuals, /cyan: "#06B6D4"/);
assert.match(visuals, /violet: "#A855F7"/);
assert.match(visuals, /\$\{colorName\.toUpperCase\(\)\} BUTTON/);
assert.match(visuals, /data-relay-timer-bar/);
assert.match(visuals, /data-relay-timer-text/);
assert.match(visuals, /removeFloatingIndicators/);
assert.match(html, /creative-puzzle-input-v2\.js\?build=20260729-solid-controls-v3/);
assert.match(html, /creative-puzzle-logic-v2\.js\?build=20260729-solid-controls-v3/);
assert.match(html, /creative-puzzle-route-v2\.js\?build=20260729-solid-controls-v3/);
assert.match(html, /creative-puzzle-visual-v2\.js\?build=20260729-solid-controls-v3/);
assert.match(html, /iterations: 16/);
assert.doesNotMatch(html, /creative-control-tuning\.js/);
assert.doesNotMatch(html, /creative-route-tuning\.js/);
assert.match(labs, /Creative Puzzle Expedition V3/);

console.log("Creative puzzle V3 solid buttons, hinged levers, anti-skip spacing, timer, green feedback, and color-code tests passed.");
