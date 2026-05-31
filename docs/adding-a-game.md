# Adding a game

This guide walks through adding a new game extractor. The process has three steps: create the strategy, create the game config, and register it.

## 1. Choose an extraction pattern

Three patterns exist depending on where Stake exposes the payline data:

| Pattern | Use when | Examples |
| ------- | -------- | -------- |
| **Calculation page** | Game appears on `stake.com/provably-fair/calculation` with a difficulty/row selector | Bars, Cases, Packs, Plinko, Tarot |
| **Game page scraper** | Paylines are visible on the live game page via in-game controls | Chicken, Darts, Pump, Snakes |
| **Game events page** | Payouts are embedded as a JavaScript variable on `stake.com/provably-fair/game-events` | Wheel |

## 2. Implement the strategy

Create `scripts/strategies/{name}-game.ts`. The strategy is an async function that receives a `GameConfig` and an `ExtractionContext`, and returns the payline data in whatever shape makes sense for the game.

### Calculation page

Most games use `calculationGameStrategy()` from `scripts/strategies/calculation-game.ts`, which handles navigation, game selection, and iteration over difficulties. Pass it a `readPaylines` function that reads the current table state:

```typescript
import { calculationGameStrategy } from "./calculation-game.js";
import type { GameConfig, GameStrategy } from "../types.js";

export const myGameStrategy: GameStrategy = (game, context) =>
  calculationGameStrategy(game, context, {
    difficultySelectName: "myGameDifficulty",
    difficulties: ["low", "medium", "high"],
    readPaylines: async (page) => {
      return page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll(".payline-cell"));
        return cells.map((el) => parseFloat(el.textContent ?? "0"));
      });
    },
  });
```

### Game page scraper

Navigate to the live game page, interact with the in-game controls, and read multipliers from the DOM:

```typescript
import { navigateTo } from "../helpers/navigate.js";
import type { GameConfig, GameStrategy } from "../types.js";

export const myGameStrategy: GameStrategy = async (game, context) => {
  const { page, logger, interactionOptions } = context;
  await navigateTo(page, "https://stake.com/casino/games/my-game", logger, interactionOptions);

  const result: Record<string, number[]> = {};

  for (const difficulty of ["easy", "medium", "hard"]) {
    // interact with difficulty controls, read multipliers
    result[difficulty] = await page.evaluate((diff) => {
      // ...
    }, difficulty);
  }

  return result;
};
```

### Game events page

Navigate to `stake.com/provably-fair/game-events`, find the relevant code block, and evaluate the embedded variable:

```typescript
import { navigateTo } from "../helpers/navigate.js";
import type { GameConfig, GameStrategy } from "../types.js";

export const myGameStrategy: GameStrategy = async (game, context) => {
  const { page, logger, interactionOptions } = context;
  await navigateTo(page, "https://stake.com/provably-fair/game-events", logger, interactionOptions);

  return page.evaluate(() => {
    // locate the code block for this game and extract the PAYOUTS variable
  });
};
```

## 3. Create the game config

Create `scripts/games/{name}.ts`:

```typescript
import { myGameStrategy } from "../strategies/my-game.js";
import type { GameConfig } from "../types.js";

export const myGame: GameConfig = {
  name: "my-game",
  strategy: myGameStrategy,
};
```

The `name` is the slug used with `--game` and as the output filename stem (`my-game-paylines.json`).

## 4. Register the game

Add an import and an entry to the array in `scripts/games/index.ts`:

```typescript
import { myGame } from "./my-game.js";

export const games: GameConfig[] = [
  // ...existing games...
  myGame,
];
```

The array order determines the extraction order when running all games.

## 5. Verify

```bash
# Confirm the slug is discoverable
pnpm extract --list-games

# Run extraction for the new game only
pnpm extract --game my-game --verbose
```

Inspect the output file in `outputs/` and confirm the shape and values look correct.
