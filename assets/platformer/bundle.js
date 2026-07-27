import { getPlatformerAsset } from "./registry.js";

const urlCache = new Map();

function decodeBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function gunzip(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("This browser does not support DecompressionStream, which is required for the Phase 1 asset pilot.");
  }

  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function getPlatformerAssetUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);

  const asset = getPlatformerAsset(id);
  if (!asset) return null;

  const chunks = await Promise.all(
    asset.runtime.chunkModules.map(async (path) => (await import(path)).default)
  );
  const glbBytes = await gunzip(decodeBase64(chunks.join("")));
  const magic = String.fromCharCode(...glbBytes.slice(0, 4));
  if (magic !== "glTF") {
    throw new Error(`Invalid GLB payload for ${id}`);
  }

  const url = URL.createObjectURL(
    new Blob([glbBytes], { type: asset.runtime.mimeType })
  );
  urlCache.set(id, url);
  return url;
}

export function revokePlatformerAssetUrls() {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
}
