#!/bin/bash
# Exit on error
set -o errexit

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Downloading sherpa-onnx models (this may take a few minutes)..."
python download_all_models.py

echo "Build complete."
