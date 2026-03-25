# Render Setup

This repo is set up to run on Render as:

- one Docker web service
- one managed Postgres database
- one public URL that serves both the frontend and the backend API

## 1. Push The Repo

Make sure your latest `staging` branch changes are pushed to GitHub.

## 2. Create The Render Services

In Render:

1. Click `New +`
2. Choose `Blueprint`
3. Connect this GitHub repo
4. Select the branch you want to deploy
5. Render will read [render.yaml](c:\dev\falloutofcivilization\render.yaml)

That blueprint creates:

- `falloutofcivilization` web service
- `falloutofcivilization-db` Postgres database

## 3. Check The Environment

The blueprint already sets the important runtime values:

- `DB_DRIVER=postgres`
- `POSTGRES_SSL=true`
- `COOKIE_SECURE=true`
- `TRUST_PROXY=true`
- `CLIENT_DIST_PATH=/app/client/dist`
- `GAME_CONTENT_ROOT=/app/game/content`
- `DATABASE_URL` from the managed Render database

Optional browser-safe values you can add on the web service if you want:

- `VITE_APP_RELEASE`
- `APP_RELEASE`

Do not put secrets into browser runtime config values.

## 4. Deploy

Trigger the first deploy. The container will:

1. build the app
2. generate `runtime-config.js`
3. run database migrations
4. start the backend server

The backend serves the built frontend, so there is no separate frontend service.

## 5. Verify It Works

After deploy:

- open `/api/health` and make sure it returns `{ "ok": true }`
- open the site root and make sure the game loads
- register a user
- create a save

## Notes

- Render provides `PORT` automatically.
- Production uses Postgres, not SQLite.
- If deployment fails, check the web service logs first.
