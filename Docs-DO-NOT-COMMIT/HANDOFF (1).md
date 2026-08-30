# Handoff Log — Athar

This file is the running record of work done on the project. It stays
**empty below this point until the project actually starts** — do not
pre-fill it.

Add one entry per work session (not per commit — one entry can summarize
several small commits from the same session). This is what makes it
possible for any team member, or a judge, to reconstruct what happened and
why without reading the entire commit history.

## How to add an entry

Copy this block, fill it in, and add the newest entry at the top:

```
## YYYY-MM-DD — <short session title>
- **Author(s):** 
- **Phase (see Milestones.md):** 
- **What was done:**
  - 
- **Decisions made (link to Decisions.md if applicable):** 
- **What's next:** 
- **Blockers / open questions:** 
- **Relevant commits:** `<short hash>` — `<message>`
```

---

# ⚑ CURRENT STATE — read this first

*A standing snapshot, kept up to date. The dated log below is history; this
section is "where things are right now." If you are picking this project up
cold — new teammate, new AI agent, new machine — read this whole section
before touching anything.*

## The project

**Athar** (أثر, "a trace left behind") — a family memory app for the
**SMAC 2026** competition, theme *"AI for Stronger Family Bonds."*
Capture-first: the app opens straight into a camera. Submission deadline
**8 Sept 2026**, Demo Day **16 Sept 2026**. Q&A is 25% of the grade, so
every decision needs a defensible *why* — that is what `Decisions.md` is
for.

## Where we are

- **Phase 0: complete**, tagged `v0.1.0-scaffold`. Runs on a physical
  iPhone via Expo Go.
- **Phase 1 (Identity & Family Circle): in progress.** `Milestones.md`
  breaks it into 24 numbered tasks, one commit each, dependency-ordered.
  Tasks 1–12 done, all pushed to GitHub. **Stages A, B and C are
  complete — all authentication work is finished.** Stage D is in
  complete (`bb62578`, `98b4260`, `f8d296e`) — **auth is now connected
  to the database**: signing in creates a `users/{uid}` document via
  `useEnsureUserDocument`, called from `App.tsx`. Stage E (Family
  Circle) has started: the invite-code util is done (`174e11c`), and a
  security-rules test harness is in place (`a8be3fc`).
Tasks 16 and 17 are **done**. Rules (`2e9ba74`, `8461305`, `6affb17`,
  `b90f22a`) with 38 passing rules tests, and the service
  (`838d4e5`, `4067d0d`) with 11 unit tests.
  Tasks 18 and 19 done (`7d2d16b`, `f25a964`, `4e78f38`, `db74ad1`,
  `7a1ff9b`). Both circle screens exist and the service now persists
  `users/{uid}.familyCircleId`.
  **Task 21 done** (`eab8c1b`, `0888a09`, `7aec7cf`, `66abebd`) — the
  members list reads the `members` subcollection and is reachable from
  the Family Pulse tab.
  **Task 20 done** (2026-08-13, `b58e0d3`, `833789d`, `6a80307`,
  `0a72057`) — launch routing reads `users/{uid}.familyCircleId` and
  sends a user with no circle to create/join, everyone else straight to
  Capture. Landed after `feat/capture-screen` merged into `main`, so the
  coordination gate no longer applied.
  **Stage E and Stage F are both complete — all 24 Phase 1 tasks are
  done** (guest upgrade, rules audit, loading/error states).
  **Phase 1 is task-complete but not device-verified:** nothing has been
  run on a physical device since these changes, and the guest upgrade has
  only ever run under Jest. Walk the exit criteria below on a device
  before treating Phase 1 as closed.

  **Post-Phase-1: the Family Circle rebuild is COMPLETE** (2026-08-14 →
  08-20) on `feat/family-circle`, following
  `Docs-DO-NOT-COMMIT/RecommendedFamilyCircleLayout.md`. All 9 stages
  landed, then a round of peer-review fixes on top. What exists now:

  - **Family Pulse tab root is the Family Circle hub** — circle name,
    avatar, member count, Members and Invite rows, an Account section
    (guest upgrade prompt, Family Settings, red Sign out), and
    pull-to-refresh.
  - **Members list → member detail** — relationship picked from a
    dropdown (11 presets plus Other), owner-only removal, self-repair
    when you are the one removed.
  - **Invite page** — QR above the code, a copy icon inside the code
    card, a Share button whose message carries a deep link *and* the
    bare code, and owner-only code rotation.
  - **Family Settings** — owner-only rename, member-only Leave circle
    (outlined), nothing else.
  - **Deep links** — `athar://join/CODE` and the Expo Go
    `exp://…/--/join/CODE` form. Opening one while signed out shows a
    dedicated screen whose single *Join as guest* button signs in
    anonymously **and** joins in one press.

  See the 2026-08-14 log entry for what the recommendation doc asked for
  that is deliberately *not* being built.
  Test counts now: `npm test` **126** (26 suites), `npm run test:rules`
  **57** (2 suites).

  **Routing: a circle is mandatory again (2026-08-20, `7fda368`).** The
  "Skip for now" escape added on 2026-08-13 (`d3b9c91`) has been removed
  on owner instruction — *"you either have a circle or you are creating
  one, no in between."* `useCircleOnboardingSkip` and the
  `athar/circle-onboarding-skipped/{uid}` AsyncStorage key are **deleted**;
  `SignedInRoutes` now routes purely on `state.circleId`. Anyone who
  skipped under the old build lands on onboarding at next launch, by
  design. Read task 20's Milestones note as *how routing works*, but
  treat this as the current behaviour.

  **Phase 3 (Memory Groups) has started on `feat/memory-groups`.** Two
  files sit **uncommitted** in the working tree, deliberately held back
  until `feat/family-circle` merges with Osama's branch: `firestore.rules`
  (+49 — an `inCircle()` helper and the whole `memoryGroups` match block)
  and `firestore-tests/memoryGroups.rules.test.ts` (13 tests, passing).
  That rules block has **not** been confirmed deployed — redeploy before
  relying on it; the deploy is idempotent. The approved plan for the rest
  of the phase is at
  `C:\Users\Admin\.claude\plans\expressive-jumping-starlight.md`
  (Step 0 plus Stages A–D, 16 numbered commits).

  **`firestore.rules` is now deployed to the live project** (2026-08-12)
  — real Firebase enforces the real rules, so the `users/{uid}` write
  finally succeeds instead of `permission-denied`. Email/Password and
  Anonymous sign-in are enabled in the console. Auth works end to end
  against real Firebase.

  **Write fewer tests.** The user reviewed the suite and judged the
  volume too high. Cover logic that could plausibly break in a
  non-obvious way; skip pass-through wrappers, constants, and anything
  TypeScript already guarantees. Security-rules tests are the exception
  worth defending — they fail silently and already caught a real bug.

  Two things the rules tests established that task 17 must respect:
  - `memberIds` is **never** authoritative. Membership is the `members`
    subcollection. A joiner can legitimately create a member doc without
    updating `memberIds`, so it can drift — task 21's member list must
    read the subcollection.
  - Anything referencing a doc written in the same commit needs
    `getAfter()`, not `get()`. Rules see pre-transaction state.

  Auth against **real Firebase now works** — Email/Password and
  Anonymous were enabled in the console on 2026-08-12.

## Branches — the project is no longer solo

| Branch | Owner | Scope |
|---|---|---|
| `main` | shared | Integration branch. Green as of `119a4ad` — and **badly stale**: it has not moved since 2026-08-12 while `feat/family-circle` has run 81 commits past it. |
| `feat/family-circle` | this workstream | Phase 1 tasks 16–21, then the Family Circle hub rebuild, then peer-review fixes. **Complete; a PR is open.** 81 commits ahead of `main`. **Stay out of `src/screens/capture/` and `RootTabNavigator.tsx`.** Task order changed to 18, 19, 21, 20 — see the note in `Milestones.md`. Task 20 was deliberately last: it changes launch behaviour for *every* account. |
| `feat/memory-groups` | this workstream | **Current branch** (created 2026-08-20 off `922d39a`, the tip of `feat/family-circle` — *not* off `main`, because the `memoryGroups` rules build directly on the family-circle rules). Phase 3, the Memory Groups / "memory page" work. Local only until its first commit. If the family-circle PR is squashed or rebased on merge, this branch needs a rebase, not a merge. |
| `feat/capture-screen` | Osama Alhennawi | Capture screen, camera controls, tab-bar icons. 6 commits ahead of `main`: photo/video/voice capture, flash, flip, pinch- and drag-to-zoom, and a `useCaptureDestinationStore` with `MY_SPACE_GROUP_ID`. **Nothing persists yet** — capture ends at a local file URI, with no Storage upload and no `memories` document. |

> **The one file that collides with Osama's branch is `package.json`.**
> `feat/family-circle` added `react-native-svg`, `react-native-qrcode-svg`
> and `expo-linking`; Phase 3 will add `expo-image-picker`. Merge
> `feat/family-circle` into `main` before that lands, or the conflict
> compounds.

