# ModarBot — Devpost Submission Copy

Paste-ready text for the Devpost form. Edit as you go; never push secrets.

---

## Project name

```
ModarBot
```

## Tagline (one line)

```
Catch the raid before it catches you — real-time subreddit anomaly detection built on Devvit.
```

## Tool Overview

> _Where the form asks: "Describe in detail the functionality of the bot. Include all capabilities and how moderators and users are intended to use the app."_

ModarBot is a Devvit Web app that watches a subreddit's live event stream and alerts the mod team the moment something unusual is happening — a brigade, a sock-puppet wave, a coordinated spam attack, an unusual vote pattern. It runs entirely on Devvit infrastructure (Realtime + Redis), uses zero AI and zero external APIs, and costs the publisher and the installer $0 forever.

**How it works**

1. **Event ingestion.** Five Devvit triggers (`onPostSubmit`, `onCommentSubmit`, `onPostReport`, `onCommentReport`, `onModAction`) feed a 24-hour rolling event log in Devvit Redis.
2. **Statistical detectors.** Independent pure-function detectors read the event log and rolling baselines, each emitting an `AnomalyEvent` with severity (0–1) and a plain-English reason:
   - **Account-age anomaly** — sudden flood of <30-day accounts posting (EWMA + 3σ)
   - **Report storm** — ≥5 distinct reporters against one user in 15 min
   - **Comment cascade** — single thread's comment velocity spikes ≥5× its baseline
   - **New-account cluster** — ≥4 accounts created within 14 days of each other active in the same thread
   - (v2 roadmap: vote-pattern anomaly, cross-post influx)
3. **Watchtower custom post.** A sticky mod-only post is created on app install. It shows a status orb (green/yellow/red), a live anomaly feed, and a settings panel. Mods click **Investigate** on any row to open a drill-down modal with the offending accounts, posts, and threads, plus one-click bulk actions (ban, remove, lock) — **always with explicit confirm**.
4. **Realtime alerts.** Fresh anomalies publish on the per-sub `modarbot:{sub}` Devvit Realtime channel, updating the Watchtower in milliseconds. When severity crosses the sub-configured threshold for that signal, ModarBot also sends a throttled modmail (one per anomaly type per 10 min) so mods who aren't watching the Watchtower still get pinged.
5. **Settings.** Mods tune per-signal sensitivity sliders, pick the alert channel (modmail / push / both / silent), and can pause ModarBot entirely. All settings persist per-sub in Redis.

**How mods use it**

- Install once. Watchtower appears automatically (`onAppInstall` posts it).
- Open Watchtower from the sub's pinned posts whenever the orb is yellow/red.
- Triage from the live feed; dismiss false positives; click Investigate on real ones; bulk-action with confirmation.
- Modmail catches them when they aren't in the app.

**What ModarBot does not do**

- No AI content classification.
- No external API calls or third-party services.
- No auto-actions without explicit mod confirmation.
- Never names an external subreddit as a brigade source (defamation risk).
- Never aggregates data across subs.

## Project Impact

> _Where the form asks: "List 1-3 communities that you think would find this app useful and how you see moderators/communities benefiting."_

**Target community profiles (any of these would benefit immediately):**

1. **Politics-adjacent subs (e.g. r/PoliticalDiscussion, r/NeutralPolitics, regional/election-cycle subs).** These take brigades almost daily during news cycles. Currently mods discover the brigade after their post is buried in hostile comments. ModarBot's comment cascade + new-account cluster detectors catch this in seconds. Expected impact: time-to-detection drops from ~1–2 hours to <60 seconds.
2. **NSFW or controversial-topic subs that attract organized harassment campaigns.** Report storms against individual users are a known harassment vector. ModarBot's report-storm detector aggregates by target user and surfaces the pattern instead of the noise. Expected impact: mods can ban-and-protect a targeted user before the campaign succeeds.
3. **Mid-size hobby/fandom subs (~50k–500k members) that get traffic spikes from external subs or off-Reddit links.** The account-age anomaly detector catches the wave of new accounts the moment the inbound link goes viral. Expected impact: stricter Crowd-Control-equivalent posture exactly when needed, not retroactively.

**Why it matters at scale**

AutoModerator handles ~82% of content with rules and regex but cannot see waves — it only sees one item at a time. Toolbox helps with per-item history but is desktop-only. Crowd Control is blunt and global. ModarBot fills the missing layer: **pattern detection across the live event stream, in real time, on every device Reddit runs on**.

## Why no AI?

This is a deliberate product choice and a competitive advantage:

- **$0 ongoing cost** for the publisher and installer alike. The app is sustainable from day one, no matter how viral it goes.
- **Deterministic and explainable.** Every alarm has a reason a mod can verify: "5 accounts under 30 days old posted in this thread in 8 minutes." No black box.
- **No data leaves the sub.** No external API, no model provider, no privacy concerns.
- **Speed.** Statistical checks run in milliseconds; no API latency.

When jurors ask "how does this stay running after the hackathon?" the answer is: it already does. There is nothing to pay for.

## Tech stack

- **Devvit Web** — React 19 + Tailwind 4 + Vite (webview)
- **Hono** server + tRPC v11 (Node 22 serverless)
- **Devvit Realtime** — `modarbot:{sub}` channel per install
- **Devvit Redis** — rolling event log + EWMA baselines + settings

## Links to include in the form

- **App listing:** `https://developers.reddit.com/apps/modarbot` _(fill once published)_
- **Test post:** `https://reddit.com/r/ModarBotTest/comments/<post-id>` _(fill once Watchtower deployed)_
- **GitHub repo:** `https://github.com/<your-handle>/modarbot`
- **Demo video:** _(YouTube link once recorded)_
- **Team member Reddit username:** `u/erenisci`
