const PAYLOAD_MODULES = {
  "platform-square-blue": "./payloads/platform-square-blue.js",
  "platform-small-green": "./payloads/platform-small-green.js",
  "platform-long-yellow": "./payloads/platform-long-yellow.js",
  "platform-slope-blue": "./payloads/platform-slope-blue.js",
  "platform-hole-red": "./payloads/platform-hole-red.js",
  "spring-pad-green": "./payloads/spring-pad-green.js",
  "hoop-blue": "./payloads/hoop-blue.js",
  "arch-tall-blue": "./payloads/arch-tall-blue.js",
  "pipe-straight-red": "./payloads/pipe-straight-red.js",
  "barrier-red": "./payloads/barrier-red.js",
  "floor-wood-long": "./payloads/floor-wood-long.js",
  "finish-wide": "./payloads/finish-wide.js"
};

const urlCache = new Map();

function decodeBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function getPlatformerAssetUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const modulePath = PAYLOAD_MODULES[id];
  if (!modulePath) return null;

  const payloadModule = await import(modulePath);
  const url = URL.createObjectURL(
    new Blob([decodeBase64(payloadModule.default)], { type: "model/gltf-binary" })
  );
  urlCache.set(id, url);
  return url;
}

export function revokePlatformerAssetUrls() {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
}