> **Phase 2 split, if both workstreams run in parallel:** Osama owns the
> camera UI. The unclaimed half is persistence — Storage upload, the
> `memories` document, "My Space" as a real Firestore concept, and the
> visibility rules. Everything in Phases 3–6 depends on those existing,
> and none of it depends on the shutter. Agree the `saveCapture(uri,
> destination)` signature before starting; that function is the seam.

`main` was briefly broken by the capture work (`@expo/vector-icons`
imported but never declared — it only resolved as a *nested* transitive
dep of `expo`, so Metro found it but `tsc` could not; plus two type
errors in `CaptureScreen.tsx`). Fixed and merged in `119a4ad`.

> **Still worth telling Osama:** `isPinchToZoomEnabled` is not a prop on
> `CameraView` in expo-camera SDK 54 — it was silently ignored, so
> pinch-to-zoom has never actually worked. Removing it fixed the type
> error but did **not** restore the feature; that needs the `zoom` prop
> driven by a real pinch gesture handler.

  > ✅ **`firestore.rules` IS deployed** — first on 2026-08-12, most
  > recently **2026-08-14** with the `relationship` write rules. Running
  > against real Firebase (`EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false`)
  > works. **Rules are inert until deployed, so redeploy after every
  > change to `firestore.rules`:**
  > `npx -y firebase-tools@latest deploy --only firestore:rules --project athar-smac2026`
  > Stages 6, 7 and 8 of the Family Circle plan each change the rules and
  > each need their own deploy.
- Local `main` and `origin/main` are in sync (no divergence). See "Known
  issue: 4 early commits..." below — this is a *known, accepted* state,
  not something to fix without asking first.

## Hard constraints — do not break these

1. **Expo SDK is pinned to 54.** *Do not upgrade.* The team's Expo Go build
   only supports up to SDK 54; newer Expo Go builds are still in App Store
   review. Upgrading breaks device testing entirely. See **ADR-016**. When
   adding native modules, always `npx expo install <pkg>` (never plain
   `npm install`) so versions stay SDK-54-aligned.
2. **No on-device speech-to-text.** It does not exist in Expo Go — there is
   no first-party module (`expo-speech` is text-to-*speech*, the opposite),
   and the third-party option needs a development build. Transcription
   happens server-side via Gemini audio input. See **ADR-020**.
3. **No remote push notifications.** They do not work in Expo Go on SDK 54.
   The nudge ships as an in-app card. See **ADR-019**.
4. **The client never calls an AI provider directly**, and never writes
   `aiStory` / `aiStatus` / `transcript`. Those are Cloud-Function-only.
   See ADR-004 / ADR-012.
5. **Firestore security rules are not filters.** A query that *could* match
   a denied document fails entirely rather than filtering. Queries must
   constrain the same fields the rules check. See the section in
   `Database_Schema.md` — this is the most likely source of confusing
   `permission-denied` errors.

## Environment facts

| Thing | Value |
|---|---|
| Firebase project ID | `athar-smac2026` (display name "Athar Dev") |
| Firebase project number | `703931249134` |
| Billing plan | **Blaze** — Cloud Functions cannot run on the free Spark plan (ADR-013). Budget alert set. |
| Firestore | **Standard** edition, `me-central1` (Doha), `(default)` database, `FIRESTORE_NATIVE`. Real rules deployed since 2026-08-12 (it shipped deny-all). **PITR enabled 2026-08-13** — 7-day version retention, but the window only builds *forward* from that date. Delete protection is still **DISABLED**. |
| Firebase Web app ID | `1:703931249134:web:6f53976d8af1a15b6f9eff` |
| Firebase CLI account | `mnmoatasim@gmail.com` |
| GitHub repo | `Hoiidman/Athar` — **private**, default branch `main` |
| GitHub CLI account | `Hoiidman` (`gh` at `C:\Program Files\GitHub CLI\gh.exe`) |
| Local git identity | Moatasim Mohamed / `mnmoatasim@gmail.com` |
| Expo | SDK 54 · React Native 0.81.5 · React 19.1.0 |
| Node | v24.19.0 |
| JRE | `java -version` reports **26.0.2** as of 2026-08-13; Temurin 21 was what Phase 0 installed (`C:\Program Files\Eclipse Adoptium\jre-21.0.12.8-hotspot`). Either is fine — the emulators need 11+. |
| Emulator ports | Auth 9099 · Firestore 8080 · Storage 9199 · Functions 5001 · UI 4000 |

---

# Setup from scratch

Everything below has actually been run on this project — these are not
generic instructions.

## 1. Machine prerequisites

| Tool | Notes |
|---|---|
| **Git** | Required. |
| **Node.js LTS** | Currently v24.19.0. |
| **GitHub CLI** (`gh`) | `winget install GitHub.cli`. Auth with `gh auth login`. Note: after install it is **not on PATH until the shell restarts** — call it by full path meanwhile. |
| **JRE (Java 11+)** | **Required for the Firestore/Storage emulators.** `winget install --id EclipseAdoptium.Temurin.21.JRE -e`. Needs an admin/UAC prompt — a user-scope install (`--scope user`) is *not* available for this package. Absent from Firebase's own quickstart. |
| **Expo Go** | On the physical test phone, from the App Store / Play Store. |
| **firebase-tools** | Used via `npx -y firebase-tools@latest` — no global install needed. |
| **eas-cli** | `npm install -g eas-cli`. Only needed for real builds (Phase 9). |

Android Studio / Xcode are **not** required — a physical device with Expo
Go covers development, and it is what the competition grades anyway.

## 2. Clone and install

```bash
gh repo clone Hoiidman/Athar
cd Athar
npm install
npm --prefix functions install
```

## 3. Environment variables

Copy `.env.example` → `.env` and fill in the real values (get them with
`npx -y firebase-tools@latest apps:sdkconfig WEB <appId> --project athar-smac2026`).

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false
```

- The **`EXPO_PUBLIC_` prefix is mandatory** — Expo only inlines variables
  with that prefix into the client bundle. Anything else is `undefined` at
  runtime.
- `.env` is **untracked**; only `.env.example` is committed.
- **Restart `npx expo start` after editing `.env`** — values are inlined at
  bundler start, so a running server will not pick up changes.

## 4. Firebase project (already done — recorded for reproduction)

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest projects:list

# Firestore — edition must be explicit, do not accept tool defaults (ADR-014)
npx -y firebase-tools@latest firestore:databases:create "(default)" \
  --edition=standard --location=me-central1 --project athar-smac2026

# Web app registration (gives the JS SDK config)
npx -y firebase-tools@latest apps:create web "Athar" --project athar-smac2026
npx -y firebase-tools@latest apps:sdkconfig WEB <appId> --project athar-smac2026
```

Two steps are **console-only**, no CLI equivalent:
- **Upgrading to Blaze** — Project settings → Usage and billing → Modify plan.
- **Enabling the Firestore API** on first use.

> Creating the project *itself* via `projects:create` failed here with
> `403 PERMISSION_DENIED` on `addFirebase` — it created a bare GCP project
> but could not attach Firebase. Resolved by creating it through the
> Firebase console instead. If you hit this, don't retry the CLI and
> accumulate orphan GCP projects.

## 5. Running the app

```bash
npx expo start        # then scan the QR code with Expo Go
```

**Never `npm run android` / `expo run:android`** — that is a native
prebuild + Gradle build, not this project's workflow. See gotchas.

## 6. Running the emulators

```bash
npm --prefix functions run build   # required first — see gotchas
npx -y firebase-tools@latest emulators:start --project athar-smac2026
```

Emulator UI at `http://127.0.0.1:4000`. The emulators bind to `0.0.0.0`
(set in `firebase.json`) so a phone on the same Wi-Fi can reach them.

**To point the app at them from a physical device**, set both in `.env`:

```
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=<your machine's LAN IP>
```

`127.0.0.1` on the phone means *the phone*, which is why the host is
configurable. Restart `expo start` after editing `.env` — Expo inlines
those values at bundler start.

## 7. Running the tests

```bash
npm test          # 60 app tests, fast, no emulator needed
npm run test:rules   # 38 rules tests, starts/stops the emulator itself
```

`npm run test:rules` needs Java on PATH (see gotchas).

> Counts move as tasks land — `npm test` was 60 before task 21 and is
> **66** now. Treat the number as a checksum, not a target.

