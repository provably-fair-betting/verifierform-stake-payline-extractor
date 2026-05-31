# verifierform-stake-payline-extractor

[![CI](https://github.com/provably-fair-betting/verifierform-stake-payline-extractor/actions/workflows/ci.yml/badge.svg)](https://github.com/provably-fair-betting/verifierform-stake-payline-extractor/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/release/provably-fair-betting/verifierform-stake-payline-extractor)](https://github.com/provably-fair-betting/verifierform-stake-payline-extractor/releases/latest)

Drives Stake.com in a real browser and writes one `{game}-paylines.json` file per game. Consumer projects use these files as static payline references.

## Installation

Add as a dev dependency, pinned to a release tag:

```bash
pnpm add -D github:provably-fair-betting/verifierform-stake-payline-extractor#v2.0.0
```

The following peer dependencies are also required:

```bash
pnpm add -D puppeteer-real-browser rebrowser-puppeteer-core tsx
```

If pnpm blocks browser-related postinstall scripts, approve them once:

```bash
pnpm approve-builds
```

## Usage

Add a script to your `package.json`:

```json
"scripts": {
  "sync:paylines": "stake-paylines --output-dir ./src/lib/paylines"
}
```

Run it:

```bash
pnpm sync:paylines
```

To extract a single game:

```bash
pnpm sync:paylines -- --game plinko
```

## Options

| Flag            | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `--output-dir`  | Directory where payline JSON files are written (created if it does not exist) |
| `--game <slug>` | Run only the named game; can be repeated for multiple games                  |
| `--list-games`  | Print all registered game slugs and exit                                     |
| `--verbose`     | Log per-game progress in addition to the normal startup and completion messages |

## Output

Each run writes one `{game}-paylines.json` file per game into `--output-dir`. Output shape varies by game — Plinko nests by row count then risk level; flat-difficulty games (Chicken, Pump, etc.) produce a single object keyed by difficulty name.

## Cloudflare

The browser runs in headed mode so you can observe or manually complete a Cloudflare Turnstile challenge if one appears. Once the page is ready the run continues automatically.

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Multipliers all read as zero or blank | Increase `formDelayMs` in `scripts/config/extractor-config.ts` |
| Cloudflare challenge does not pass | Complete it manually in the headed browser window, then wait |
| Unknown game error | Run `--list-games` to see registered slugs |
| Navigation times out | Increase `waitTimeoutMs` in `scripts/config/extractor-config.ts` |

## Further reading

- [Adding a game](docs/adding-a-game.md)
- [Architecture](docs/architecture.md)
