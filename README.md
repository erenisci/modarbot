# ModarBot

> **Catch the raid before it catches you.**

Real-time anomaly detector for subreddits, built on [Devvit](https://developers.reddit.com/docs). ModarBot watches your sub's live event stream and lights up the moment a brigade, sock-puppet wave, or coordinated spam attack starts — so your mod team responds in seconds, not hours.

[![Hackathon](https://img.shields.io/badge/Reddit_Mod_Tools_Hackathon-2026-FF4500?style=flat-square)](https://mod-tools-migration.devpost.com/)
[![Devvit](https://img.shields.io/badge/Built_on-Devvit_Web-FF4500?style=flat-square)](https://developers.reddit.com/docs)
[![No AI](https://img.shields.io/badge/AI-not_used-22c55e?style=flat-square)](docs/IDEA.md)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-blue?style=flat-square)](LICENSE)

---

## The problem

Every active subreddit has been brigaded, raided, or hit by coordinated spam at some point. None of them saw it coming. Mods discover the damage hours later — usually after a user complaint or when the post is already buried under 200 hostile comments.

There is no real-time signal. AutoMod matches keywords on a single item. Crowd Control is blunt and global. Toolbox shows per-user history. Nothing watches the **wave**.

## What ModarBot does

Six independent statistical detectors continuously analyze the sub's live stream:

| Detector                    | What it catches                                                      |
| --------------------------- | -------------------------------------------------------------------- |
| 🆕 **Account-age anomaly**  | Sudden flood of new accounts (<30 days) posting in the sub           |
| 🚨 **Report storm**         | Many distinct reports against one user in a short window             |
| 📉 **Vote-pattern anomaly** | Post upvote ratio dropping sharply between scheduled snapshots       |
| 💬 **Comment cascade**      | Sudden spike in comment velocity on a single thread                  |
| 🔗 **Cross-post influx**    | Bursts of referral traffic from external subs                        |
| 👥 **New-account cluster**  | Accounts created within days of each other active in the same thread |

Each detector emits an `AnomalyEvent` with severity (0–1) and a plain-English reason. No AI. No external APIs. Just math.

## The Watchtower

A custom post in your mod-only area:

- **Status orb** — single 🟢 / 🟡 / 🔴 glance at sub health
- **Live anomaly feed** — last 10 events, severity bars, time-ago, one-tap **Investigate** / **Dismiss**
- **Drill-down** — surfaces the offending accounts and posts with one-click bulk actions (ban all, remove all, lock thread) — _always with an explicit mod confirmation_
- **Settings** — per-signal sensitivity sliders, mute schedules, alert channel

When severity crosses your threshold, the team gets a modmail or push notification. Severity below threshold? Silent — no spam.

## Why ModarBot wins

|                               |                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Universal pain**            | Every active sub has been raided. Current detection time: hours. ModarBot: seconds.                                           |
| **$0 forever**                | Pure Devvit infrastructure. No AI, no API keys, no publisher cost. Sustainable from day one.                                  |
| **No competitor**             | Nothing on Devvit, in Toolbox, in fsvreddit's ecosystem, or among PRAW bots covers cross-account real-time anomaly detection. |
| **Mobile-native**             | Devvit Web app — works wherever Reddit works. Toolbox is desktop-only.                                                        |
| **Showcases Devvit Realtime** | Built around Reddit's pub/sub primitive.                                                                                      |

## Tech stack

- **Devvit Web** — React 19 + Vite + Tailwind 4 (webview)
- **Hono** server + tRPC v11 (serverless Node 22)
- **Devvit Realtime** — anomaly publish/subscribe per sub
- **Devvit Redis** — 24h rolling event log + EWMA baselines

## Repo layout

```
├── src/
│   ├── server/             # Hono routes, detectors, ingest, Redis storage
│   │   ├── detectors/      # One file per anomaly detector
│   │   ├── ingest/         # Reddit event → RawEvent normalization
│   │   ├── realtime/       # Realtime publish helpers
│   │   ├── routes/         # /api + /internal triggers + menu
│   │   └── storage/        # Redis key conventions, baselines, events
│   ├── client/             # React Watchtower UI (splash + game webviews)
│   └── shared/             # Types shared between client and server
├── docs/                   # IDEA, ARCHITECTURE, PROGRESS, HACKATHON rules
├── devvit.json             # Devvit app config (triggers, menu, entrypoints)
└── package.json
```

## Documentation

- **[docs/IDEA.md](docs/IDEA.md)** — full concept, pain evidence, why no-AI is a feature, competitor analysis
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — signal pipeline, Realtime bus, Redis schema, failure modes
- **[docs/HACKATHON.md](docs/HACKATHON.md)** — hackathon rules, dates, submission requirements

## Status

🚧 In active development for the [Reddit Mod Tools and Migrated Apps Hackathon 2026](https://mod-tools-migration.devpost.com/) (deadline **May 27, 2026**).

App listing will go live at `developers.reddit.com/apps/modarbot` once published.

## License

[BSD-3-Clause](LICENSE) — the Devvit template default. Use it, fork it, build on it.
