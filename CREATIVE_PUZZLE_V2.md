# Creative Puzzle Expedition V2

This rebuild addresses the first physical Quest playtest of the creative puzzle course.

## Cargo route anti-skip rebuild

The moving, timed, and fragile cargo islands are now approximately 12 metres from the main route instead of 6 metres.

- Moving shuttle begins near the main platform and travels 8.85 metres to its island.
- Timed route contains three spaced timed platforms.
- Fragile route contains three spaced falling platforms.
- Each route is enclosed by two 6.5-metre-tall corridor walls.
- The original cargo-room rails that blocked lateral access are removed.
- Relay and sequence-room rails remain unchanged.

The route corridor prevents diagonal shortcuts between neighboring cargo challenges, while the increased distance prevents a normal direct jump from reaching an island.

## Direct physical controls

The old red activation spheres are removed.

### Buttons

A button activates when either solid hand enters the button cap itself. Trigger and Grip are not needed. The cap physically depresses and turns green.

### Levers

A lever begins tracking when a solid hand touches its handle. Pulling the hand down or sideways far enough activates the lever. Trigger and Grip are not needed. The handle rotates and turns green.

The older controller-button proximity listeners and player-body pressure shortcut are disabled for these puzzle controls.

## Persistent green feedback

All puzzle controls now use the same rule:

- Inactive: original puzzle color.
- Active: green.
- Failed timed attempt: returns to original color.
- Incorrect sequence: all sequence buttons return to original colors.
- Successful relay: both controls remain green.
- Successful sequence: all three buttons remain green.

## Timed relay display

A large in-world relay display appears above the crossing.

- READY before activation.
- Numeric seconds remaining during the attempt.
- A shrinking bar changes green, yellow, then red.
- The first control stays green while the timer runs.
- Expiration or an incorrect control resets the attempt.
- Successful completion changes the display to UNLOCKED and keeps both controls green.

## Color Code Vault rebuild

The final puzzle now has three large matching buttons:

- Amber
- Cyan
- Violet

Each button has a colored overhead label. The instruction board shows three large colored code cards in the required seeded order. Progress lights and a `CORRECT INPUTS: X / 3` display show the current state.

A wrong color resets all three buttons and progress lights. The correct full sequence opens the final door permanently.

## Quest playtest checklist

### Cargo routes

- Try to jump directly from the main route to each cargo island and confirm it is not reachable.
- Try a diagonal jump from one cargo route to another and confirm the tall corridor walls block it.
- Ride the moving shuttle to its island and return with the cargo.
- Cross all three timed platforms and return with the cargo.
- Cross all three fragile platforms and return with the cargo.
- Confirm the old rails no longer block the route entrances.

### Buttons and levers

- Press every button using only the physical hand sphere.
- Confirm touching beside a button does not activate it.
- Confirm each pressed button visibly depresses and turns green.
- Touch the relay lever handle and pull it without pressing Trigger or Grip.
- Confirm merely touching the lever without pulling does not activate it.
- Confirm no floating red activation spheres remain anywhere.

### Relay timer

- Activate the correct first control and confirm it stays green.
- Confirm the numeric countdown and shrinking bar are clearly visible.
- Allow the timer to expire and confirm the first control returns to its original color.
- Activate the wrong first control and confirm the relay resets.
- Complete the relay and confirm both controls and the timer display remain green/unlocked.

### Color Code Vault

- Confirm the Amber, Cyan, and Violet buttons are visibly present and labeled.
- Confirm the colored code cards match the actual button colors.
- Enter one wrong color and confirm all progress resets.
- Enter the correct order and confirm each correct button stays green.
- Confirm the door opens after the third correct input.
- Change seed and confirm the displayed color order changes while the button colors remain consistent.

### Stability

- Confirm the wider course remains smooth on Quest.
- Confirm the additional corridor walls do not create false collisions outside their visible surfaces.
- Restart and confirm all routes, controls, colors, timer state, sequence state, cargo, and doors reset.
- Change seeds repeatedly and confirm no duplicate timer panels, route walls, buttons, or event responses appear.
