const VERSION = "creative-puzzle-v1";
const DEFAULT_SEED = "PUZZLE01";
const CONTROL_IDS = Object.freeze(["amber", "cyan", "violet"]);
const CARGO_WEIGHTS = Object.freeze([2, 4, 6, 8]);

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

function shuffled(random, values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function choose(random, values) {
  return values[Math.floor(random() * values.length)];
}

function checksum(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizeCreativeSeed(value) {
  const normalized = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 18);
  return normalized || DEFAULT_SEED;
}

export function randomCreativeSeed(cryptoLike = globalThis.crypto) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (cryptoLike?.getRandomValues) cryptoLike.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function readCreativeRequest(locationLike = globalThis.location) {
  const parameters = new URLSearchParams(locationLike?.search || "");
  return { seed: normalizeCreativeSeed(parameters.get("seed") || DEFAULT_SEED) };
}

export function generateCreativePuzzlePlan(seedValue) {
  const seed = normalizeCreativeSeed(seedValue);
  const random = mulberry32(xmur3(`${VERSION}:${seed}`)());
  const sequence = shuffled(random, CONTROL_IDS);
  const relayFirst = random() < 0.5 ? "relay-button" : "relay-lever";
  const cargoRoutes = shuffled(random, ["main", "moving", "timed", "fragile"]);
  const cargo = CARGO_WEIGHTS.map((mass, index) => Object.freeze({
    id: `cargo-${mass}`,
    mass,
    route: cargoRoutes[index],
    side: random() < 0.5 ? -1 : 1
  }));
  const plan = {
    version: VERSION,
    seed,
    tripleLockBoxSides: Object.freeze(random() < 0.5 ? [-1, 1] : [1, -1]),
    weightThreshold: 14,
    cargo: Object.freeze(cargo),
    relayFirst,
    relaySecond: relayFirst === "relay-button" ? "relay-lever" : "relay-button",
    relayWindowMs: choose(random, [6500, 7000, 7500]),
    sequence: Object.freeze(sequence),
    movingDuration: choose(random, [3000, 3300, 3600]),
    timedSolidMs: choose(random, [1350, 1500, 1650]),
    timedHiddenMs: choose(random, [780, 900, 1020]),
    fragileWarningMs: choose(random, [360, 420, 480])
  };
  plan.checksum = checksum(JSON.stringify(plan));
  const validation = validateCreativePuzzlePlan(plan);
  if (!validation.valid) throw new Error(`Creative puzzle plan ${seed} failed: ${validation.errors.join("; ")}`);
  return Object.freeze(plan);
}

export function validateCreativePuzzlePlan(plan) {
  const errors = [];
  if (!plan || plan.version !== VERSION) errors.push("wrong version");
  if (!Array.isArray(plan?.sequence) || plan.sequence.length !== 3 || new Set(plan.sequence).size !== 3) errors.push("sequence must contain three unique controls");
  for (const id of CONTROL_IDS) if (!plan?.sequence?.includes(id)) errors.push(`missing ${id} sequence control`);
  if (!["relay-button", "relay-lever"].includes(plan?.relayFirst)) errors.push("invalid relay first control");
  if (plan?.relayFirst === plan?.relaySecond) errors.push("relay controls must differ");
  if (!Array.isArray(plan?.cargo) || plan.cargo.length !== 4) errors.push("four cargo objects required");
  const masses = plan?.cargo?.map((item) => item.mass) || [];
  if (masses.join(",") !== CARGO_WEIGHTS.join(",")) errors.push("cargo masses must be 2,4,6,8");
  if (new Set(plan?.cargo?.map((item) => item.route)).size !== 4) errors.push("cargo routes must be unique");
  if (plan?.weightThreshold !== 14) errors.push("weight threshold must remain 14 kg");
  if (plan?.relayWindowMs < 6500 || plan?.relayWindowMs > 7500) errors.push("relay window outside tested range");
  if (typeof plan?.checksum !== "string" || plan.checksum.length !== 8) errors.push("checksum missing");
  return { valid: errors.length === 0, errors };
}

export const CREATIVE_VERSION = VERSION;
export const CREATIVE_CONTROL_IDS = CONTROL_IDS;
export const CREATIVE_CARGO_WEIGHTS = CARGO_WEIGHTS;
