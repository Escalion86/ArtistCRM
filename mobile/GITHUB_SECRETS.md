# GitHub Secrets Setup — ArtistCRM Mobile

## Required Secrets

### 1. EXPO_TOKEN

1. Go to https://expo.dev/settings/access-tokens
2. Click "Create Token"
3. Name: `GitHub Actions EAS Build`
4. Copy the token
5. Go to GitHub repo → Settings → Secrets and variables → Actions
6. Click "New repository secret"
7. Name: `EXPO_TOKEN`
8. Value: paste the Expo token

### 2. GOOGLE_PLAY_SERVICE_ACCOUNT_JSON

1. Go to Google Play Console → Settings → API access
2. Click "Create new service account"
3. Follow the link to Google Cloud Console
4. Create a service account with "Service Account User" role
5. Create a JSON key
6. Back in Play Console, grant "Release Manager" role to the service account
7. Copy the entire JSON key content
8. Go to GitHub repo → Settings → Secrets and variables → Actions
9. Click "New repository secret"
10. Name: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
11. Value: paste the entire JSON key

## After Secrets Are Set

Push to main branch to trigger the build:

```bash
git add .
git commit -m "trigger: Android Internal Testing build"
git push origin main
```

Or manually dispatch from GitHub Actions tab.

## EAS Project

- Project ID: (to be configured after `eas project:init`)
- Build profile: `internal` (AAB for Play Store)
- Submit profile: `internal` (Internal Testing track)
