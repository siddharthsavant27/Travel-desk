#!/bin/sh
set -eu
mkdir -p /app/data /app/uploads/documents
chown -R nextjs:nodejs /app/data /app/uploads/documents
su-exec nextjs:nodejs node scripts/setup.mjs --skip-generate
exec su-exec nextjs:nodejs node node_modules/next/dist/bin/next start -p "${PORT:-3001}"
