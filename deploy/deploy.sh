#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  set +u
  . "$HOME/.nvm/nvm.sh"
  nvm use --silent
  set -u
fi

npm ci --omit=dev
node apps/api/dist/db/cli.js up
pm2 startOrRestart deploy/ecosystem.config.cjs --only hakuren-api --update-env

api_port="$(node --env-file=.env -p 'process.env.API_PORT || 3107')"
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 1 --max-time 3 "http://127.0.0.1:${api_port}/api/ready"
pm2 save
