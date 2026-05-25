# Release Notes — v0.1.0 (Android Beta)

## What's New
Initial Android beta build for ArtistCRM mobile app (Expo SDK 55, React Native 0.84.1).

## Features

| ID | Feature | Status |
|----|---------|--------|
| M1-T1 | Mobile app architecture (auth, API layer, navigation) | Done |
| M1-T2 | Authentication (phone/password) | Done |
| M1-T3 | Tasks screen (overdue/today/tomorrow) | Done |
| M1-T4 | Push notification registration | Done |
| M1-T5 | Events screen (upcoming events list) | Done |
| M1-T6 | Home Screen widgets | Not implemented yet |
| M1-T7 | Call intents | Not implemented yet |
| M1-T8 | Beta release (this build) | Done |

## Known Issues
- Finance screen is a stub — no real data yet
- Events screen shows list but no detail view yet
- Push notifications require a physical device (won't work on emulators)
- API server must be accessible from the device (configure EXPO_PUBLIC_API_BASE_URL)
- Some features require the web CRM to create data first (events, tasks)
- Deep links from notifications not yet implemented (M1-T5 future)
- Home screen widgets not yet implemented (M1-T6)
- Call intents not yet implemented (M1-T7)

## Testing Instructions
1. Install the AAB on your Android device
2. Launch the app
3. Log in with your phone number and password
4. Verify the tasks screen loads and displays tasks from the API
5. Test pull-to-refresh on the tasks screen
6. Check the Events tab for upcoming events
7. Verify push notification permission prompt appears
8. Test logout from Profile screen
9. Report any crashes or unexpected behavior

## Build Info
- Expo SDK: 55
- React Native: 0.84.1
- Android Package: ru.escalion.artistcrm
- Version: 0.1.0 (build 1)
- Build Type: App Bundle (AAB)
- Track: Internal Testing
- CI/CD: GitHub Actions + EAS Build
