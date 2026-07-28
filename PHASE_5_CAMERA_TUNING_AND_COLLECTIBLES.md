# FUN-FUN VR — Phase 5 Camera Tuning and Collectibles

## Purpose

This phase makes the second Quest height adjustment and adds the first optional objective to every course. The working KayKit geometry, platform colliders, Gorilla locomotion source, procedural module positions, and multiplayer pose synchronization remain unchanged.

## Camera adjustment

The first comfort pass lowered the player rig from `0.32 m` to `0.02 m` above each platform base. The second playtest requested a slight raise, so Phase 5 places the rig at `0.12 m`.

The matching locomotion body values are:

- rig Y above platform base: `0.12 m`
- player height offset: `0.88 m`
- body radius: `0.32 m`
- body height: `1.20 m`

Together these values keep the collision body resting on the same one-meter-high platform tops while placing the view approximately ten centimeters higher than the prior build and twenty centimeters lower than the original elevated build.

Initial spawns, checkpoint spawns, restarts, generated-course spawns, fall recovery, and VR-entry stabilization all receive the same height.

## Grounding and sliding

The anti-slide system remains active with the successful Phase 4 values:

- idle stop threshold: `0.42 m/s`
- grounded braking strength: `9.5`
- active hand pushes are protected
- upward launches and airborne momentum are protected

The camera raise does not alter the platform geometry or the grounding test. The body height changes together with the rig height so standing support remains aligned.

## Collectible objective

Every calibration or generated course now receives three optional yellow energy shards.

Placement rules:

1. Only ordinary blue landing platforms are eligible.
2. The starting and final platforms are excluded when enough middle platforms exist.
3. One shard is placed in the early course, one near the middle, and one late in the course.
4. Small lateral offsets keep the shards visible while remaining safely above the platform surface.
5. Placement is derived from the course manifest, so the same generated seed always receives the same shard positions.

The shards are lightweight A-Frame octahedrons with emissive materials and rotating rings. They add no collision bodies and therefore cannot interfere with locomotion.

## Collection behavior

- collection uses the tracked head position
- trigger radius: `0.82 m`
- collected shards shrink and disappear
- restarting restores all three shards
- collecting all three marks the run as a **Full Clear**
- shard progress is shown in the run-performance line
- the world status reports each collection and the final grade

## Run grading

Fall grades remain unchanged:

| Falls | Grade |
| ---: | --- |
| 0 | S |
| 1 | A |
| 2 | B |
| 3–4 | C |
| 5+ | CLEAR |

Collecting every shard adds **FULL CLEAR** to the result. The clean-run fall record remains stored separately for each calibration course or generated seed.

## Preserved systems

Phase 5 does not change:

- KayKit platform placement
- collision box dimensions
- procedural seed checksums
- hand-push strength
- one-hand and two-hand launch calculations
- gravity or air drag
- spring launch values
- checkpoint order
- multiplayer room creation or pose synchronization

## Automated validation

The repository workflow now checks:

- the new camera and body values
- grounded anti-slide behavior
- airborne launch preservation
- full-clear progression events
- deterministic three-shard placement
- unique collectible platforms
- collectible placement across 500 generated seeds
- JavaScript syntax and HTML parsing

## Quest playtest targets

1. The camera should feel slightly higher than the previous build while both hands still reach the platform comfortably.
2. Standing still should remain stable with no continuous slide.
3. All three shards should be visible and reachable without leaving the intended route.
4. Each shard should disappear only once when collected.
5. Restarting should restore every shard.
6. A run with three collected shards should display **FULL CLEAR**.
7. Missing a shard should still allow normal course completion.
8. The collectible visuals should not cause a noticeable Quest performance drop.
