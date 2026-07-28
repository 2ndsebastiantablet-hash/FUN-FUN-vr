import assert from "node:assert/strict";
import { generateCourseManifest } from "../course-modules.js";
import {
  COLLECTIBLE_COUNT,
  chooseCollectiblePlacements,
  collectibleDistanceSquared
} from "../collectibles.js";

const calibrationLikeManifest = {
  pieces: Array.from({ length: 8 }, (_, index) => ({
    id: `platform-${index}`,
    assetId: "platform-square-blue",
    position: [index % 2 === 0 ? 0 : 1, index * 0.25, 8 - index * 4.6]
  }))
};

const first = chooseCollectiblePlacements(calibrationLikeManifest);
const second = chooseCollectiblePlacements(calibrationLikeManifest);
assert.deepEqual(first, second, "collectible placement must be deterministic");
assert.equal(first.length, COLLECTIBLE_COUNT);
assert.equal(new Set(first.map((placement) => placement.id)).size, COLLECTIBLE_COUNT);
assert.equal(new Set(first.map((placement) => placement.platformId)).size, COLLECTIBLE_COUNT);
assert.ok(first.every((placement) => placement.position.every(Number.isFinite)));

for (const placement of first) {
  const platform = calibrationLikeManifest.pieces.find((piece) => piece.id === placement.platformId);
  assert.ok(platform, `missing platform ${placement.platformId}`);
  assert.ok(Math.abs(placement.position[0] - platform.position[0]) <= 0.7);
  assert.equal(Number((placement.position[1] - platform.position[1]).toFixed(3)), 1.75);
  assert.equal(placement.position[2], platform.position[2]);
}

assert.equal(collectibleDistanceSquared({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 }), 9);

for (let index = 0; index < 500; index += 1) {
  const manifest = generateCourseManifest(`SHARD-${index}`);
  const placements = chooseCollectiblePlacements(manifest);
  assert.equal(placements.length, COLLECTIBLE_COUNT, `seed ${manifest.seed} should receive three shards`);
  assert.equal(new Set(placements.map((placement) => placement.platformId)).size, COLLECTIBLE_COUNT);
  assert.ok(placements.every((placement) => placement.total === COLLECTIBLE_COUNT));

  for (const placement of placements) {
    const platform = manifest.pieces.find((piece) => piece.id === placement.platformId);
    assert.ok(platform, `seed ${manifest.seed} missing collectible platform ${placement.platformId}`);
    assert.ok(Math.abs(placement.position[0] - platform.position[0]) <= 0.7);
    assert.equal(placement.position[2], platform.position[2]);
  }
}

console.log("Collectible placement validated across 500 generated seeds.");
