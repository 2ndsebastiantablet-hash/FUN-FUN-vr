export const PLATFORMER_ASSETS = [
  {
    id: "platform-square-blue",
    label: "Platform Square Blue",
    source: "blue/platform_4x4x1_blue.gltf",
    category: "platform",
    role: "standard",
    color: "blue",
    bounds: { min: [-2, 0, -2], max: [2, 1, 2], size: [4, 1, 4] },
    collisionProfile: "box",
    tags: ["core", "landing", "normal-route"],
    galleryScale: 1,
    bytes: 50284,
    sha256: "97e3696956704098c4c57a77aa9965626db1e7b7cd743247b46d34bb0552a115",
    phase: "phase-1-pilot",
    status: "converted-pending-gallery-and-headset",
    runtime: {
      compression: "gzip",
      chunkModules: [
        "./payloads/platform-square-blue-01.js",
        "./payloads/platform-square-blue-02.js",
        "./payloads/platform-square-blue-03.js"
      ],
      mimeType: "model/gltf-binary"
    },
    fileName: "platform-square-blue.glb"
  },
  {
    id: "platform-slope-blue",
    label: "Platform Slope Blue",
    source: "blue/platform_slope_4x4x4_blue.gltf",
    category: "slope",
    role: "ramp",
    color: "blue",
    bounds: { min: [-2, 0, -2], max: [2, 4, 2], size: [4, 4, 4] },
    collisionProfile: "slope",
    tags: ["ramp", "launch", "transition"],
    galleryScale: 1,
    bytes: 51976,
    sha256: "9f749c8ae3c59d76c3b97050a19a856e4cdd4c7d76f1b30b9ce2d03fe7c76d5e",
    phase: "phase-1-pilot",
    status: "converted-pending-gallery-and-headset",
    runtime: {
      compression: "gzip",
      chunkModules: [
        "./payloads/platform-slope-blue-01.js",
        "./payloads/platform-slope-blue-02.js",
        "./payloads/platform-slope-blue-03.js"
      ],
      mimeType: "model/gltf-binary"
    },
    fileName: "platform-slope-blue.glb"
  },
  {
    id: "spring-pad-green",
    label: "Spring Pad Green",
    source: "green/spring_pad_green.gltf",
    category: "mechanic",
    role: "spring-pad",
    color: "green",
    bounds: { min: [-0.75, 0, -0.75], max: [0.75, 1, 0.75], size: [1.5, 1, 1.5] },
    collisionProfile: "trigger-box",
    tags: ["launch", "spring", "interactive"],
    galleryScale: 1,
    bytes: 71536,
    sha256: "fdea3b24df0eb90be29034517bec0a019e6a02b66846825780b00a1c2358db96",
    phase: "phase-1-pilot",
    status: "converted-pending-gallery-and-headset",
    runtime: {
      compression: "gzip",
      chunkModules: [
        "./payloads/spring-pad-green-01.js",
        "./payloads/spring-pad-green-02.js",
        "./payloads/spring-pad-green-03.js",
        "./payloads/spring-pad-green-04.js"
      ],
      mimeType: "model/gltf-binary"
    },
    fileName: "spring-pad-green.glb"
  },
  {
    id: "finish-wide",
    label: "Finish Wide",
    source: "neutral/signage_finish_wide.gltf",
    category: "goal",
    role: "finish-gate",
    color: "neutral",
    bounds: { min: [-4.7, 0, -0.2], max: [4.7, 4.5, 0.3], size: [9.4, 4.5, 0.5] },
    collisionProfile: "trigger-box",
    tags: ["finish", "goal", "checkpoint"],
    galleryScale: 0.8,
    bytes: 96240,
    sha256: "34794b3561c9cb04a60f71a60cc5fd4f50665bbe7a673ae07d7d840b723a2bbc",
    phase: "phase-1-pilot",
    status: "converted-pending-gallery-and-headset",
    runtime: {
      compression: "gzip",
      chunkModules: [
        "./payloads/finish-wide-01.js",
        "./payloads/finish-wide-02.js",
        "./payloads/finish-wide-03.js",
        "./payloads/finish-wide-04.js"
      ],
      mimeType: "model/gltf-binary"
    },
    fileName: "finish-wide.glb"
  }
];

export function getPlatformerAsset(id) {
  return PLATFORMER_ASSETS.find((asset) => asset.id === id) || null;
}
