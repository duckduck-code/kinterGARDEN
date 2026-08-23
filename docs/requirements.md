# Student Growth Tracker — Requirements

**One kindergarten teacher. One school year. Qualitative observation notes that add up to a story of growth.**

Version 0.1 · Draft spec

---

## 1. Overview

A private web app where a single kindergarten teacher records short observation notes about individual students throughout the year, and at the end of the year prints a clean, professional growth report for each child.

The design tension to hold onto: **delightful to use daily, respectable when printed.** The teacher sees butterflies and sparkle every day; the principal and parents see a clean document. Same data, two presentations.

### Success looks like

- Recording an observation takes **under 15 seconds**, standing up, on a phone.
- The teacher never contacts you for technical help after initial handoff.
- In June, one click per student produces a printable report worth handing to a parent.
- Total hosting cost: **$0/year.**

---

## 2. Users & access

| User | Role | Needs |
|---|---|---|
| You | Owner / admin | Full access, can fix data, manage the school year rollover |
| The teacher | Sole daily user | Everything except destructive admin actions |

**Exactly two accounts. No public signup, ever.**

### Access requirements

- **R2.1** — One URL (e.g. `sparkle-tracker.vercel.app` or a custom domain). No separate admin URL.
- **R2.2** — Login via **Supabase Auth magic link** (email OTP). The teacher types her email, gets a link, taps it, is in. No password to forget, no reset flow to support.
- **R2.3** — Sessions persist for **30+ days** so she logs in roughly once a month, not daily.
- **R2.4** — Public signups **disabled** in the Supabase dashboard. Both users are invited manually from the dashboard UI (point-and-click, no CLI).
- **R2.5** — Row Level Security enabled on every table, with policies restricting access to authenticated users present in the `profiles` table. A leaked URL alone must expose nothing.

> **A note on "one secret link":** a hard-to-guess URL is not access control — search engines, browser sync, and shared devices all leak URLs. Magic-link auth gives you the same one-link simplicity with actual security. This matters more than usual because the data is about children.

---

## 3. Core features

### 3.1 Quick capture (the most important screen)

This is the screen that determines whether the app gets used or abandoned. It must work one-handed, on a phone, while standing in a classroom.

- **R3.1.1** — Home screen shows the full class as a tappable grid of student cards (colored avatar + first name + last initial). **Target: all 25 visible on a phone with no scrolling.** At a 390px viewport that means a 4-column grid, roughly 88×95px per card — a 44px avatar circle with the name beneath it. Tight, but it fits, and it's what makes the quiet list (R3.5.1) work at a glance. Cards stay at least 44px tall so they remain reliable touch targets. On tablet and desktop the grid widens to 6–8 columns.
- **R3.1.2** — Tap a student → note composer opens immediately, already focused, keyboard up.
- **R3.1.3** — The note body is a plain `<textarea>`, which means the **OS keyboard's built-in dictation mic works for free**. No speech API, no cost, no extra code. Dictating an observation aloud is often faster than typing it.
- **R3.1.4** — Optional (never required): one or more **domain tags**, a **growth level**, and a **date** (defaults to today, editable for catching up on the couch Sunday night).
- **R3.1.5** — Save returns to the class grid with a brief confirmation. No modal to dismiss.
- **R3.1.6** — Drafts autosave to `localStorage` on every keystroke. Classroom wifi is unreliable; a half-typed note must survive a dropped connection or an accidental back-swipe.
- **R3.1.7** — **Rounds mode**: pick one domain and a prompt, then swipe through the whole class entering one short note each. This is how you capture a full-class assessment during a single lesson without opening and closing 25 screens.
- **R3.1.8** — A round of 25 will get interrupted — a child needs something, the lesson ends. So rounds must show progress ("12 of 25"), allow **skip**, and be **resumable**: leaving mid-round and coming back an hour later picks up where she left off rather than starting over or losing the entries already made.

### 3.2 Growth levels

The brief says the data is mostly qualitative — correct for kindergarten. But pure prose can't be charted, and "see growth over the school year" needs *something* plottable.

The lightest possible answer: an **optional** three-point level on each note, using standard early-childhood language.

| Level | Meaning | Motif |
|---|---|---|
| Emerging | Beginning to show it, with support | 🐛 Caterpillar |
| Developing | Doing it inconsistently, on their own | 🛡️ Chrysalis |
| Secure | Consistent and independent | 🦋 Butterfly |

- **R3.2.1** — Level is one tap, always skippable. A note with no level is still a valid, useful note.
- **R3.2.2** — Levels are never averaged into a score or grade. They plot as a progression over time, nothing more.

### 3.3 Learning domains

No district framework to align to, so this list is the default and ships as-is. It's modeled on how common early-learning frameworks split kindergarten development, which matters for one specific reason: on a printed report handed to a parent or a colleague, these headings should read as established practice rather than as categories someone invented. They do.

