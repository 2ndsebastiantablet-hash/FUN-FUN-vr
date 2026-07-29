# Advanced Integrated Course

This is the second integration build. It preserves the Quest-tested five-module integrated course and appends three more seeded modules:

1. Retuned hazard gauntlet
2. Six-piece collapsing bridge
3. Solid-hand weighted physics door

The original integrated lab remains unchanged as a stable fallback.

## Total route

The complete course contains eight mechanic groups and eight checkpoints:

- Moving platform
- Fragile platforms
- Timed platforms
- Rotating wall
- Button and lever gates
- Spike strip and proximity bomb
- Collapsing bridge
- Weighted physics block and door

## Deterministic seed rules

The core five modules retain their existing deterministic order and tuning. The advanced extension uses the same seed to determine:

- Whether the hazard or bridge section appears first
- Spike-strip lateral position
- Bomb lateral position
- Bomb fuse duration
- Bomb detection radius
- Bomb cooldown
- Bridge chain delay
- Bridge warning duration
- Bridge fall duration
- Bridge rebuild duration
- Physics block starting side
- Weight-plate position
- Door movement speed

The physics challenge always remains final so the weighted block does not need to travel through disappearing or moving sections.

## Quest playtest checklist

### Full run

- Complete the original five mechanics and confirm they still behave exactly as in the stable integrated lab.
- Confirm checkpoint display progresses from 0/8 through 8/8.
- Confirm falling or being ejected after checkpoints six, seven, or eight returns to the newest advanced checkpoint.
- Confirm Restart Same Seed restores all core and advanced mechanics.

### Spike and bomb

- Stand beside the visible spikes and confirm no false reset occurs.
- Touch the spikes and confirm checkpoint recovery.
- Enter the bomb's visible outer ring and confirm the fuse starts before contact.
- Confirm the bomb still applies the approved exaggerated horizontal and upward launch.
- Confirm the bomb resets after course restart.

### Collapsing bridge

- Step onto the bridge and confirm all six pieces collapse in sequence.
- Confirm visible planks and Gorilla collision disappear together.
- Confirm the bridge rebuilds.
- Confirm no orange full-screen overlay appears.
- Confirm restart immediately restores every bridge piece.

### Solid hands and weighted door

- Confirm both hands remain solid when the final module begins.
- Push the 7.5 kg block without pressing a button.
- Grab it with left/right Trigger and Grip.
- Place it on the purple plate and confirm the solid door rises.
- Remove the block and confirm the door closes.
- Confirm block, plate, rails, floor, and door share real Cannon collision.
- Confirm the block cannot fall through the two final platforms.
- Confirm restart releases the block, resets it, closes the door, and clears the plate.

### Performance

- Watch for frame-rate reduction when Cannon physics becomes active.
- Confirm controller tracking remains stable across the full long course.
- Confirm repeated bomb launches, bridge collapses, and physics resets do not accumulate lag.
- Confirm models and collisions continue loading correctly after changing seeds.

## Next phase after approval

Once this advanced course passes, the isolated-mechanic phase and first integration phase are complete. Development moves to production structure:

1. Repair and replace the old primary generated-course entry with the approved integrated generator.
2. Expand the procedural module library from the small prototype into beginner, intermediate, advanced, transition, checkpoint, and finale modules.
3. Add host-authoritative course manifests and synchronized mechanic state for multiplayer.
4. Add Quest pooling, culling, distance-based animation limits, memory monitoring, and long-session testing.
5. Add final presentation systems: audio, checkpoint effects, run results, progression, environment themes, and polished menus.
