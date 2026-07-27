const GENERATOR_VERSION = "module-generator-v1";
const GENERATED_COURSE_VERSION = "procedural-course-v1";
const DEFAULT_SEED = "FUNFUN01";
const START_POSITION = Object.freeze({ x: 0, y: 0, z: 8 });
const RIG_HEIGHT_ABOVE_PLATFORM_BASE = 0.32;
const PLATFORM_COLLIDER = Object.freeze({ position: [0, 0.5, 0], size: [4, 1, 4] });

const SAFE_MODULES = Object.freeze([
  Object.freeze({ id: "straight", dx: 0, dy: 0, dz: -4.6, difficulty: 1 }),
  Object.freeze({ id: "left-step", dx: -1.55, dy: 0, dz: -4.7, difficulty: 1 }),
  Object.freeze({ id: "right-step", dx: 1.55, dy: 0, dz: -4.7, difficulty: 1 }),
  Object.freeze({ id: "gentle-rise", dx: 0, dy: 0.75, dz: -4.65, difficulty: 2 }),
  Object.freeze({ id: "left-rise", dx: -1.25, dy: 0.6, dz: -4.75, difficulty: 2 }),
  Object.freeze({ id: "right-rise", dx: 1.25, dy: 0.6, dz: -4.75, difficulty: 2 }),
  Object.freeze({ id: "gentle-drop", dx: 0, dy: -0.75, dz: -4.6, difficulty: 1 })
]);

function xmur3(value) {
  let hash = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return function nextHash() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function cloneCollider() {
  return {
    position: [...PLATFORM_COLLIDER.position],
    size: [...PLATFORM_COLLIDER.size]
  };
}

function platformPiece(id, position, extra = {}) {
  return {
    id,
    assetId: "platform-square-blue",
    position: [round(position.x), round(position.y), round(position.z)],
    colliders: [cloneCollider()],
    ...extra
  };
}

function normalizePosition(position) {
  return {
    x: round(position.x),
    y: round(position.y),
    z: round(position.z)
  };
}

function chooseModule(random, state, previousIds, difficulty) {
  const candidates = SAFE_MODULES.filter((module) => {
    if (module.difficulty > difficulty) return false;
    if (previousIds.length >= 2 && previousIds.at(-1) === module.id && previousIds.at(-2) === module.id) {
      return false;
    }

    const nextX = state.x + module.dx;
    const nextY = state.y + module.dy;
    if (Math.abs(nextX) > 3.4) return false;
    if (nextY < 0 || nextY > 4.1) return false;
    if (module.id === "gentle-drop" && state.y < 0.75) return false;
    return true;
  });

  const pool = candidates.length ? candidates : SAFE_MODULES.filter((module) => module.id === "straight");
  return pool[Math.floor(random() * pool.length)];
}

function addCheckpoint(piece, index, label) {
  const [x, y, z] = piece.position;
  piece.checkpoint = {
    id: `checkpoint-${index}`,
    label,
    index,
    spawn: [x, round(y + RIG_HEIGHT_ABOVE_PLATFORM_BASE), z]
  };
}

function addSpringSequence(pieces, state, idPrefix) {
  pieces.push({
    id: `${idPrefix}-pad`,
    assetId: "spring-pad-green",
    position: [round(state.x), round(state.y + 1), round(state.z)],
    colliders: [{ position: [0, 0.5, 0], size: [1.5, 1, 1.5] }],
    spring: {
      launchSpeed: 8.4,
      forwardSpeed: 4.5,
      cooldown: 950
    }
  });

  const landing = normalizePosition({
    x: state.x,
    y: Math.min(4.5, state.y + 1.5),
    z: state.z - 5
  });
  const landingPiece = platformPiece(`${idPrefix}-landing`, landing);
  addCheckpoint(landingPiece, 2, "Spring checkpoint");
  pieces.push(landingPiece);
  return landing;
}

function computeBounds(pieces) {
  const platforms = pieces.filter((piece) => piece.assetId === "platform-square-blue");
  const xs = platforms.map((piece) => piece.position[0]);
  const ys = platforms.map((piece) => piece.position[1]);
  const zs = platforms.map((piece) => piece.position[2]);
  return {
    minX: Math.min(...xs) - 8,
    maxX: Math.max(...xs) + 8,
    minZ: Math.min(...zs) - 7,
    maxZ: Math.max(...zs) + 7,
    minHeight: -6,
    maxHeight: Math.max(...ys) + 14
  };
}

function expectedColliderCount(pieces) {
  return pieces.reduce((count, piece) => {
    if (piece.colliderFactory === "slope-steps") return count + 10;
    return count + (piece.colliders?.length || 0);
  }, 0);
}

function manifestChecksum(manifest) {
  const stable = JSON.stringify({
    version: manifest.version,
    generatorVersion: manifest.generatorVersion,
    seed: manifest.seed,
    modules: manifest.modules,
    pieces: manifest.pieces.map((piece) => ({
      id: piece.id,
      assetId: piece.assetId,
      position: piece.position,
      checkpoint: piece.checkpoint?.index || 0,
      spring: Boolean(piece.spring),
      finish: Boolean(piece.finish)
    }))
  });
  return hashString(stable);
}

export function normalizeSeed(value) {
  const normalized = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 18);
  return normalized || DEFAULT_SEED;
}

