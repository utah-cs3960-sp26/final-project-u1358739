# Level Validation Tests

## Purpose

These tests validate the **level JSON files themselves** — they do NOT run any game code (no models, no viewmodels, no views). They verify that each shipped level's JSON data is structurally correct and playable.

## Scope

- Only works with the JSON files in `src/data/levels/`.
- Tests should automatically pick up new levels added to `src/data/levels/index.ts`.

## Requirements

- Must be able to run **one test on one level**.
- Must be able to run **one test on all levels**.
- Must be able to run **all tests on one level**.
- Must be able to run **all tests on all levels**.

See `RUNNING_TESTS.md` for the exact commands.

## What to Validate

- Unique node IDs (no duplicates).
- Node positions are within grid bounds.
- Neighbor references point to existing node IDs.
- Grid dimensions are positive.
- The level is solvable (can be completed by repeatedly removing in-degree-0 nodes).


Ok now I want you to make me a few level tests.  First look into the descriptions file that you just made and see what all needs to be there.  Then I want you to make a few tests.  One for testing if the file is valid json.  One for testing if there are unique node IDs (no duplicates).  One for test on all levels, all tests ensuring all node positions are withing the grid bounds.  One for ensuring that all neighbor references point to an existing node ID.  One for ensuring the grid dimensions are positive.  For now that is all you need to do. 