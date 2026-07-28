#!/usr/bin/env bash
# Runs on every codespace (re)start: bring the dev servers up in the background.
cd "$(dirname "$0")/.."
pkill -f "tsx watch" 2>/dev/null || true
pkill -f vite 2>/dev/null || true
nohup pnpm dev > /tmp/malkom-dev.log 2>&1 &
echo "MALKOM servers starting (web :5173, api :3001) — logs: /tmp/malkom-dev.log"
