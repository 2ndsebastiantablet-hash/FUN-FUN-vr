# FUN-FUN VR — Phase 2 Mechanics Course

## Purpose

This phase replaces the temporary colored movement-test map with a deterministic KayKit platforming course. It is not the procedural generator yet. Its purpose is to measure and tune the movement limits that the future generator must obey.

## Course order

1. Start platform — top height 1 m
2. Approach platform — 0.7 m gap
3. KayKit slope — source 4 × 4 × 4 m ramp visually compressed to a 4 × 2 × 4 m rise and backed by ten collision steps
4. Checkpoint platform — top height 3 m
5. Spring platform and green spring pad
6. Spring landing — top height 5.5 m and checkpoint 2
7. High platform
8. Descending platform — top height 4 m
9. Finish platform — top height 3 m
10. Scaled finish gate

The course travels in the negative-Z direction so the default A-Frame camera faces the route at spawn.

## Movement adaptation

The requested locomotion source is still loaded unchanged from:

- repository: `2ndsebastiantablet-hash/feeble`
- commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- file: `templates/gorilla-tag-locomotion/gorilla-locomotion.js`

The source demo uses a global floor. The mechanics course moves that floor to `-20 m` and uses box colliders for the actual platforms.

`platformer-surface-extension` adds three behaviors around the original component:

1. Detects when either resolved hand is touching the top of a platform box.
2. Preserves one-hand/two-hand floor launch behavior when pushing from platform tops.
3. Detects body support and applies the additional ground-drag difference.

It does not replace gravity, drag, push history, launch averaging, hand tracking, or body collision.

## Slope collision and visual calibration

The source locomotion collider supports axis-aligned boxes only. The ramp therefore uses ten narrow boxes with increasing top heights. The collision approximation rises in 0.2 m increments from the one-meter approach surface to the three-meter checkpoint surface.

The original KayKit mesh rises four meters. `course-calibration.js` compresses only the displayed mesh to half-height and lifts it into alignment with the two-meter collision rise. The source asset itself is not modified.

This is intentionally a calibration implementation. Headset testing will determine whether ten steps are smooth enough or whether a true slope solver is required.

## Spring settings

- vertical launch speed: `8.4 m/s`
- minimum forward speed: `4.5 m/s` toward negative Z
- cooldown: `950 ms`
- trigger radius: `0.92 m`

The target platform begins approximately 3 m forward from the center of the spring and is 1.5 m higher than the spring’s standing surface.

## Checkpoint and reset behavior

- Initial spawn: `(0, 0.32, 8)`
- Checkpoint 1: `(0, 2.32, -5.3)`
- Checkpoint 2: `(0, 4.82, -15)`
- Fall reset threshold: `y < -6`
- Horizontal course bounds: `x = -12…12`
- Longitudinal course bounds: `z = -36…14`
- Maximum safe height: `18 m`

A reset clears velocity, launch history, hand deltas, and stale controller tracking before placing the rig at the active checkpoint.

## Timing

The timer begins when the rig passes `z < 6.1`, which prevents room setup and VR-entry time from counting against the run. Finish times and the fastest local time are stored only in the current browser.

## Multiplayer state

All players receive the same static HTML and therefore see the same course. Remote head and hand poses remain synchronized.

The following are still local and are not yet network-authoritative:

- checkpoint activation
- spring events
- timer state
- finish state
- best time
- restart action

Those become shared during the multiplayer procedural-synchronization phase.

## Phase 2 playtest goals

The first Quest test should establish:

- comfortable ordinary gap size
- maximum reliable one-hand and two-hand launch distances
- whether the stepped ramp feels smooth
- whether the spring strength is appropriate
- whether body collision catches high-speed landings
- whether checkpoint reset is comfortable
- whether all KayKit models and textures load reliably
- whether performance remains stable with repeated glTF instances and multiplayer enabled
