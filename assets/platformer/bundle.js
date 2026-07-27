import { getPlatformerAsset } from "./registry.js";

export async function getPlatformerAssetUrl(id) {
  const asset = getPlatformerAsset(id);
  return asset ? asset.url : null;
}

export function revokePlatformerAssetUrls() {
  // Phase 1 uses commit-pinned HTTPS glTF URLs, so there are no Blob URLs to revoke.
}
