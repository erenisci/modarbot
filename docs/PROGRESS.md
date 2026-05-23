# ModarBot — Build Progress

Running log. Newest entries on top. One line per change.

## 2026-05-23 (Day 2)

- **3 new detectors:**
  - `report_storm.ts` — fires when ≥5 distinct reporters target one user inside a 15-min window. Severity scales with reporter count.
  - `comment_cascade.ts` — compares last 10-min comment rate per thread to the prior 30-min baseline; fires when burst factor ≥ 5× and ≥ 8 recent comments. Severity scales with burst factor.
  - `new_account_cluster.ts` — scans active threads for ≥4 accounts whose creation dates fall within a 14-day spread, all active in the same thread within 30 min. Severity scales with cluster size.
- **Detector orchestrator** registers all 4 active detectors; each runs in `cycle(sub)` after every event.
- **Modmail alert dispatcher** (`server/notify/modmail.ts`): when a fresh anomaly's severity ≥ sub-configured threshold, posts a modmail to the team via `reddit.modMail.createConversation`. Throttled to one modmail per anomaly-type per 10 minutes.
- **Settings persistence** (`server/storage/settings.ts`): per-sub thresholds, alert channel, enabled flag stored in Redis hash. Defaults in `shared/api.ts`.
- **Realtime client subscribe** (`useWatchtower`): `connectRealtime` from `@devvit/web/client` subscribes to `modarbot:{sub}` after first state fetch; each push triggers a quick state re-fetch. Polling kept as 15s fallback. Cleanup disconnects on unmount.
- **Bulk action API** (`POST /api/anomaly/:id/bulk`): accepts `{ action: 'ban'|'remove'|'lock', users?, posts?, threads? }`. Caps each batch (20 users, 20 posts, 5 threads) and falls through individual failures.
- **Settings API** (`POST /api/settings`): persists draft `SubSettings`.
- **Drill-down modal** (`DrillDown.tsx`): shows offending accounts, posts, threads. Bulk action buttons require explicit second-click confirm. Closes the modal + marks anomaly `actioned` after success.
- **Settings panel** (`SettingsPanel.tsx`): per-signal sensitivity sliders, alert channel select, master enabled checkbox.
- **Watchtower** now has a `Settings` header button + paused banner when disabled.
- **Cycle wiring:** `cycle(sub)` now loads settings first; skips entirely when disabled; calls `dispatchAlerts` after publishing fresh anomalies.
- **Type-check:** `tsc --build` clean for client + server.

## 2026-05-22 (Day 1 end)

- **Server pipeline live:**
  - `devvit.json` now registers five live triggers (`onPostSubmit`, `onCommentSubmit`, `onPostReport`, `onCommentReport`, `onModAction`) in addition to `onAppInstall`. Example form + extra menu item removed.
  - `src/server/index.ts` no longer mounts the `forms` route; `src/server/routes/forms.ts` deleted.
  - `src/server/routes/triggers.ts` rewritten: each trigger hands the raw payload to the matching handler in `src/server/ingest/handlers.ts` (`ingestPostSubmit`, `ingestCommentSubmit`, `ingestReport`, `ingestModAction`), then runs `cycle(sub)` which (a) executes `runDetectors`, (b) publishes any fresh anomalies to the sub's Realtime channel, (c) updates the orb color. App-install also seeds `modarbot:{sub}:installed-at` for the learning-period banner.
  - `src/server/detectors/index.ts` orchestrates all detectors and dedupes via `recordAnomaly`. Current set: `account-age` only; report-storm / vote-pattern / comment-cascade / cross-post-influx / new-account-cluster still to add.
  - `src/server/realtime/publish.ts` publishes anomaly + orb events to channel `modarbot:{sub}` via `realtime.send` from `@devvit/web/server`.
  - `src/server/routes/api.ts` rewritten: counter endpoints replaced with `GET /api/state` (returns `WatchtowerState` with orb + anomalies + learning countdown) and `POST /api/anomaly/:id/{dismiss|action}` (status updates via `updateAnomalyStatus`).
- **Client Watchtower live:**
  - `src/client/hooks/useWatchtower.ts` polls `/api/state` every 5s, exposes `dismiss` + `actionTaken`. Polling is the v1 transport; switching to a Realtime channel subscription is a follow-up.
  - `src/client/components/StatusOrb.tsx` — large pulsing orb keyed to `OrbColor`, animates on yellow/red.
  - `src/client/components/AnomalyRow.tsx` — feed row with status chip, type label, reason, severity bar, time-ago, and "Investigate" / "Dismiss" actions for active items.
  - `src/client/game.tsx` rewritten: header + orb + learning-period banner + active/handled counts + anomaly feed + tagline footer. Counter UI fully gone.
  - `src/client/splash.tsx` rewritten: compact splash with mini orb + label + active count + "Open Watchtower" button.
- **Cleanup:** old `src/client/hooks/useCounter.ts` removed, stub `src/server/realtime.ts` removed (replaced by `src/server/realtime/publish.ts`).
- **Type-check passes:** `tsc --build` is clean for both client and server.

## 2026-05-22

