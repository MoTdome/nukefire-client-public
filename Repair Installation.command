#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "NukeFire Client - Clean Repair"
echo "=============================="
echo
rm -rf node_modules
npm cache verify
npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund
echo
echo "Repair complete. Starting client..."
npm start
