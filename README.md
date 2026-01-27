# Petal — Music + Social (mobile-first)

Petal is a cross-platform music-focused social app: an Expo (React Native + TypeScript) frontend paired with a .NET Web API backend. The app provides feeds, user profiles, playlists, playback controls, Spotify sync hooks, and lightweight social features (posts, follows, listening history).

**Repository layout**

- **app/**: Expo app (file-based routing, TypeScript + React Native UI, components under `components/` and `ui/`).
- **api/petalAPI/**: ASP.NET Web API project (controllers, models, EF Core DbContext).
- **services/** and **scripts/**: client-side service wrappers and helper scripts.

**Quick start (local development)**

Prerequisites:

- Node.js & npm
- Expo tooling (no global install required; `npx expo` is used)
- .NET SDK (recommended 7+ for the API)
- Optional: Xcode (macOS) / Android Studio for simulators

1. Install JavaScript dependencies (root):

```bash
npm install
```

2. Start the backend API (from project root):

Option A — use the included npm script (recommended):

```bash
npm run api
```

Option B — run the .NET project directly:

```bash
cd api/petalAPI
dotnet run
```

By default the API reads settings from `api/petalAPI/appsettings.Development.json` / `appsettings.json`. Update the connection string or other settings there as needed.

3. Start the Expo app (from project root):

```bash
npm run start
# or
npx expo start
```

Follow the Metro/Expo output to open in Simulator, emulator, a connected device, or a development build.

**Development notes & tips**

- App code lives in `app/` using Expo's file-based router. Edit pages under that folder to add screens or routes.
- Reusable UI components are under `components/` and `ui/`.
- Client API wrappers are in `services/` (e.g., `profileApi.ts`, `playbackApi.ts`).
- The backend has controllers under `api/petalAPI/Controllers/` and EF models under `api/petalAPI/Models/`.
- There are convenience npm scripts in `package.json` (see `npm run` output). `npm run reset-project` restores starter scaffolding.

**Common workflows**

- Add a new screen: create a file in `app/` (uses file-based routing).
- Add a backend endpoint: edit/ add a controller in `api/petalAPI/Controllers/` and update `AppDbContext` if you add models.
- Test playback flows locally by running the API and the Expo app concurrently.

**Troubleshooting**

- If the Expo client cannot reach the API, ensure the API is bound to a reachable host/port and that the app's API base URL points to it (check `services/api.ts` or environment config).
- For iOS simulator issues, ensure Xcode command-line tools are installed and the simulator is available.

**Contributing**
Open a PR with focused changes — prefer small, testable commits. If you add backend migrations, include the migration files and instructions to apply them.

**License & contact**
This repo does not contain a license file. Add one (e.g., MIT) if you want it open-source. For questions, open an issue or contact the maintainer.

**Development (local environment)**
Use the `.env.example` files in the repository as a starting point for local configuration. Place a `.env` file in the same directory as the example to override values locally.

- Root `.env` (see `.env.example` at repository root):
  - `API_URL` — base URL the Expo app should contact for API requests (e.g. `http://localhost:5000`).
  - `EXPO_DEV_CLIENT` — set to `true` when using a development client build.
  - `NODE_ENV` — `development` or `production`.

- API `.env` (see `api/petalAPI/.env.example`):
  - `ASPNETCORE_ENVIRONMENT` — `Development` for local work.
  - `ConnectionStrings__DefaultConnection` — database connection string used by EF Core.
  - `JWT__Issuer` / `JWT__Key` — secrets used by backend auth (replace with secure values).

Example workflow:

1. Copy `.env.example` to `.env` in the repo root and update `API_URL`.
2. (Optional) Copy `api/petalAPI/.env.example` to `api/petalAPI/.env` and update DB/secret values.
3. Start the API and the Expo app concurrently:

```bash
# from repo root
npm run api
npm run start
```

If the app cannot reach the API on device/simulator, replace `localhost` with your machine IP address (e.g., `192.168.1.10`) and ensure firewall/ports allow the connection.
