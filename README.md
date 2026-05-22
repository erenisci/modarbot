# ModarBot

**Catch the raid before it catches you.**

A real-time anomaly detector for subreddits, built on Devvit. ModarBot watches your sub for brigades, sock-puppet attacks, coordinated spam, and traffic anomalies — and alerts your mod team the moment something is wrong.

Submission for the [Reddit Mod Tools and Migrated Apps Hackathon](https://mod-tools-migration.devpost.com/) — _New Mod Tool_ category.

---

## The pitch

Every active subreddit has been brigaded, raided, or hit by a coordinated spam wave at some point. None of them saw it coming. Mods discover the damage hours later — sometimes only after a user DMs them or the sub trends for the wrong reason.

ModarBot makes the invisible visible. It runs in the background, continuously analyzes the sub's live event stream with simple statistical detectors (no AI, no external APIs, no cost), and lights up the moment patterns diverge from baseline.

## What it does

### Signal pipeline

A bundle of independent detectors watches the sub:

- **Account-age anomaly** — sudden flood of new accounts (<30 days) posting in the sub
- **Report storm** — many new reports against a single user in a short window
- **Vote-pattern anomaly** — post ratios diverging from the sub's typical curve at a given post age
- **Comment cascade** — sudden spike in comment velocity/depth on a single thread
- **Cross-post influx** — bursts of referral traffic from external subs
- **New-account cluster** — multiple accounts created within days of each other posting in the same thread

Each detector is independent. Each emits an event with a severity score and a plain-English reason.

### Watchtower custom post

A sticky custom post in your mod-only area:

- **Status orb** — single green/yellow/red glance at sub health
- **Live anomaly feed** — last 10 events with severity, type, time, "Investigate" button
- **Drill-down** — opens a filtered view of the offending accounts and posts with one-click bulk actions (ban all, remove all, lock thread)
- **Settings tab** — per-signal sensitivity sliders, mute schedules, alert delivery channel

### Realtime alerts

Detectors publish to a Devvit Realtime channel. Mods on shift see the Watchtower light up in real time. When severity exceeds the sub's threshold, modmail or push notification fires team-wide.

## Why ModarBot

|                               |                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Universal pain**            | Every active sub has been raided. The current solution is "find out an hour later from a user complaint."                        |
| **No cost, ever**             | Pure statistical detection on Devvit infrastructure. No AI. No external APIs. No publisher key burden. Sustainable from day one. |
| **No competition**            | Zero existing solutions on Devvit, in Toolbox, in the fsvreddit ecosystem, or among PRAW bots.                                   |
| **Mobile-native**             | Devvit Web app — works wherever Reddit works. Toolbox is desktop-only.                                                           |
| **Showcases Devvit Realtime** | Built around Reddit's pub/sub primitive — a feature Reddit's team wants developers using.                                        |

## Stack

- [Devvit](https://developers.reddit.com/docs) — Reddit Developer Platform
- Devvit Web (webview + React + TypeScript)
- Devvit Realtime (pub/sub for live alarms)
- Devvit Redis (event log + rolling baselines)

## Status

See [docs/PROGRESS.md](docs/PROGRESS.md) for the running build log.

## A note on naming

- **Brand (everywhere user-facing):** **ModarBot** — README, demo video, App Directory listing, submission copy. Always CamelCase.
- **Technical identifier:** `modarbot` (lowercase) — App Directory URL slug, npm package name, folder name. Only appears in URLs and code.
- **Test subreddit:** `r/ModarBotTest` — the playtest community used during development and judging.

Single rule: capitalize **ModarBot** for humans, lowercase **modarbot** for machines.

## Docs

- [docs/HACKATHON.md](docs/HACKATHON.md) — hackathon rules, dates, submission requirements
- [docs/IDEA.md](docs/IDEA.md) — full concept, pain evidence, competitor analysis
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — signal pipeline, Realtime bus, dashboard design
- [docs/PROGRESS.md](docs/PROGRESS.md) — running build log
- [CLAUDE.md](CLAUDE.md) — onboarding for Claude Code sessions on this repo
