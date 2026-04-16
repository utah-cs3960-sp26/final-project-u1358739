# Running Level Tests

All commands are run from the project root (`webEscape/`).

| What | Command |
| --- | --- |
| All tests on **all** levels | `npx jest tests/jest/Levels` |
| All tests on **one** level | `npx jest tests/jest/Levels -t "level3"` |
| All tests on **some** levels | `npx jest tests/jest/Levels -t "level1\|level4\|level6"` |
| One specific test on all levels | `npx jest tests/jest/Levels -t "no duplicate node IDs"` |
