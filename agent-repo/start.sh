#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Starting Voice Agent Backend ==="

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $AGENT_PID 2>/dev/null || true
  wait $AGENT_PID 2>/dev/null || true
  echo "Done."
}
trap cleanup SIGINT SIGTERM

source .venv/bin/activate

# Start agent in background — connects to LiveKit Cloud, waits for calls
echo "[agent] Starting agent process..."
python3 app/livekit_agent.py dev &
AGENT_PID=$!
sleep 3

# Start FastAPI in foreground — handles HTTP requests
echo "[api] Starting FastAPI server on http://localhost:8000..."
uv run fastapi dev

# If FastAPI exits, clean up agent
cleanup
