# STEMNet Mobile

This is the independent Expo/Expo Router mobile application. `frontend-web` and
the backend are intentionally not imported or modified.

## Local development

1. Copy `.env.example` to `.env.development` and set `EXPO_PUBLIC_API_URL`.
2. Install dependencies with `npm install`.
3. Start Expo with `npm start`.
4. Use `npm run android`, `npm run ios`, or Expo Go during development.

The mobile API client uses the same `/api/*` endpoints as the web app and keeps
the Flask session cookie in AsyncStorage for native requests. Registration,
search, and the remaining web routes are scaffolded for incremental migration;
the authenticated feed, profile, settings, and login flows are wired first.

## EAS deployment

Replace `REPLACE_WITH_EAS_PROJECT_ID` in `app.json`, then run:

```bash
npx eas login
npx eas init
npx eas build:configure
npx eas build --platform all --profile production
npx eas submit --platform all --profile production
```
