# Claude Code instructions — ModarBot

This file briefs future Claude Code sessions working on this repo. Read it before touching code.

## Project at a glance

- **What:** ModarBot — a real-time subreddit anomaly detector built on Devvit. Watches for brigades, sock-puppet attacks, coordinated spam, and traffic spikes; alerts the mod team via a Watchtower custom post + Realtime channel.
- **Tagline:** _Catch the raid before it catches you._
- **Why:** Submission for the [Reddit Mod Tools Hackathon](docs/HACKATHON.md), _New Mod Tool_ category, $10K grand prize.
- **Hard deadline:** **2026-05-27 18:00 PDT** (2026-05-28 04:00 GMT+3). Treat every decision through the lens of "does this ship before the deadline?"

## Stack & tooling

Scaffolded from Devvit's official `React` web template (2026-05-22):

- Devvit CLI (`@devvit/cli` v0.12.24+) — installed globally
- **Frontend:** React 19, Tailwind CSS 4, Vite — runs in an iframe on reddit.com
- **Backend:** Node 22 serverless (Devvit), Hono server, tRPC v11 for type-safe client↔server
- **Devvit primitives:** Realtime (pub/sub), Redis, Reddit API client — all imported from `@devvit/web/server`
- App slug on the App Directory: **`modarbot`** (the name "modar" was taken). Brand still reads as **ModarBot**.
- **No external APIs.** No AI. No outbound HTTP. ModarBot runs entirely on Devvit infrastructure.

### Template conventions (from `AGENTS.md` — Devvit's own guide)

- `/src/server` — backend, runs serverless. Use `redis`, `reddit`, `context` from `@devvit/web/server`. tRPC router in `trpc.ts`, Hono app entrypoint in `index.ts`.
- `/src/client` — frontend in an iframe. Two entrypoints:
  - `splash.html` — inline view shown in the Reddit feed; keep it fast and dependency-light.
  - `game.html` — expanded view (despite the name — it's just "main React app"). Watchtower UI lives here.
- `/src/shared` — code shared between client and server.
- Triggers register in `devvit.json` and route to endpoints (e.g. `onAppInstall → /internal/triggers/on-app-install`).
- Project is **Devvit web only** — never import from `@devvit/public-api` (the older Blocks API). Always `@devvit/web/server` or `@devvit/web/client`.
- Type aliases over interfaces. Named exports. Never cast.

## Hard rules

1. **Scope is locked.** Six detectors (account-age anomaly, report storm, vote-pattern anomaly, comment cascade, cross-post influx, new-account cluster), one Watchtower custom post (status orb + feed + drill-down + settings), one Realtime alarm bus. If pressed for time, cut detectors from the back of the list first (cross-post, new-account cluster) — keep the orb and feed flawless.
2. **No AI, no external APIs, no costs.** This is a hard product constraint, not a preference. It's part of the sustainability story we tell judges.
3. **Auto-actions require explicit mod confirmation.** ModarBot can suggest "ban these 7 accounts" but never executes without a click. Trust killer otherwise.
4. **Originality timestamp.** Per hackathon rules, nothing in this repo can be from before 2026-04-29. Don't import pre-existing personal code.
5. **No data leaves the sub.** ModarBot never aggregates across subs, never reports another sub by name (defamation risk), never shares anomaly data externally. Privacy and legal safety baked in.
6. **Default to no comments / no docstrings in code.** Self-explanatory names. Comment only when the _why_ is non-obvious.

## Workflow

- Append to [docs/PROGRESS.md](docs/PROGRESS.md) after every meaningful chunk of work — one bullet per change, newest at top, never erase history.
- Use TodoWrite for in-session task tracking. Mark items complete as soon as done.
- Before adding a new dependency, justify it in docs/PROGRESS.md. Default answer: don't add one.

## Where things live

```
modarbot/                      ← project root — run all npm + devvit commands from here
├── README.md                  ← public-facing overview
├── CLAUDE.md                  ← this file
├── AGENTS.md                  ← Devvit's own template guide (don't edit)
├── LICENSE                    ← BSD-3-Clause (Devvit template default)
├── .env                       ← local secrets (never commit)
├── docs/
│   ├── HACKATHON.md           ← hackathon rules + deadlines
│   ├── IDEA.md                ← concept, pain evidence, competitor analysis
│   ├── ARCHITECTURE.md        ← signal pipeline + Realtime + dashboard design
│   └── PROGRESS.md            ← running build log
├── devvit.json                ← Devvit app config (triggers, menu, forms, entrypoints)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── public/                    ← static assets served from the webview
├── src/
│   ├── server/                ← backend (Hono + tRPC, runs serverless)
│   │   ├── core/              ← shared backend primitives (e.g. post creation)
│   │   ├── detectors/         ← anomaly detectors (one file each)
│   │   ├── routes/            ← Hono routers (api, menu, forms, triggers)
│   │   └── storage/           ← Redis helpers (keys, events, baselines, anomalies)
│   ├── client/                ← React frontend (splash.html + game.html)
│   └── shared/                ← types/utils shared client↔server
└── tools/                     ← helper scripts (template-provided)
```

**Run commands from `modarbot/`**: `npm run dev` (= `devvit playtest`), `npm run lint`, `npm run type-check`, `npm run deploy`.

## Demo video script (60s ceiling — first 30s must hook)

1. **0:00–0:05** — Title card: "ModarBot — catch the raid before it catches you."
2. **0:05–0:25** — Quiet sub timeline → simulated brigade dawn (test accounts post/vote in burst) → within 15 seconds the Watchtower orb flips green→red, a row appears in the live feed, the mod team gets a modmail ping.
3. **0:25–0:45** — Mod clicks Investigate → drill-down shows the 7 accounts, their creation dates clustered, their coordinated votes. One click: "Ban all" / "Remove all posts" / "Lock thread."
4. **0:45–0:60** — Sub returns to baseline; orb fades back to green. Closing card with install link + Devpost link.

## Submission checklist (don't ship without these)

- [ ] App published at `developers.reddit.com/apps/modarbot`
- [ ] Test post live in a public sub with <200 members
- [ ] Tool Overview written (drawn from `docs/IDEA.md`, lean on brigade-frequency story)
- [ ] Project Impact written (1-3 target subs + measurable benefit, e.g. detection-time delta)
- [ ] Demo video <1 min uploaded to YouTube (first 30s = simulated brigade detection)
- [ ] Public GitHub repo linked
- [ ] Devpost submission form filled and submitted before deadline

## Out of scope (do not build)

- AI-based content classification (introduces cost, undermines sustainability story)
- Cross-subreddit data sharing or attribution by name (privacy + defamation)
- Auto-actions without explicit mod confirmation (trust killer)
- Historical analytics dashboards beyond a 24h rolling window (post-v1)
- Replacing AutoMod, the mod queue, modmail, or any native tool — ModarBot is a layer, not a replacement
