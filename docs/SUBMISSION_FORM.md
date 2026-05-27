# ModarBot — Hackathon Submission Form Answers

Copy-paste ready. Fill in the blanks marked with `[___]`.

---

## App listing link

```
https://developers.reddit.com/apps/modarbot
```

## Reddit usernames

```
u/erenisci
```

## Tool Overview

ModarBot is a Devvit Web app that watches a subreddit's live event stream and alerts the mod team the moment something unusual is happening — a brigade, a sock-puppet wave, a coordinated spam attack, an unusual vote pattern. It runs entirely on Devvit infrastructure (Realtime + Redis), uses zero AI and zero external APIs, and costs the publisher and the installer $0 forever.

**How it works:**

1. **Event ingestion.** Five Devvit triggers (onPostSubmit, onCommentSubmit, onPostReport, onCommentReport, onModAction) feed a 24-hour rolling event log in Devvit Redis.

2. **Six statistical detectors** — each independent, each emitting an AnomalyEvent with severity (0–1) and a plain-English reason:
   - **Account-age anomaly** — sudden flood of <30-day accounts posting (EWMA + 3σ)
   - **Report storm** — ≥5 distinct reporters against one user in 15 min
   - **Comment cascade** — single thread's comment velocity spikes ≥5× its baseline
   - **New-account cluster** — ≥4 accounts created within 14 days of each other active in the same thread
   - **Cross-post influx** — burst of inbound posts referencing external subreddits vs the sub's baseline (EWMA + 3σ)
   - **Vote-pattern anomaly** — per-post upvote ratio drops ≥20 points between Scheduler snapshots (every 2 min, post age < 12h)

3. **Watchtower custom post.** A sticky mod-only post created on app install. Shows a status orb (green/yellow/red), a live anomaly feed, and a settings panel. Mods click "Investigate" on any row to open a drill-down modal with the offending accounts, posts, and threads, plus one-click bulk actions (ban, remove, lock) — always with explicit mod confirmation. Dismissed anomalies can be re-investigated.

4. **Realtime alerts.** Fresh anomalies publish on the per-sub Devvit Realtime channel, updating the Watchtower in real time. When severity crosses the sub-configured threshold, ModarBot sends a throttled modmail (one per anomaly type per 10 min).

5. **Settings.** Mods tune per-signal sensitivity sliders, pick the alert channel (modmail / push / both / silent), and can pause ModarBot entirely. All settings persist per-sub in Redis.

**Security highlights:**
- Every mutating API endpoint requires server-side moderator verification
- Bulk actions are limited to entities the anomaly actually detected (allowlist intersection)
- No auto-actions without explicit mod confirmation
- No data leaves the sub; no cross-sub aggregation

## Project Impact

**Target communities:**

1. **Politics-adjacent subs (e.g. r/PoliticalDiscussion, r/NeutralPolitics, regional/election-cycle subs).** These take brigades almost daily during news cycles. Currently mods discover the brigade after their post is buried in hostile comments. ModarBot's comment cascade + new-account cluster detectors catch this in seconds. Expected impact: time-to-detection drops from ~1–2 hours to <60 seconds.

2. **NSFW or controversial-topic subs that attract organized harassment campaigns.** Report storms against individual users are a known harassment vector. ModarBot's report-storm detector aggregates by target user and surfaces the pattern instead of the noise. Expected impact: mods can ban-and-protect a targeted user before the campaign succeeds.

3. **Mid-size hobby/fandom subs (~50k–500k members) that get traffic spikes from external subs or off-Reddit links.** The account-age anomaly detector catches the wave of new accounts the moment the inbound link goes viral. Expected impact: stricter crowd-control equivalent posture exactly when needed, not retroactively.

## Why no AI?

$0 ongoing cost for the publisher and installer. Deterministic and explainable — every alarm has a reason a mod can verify. No data leaves the sub. No model deprecation. When judges ask "how does this stay running after the hackathon?" the answer is: it already does. There's nothing to pay for.

## GitHub repo

```
https://github.com/erenisci/modarbot
```

## Demo video (optional)

```
[___ YouTube unlisted link, if recorded ___]
```

## Test post link

```
https://reddit.com/r/ModarBotTest/comments/[___ post ID from Watchtower ___]
```

## Developer Platform feedback (optional)

```
[___ Fill survey link if completing for Feedback Award ___]
```

## Helper Nomination (optional)

```
[___ If nominating someone from r/Devvit or Discord who helped ___]
```

---

## Quick Stats (for your reference, don't paste these)

- 40 TypeScript source files, 2,732 lines
- 24 commits on main
- 6 anomaly detectors (5 event-driven + 1 scheduler-based)
- 7 Redis key patterns per sub
- Devvit Realtime channel per sub
- Mod-only auth + entity allowlist on all mutating routes
- Atomic dedupe (SET NX) on anomaly recording
- Rate-limited demo trigger (20s per mod)
- React ErrorBoundary + accessible modals + auto-refreshing timestamps + toast notifications
- Custom SVG icon, CHANGELOG, full documentation suite