1. Literacy & Language
2. Math & Numbers
3. Social & Emotional
4. Fine Motor
5. Gross Motor
6. Creative Expression
7. Approaches to Learning (focus, persistence, curiosity)

- **R3.3.1** — The teacher can rename, reorder, hide, or add domains from within the app. Her district may have its own framework and vocabulary; don't hardcode yours.

### 3.4 Student profile

- **R3.4.1** — Full observation timeline, newest first, filterable by domain and by date range.
- **R3.4.2** — **The growth strip**: a horizontal timeline across the school year showing each leveled observation as its metamorphosis marker. Reading left to right, you watch caterpillars turn into butterflies. This is the app's signature view and the answer to "did this child grow?"
- **R3.4.3** — Per-term narrative summary fields (Fall / Winter / Spring) the teacher writes herself. These carry into the printed report.
- **R3.4.4** — A private notes field for logistics (allergies, family situation, pickup arrangements). Never appears in any printed or shared output.
- **R3.4.5** — Edit and delete on any note. She will typo. She will record a note on the wrong child.

### 3.5 Class overview

- **R3.5.1** — "Quiet list" — students with the fewest notes in the last N days, surfaced gently. Every teacher unintentionally under-observes the easy kids; this is the single highest-value feature after quick capture.
- **R3.5.2** — Search across all note text.
- **R3.5.3** — Flag a note as "revisit" and see all flagged notes in one place.

### 3.6 Reports & printing

- **R3.6.1** — Per-student end-of-year report, generated from existing data: header with name and year, term narratives, the growth strip, and observations grouped by domain.
- **R3.6.2** — The teacher selects which notes to include. Raw daily observations are working notes, not all of them are parent-appropriate.
- **R3.6.3** — Printing uses a **`@media print` stylesheet and the browser's own Print → Save as PDF**. No PDF library, no server-side rendering, no cost, nothing to break.
- **R3.6.4** — **Print mode strips all decoration**: no glitter, no gradients, no animation, no emoji. Black text on white, one thin butterfly rule in the header, generous margins, page-break control so a student's report never splits mid-section. It should look like it came from the district office.
- **R3.6.5** — "Print all students" produces a single document with clean page breaks between children.
- **R3.6.6** — CSV export of everything. Her data, always retrievable, even if the app dies.

---

## 4. Data model

```
school_years    id · label ("2026–2027") · start_date · end_date · is_current

profiles        id (= auth.uid) · email · display_name · role

students        id · first_name · last_initial · school_year_id
                avatar_color · avatar_emoji · status (active|archived)
                private_notes · sort_order · created_at

domains         id · name · icon · color · sort_order · is_hidden

observations    id · student_id · school_year_id · body (text)
                level (emerging|developing|secure, nullable)
                observed_on (date) · is_flagged · photo_url (nullable)
                created_at · updated_at

observation_domains    observation_id · domain_id      (many-to-many:
                                                        one note often
                                                        spans two areas)

summaries       id · student_id · school_year_id
                term (fall|winter|spring) · body · updated_at
```

**Notes on the model**

- `school_year_id` on students and observations is what makes year two work. Without it, you'll be manually cleaning the database next September.
- Store `last_initial` separately from `first_name` so reports can render "Amelia R." without string surgery.
- `avatar_color` + `avatar_emoji` gives visual identification on the class grid without storing photos of children. Strongly preferred over photo uploads.

---

## 5. Design direction

### Palette

```css
--bubblegum:  #FF4FA3;  /* primary — buttons, active states     */
--barbie:     #E0218A;  /* deeper pink — headings, emphasis     */
--lavender:   #C8A2E8;  /* secondary — domain tags, cards       */
--babyblue:   #A7D8F0;  /* tertiary — accents                   */
--butter:     #FFF6A9;  /* highlight — "new", celebrations      */
--chrome:     #D9DDE8;  /* Y2K silver — dividers, inactive      */
--ink:        #3B1F4A;  /* deep plum — ALL body text            */
--cloud:      #FFF9FC;  /* background — barely-pink white       */
```

**The contrast rule, which is non-negotiable:** hot pink on lavender is unreadable. Every piece of body text is `--ink` on `--cloud` or on white. Pink and lavender do fills, borders, icons, and decoration — never small text. The Y2K palette lives in the chrome and the sparkle, not in the words.

### Typography

- **Display** (headings, student names): `Chicle` or `Baloo 2` — chunky, rounded, unmistakably early-2000s. Used with restraint.
- **Body** (notes, UI): `Nunito` — rounded enough to harmonize, boring enough to read 400 words of.
- **Utility** (dates, tags, counts): `Space Grotesk` — the techno-chrome half of Y2K, which balances the bubbly half.

All free on Google Fonts.

### Signature element

**The growth strip** (R3.4.2). A student's year rendered as a butterfly's flight path — a soft dotted trail arcing left to right, with each leveled observation sitting on it as a caterpillar, chrysalis, or butterfly.

