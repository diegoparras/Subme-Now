#!/usr/bin/env bash
# Empaqueta la extensión para la Chrome Web Store: dist/subme-now-<versión>.zip
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./manifest.json').version")
mkdir -p dist
OUT="dist/subme-now-${VERSION}.zip"
rm -f "$OUT"
zip -qr "$OUT" manifest.json _locales icons src -x '*.DS_Store'
echo "Paquete listo: $OUT ($(du -h "$OUT" | cut -f1))"
