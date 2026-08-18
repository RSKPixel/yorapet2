# YoraPet Mobile

Expo (React Native) companion app for login and reports.

## Prerequisites

- Node.js 20+
- Backend running on port **8000** (`make dev-backend`)
- **Expo Go** (SDK **54**) — phone or Android emulator

## Android emulator (local)

Already installed on this machine via Homebrew:

- SDK: `/opt/homebrew/share/android-commandlinetools`
- AVD: `YoraPet_Pixel_API35` (Pixel 6 / Android 15)

### One-time shell PATH (optional)

Add to `~/.zshrc`, or in each terminal run:

```bash
source mobile/scripts/android-env.sh
```

### Daily workflow

```bash
# Terminal 1 — API
make dev-backend

# Terminal 2 — start the emulator window
make emu-android-boot

# Terminal 3 — Expo → installs/opens in the emulator
make dev-mobile-android
```

`dev-mobile-android` copies `.env.emulator` (API `http://10.0.2.2:8000/api/v1`) over `.env`.

## Physical phone

```bash
cd mobile
# Use your Mac LAN IP for the API, e.g. http://192.168.0.6:8000/api/v1
cp .env.example .env
REACT_NATIVE_PACKAGER_HOSTNAME=$(ipconfig getifaddr en0) npm start
```

Then open `exp://<lan-ip>:8081` in Expo Go.

### API base URL

| Environment | `EXPO_PUBLIC_API_BASE_URL` |
|-------------|----------------------------|
| Android emulator | `http://10.0.2.2:8000/api/v1` |
| iOS Simulator | `http://127.0.0.1:8000/api/v1` |
| Physical device | `http://<your-lan-ip>:8000/api/v1` |

Login uses Bearer tokens (`delivery: "bearer"`). Tokens are stored in Expo SecureStore.

## Scripts

| Command | Description |
|---------|-------------|
| `make emu-android-boot` | Boot `YoraPet_Pixel_API35` |
| `make dev-mobile-android` | Expo + Android emulator |
| `npm start` | Expo (phone / LAN) |
| `npm run typecheck` | TypeScript check |
