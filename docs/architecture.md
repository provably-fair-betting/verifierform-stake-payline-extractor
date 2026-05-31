# Architecture

## Directory structure

```
scripts/
├── games/              # One file per game, each exporting a GameConfig
│   ├── index.ts        # Registry — imports every game and exports the games array
│   ├── plinko.ts
│   └── ...
├── strategies/         # Extraction strategy implementations, one per game
│   ├── calculation-game.ts   # Reusable helper for calculation page games
│   ├── plinko-game.ts
│   └── ...
├── helpers/            # Shared browser interaction and output utilities
├── browser/            # Puppeteer connection setup
├── config/             # Static extractor config (timeouts, delays, output directory)
├── types.ts            # All shared TypeScript types
└── run-extractor.ts    # CLI entry point — parses args, runs strategies, writes output
```

## Data flow

```
CLI args
  → run-extractor.ts        (parse flags, resolve game list)
    → connect-browser.ts    (open headed browser with anti-bot settings)
    → navigateTo()          (load target page, wait through Cloudflare if needed)
    → game.strategy()       (interact with page controls, read multiplier data)
    → output.ts             (write {game}-paylines.json)
```

One browser instance is shared across all games. Strategies run sequentially.

## Game definition

Every game is a `GameConfig` object with two fields:

```typescript
type GameConfig = {
  name: string;       // slug used with --game and as the output filename stem
  strategy: GameStrategy;
};

type GameStrategy = (game: GameConfig, context: ExtractionContext) => Promise<unknown>;
```

The strategy receives an `ExtractionContext` containing the shared `browser`, `page`, `logger`, `interactionOptions`, and `config`. The return value is serialised directly to JSON as the payline file content.

## Extraction patterns

### Calculation page

Games on `stake.com/provably-fair/calculation` share a common flow: select the game, apply dummy seeds, iterate over difficulty/row combinations, and read the rendered multiplier table after each change. This is encapsulated in `scripts/strategies/calculation-game.ts`.

`calculationGameStrategy()` takes a `readPaylines` callback that receives the live `page` and returns the multipliers for the current form state. The helper handles navigation, game selection, and the iteration loop.

### Game page scraper

Some games expose their full multiplier tables on the live game page. The strategy navigates directly to `stake.com/casino/games/{slug}`, interacts with in-game difficulty or row controls, and reads multiplier elements from the DOM after each change.

`scripts/helpers/form.ts` provides `setCalculationSelect()` for safe React-compatible select updates that dispatch the correct input and change events.

### Game events page

Wheel embeds its payout table as a JavaScript variable in a code block on `stake.com/provably-fair/game-events`. The strategy navigates to that page, finds the relevant code block, and uses `new Function()` inside `page.evaluate()` to extract the `PAYOUTS` object without a full JS parser.

## Helpers

| Module | Purpose |
| ------ | ------- |
| `navigate.ts` | Navigates to a URL and waits for the page to be ready; detects and waits through Cloudflare Turnstile challenges |
| `form.ts` | Safe `<select>` and `<input>` updates that use native property setters and dispatch React-compatible events |
| `payline-table.ts` | Parses multiplier values out of rendered table cells |
| `dom.ts` | Builds `data-testid` CSS selectors used by the calculation page |
| `output.ts` | Writes the payline object to a JSON file, creating the output directory if needed |
| `wait.ts` | Simple sleep utility used between form interactions |

## Navigation and Cloudflare

`navigate.ts` does more than a plain `page.goto()`. After navigation it polls for one of three states:

- **Ready** — the target page title and URL match, no loading spinner is visible
- **Cloudflare challenge** — a Turnstile or "Just a moment" page is detected; logging warns and polling continues until the challenge passes
- **Timeout** — `waitTimeoutMs` exceeded; an error is thrown

The browser runs in headed mode so a Cloudflare challenge can be completed manually if the automatic solver does not handle it.

## Output format

Each strategy returns whatever shape fits the game. The runner serialises it as-is. Common shapes:

- **Nested** (Plinko): `{ "8": { "low": [...], "medium": [...] }, "9": { ... } }`
- **Flat** (Chicken, Pump): `{ "easy": [...], "medium": [...], "hard": [...] }`
- **Object** (Wheel): `{ "1": multiplier, "2": multiplier, ... }`

Output files are written to `--output-dir` as `{game}-paylines.json`. Without `--output-dir` they go into `outputs/`.

## CLI entry point

`bin/stake-paylines.js` is a thin shim that spawns `tsx` to run `run-extractor.ts`. Consumer projects invoke it as `stake-paylines` after installing the package.
