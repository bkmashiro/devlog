# devlog

`devlog` is a CLI that analyzes git commits across multiple local repositories and generates a readable daily development log for standups, status updates, or end-of-day notes.

## Install

```bash
npm i -g devlog
```

## Quick start

```bash
devlog add ~/projects/repo-one
devlog add ~/projects/repo-two
devlog config set-webhook https://hooks.slack.com/services/...
devlog generate --since yesterday
devlog streak
```

## Commands

```bash
devlog generate [options]
  --since <date>     Start date (default: yesterday)
  --until <date>     End date (default: now)
  --repos <paths>    Comma-separated repo paths (overrides config)
  --output <file>    Save to file instead of stdout
  --format <fmt>     markdown|terminal (default: terminal)
  --no-chore         Skip chore/bump commits
  --webhook <url>    Send generated log to a webhook URL
  --webhook-type     slack|discord|generic

devlog add <repo-path>
devlog remove <repo-path>
devlog list
devlog config
devlog config set-webhook <url>
devlog streak [--days <n>]
```

Supported date inputs include `yesterday`, `7 days ago`, `2024-03-20`, and ISO timestamps.

Webhook delivery supports:
- Slack incoming webhooks via Block Kit payloads
- Discord webhooks via the `content` field
- Generic JSON webhooks via a `{ "text": "..." }` body

`devlog streak` scans the configured repositories for the last 30 days, reports your current and longest streaks, and renders an ASCII activity chart for the last 14 days by default.

## Example output

```text
Dev Log 2024-03-20

## avm
- Added FAISS vector index support
- Fixed Python 3.13 fusepy compatibility bug

## dead-env
- Initial release: scans JS/TS/Python/Go files for env var usage
- Added --fix flag to auto-update .env.example

## Summary
- 2 repos active today
- 18 commits total
- Net: +1204 lines added, -312 removed
- Busiest file: src/store.ts (modified 6 times)
```

## Use case

Use `devlog` at the end of the day to turn raw commit history into a concise summary for standup prep, progress reports, or personal work logs.
