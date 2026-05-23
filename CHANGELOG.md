# Changelog

All notable changes to ModarBot will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-hackathon] — 2026-05-23

First publicly shippable build of ModarBot, submitted to the Reddit Mod Tools and Migrated Apps Hackathon 2026.

### Added

- **Signal pipeline** — six independent statistical detectors:
  - `account_age` — share of <30 d accounts in a 10 min window vs EWMA baseline + 3σ
  - `report_storm` — ≥5 distinct reporters against one user in 15 min
  - `comment_cascade` — per-thread comment burst factor ≥5× prior 30 min rate
  - `new_account_cluster` — ≥4 accounts within 14 d spread active in one thread within 30 min
  - `cross_post_influx` — share of inbound external-sub references vs EWMA baseline + 3σ
  - `vote_pattern` — per-post upvote-ratio drop ≥0.2 between Scheduler snapshots (every 2 min)
- **Event ingestion** through `onPostSubmit`, `onCommentSubmit`, `onPostReport`, `onCommentReport`, `onModAction` Devvit triggers into a 24 h rolling Redis sorted-set log.
- **Detector orchestrator** runs the five event-driven detectors via `Promise.allSettled`, dedupes with atomic `redis.set(..., { nx: true })` per anomaly.
- **Devvit Scheduler** task `vote-snapshot` runs every 2 min, fetches latest posts via `reddit.getNewPosts`, persists per-post snapshots, and dispatches `vote_pattern` anomalies.
- **Realtime alarm bus** publishes anomalies and orb-status updates on the per-sub `modarbot:{sub}` Devvit Realtime channel.
- **Watchtower custom post** — single React webview with status orb (green / yellow / red, pulse on yellow + red), live anomaly feed, Investigate / Dismiss row actions, drill-down modal with one-click bulk actions (ban / remove / lock) gated by explicit confirmation, and a Settings panel with per-signal sensitivity sliders, alert-channel selector, master enabled toggle, and demo / debug fire buttons.
- **Modmail alert dispatcher** posts a markdown modmail when an anomaly's severity ≥ the sub's per-signal threshold. Throttled to one alert per anomaly type per 10 min.
- **Compact splash** (inline view) showing a mini orb, active count, and "Open Watchtower" CTA.
- **Auto-refreshing time-ago labels** on every anomaly row (30 s tick).
- **Toast notifications** for dismiss / bulk action / settings save / demo fire.
- **Loading skeleton** matching the eventual Watchtower layout instead of a text-only loading state.
- **React error boundary** around the Watchtower root.
- **Accessible modals** — Escape-to-close, backdrop click, `role="dialog"` + `aria-modal` + `aria-labelledby`.
- **Severity bar** carries `role="meter"` + `aria-valuenow` + `aria-valuetext` + a screen-reader-only label.
- **Mobile-responsive** modal widths (`max-w-[calc(100vw-2rem)] sm:max-w-md|lg`) and stacked Watchtower header on narrow viewports.
- **Custom ModarBot icon** at `public/modarbot-icon.svg` (replaces the Devvit template's Snoo image).
- **Project docs:** `README.md` (pitch + repo layout + badges), `CLAUDE.md` (AI session brief), `docs/IDEA.md` (concept, competitor analysis), `docs/ARCHITECTURE.md` (signal pipeline, Realtime, Redis schema, failure modes, security model), `docs/PROGRESS.md` (running build log), `docs/SUBMISSION.md` (Devpost-ready copy), `docs/DEMO_SCRIPT.md` (60 s demo script), `docs/HACKATHON.md` (rules summary).

### Security

- **Authorization gate on every mutating `/api` route.** `/api/anomaly/:id/{dismiss,action,bulk}`, `/api/settings`, and `/api/demo/*` go through a `requireMod` middleware that resolves the caller via `reddit.getCurrentUsername()` and verifies them through `reddit.getModerators({ subredditName, username })`. The `forUserType: "moderator"` flag in `devvit.json` is treated strictly as UI gating, never as authorization.
- **Entity allowlist on bulk actions.** `POST /api/anomaly/:id/bulk` loads the anomaly from Redis and intersects the client-supplied `users` / `posts` / `threads` with the anomaly's stored entities. Only the intersection reaches `reddit.banUser` / `.remove()` / `.lock()` (capped at 20 / 20 / 5 per call).
- **Atomic dedupe lock.** `recordAnomaly` uses `redis.set(..., { nx: true })` instead of a check-then-act sequence, eliminating a TOCTOU race that could have inserted duplicate anomalies under burst load.
- **Rate-limited demo trigger.** `/api/demo/trigger` enforces a 20 s per-moderator cooldown to prevent modmail spam from a runaway debug fire.

### Constraints (by design)

- **No AI**, no external API calls, no publisher API key. Detector logic is purely statistical / heuristic.
- **No cross-subreddit data sharing**, no naming of external subs as brigade sources in UI or notifications.
- **No auto-actions** — every ban / remove / lock requires an explicit mod confirmation click in the drill-down.