## 8. Deploying security rules

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project athar-smac2026
```

**Done on 2026-08-12** — the live project now enforces the real rules.
Before that it was still deny-all, which made every write fail with
`permission-denied` against real Firebase while working fine on the
emulator. If rules changes seem to have no effect, check the console's
Rules tab (hard-refresh) — `already up to date, skipping upload` in the
deploy output means the deployed ruleset already matches your local file,
i.e. an earlier deploy succeeded.

---

# Known setup gotchas

Each of these was actually hit on this project. Exact error text included
so they are searchable.

| Symptom | Cause & fix |
|---|---|
| Expo Go: *"project is incompatible with this version of Expo Go"* | The store build of Expo Go supports only up to **SDK 54**; newer builds are still in App Store review. Updating Expo Go does **not** help. The project is pinned to SDK 54 (ADR-016) — do not upgrade. |
| `Could not spawn "java -version"` | No JRE. Install Temurin 21 (see prerequisites). The Firestore/Storage emulators run on the JVM. |
| `npx expo config` exits **code 1 printing nothing at all** | An entry in `app.json` `plugins` that ships no config plugin on this SDK. Hit with `expo-status-bar` on SDK 54 — removed. To diagnose: check `node_modules/<pkg>/app.plugin.js` exists for every plugin listed. |
| `npx expo install --fix` fails with an ERESOLVE peer-dependency conflict | Stale packages from a previous SDK linger in `node_modules` (React 19.1 vs 19.2 deadlock). Fix: delete `node_modules` **and** `package-lock.json`, set versions explicitly in `package.json`, then `npm install` clean. |
| `Port 8080 is not open on localhost, could not start Firestore Emulator` | An orphaned emulator process still holds the port. Find it with `netstat -ano \| grep ":8080"` then `Stop-Process -Id <pid> -Force`. |
| `functions\lib\index.js does not exist, can't deploy Cloud Functions` | `functions/lib/` is gitignored build output. Run `npm --prefix functions run build` before starting emulators. |
| `firebase use` → *"must be run from a Firebase project directory"* | Needs `firebase.json` present. Pass `--project athar-smac2026` explicitly instead. |
| TS: `Module '"firebase/auth"' has no exported member 'getReactNativePersistence'` | Upstream Firebase typings gap — the function **exists and is exported at runtime** in `@firebase/auth`'s RN build, but the `firebase/auth` subpath declares no `react-native` export condition and its `types` field points at the web build. Handled with a scoped `@ts-expect-error` in `src/services/firebase.ts`. Not a misconfiguration; Expo's tsconfig already sets `customConditions: ["react-native"]`. |
| App can't reach emulators from a physical phone | `127.0.0.1` on the device means *the device itself*. Either set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false` (talks to real Firebase) or replace `127.0.0.1` in `src/services/firebase.ts` with your machine's LAN IP, phone on the same Wi-Fi. |
| A new native module breaks Expo Go | Always install with `npx expo install <pkg>`, never plain `npm install` — only the former picks the SDK-54-compatible version. Verify with `npx expo-doctor`. |
| Jest: `SyntaxError: Unexpected token 'export'` / `Cannot use import statement outside a module`, from deep inside `firebase/app`, `@firebase/util`, etc. | The Firebase JS SDK's dependency chain mixes ESM and CJS builds in a way `jest-expo`'s default `transformIgnorePatterns` doesn't handle — extending the pattern to include `firebase`/`@firebase` still fails deeper in the chain (`@firebase/util/dist/postinstall.mjs`). **Don't chase transform config.** Instead, `jest.mock('../firebase', () => ({ auth: {...} }))` (or `firestore`/`storage`/`functions` as needed) in any test that imports a service built on `src/services/firebase.ts` — a unit test of a wrapper's call-forwarding shouldn't load the real SDK at all. See `src/services/__tests__/auth.test.ts` for the pattern. |
| Jest: `@react-native-async-storage/async-storage` throws about a missing native module | Only relevant if a test does *not* mock `../firebase` (see above) and so still transitively imports it, which eagerly calls `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` at module scope. Prefer mocking `../firebase` instead of trying to mock AsyncStorage itself. |
| `renderHook`/`unmount` from `@testing-library/react-native` silently return `undefined` for `result` instead of erroring | `renderHook` is **async** in this installed version (14.x, built for React 19's async `act`) — it returns `Promise<RenderHookResult>`, not `RenderHookResult` directly. Must `await renderHook(...)` and `await unmount()`. Destructuring `{ result }` from the unawaited Promise silently gives `undefined` rather than throwing, which makes this easy to misdiagnose as a config problem. Also needed: `@types/react-test-renderer` (for `tsc`), and manual state updates from outside a render (e.g. invoking a captured `onAuthStateChanged` callback directly in a test) must be wrapped in `act()` imported from `react-test-renderer`, or React logs an "update not wrapped in act" warning. |
| Jest: a full-screen component test (`render(<SomeScreen />)`) exceeds the 5000ms default `testTimeout`, but passes fast in isolation | Not a hang — the first render of a whole RN screen tree under `jest-expo` is genuinely slow, and gets slower once several test suites run in parallel and contend for CPU. Fixed globally by setting `testTimeout: 15000` in `jest.config.js` rather than per-test, since every Stage C screen test will hit this. `render`/`fireEvent.*` are also async in this `@testing-library/react-native` version — same pattern as the `renderHook` gotcha above, `await` them. |
| `firebase emulators:*` fails with ``Could not spawn `java -version` `` even though the JRE is installed | The Temurin JRE is at `C:\Program Files\Eclipse Adoptium\jre-21.0.12.8-hotspot`. Java **was added to the Machine PATH on 2026-08-12**, so new terminals are fine. But **a process started before that change keeps its own copy of the environment** — Windows does not push PATH updates into running processes. If a long-lived shell (or an editor/agent host started earlier) still fails, restart it, or prefix: `export PATH="/c/Program Files/Eclipse Adoptium/jre-21.0.12.8-hotspot/bin:$PATH"`. Note `%JAVA_HOME%\bin` is also on PATH but resolves to nothing if `JAVA_HOME` is unset — harmless here, confusing with other JVM tooling. |
| `tsc` cannot find `@expo/vector-icons`, but the app runs fine | It was imported without being declared — it only existed **nested** at `node_modules/expo/node_modules/@expo/vector-icons`. Metro resolves that; TypeScript's node resolution does not, and npm could restructure it at any time. Fix: declare it explicitly (`npx expo install @expo/vector-icons`). Broke `main` on 2026-08-12; fixed in `119a4ad`. |
| `npm run android` / `expo run:android` fails with "No Android connected device found" | **`expo run:*` is not "run the app".** It runs `expo prebuild` (generating a native `android/` folder) and compiles a native dev build with Gradle — needing Android Studio + SDK. This project is Expo Go based (SDK 54 pinned for exactly that reason). Use `npx expo start` and scan the QR with Expo Go. `expo run:ios` additionally cannot work on Windows at all. If it has already run: delete the generated `android/`, and revert the `app.json` changes prebuild injects (an `android.permissions` array with duplicates, and `"package": "com.anonymous.athar"`). **`android/` and `ios/` are not in `.gitignore`**, so a stray `git add -A` would commit them. |
| `jest.mock()` factory throws `Invalid variable access` for something clearly in scope | Mock factories are hoisted above imports, so Jest forbids referencing anything outside their own scope. TypeScript's **parameter-property shorthand** (`constructor(readonly code: string)`) compiles into a form the plugin reads as exactly that. Inside a mock factory, declare the field explicitly and assign it in a plain constructor, and avoid naming the parameter the same as the field. |
| A `jest.mock` of a module export has no effect — the real function still runs | Mocking a module's *export* does not intercept calls made **between functions inside that same module**. `generateUniqueInviteCode` calls `generateInviteCode` internally, so mocking `generateInviteCode` did nothing. Mock one level lower instead (here: `expo-crypto`'s `getRandomBytes`), which also exercises the real chain rather than stubbing it out. |
| A hand-rolled `doc()` mock records an empty path for some calls | `doc()` has two shapes: `doc(db, 'col', 'id', ...)` **and** the auto-ID form `doc(collection(db, 'col'))`, which takes a **single** argument. A mock building paths from `args.slice(1)` silently yields `''` for the second form. `createFamilyCircle` uses the auto-ID form. |
| Rules tests: `Firestore` type from `@firebase/rules-unit-testing` is not assignable to the modular `Firestore` | rules-unit-testing v5 returns the **compat** Firestore type while the app uses modular v12. Cast once in a helper (`dbFor()` in the rules tests) rather than scattering casts. |
| `prettier --check` flags ~130 files that were never touched | `core.autocrlf=true` means the working copy has CRLF while git stores LF. Not a real formatting problem: confirm with `git diff --stat <file>` — if it shows only the real changed-line count rather than the whole file, ignore it. Never run `prettier --write .` on this repo: it would also reformat `Docs-DO-NOT-COMMIT/` and `.claude/SKILLS/` markdown. Scope Prettier to the files you actually touched. |
| A commit's timestamp on GitHub jumps to "now" after an amend/rebase | GitHub's **commit list** shows the *committer* date, which an amend resets. The **contribution graph** uses the *author* date, which is preserved. So the squares stay correct but the commit list looks freshly made. There is no fix short of another rewrite; accept it. (An earlier note in this file claimed the whole timeline was unaffected — that was wrong.) |

---

# ✅ Security rules ARE behaviourally tested (resolved 2026-08-12)

*This was an open question through task 12–15; it is now settled. Left
here because the reasoning still governs how rules work is done.*

`npm run test:rules` — **38 tests** against the real emulator.

```bash
npm run test:rules
```

It wraps `emulators:exec`, so it starts the Firestore emulator, runs the
tests and shuts down. It **cannot silently pass with no emulator
running**, which was the main risk of a hand-rolled setup.

**Why it is a second, separate Jest config.** Rules tests need a `node`
environment and a live emulator; the app suite needs `jest-expo`/React
Native and must stay fast and emulator-free. Hence:

- `jest.rules.config.js` — `ts-jest` + `testEnvironment: 'node'`,
  matching `firestore-tests/**/*.test.ts`
