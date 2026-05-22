# ModarBot — Concept & Rationale

## The pitch (one line)

ModarBot watches your subreddit's live event stream and lights up the moment patterns diverge from baseline — so your mod team catches a brigade, raid, or coordinated spam wave while it's happening, not hours after the damage is done.

## The problem

**Brigading is invisible to mods until it's too late.**

A brigade — a group of users coordinating from elsewhere on Reddit (or off-Reddit) to mass-vote, mass-comment, or mass-report on a target sub — is one of the most common and most damaging moderation events. Every active sub has been hit. The current detection model is:

> _"A user DMs the mods after their post is buried under 200 hostile comments. The mods then spend an hour piecing together what happened from the mod log."_

There is no real-time signal. AutoModerator can match keywords in a single comment but knows nothing about traffic patterns. Crowd Control limits visibility from low-karma accounts but only globally, not in response to an active event. Toolbox has user history but operates per-item, not per-sub-trend. The native mod queue is chronological and shows nothing about the wave it sits in.

The signal mods need: _"something is unusual right now."_ The signal nobody provides: _that._

## Why ModarBot fits the hackathon

| Judging criterion    | How ModarBot scores                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Community Impact** | Every active sub has been brigaded. The pain is universal, the existing solution is "find out an hour later," and ModarBot collapses that to seconds. Time-to-detection is a measurable, demoable metric. |
| **Polish**           | Tight scope — one signal pipeline, one custom post, one alarm bus — means we can polish every animation, every threshold default, every empty state.                                                      |
| **Reliable UX**      | Pure layer. ModarBot never replaces AutoMod, never replaces the queue, never auto-actions without a mod click. Zero conflict with anything else installed.                                                |
| **Ecosystem Impact** | Zero existing solutions on Devvit, in Toolbox, in the fsvreddit Devvit ecosystem, or among the popular PRAW bots. Net new category. Showcases Devvit Realtime, which Reddit's team is actively promoting. |

## What ModarBot is (and is not)

**ModarBot is:** a passive observer + pattern detector + alarm. It surfaces unusual activity and gives mods one-click bulk actions when they want to respond.

**ModarBot is not:** an AI content classifier, an AutoMod replacement, a cross-subreddit intelligence network, or a tool that bans users autonomously. Each of those would either burn money, raise privacy issues, or undermine mod trust.

## The detectors (v1 set)

Six independent statistical/heuristic detectors. Each is small, each is testable, each runs cheap.

| Detector                 | What it watches                                                                             | Typical trigger                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Account-age anomaly**  | % of new (<30d) accounts posting in a rolling 10-min window vs sub's 24h baseline           | Window exceeds baseline + 3σ                                                   |
| **Report storm**         | Number of distinct new reports against a single user in a 15-min window                     | ≥ 5 reports from distinct accounts                                             |
| **Vote-pattern anomaly** | Live upvote ratio of a post vs the sub's typical ratio curve at the same post age           | Divergence > sub-configured tolerance                                          |
| **Comment cascade**      | New-comment velocity on a single post (comments per minute) vs the post's earlier velocity  | Velocity > 5× the prior 30-min baseline                                        |
| **Cross-post influx**    | Count of new comments/posts referencing the sub from external subs in a rolling window      | Sustained spike vs baseline                                                    |
| **New-account cluster**  | Multiple accounts created within X days of each other posting/commenting in the same thread | ≥ 4 accounts with creation dates within 14d active in one thread within 30 min |

Detectors are independent. Each emits an `AnomalyEvent` with type, severity (0–1), affected entities (post/user/thread IDs), and a human-readable reason. Combining is downstream's problem.

## Why "no AI" is a feature, not a constraint

| Concern        | ModarBot's answer                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cost           | $0 ongoing. Pure Devvit infrastructure. The publisher (us) never pays anything; installers never need an API key.                                                                                         |
| Sustainability | The product works exactly the same on day 1, day 100, and day 1000. No model deprecation, no rate-limit anxiety.                                                                                          |
| Explainability | Every alarm has a deterministic reason: "5 accounts under 30 days old posted in this thread in 8 minutes." A mod can verify it, push back on it, or tune the threshold. AI classifiers don't expose that. |
| Trust          | Mods can audit the rules. Nothing is a black box. Nothing trains on their data. Nothing leaves the sub.                                                                                                   |
| Speed          | Statistical checks run in milliseconds. No external API latency. No timeout fallback paths.                                                                                                               |

This is also the answer to the most likely jury question after the demo: _"How does this stay running after the hackathon?"_ Answer: _"It already does. There's nothing to pay for."_

## Competitor landscape

| Tool                   | What it does                                                                                 | Gap ModarBot fills                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| AutoModerator          | Per-item keyword/regex rules                                                                 | Looks at a single item; cannot see waves                              |
| Crowd Control          | Visibility limits for low-karma posters, globally                                            | Not event-driven; doesn't alert; doesn't surface specifics            |
| Toolbox                | Browser ext for per-item queue work                                                          | Desktop-only; per-item, not per-sub-trend                             |
| Mod Queue (native)     | Chronological list of reports                                                                | No pattern surfacing; no real-time aggregation                        |
| Mod Notes (native)     | Per-user annotations                                                                         | Per-user, not cross-user pattern                                      |
| fsvreddit Devvit suite | Modmail automation, source-based bans, trending alerts                                       | None of these address coordinated cross-account activity in real time |
| Trending Tattler       | Alerts when a sub's post hits /r/all                                                         | Alerts to virality, not to brigading or anomaly                       |
| Spam SRC Spotter       | Source-based spam bans (known bad domains)                                                   | Domain-list driven; doesn't see coordinated behavior                  |
| **ModarBot**           | Real-time pattern detection over the live event stream + Watchtower + one-click bulk actions | This whole row is empty without ModarBot                              |

## Inheritance from past Devvit hackathon winners

Previous Devvit hackathons were game-focused; the winning patterns nonetheless map onto mod tools:

| Past winner pattern                                                     | ModarBot's application                                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Daily / live rhythm (Daily Dungeon, Hexaword, 575, Wordpaths)           | Watchtower is live — the orb is always reflecting current state                                   |
| Collaborative / team feel (Pixel Together, Story Stitch, Daily Dungeon) | The whole mod team sees the same Watchtower; alerts and actions are shared                        |
| Simple core, polished custom post                                       | One status orb + one feed + one drill-down. The whole UI is one screen and we polish every pixel. |
| Visual "wow" early                                                      | The orb flipping red within seconds of a simulated brigade is the demo's hook                     |

## Out of scope (explicit)

- AI-based content classification (cost burden, undermines explainability)
- Naming external subs as the source of brigades (defamation risk, never worth it)
- Auto-banning without explicit mod confirmation (trust killer, hackathon-rule-edge)
- Historical analytics dashboards beyond a rolling 24h window (post-v1)
- Cross-subreddit ModarBot-network with shared signals (post-v1; opens privacy issues and adds infra)
- Replacing AutoMod or the mod queue (ModarBot layers on top; never competes)
