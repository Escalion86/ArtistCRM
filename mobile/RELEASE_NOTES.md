# Release Notes — v0.1.0 (Beta)

## What's New
Initial beta build for iOS (TestFlight) and Android (Internal Testing) — ArtistCRM mobile app (Expo SDK 55, React Native 0.84.1).

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
- iOS: TestFlight build requires Apple Developer account credentials

## Testing Instructions

### iOS (TestFlight)
1. Accept the TestFlight invitation email
2. Install TestFlight from the App Store
3. Open TestFlight and install ArtistCRM
4. Launch the app and log in with your phone number and password
5. Verify the tasks screen loads and displays tasks from the API
6. Test pull-to-refresh on the tasks screen
7. Verify push notification permission prompt appears
8. Report any crashes or unexpected behavior via TestFlight feedback

### Android (Internal Testing)
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
- iOS Bundle ID: ru.escalion.artistcrm
- Android Package: ru.escalion.artistcrm
- Version: 0.1.0 (versionCode: 1)
- iOS Build: IPA (TestFlight)
- Android Build: App Bundle (AAB)
- CI/CD: GitHub Actions + EAS Build
