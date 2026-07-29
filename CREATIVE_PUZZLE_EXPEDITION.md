# Creative Puzzle Expedition

This course moves beyond isolated mechanics and uses the approved systems as connected puzzle-platforming challenges.

## Room 1 — Triple Lock

The first door has three simultaneous locks:

- Left purple pad: requires one 4 kg box.
- Right purple pad: requires the other 4 kg box.
- Center blue pad: requires the player.

The door opens only after all three pads are active at the same moment. Once solved, the lock latches open so the player can leave the center pad and continue.

This room tests:

- Solid-hand pushing and grabbing
- Multiple physics objects
- Object-sensitive pressure pads
- Player-sensitive pressure pads
- A multi-input door condition

## Room 2 — Cargo Vault

The vault door requires 14 kg of cargo on one large plate. Four objects exist:

- 2 kg
- 4 kg
- 6 kg
- 8 kg

The seed places those weights across four route types:

- Main route
- Moving-platform side island
- Timed-platform side island
- Fragile-platform side island

There are multiple valid solutions. For example:

- 8 kg + 6 kg = 14 kg
- 8 kg + 4 kg + 2 kg = 14 kg
- All four objects = 20 kg

The player can choose a shorter difficult route or collect more lighter cargo from several paths.

## Room 3 — Timed Relay

The relay has one button and one lever on opposite sides of a moving shuttle.

The seed determines which control must be activated first. Activating the first control starts a 6.5–7.5 second window. The player must ride or parkour across the shuttle and activate the second control before time expires.

Pressing the wrong control first, repeating the first control, or running out of time resets the relay. Successful completion permanently opens the relay door.

## Room 4 — Sequence Vault

Three controls are color-coded:

- Amber
- Cyan
- Violet

The seed determines their required order. The sign above the controls displays the current code. Correct inputs advance the sequence; an incorrect input resets the sequence. Completing all three opens the final door permanently.

## Deterministic seed behavior

The same seed always recreates:

- Sequence-code order
- Relay-control order
- Relay time limit
- Cargo mass assigned to each route type
- Cargo side placement
- Moving-platform duration
- Timed-platform cycle
- Fragile-platform warning duration

## Quest playtest checklist

### Triple Lock

- Push or grab both 4 kg boxes onto the purple pads.
- Confirm one box cannot activate both pads.
- Confirm the door remains closed with only two of the three pads active.
- Stand on the blue center pad and confirm all three pads turn green.
- Confirm the door opens and stays open after the player steps away.
- Restart and confirm both boxes, pads, and the door reset.

### Cargo Vault

- Confirm all four cargo masses are visible and labeled.
- Confirm each seed places one mass on each route type.
- Retrieve cargo from the moving side island while carrying or grabbing it.
- Retrieve cargo across the timed side route.
- Retrieve cargo across the fragile side route.
- Put less than 14 kg on the large plate and confirm the door remains closed.
- Test at least two valid combinations that total 14 kg or more.
- Remove enough weight to fall below 14 kg and confirm the door closes.
- Confirm dropped cargo resets instead of being permanently lost.

### Timed Relay

- Read which control must be used first.
- Activate the wrong control and confirm the relay resets.
- Activate the correct first control and confirm the timer begins.
- Cross using the moving shuttle.
- Activate the second control before time expires and confirm the door opens.
- Allow the timer to expire once and confirm the relay returns to idle.
- Confirm controls do not repeatedly activate merely because the player stands nearby.

### Sequence Vault

- Read the displayed seeded color order.
- Enter one wrong control and confirm progress resets to zero.
- Enter the correct three-control sequence.
- Confirm the door opens permanently after the third correct input.
- Load the same seed and confirm the sequence order is unchanged.
- Load a new seed and confirm the order changes.

### Stability and performance

- Confirm both solid hands remain stable for the full course.
- Confirm six active physics objects do not cause major frame-rate loss.
- Confirm moving, timed, and fragile side paths continue working after object resets.
- Confirm all four checkpoints become the current recovery position.
- Confirm Restart Same Seed clears all constraints, resets all objects, closes every door, and restores every route.
- Confirm repeated seed changes do not accumulate duplicate objects or event responses.

## Production direction

After this course passes, puzzle modules can be added to the production procedural library as complete challenges rather than isolated mechanics. Future seeded runs can mix traversal modules, hazard modules, physics puzzles, multi-switch doors, cargo collection, timed relays, sequence locks, optional shortcuts, and finale combinations.
