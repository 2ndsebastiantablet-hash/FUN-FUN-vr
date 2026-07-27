# FUN-FUN VR

A static WebXR game for Meta Quest Browser using A-Frame, plain JavaScript, Gorilla Tag-style hand locomotion, WebRTC peer-to-peer multiplayer, and a phased KayKit platforming conversion.

## Movement source

The movement system is based on the exact pinned template requested for this project:

- Repository: `2ndsebastiantablet-hash/feeble`
- Commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- Folder: `templates/gorilla-tag-locomotion`

The game loads the template's original `gorilla-locomotion.js` from a commit-pinned jsDelivr URL. The scene wiring and playtest safety code adapt that source without replacing its hand push, bounce, launch, gravity, drag, controller tracking, or collision behavior.

## KayKit platforming conversion — Phase 1 pilot

The uploaded `KayKit_Platformer_Pack_1.0_FREE.zip` has been audited and registered as the source of truth for the future platforming map.

The first pilot prepares four representative pieces without replacing the current movement-test map:

- standard blue landing platform
- large blue slope/ramp
- green spring pad
- wide finish gate

Open the hosted asset gallery at:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/asset-gallery.html`

The gallery supports desktop inspection and the standard A-Frame **Enter VR** button. It displays each pilot model on a labeled pedestal with its category, planned collision profile, and measured dimensions.

The asset registry records source paths, roles, bounds, tags, and SHA-256 hashes from the uploaded archive. The pilot models are delivered from an HTTPS GitHub mirror pinned to an immutable commit; the uploaded ZIP remains authoritative. See `PHASE_1_ASSET_AUDIT.md` for the complete audit and exit criteria.

Phase 1 intentionally does not add final collisions, spring behavior, checkpoints, finish logic, procedural generation, or replace the live map. Those systems begin after the four pilot pieces pass visual and scale inspection.

## Peer-to-peer multiplayer

The current build supports private rooms for up to four players.

- one player creates a room and receives a six-character code
- other players enter that code and join before pressing **Enter VR**
- PeerJS handles connection discovery and signaling
- head and hand poses travel directly between browsers through WebRTC data channels
- each remote player appears as a head, body, two hands, and name label
- pose updates are sent about 15 times per second and smoothed between updates
- the room uses a small full-mesh layout so every player connects directly to every other player
- the host closes the room when leaving

## Multiplayer hardening and diagnostics

The multiplayer pass adds safeguards for issues that commonly appear only during a multi-device test:

- 12-second timeouts for connections that never finish opening
- heartbeat packets and removal of unresponsive peer connections
- bounds and quaternion validation for incoming poses
- an 8 KB message-size limit and an allowlist of protocol message types
- protocol-version checks before accepting another player's data
- host-only trust for room-control messages such as room closure, rejection, and peer-list changes
- duplicate pending-connection cleanup
- recoverable signaling errors no longer destroy already-working player connections
- a failed mesh connection no longer disconnects the entire room
- remote name labels render from both sides
- multiplayer failures are reported separately so single-player VR can still be used

A **Run Solo Network Test** button is added below the room controls. It creates two temporary PeerJS clients in one browser, opens a real WebRTC data channel, exchanges a ping/pong packet, verifies remote-avatar creation, then cleans everything up. Run this while not connected to a room.

Passing the solo test verifies the local browser, PeerJS signaling, WebRTC data exchange, and avatar-rendering path. It does not replace a later test with two separate Quest headsets and two different networks.

## Known multiplayer limitations

- This version synchronizes avatars only. Physics objects, scores, voice chat, and shared game rules are not synchronized yet.
- The static build uses public STUN servers but no dedicated TURN relay. WebRTC may still fail on unusually restrictive school, business, carrier, or guest networks.
- A room exists only while its host keeps the page open. There is no host migration yet.
- Room controls are browser UI, so players should create or join before entering VR.
- No automated test can fully reproduce two physical Quest headsets, controller tracking, and real network conditions.

## Pre-playtest hardening

The VR build includes:

- startup checks for the pinned locomotion script and collision components
- HTTPS and immersive-VR support checks
- visible readiness and error messages before entering VR
- left and right Quest controller connection status in the scene
- a controller-pose stabilization delay when VR starts
- desktop camera-height compensation without changing headset height in VR
- safety rails around the movement area
- automatic reset if the player position becomes invalid or leaves the area
- velocity clearing after visibility changes and VR exits

## Preserved movement features

- tracked Quest controllers
- visible hand spheres
- hand pushing against the floor and box surfaces
- one-hand and two-hand launch behavior
- upward bounce from strong pushes
- gravity
- separate air and ground drag
- floor clamping
- hand collision and player body collision
- normal A-Frame Enter VR button
- no thumbstick locomotion
- no teleport locomotion

## Project files

- `index.html` — playable scene, VR rig, room UI, controller setup, colliders, status text, and remote-player container
- `main.js` — VR preflight, controller status, lifecycle handling, safety reset, and multiplayer error isolation
- `multiplayer.js` — PeerJS room flow, connection mesh, pose sync, remote avatars, and disconnect handling
- `multiplayer-hardening.js` — validation, connection timeouts, heartbeat checks, recoverable-error handling, and solo diagnostics
- `asset-gallery.html` — separate desktop/VR inspection scene for Phase 1 platforming assets
- `asset-gallery.js` — gallery construction and model-load reporting
- `assets/platformer/registry.js` — asset IDs, source paths, URLs, bounds, checksums, tags, and planned collision profiles
- `assets/platformer/bundle.js` — small asset URL resolver used by the gallery and future map code
- `assets/platformer/KAYKIT_LICENSE.txt` — preserved KayKit license notice
- `PHASE_1_ASSET_AUDIT.md` — archive inventory, pilot decisions, hosting method, and Phase 1 exit criteria
- `PLAYTEST_CHECKLIST.md` — recommended solo, movement, and later multi-headset test order
- `.nojekyll` — keeps GitHub Pages serving the static files directly

## Solo multiplayer test

1. Open the GitHub Pages HTTPS site in a normal browser or Meta Quest Browser.
2. Do not create or join a room.
3. Press **Run Solo Network Test**.
4. Wait for the status to report that signaling, WebRTC data exchange, and avatar rendering passed.
5. If it fails, copy the exact error before refreshing.

## Create and join a real room later

1. Open the GitHub Pages HTTPS URL on each Quest.
2. On the first Quest, enter a player name and press **Create Room**.
3. Share the displayed six-character code.
4. On every other Quest, enter a different name and the room code, then press **Join**.
5. Confirm the player count increases on every connected device.
6. Press **Enter VR** on each Quest.
7. Wait for both local hand spheres and all remote avatars to appear.

## Hosting

GitHub Pages should remain configured as:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

## Technical notes

- A-Frame 1.7.0
- PeerJS 1.5.5
- WebXR local-floor reference space
- HTTPS required for immersive WebXR and WebRTC
- no npm
- no bundler
- no build step