export function readCourseRequest(locationLike = globalThis.location) {
  const parameters = new URLSearchParams(locationLike?.search || "");
  const mode = parameters.get("mode") === "generated" ? "generated" : "calibration";
  return {
    mode,
    seed: normalizeSeed(parameters.get("seed") || DEFAULT_SEED)
  };
}

export function randomSeed(cryptoLike = globalThis.crypto) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (cryptoLike?.getRandomValues) cryptoLike.getRandomValues(bytes);
  else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function generateCourseManifest(seedValue) {
  const seed = normalizeSeed(seedValue);
  const seedHash = xmur3(`${GENERATOR_VERSION}:${seed}`)();
  const random = mulberry32(seedHash);
  const pieces = [];
  const modules = [];
  const previousIds = [];
  let state = { ...START_POSITION };

  pieces.push(platformPiece("generated-start", state));

  for (let index = 0; index < 3; index += 1) {
    const difficulty = index < 1 ? 1 : 2;
    const module = chooseModule(random, state, previousIds, difficulty);
    previousIds.push(module.id);
    modules.push(module.id);
    state = normalizePosition({
      x: state.x + module.dx,
      y: state.y + module.dy,
      z: state.z + module.dz
    });
    const piece = platformPiece(`module-${index + 1}-${module.id}`, state);
    if (index === 2) addCheckpoint(piece, 1, "Mid-course checkpoint");
    pieces.push(piece);
  }

  modules.push("spring-rise");
  state = addSpringSequence(pieces, state, "module-4-spring");

  for (let index = 0; index < 2; index += 1) {
    const module = chooseModule(random, state, previousIds, 2);
    previousIds.push(module.id);
    modules.push(module.id);
    state = normalizePosition({
      x: state.x + module.dx,
      y: state.y + module.dy,
      z: state.z + module.dz
    });
    pieces.push(platformPiece(`module-${index + 5}-${module.id}`, state));
  }

  const finishPlatformPosition = normalizePosition({
    x: state.x,
    y: Math.max(0, state.y - Math.min(0.75, state.y)),
    z: state.z - 4.65
  });
  pieces.push(platformPiece("generated-finish-platform", finishPlatformPosition));
  pieces.push({
    id: "generated-finish-gate",
    assetId: "finish-wide",
    position: [finishPlatformPosition.x, round(finishPlatformPosition.y + 1), round(finishPlatformPosition.z - 1.1)],
    scale: 0.45,
    finish: {
      radiusX: 1.85,
      radiusZ: 0.7,
      minRigY: round(finishPlatformPosition.y - 0.2),
      maxRigY: round(finishPlatformPosition.y + 4.6)
    }
  });

  const manifest = {
    version: GENERATED_COURSE_VERSION,
    generatorVersion: GENERATOR_VERSION,
    mode: "generated",
    seed,
    spawn: {
      x: START_POSITION.x,
      y: round(START_POSITION.y + RIG_HEIGHT_ABOVE_PLATFORM_BASE),
      z: START_POSITION.z
    },
    startThresholdZ: 6.1,
    checkpointCount: 2,
    modules,
    pieces,
    bounds: computeBounds(pieces),
    expectedColliderCount: expectedColliderCount(pieces)
  };
  manifest.checksum = manifestChecksum(manifest);

  const validation = validateCourseManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Generated course ${seed} failed validation: ${validation.errors.join("; ")}`);
  }
  return Object.freeze(manifest);
}

export function validateCourseManifest(manifest) {
  const errors = [];
  if (!manifest || !Array.isArray(manifest.pieces)) return { valid: false, errors: ["manifest pieces are missing"] };

  const ids = new Set();
  for (const piece of manifest.pieces) {
    if (!piece.id || ids.has(piece.id)) errors.push(`duplicate or missing piece id: ${piece.id || "unknown"}`);
    ids.add(piece.id);
    if (!Array.isArray(piece.position) || piece.position.length !== 3 || !piece.position.every(Number.isFinite)) {
      errors.push(`invalid position for ${piece.id}`);
    }
  }

  const platforms = manifest.pieces.filter((piece) => piece.assetId === "platform-square-blue");
  if (platforms.length < 7) errors.push("too few landing platforms");
  if (!manifest.pieces.some((piece) => piece.spring)) errors.push("spring module missing");
  if (!manifest.pieces.some((piece) => piece.finish)) errors.push("finish trigger missing");

  const checkpointIndices = manifest.pieces
    .filter((piece) => piece.checkpoint)
    .map((piece) => piece.checkpoint.index)
    .sort((a, b) => a - b);
  if (checkpointIndices.join(",") !== "1,2") errors.push("checkpoint sequence must be 1,2");

  for (let index = 1; index < platforms.length; index += 1) {
    const previous = platforms[index - 1].position;
    const current = platforms[index].position;
    const dx = Math.abs(current[0] - previous[0]);
    const dy = Math.abs(current[1] - previous[1]);
    const dz = Math.abs(current[2] - previous[2]);
    if (dx > 2.1) errors.push(`lateral shift too large between ${platforms[index - 1].id} and ${platforms[index].id}`);
    if (dy > 1.55) errors.push(`height change too large between ${platforms[index - 1].id} and ${platforms[index].id}`);
    if (dz > 5.1) errors.push(`forward gap too large between ${platforms[index - 1].id} and ${platforms[index].id}`);
    if (current[2] >= previous[2]) errors.push(`course does not move forward at ${platforms[index].id}`);
  }

  for (const piece of platforms) {
    const [x, y, z] = piece.position;
    if (Math.abs(x) > 4) errors.push(`${piece.id} exceeds lateral bounds`);
    if (y < 0 || y > 4.5) errors.push(`${piece.id} exceeds height bounds`);
    if (z < -35 || z > 9) errors.push(`${piece.id} exceeds longitudinal bounds`);
  }

  return { valid: errors.length === 0, errors };
}

export function createCourseUrl({ mode, seed }, locationLike = globalThis.location) {
  const base = new URL(locationLike?.href || "https://example.invalid/");
  if (mode === "generated") {
    base.searchParams.set("mode", "generated");
    base.searchParams.set("seed", normalizeSeed(seed));
  } else {
    base.searchParams.delete("mode");
    base.searchParams.delete("seed");
  }
  base.hash = "";
  return base.toString();
}

export function setupCourseModeControls({ documentLike = globalThis.document, locationLike = globalThis.location } = {}) {
  if (!documentLike || !locationLike) return;
  const request = readCourseRequest(locationLike);
  const modeSelect = documentLike.getElementById("course-mode");
  const seedInput = documentLike.getElementById("course-seed");
  const loadButton = documentLike.getElementById("load-course");
  const randomButton = documentLike.getElementById("random-seed");
  const copyButton = documentLike.getElementById("copy-course-link");

  if (!modeSelect || !seedInput || !loadButton || !randomButton || !copyButton) return;
  modeSelect.value = request.mode;
  seedInput.value = request.seed;
  seedInput.disabled = request.mode !== "generated";
  randomButton.disabled = request.mode !== "generated";

  modeSelect.addEventListener("change", () => {
    const generated = modeSelect.value === "generated";
    seedInput.disabled = !generated;
    randomButton.disabled = !generated;
  });

  randomButton.addEventListener("click", () => {
    seedInput.value = randomSeed();
  });

  loadButton.addEventListener("click", () => {
    const next = createCourseUrl({ mode: modeSelect.value, seed: seedInput.value }, locationLike);
    locationLike.assign(next);
  });

  copyButton.addEventListener("click", async () => {
    const url = createCourseUrl({ mode: modeSelect.value, seed: seedInput.value }, locationLike);
    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(url);
      } else if (typeof documentLike.execCommand === "function") {
        const temporary = documentLike.createElement("textarea");
        temporary.value = url;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        documentLike.body.appendChild(temporary);
        temporary.select();
        const copied = documentLike.execCommand("copy");
        temporary.remove();
        if (!copied) throw new Error("copy command was rejected");
      } else {
        throw new Error("clipboard API is unavailable");
      }
      copyButton.textContent = "Copied";
    } catch {
      copyButton.textContent = "Copy unavailable";
    }
    globalThis.setTimeout?.(() => {
      copyButton.textContent = "Copy Course Link";
    }, 1400);
  });
}

export const COURSE_GENERATOR_INFO = Object.freeze({
  generatorVersion: GENERATOR_VERSION,
  generatedCourseVersion: GENERATED_COURSE_VERSION,
  defaultSeed: DEFAULT_SEED,
  moduleIds: SAFE_MODULES.map((module) => module.id)
});
