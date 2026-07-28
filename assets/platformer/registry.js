const MIRROR_BASE = "https://cdn.jsdelivr.net/gh/ArtjomSchwenk/Koy@8742b69b6d965f369e7b8a87cee570a81184c403/Assets/Imports/KayKit_Platformer_Pack_1.0_FREE/Assets/gltf";

export const PLATFORMER_ASSETS = [
  {
    id: "platform-square-blue",
    label: "Platform Square Blue",
    source: "Assets/gltf/blue/platform_4x4x1_blue.gltf",
    url: `${MIRROR_BASE}/blue/platform_4x4x1_blue.gltf`,
    category: "platform",
    role: "standard",
    color: "blue",
    bounds: { min: [-2, 0, -2], max: [2, 1, 2], size: [4, 1, 4] },
    collisionProfile: "box",
    tags: ["core", "landing", "normal-route"],
    galleryScale: 1,
    sourceChecksums: {
      gltf: "01b8767fb100e7ec7b0e597bd6754f110d8e48281a1a76c0e10cc2bf3521b617",
      bin: "e5fd1e9a14fb5f86f6c1190c23ed372932d098cadcc6d1d00d74b3a12484aaf1",
      texture: "2771a7c3f7fd59bcba08dc967858942d9f83820ecc9146e98d25707a07210273"
    },
    phase: "phase-1-pilot",
    status: "gallery-ready-pending-headset"
  },
  {
    id: "platform-slope-blue",
    label: "Platform Slope Blue",
    source: "Assets/gltf/blue/platform_slope_4x4x4_blue.gltf",
    url: `${MIRROR_BASE}/blue/platform_slope_4x4x4_blue.gltf`,
    category: "slope",
    role: "ramp",
    color: "blue",
    bounds: { min: [-2, 0, -2], max: [2, 4, 2], size: [4, 4, 4] },
    collisionProfile: "slope",
    tags: ["ramp", "launch", "transition"],
    galleryScale: 1,
    sourceChecksums: {
      gltf: "5b312acb0071bcd2d1c5d55021126240872ec7099dd151dacd8bd22345a64507",
      bin: "c3a99a943b8c120159e9e0d23b52148ee879ab88dc65b6c6e9474b54f9da29a4",
      texture: "2771a7c3f7fd59bcba08dc967858942d9f83820ecc9146e98d25707a07210273"
    },
    phase: "phase-1-pilot",
    status: "gallery-ready-pending-headset"
  },
  {
    id: "spring-pad-green",
    label: "Spring Pad Green",
    source: "Assets/gltf/green/spring_pad_green.gltf",
    url: `${MIRROR_BASE}/green/spring_pad_green.gltf`,
    category: "mechanic",
    role: "spring-pad",
    color: "green",
    bounds: { min: [-0.75, 0, -0.75], max: [0.75, 1, 0.75], size: [1.5, 1, 1.5] },
    collisionProfile: "trigger-box",
    tags: ["launch", "spring", "interactive"],
    galleryScale: 1,
    sourceChecksums: {
      gltf: "2f9a6b171bffecdbe66488c97969fff42781e4e462c80a22548dc05a2f969a5a",
      bin: "eeab919eac99f1d23911634ea875d48e21096b53d897abbc102107badbc9a777",
      texture: "2771a7c3f7fd59bcba08dc967858942d9f83820ecc9146e98d25707a07210273"
    },
    phase: "phase-1-pilot",
    status: "gallery-ready-pending-headset"
  },
  {
    id: "finish-wide",
    label: "Finish Wide",
    source: "Assets/gltf/neutral/signage_finish_wide.gltf",
    url: `${MIRROR_BASE}/neutral/signage_finish_wide.gltf`,
    category: "goal",
    role: "finish-gate",
    color: "neutral",
    bounds: { min: [-4.7, 0, -0.2], max: [4.7, 4.5, 0.3], size: [9.4, 4.5, 0.5] },
    collisionProfile: "trigger-box",
    tags: ["finish", "goal", "checkpoint"],
    galleryScale: 0.8,
    sourceChecksums: {
      gltf: "aa088fa3fc24da03f326a017cd11b1978f5b937336b3c0e4ae5527010041ddcf",
      bin: "6c5beddf3a2929ea750e19752acd1975a0779b7c2e880b1795a537e345b76c6e",
      texture: "2771a7c3f7fd59bcba08dc967858942d9f83820ecc9146e98d25707a07210273"
    },
    phase: "phase-1-pilot",
    status: "gallery-ready-pending-headset"
  },
  {
    id: "arch-blue",
    label: "KayKit Arch Blue",
    source: "Assets/gltf/blue/arch_blue.gltf",
    url: `${MIRROR_BASE}/blue/arch_blue.gltf`,
    category: "structure",
    role: "arch",
    color: "blue",
    bounds: { min: [-1.875, 0, -0.375], max: [1.875, 3.7, 0.375], size: [3.75, 3.7, 0.75] },
    collisionProfile: "paired-arch",
    tags: ["arch", "opening", "collision-twin", "structural"],
    galleryScale: 1,
    phase: "phase-3-structure",
    status: "quest-test-pending"
  },
  {
    id: "hoop-blue",
    label: "KayKit Hoop Blue",
    source: "Assets/gltf/blue/hoop_blue.gltf",
    url: `${MIRROR_BASE}/blue/hoop_blue.gltf`,
    category: "structure",
    role: "hoop",
    color: "blue",
    bounds: { min: [-1.7, 0, -0.375], max: [1.7, 4.7, 0.375], size: [3.4, 4.7, 0.75] },
    collisionProfile: "paired-hoop",
    tags: ["hoop", "opening", "collision-twin", "push-goal"],
    galleryScale: 0.8,
    phase: "phase-3-structure",
    status: "quest-test-pending"
  },
  {
    id: "pipe-straight-blue",
    label: "KayKit Straight Pipe Blue",
    source: "Assets/gltf/blue/pipe_straight_A_blue.gltf",
    url: `${MIRROR_BASE}/blue/pipe_straight_A_blue.gltf`,
    category: "structure",
    role: "pipe-tunnel",
    color: "blue",
    bounds: { min: [-1, 0, -1], max: [1, 2, 1], size: [2, 2, 2] },
    collisionProfile: "paired-pipe",
    tags: ["pipe", "tunnel", "collision-twin", "structural"],
    galleryScale: 1,
    phase: "phase-3-structure",
    status: "quest-test-pending"
  }
];

export const PLATFORMER_ASSET_SOURCE = {
  uploadedArchive: "KayKit_Platformer_Pack_1.0_FREE.zip",
  mirrorRepository: "ArtjomSchwenk/Koy",
  mirrorCommit: "8742b69b6d965f369e7b8a87cee570a81184c403",
  note: "The uploaded archive remains the source of truth. The pinned public mirror is used only to serve the same glTF files to GitHub Pages."
};

export function getPlatformerAsset(id) {
  return PLATFORMER_ASSETS.find((asset) => asset.id === id) || null;
}

// The live course needs one visual-only ramp calibration. The gallery does not.
if (typeof document !== "undefined" && document.getElementById("course-root")) {
  import("../../course-calibration.js").catch(function (error) {
    window.dispatchEvent(new CustomEvent("course-asset-error", {
      detail: {
        pieceId: "slope-platform",
        assetId: "platform-slope-blue",
        message: `Ramp calibration failed to load: ${error && error.message ? error.message : error}`
      }
    }));
  });
}
