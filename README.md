# Esnadat Employee Mobile (Expo)

Native React Native app for Esnadat Employee Portal employees.

## Stack

- Expo + React Native + TypeScript
- React Navigation
- Axios API layer
- Expo Location
- i18n (`en` + `ar`)

## Features

- OTP login (`companyCode` + `email`)
- Session persistence (token + cookie-friendly requests)
- Home dashboard navigation
- Attendance check-in/check-out with GPS
- Create employee requests (leave/permission)
- List my requests with status (pending/approved/rejected)

## API Base URL

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Then ensure:

```env
EXPO_PUBLIC_API_BASE_URL=https://portal.esnadat.sa
```

## Run

```bash
npm install
npx expo start
```

## Project Structure

```text
src/
  components/
  config/
  context/
  i18n/
  navigation/
  screens/
  services/
  theme/
  types/
```

## Notes

- Uses existing backend API endpoints only.
- No WebView usage.
- No backend contract changes included.
- If your auth/request endpoint paths differ, update only `src/services/authService.ts` and `src/services/requestService.ts`.
