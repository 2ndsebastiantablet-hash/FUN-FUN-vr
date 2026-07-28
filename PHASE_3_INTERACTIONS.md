# Phase 3 — Button and Lever Interaction Laboratory

This phase keeps switch-driven mechanics outside calibration and generated courses until physical Meta Quest testing passes.

## Laboratory route

The interaction lab contains two isolated switch tests:

1. A purple floor-pressure button that opens a vertical gate.
2. A hand-operated lever that opens a second vertical gate when either controller is close and the player presses Trigger or Grip.

The route also contains two checkpoints, six solid KayKit platforms, two moving gates, fourteen active locomotion colliders, and a finish gate.

## Interaction rules

### Floor button

- Activates when the player rig is centered over the button.
- Uses a forgiving horizontal radius for Gorilla locomotion.
- Remains active after the player steps off in this lab so the player can cross the gate safely.
- Changes its indicator from red to green and visibly depresses.

### Lever

- Accepts either Quest controller.
- Requires the controller to be within the interaction radius.
- Accepts Trigger or Grip so it is not dependent on one controller binding.
- Uses a cooldown to prevent one press from toggling repeatedly.
- Rotates between clear on/off positions and changes its indicator color.

### Gates

- Move vertically with smooth acceleration and deceleration.
- Carry their locomotion collider with the visible gate.
- Reset to closed when the laboratory restarts.
- Are intentionally separate from procedural generation and multiplayer state for now.

## Quest playtest requirements

Before buttons and levers enter generated maps, verify:

- The floor button activates reliably when standing on it.
- The button does not activate from an obviously distant position.
- The button visibly depresses and its indicator turns green.
- The first gate opens far enough to pass through without head or hand clipping.
- Either controller can operate the lever.
- Trigger and Grip both operate the lever while the hand is nearby.
- Trigger or Grip does nothing when the hand is too far away.
- One press produces only one toggle.
- The lever animation clearly communicates its state.
- The second gate opens and closes in sync with the lever.
- Gate collision stays aligned with each visible gate.
- Restart closes both gates and resets both switches.
- Falls return to the latest checkpoint.
- Frame rate remains stable through the full lab.

## Remaining isolated mechanic tests

After this lab, the original functional-piece plan still includes:

- Damage and hazard volumes
- Bomb or explosive launch hazards
- Collapsing bridge sequences
- Pushable balls or physics-style route objects
- Respawn presentation and effects

Pipes, hoops, arches, railings, and broader KayKit asset collision tests are part of the later asset/collision expansion rather than this switch laboratory.
