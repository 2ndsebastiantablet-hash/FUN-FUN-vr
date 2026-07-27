# FUN-FUN VR — KayKit Phase 1 Asset Audit

Phase 1 starts the platforming conversion without replacing the current VR movement test map.

## Uploaded source archive

- File: `KayKit_Platformer_Pack_1.0_FREE.zip`
- Total archive entries inspected: 2,314
- glTF models: 370
- Matching glTF binary buffers: 370
- FBX files: 740
- OBJ files: 388
- MTL files: 388
- PNG textures: 26
- Supplied license: Creative Commons Zero (CC0)

Only glTF assets are being prepared for the WebXR build. FBX and OBJ duplicates are intentionally excluded from the browser pipeline.

## Four-asset pilot

The first pilot deliberately covers four different platforming needs before the full pack is imported:

| Registry ID | Uploaded source | Measured bounds | Planned behavior |
| --- | --- | --- | --- |
| `platform-square-blue` | `Assets/gltf/blue/platform_4x4x1_blue.gltf` | 4 × 1 × 4 m | Standard landing platform with a box collider |
| `platform-slope-blue` | `Assets/gltf/blue/platform_slope_4x4x4_blue.gltf` | 4 × 4 × 4 m | Ramp and launch surface requiring slope-aware collision |
| `spring-pad-green` | `Assets/gltf/green/spring_pad_green.gltf` | 1.5 × 1 × 1.5 m | Spring trigger and launch-mechanic test |
| `finish-wide` | `Assets/gltf/neutral/signage_finish_wide.gltf` | 9.4 × 4.5 × 0.5 m | Finish-gate scale reference and completion trigger |

Each registry entry records its source path, dimensions, role, collision profile, tags, and SHA-256 hashes for the uploaded glTF, binary buffer, and atlas texture.

## Browser hosting approach

The uploaded ZIP remains the source of truth. GitHub Pages cannot read that local archive directly, so the gallery loads the same KayKit glTF structure from a public GitHub mirror pinned to commit:

`ArtjomSchwenk/Koy@8742b69b6d965f369e7b8a87cee570a81184c403`

The mirror is used only as a stable HTTPS transport for the pilot models. The registry preserves hashes from the uploaded archive so the assets can later be moved into this repository or another controlled asset host without changing procedural metadata.

## Asset gallery

Open `asset-gallery.html` to inspect the pilot pieces:

- Desktop: WASD and mouse
- Meta Quest Browser: press the standard A-Frame **Enter VR** button
- Every model has a labeled pedestal showing its role, collision profile, and dimensions
- Model-load failures are surfaced in the status panel

## What Phase 1 does not do yet

- The current game map is not replaced.
- The gallery pieces are visual inspection models, not active gameplay pieces.
- The slope collider, spring behavior, finish trigger, checkpoints, and procedural module generator belong to later phases.
- Quest scale, texture loading, and performance still require a physical headset check.

## Phase 1 exit criteria

The pilot is ready to move into the mechanics course after all four models:

1. load without errors on GitHub Pages,
2. show the correct texture,
3. appear at believable real-world scale in Quest,
4. maintain acceptable rendering performance, and
5. match the dimensions recorded in the registry.
