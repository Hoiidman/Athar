# Milestones — Athar

This file breaks the project into phases. Each phase lists its scope, a task
breakdown small enough that **each task = roughly one commit**, and an exit
checklist before moving to the next phase.

## Commit Discipline (applies to every phase below)

- **Commit after every small, working unit of change** — a component, a
  function, a Firestore rule, a bug fix. Not after a whole screen, not after
  a whole feature.
- **Target:** multiple commits per work session. If a single commit touches
  more than ~150–200 lines, it's probably bundling more than one change —
  split it.
- **Never** batch several days of work into one end-of-week commit. Judges
  (and this plan) treat commit *frequency and spread* as a signal of real,
  steady progress, not just the final diff.
- Every task line item below is written at roughly "one commit" granularity
  on purpose — use it as your commit checklist, not just a task list.

---

## Phase 0 — Foundation & Setup

**Goal:** A working, empty app that runs on a real device, with the project
scaffolding and docs in place.

**Tasks (≈1 commit each):**
- [x] Initialize Expo + TypeScript project (strict `tsconfig.json` — see
      `Architecture.md` §4 TypeScript conventions)
- [x] Set up folder structure per `Architecture.md`
- [x] Add ESLint 9 flat config (`typescript-eslint`) + Prettier
- [x] Create Firebase project (dev environment), upgrade to Blaze plan, set
      a budget alert (ADR-013)
- [x] Create Firestore database with `--edition=standard` explicitly
      (ADR-014) — don't accept a tool default
- [x] Connect Firebase SDK to the app (config + env variables, `.env.example`)
- [x] Set up Firebase Local Emulator Suite for local dev
- [x] Add React Navigation skeleton, with the **Capture screen set as the
      initial route** (see ADR-007 in `Decisions.md`) — empty placeholder
      screens for Timeline, Memory Groups, Family Pulse reachable from it
- [x] Add camera + microphone permission request flow
- [x] Add base theme file (colors, spacing, typography from `UI_Design_System.md`)
- [x] Set up state management library (chosen in `Architecture.md`)
- [x] Write project README with run instructions
- [x] Tag `v0.1.0-scaffold`

**Exit criteria:** App builds and runs on a physical device, launches
directly into a permission-gated camera viewfinder (Capture screen), and
connects to Firebase emulators locally without errors.

---

## Phase 1 — Identity & Family Circle

**Goal:** Users can sign in and belong to a shared Family Circle.

**Tasks — each line is exactly one commit.** Ordered by dependency: the
app builds and runs after every single one. Stages are grouping only, not
checkpoints — don't batch commits to a stage boundary.

> **Why security rules are interleaved rather than batched at the end:**
> `firestore.rules` is currently default-deny on everything (written that
> way in Phase 0). Any write fails until a rule permits it, so the rules
> for a collection *must* land before the service that writes to it —
> #12 before #13, #16 before #17. This is also better practice than the
> original "rules at the end" plan, and a much better Q&A answer.

*Already done:*
- [x] Firebase Auth persistence via AsyncStorage (see ADR-017) — pulled
      forward, since without it auth state is lost on every restart and
      this phase's exit criteria can't be met

**Stage A — Foundations** *(no user-visible change yet)*
- [x] 1. Set up Jest + `jest-expo` test runner with one smoke test
      (carried over from Phase 0; Phase 4 depends on this existing) —
      `bd41c8b`. Note: `jest.setup.js` stubs the `EXPO_PUBLIC_*` Firebase
      env vars, since `services/firebase.ts` reads them at module scope.
- [x] 2. Add `User` and `FamilyCircle` types (`src/types/`, mirroring
      `Database_Schema.md`) — includes `FamilyCircleMember` and
      `InviteCode` per ADR-021. Timestamps are `number` (millis), not
      Firestore `Timestamp`, matching `memory.ts`: services convert at the
      boundary so domain types stay free of SDK types and testable without
      mocking Firestore.
- [x] 3. Add shared `Button` component (`UI_Design_System.md` §5) —
      primary/secondary/destructive, with disabled + loading states.
      Building it surfaced a palette accessibility bug: only `primary`
      met the 4.5:1 text-contrast bar. `error` darkened
      `#D64545` → `#CC4040` (4.38 → 4.80) so the destructive variant
      passes, and §2 of `UI_Design_System.md` now records measured ratios
      plus which tokens may carry text at all.
- [x] 4. Add shared `TextInput` component (with label + error state) —
      `9e9da52` —
      always-visible label (never placeholder-as-label), error message
      rendered directly under the field, helper text, focus and disabled
      states. Extends RN's `TextInputProps` so `secureTextEntry`,
      `keyboardType` etc. pass straight through. Added a `border` token
      (`#8A8A8A`) — the lightest grey clearing WCAG 1.4.11's 3:1 bar for a
      control boundary on both `surface` and `background`.

