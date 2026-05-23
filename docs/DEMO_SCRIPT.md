# ModarBot — 60-Second Demo Video Script

The hackathon brief says judges are not required to watch past 60 seconds. **Hook in the first 10. Land the wow in the first 30.**

Recording target: 1080p, ~12 seconds of pre-build + ~50 seconds of capture. OBS or similar.

---

## Setup (do this before pressing record)

1. **Two Reddit accounts** logged into different browsers / browser profiles:
   - **Mod browser:** logged in as `u/erenisci` (the mod) on r/ModarBotTest.
   - **Brigade browser:** 5+ alt accounts ready to post/comment in burst (or one alt + the post API to simulate a wave).
2. **Open r/ModarBotTest in the mod browser** with the ModarBot Watchtower post pinned at top.
3. **Tile the windows** so the mod browser is foreground but a sliver of the brigade browser is visible (optional — gives "incoming wave" visual).
4. **devvit playtest running** with verbose logs visible (optional cutaway).

## Scene-by-scene (timecodes are upper bounds)

### 0:00 – 0:05 · Title card

Black screen → fade in the ModarBot wordmark + tagline:

> **ModarBot**
> Catch the raid before it catches you.

Soft tone music starts.

### 0:05 – 0:12 · Problem statement (voiceover over a calm sub timeline)

Voiceover (or on-screen text):

> "Every active subreddit has been brigaded. By the time mods find out, the damage is done."

B-roll: scroll the r/ModarBotTest sub showing a normal-looking thread, no warnings.

### 0:12 – 0:18 · Cut to Watchtower — quiet state

Open the Watchtower post. Show:

- 🟢 green orb pulsing softly
- "All quiet" label
- "0 active · 0 handled" feed empty state

Voiceover:

> "ModarBot lives in your sub as a quiet status orb. Until it isn't quiet."

### 0:18 – 0:32 · The brigade hits

Switch to the brigade browser (or screen-record both side-by-side). In ~10 seconds:

- 4–5 alt accounts post comments in the test thread within 30 seconds
- 5+ reports filed against one of the alt-account posts

Cut back to the Watchtower (still on screen). **Within seconds:**

- 🟢 → 🔴 orb transition with the pulse animation kicking in
- "Comment cascade" row appears in the feed: _"12 comments on this thread in 10 minutes — 8× the prior pace."_
- "New-account cluster" row appears: _"4 accounts created within 9 days of each other are active in the same thread."_
- (If you triggered reports) "Report storm" row: _"u/sock1 received 5 distinct reports in the last 15 minutes."_

Voiceover (excited):

> "ModarBot caught it in fifteen seconds."

### 0:32 – 0:48 · Mod responds

Click **Investigate** on the new-account-cluster row. The drill-down modal opens with:

- The 4 sock-puppet usernames
- The thread ID
- Three action buttons: Ban 4 users / Remove posts / Lock thread

Click **Ban 4 users** → confirmation appears → click **Yes, ban**. Modal closes. Anomaly row turns to **actioned** state.

Voiceover:

> "One click, one confirmation, four bans, one locked thread. The mod team gets a modmail too — automatically."

### 0:48 – 0:56 · Return to baseline

Watchtower:

- All anomaly rows are in "actioned" / "dismissed" state
- 🔴 → 🟡 → 🟢 transition over 4–5 seconds (cooldown)
- "0 active · 4 handled" footer

Voiceover (closing tone):

> "No AI. No external APIs. No subscriptions. ModarBot runs entirely on Devvit. Zero ongoing cost."

### 0:56 – 1:00 · Closing card

Centered text:

> **ModarBot**
> developers.reddit.com/apps/modarbot
> Devpost ↗ github.com/erenisci/modarbot

Fade to black.

---

## Voiceover (compressed, if recording in one take)

> Every active subreddit has been brigaded. By the time mods find out, the damage is done.
>
> ModarBot lives in your sub as a quiet status orb. Until it isn't quiet.
>
> [brigade happens]
>
> ModarBot caught it in fifteen seconds. One click, one confirmation: four bans, one locked thread. The team gets a modmail automatically.
>
> No AI. No external APIs. No subscriptions. Zero ongoing cost.
>
> ModarBot. Catch the raid before it catches you.

## Recording checklist

- [ ] Microphone test — quiet room, headset mic
- [ ] Browser zoom at 110% so text is readable in 1080p
- [ ] Mod browser dark mode (matches Watchtower theme)
- [ ] Hide all tabs except the demo ones
- [ ] Close VSCode, Discord, anything with notifications
- [ ] Two accounts logged in and ready
- [ ] OBS recording at 1080p, 30fps, MP4
- [ ] Three takes minimum
- [ ] Cut + caption with DaVinci Resolve / CapCut / iMovie

## Post-production

- **Subtitles:** burn in English subtitles for accessibility (and for muted Twitter/X playback).
- **Music:** soft, building tone for 0:00–0:32; lift to tense beats during the brigade; resolve to calm at 0:48.
- **Sound effects:** subtle "ding" when orb flips red, soft "click" on Investigate, soft "thunk" on Ban confirm.
- **Export:** 1080p MP4, H.264, under 50MB.
- **Upload:** YouTube unlisted, copy the link into the Devpost submission.
