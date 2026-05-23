# ModarBot — Architecture

## High-level flow

```
┌─────────────────────────┐
│ Reddit events           │
│ (posts, comments,       │
│  reports, votes)        │
└────────────┬────────────┘
             │ Devvit triggers + scheduled polls
             ▼
┌─────────────────────────┐         ┌───────────────────────────┐
│ Event ingestion         │ ──────▶ │ Event log + rolling       │
│ (src/ingest/*)          │         │ baselines (Devvit Redis)  │
└────────────┬────────────┘         └───────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│ Detector pipeline       │  ◀── reads baselines + recent events
│ (src/detectors/*.ts)    │
│  • account_age          │
│  • report_storm         │
│  • vote_pattern         │
│  • comment_cascade      │
│  • cross_post_influx    │
│  • new_account_cluster  │
└────────────┬────────────┘
             │ AnomalyEvent {type, severity, reason, entities}
             ▼
┌─────────────────────────┐         ┌───────────────────────────┐
│ Realtime alarm bus      │ ──────▶ │ Watchtower custom post    │
│ (Devvit Realtime        │         │ (orb + feed + drill-down) │
│  channel per sub)       │         └───────────────────────────┘
└────────────┬────────────┘
             │
             ▼ (when severity > threshold)
┌─────────────────────────┐
│ Notification dispatcher │ ──▶ modmail / push to mod team
└─────────────────────────┘
```

## Components

### 1. Event ingestion (`src/ingest/`)

Devvit exposes triggers and APIs. ModarBot subscribes to:

