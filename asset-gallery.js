import { PLATFORMER_ASSETS } from "./assets/platformer/registry.js";
import { getPlatformerAssetUrl, revokePlatformerAssetUrls } from "./assets/platformer/bundle.js";

const statusEl = document.getElementById("gallery-status");
const sceneEl = document.querySelector("a-scene");
const gridEl = document.getElementById("gallery-grid");

function setStatus(message, state = "checking") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function positionFor(index) {
  const columns = 4;
  const spacingX = 11.5;
  const spacingZ = 8.8;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: (column - 1.5) * spacingX,
    z: 7 - row * spacingZ
  };
}

async function addPedestal(asset, index, counters) {
  const slot = document.createElement("a-entity");
  const position = positionFor(index);
  const baseWidth = Math.max(4.4, Math.min(8.5, asset.bounds.size[0] + 1.1));
  const baseDepth = Math.max(4.4, Math.min(8.5, asset.bounds.size[2] + 1.1));
  const modelBottom = asset.bounds.min[1] * asset.galleryScale;

  slot.setAttribute("position", `${position.x} 0 ${position.z}`);
  slot.setAttribute("data-asset-id", asset.id);

  const pedestal = document.createElement("a-box");
  pedestal.setAttribute("position", "0 0.12 0");
  pedestal.setAttribute("width", String(baseWidth));
  pedestal.setAttribute("height", "0.24");
  pedestal.setAttribute("depth", String(baseDepth));
  pedestal.setAttribute("color", index % 2 ? "#E2E8F0" : "#F8FAFC");
  slot.appendChild(pedestal);

  const model = document.createElement("a-entity");
  const assetUrl = await getPlatformerAssetUrl(asset.id);
  if (!assetUrl) {
    counters.failed += 1;
    setStatus(`Asset source missing: ${asset.id}.`, "error");
    return;
  }

  model.setAttribute("gltf-model", `url(${assetUrl})`);
  model.setAttribute("position", `0 ${0.27 - modelBottom} 0`);
  model.setAttribute("scale", `${asset.galleryScale} ${asset.galleryScale} ${asset.galleryScale}`);
  model.addEventListener("model-loaded", () => {
    counters.loaded += 1;
    setStatus(
      `KayKit pilot: ${counters.loaded}/${PLATFORMER_ASSETS.length} assets loaded. Use WASD + mouse on desktop or Enter VR for scale inspection.`,
      counters.loaded === PLATFORMER_ASSETS.length ? "ready" : "checking"
    );
  });
  model.addEventListener("model-error", () => {
    counters.failed += 1;
    setStatus(`Asset load problem: ${asset.id}. ${counters.loaded} loaded, ${counters.failed} failed.`, "error");
  });
  slot.appendChild(model);

  const title = document.createElement("a-text");
  title.setAttribute("value", asset.label);
  title.setAttribute("position", `0 0.58 ${baseDepth / 2 + 0.08}`);
  title.setAttribute("rotation", "-36 0 0");
  title.setAttribute("align", "center");
  title.setAttribute("width", "7");
  title.setAttribute("color", "#0F172A");
  title.setAttribute("side", "double");
  slot.appendChild(title);

  const details = document.createElement("a-text");
  details.setAttribute("value", `${asset.category} • ${asset.collisionProfile} • ${asset.bounds.size.join(" × ")} m`);
  details.setAttribute("position", `0 0.34 ${baseDepth / 2 + 0.12}`);
  details.setAttribute("rotation", "-36 0 0");
  details.setAttribute("align", "center");
  details.setAttribute("width", "6.1");
  details.setAttribute("color", "#475569");
  details.setAttribute("side", "double");
  slot.appendChild(details);

  gridEl.appendChild(slot);
}

function startGallery() {
  if (!window.AFRAME || !sceneEl || !gridEl) {
    setStatus("The asset gallery could not initialize because A-Frame or required scene elements are missing.", "error");
    return;
  }

  const counters = { loaded: 0, failed: 0 };
  Promise.all(PLATFORMER_ASSETS.map((asset, index) => addPedestal(asset, index, counters))).catch((error) => {
    setStatus(`Asset gallery setup failed: ${error.message || error}`, "error");
  });
  setStatus(`Loading ${PLATFORMER_ASSETS.length} KayKit glTF pilot assets…`);

  sceneEl.addEventListener("enter-vr", () => document.body.classList.add("vr-active"));
  sceneEl.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));
  window.addEventListener("pagehide", revokePlatformerAssetUrls, { once: true });
}

if (sceneEl && sceneEl.hasLoaded) startGallery();
else if (sceneEl) sceneEl.addEventListener("loaded", startGallery, { once: true });
else setStatus("The gallery scene element is missing.", "error");
