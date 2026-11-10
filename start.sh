#!/usr/bin/env bash
set -e

# =============================================================================
# GoMzansi Mobile App Runner (React Native + Expo Router)
# =============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo "  🇿🇦 Launching GoMzansi Mobile Transit App"
echo "  Framework: React Native 0.74 (Expo SDK 51 + Expo Router)"
echo "  Target:    Expo Go (iOS / Android), Web, or Simulator"
echo "============================================================"

# Default to standard expo start for Expo Go
if [ "$1" == "--tunnel" ] || [ "$1" == "tunnel" ]; then
  echo "🚇 Starting in Tunnel mode (great for connecting across Wi-Fi networks)..."
  npx expo start --tunnel
elif [ "$1" == "--web" ] || [ "$1" == "web" ]; then
  echo "🌐 Starting in Web mode..."
  npx expo start --web
elif [ "$1" == "--dev-client" ]; then
  echo "🛠️ Starting for custom Development Client..."
  npx expo start --dev-client
else
  echo "📱 Starting Expo Dev Server..."
  echo "👉 Open the camera or Expo Go on your iPhone to scan the QR code!"
  npx expo start
fi