- `testPathIgnorePatterns: ['<rootDir>/firestore-tests/']` on the main
  `jest.config.js`, so `npm test` skips them entirely

Dev deps this added: `@firebase/rules-unit-testing`, `ts-jest`.

**It paid for itself immediately.** Writing the tests found a real gap:
the rules originally allowed creating a `familyCircle` with no member
document. Not a security hole (nobody could read the result), but it
permitted orphaned circles. Fixed in `8461305`, which now requires the
owner's member doc in the same commit via `getAfter()`.

> **Reading the output:** `PERMISSION_DENIED ... false for 'delete' @ L39`
> lines are **expected** — the SDK logging the denials that `assertFails`
> deliberately provokes. They name the exact failing rule line, which is
> genuinely useful when debugging. `evaluation error at L135:26` also
> appears and is expected: a `get()` on a **missing** document raises an
> error rather than returning false (see the `exists()` guard note in the
> rules-design section).

---

# Family Circle — the design decisions worth knowing

*These are the things you cannot recover by reading the code, and the
ones most likely to be broken by accident.*

### Membership is the `members` subcollection. `memberIds` is not trusted.

Rules authorise by `exists(familyCircles/{id}/members/{uid})`. The
denormalised `memberIds` array on the circle is a convenience field only
— tampering with it grants nothing.

**It can legitimately drift.** A joiner holding a valid code may create
their member doc *without* updating `memberIds`, and the rules allow it
(there is a test asserting exactly this). So **any member list must read
the subcollection**, never `memberIds`, or it will show a stale roster.

### `getAfter()`, not `get()`, for same-commit references

Rules evaluate each write in a transaction/batch against **pre-transaction**
state. Creating a circle writes three documents at once (circle + owner
member doc + `inviteCodes/{code}`), so the member-doc rule *cannot*
`get()` the circle beside it — that document does not exist yet.
`getAfter()` sees post-commit state. Used in three places: circle create,
member create, invite-code create.

### `exists()` guards every `get()` on an invite code

A `get()` on a **missing** document raises an evaluation error rather
than returning false. Same security outcome, but far worse to debug from
a client that only ever sees `permission-denied`.

### The join is two mutually-constraining writes

The member doc must carry an `inviteCodeUsed` resolving to *this* circle;
the `memberIds` update separately requires a member doc for that uid in
the same commit. Neither half is exploitable alone. The attack that
matters — and is explicitly tested — is a **valid code for a different
circle**; a rule that only checks the code *exists* passes every other
test and still lets anyone into any circle.

### `runTransaction` for create, `writeBatch` for join

A batch cannot read, and create must check whether the invite code is
already taken. The transaction throws a sentinel on collision, which is
caught and converted to `false` — exactly the signal
`generateUniqueInviteCode` expects, so the retry loop knows nothing about
Firestore. **Only a genuine collision retries**: treating any
`permission-denied` as a collision would burn all 5 attempts and
misreport a rules bug as `code-generation-failed`. There is a test
pinning this.

### "Already in a circle" is checked via the user's own document

Each user has a **single** `familyCircleId` (schema). Both create and
join read `users/{uid}` first and throw `already-in-circle`.

*Why not check for an existing member doc?* Because the rules only permit
reading a member doc if you are **already** a member — for a non-member
that read fails with `permission-denied` rather than returning "not
found". Detecting it that way would mean using a permission error as
control flow, and would misfire on a network failure.

*If the product ever allows belonging to several circles*, this check and
the schema both need changing — it is not a rule tweak.

### Invite codes

8 characters from a 30-char alphabet excluding `0 1 I L O U` (≈6.6e11
combinations) so they survive being read aloud. Generated with
**`expo-crypto`, not `Math.random()`** — guessing a code lets someone
read a family's private photos, so this is a security boundary. Uses
**rejection sampling**, not `byte % 30`: 256 is not divisible by 30, so
plain modulo would make the first 16 characters measurably more likely.
The document ID *is* the code, which is what makes Firestore enforce
uniqueness with no query and no race.

### Two writers on a member document, split by field (2026-08-14)

`displayName` and `relationship` have deliberately different owners:

| Field | Who may write it |
|---|---|
| `displayName` | **self only** — nobody can rename anyone else |
| `relationship` | **self, or the circle owner** — the owner labels the family |
| `role`, `userId`, `inviteCodeUsed`, `joinedAt` | nobody, after creation |

The owner's branch permits `relationship` *alone*, so "the owner can label
you" never becomes "the owner can rename you". `isCircleOwner()` costs a
`get()` on the circle document; Stage 8 reuses the same helper for
eviction.

### Adding a field to member documents — the migration trap

`isValidMember` requires `keys().hasAll(memberFields())`, and Firestore
validates an update against the **merged** document. So adding a new name
to `memberFields()` instantly breaks updates to every member document
written before that field existed — a member renaming themselves would
start failing. Add optional fields to `hasOnly` only, never to `hasAll`:

```
data.keys().hasAll(memberFields())
  && data.keys().hasOnly(memberFields().concat(memberOptionalFields()))
```

The regression test for this already exists and is easy to miss: the
pre-existing "lets a member rename only themselves" test seeds a member
document *without* the new field, so it fails the moment someone makes a
new field required.

---

# ⚠️ Known issue: 4 early commits contain doc-filename references (rebase fix abandoned)

On 2026-08-10, four early commits (`Set up local emulators...`,
`Set up jest tests`, `Added User and FamilyCircle types`,
`created a reusable shared button...`) were found to contain code comments
referencing `Docs-DO-NOT-COMMIT/` filenames (`UI_Design_System.md`,
`Database_Schema.md`, `ADR-021`, etc.) inside committed source files — the
same class of mistake as an earlier README dead-link issue, just in code
comments instead of prose. This violates working agreement #3 below.

**A `git rebase -i` fix was built and fully verified** (author dates
preserved, tree otherwise identical, `tsc`/`test`/`lint` all clean, no
remaining doc references anywhere in history) — but the user then chose
**not** to force-push it, on the reasoning that a force-push and history
rewrite wasn't worth it for this. **The rebase was explicitly discarded**
(`git reset --hard origin/main`, then the one new commit since was
cherry-picked back on top) so that a normal, non-destructive
fast-forward push could happen instead.

**Current state, as a result:** those four commits, as they exist on
GitHub today, **still contain the doc-filename references** in code
comments. This is accepted, known, and intentional — not an oversight.
**Do not** attempt to fix this again with a new rebase/force-push without
first confirming the user wants that; they were offered the choice
explicitly and picked "leave history alone, push normally."