It earns its place because the metaphor is *literally the thing being measured*. Metamorphosis is growth. It's charming on screen, and rendered in flat line art it's completely dignified in print. Every other flourish in the app should stay quiet so this one lands.

### Sparkle, applied with discipline

- Iridescent gradient on primary buttons and the app header only.
- Butterflies as **SVG**, not GIFs or images — they scale, they print, they're kilobytes.
- Sparkle on **event**, not ambient: saving a note triggers a brief shimmer. A permanently glittering interface is exhausting by week three and eats battery on classroom tablets.
- Chrome/holographic treatment on the logo and section dividers.
- **`prefers-reduced-motion` respected** everywhere — all animation off, no layout shift.
- No autoplaying sound. Ever. It's a classroom.

---

## 6. Stack & hosting

| Layer | Choice | Cost |
|---|---|---|
| Frontend | React + Vite | $0 |
| Hosting | Vercel Hobby | $0 |
| Database + Auth | Supabase Free | $0 |
| Fonts | Google Fonts | $0 |
| PDF | Browser print dialog | $0 |

No backend server, no API routes. React talks to Supabase directly via `supabase-js`, with RLS as the security boundary.

### Two hosting constraints to design around

**⚠️ Supabase pauses free projects after 7 days of inactivity.** Data is retained, but the project goes offline until manually restored from the dashboard, with roughly a 30-second cold start. **Summer break will absolutely trigger this** — the teacher stops using it in June, and in September the app is dead when she opens it.

*Fix:* a GitHub Actions scheduled workflow that pings the database a few times a week. Free, configured once in the browser, no CLI. Set this up before handoff, not after.

**⚠️ Vercel Hobby is non-commercial use only.** A teacher tracking her own students in a tool you built for her, with no money changing hands, is comfortably personal use. But if this ever gets adopted school-wide or sold, it needs Pro at $20/mo. Worth knowing the line exists.

Capacity is a non-issue at this scale: Supabase Free includes 500 MB of database and 1 GB of file storage. Text notes for 25 students over a year are a few megabytes at most. Photos are what would eventually threaten the storage cap — another reason to prefer emoji avatars.

---

## 7. Privacy

This is data about five-year-olds, which changes the calculus.

- **R7.1** — Store first name and last initial only. No full legal names, no birthdates, no addresses, no student ID numbers.
- **R7.2** — Photos of children: **default to not supporting uploads in v1.** If added later, they need explicit parent consent and a documented deletion path.
- **R7.3** — Reports print locally through the browser. Nothing is emailed, shared via link, or sent to a third party.
- **R7.4** — Year-end archiving, and a real delete that actually removes rows.
- **R7.5** — **Have the teacher check with her school or district before this goes live.** Many districts have policies about where student records may be stored, and a personal Supabase project is not district-approved infrastructure. This is a five-minute conversation that's far better had in August than in May. It may also turn out to be entirely fine — plenty of teachers keep private observation notebooks, and this is a notebook.

---

## 8. Out of scope for v1

Named explicitly so they don't creep in: parent logins or portals, multiple teachers or classrooms, attendance, behavior incident tracking, standards-alignment mapping, photo/video uploads, offline PWA mode, native apps, email notifications, AI-generated report summaries.

---

## 9. Build order

1. **Foundation** — Vite + React, Supabase project, schema, RLS policies, magic-link auth, both users invited. *Test: log in from a phone, log out, log back in.*
2. **Data in** — Class grid, add/edit students, quick capture composer, save an observation. *This is the minimum useful product — ship it here and let her start using it, even unstyled.*
3. **Data out** — Student profile, timeline, filtering, search, edit/delete.
4. **Growth** — Levels, the growth strip, the quiet list.
5. **Design pass** — Full Y2K treatment, butterflies, sparkle, motion.
6. **Reports** — Term summaries, print stylesheet, per-student and full-class printing. *Test by actually printing on paper, not just previewing.*
7. **Handoff** — Keep-alive workflow, CSV export, a one-page printed guide for the teacher, and a rollover plan for next September.

Steps 2 and 3 are the product. Everything after is what makes it get used and what makes it presentable in June.

---

## 10. Decisions

**Settled**

- **Class size: 20–25.** Drives the grid spec in R3.1.1 and the resumable rounds in R3.1.8. Also means "print all students" produces a ~25-page document — page-break control (R3.6.4) is load-bearing, not polish.
- **No district framework.** The seven domains in §3.3 ship as the default, still editable in-app in case her thinking changes by spring.
- **September rollover happens in-app.** Since she's the only user and won't touch a database, this is a guided flow: archive last year's class, name the new year, add students. Built in step 7, but the schema supports it from day one via `school_year_id`.

**Still open**

- **Custom domain, or `something.vercel.app`?** A domain runs ~$12/year and breaks the strict $0 goal, but is easier to remember and looks better in a printed report footer. Not blocking — this can be added later without touching any code.
