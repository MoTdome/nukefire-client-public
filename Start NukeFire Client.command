#!/bin/bash
set -e
cd "$(dirname "$0")"

printf '\033]0;NukeFire Client Setup\007'
echo "NukeFire Client"
echo "==============="

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js is not installed yet."
  echo "Install the current Node.js LTS release, then run this file again."
  echo "Official site: https://nodejs.org/"
  echo
  read -r -p "Press Return to close..."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo
  echo "npm was not found. Reinstall the current Node.js LTS release."
  echo
  read -r -p "Press Return to close..."
  exit 1
fi

if [ ! -d node_modules ] || ! node -e "require('electron')" >/dev/null 2>&1; then
  echo
  echo "Installing the desktop runtime for the first launch..."
  echo "This uses the public npm registry and may take several minutes."
  echo
  rm -rf node_modules
  npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund
fi

echo
echo "Starting NukeFire Client..."
npm start
