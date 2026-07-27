# FUN-FUN VR

A static WebXR platforming game for Meta Quest Browser using A-Frame, plain JavaScript, Gorilla Tag-style hand locomotion, WebRTC peer-to-peer multiplayer, and KayKit platforming assets.

## Movement source

The movement system remains based on the exact pinned template requested for this project:

- Repository: `2ndsebastiantablet-hash/feeble`
- Commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- Folder: `templates/gorilla-tag-locomotion`

The game still loads the original `gorilla-locomotion.js` from that immutable commit. `platformer-course.js` adds a small platform-surface extension rather than replacing the source movement system. The extension lets the original launch logic recognize the tops of box-based course pieces as floor-like pushing surfaces.

## KayKit platforming conversion

The uploaded `KayKit_Platformer_Pack_1.0_FREE.zip` is the source of truth for the game’s platforming art.

The current live map is the first handcrafted mechanics course. It uses the Phase 1 pilot pieces to test the systems that procedural modules will later require:

- repeated blue landing platforms
- a large blue slope with ten hidden collision steps
- a green spring pad with automatic upward and forward launch
- two checkpoint triggers
- fall detection and checkpoint respawning
- a scaled finish gate and local completion timer
- visible wireframe fallbacks if a model fails while course collisions remain active

The run begins when the player leaves the starting platform. Falling below or outside the course returns the player to the most recently activated checkpoint. The course records a local best time in the browser.

### Why the slope uses stepped collision

The pinned locomotion template supports axis-aligned box colliders. The visible KayKit ramp is therefore backed by ten narrow box steps. The original four-meter-tall mesh is visually compressed to the course’s two-meter rise so it aligns with the approach and checkpoint platforms. This keeps the source movement component intact while providing a stable first approximation of a sloped push surface. A later collision phase can replace this with a dedicated slope solver after headset testing establishes the desired feel.

### Course manifest

`platformer-course.js` contains a versioned handcrafted manifest:

- version: `mechanics-course-v1`
- seed label: `PHASE-2-HANDCRAFTED`
- eleven placed visual pieces
- nineteen locomotion collision boxes
- two checkpoints
- one spring launcher
- one finish trigger

This manifest is intentionally deterministic and will become the reference course for calibrating procedural-generation limits.

## Asset gallery

The separate gallery remains available at:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/asset-gallery.html`

It displays the four pilot assets on labeled pedestals for desktop and Quest scale inspection.

## Peer-to-peer multiplayer

The current build supports private rooms for up to four players.

- one player creates a room and receives a six-character code
- other players join with that code before pressing **Enter VR**
- PeerJS handles discovery and signaling
- head and hand poses travel directly between browsers through WebRTC data channels
- remote players appear as a head, body, two hands, and name label
- pose updates are sent about 15 times per second
- the room uses a small full-mesh layout
- the host closes the room when leaving

### Multiplayer hardening

The multiplayer layer includes:

- connection timeouts
- heartbeat packets and stale-peer removal
- incoming pose bounds and quaternion validation
- message-size and type limits
- protocol-version checks
- host-only room-control trust
- duplicate connection cleanup
- recovery for signaling interruptions
- isolated multiplayer errors so solo VR can remain usable
- a **Run Solo Network Test** button

### Current multiplayer limitation

The mechanics course is deterministic and appears identically for every player, but course state is still local. Checkpoint activation, spring events, timers, best times, and finish state are not synchronized between players yet. Shared course state belongs to the later multiplayer procedural-synchronization phase.

The static build uses public STUN servers but no dedicated TURN relay, so unusually restrictive networks may still block direct WebRTC connections.

## VR safety and recovery

The current build includes:

- startup checks for locomotion, platform extensions, course pieces, and collision surfaces
- HTTPS and immersive-VR support checks
- controller-pose stabilization after entering VR
- automatic reset after falling or leaving the course bounds
- checkpoint-aware respawning
- motion clearing after tab visibility changes and VR exits
- model-load fallbacks
- desktop camera-height compensation
- separate course and multiplayer error reporting

## Project files

- `index.html` — live platforming course, VR rig, room UI, course UI, and scene shell
- `platformer-course.js` — course manifest, KayKit model placement, colliders, slope support, spring, checkpoints, finish, timer, and restart flow
- `course-calibration.js` — visual-only ramp scaling that aligns the original mesh with the two-meter course rise
- `main.js` — VR preflight, controller status, lifecycle handling, fall safety, and checkpoint integration
- `multiplayer.js` — PeerJS room flow, connection mesh, pose sync, remote avatars, and disconnect handling
- `multiplayer-hardening.js` — validation, timeouts, heartbeat checks, recoverable-error handling, and solo diagnostics
- `asset-gallery.html` / `asset-gallery.js` — separate KayKit scale inspection scene
- `assets/platformer/registry.js` — asset IDs, pinned URLs, bounds, checksums, tags, collision profiles, and live-course calibration loader
- `assets/platformer/bundle.js` — asset URL resolver
- `assets/platformer/KAYKIT_LICENSE.txt` — preserved KayKit license notice
- `PHASE_1_ASSET_AUDIT.md` — archive inventory and pilot asset decisions
- `PHASE_2_MECHANICS_COURSE.md` — deterministic course geometry, movement adaptation, spring values, and reset rules
- `PLAYTEST_CHECKLIST.md` — ordered Quest, platforming, safety, and multiplayer test procedure

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
