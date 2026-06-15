#!/bin/bash
# Exit on error
set -o errexit

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Downloading sherpa-onnx models (this may take a few minutes)..."
python download_all_models.py

echo "Downloading Silero VAD model..."
mkdir -p poc-sherpa
curl -L -s "https://github.com/snakers4/silero-vad/raw/master/src/silero_vad/data/silero_vad.onnx" -o poc-sherpa/silero_vad.onnx

echo "Build complete."
