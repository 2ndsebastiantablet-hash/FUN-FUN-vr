const VERSION = "advanced-integrated-v1";
const DEFAULT_SEED = "FUNADV01";
const EXTENSION_IDS = Object.freeze(["hazard", "bridge"]);

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

function choose(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function normalizeAdvancedSeed(value) {
  const normalized = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 18);
  return normalized || DEFAULT_SEED;
}

export function readAdvancedRequest(locationLike = globalThis.location) {
  const parameters = new URLSearchParams(locationLike?.search || "");
  return { seed: normalizeAdvancedSeed(parameters.get("seed") || DEFAULT_SEED) };
}

export function randomAdvancedSeed(cryptoLike = globalThis.crypto) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (cryptoLike?.getRandomValues) cryptoLike.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function generateAdvancedExtensionPlan(seedValue) {
  const seed = normalizeAdvancedSeed(seedValue);
  const random = mulberry32(xmur3(`${VERSION}:${seed}`)());
  const order = random() < 0.5 ? [...EXTENSION_IDS] : [...EXTENSION_IDS].reverse();
  const hazard = Object.freeze({
    id: "hazard",
    spikeX: choose(random, [-0.35, 0, 0.35]),
    bombX: choose(random, [-0.7, 0.7]),
    fuseMs: choose(random, [460, 520, 580]),
    triggerRadius: choose(random, [2.55, 2.75, 2.95]),
    cooldownMs: choose(random, [2800, 3200, 3600])
  });
  const bridge = Object.freeze({
    id: "bridge",
    count: 6,
    chainDelayMs: choose(random, [90, 110, 130]),
    warningMs: choose(random, [220, 260, 300]),
    fallMs: choose(random, [420, 480, 540]),
    hiddenMs: choose(random, [1800, 2100, 2400])
  });
  const physics = Object.freeze({
    id: "physics",
    blockMass: 7.5,
    plateThreshold: 6,
    blockStartX: choose(random, [-0.75, 0.75]),
    plateX: choose(random, [-0.35, 0.35]),
    doorSpeed: choose(random, [3.2, 3.5, 3.8])
  });
  const configs = { hazard, bridge };
  const modules = [...order.map((id) => configs[id]), physics];
  const plan = {
    version: VERSION,
    seed,
    order: Object.freeze([...order, "physics"]),
    modules: Object.freeze(modules),
    additionalCheckpointCount: 3,
    totalCheckpointCount: 8,
    totalMechanicCount: 8
  };
  plan.checksum = hashString(JSON.stringify({
    version: plan.version,
    seed: plan.seed,
    order: plan.order,
    modules: plan.modules
  }));
  const validation = validateAdvancedExtensionPlan(plan);
  if (!validation.valid) throw new Error(`Advanced extension ${seed} failed validation: ${validation.errors.join("; ")}`);
  return Object.freeze(plan);
}

export function validateAdvancedExtensionPlan(plan) {
  const errors = [];
  if (!plan || !Array.isArray(plan.modules) || !Array.isArray(plan.order)) {
    return { valid: false, errors: ["advanced plan modules or order missing"] };
  }
  const ids = plan.modules.map((module) => module.id);
  if (ids.join(",") !== plan.order.join(",")) errors.push("advanced order and modules disagree");
  if (ids.length !== 3 || new Set(ids).size !== 3) errors.push("advanced plan must contain three unique modules");
  for (const id of ["hazard", "bridge", "physics"]) if (!ids.includes(id)) errors.push(`missing ${id} module`);
  if (ids[2] !== "physics") errors.push("physics module must remain final");
  const hazard = plan.modules.find((module) => module.id === "hazard");
  if (!hazard || hazard.triggerRadius < 2.55 || hazard.triggerRadius > 2.95 || hazard.fuseMs < 460 || hazard.fuseMs > 580) {
    errors.push("hazard tuning outside Quest-tested range");
  }
  const bridge = plan.modules.find((module) => module.id === "bridge");
  if (!bridge || bridge.count !== 6 || bridge.chainDelayMs < 90 || bridge.chainDelayMs > 130) {
    errors.push("bridge tuning outside tested range");
  }
  const physics = plan.modules.find((module) => module.id === "physics");
  if (!physics || physics.blockMass !== 7.5 || physics.plateThreshold !== 6 || physics.doorSpeed < 3.2 || physics.doorSpeed > 3.8) {
    errors.push("physics challenge tuning invalid");
  }
  if (plan.totalCheckpointCount !== 8 || plan.totalMechanicCount !== 8) errors.push("advanced totals invalid");
  if (typeof plan.checksum !== "string" || plan.checksum.length !== 8) errors.push("advanced checksum missing");
  return { valid: errors.length === 0, errors };
}

export const ADVANCED_INTEGRATED_VERSION = VERSION;