**Stage B — Auth plumbing**
- [x] 5. Add `src/services/auth.ts` — sign-up, sign-in, anonymous sign-in,
      sign-out wrappers. `c448e2d`. Unit tests mock
      `src/services/firebase.ts` itself (not just `firebase/auth`) —
      otherwise importing it pulls in the real Firebase SDK's ESM/CJS-mixed
      dependency chain, which Jest's default transform can't parse. See the
      Jest/Firebase gotcha in the handoff.
- [x] 6. Add `useAuth` hook — subscribes to `onAuthStateChanged`, exposes
      `{ user, initializing }`. `b2e3548`. Added `@testing-library/react-native` +
      `@types/react-test-renderer` as new test dependencies — needed to
      test a hook (not just a plain function like task 5's services), and
      will be needed again for Stage C's screens. `renderHook`/`unmount`
      are async in this version (built for React 19) — see the gotcha in
      the handoff.
- [x] 7. Gate the app behind auth state — `AuthNavigator` vs
      `RootTabNavigator`, splash while `initializing`. `ae4f844`.
      `AuthNavigator` is a bare placeholder for now (no
      `native-stack` dependency yet) — tasks 8/9 will turn it into a real
      stack once there are two screens to link between.

**Stage C — Auth screens**
- [x] 8. Add sign-in screen (email/password). `4ff0cef`. Reuses the
      existing `TextInput`/`Button` rather than restyling anything.
      Firebase's ambiguous-credential codes
      (`auth/invalid-credential`/`user-not-found`/`wrong-password`) all
      collapse to one generic message — distinguishing them would leak
      which emails have accounts. Raised Jest's `testTimeout` to 15s
      (`jest.config.js`) — a full screen's first render can pass the 5s
      default once several suites run in parallel.
- [x] 9. Add sign-up screen + link from sign-in. Split across 4 commits:
      `761bd86` (native-stack navigator restructuring), `8319dac`
      (`SignUpScreen` component), `56bc498` (its test), `6e977c7`
      (wiring the links + `AuthNavigator.test.tsx` covering the
      navigation itself). Screens now call `useNavigation`, so their
      tests render inside a `NavigationContainer`.
- [x] 10. Add guest mode entry point (anonymous auth). `458c30f`.
      "Continue as guest" button on the sign-in screen. Replaced the old
      `submitting: boolean` with `pending: 'credentials' | 'guest' |
      undefined` — two independent async actions on one screen need to
      know *which* one is running, or the spinner lands on the wrong
      button. **Requires enabling Anonymous auth in the Firebase console**
      (Authentication → Sign-in method) — off by default, and the button
      surfaces `auth/operation-not-allowed` with a readable message until
      it's turned on.
- [x] 11. Add sign-out action — **temporary placement**, mark with a
      `TODO` to move into settings in a later phase. Needed now, or you
      can't test sign-in more than once without reinstalling. `19e6fbe`.
      Built as a self-contained `SignOutButton` component (owns its own
      pending/error state) rather than inline on the screen, so moving it
      into settings later is a one-line change, not a rewrite. Lives on
      Family Pulse for now; `PlaceholderScreen` gained an optional
      `children` prop to host it. **Stage C complete — all auth done.**

**Stage D — User documents**
- [x] 12. Add Firestore security rules for `users`. `bb62578`. Own-doc
      `get` only; `list` denied outright (would expose every user in the
      project, and members are read from a circle's `members` subcollection
      instead). `create`/`update` validate exactly the five schema fields
      via an `isValidUser()` helper, and pin `createdAt`/`updatedAt` to
      `request.time` — so the client **must** use `serverTimestamp()` or
      the write is rejected. `createdAt` is immutable on update; `delete`
      denied (account deletion has to cascade, so it belongs in a Cloud
      Function). Validated by loading them into the Firestore emulator via
      `emulators:exec` — it parses and rejects bad syntax on start.
      **Still unverified behaviourally** — see the rules-testing note in
      the handoff.
- [x] 13. Add `src/services/users.ts` — create user doc if missing.
      `98b4260`. `ensureUserDocument(user: User)` takes the Firebase user
      object directly (not raw strings) since it needs to derive
      `displayName` itself: Firebase's `displayName` is `null` for plain
      email/password sign-up and *always* null for guest/anonymous
      (task 10) — falls back to the email local-part, then `"Guest"`.
      Writes exactly the 5 fields task 12's rules validate, using
      `serverTimestamp()` (a client `Date.now()` would be rejected by
      `request.time`). Deliberately just the create-if-missing primitive
      — no read/subscribe yet, nothing needs it.
- [x] 14. Create the user document on first sign-in (wires #13 into the
      auth flow). `f8d296e`. New `useEnsureUserDocument(user)` hook,
      called from `App.tsx` next to `useAuth`. **Driven by auth state,
      not by the three auth screens** — a per-screen call would be
      duplicated 3× and would miss the case that matters most, a session
      restored from AsyncStorage on launch (anyone who signed up before
      this task, or whose write failed once, would never get a doc).
      Non-blocking: gating the UI on a Firestore write would make the app
      unusable offline. A `useRef` guard keyed on uid stops a re-write
      when Firebase re-emits the same user on token refresh (otherwise
      that costs a Firestore read every refresh); the guard is cleared on
      failure so a later attempt retries. **Stage D complete — auth is
      now connected to the database.**
      *Open:* the returned `failed` flag is not surfaced in the UI yet —
      worth doing before Stage E, where a missing user doc starts causing
      visible problems.

**Stage E — Family Circle**
- [x] 15. Add invite code generator util + unit tests — the first real
      exercise of the Stage A test setup. Must retry on collision (the
      code is used as a document ID, so Firestore rejects duplicates).
      `174e11c`. `src/utils/inviteCode.ts`, 12 tests.
      **Added `expo-crypto` (~15.0.9)** — `Math.random()` is predictable
      from prior outputs, and guessing a code lets someone join a circle
      and read that family's private photos, so code randomness is a
      security boundary. First-party, works in Expo Go, `expo-doctor`
      18/18.
      Alphabet excludes `0 1 I L O U` (30 chars × 8 ≈ 6.6e11) so codes
      survive being read aloud. Uses **rejection sampling**, not
      `byte % 30` — 256 isn't divisible by 30, so plain modulo would make
      the first 16 letters measurably more likely; bytes ≥ 240 are
      discarded and redrawn (there is a test for exactly this).
      `generateUniqueInviteCode(claim, maxAttempts)` takes a callback so
      the retry is testable without Firestore — **task 17 supplies the
      Firestore-backed `claim`**. Throws rather than looping forever.
      `normalizeInviteCode` accepts lowercase/spaces/hyphens.
- [x] *(unplanned, before 16)* Security-rules test harness. `a8be3fc`,
      on branch `feat/family-circle`. `npm run test:rules` wraps
      `emulators:exec`, so it starts the Firestore emulator, runs the
      tests and shuts down — it cannot silently pass with no emulator.
      Kept **separate** from `npm test`: rules tests need a `node`
      environment + live emulator, the app suite needs `jest-expo`/RN.
      Hence `jest.rules.config.js` (ts-jest + node) and
      `testPathIgnorePatterns: ['<rootDir>/firestore-tests/']` on the main
      config, so `npm test` stays fast and emulator-free.
      New devDeps: `@firebase/rules-unit-testing`, `ts-jest`.
      10 tests retroactively verify task 12's `users` rules actually
      *behave* (they were previously only syntax-checked): signed-out
      denied, cannot write another uid's doc, client `Date.now()`
      rejected in favour of `serverTimestamp()`, extra fields refused,
      empty `displayName` refused, cannot read another user, `list`
      denied, `createdAt` immutable, `delete` denied.
      Note: `PERMISSION_DENIED ... false for 'delete' @ L39` warnings in
      the output are **expected** — the SDK logging denials that
      `assertFails` provokes. They name the exact failing rule line,
      which is genuinely useful when debugging.
- [x] 16. Done on `feat/family-circle`, 4 commits: `2e9ba74` (rules),
      `8461305` (atomicity fix), `6affb17` (lifecycle tests), `b90f22a`
      (join + invite-code tests). **38 rules tests pass** (10 users,
      28 circles) via `npm run test:rules`.
      **Design:** membership is the `members` subcollection; `memberIds`
      on the circle is a convenience field the rules *never* trust for
      authorization, so tampering with it grants nothing. (A joiner can
      legitimately create a member doc without updating `memberIds`, so
      it can drift — task 21's member list must read the subcollection.)
      **`getAfter()`, not `get()`**, for anything referencing a document
      written in the same commit: rules evaluate each write against
      *pre-transaction* state, so the owner's member doc cannot `get()`
      the circle being created beside it.
      **`exists()` guards the invite-code `get()`** — a `get()` on a
      missing doc raises an evaluation error rather than returning false.
      Same security outcome, far worse to debug from a client that only
      sees `permission-denied`.
      The join is two mutually-constraining writes: the member doc needs
      an `inviteCodeUsed` resolving to *this* circle, and the `memberIds`
      update separately requires a member doc for that uid in the same
      commit. Neither half is exploitable alone.
      `8461305` came from a test: the rules originally allowed creating a
      circle with no member doc — not a security hole (nobody could read
      it) but it permitted orphaned circles, so creation now requires the
      owner's member doc via `getAfter()`.
- [x] 17. Done. `838d4e5` (service), `4067d0d` (11 tests).
      **`runTransaction` for create, not `writeBatch`** — a batch cannot
      read, and the code must be checked for existence before committing.
      The transaction throws a sentinel on collision, caught and turned
      into `false`, which is exactly the signal
      `generateUniqueInviteCode` expects — so retry works without the
      loop knowing anything about Firestore. Critically, *only* a genuine
      collision retries: treating any `permission-denied` as a collision
      would burn all 5 attempts and misreport a rules bug as
      `code-generation-failed`. There is a test for exactly that.
      `writeBatch` for join (no reads needed after the code lookup).
      Typed `FamilyCircleError` (`invalid-name`, `invalid-code`,
      `code-not-found`, `code-generation-failed`) so screens can map
      failures like the auth screens map Firebase codes.
      **Two testing gotchas hit here:** (1) mocking a module's *export*
      does not intercept calls made *inside* that module —
      `generateUniqueInviteCode` calls `generateInviteCode` internally,
      so the mock never fired. Fixed by mocking `expo-crypto`'s
      `getRandomBytes` instead, which also exercises the real chain.
      (2) `doc(collection(db, 'x'))` (auto-ID form) takes a single
      argument, so a `doc` mock building paths from `args.slice(1)`
      silently produces an empty path.
      *Known gap:* neither function writes `users/{uid}.familyCircleId` —
      now tracked as a blocker on task 20.
> **⚠ Reordered 2026-08-12 to avoid colliding with the capture-screen
> workstream.** `RootTabNavigator.tsx` and `src/screens/capture/` are
> Osama's while `feat/capture-screen` is open. Original order was
> 18, 19, 20, 21; 20 is now last because it is *behaviourally*
> disruptive, not just a merge risk — see the note on it below.

- [x] 18. Add "Create Family Circle" screen. `7d2d16b` (screen),
      `f25a964` (3 tests). Two states in one screen: name form, then the
      invite code in a card once the circle exists — a user who creates a
      circle and cannot find the code to share has gained nothing.
      Takes `user` as a **prop**, not via `useAuth()`, so task 20 can
      wire it up however routing lands.
      The code has a spelled-out `accessibilityLabel` (`K 7 M 2 P 9 X R`)
      — a screen reader reads the raw string as a mangled word, and this
      code has to be dictatable over the phone.
      Only 3 tests, per the reduced-testing direction: unnamed circle
      blocked before any Firestore call, code shown on success, failure
      surfaced as a message. Skipped per-error-code tests (those re-test
      `familyCircles.ts`) and styling/disabled-state assertions.
      **Jest gotcha:** a `jest.mock()` factory is hoisted above imports,
      so it may not reference out-of-scope variables — and TypeScript's
      `constructor(readonly code: string)` parameter-property shorthand
      compiles into a form the plugin reads as exactly that. Use an
      explicit field + plain constructor assignment inside mock
      factories.
- [x] 19. Add "Join Family Circle" screen. 3 commits: `4e78f38`
      (service fix), `db74ad1` (screen), `7a1ff9b` (3 tests).
      `maxLength` is `INVITE_CODE_LENGTH + 2`, not 8 — `normalizeInviteCode`
      accepts hyphens/spaces, so a pasted `K7M2-P9XR` must not be
      truncated before normalising. The screen passes the code
      **unnormalised**; normalisation lives in the service so there is
      one source of truth.
      **`4e78f38` also closed the task 20 blocker.** Both create and join
      now write `users/{uid}.familyCircleId` (inside the transaction /
      batch, so it is atomic), and a new `already-in-circle` code is
      raised by reading the user's own doc first.
      *Why that check, and not "is there already a member doc?"* — the
      rules only permit reading a member doc if you are **already** a
      member, so for a non-member that read fails with
      `permission-denied` rather than returning "not found". Detecting it
      that way would mean using a permission error as control flow, and
      would misfire on a network failure. The user's own doc is always
      readable by them, so it is the clean signal.
      *Semantics worth revisiting if the product changes:* the schema
      gives each user a **single** `familyCircleId`, so the check is "in
      any circle?", not "in this circle?". Belonging to several circles
      would need a schema change, not just a rule tweak.
- [x] 21. Done. 4 commits: `eab8c1b` (services), `0888a09` (screen),
      `7aec7cf` (navigation), `66abebd` (3 tests).
      Reads membership from the `members` subcollection via
      `listFamilyCircleMembers`, **not** `memberIds` — task 16's tests
      proved that array can legitimately drift. The screen test asserts
      the service is called with the resolved circle ID, so a later
      "optimisation" to read the array fails the suite.
      New `getFamilyCircleId(uid)` in `users.ts` — the members screen
      needs a circle ID before it can read the subcollection, and the
      user's own doc is where it lives (`familyCircleId`, written by
      both create and join since `4e78f38`). `familyCircles` denies
      `list`, so there is no query that could find it instead.
      **Reached without touching `RootTabNavigator.tsx`:**
      `FamilyPulseScreen` keeps its exported name and path but is now a
      nested `native-stack` (home → members). Home stays
      `headerShown: false` so it doesn't double up on
      `PlaceholderScreen`'s own title; the members screen sets
      `headerShown: true` for a title and back button. `uid` is passed
      through `Stack.Screen`'s **children callback** — a screen
      registered with `component` cannot take extra props, and a
      `User` object in `initialParams` would trip React Navigation's
      non-serializable warning.
      **`FlatList`, not `FlashList`** (the convention for the Timeline
      feed and photo grids): a family circle is a bounded, single-digit
      list, and `@shopify/flash-list` is not a dependency — adding a
      native module would mean SDK-54 verification for no scroll gain.
      Four states as a discriminated union
      (`loading`/`error`/`no-circle`/`ready`) so they cannot contradict
      each other; retry is an `attempt` counter re-running the same
      effect, keeping one code path and one cancellation guard.
      Skipped tests for the spinner, the owner badge, and the joined
      date — the date is `toLocaleDateString()`, so asserting on it
      would fail on a machine with different locale settings.
- [x] 20. Done, 2026-08-13. 4 commits: `b58e0d3` (continue step),
      `833789d` (onboarding container), `6a80307` (the routing gate),
      `0a72057` (3 tests). Users with no Family Circle go to
      create/join, everyone else straight to Capture (ADR-007).
      Started on the owner's explicit go-ahead, with
      `feat/capture-screen` already merged into `main` (`8abf406` is an
      ancestor of `119a4ad`). Reached **without touching
      `RootTabNavigator.tsx` or `src/screens/capture/`** — the whole gate
      sits above them in `App.tsx`.
      **The create screen needed a `Continue` step first.** `onCreated`
      fires the moment `createFamilyCircle` resolves, so routing on it
      would swap in Capture while the invite-code card rendered for a
      single frame. `onCreated` keeps its meaning; a new optional
      `onContinue` carries the id once the code has actually been read.
      Both props are optional, so task 18/19's tests were unaffected.
      **A failed membership read must not fall through to onboarding** —
      an existing member routed into "create" would then be refused with
      `already-in-circle`, a dead end. The error state shows a retry
      instead. This is the one behaviour worth protecting; the test for
      it was mutation-checked (disabling the error branch fails that test
      and only that test).
      **Two races checked, both benign:** `useEnsureUserDocument` may
      still be writing when the membership read fires, but
      `getFamilyCircleId` returns `null` for a missing doc rather than
      throwing, so a new account lands in onboarding — where it belongs;
      and `ensureUserDocument` early-returns when the doc exists, so it
      cannot clobber `familyCircleId` after create/join wrote it.
      **Jest gotchas for any future `App.tsx`-level test:**
      `GestureHandlerRootView` needs
      `require('react-native-gesture-handler/jestSetup')`, and
      `SafeAreaProvider` renders *nothing* until it measures insets, so
      the whole tree comes back empty — it needs
      `react-native-safe-area-context/jest/mock`, **with `.default`**, or
      every element resolves to `undefined`. Both went into
      `jest.setup.js`. `AuthNavigator` and `familyCircles` are mocked in
      the test because they pull in untransformed Firebase ESM.
      **Revised 2026-08-13 after the owner used the app (`d3b9c91`) — a
      forced circle was too aggressive.** Both onboarding screens now
      offer **"Skip for now"**, persisted per-uid in AsyncStorage by
      `useCircleOnboardingSkip`, and **Family Pulse offers "Create or
      join a circle"** so skipping is not a dead end. The four routing
      states above still hold; "has a circle" simply became "has a circle
      **or has skipped**". Reuse of the onboarding screen from Family
      Pulse omits `onSkip`, so the skip button correctly does not appear
      when you navigate there deliberately.
      *Known gap, not in scope here:* the invite code is only ever shown
      at creation. After `Continue` there is no way back to it — the
      members screen lists members but not the code. `InviteCodeCard`
      (`b5cde12`) is ready to drop into Family Pulse for this.

**Stage F — Hardening**
- [x] 22. Done, 2026-08-13. 5 commits: `edd2d71` (service), `cbca168`
      (rules + test), `a988d7f` (display-name refresh), `c7c3863`
      (form), `bda4765` (Family Pulse entry).
      `linkWithCredential` keeps the **same uid**, which is the whole
      point — circle membership and everything keyed to the user
      survives the upgrade.
      **The stale name needed a rules change.** A guest's user doc and
      their denormalized member doc both said "Guest", and member docs
      were `allow update: if false`, so the name could never be
      corrected. Members may now rename **themselves only**, via
      `affectedKeys().hasOnly(['displayName'])` — that clause is what
      blocks escalating `role` in the same write.
      **The rename is best-effort** (`.catch(() => undefined)`). Once
      linking resolves the account is real; failing the whole upgrade
      over a cosmetic write would invite a retry that cannot succeed,
      because re-linking an already-linked credential throws.
      **`linkWithCredential` does not reliably fire
      `onAuthStateChanged`** (the uid never changes), so
      `user.isAnonymous` can stay true in React's eyes. Family Pulse
      tracks the upgrade in local state so the button disappears at once.
      *Untested against real Firebase* — only Jest. Linking is exactly
      where the emulator and production diverge (`requires-recent-login`).
- [x] 23. Done, 2026-08-13. `88514ab`, deployed. Score **4/5** — no data
      leak or privilege-escalation path found. Authority lives in the
      `members` subcollection, `role` is never self-assignable, `ownerId`
      is immutable, `list` is denied everywhere, catch-all deny closes
      the rest.
      **One real vulnerability, confirmed exploitable before fixing.**
      `isJoin()` let an already-joined member replay the append —
      `memberIds == resource.memberIds.concat([uid])` is satisfied every
      time — growing a **shared** document without limit toward the 1MiB
      cap, which would break joins and renames for everyone. A rules test
      written first *failed* against the deployed rules, proving it was
      real. Fixed with `!(request.auth.uid in resource.data.memberIds)`
      plus `memberIds.size() <= 50`.
      Also capped previously unbounded strings: `inviteCode` ≤ 16,
      `photoUrl` ≤ 500, `familyCircleId` ≤ 128.
      **Three findings left open as product decisions:**
      (a) **invite codes cannot be revoked or rotated** — `update` and
      `delete` are `false` and the circle's `inviteCode` is pinned, so a
      leaked code grants permanent join access. Worth scheduling;
      (b) an owner can delete their own member doc, losing read access to
      a circle that can never be deleted, and no one can remove anyone
      else; (c) the one-circle-per-user invariant is client-side only.
      *Caveat:* the size caps apply to **existing** docs too, since
      `isValidCircle` runs on every update. Any live doc already over a
      cap would start failing its updates.
- [x] 24. Done, 2026-08-13. `4f507d5`. Mostly already satisfied — every
      screen had a submitting flag and an `accessibilityRole="alert"`
      banner, and the members screen, Family Pulse and the launch gate
      had loading/error/retry.
      **The one real gap was a silent failure:** `useEnsureUserDocument`
      computed a `failed` flag that was tested but never read, so a
      failed `users/{uid}` write surfaced nothing — and cascaded, because
      the membership read then finds no doc, returns `null` rather than
      an error, and routes the user to onboarding as if they simply had
      no circle. It now shows a retry, checked *before* the membership
      states. The hook gained a `retry` (same `attempt`-counter pattern
      as `useFamilyCircleMembership`); there was no way to recover
      before, since the effect only re-ran when `user` changed.
      `RetryNotice` extracted — this error and the membership error
      render identically.

**Sizing note:** #7, #18 and #19 are the most likely to exceed ~150 lines.
If they do, split form UI from the Firestore wiring rather than letting
the commit grow.

**Exit criteria:** A user can create an account (or continue as a guest),
create or join a Family Circle, and lands straight on the Capture screen
afterward. Signing out and back in restores the same state. Data persists
in Firestore and survives an app restart — including the signed-in session
itself (ADR-017).

---

## Phase 2 — Capture-First Experience

**Goal:** The app opens directly to a camera viewfinder, Snapchat-style,
supporting photo, video, and voice capture, with a lightweight destination
picker.

**Tasks (≈1 commit each):**
- [x] Integrate `expo-camera`: live viewfinder as the default screen —
      completed early during Phase 0
- [ ] Tap-to-capture photo
- [ ] Press-and-hold-to-record video (with a visible recording indicator)
- [ ] Toggle/mode switch for voice-only recording (mic waveform UI)
- [ ] Camera flip (front/back) and flash toggle controls
- [ ] "My Space" default personal folder: Firestore concept + fallback
      destination (see `Database_Schema.md`, ADR-009)
- [ ] Save-destination dropdown, bottom-left, collapsed by default,
      showing "My Space" (My Space only at this stage — listing Memory
      Groups moves to Phase 3, see ADR-018)
- [ ] Firebase Storage upload for photo/video/voice assets *(moved here
      from Phase 3 — capture cannot be saved end-to-end without it)*
- [ ] Firestore `memories` document created on upload *(moved here from
      Phase 3, same reason)*
- [ ] Wire capture actions (photo/video/voice) to save into My Space on
      confirm
- [ ] Post-capture preview screen (review before save, retake option)
- [ ] Visibility handling: items saved to "My Space" are private to the
      capturer by default

**Exit criteria:** From a cold launch, a signed-in user reaches a live
camera within ~1 second, can capture a photo, a video, or a voice note, and
save it to "My Space" — uploaded to Storage with a matching `memories`
document — without ever seeing a dashboard first. Saving directly into a
Memory Group is Phase 3.

---

## Phase 3 — Memory Groups Core

**Goal:** Family members can create a shared Memory Group and add photos
or videos to it, live, from multiple members — including directly from the
Capture screen's destination dropdown.

**Tasks (≈1 commit each):**
- [x] Firestore `memoryGroups` collection + schema (see `Database_Schema.md`) - `1870521`
- [x] "Create Memory Group" screen (title, start date, end date, member picker) - `abd8ee3`
- [x] Firestore write for new Memory Group - `4ebeea5`
- [x] Memory Group list screen (all groups for the Family Circle) - `e6522cc`
- [x] Memory Group detail screen (empty state) - `13b26ec`
- [ ] Capture-screen dropdown expands to list the user's active Memory
      Groups as alternate save destinations *(deferred to teammate's branch to prevent merge conflicts)*
- [ ] Confirm Capture-screen dropdown correctly targets a chosen Memory
      Group instead of My Space, writing `visibility: "shared"`
- [x] Real-time listener so new memories appear live for other members - `a0f306e`
- [x] Security rules for `memoryGroups` and `memories` (shared vs. private
      visibility — see `Database_Schema.md`) - `17c4ee6`
- [x] Re-run the `firebase-security-rules-auditor` skill against these
      rules before deploy — this is the collection where a private/shared
      visibility bug would actually leak family data - `17c4ee6`
- [x] "Move to Memory Group" action from My Space (promote a private
      memory to a shared group after the fact) - `PENDING`

**Exit criteria:** Two test accounts in the same Family Circle can both add
photos/videos to the same Memory Group — either from the dropdown at
capture time or afterward from My Space — and see each other's uploads
without refreshing.

---

## Phase 4 — Bulk Upload & Auto-Categorization

**Goal:** Users can bulk-select existing photos and have them automatically
sorted into the correct Memory Group by date, falling back to My Space.

**Tasks (≈1 commit each):**
- [ ] Integrate `expo-image-picker` multi-select
- [ ] Integrate `expo-media-library` to read each photo's creation date
- [ ] Write the date-range matching function (pure, unit-testable)
- [ ] Unit tests for the matching function (single match, no match, overlap)
- [ ] "My Space" fallback handling for unmatched photos (replaces the old
      "Uncategorized" concept — see ADR-009)
- [ ] Overlap-resolution prompt UI (user picks the correct group)
- [ ] Manual categorization toggle UI
- [ ] Manual drag/assign-to-group interaction
- [ ] Batched Firebase Storage upload with progress bar
- [ ] Upload retry logic for failed items in a batch

**Exit criteria:** Uploading 20+ mixed-date photos correctly sorts them into
the right groups (or My Space/prompt), with a visible progress indicator
and no crash if the network drops mid-upload.

---

## Phase 5 — Voice Memories & AI Story Generation

**Goal:** Voice notes are transcribed and turned into a short AI-generated
story attached to the memory. (Scoped to voice notes only — see the note
in `Feature_Spec.md` on why video isn't run through this pipeline in MVP.)

> Transcription runs in the Cloud Function via Gemini's audio input, **not
> on-device** — see ADR-020, which supersedes ADR-005. On-device STT is not
> available in Expo Go, and this approach also handles Arabic/English
> code-switching better for the target users.

**Tasks (≈1 commit each):**
- [ ] Voice playback UI on saved voice memories
- [ ] Firestore schema fields for voice memories (see `Database_Schema.md`)
- [ ] Cloud Function: `generateMemoryStory` (callable) skeleton
- [ ] Cloud Function: read the uploaded audio from Storage and pass it to
      Gemini as inline data
- [ ] Cloud Function: prompt template returning both transcript and story
- [ ] Cloud Function: write `transcript`, `aiStory`, `aiStatus` server-side
      (client is never permitted to write these — see ADR-004/ADR-012)
- [ ] Client: call the Cloud Function after upload, show loading state
- [ ] Client: display generated story with the memory
- [ ] Offline handling: capture and save succeed offline; audio queues and
      is processed on reconnect, writing `aiStatus: "offline_fallback"`
      until then
- [ ] Per-user daily call soft-limit in the function (`API_SPEC.md` §5)
- [ ] Manual edit option for the generated story
- [ ] Error handling + user-facing error states

**Exit criteria:** Recording a voice note produces an AI-generated short
story with its transcript. Recording while offline still saves the memory
and does not crash; the story appears once connectivity returns.

---

## Phase 6 — Memory Slideshows

**Goal:** Any Memory Group can be played back as an auto-generated
slideshow, similar to the iPhone Photos "Memories" feature.

**Tasks (≈1 commit each):**
- [ ] "Play Slideshow" entry point on a Memory Group detail screen
- [ ] Slideshow player component: sequences a group's photos (and video
      thumbnails/clips) full-screen, timed auto-advance
- [ ] Crossfade transition between items (see `UI_Design_System.md` §7)
- [ ] Manual controls: pause, skip forward/back, exit
- [ ] Include short video clips inline in the sequence (trimmed to a few
      seconds, or full playback — decide and record in `Decisions.md`)
- [ ] Ordering logic: chronological by `takenAt`, with manual reorder
      override
- [ ] Basic settings: include/exclude specific memories from the slideshow
- [ ] (Should) background music track selection, if time allows

**Exit criteria:** Opening any Memory Group with at least a few memories
and tapping "Play Slideshow" produces a smooth, full-screen, auto-advancing
playback — generated on-device at play time (see ADR-010 in
`Decisions.md`), no server-side video rendering required.

---

## Phase 7 — Timeline, Family Pulse & AI Nudge

**Goal:** All memories are viewable in one place, and the app proactively
encourages connection.

**Tasks (≈1 commit each):**
- [ ] Timeline screen: chronological feed across all Memory Groups + My Space
- [ ] Timeline: group photos/videos visually by Memory Group
- [ ] Mood check-in UI (😊 😐 😢) per member
- [ ] Firestore `moodCheckins` collection + write
- [ ] Nudge logic: "last contact" calculation per family member
- [ ] Nudge UI: suggestion card, reachable from the Capture screen's
      navigation (see `Architecture.md` for the swipe/tab structure)
- [ ] Scheduled Cloud Function to trigger nudges
- [ ] ~~Push notification setup (Firebase Cloud Messaging)~~ — **blocked in
      Expo Go on SDK 54** (see ADR-019). Remote push requires a development
      build. `Should`-priority only (Feature_Spec §6.3 / FR-27), so the
      nudge ships as an in-app card. Local notifications still work in
      Expo Go if a lighter-weight substitute is wanted.

**Exit criteria:** Timeline reflects all uploaded memories correctly; a mood
check-in triggers a visible, explainable nudge suggestion within the demo
timeframe (don't require a real multi-week gap to demo it — add a debug
override).

---

## Phase 8 — Polish, Accessibility, Offline Resilience

**Goal:** The app feels finished and doesn't break under real conditions.

**Tasks (≈1 commit each):**
- [ ] Empty states for every screen (no groups, no memories, no members)
- [ ] Loading skeletons/spinners for all async screens
- [ ] Error boundaries + user-facing error messages
- [ ] Offline detection banner
- [ ] Local caching for last-viewed timeline data
- [ ] Accessibility pass (labels, contrast, touch target sizes)
- [ ] Thumb-zone review on real device, including the capture button and
      destination dropdown placement (see `UI_Design_System.md`)
- [ ] App icon + splash screen (splash should be near-instant — the app's
      identity is "opens straight to camera")
- [ ] Performance pass: image/video compression before upload
- [ ] Cold-launch-to-camera-ready time check (target: under ~1 second)

**Exit criteria:** App survives airplane-mode testing without crashing,
every screen has a sensible empty/loading/error state, and cold launch to a
usable camera is fast.

---

## Phase 9 — Hardening & Submission Packaging

**Goal:** Everything required for submission is ready.

**Tasks (≈1 commit each):**
- [ ] Full regression pass on two physical devices
- [ ] Fix any bugs found during regression
- [ ] Finalize README with setup + run instructions
- [ ] Record 2–3 minute demo video (make sure it shows the capture-first
      launch and a slideshow playback — both are strong visual moments)
- [ ] Write the 2-page app description document
- [ ] Tag `v1.0.0` release on GitHub
- [ ] Final commit history review (squash only local WIP noise, never
      rewrite already-pushed shared history)

**Exit criteria:** Submission package (video + doc + GitHub link) is ready
before the deadline, with time to spare.

---

## Phase 10 — Demo Day Readiness

**Goal:** The team can present and answer Q&A confidently.

**Tasks:**
- [ ] Rehearse full live demo end-to-end, on a real device, at least 3 times
- [ ] Each member rehearses explaining a part of the code they didn't write
- [ ] Prepare answers to the question list in the SRS/handoff docs
- [ ] Charge devices, prepare backup device, test venue Wi-Fi/offline mode

**Exit criteria:** Every team member can explain any feature and any
commit in the repo, cold.

---

## Future Phase (Post-Competition, Not in Scope for SMAC 2026)

**Goal:** Home screen widgets showcasing Memory Group slideshows/highlights.

This is deliberately **excluded from the competition timeline**. Both iOS
(WidgetKit) and Android (App Widgets) require native platform code that
isn't available in Expo's plain managed workflow or Expo Go — building this
means introducing a native dev-client build (via a config plugin) or
ejecting to the bare workflow, which is a meaningfully different
engineering effort from everything else in this plan. See `Architecture.md`
§6 for detail. Do not start this before Phase 9 is done and submitted —
treat it as its own future project phase, not a Phase 6 add-on.
