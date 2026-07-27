# FUN-FUN VR — Phase 4 Comfort and Run Progression

## Purpose

Phase 4 responds directly to the first successful Quest playtest. The map and collisions remain unchanged because they worked correctly. This phase changes only player comfort, idle movement, and the first lightweight performance-progression layer.

## Camera and reach adjustment

The original platforming setup placed the player rig `0.32 m` above each platform base. Phase 4 places it at `0.02 m`, lowering the player by approximately `0.30 m` relative to every platform surface.

The locomotion body values are updated together so the collision capsule still rests on the same platform tops:

- player height offset: `0.98 m`
- body radius: `0.32 m`
- body height: `1.30 m`
- rig Y above platform base: `0.02 m`

Initial spawn, checkpoint spawns, restarts, generated-course spawns, and VR-entry stabilization all receive the same adjustment. This prevents the older height from returning after a fall, checkpoint, restart, or VR re-entry.

## Anti-slide behavior

The pinned Gorilla locomotion component still owns pushing, launches, gravity, drag, tracking, and collision resolution.

`comfort-grounding` adds a final supported-platform pass:

1. Detect whether the player body is resting on a box collider.
2. Leave active hand pushes and upward launch momentum untouched.
3. Apply stronger horizontal braking only while supported and not actively pushing.
4. Set small remaining horizontal velocity to exactly zero.

Current values:

- idle stop threshold: `0.42 m/s`
- grounded braking strength: `9.5`
- launch protection threshold: upward velocity above `0.08 m/s`

This is designed to remove continuous idle drift without making jumps or spring launches feel stuck.

## Spring compatibility

Lowering the rig changes the expected standing Y position on a spring pad. Phase 4 lowers only the spring trigger's detection band so the existing launch values and visible geometry remain unchanged.

## Run-performance progression

A new run-performance line appears below the normal course details. It tracks:

- falls during the active run
- latest checkpoint
- spring launches
- best clean-run fall count for the current calibration course or generated seed

Completion grades:

| Falls | Grade | Meaning |
| ---: | --- | --- |
| 0 | S | Perfect run |
| 1 | A | One recovery |
| 2 | B | Two recoveries |
| 3–4 | C | Course cleared |
| 5+ | CLEAR | Completed; keep improving |

Best fall counts are stored locally per course mode, generator version, and seed. Storage failure does not stop gameplay.

## Preserved systems

Phase 4 does not change:

- KayKit map geometry
- platform collision dimensions
- procedural module positions
- seeded map checksums
- Gorilla hand-push calculations
- one-hand and two-hand launches
- gravity or air momentum
- multiplayer pose synchronization
- room creation or joining

## Automated validation

The validation workflow now checks:

- JavaScript syntax for both Phase 4 scripts
- registration of the grounded comfort component
- exact stopping of low idle velocity
- preservation of airborne launch velocity
- all five run-grade bands
- correct handling of an empty best-score store
- fall, checkpoint, spring, and completion event tracking

## Quest playtest targets

1. The virtual floor should feel roughly `30 cm` closer to the player.
2. Both hands should reach platform surfaces without excessive crouching.
3. Standing still should settle to no visible horizontal movement.
4. A strong launch should retain its normal airborne distance.
5. Landing should stop noticeably faster than before without feeling like a hard teleport.
6. Spring pads should still trigger reliably.
7. Checkpoint and restart heights should match the initial height.
8. Completing a run should display a grade and remember the cleanest run.