> **Note (2026-08-12):** an amend + `--force-with-lease` *was* used once
> since, on `bb62578`, to strip comments from the newest commit only —
> the user asked for that explicitly ("only remove the ones in the most
> recent commit, and push force"). That is not a precedent for rewriting
> older history. Amending the newest commit is cheap; rewriting the four
> old ones is still off the table.

---

# Testing policy — write FEWER tests

**Explicit instruction from the project owner (2026-08-12):** the suite
was reviewed and judged too large. Reduce test volume going forward.

Before writing a test, ask two questions:

1. Would it fail if something real broke?
2. Would it fail spuriously during a harmless refactor?

Write it only if the answers are **yes** and **no**.

**Do not test:** thin pass-through wrappers, constants, or anything
TypeScript already guarantees. The example that triggered this was
`src/services/__tests__/auth.test.ts` — four tests asserting that
one-line wrappers forward their arguments. They break on harmless
refactors and only catch a mistake nobody makes: the worst combination a
test can have.

**Do test:** logic that could break in a non-obvious way — retry loops,
error-code branching, state guards, normalisation.

**The exception worth defending: security-rules tests.** Rules fail
silently and catastrophically, there is no other way to verify them, and
they already caught a real bug on this project. Do not cut those.

Recent screens are the right calibration: **3 tests each**, not 8–10.

Current counts (2026-08-20): `npm test` **126** across 26 suites,
`npm run test:rules` **57** across 2 suites — 70 across 3 suites once the
uncommitted `memoryGroups.rules.test.ts` lands.

**Two harness facts worth knowing before writing a test here:**

- `render` and `fireEvent` are **async** in this version of
  `@testing-library/react-native` — every call needs `await`, and the
  render result has **no `UNSAFE_*` queries**. To fire a
  `RefreshControl`, reach it through the ScrollView's prop:
  `await act(async () => getByTestId('family-pulse').props.refreshControl.props.onRefresh())`.
- Any component that transitively imports `src/services/auth.ts` pulls in
  the Firebase **ESM** build, which Jest cannot parse. Mock it —
  `jest.mock('../../services/auth', () => ({ signOut: jest.fn() }))` — or
  the whole suite fails to run with `SyntaxError: Unexpected token 'export'`.

If asked to touch any of those four files again for unrelated work
(`firestore.rules`, `storage.rules`, `src/types/user.ts`,
`src/types/familyCircle.ts`, `jest.setup.js`/test files, `src/theme/colors.ts`),
it is fine to remove the stale doc reference **as part of that unrelated
edit** — a comment changing for an unrelated reason doesn't create the same
conspicuous "reference was scrubbed" signal a dedicated fix commit would.

---

# Committing methodology

## The rules (explicit instructions from the project owner)

1. **One commit at a time, then stop and wait for approval.** Do not chain
   multiple commits in one turn, even if each is individually correct and
   the work is finished. Wait for an explicit go-ahead each time.
2. **The user chooses the commit message.** Propose 2–3 options and let
   them pick, or use the message they supply verbatim. Never assume one.
3. **Nothing in the repository may reference AI involvement** — not commit
   messages, code comments, filenames, or `.gitignore` entries. See the
   gitignore strategy below. *(One deliberate exception exists in history:
   `c3857c7`, "Added read me(formatted by AI)", explicitly approved by the
   user. Do not "fix" it.)*
4. **Small commits** — roughly ≤150–200 lines of *hand-written* diff. If a
   change is bigger, split it (e.g. form UI in one commit, the Firestore
   wiring in the next).
5. **Lockfiles are the accepted exception to rule 4.** `package-lock.json`
   routinely adds thousands of machine-generated lines and cannot be split
   from `package.json` — committing one without the other leaves the repo
   in a state where `npm ci` installs the wrong versions. Judge commit size
   by hand-written diff only.
6. **`Docs-DO-NOT-COMMIT/` is never committed**, and nothing in the repo may
   reference its filenames — a cloner would hit dead links. (`README.md`
   had exactly this bug and was fixed.)
7. **Don't write code comments unless absolutely necessary.** Default to
   none. When a comment genuinely earns its place (a non-obvious
   constraint, a workaround, a "why," not a "what"), it must **never**
   reference a gitignored file — no doc filenames (`UI_Design_System.md`,
   `Database_Schema.md`, etc.), no ADR IDs, nothing that only makes sense
   to someone who can see `Docs-DO-NOT-COMMIT/`. This bit twice already:
   once in prose (`README.md`'s dead links), once in code comments (four
   early commits — see the section on that above). Comments explaining a
   real constraint should state the constraint itself in plain terms
   (what the limit is, why it exists) rather than pointing at a doc the
   reader of the committed code will never be able to open.

## The workflow, per commit

```bash
# 1. Verify — all four must be clean before staging
npx tsc --noEmit
npm run lint
npm test
npx prettier --check .
# after any dependency change, also:
npx expo-doctor

# 2. Review what is actually pending
git status --short

# 3. Stage explicitly, by path — never `git add -A` or `git add .`
git add <specific paths>
git status --short          # confirm ONLY the intended files are staged

# 4. Ask the user for the commit message, then:
git commit -m "<their message>"
git push origin main
```

**Then, after the commit lands:**
- Tick the task's checkbox in `Milestones.md`, noting the short hash and
  anything non-obvious that was learned.
- Add or update the entry in this handoff file.
- **Stop and wait** for approval before starting the next commit.

## Commit message style

Plain, specific, human — describing *what changed*, in the style a
developer would write. Reference an ADR ID where a decision is involved.

- ✅ `Add save-destination dropdown to Capture screen`
- ✅ `Keep users signed in across app restarts`
- ✅ `Add date-range matcher (see ADR-004)`
- ❌ `update`, `fix stuff`, `final2`
- ❌ anything naming an AI tool

## Gitignore strategy — important

The repo's own `.gitignore` contains only generic, unremarkable entries
(`node_modules/`, `.expo/`, `.env`, `functions/lib/`, OS files). It
deliberately **does not** mention `CLAUDE.md`, `.claude/`, `SETUP.md`, or
`Docs-DO-NOT-COMMIT/` — listing them there, even just to exclude them,
would spell out the tooling in a tracked, visible file.

Those are excluded via the **global** gitignore instead:

```bash
# ~/.gitignore_global   (registered with: git config --global core.excludesFile "~/.gitignore_global")
CLAUDE.md
.claude/
SETUP.md
Docs-DO-NOT-COMMIT/
```

A fresh machine must run that `git config --global core.excludesFile`
command, or those files will show up as untracked.

Commit/PR attribution trailers are also disabled globally in
`~/.claude/settings.json` (`"attribution": { "commit": "", "pr": "" }`).

## Where the documentation lives

All in `Docs-DO-NOT-COMMIT/` (local only):

| File | Purpose |
|---|---|
| `Milestones.md` | Phases 0–10, task breakdown, commit granularity |
| `Decisions.md` | **ADR-001 … ADR-021.** Read before changing any tech/data/scope decision |
| `Feature_Spec.md` | Features with MoSCoW priority + acceptance criteria |
| `SRS.md` | Numbered FR-1 … FR-27 requirements |
| `Database_Schema.md` | Firestore collections, indexes, security-rule design |
| `API_SPEC.md` | Cloud Function contracts + Firestore access patterns |
| `UI_Design_System.md` | Colors, spacing, type scale, components, motion |
| `SETUP.md` | Machine setup from scratch |

## Open risks

- **Timeline is tight:** ~4.5 weeks for Phases 1–9. Agree what gets cut
  under pressure. Current read: Phase 6 (Slideshows) is the highest demo
  value per hour; Phase 4 (bulk upload) is the most cuttable.
- **ADR-006 is unverified:** the competition's AI-usage documentation rule
  was reported as removed but never confirmed with organizers. Worth
  settling before submission — it is exactly the kind of gap a Q&A session
  exposes.
- **Repo is private** and must be made public (or judges added as
  collaborators) a day or two *before* the 8 Sept deadline, not on it.
- **Delete protection is off on the live database.** PITR (2026-08-13)
  covers bad *writes* for a trailing 7 days, but nothing stops the
  `(default)` database itself being deleted. This is the database Demo
  Day runs against. One call fixes it:
  `firestore:databases:update "(default)" --delete-protection ENABLED`.
- **No CI (new, 2026-08-12).** Nothing runs `tsc` / lint / tests on push.
  `main` was broken by a merge on 2026-08-12 and nobody found out until
  the next pull. Now that two people are committing, a GitHub Actions
  workflow running `npx tsc --noEmit`, `npm run lint` and `npm test` on
  every push would have caught it. The rules tests can run in CI too —
  the emulator works there. **Not set up; worth doing.**
- **Task 20 needs coordination, not just a merge.** Routing users with no
  circle to create/join changes what the app does on launch for *every*
  account. A teammate testing the camera on an account with no circle
  would be bounced into the create-circle flow. Land it after
  `feat/capture-screen` merges, or agree a window.
- **Pinch-to-zoom on the camera has never worked** — `isPinchToZoomEnabled`
  is not a real prop on `CameraView` in SDK 54. Removing it fixed a type
  error but did not restore the feature. Osama's call.

---

## 2026-08-30 — Memory Groups rules & schema

- **Author(s):** Moatasim Mohamed
- **Phase (see Milestones.md):** 3
- **What was done:**
  - Added `firestore.rules` for the `memoryGroups` collection, supporting create/get/list/update matching the schema, constrained by a new `inCircle()` helper.
  - Added a 13-test security rules suite (`firestore-tests/memoryGroups.rules.test.ts`) covering edge cases. Verified against the Firestore emulator.
  - Built the `CreateMemoryGroupScreen` UI with a new `@react-native-community/datetimepicker` for start/end dates and a custom multi-select picker for members.
  - Implemented the `createMemoryGroup` Firestore service enforcing schema validations (and the creator membership rule), then successfully wired it into the screen.
  - Built the `MemoryGroupsNavigator` to stack the List, Create, and Detail screens, and implemented the `MemoryGroupDetailScreen` empty state UI.
  - Built `useGroupMemories` to fetch all memories matching the `groupId` and `circleId`, ordering them chronologically (locally to avoid a Firestore index error).
  - Rebuilt the `MemoryGroupDetailScreen` UI to map the memories into a 3-column grid of `Image` thumbnails.
- **Decisions made (link to Decisions.md if applicable):** Skipped Capture screen dropdown integration (deferred to teammate to avoid merge conflicts).
- **What's next:** Phase 3 is fully complete! The next step is starting **Phase 4 — Bulk Upload & Auto-Categorization**.
- **Blockers / open questions:** The Capture screen dropdown was deferred to the teammate's branch (`feat/capture-screen`). Ensure they integrate the dropdown to select a Memory Group once their branch is merged.
- **Relevant commits:** 
  - `1870521` — `feat(memory-groups): add firestore security rules for memory groups`
  - `abd8ee3` — `feat(create-group): build form with date and member pickers`
  - `4ebeea5` — `feat(create-group): add memoryGroups firestore service and wire UI`
  - `f0d1210` — `feat(memory-groups): add hook to fetch active family circle groups`
  - `71e45e0` — `feat(memory-list): build memory groups list screen`
  - `e6522cc` — `fix(memory-groups): use SafeAreaView for notch support`
  - `b4708ec` — `feat(navigation): wire memory group stack navigation`
  - `13b26ec` — `feat(memory-detail): create empty state for group details`
  - `a0f306e` — `feat(memory-detail): fetch and display group memories`
  - `17c4ee6` — `feat(rules): implement and test private vs shared memory visibility`
  - `25ccea6` — `feat(my-space): build timeline screen and action menu to move memories`

## 2026-08-14 — Family Pulse redesign, then Family Circle rebuilt as a hub

- **Author(s):** Moatasim Mohamed
- **Phase:** 1 complete; this is post-Phase-1 UI work on `feat/family-circle`
- **What was done:**
  - **Family Pulse was bland — no icons, centred placeholder text.** Built
    two shared components the design system already called for
    (`ActionRow`, `EmptyState`), then rebuilt the tab root with a display
    title, labelled sections, icon badges and real empty/error cards.
  - **Read `RecommendedFamilyCircleLayout.md` and planned against it.**
    The plan lives at
    `C:\Users\Admin\.claude\plans\expressive-jumping-starlight.md` — 9
    stages, Stages 1–4 done. Most of the doc fits; the parts that do not
    are recorded under "Family Circle hub" below.
  - **Stage 1** — extracted `Avatar` (`26a40ae`), added an optional count
    to `ActionRow` (`acdcf69`).
  - **Stage 2** — `useFamilyCircleOverview` hook reading circle + members
    together (`1bdb280`); the Family Pulse tab root became the Family
    Circle hub, showing the circle name, an avatar, a member count and a
    Members row (`4615be1`). `FamilyPulseScreen` is now only a navigator.
  - **Stage 3** — members screen moved onto the shared hook, deleting its
    duplicated fetch (`cc03c22`); new member detail page (`7b3a8ef`);
    rows became tappable (`5ac599e`).
  - **Stage 4 — the first security-boundary change since the audit.**
    Members can carry an optional `relationship` ("Dad", "Grandma").
    Rules + 3 rules tests (`011db56`), service (`9324494`), UI
    (`e26ba17`). **Deployed to `athar-smac2026`.**
- **Decisions made:**
  - **The tab root *is* the hub**, rather than a "Your circle" row opening
    a separate hub screen. Keeps depth to a member at 2, and leaves the
    top of the screen free for Phase 7's mood check-in.
  - **Who may write `relationship`** — changed on owner feedback
    mid-stage. The family owner may label *anyone* but may not rename
    them; a member may set their own label and their own display name.
    Both branches are enforced in rules:
    ```
    allow update: if isValidMember(request.resource.data)
      && ( (isOwner(userId)    && changesOnly(['displayName','relationship']))
        || (isCircleOwner()    && changesOnly(['relationship'])) );
    ```
  - **`relationship` is an optional rules key, not a required one.**
    `isValidMember` uses `hasAll(memberFields())`, and an update is
    validated against the *merged* document — so making it required would
    have broken renames on every member doc written before today. It is in
    `hasOnly` only. The pre-existing rename test passing against a
    field-less doc is what proves this.
  - Kept `setMemberDisplayName` and added `setMemberRelationship` beside
    it, rather than one generic `updateMemberProfile` as planned —
    `accountUpgrade.ts` calls the former, and two narrow functions map
    one-to-one onto the two rules branches.
  - Dropped `ownerId` from `FamilyCircleSummary` in Stage 2 as
    speculative, then added it in Stage 4 when the edit gating genuinely
    needed it.
- **Family Circle hub — what the recommendation doc asked for that is NOT
  being built, and why:**
  - **A pending-invitation ledger** ("Ahmed invited Fatima · Resend /
    Cancel"). No per-person invitation exists in the schema — a circle has
    one shared code. Would need an `invitations` collection plus email
    delivery. The page is called **Invite** and is a sharing surface.
  - **Delete circle** — `allow delete: if false`, and it would orphan
    every member's `familyCircleId`. Needs a Cloud Function.
  - **Family photo** — needs Storage, which Phase 2 has not wired up. A
    generated initial avatar stands in.
  - **Notification preferences** — push is struck through as blocked in
    Milestones Phase 7. The toggles would control nothing.
  - **Permissions** — deferred to **early Phase 3**, on owner instruction
    that it must happen eventually. Three things must exist first: a third
    role tier (only `owner`/`member` exist), Memory Groups (half the
    toggles govern them), and a member-role write path. A permissions
    screen whose toggles are not enforced in rules is worse than no
    screen.
- **What's next:** Stage 5 — the Invite page. The invite code moves off
  the members screen onto its own page, the hub gains its Invite row, and
  the members list gains an "Invite family member" CTA. **Sequencing note:
  the code deliberately stays on the members screen until that page
  exists**, so it is never unreachable. Then Stage 6 (rotate the code),
  Stage 7 (settings: rename + leave), Stage 8 (owner removes a member),
  Stage 9 (deep link, optional).
- **Blockers / open questions:**
  - **Nothing here has been run on a device.** Same standing caveat as
    Phase 1. The relationship editor has only ever run under Jest.
  - **Stage 5's QR code is the one place this plan touches
    `package.json`** (`react-native-svg`, `react-native-qrcode-svg`) —
    the only realistic conflict with `feat/capture-screen`.
  - Neither branch is merged to `main` (still `119a4ad`).
    `feat/family-circle` is 27 commits ahead, `feat/capture-screen` 6.
    That divergence only gets more expensive.
- **Relevant commits:** `8ba3ce4`, `4cb4b92`, `26a40ae`, `acdcf69`,
  `1bdb280`, `4615be1`, `cc03c22`, `7b3a8ef`, `5ac599e`, `011db56`,
  `9324494`, `e26ba17`

---

## 2026-08-13 — Task 20 (routing), a cleanup pass, a routing rethink, and all of Stage F

- **Author(s):** Moatasim Mohamed
- **Phase:** 1 — task 20, then Stage F started
- **What was done:**
  - **Task 20 — launch routing.** 4 commits: `b58e0d3` (continue step),
    `833789d` (onboarding container), `6a80307` (the gate in `App.tsx`),
    `0a72057` (3 tests). Landed once `feat/capture-screen` was confirmed
    merged into `main`, so the coordination gate no longer applied.
    `RootTabNavigator.tsx` and `src/screens/capture/` untouched.
  - **A cleanup pass over the whole branch** (`f154075`): removed a dead
    `onCreated` prop, killed the duplicate `onAuthStateChanged`
    subscription in `FamilyPulseScreen`, fixed a latent write bug, and
    trimmed 3 redundant tests. Net −16 lines.
  - **Invite code is now copyable** (`b5cde12`) — `expo-clipboard` plus a
    shared `InviteCodeCard` component.
  - **Routing rethought after the owner used the app** (`d3b9c91`): the
    circle is no longer forced. See the decision note below.
  - **Stage F finished — tasks 22, 23 and 24 are all done.**
    - **22, guest upgrade** (`edd2d71`, `cbca168`, `a988d7f`,
      `c7c3863`, `bda4765`). Reachable from Family Pulse via
      "Save your account" when `user.isAnonymous`.
    - **23, rules audit** (`88514ab`, deployed). Scored 4/5. Found and
      fixed a **real, confirmed-exploitable** `memberIds` replay.
    - **24, loading/error states** (`4f507d5`). Surfaced the silent
      `useEnsureUserDocument` failure.
  - **`firestore.rules` deployed twice today** (`cbca168`, then
    `88514ab`) — live rules match the branch.
- **Decisions made:**
  - **A forced circle was the wrong call.** Task 20 as specified sent
    every circle-less user to create/join with no way past it. Using the
    app made it obvious that is too aggressive for a first run, so both
    screens now offer **"Skip for now"**, persisted per-uid in
    AsyncStorage, and **Family Pulse offers "Create or join a circle"**
    so the skip is not a dead end. Worth an ADR if it survives contact
    with the rest of the team.
  - **Creating a circle is separate from leaving the create screen.**
    `onCreated` fired the instant `createFamilyCircle` resolved, so
    routing on it flashed the invite code for one frame. A separate
    `onContinue` fires only once the code has been read.
  - **A failed membership read never falls through to onboarding** — an
    existing member routed into "create" is refused with
    `already-in-circle`, a dead end. It shows a retry instead.
  - **`RootTabNavigator` now takes `user`**, not `uid` — creating a
    circle from Family Pulse needs the `User`. Passed via the children
    callback, never `initialParams`, so React Navigation's
    non-serializable warning does not fire.
- **What's next:** **Phase 1 is task-complete (all 24 done).** Before
  calling it closed, run the exit criteria on a real device — sign up or
  continue as guest, create/join a circle, land on Capture, sign out and
  back in, restart the app. Then Phase 2 (capture).
- **Blockers / open questions:**
  - **Nothing in Phase 1 has been exercised on a device this session.**
    The guest upgrade in particular has only ever run under Jest, and
    linking is exactly where the emulator and production diverge
    (`auth/requires-recent-login`).
  - **Invite codes cannot be revoked or rotated** (audit finding). A
    leaked code grants permanent join access. The most worthwhile of the
    three open audit findings.
  - Unchanged: **no CI.** Nothing runs `tsc`/lint/tests on push.
  - **The invite code is still only visible at creation.** After
    "Continue" there is no way back to it; `InviteCodeCard` is ready to
    drop into Family Pulse for this.
  - **`displayName` goes stale on guest upgrade.** A guest's user doc and
    their denormalized member doc both say "Guest"; linking an email does
    not touch either, so the members list keeps showing "Guest".
  - **`listFamilyCircleMembers` calls `joinedAt.toMillis()` unguarded.**
    `serverTimestamp()` reads back as `null` from the local cache before
    the server resolves it, so a member opening the list right after
    joining, offline, would crash the screen.
  - **Switching circles is unsupported by the schema** — one
    `familyCircleId` per user, and a second join is refused. A leave flow
    would need an ADR (what happens to their memories, or to the circle
    when the owner leaves?).
- **Relevant commits:** `b58e0d3`, `833789d`, `6a80307`, `0a72057`,
  `f154075`, `b5cde12`, `d3b9c91`, `edd2d71`, `fe6b085`, `cbca168`,
  `a988d7f`, `c7c3863`, `bda4765`, `88514ab`, `4f507d5`

---

## 2026-08-12 (later) — Task 21: Family Circle members list

- **Author(s):** Moatasim Mohamed
- **Phase:** 1 — task 21
- **What was done:**
  - **`eab8c1b` — services.** `listFamilyCircleMembers(circleId)` reads
    the `members` subcollection and converts `joinedAt` to millis at the
    boundary (domain types stay SDK-free), sorted oldest-first so the
    owner leads. New `getFamilyCircleId(uid)` on `users.ts`.
  - **`0888a09` — the screen.** Four states as a discriminated union:
    `loading` / `error` / `no-circle` / `ready`.
  - **`7aec7cf` — reachable.** `FamilyPulseScreen` is now a nested
    `native-stack` (home → members), so the members list has a real
    header and back button without anyone touching
    `RootTabNavigator.tsx`.
  - **`66abebd` — 3 tests.** `npm test` is now **66**.
- **Decisions made:**
  - **The screen test pins the subcollection read.** It asserts
    `listFamilyCircleMembers` is called with the resolved circle ID, so
    a later "optimisation" to read the `memberIds` array off the circle
    doc fails the suite rather than silently shipping a stale roster.
    This is the one thing about task 21 most likely to be undone by
    someone who has not read the rules tests.
  - **`FlatList`, not `FlashList`.** The FlashList convention exists for
    the Timeline feed and photo grids — unbounded lists. A family circle
    is single-digit, and `@shopify/flash-list` is not a dependency, so
    this would have meant a new native module and an SDK-54
    compatibility check for no measurable scroll gain.
  - **`uid` passed via `Stack.Screen`'s children callback.** A screen
    registered with `component` cannot take extra props, and putting a
    `User` object in `initialParams` trips React Navigation's
    non-serializable warning. The screen only ever needs the uid —
    member docs carry `displayName` denormalized.
  - **Retry is an `attempt` counter**, not a second load function, so
    there is one code path and one cancellation guard.
- **What's next:** **task 20 — routing — is the last Phase 1 item before
  Stage F, and it needs coordination with Osama before it starts.**
- **Blockers / open questions:**
  - Unchanged: **no CI.** Nothing runs `tsc`/lint/tests on push.
  - `FamilyPulseScreen` now calls `useAuth()` itself (a second
    `onAuthStateChanged` subscription alongside `App.tsx`'s). Cheap, and
    unavoidable without editing `RootTabNavigator.tsx` to pass the user
    down — worth revisiting once `feat/capture-screen` merges and that
    file is safe to touch.
- **Relevant commits:** `eab8c1b`, `0888a09`, `7aec7cf`, `66abebd`

---

## 2026-08-11 → 08-12 — Stage C/D/E: auth screens, user docs, Family Circle

- **Author(s):** Moatasim Mohamed
- **Phase:** 1 — tasks 6 through 19
- **What was done:**
  - **Stage B/C — auth complete.** `useAuth` hook (`b2e3548`), auth
    gating in `App.tsx` (`ae4f844`), sign-in screen (`4ff0cef`),
    native-stack navigator + sign-up screen + links (`761bd86`,
    `8319dac`, `56bc498`, `6e977c7`), guest/anonymous sign-in
    (`458c30f`), sign-out button (`19e6fbe`).
  - **Stage D — auth connected to the database.** `users` security rules
    (`bb62578`), `ensureUserDocument` (`98b4260`), wired into the auth
    flow via `useEnsureUserDocument` (`f8d296e`).
  - **Stage E — Family Circle.** Invite-code util (`174e11c`), rules
    test harness (`a8be3fc`), circle/member/inviteCode rules + tests
    (`2e9ba74`, `8461305`, `6affb17`, `b90f22a`), the service
    (`838d4e5`, `4067d0d`), Create screen (`7d2d16b`, `f25a964`),
    `familyCircleId` persistence + `already-in-circle` (`4e78f38`),
    Join screen (`db74ad1`, `7a1ff9b`).
  - **Unblocked the live project:** Email/Password and Anonymous
    sign-in enabled in the console; `firestore.rules` deployed for the
    first time. Auth now works end to end against real Firebase.
  - **Fixed a broken `main`** (`119a4ad`) — see below.
- **Decisions made:**
  - Built a **security-rules test harness** before writing the hardest
    rules, rather than after. It immediately found a real gap
    (orphaned circles), fixed in `8461305`.
  - **Reduced testing going forward** at the owner's instruction — see
    the "Testing policy" section.
  - **Reordered Stage E to 18, 19, 21, 20** to avoid the capture-screen
    workstream. Task 20 is last because it changes launch behaviour for
    every account, which would block a teammate testing the camera.
- **What's next:** task 21 (members list, reached from
  `FamilyPulseScreen` — *not* a new tab), then task 20 after
  coordinating with Osama.
- **Blockers / open questions:**
  - ~~`users/{uid}.familyCircleId` never written~~ — closed by `4e78f38`.
  - **No CI.** Nothing runs `tsc`/lint/tests on push. `main` broke on
    2026-08-12 for exactly this reason. A GitHub Actions workflow would
    have caught it. Not yet set up.
  - Creating/joining a circle works, but nothing *routes* users based on
    circle membership yet — that is task 20.

### The `main` breakage, 2026-08-12 (worth reading)

Pulling the capture-screen work left `main` failing `tsc` with four
errors, none of them from this workstream:

1. `@expo/vector-icons` imported but never declared — it resolved only as
   a **nested** transitive dep of `expo`, which Metro finds and
   TypeScript does not. Fixed by declaring it.
2. `CaptureScreen.tsx` — `FLASH_CYCLE[...]` returns `FlashMode | undefined`
   under `noUncheckedIndexedAccess`. Harmless at runtime (the modulo
   guarantees the index); added a fallback.
3. `isPinchToZoomEnabled` is **not a prop** on `CameraView` in
   expo-camera SDK 54 — it was silently ignored, so **pinch-to-zoom has
   never actually worked**. Removing it fixed the type error but did not
   restore the feature; that needs the `zoom` prop driven by a real
   pinch gesture handler. **Still worth telling Osama.**

Fixed and merged as `119a4ad` with a deliberately tiny diff (one line
changed, one deleted) to minimise conflicts with his in-flight work.

---

## 2026-08-07 (later) — Phase 1 started: test runner and domain types

- **Author(s):** Moatasim Mohamed
- **Phase (see Milestones.md):** Phase 1 — Identity & Family Circle
- **What was done:**
  - **Phase 1 restructured into 24 numbered, dependency-ordered tasks**,
    one commit each, so the app builds and runs after every commit.
    Grouped into six stages (Foundations → Auth plumbing → Auth screens →
    User docs → Family Circle → Hardening).
  - **Task 1 — Jest test runner.** `jest-expo` 54.x (matched to the SDK
    pin), `jest.config.js`, `jest.setup.js`, `test`/`test:watch` scripts,
    and one smoke test. `jest.setup.js` stubs the `EXPO_PUBLIC_*` Firebase
    env vars because `services/firebase.ts` reads them at module scope —
    anything importing it in a test would otherwise get `undefined` config.
  - **Task 2 — domain types.** `src/types/user.ts` and
    `src/types/familyCircle.ts` (`FamilyCircle`, `FamilyCircleMember`,
    `InviteCode`), barrel-exported. *Not yet committed at time of writing.*
- **Decisions made (see Decisions.md):**
  - **ADR-021** — added an `inviteCodes/{code}` lookup collection. Writing
    out the Phase 1 tasks exposed a chicken-and-egg hole: the rule "only
    members can read a Family Circle" makes *joining* impossible, since a
    joiner is not yet a member. The obvious workaround (public
    `familyCircles` reads) would leak every family's name and member list.
    Fix: a thin code→circleId lookup doc that any authenticated user may
    read, **plus** a rule-side `get()` proving the joiner knows the code.
    Without that second half, any user could add themselves to any circle
    just by knowing its ID. Two knock-ons: circle creation must be
    **transactional** (circle + owner member doc + code doc together, or a
    circle can exist that nobody can join), and the code generator must
    retry on collision since the code is the document ID.
  - Timestamps modelled as `number` (millis) rather than Firestore
    `Timestamp`, consistent with the existing `memory.ts`. Services convert
    at the boundary; domain types stay SDK-free and unit-testable.
- **What's next:** Phase 1 task 3 — shared `Button` component, then task 4
  (`TextInput`). Both are prerequisites for the auth screens in Stage C.
- **Blockers / open questions:** unchanged — see "Open risks" in the
  Current State section above.
- **Relevant commits:**
  - `bd41c8b` — `Set up jest tests`
  - `16b6795` — `Added User and FamilyCircle types`
  - `d2ab966` — `created a reusable shared button with multiple variants, fixed color contrast issues.`

---

## 2026-08-07 — Phase 0 closed out, and a plan audit before Phase 1

- **Author(s):** Moatasim Mohamed
- **Phase (see Milestones.md):** Phase 0 complete → planning for Phase 1
- **What was done:**
  - **Expo Go compatibility resolved.** The app would not open from a QR
    scan — SDK 57, then SDK 56, were both rejected. Root cause: the App
    Store build of Expo Go on the team's iPhone supports only up to
    **SDK 54**; newer Expo Go builds are still in store review. Downgraded
    to SDK 54 (RN 0.81.5 / React 19.1.0) — **ADR-016**. Confirmed working
    on a physical iPhone.
  - **Phase 0 complete and tagged `v0.1.0-scaffold`.** All exit criteria
    met: runs on a real device, opens straight into a permission-gated
    camera, connects to the emulators.
  - **Audited Phases 1–10 before starting Phase 1**, which surfaced three
    blockers and several ordering problems (below).
- **Decisions made (see Decisions.md):**
  - **ADR-016** — pin to Expo SDK 54.
  - **ADR-017** — Firebase Auth persistence via AsyncStorage. `getAuth()`
    defaults to *in-memory* persistence in React Native, so users were
    being signed out on every restart; Phase 1's exit criteria could not
    have passed. Fixed in code.
  - **ADR-018** — Phase 2/Phase 3 boundary redrawn. Phase 2 depended on
    Phase 3 deliverables (Storage upload, `memories` doc) and so could not
    complete as written. Storage upload + `memories` creation moved into
    Phase 2; "dropdown lists Memory Groups" moved into Phase 3.
  - **ADR-019** — remote push notifications cut. They do not work in Expo
    Go on SDK 54. FR-27 marked not-met; Feature_Spec §6.3 moved
    `Should` → `Won't`; the nudge ships as an in-app card.
  - **ADR-020** — **supersedes ADR-005.** On-device speech-to-text is
    impossible in Expo Go (no first-party module; `expo-speech` is
    text-to-*speech*, and the third-party option needs a dev build).
    `generateMemoryStory` now takes the **audio file** and has Gemini
    transcribe *and* write the story in one call. Also better for the
    target users, who code-switch between Arabic and English — on-device
    STT needs a fixed locale and handles that poorly.
- **Also updated:** `Database_Schema.md` gained a "security rules are not
  filters" section (the most likely source of confusing `permission-denied`
  errors in Phase 3/7, with the exact query shapes required);
  `API_SPEC.md` §3.1 rewritten for the audio-in contract; `SRS.md` FR-21 /
  FR-23 / FR-27 and §2.5 amended; `Architecture.md` camera/media section
  resolved (`expo-audio` + `expo-video`, not `expo-av`).
- **What's next:** Phase 1 — Identity & Family Circle. First task is Jest +
  `jest-expo` setup (carried over; Phase 4 needs unit tests and no test
  runner exists yet), then auth screens and Family Circle.
- **Blockers / open questions:**
  - **Timeline is tight:** ~4.5 weeks for Phases 1–9. Worth agreeing now
    what gets cut under pressure. Current read: Phase 6 (Slideshows) is the
    highest demo value per hour; Phase 4 (bulk upload) is the most
    cuttable.
  - ADR-006 still open — the competition's AI-usage documentation rule
    remains unverified with organizers.
- **Relevant commits:**
  - `c7bc27a` — `Downgraded expo go from sdk 57 to 54 for compatibility with IOS`
  - `c3857c7` — `Added read me(formatted by AI)`
  - `27dda1a` — `Keep users signed in across app restarts`

---

## 2026-08-06 — Phase 0 kickoff: environment, Firebase project, and app scaffold

- **Author(s):** Moatasim Mohamed
- **Phase (see Milestones.md):** Phase 0 — Foundation & Setup
- **What was done:**
  - Reviewed the installed skills in `.claude/SKILLS/` and folded their
    guidance into the planning docs (see Decisions below). Docs touched:
    `Architecture.md`, `UI_Design_System.md`, `Feature_Spec.md`,
    `API_SPEC.md`, `Milestones.md`, `SETUP.md`, `Decisions.md`.
  - **Environment setup** — confirmed Git, Node v24.19.0, GitHub CLI
    (authenticated), installed `eas-cli`. Logged in to the Firebase CLI.
  - **Firebase project created:** `athar-smac2026` (display name "Athar
    Dev"). Note: `athar-dev` was already taken globally. Upgraded to the
    Blaze plan and enabled the Firestore API.
  - **Firestore database created:** Standard edition, `me-central1`
    (Doha — lowest latency for a Gulf-based team/demo). Default rules are
    closed.
  - Registered a Firebase Web app to get the JS SDK config
    (App ID `1:703931249134:web:6f53976d8af1a15b6f9eff`).
  - **App scaffold:** Expo + TypeScript project initialized, folder
    structure created per `Architecture.md`, ESLint 9 flat config +
    Prettier added, strict `tsconfig` (`noUncheckedIndexedAccess`).
  - **Firebase client wired up** — `src/services/firebase.ts` reads config
    from `EXPO_PUBLIC_*` env vars and auto-connects to the local emulators
    when `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` in a dev build.
  - Built locally but **not yet committed** (upcoming commits): emulator
    config + Cloud Functions skeleton, base theme tokens, Zustand capture
    -destination store, bottom-tab navigation with Capture as the initial
    route, camera/mic permission gating, README.
- **Decisions made (see Decisions.md):**
  - **ADR-012** — evaluated Firebase AI Logic (client-direct Gemini calls)
    as a replacement for the `generateMemoryStory` Cloud Function;
    **rejected**, because a client-direct call would also make the client
    the writer of `aiStory`/`aiStatus`, breaking the Cloud-Functions-only
    write guarantee those fields depend on.
  - **ADR-013** — Cloud Functions require the **Blaze** plan; the earlier
    `SRS.md` §2.5 assumption that the free Spark tier was sufficient was
    wrong and has been corrected. Mitigated with a budget alert plus the
    existing per-user rate limit in `API_SPEC.md` §5.
  - **ADR-014** — Firestore **Standard** edition, chosen explicitly at
    creation time rather than accepting the tooling default (which now
    leans Enterprise for new instances).
  - **ADR-015** — navigation pattern resolved to **Option A, bottom tab
    bar** (the open fork left by ADR-007 / `Architecture.md` §2), with
    Capture as `initialRouteName` and a typed `RootTabParamList`.
  - Skill-driven conventions recorded in `Architecture.md` §4: FlashList
    for all lists/grids, `GestureDetector` for the tap-vs-hold shutter,
    typed navigation param lists, Zod validation at Firestore/Cloud
    Function boundaries.
  - `firebase-security-rules-auditor` added to `Milestones.md` as a
    standing gate before every rules deploy (Phases 1 and 3).
- **What's next:** Phase 0 exit criteria are now met — app runs on a
  physical device (iPhone, via Expo Go), launches straight into a
  permission-gated camera, and connects to the Firebase emulators without
  errors. Next: tag `v0.1.0-scaffold`, then move into Phase 1
  (Identity & Family Circle).
- **Blockers / open questions:**
  - ~~JRE not installed~~ — resolved. Eclipse Temurin 21 JRE installed via
    `winget`; `firebase emulators:start` verified end-to-end (Auth,
    Firestore, Storage, Functions all reach "All emulators ready").
    `SETUP.md` §7 documents this prerequisite (it's absent from Firebase's
    own quickstart).
  - ~~App not yet run on a physical device~~ — resolved. Confirmed working
    on iPhone via Expo Go after the SDK 54 downgrade (see ADR-016).
  - ADR-006 still open: the competition's AI-usage documentation rule
    remains unverified. Worth confirming with mentors before submission.
  - New from this session: the team's iPhone's Expo Go build only
    supports up to **SDK 54** (the App Store build for newer SDKs is
    still in review as of Aug 2026 — see ADR-016). Any future
    `npx expo install` of a new native module should be checked against
    SDK 54 compatibility, not just "latest," or it'll reintroduce the
    same incompatibility.
- **Relevant commits:**
  - `925e371` — `Add gitignore`
  - `f558cfe` — `Initialize Expo TypeScript project`
  - `d5a3f8d` — `Add ESLint and Prettier config`
  - `aee414a` — `Add shared Memory and MemoryGroup types`
  - `e820b04` — `Initialize firebase client, adds env variables`
  - `23a53af` — `Set up local emulators and functions project`
  - `4e714a5` — `Added Color palette(might change later), spacing constants(also changeable), Font details(width/size) per section.`
  - `ab2a7ca` — `Added destination storing area(zustand store), with a capture destination`
  - `b89fc4b` — `Added bottom tab navigation with placeholder screens`
  - `2d053a4` — `replace placeholder in capture screen to real camera view, added permission checks for camera and microphone(Athar/src/hooks/useCaptureMediaPermissions.ts.)`
  - `c7bc27a` — `Downgraded expo go from sdk 57 to 54 for compatibility with IOS`
  - `c3857c7` — `Added read me(formatted by AI)`
