# FUN-FUN VR — Phase 3A Moving Platform Laboratory

## Purpose

This phase implements the first reusable dynamic platforming mechanic from the original project plan. Moving platforms are being validated in a controlled laboratory before they are permitted inside seeded procedural courses.

The working calibration and generated routes remain unchanged during this phase.

## Laboratory entry

`mechanics-lab.html`

Published URL after deployment:

`https://2ndsebastiantablet-hash.github.io/FUN-FUN-vr/mechanics-lab.html`

## Test route

The laboratory contains ten visible KayKit pieces and eighteen locomotion colliders:

1. Start platform
2. Waiting platform
3. Forward shuttle
4. Shuttle landing and checkpoint 1
5. Lift approach
6. Vertical lift
7. Upper landing and checkpoint 2
8. Side shuttle
9. Finish platform
10. Finish gate

Three yellow-ringed platforms demonstrate the reusable mechanic:

- **Forward shuttle:** travels 4.2 meters along negative Z in 3.6 seconds per direction.
- **Vertical lift:** travels 3 meters upward and downward in 4 seconds per direction.
- **Side shuttle:** travels 4.8 meters along X in 3.3 seconds per direction.

## Motion rules

`moving-platform.js` uses deterministic ping-pong motion calculated from scene time rather than accumulating frame-by-frame position. The same time input therefore produces the same platform position.

Motion uses smoothstep easing. Platform speed reaches zero at each endpoint instead of reversing abruptly, reducing the chance of throwing or disorienting a standing VR player.

## Player carry behavior

A player is carried only when the Gorilla-locomotion body capsule is resting on one of the moving platform's box colliders.

When carrying the player, the mechanic moves:

- the player rig,
- current tracked head and hand world positions,
- previous tracked hand world positions,
- resolved hand positions.

Shifting previous controller positions by the platform displacement prevents the platform's own motion from being interpreted as a hand push on the following locomotion update.

The mechanic does not overwrite:

- horizontal or vertical locomotion velocity,
- launch velocity,
- gravity,
- air drag,
- Gorilla push history,
- controller tracking.

A deliberate upward launch is not carried once its vertical velocity exceeds the supported carry threshold.

## Collision behavior

Visible KayKit models and invisible box colliders remain separate. Colliders are children of each moving platform root, so the collision surfaces travel with the visual model.

The laboratory uses the existing:

- pinned Gorilla locomotion component,
- platform-top surface extension,
- comfort-height settings,
- grounded anti-slide braking,
- checkpoint triggers,
- finish trigger.

No changes are made to the pinned source movement system.

## Reset and recovery

Restarting the laboratory:

- resets all moving platforms to their defined starting positions,
- clears checkpoint and finish triggers,
- clears locomotion velocity and launch history,
- returns the player to the starting spawn.

Falling returns the player to the most recent laboratory checkpoint. Moving platforms continue their deterministic cycle after a fall so the player may need to wait before boarding again.

## Procedural-generation status

Moving platforms are **not yet included in generated maps**. They will enter the module library only after physical Quest testing confirms:

1. standing players remain attached without visible slipping,
2. platform motion does not cause fake pushes,
3. jumping from a moving platform preserves intentional momentum,
4. vertical movement does not clip the player into a platform,
5. checkpoint resets remain safe,
6. motion feels comfortable at the selected speeds,
7. Quest frame rate remains stable.

## Multiplayer status

The current laboratory is solo. The motion function is deterministic and designed for later synchronization, but shared platform timing is not yet network-authoritative.

Before moving platforms enter multiplayer courses, the host will need to send a shared course start timestamp or authoritative obstacle time so every headset samples the same motion phase.

## Automated validation

`tests/moving-platform.test.mjs` verifies:

- ping-pong timing at the start, midpoint, endpoint, and return,
- phase offsets,
- normalized movement axes,
- exact sampled positions,
- supported-body detection,
- rejection outside the platform footprint,
- player-rig carry displacement,
- controller-history compensation,
- preservation of locomotion velocity,
- three laboratory movers,
- expected collider count,
- mechanics-lab script wiring.
