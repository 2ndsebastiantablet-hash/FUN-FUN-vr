import assert from "node:assert/strict";
import fs from "node:fs";
import { timedPlatformCycle, timedPlatformOpacity } from "../timed-platform.js";

const timing = { solidDuration: 1000, warningDuration: 200, hiddenDuration: 800, phase: 0 };
assert.equal(timedPlatformCycle({ ...timing, timeMs: 0 }).state, "solid");
assert.equal(timedPlatformCycle({ ...timing, timeMs: 999 }).state, "solid");
assert.equal(timedPlatformCycle({ ...timing, timeMs: 1000 }).state, "warning");
assert.equal(timedPlatformCycle({ ...timing, timeMs: 1199 }).state, "warning");
assert.equal(timedPlatformCycle({ ...timing, timeMs: 1200 }).state, "hidden");
assert.equal(timedPlatformCycle({ ...timing, timeMs: 1999 }).state, "hidden");
assert.equal(timedPlatformCycle({ ...timing, timeMs: 2000 }).state, "solid");
assert.equal(timedPlatformCycle({ ...timing, timeMs: 0, phase: 0.5 }).state, "warning");

assert.equal(timedPlatformOpacity("solid", 0), 1);
assert.equal(timedPlatformOpacity("hidden", 0), 0);
const warningOpacity = timedPlatformOpacity("warning", 0.25);
assert.ok(warningOpacity > 0.4 && warningOpacity <= 0.86, "warning opacity should pulse visibly");

const source = fs.readFileSync("timed-lab.js", "utf8");
const html = fs.readFileSync("timed-lab.html", "utf8");
assert.equal((source.match(/timed: \{/g) || []).length, 6, "lab should define six timed-platform tests");
assert.match(source, /expectedColliderCount: 20/);
assert.match(source, /expectedTimedCount: 6/);
assert.match(source, /alternating-a/);
assert.match(source, /alternating-b/);
assert.match(source, /wave-a/);
assert.match(source, /wave-b/);
assert.match(source, /wave-c/);
assert.match(source, /fast-cycle/);
assert.match(html, /timed-platform mechanics laboratory/i);
assert.match(html, /timed-lab\.js/);
assert.match(html, /Falling Platform Lab/);
assert.match(html, /Rotating Wall Lab/);

console.log("Timed-platform cycle, phase offsets, warning visibility, and lab structure tests passed.");
