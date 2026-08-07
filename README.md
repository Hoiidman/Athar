# Athar (أثر)

Athar — "a trace, a mark left behind" — is a mobile app built around the
theme _"AI for a Stronger Family Bonds."_ The app opens straight into the
camera: capture a photo, video, or voice note the moment it happens, and
it's automatically saved to your private space or shared instantly with
your family. AI turns voice notes into short stories, sorts bulk photo
uploads into the right family trip or event, and gently nudges family
members to stay connected.

**Status:** Phase 0 (foundation & setup) in progress.

## Tech stack

- React Native (Expo, TypeScript)
- Firebase (Auth, Firestore, Cloud Storage, Cloud Functions, Cloud Messaging)
- Zustand for local/UI state
- React Navigation

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Firebase project's web
   app config values.
3. Start the Firebase Local Emulator Suite (requires a JRE — see setup
   notes shared with the team):
   ```bash
   firebase emulators:start
   ```
4. Start the app:
   ```bash
   npx expo start
   ```
5. Scan the QR code with Expo Go on a physical device.

## Project structure

- `src/screens` — app screens, one folder per feature area
- `src/components` — shared, reusable UI components
- `src/navigation` — navigation container and route types
- `src/services` — Firebase SDK setup and data-access wrappers
- `src/store` — Zustand stores for local/UI state
- `src/theme` — colors, spacing, and typography tokens
- `src/hooks` — shared React hooks
- `src/utils` — pure utility functions
- `src/types` — shared TypeScript types
- `functions` — Firebase Cloud Functions
