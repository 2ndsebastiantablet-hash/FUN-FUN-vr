# FUN-FUN VR — Phase 3 Procedural Module Foundation

## Purpose

Phase 3 preserves the handcrafted mechanics course and adds the first real seeded procedural route. The goal is to prove that reusable modules can create different, reproducible, automatically validated VR courses without generating impossible maps.

## Separate entries

- `index.html` runs the handcrafted calibration course.
- `generated.html` runs the procedural course.

Keeping separate entries protects the known calibration route while the generator evolves. The shared course selector moves between the pages and creates exact seed links.

## Generator identity

- Generator version: `module-generator-v1`
- Generated course version: `procedural-course-v1`
- Default seed: `FUNFUN01`
- Seed length: up to 18 normalized characters
- Allowed seed characters: `A-Z`, `0-9`, `_`, and `-`

A map checksum is calculated from the generator version, seed, module sequence, platform positions, checkpoint positions, spring, and finish placement.

## Module library

| Module | Horizontal shift | Height change | Forward travel | Difficulty |
| --- | ---: | ---: | ---: | ---: |
| `straight` | 0 m | 0 m | 4.6 m | 1 |
| `left-step` | -1.55 m | 0 m | 4.7 m | 1 |
| `right-step` | +1.55 m | 0 m | 4.7 m | 1 |
| `gentle-rise` | 0 m | +0.75 m | 4.65 m | 2 |
| `left-rise` | -1.25 m | +0.6 m | 4.75 m | 2 |
| `right-rise` | +1.25 m | +0.6 m | 4.75 m | 2 |
| `gentle-drop` | 0 m | -0.75 m | 4.6 m | 1 |
| `spring-rise` | fixed | +1.5 m | 5 m | required |

The generator prevents more than two identical modules in a row and rejects choices outside the safe lateral or vertical envelope.

## Course structure

Each generated run contains:

1. Start platform
2. Three seeded traversal modules
3. Checkpoint 1
4. Required spring pad
5. Spring landing and checkpoint 2
6. Two seeded traversal modules
7. Finish platform
8. Finish gate

The result is 10 visible pieces and 18 box colliders. Standard platforms use two half-depth colliders so the existing Quest preflight verifies the generated collision structure without changing the pinned locomotion component.

## Validation rules

Before rendering, every manifest must pass:

- unique piece IDs
- finite three-dimensional positions
- at least seven landing platforms
- exactly one spring sequence
- exactly one finish trigger
- checkpoint sequence `1,2`
- maximum lateral step of 2.1 m
- maximum vertical step of 1.55 m
- maximum forward center gap of 5.1 m
- strictly forward movement toward negative Z
- platform X within ±4 m
- platform base height from 0 to 4.5 m
- longitudinal placement from Z 9 to -35 m
- expected collider count derived from the manifest

The automated generator test validates 2,000 seeds and confirms meaningful layout variety.

## Multiplayer behavior

Two players using the same generated link receive the same seed, map, and checksum. Users must share the exact link before creating or joining a room.

Still local to each device:

- selected course mode and seed
- active checkpoint
- spring event
- timer
- finish state
- best time
- restart action

Host-authoritative map manifests and shared course state remain a later multiplayer phase.

## Current limitations

- The first module set uses repeated pilot assets.
- Generated mode does not yet include moving platforms, rotating hazards, branches, collectibles, or true slope modules.
- Movement limits remain conservative until physical Quest testing.
- A seed is guaranteed to reproduce the same map only under the same generator version.
- Direct WebRTC still has no dedicated TURN relay.

## Phase 3 exit criteria

Phase 3 is ready to expand after Quest testing confirms:

1. several seeds load without missing models,
2. the same seed reproduces the same checksum,
3. every generated gap is reachable,
4. checkpoint resets are safe on shifted and raised platforms,
5. the spring sequence is reliable across seeds,
6. no platform falls outside the visible or safety area,
7. performance remains stable,
8. two devices using the same link see aligned geometry and avatars.