- **Naming locked:** brand is **ModarBot** (CamelCase, every user-facing surface). Technical identifier is `modarbot` (lowercase — App Directory URL slug, npm package, folder, Redis key prefix). Test subreddit is `r/ModarBotTest`. The "Modar" name on its own is no longer used anywhere.
- **Repo layout:** Project root is flat at `c:\Users\iscie\Desktop\modarbot\`. Docs (`README.md`, `CLAUDE.md`, `PROGRESS.md`, `docs/HACKATHON.md`, `docs/IDEA.md`, `docs/ARCHITECTURE.md`), Devvit template files (`devvit.json`, `package.json`, `src/`, `public/`, `tools/`), and `.env` all sit alongside each other. All `npm` and `devvit` commands run from this folder.
- **Test subreddit:** `r/ModarBotTest` created (public, <200 members, crowd control off, discoverability off). Old `r/ModarTest` retired.
- **Scaffold:** Created Devvit Web app via `devvit new` → `Web` category → `React` template. Stack: React 19, Tailwind 4, Vite, Hono, tRPC v11, Node 22 serverless. App Directory slug is `modarbot` because `modar` was already taken; brand presentation remains "ModarBot".
- **Code in place so far:**
  - `src/shared/api.ts` — `AnomalyEvent`, `AnomalyType`, `WatchtowerState`, `SubSettings`, `ANOMALY_LABELS`, defaults.
  - `src/server/storage/keys.ts` — Redis key conventions (`modarbot:{sub}:events`, `:baseline:{kind}`, `:anomalies`, `:settings`, `:dedupe:{type}:{key}`) plus TTL constants.
  - `src/server/storage/events.ts` — 24h sorted-set event log with `appendEvent` + `recentEvents` helpers.
  - `src/server/storage/baselines.ts` — EWMA + Welford-style rolling baselines (mean, m2, count) per kind.
  - `src/server/storage/anomalies.ts` — anomaly storage + dedupe lock + status updates.
  - `src/server/detectors/account-age.ts` — first detector: percentage of `<30d` accounts in a 10-min window vs baseline ± 3σ.
  - `src/server/core/post.ts` — custom-post creator titled "ModarBot Watchtower".
- **Verified Devvit capabilities** (research before coding): Devvit Realtime pub/sub supported, Devvit Redis available, mod-action + post/comment + report triggers exist, outbound HTTP works server-side (not needed for ModarBot), Devvit Web (webview + React) is the 2026 recommended UI path. App-scope publisher secrets are supported (also not needed — ModarBot uses zero external APIs).
- **Plan locked:** see `~/.claude/plans/parsed-squishing-donut.md`. Six detectors + Watchtower custom post + Realtime alarm bus. No AI. No external HTTP. $0 ongoing cost.
- **Tagline:** _Catch the raid before it catches you._
- **Devvit CLI:** `@devvit/cli` v0.12.24 installed globally. `devvit login` completed.
- **Devpost:** user registered, project entry created (not filled yet — pending end-of-build).

---

## Next up

1. **Event ingestion wiring** — add `onPostSubmit`, `onCommentSubmit`, `onPostReport`, `onCommentReport`, `onModAction` triggers in `devvit.json`; route each to `/internal/triggers/*` endpoints in `src/server/routes/triggers.ts`; each endpoint normalizes the payload into a `RawEvent` and appends to Redis.
2. **Detector orchestrator** — on every event, run all enabled detectors, dedupe results, write to `:anomalies` sorted set, publish to Realtime channel.
3. **Watchtower UI (game.tsx)** — replace template's counter with status orb (green/yellow/red) + live anomaly feed list. Subscribe to Realtime channel for live updates.
4. **Inline splash (splash.tsx)** — compact status pill for the feed view.
5. **API routes (`src/server/routes/api.ts`)** — drop the counter endpoints; add `GET /api/state`, `POST /api/anomaly/:id/dismiss`, `POST /api/anomaly/:id/action` (bulk ban / remove / lock).
6. **More detectors** — report storm, vote-pattern (needs scheduled poll), comment cascade, cross-post influx, new-account cluster.
7. **Settings tab** — per-signal sensitivity sliders, alert channel, mute schedule, enabled toggle.
8. **Notification dispatcher** — modmail message when severity exceeds threshold; throttled to one per anomaly type per 10 min.
9. **Playtest in `r/ModarBotTest`** — simulate brigade with secondary accounts, tune detector thresholds with 2h of real-ish baseline data.
10. **Polish + 60s demo video** — first 30s must show: quiet sub → brigade arrival → orb flips red → mod clicks Investigate → bulk action → orb fades back to green.
11. **Publish app + Devpost submission** — set App Directory display name to "ModarBot", fill Tool Overview + Project Impact, link GitHub repo, link demo video.

## Open questions

- **Detector threshold defaults:** ship conservative (low false-positive). Need ~2h of `r/ModarBotTest` traffic to anchor sensible numbers.
- **Devvit Realtime rate limits:** confirm during first playtest. Fallback = Watchtower polls `:anomalies` sorted set every 5s.
- **Vote-pattern detector data source:** Devvit triggers do not fire on votes — needs a Scheduler poll (every 1–2 min). Confirm freshness during playtest.
- **Brigading attribution:** never name an external sub in UI/notifications (defamation). Stick to neutral "patterns" language.
- **Notification throttling:** one notification per anomaly type per 10 min seems reasonable; revisit after playtest.
- **Bulk action confirmation flow:** the drill-down UI must require an explicit confirm before any ban/remove/lock. Decide if it's a checkbox + button, a hold-to-confirm, or a typed-confirmation modal during build.
