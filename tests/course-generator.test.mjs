import assert from "node:assert/strict";
import {
  COURSE_GENERATOR_INFO,
  createCourseUrl,
  generateCourseManifest,
  normalizeSeed,
  validateCourseManifest
} from "../course-modules.js";

assert.equal(normalizeSeed(" fun fun!? 01 "), "FUNFUN01");
assert.equal(normalizeSeed(""), COURSE_GENERATOR_INFO.defaultSeed);

const sampleA = generateCourseManifest("TESTSEED");
const sampleB = generateCourseManifest("testseed");
assert.deepEqual(sampleA, sampleB, "same normalized seed must produce the same manifest");
assert.equal(sampleA.mode, "generated");
assert.equal(sampleA.checkpointCount, 2);
assert.equal(sampleA.pieces.filter((piece) => piece.checkpoint).length, 2);
assert.equal(sampleA.pieces.filter((piece) => piece.spring).length, 1);
assert.equal(sampleA.pieces.filter((piece) => piece.finish).length, 1);
assert.equal(sampleA.expectedColliderCount, 18);
assert.match(sampleA.checksum, /^[0-9a-f]{8}$/);

const seenChecksums = new Set();
const seenLayouts = new Set();
for (let index = 0; index < 2000; index += 1) {
  const seed = `AUTO${index.toString(36).toUpperCase().padStart(4, "0")}`;
  const manifest = generateCourseManifest(seed);
  const validation = validateCourseManifest(manifest);
  assert.equal(validation.valid, true, `${seed}: ${validation.errors.join("; ")}`);
  assert.equal(new Set(manifest.pieces.map((piece) => piece.id)).size, manifest.pieces.length);
  assert.equal(
    manifest.expectedColliderCount,
    manifest.pieces.reduce(
      (count, piece) => count + (piece.colliderFactory === "slope-steps" ? 10 : (piece.colliders?.length || 0)),
      0
    )
  );
  seenChecksums.add(manifest.checksum);
  seenLayouts.add(JSON.stringify({
    modules: manifest.modules,
    platforms: manifest.pieces
      .filter((piece) => piece.assetId === "platform-square-blue")
      .map((piece) => piece.position)
  }));
}
assert.ok(seenLayouts.size > 100, "generator should produce meaningful layout variety");

const generatedUrl = createCourseUrl(
  { mode: "generated", seed: "HELLO WORLD" },
  { href: "https://example.com/FUN-FUN-vr/#test" }
);
assert.equal(generatedUrl, "https://example.com/FUN-FUN-vr/generated.html?mode=generated&seed=HELLOWORLD");

const calibrationUrl = createCourseUrl(
  { mode: "calibration", seed: "IGNORED" },
  { href: generatedUrl }
);
assert.equal(calibrationUrl, "https://example.com/FUN-FUN-vr/");

console.log(`Validated 2,000 generated seeds with ${seenLayouts.size} unique layouts and ${seenChecksums.size} map checksums.`);
