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

### 3. EXPO_PUBLIC_API_BASE_URL

The mobile app needs to know the API endpoint at build time.

1. Determine your production API URL (e.g., `https://artistcrm.com/api`)
2. Go to GitHub repo → Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `EXPO_PUBLIC_API_BASE_URL`
5. Value: your API base URL (e.g., `https://artistcrm.com/api`)

**Important**: This URL must be accessible from the mobile device. Ensure your API server is deployed and the domain resolves correctly.

## After Secrets Are Set

Push to main branch to trigger the build:

```bash
git add .
git commit -m "trigger: Android Internal Testing build"
git push origin main
```

Or manually dispatch from GitHub Actions tab.

## EAS Project

- Project ID: 7676a13a-3d4a-4da0-ad23-5b4df7b3bb38
- Build profile: `internal` (AAB for Play Store)
- Submit profile: `internal` (Internal Testing track)

## Google Play Console Setup (First Time)

Before the first upload, you must:

1. Create the app in Google Play Console with package `ru.escalion.artistcrm`
2. Complete the store listing (name, description, screenshots, icon)
3. Complete the content rating questionnaire
4. Fill out the Data Safety section
5. Add a privacy policy URL
6. Create the Internal Testing track
7. Add internal testers (their email addresses)

**Note**: The first AAB upload may need to be done manually via Play Console. After that, automated uploads via the workflow will work.
