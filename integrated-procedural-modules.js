const VERSION = "integrated-procedural-v1";
const DEFAULT_SEED = "FUNMIX01";
const MODULE_IDS = Object.freeze(["moving", "fragile", "timed", "rotating", "switch"]);

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

function shuffled(random, values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function normalizeIntegratedSeed(value) {
  const normalized = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 18);
  return normalized || DEFAULT_SEED;
}

export function randomIntegratedSeed(cryptoLike = globalThis.crypto) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (cryptoLike?.getRandomValues) cryptoLike.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function readIntegratedRequest(locationLike = globalThis.location) {
  const parameters = new URLSearchParams(locationLike?.search || "");
  return { seed: normalizeIntegratedSeed(parameters.get("seed") || DEFAULT_SEED) };
}

function moduleConfig(id, random) {
  if (id === "moving") {
    const direction = random() < 0.5 ? -1 : 1;
    return Object.freeze({
      id,
      direction,
      distance: choose(random, [2.4, 2.6, 2.8]),
      duration: choose(random, [3200, 3500, 3800]),
      phase: Math.round(random() * 1000) / 1000
    });
  }
  if (id === "fragile") {
    return Object.freeze({
      id,
      count: 3,
      warningDelay: choose(random, [380, 440, 500]),
      fallDuration: choose(random, [500, 560, 620]),
      resetDelay: choose(random, [1500, 1750, 2000])
    });
  }
  if (id === "timed") {
    const direction = random() < 0.5 ? 1 : -1;
    const phases = direction > 0 ? [0, 0.34, 0.68] : [0.68, 0.34, 0];
    return Object.freeze({
      id,
      count: 3,
      solidDuration: choose(random, [1450, 1600, 1750]),
      warningDuration: choose(random, [320, 360, 400]),
      hiddenDuration: choose(random, [850, 950, 1050]),
      phases: Object.freeze(phases)
    });
  }
  if (id === "rotating") {
    const direction = random() < 0.5 ? -1 : 1;
    return Object.freeze({
      id,
      degreesPerSecond: direction * choose(random, [34, 40, 46]),
      phaseDegrees: choose(random, [0, 45, 90, 135]),
      barCount: 1
    });
  }
  return Object.freeze({
    id: "switch",
    firstControl: random() < 0.5 ? "button" : "lever",
    buttonStartsActive: false,
    leverStartsActive: false
  });
}

export function generateIntegratedPlan(seedValue) {
  const seed = normalizeIntegratedSeed(seedValue);
  const random = mulberry32(xmur3(`${VERSION}:${seed}`)());
  const order = shuffled(random, MODULE_IDS);
  const modules = order.map((id) => moduleConfig(id, random));
  const plan = {
    version: VERSION,
    seed,
    order: Object.freeze([...order]),
    modules: Object.freeze(modules),
    checkpointCount: modules.length,
    mechanicCount: MODULE_IDS.length
  };
  plan.checksum = hashString(JSON.stringify({
    version: plan.version,
    seed: plan.seed,
    order: plan.order,
    modules: plan.modules
  }));
  const validation = validateIntegratedPlan(plan);
  if (!validation.valid) throw new Error(`Integrated plan ${seed} failed validation: ${validation.errors.join("; ")}`);
  return Object.freeze(plan);
}

export function validateIntegratedPlan(plan) {
  const errors = [];
  if (!plan || !Array.isArray(plan.modules) || !Array.isArray(plan.order)) {
    return { valid: false, errors: ["plan modules or order missing"] };
  }
  if (plan.modules.length !== MODULE_IDS.length) errors.push("plan must contain five mechanic modules");
  const ids = plan.modules.map((module) => module.id);
  if (new Set(ids).size !== MODULE_IDS.length) errors.push("module IDs must be unique");
  for (const required of MODULE_IDS) if (!ids.includes(required)) errors.push(`missing ${required} module`);
  if (plan.order.join(",") !== ids.join(",")) errors.push("module order and configs disagree");

  const moving = plan.modules.find((module) => module.id === "moving");
  if (!moving || moving.distance < 2.4 || moving.distance > 2.8 || Math.abs(moving.direction) !== 1) errors.push("moving module is outside tested range");
  const fragile = plan.modules.find((module) => module.id === "fragile");
  if (!fragile || fragile.count !== 3 || fragile.warningDelay < 380 || fragile.warningDelay > 500) errors.push("fragile module is outside tested range");
  const timed = plan.modules.find((module) => module.id === "timed");
  if (!timed || timed.count !== 3 || timed.phases?.length !== 3) errors.push("timed module is incomplete");
  const rotating = plan.modules.find((module) => module.id === "rotating");
  if (!rotating || Math.abs(rotating.degreesPerSecond) < 34 || Math.abs(rotating.degreesPerSecond) > 46) errors.push("rotating module is outside tested range");
  const switches = plan.modules.find((module) => module.id === "switch");
  if (!switches || !["button", "lever"].includes(switches.firstControl)) errors.push("switch module is incomplete");
  if (typeof plan.checksum !== "string" || plan.checksum.length !== 8) errors.push("checksum missing");
  return { valid: errors.length === 0, errors };
}

export const INTEGRATED_MODULE_IDS = MODULE_IDS;
export const INTEGRATED_VERSION = VERSION;
