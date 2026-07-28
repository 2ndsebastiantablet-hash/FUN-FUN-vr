# Phase 3 — Batched Hazard Laboratory

This laboratory accelerates physical Meta Quest testing by grouping four related systems into one isolated route while keeping all of them outside calibration, generated courses, and multiplayer.

## Systems in this batch

1. **Damage volume** — a bright red spike strip that immediately returns the player to the latest checkpoint.
2. **Explosive launch hazard** — a proximity bomb with a visible orange fuse warning and exaggerated horizontal/upward launch force.
3. **Collapsing bridge** — six wooden bridge sections that begin collapsing in a rapid chain when the first section is stepped on.
4. **Respawn presentation** — a headset-fixed color flash that explains damage resets, out-of-bounds recovery, explosions, and bridge activation.

## Route structure

- Eight solid KayKit platform pieces plus one finish gate.
- One red damage strip.
- One proximity bomb.
- Six collapsing bridge pieces.
- Three checkpoints.
- Twenty-two active locomotion colliders at startup.
- One finish trigger.

## Damage strip rules

- The red strip spans most of the platform width and must be jumped.
- Touching the strip immediately calls the lab safety reset.
- The hazard volume is centered around the Gorilla locomotion rig origin while the visible spikes remain aligned to the platform surface.
- Damage resets produce a red headset flash.

## Bomb rules

- The bomb arms when the player enters its proximity radius.
- An orange floor ring pulses during the 520 ms fuse.
- Detonation applies 24 m/s horizontal launch speed and 12 m/s upward speed.
- The direction points away from the bomb.
- If the player is centered exactly on the bomb, a deterministic forward fallback direction is used.
- The bomb has a cooldown and automatically returns to its idle appearance.
- Leaving the arena triggers checkpoint recovery.

## Collapsing bridge rules

- Stepping on the first supported bridge piece begins one shared collapse chain.
- Six pieces collapse with a 110 ms delay between neighboring pieces.
- Each piece shows a yellow warning, loses collision, accelerates downward, hides, and rebuilds.
- The full bridge restores when the lab restarts.
- Falling from the bridge returns the player to checkpoint two; reaching the far landing activates checkpoint three.

## Respawn feedback rules

- Damage reset: red flash.
- Out-of-bounds recovery: blue flash.
- Explosion: orange flash.
- Bridge activation: brief amber flash.
- The flash is attached to the player camera, fades rapidly, and never changes locomotion state.

## Quest playtest checklist

### Damage

- Touch the red strip and confirm an immediate checkpoint reset.
- Confirm the red flash is visible but not painfully bright or long.
- Jump over the strip and confirm no false reset occurs.
- Confirm touching near the outer visible spike edge still matches the hazard volume.

### Bomb

- Approach the bomb and confirm the orange warning ring appears.
- Confirm the fuse gives a readable but short warning.
- Confirm detonation launches the player strongly away from the bomb.
- Confirm the launch has both horizontal and upward force.
- Confirm the bomb can be avoided by staying on the safe side of the platform.
- Confirm leaving the arena returns the player to the latest checkpoint.
- Confirm the bomb resets correctly when Restart Lab is pressed.

### Bridge

- Step on the first bridge piece and confirm the entire bridge begins collapsing in order.
- Confirm the 110 ms chain is visually readable but fast enough to require immediate movement.
- Confirm each visible plank and its collision disappear together.
- Confirm the bridge rebuilds automatically.
- Confirm Restart Lab immediately restores every piece.
- Confirm falling returns to checkpoint two and reaching the far platform activates checkpoint three.

### Respawn presentation and performance

- Confirm every reset reason has a clearly visible flash.
- Confirm the flash remains fixed to the headset view without lagging behind head movement.
- Confirm repeated resets do not leave the screen tinted.
- Confirm frame rate remains stable during the bomb blast and full six-piece bridge collapse.
- Confirm all earlier locomotion behavior remains unchanged.

## Remaining isolated mechanic

After this batch passes, the only remaining planned functional mechanic laboratory is the controlled pushable-object system. It will avoid unrestricted browser physics and instead use deterministic hand-contact movement suitable for Quest and later multiplayer synchronization.

## Post-lab integration sequence

After the pushable-object laboratory also passes:

1. Lock all Quest-tested mechanic values.
2. Expand the KayKit structural asset and collision registry.
3. Build the larger beginner/intermediate/advanced procedural module library.
4. Add only approved mechanics to generated modules.
5. Repair and harden the primary calibration/generated startup path.
6. Add authoritative host course manifests and synchronized mechanic state for multiplayer.
7. Add pooling, culling, animation-distance limits, and long-session Quest performance tests.
