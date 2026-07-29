import assert from "node:assert/strict";
import fs from "node:fs";
import { buttonHandContact, leverPullReached } from "../creative-puzzle-input-v2.js";
import { relayCountdown } from "../creative-puzzle-logic-v2.js";
import { removeLegacyCargoRails } from "../creative-puzzle-route-v2.js";

assert.equal(
  buttonHandContact({ x: 0.1, y: 1.42, z: 0.1 }, { x: 0, y: 1.3, z: 0 }, 0.48, 0.3),
  true,
  "A hand physically touching the button cap should count as a press"
);
assert.equal(
  buttonHandContact({ x: 0.9, y: 1.42, z: 0 }, { x: 0, y: 1.3, z: 0 }, 0.48, 0.3),
  false,
  "A hand beside the button should not press it"
);
assert.equal(
  leverPullReached({ x: 0, y: 2, z: 0 }, { x: 0, y: 1.7, z: 0 }, 0.24),
  true,
  "A direct downward hand pull should activate a lever"
);
assert.equal(
  leverPullReached({ x: 0, y: 2, z: 0 }, { x: 0.05, y: 1.96, z: 0.04 }, 0.24),
  false,
  "Small contact jitter should not activate a lever"
);

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

const input = fs.readFileSync("creative-puzzle-input-v2.js", "utf8");
const logic = fs.readFileSync("creative-puzzle-logic-v2.js", "utf8");
const route = fs.readFileSync("creative-puzzle-route-v2.js", "utf8");
const visuals = fs.readFileSync("creative-puzzle-visual-v2.js", "utf8");
const html = fs.readFileSync("creative-puzzle-lab.html", "utf8");
const labs = fs.readFileSync("labs.html", "utf8");

assert.match(input, /physical-puzzle-input-v2/);
assert.match(input, /physical-button-press/);
assert.match(input, /physical-lever-pull/);
assert.match(input, /data-switch-indicator/);
assert.match(input, /#22C55E/);
assert.match(logic, /creative-relay-controller-v2/);
assert.match(logic, /creative-sequence-controller-v2/);
assert.match(logic, /creative-relay-display-v2/);
assert.match(logic, /wrong-first-control/);
assert.match(logic, /expired/);
assert.match(route, /islandX = side \* 12/);
assert.match(route, /moving\.data\.distance = 8\.85/);
assert.match(route, /positions = \[3\.1, 6\.0, 8\.9\]/);
assert.match(route, /height\", \"6\.5/);
assert.match(route, /removeLegacyCargoRails/);
assert.match(visuals, /COLOR CODE VAULT/);
assert.match(visuals, /AMBER BUTTON/);
assert.match(visuals, /CYAN BUTTON/);
assert.match(visuals, /VIOLET BUTTON/);
assert.match(visuals, /data-relay-timer-bar/);
assert.match(visuals, /data-relay-timer-text/);
assert.match(visuals, /removeFloatingIndicators/);
assert.match(html, /creative-puzzle-input-v2\.js\?build=20260729-creative-puzzle-v2/);
assert.match(html, /creative-puzzle-logic-v2\.js\?build=20260729-creative-puzzle-v2/);
assert.match(html, /creative-puzzle-route-v2\.js\?build=20260729-creative-puzzle-v2/);
assert.match(html, /creative-puzzle-visual-v2\.js\?build=20260729-creative-puzzle-v2/);
assert.doesNotMatch(html, /creative-control-tuning\.js/);
assert.doesNotMatch(html, /creative-route-tuning\.js/);
assert.match(labs, /Creative Puzzle Expedition V2/);

console.log("Creative puzzle V2 physical controls, anti-skip spacing, timer, green feedback, and color-code clarity tests passed.");
