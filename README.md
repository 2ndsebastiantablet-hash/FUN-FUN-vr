# FUN-FUN VR

A static WebXR platforming game for Meta Quest Browser using A-Frame, plain JavaScript, Gorilla Tag-style hand locomotion, WebRTC peer-to-peer multiplayer, KayKit platforming assets, seeded course generation, checkpoints, run grading, optional collectibles, and an expanding mechanics laboratory.

## Movement source

The movement system remains based on the exact pinned template requested for this project:

- Repository: `2ndsebastiantablet-hash/feeble`
- Commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- Folder: `templates/gorilla-tag-locomotion`

The game loads the original `gorilla-locomotion.js` from that immutable commit. The platforming runtimes add platform-top support, checkpoints, springs, finish triggers, safety behavior, grounded anti-slide braking, comfort height tuning, and supported moving-platform carry without replacing the template's hand pushing, launch averaging, bounce, gravity, air drag, or controller tracking.

## Current player comfort values

- rig Y above platform base: `0.12 m`
- player height offset: `0.88 m`
- body radius: `0.32 m`
- body height: `1.20 m`
- idle stop threshold: `0.42 m/s`
- grounded braking strength: `9.5`

The same height is applied to initial spawns, checkpoints, restarts, fall recovery, generated maps, mechanics-lab spawns, and VR re-entry.

## Course modes

### Calibration course

The repository root remains the handcrafted mechanics course:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/`

It is the stable reference route for measuring hand-push strength, gap distance, ramp feel, spring strength, checkpoint recovery, camera height, and Quest performance.

### Generated course

The generated entry assembles a validated route from a reproducible seed:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/generated.html?mode=generated&seed=FUNFUN01`

The same normalized seed produces the same module list, platform positions, checkpoints, spring sequence, finish gate, safety bounds, shard locations, and map checksum under generator version `module-generator-v1`.

### Moving-platform mechanics lab

Dynamic platform behavior is tested separately before it is allowed into generated maps:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/mechanics-lab.html`

The first lab contains:

- a forward/back shuttle,
- a vertical lift,
- a side-to-side shuttle,
- two checkpoints,
- a finish gate,
- ten visible KayKit pieces,
- eighteen moving or static locomotion colliders.

Yellow rings identify moving platforms. Their motion is deterministic, eases to zero speed at endpoints, and carries a supported player without converting platform displacement into a fake controller push. Deliberate jumps and locomotion velocity remain controlled by the pinned Gorilla movement component.

Moving platforms are not yet part of procedural generation or multiplayer courses. Physical Quest validation comes first. See `PHASE_3A_MOVING_PLATFORM_LAB.md`.

## Procedural module foundation

The current conservative module library contains:

- straight platform
- left and right side steps
- gentle rise
- left and right rising steps
- gentle drop
- required spring rise
- two checkpoint positions
- finish platform and finish gate

Every generated manifest is rejected unless it passes checks for unique IDs, forward progress, lateral limits, height limits, gap limits, checkpoint order, spring presence, finish presence, and expected collision count.

The generated route currently contains:

- 10 visible KayKit pieces
- 18 locomotion colliders
- 2 checkpoints
- 1 spring launcher
- 1 finish trigger
- 3 optional energy shards
- a per-seed local timer and best time
- a map checksum for bug reproduction

See `PHASE_3_PROCEDURAL_MODULES.md` for generation rules.

## Collectibles and full clears

Every course receives three yellow energy shards derived from the course manifest. They are placed above safe early, middle, and late landing platforms. They are visual triggers only and add no locomotion colliders.

- collection uses the tracked head position
- restarting restores all shards
- shard progress appears in the run-performance line
- collecting all three adds **FULL CLEAR** to the completion result
- the same generated seed receives the same shard positions

Fall grades remain `S`, `A`, `B`, `C`, or `CLEAR` based on the number of recoveries. See `PHASE_5_CAMERA_TUNING_AND_COLLECTIBLES.md` for the current rules.

## KayKit assets

The uploaded `KayKit_Platformer_Pack_1.0_FREE.zip` remains the art source of truth. The current runtime uses the registered pilot assets:

- blue landing platform
- blue slope in calibration mode
- green spring pad
- wide finish gate

The separate inspection gallery remains available at:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/asset-gallery.html`

## Multiplayer

Private PeerJS/WebRTC rooms support up to four players. Head and hand poses are synchronized and remote players appear in the shared world.

For generated multiplayer, every device must open the exact same generated course link before creating or joining the room. The map and shard placement are deterministic, but course state remains local. Checkpoints, collected shards, spring events, timers, finish state, and best times are not yet network-authoritative.

The moving-platform lab is currently solo. A later multiplayer phase must provide a shared obstacle timestamp before moving platforms can appear synchronized across headsets.

The existing multiplayer hardening remains in place, including timeouts, heartbeat packets, stale-peer cleanup, pose validation, protocol checks, host-only room control, duplicate-connection cleanup, recoverable signaling behavior, and the solo WebRTC diagnostic.

## Safety and recovery

The playable course entries retain:

- normal A-Frame **Enter VR**
- Quest controller tracking
- hand-push locomotion
- gravity and drag
- grounded anti-slide stopping
- fall detection
- checkpoint-aware respawning
- motion clearing after resets and VR exits
- model-load fallbacks
- HTTPS and immersive-VR checks

## Important project files

- `index.html` — calibration entry and course-selection controls
- `generated.html` — generated-course entry
- `mechanics-lab.html` — moving-platform Quest test entry
- `mechanics-lab.js` — lab manifest, rendering, safety, checkpoints, timing, and finish flow
- `moving-platform.js` — deterministic platform motion, supported-player carry, and controller-history compensation
- `comfort-fixes.js` — camera height, body alignment, spring detection, and grounded stopping
- `collectibles.js` — deterministic shard placement, collection triggers, reset behavior, and world status
- `run-progression.js` — falls, checkpoints, shard progress, grades, full clears, and local clean-run records
- `course-selector.js` — mode, seed, navigation, and link-copy controls
- `course-modules.js` — deterministic generator, validation, URLs, checksums, and module metadata
- `platformer-course.js` — handcrafted calibration course
- `generated-course.js` — generated manifest rendering, models, colliders, checkpoints, timing, and restart flow
- `generated-components.js` — platform support, spring, checkpoint, and finish A-Frame components
- `main.js` — VR preflight, controller status, safety resets, and lifecycle handling
- `multiplayer.js` / `multiplayer-hardening.js` — room flow and network safeguards
- `tests/course-generator.test.mjs` — validates 2,000 seeds
- `tests/generated-bootstrap.test.mjs` — verifies generated browser bootstrapping
- `tests/comfort-progression.test.mjs` — validates comfort values, anti-slide behavior, and run grading
- `tests/collectibles.test.mjs` — validates shard placement across generated seeds
- `tests/moving-platform.test.mjs` — validates motion timing, support detection, carry, and lab structure
- `.github/workflows/validate.yml` — automatic syntax, generator, gameplay, mechanics, and HTML checks

## Hosting

GitHub Pages should remain configured as:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

## Technical notes

- A-Frame 1.7.0
- PeerJS 1.5.5
- WebXR `local-floor` reference space
- HTTPS required for immersive WebXR and WebRTC
- no npm
- no bundler
- no build step
