# Release Notes — v0.1.0 (Internal Testing)

## What's New
Initial internal testing build for Android — ArtistCRM mobile app (Expo SDK 55, React Native 0.84.1).

## Features

| ID | Feature | Status |
|----|---------|--------|
| M1 | App launch and navigation | ✅ |
| M2 | Authentication (phone/password) | ✅ |
| M3 | Tasks screen (overdue/today/tomorrow) | ✅ |
| M4 | Push notification registration | ✅ |
| M5 | Events screen (stub) | 🚧 |
| M6 | Finance screen (stub) | 🚧 |
| M7 | Profile screen (stub) | 🚧 |
| M8 | Beta release | 🚧 (this task) |

## Known Issues
- Events, Finance, and Profile screens are stubs — no real data yet
- Push notifications require a physical device (won't work on emulators)
- API server must be accessible from the device (configure EXPO_PUBLIC_API_BASE_URL)

## Testing Instructions
1. Install the AAB on your Android device
2. Launch the app
3. Log in with your phone number and password
4. Verify the tasks screen loads and displays tasks from the API
5. Test pull-to-refresh on the tasks screen
6. Verify push notification registration (check for token in logs)
7. Report any crashes or unexpected behavior

## Build Info
- Expo SDK: 55
- React Native: 0.84.1
- Package: ru.escalion.artistcrm
- Version: 0.1.0 (versionCode: 1)
- Build Type: App Bundle (AAB)
- Track: Internal Testing
- CI/CD: GitHub Actions + EAS Build
