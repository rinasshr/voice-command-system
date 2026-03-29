#!/bin/bash
# Start backend and frontend together

cd /workspaces/voice-command-system/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &

cd /workspaces/voice-command-system/frontend
npx vite --host 0.0.0.0 &

wait