| Source         | Devvit hook                                                         |
| -------------- | ------------------------------------------------------------------- |
| New posts      | `onPostSubmit` trigger                                              |
| New comments   | `onCommentSubmit` trigger                                           |
| Reports        | `onPostReport` and `onCommentReport` triggers                       |
| Vote snapshots | Scheduler job every N minutes (Devvit triggers don't fire on votes) |
| Mod log        | `onModAction` trigger (for action drill-down)                       |

Each event is normalized into a compact record and appended to an in-Redis event log (capped to 24h, FIFO eviction). The log is the single source of truth for detectors.

### 2. Rolling baselines (`src/baselines/`)

For each detector that needs a baseline (account-age, vote-pattern, comment-cascade, cross-post), ModarBot maintains a rolling 7-day baseline in Redis. Updates happen lazily on event ingestion — each new event nudges the baseline.

Baselines stored as compact histograms / EWMA values to keep memory bounded.

### 3. Detector pipeline (`src/detectors/`)

Each detector is a pure function: `(eventLog, baselines, settings) → AnomalyEvent[]`.

| File                     | Detector             | Inputs                                                           | Trigger logic                                                            |
| ------------------------ | -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `account_age.ts`         | Account-age anomaly  | Last 10 min of post/comment events, baseline % new-account share | Window share > baseline + Nσ                                             |
| `report_storm.ts`        | Report storm         | Last 15 min of report events grouped by target user              | Distinct reporters ≥ threshold                                           |
| `vote_pattern.ts`        | Vote-pattern anomaly | Per-post snapshots from `storage/vote-snapshots` (Scheduler tick)| Ratio drops ≥0.2 between snapshots ≥5 min apart, post age < 12 h         |
| `comment_cascade.ts`     | Comment cascade      | Comments/min on each active post vs same post's last 30-min rate | Burst factor ≥ threshold                                                 |
| `cross_post_influx.ts`   | Cross-post influx    | Comments referencing the sub from outside                        | Window count > baseline + Nσ                                             |
| `new_account_cluster.ts` | New-account cluster  | Active threads, posters' account creation dates                  | ≥ 4 accounts within 14d of each other active in one thread within 30 min |

The pipeline runs:

- Synchronously on every event ingestion (5 of 6 detectors run here)
- On a Devvit Scheduler tick every 2 minutes for `vote_pattern`, which depends on per-post upvote-ratio snapshots fetched via `reddit.getNewPosts` (Devvit triggers do not fire on votes)

Each `AnomalyEvent` is deduped against recent events (don't refire the same alarm every 60s) and written to a "live anomalies" Redis sorted set keyed by sub.

### 4. Realtime alarm bus

When a new (deduped) `AnomalyEvent` is emitted, ModarBot:

1. Publishes to Devvit Realtime channel `modarbot:{subreddit}` for subscribers (the Watchtower custom post).
2. If severity > sub-configured threshold, hands off to the notification dispatcher.

### 5. Watchtower custom post (`src/posts/watchtower/`)

Devvit Web (webview) app with a single screen and three sections:

**Status orb** — a single large element at the top, color-coded by aggregate severity:

- 🟢 No active anomalies (highest severity in last 30 min < 0.3)
- 🟡 Watch (0.3–0.7)
- 🔴 Alert (> 0.7)

Subtle pulse animation tied to the highest active severity.

**Live anomaly feed** — last 10 anomaly events, each as a row:

- Time, type icon, one-line reason, severity bar, "Investigate" button.
- Auto-updates via Realtime subscription.

**Drill-down view** — clicking "Investigate" replaces the feed with:

- The affected entities (accounts, posts, threads).
- Each row links out to the item.
- Bulk action buttons at the bottom: "Ban all," "Remove all posts," "Lock thread," "Dismiss alarm."
- All actions require explicit confirmation.

**Settings tab** — per-signal sensitivity sliders, mute schedules (e.g. mute 02:00–08:00), alert delivery channel (modmail / push / both), and a "Pause ModarBot" toggle.

### 6. Notification dispatcher (`src/notify/`)

When a severe `AnomalyEvent` fires:

- Posts a modmail message to the team with the reason and a deep link to Watchtower.
- Optionally pushes a Devvit native notification to mods who opted in.

Throttled to one notification per anomaly-type per 10 min to avoid spam.

## Data model

```ts
type RawEvent =
  | {
      kind: 'post';
      id: string;
      author: string;
      authorCreatedAt: number;
      subreddit: string;
      postedAt: number;
      threadId: string;
    }
  | {
      kind: 'comment';
      id: string;
      author: string;
      authorCreatedAt: number;
      subreddit: string;
      postedAt: number;
      parentId: string;
      threadId: string;
      bodyLen: number;
    }
  | {
      kind: 'report';
      id: string;
      reporter: string;
      targetUser: string;
      targetId: string;
      reason: string;
      reportedAt: number;
    }
  | {
      kind: 'voteSnap';
      postId: string;
      takenAt: number;
      ups: number;
      downs: number;
      ratio: number;
    }
  | {
      kind: 'modAction';
      actor: string;
      action: string;
      targetId: string;
      at: number;
    };

type AnomalyEvent = {
  id: string;
  subreddit: string;
  type:
    | 'account_age'
    | 'report_storm'
    | 'vote_pattern'
    | 'comment_cascade'
    | 'cross_post_influx'
    | 'new_account_cluster';
  severity: number;
  reason: string;
  firedAt: number;
  entities: { users?: string[]; posts?: string[]; threads?: string[] };
  status: 'active' | 'dismissed' | 'actioned';
};

type SubSettings = {
  thresholds: Partial<Record<AnomalyEvent['type'], number>>;
  alertChannel: 'modmail' | 'push' | 'both' | 'none';
  muteWindows: Array<{ startHour: number; endHour: number; tz: string }>;
  enabled: boolean;
};
```

## Storage (Devvit Redis)

| Key                                  | Type                    | Purpose                       | TTL         |
| ------------------------------------ | ----------------------- | ----------------------------- | ----------- |
| `modarbot:{sub}:events`              | Sorted set (by ts)      | 24h event log                 | rolling 24h |
| `modarbot:{sub}:baseline:{kind}`     | Hash                    | EWMA / histogram per detector | rolling 7d  |
| `modarbot:{sub}:anomalies`           | Sorted set (by firedAt) | Active + recent anomalies     | 48h         |
| `modarbot:{sub}:settings`            | Hash                    | SubSettings                   | persistent  |
| `modarbot:{sub}:dedupe:{type}:{key}` | String                  | Per-anomaly dedupe lock       | 10 min      |

## Realtime channel

- Channel name: `modarbot:{subreddit}`
- Publish events: `{ kind: 'anomaly', anomaly: AnomalyEvent }` and `{ kind: 'status_update', orb: 'green'|'yellow'|'red' }`
- Subscribers: every Watchtower post instance in the sub

## Costs & scaling

- ModarBot performs zero outbound HTTP. No external API. No publisher key.
- Devvit Redis is included with the platform.
- Devvit Realtime is included with the platform.
- At-rest cost to publisher: **$0**.
- At-runtime cost to installer: **$0**.
- Bounded memory: per-sub data is capped (24h event log + small baselines).

## Failure modes & fallbacks

| Failure                                        | Behavior                                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Devvit Realtime quota exhausted                | Watchtower polls anomalies sorted set every 5s; degraded but functional.                                                                                          |
| Detector throws                                | Logged; one bad detector never blocks others.                                                                                                                     |
| Baseline corrupted / new sub with no history   | Detectors that need baseline return no events for the first 24h after install; UI shows "ModarBot is learning your sub's normal patterns — full coverage in 24h." |
| Sub volume so high event log fills 24h in <24h | Eviction is FIFO — old events drop. Detectors still see most-recent windows.                                                                                      |
| Sub volume so low no baseline forms            | Severity dampened by sample-size factor; UI surfaces "low confidence" badge.                                                                                      |
| Mod team disabled ModarBot                     | Toggle off in settings; ingestion and detectors pause.                                                                                                            |

## Security & privacy

- No data leaves the sub.
- No cross-sub aggregation.
- No naming of external subs as brigade sources in UI or notifications.
- Mod settings encrypted at rest by Devvit.
- All mod actions logged via Reddit's native mod log (ModarBot never bypasses it).
