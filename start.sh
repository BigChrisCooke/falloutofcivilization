#!/bin/sh
set -eu

cd /app/backend

echo "Generating runtime frontend config..."
node --input-type=module -e "import fs from 'node:fs'; const config = { apiBaseUrl: process.env.VITE_API_BASE_URL || '', appRelease: process.env.VITE_APP_RELEASE || process.env.APP_RELEASE || process.env.RENDER_GIT_COMMIT || 'dev' }; fs.mkdirSync('/app/client/dist', { recursive: true }); fs.writeFileSync('/app/client/dist/runtime-config.js', 'window.__FOC_RUNTIME_CONFIG__ = ' + JSON.stringify(config) + ';\\n');"

echo "Running database migrations..."
node /app/backend/dist/backend/src/db/migrate.js

echo "Starting server..."
node /app/backend/dist/backend/src/server.js
