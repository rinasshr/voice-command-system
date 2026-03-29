#!/bin/bash
set -e

# Install ffmpeg
sudo apt-get update && sudo apt-get install -y ffmpeg

# Backend dependencies
cd /workspaces/voice-command-system/backend
pip install -r requirements.txt

# Download VOSK Russian model
if [ ! -d "model" ]; then
  wget -q https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip
  unzip -q vosk-model-small-ru-0.22.zip
  mv vosk-model-small-ru-0.22 model
  rm vosk-model-small-ru-0.22.zip
fi

# Frontend dependencies
cd /workspaces/voice-command-system/frontend
npm install
