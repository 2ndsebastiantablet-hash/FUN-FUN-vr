# FUN-FUN VR

A static WebXR platforming game for Meta Quest Browser using A-Frame, plain JavaScript, Gorilla Tag-style hand locomotion, WebRTC peer-to-peer multiplayer, and KayKit platforming assets.

## Movement source

The movement system remains based on the exact pinned template requested for this project:

- Repository: `2ndsebastiantablet-hash/feeble`
- Commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- Folder: `templates/gorilla-tag-locomotion`

The game loads the original `gorilla-locomotion.js` from that immutable commit. The platforming runtimes add platform-top support, checkpoints, springs, finish triggers, and safety behavior without replacing the template's hand pushing, launch averaging, bounce, gravity, drag, or controller tracking.

## Course modes

### Calibration course

The repository root remains the handcrafted Phase 2 mechanics course:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/`

It is the stable reference route for measuring hand-push strength, gap distance, ramp feel, spring strength, checkpoint recovery, and Quest performance.

### Generated course

The generated entry assembles a validated route from a reproducible seed:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/generated.html?mode=generated&seed=FUNFUN01`

Use the course controls to select **Generated**, enter a seed, create a random seed, load the route, or copy its exact link. Changing mode or seed reloads the page and leaves any active multiplayer room.

The same normalized seed produces the same module list, platform positions, checkpoints, spring sequence, finish gate, safety bounds, and map checksum under generator version `module-generator-v1`.

## Procedural module foundation

The first procedural library intentionally uses conservative modules:

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
- a per-seed local timer and best time
- a map checksum for bug reproduction

See `PHASE_3_PROCEDURAL_MODULES.md` for the rules and current limitations.

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

For generated multiplayer, every device must open the exact same generated course link before creating or joining the room. The map is deterministic, but course selection and course state are still local in this phase. Checkpoints, spring events, timers, finish state, and best times are not yet network-authoritative.

The existing multiplayer hardening remains in place, including timeouts, heartbeat packets, stale-peer cleanup, pose validation, protocol checks, host-only room control, duplicate-connection cleanup, recoverable signaling behavior, and the solo WebRTC diagnostic.

## Safety and recovery

Both course modes retain:

- normal A-Frame **Enter VR**
- Quest controller tracking
- hand-push locomotion
- gravity and drag
- fall detection
- checkpoint-aware respawning
- motion clearing after resets and VR exits
- model-load fallbacks
- HTTPS and immersive-VR checks
- isolated multiplayer errors

## Important project files

- `index.html` — calibration entry and course-selection controls
- `generated.html` — generated-course entry
- `course-selector.js` — mode, seed, random-seed, navigation, and link-copy controls
- `course-modules.js` — deterministic generator, validation, URLs, checksums, and module metadata
- `platformer-course.js` — handcrafted calibration course
- `generated-course.js` — generated manifest rendering, models, colliders, checkpoints, timing, and restart flow
- `generated-components.js` — platform support, spring, checkpoint, and finish A-Frame components
- `main.js` — VR preflight, controller status, safety resets, and lifecycle handling
- `multiplayer.js` / `multiplayer-hardening.js` — room flow and network safeguards
- `tests/course-generator.test.mjs` — validates 2,000 seeds
- `tests/generated-bootstrap.test.mjs` — verifies generated browser bootstrapping
- `.github/workflows/validate.yml` — automatic syntax, generator, bootstrap, and HTML checks

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
