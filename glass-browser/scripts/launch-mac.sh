#!/bin/bash
# ==========================================================================
# Glass Browser — macOS Launcher
#
# Launches Glass Browser with all Glass UI features enabled.
# Wraps the Chromium binary with the correct command-line flags.
#
# Usage:
#   ./glass-browser/scripts/launch-mac.sh [additional-chrome-flags...]
#
# Examples:
#   ./launch-mac.sh
#   ./launch-mac.sh --incognito
#   ./launch-mac.sh --disable-gpu
# ==========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Possible binary locations (in order of preference)
BINARY_PATHS=(
  "$ROOT_DIR/build/src/out/Glass/Chromium.app/Contents/MacOS/Chromium"
  "$ROOT_DIR/out/Glass/Chromium.app/Contents/MacOS/Chromium"
  "/Applications/Glass Browser.app/Contents/MacOS/Glass Browser"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
)

BROWSER_BIN=""
for path in "${BINARY_PATHS[@]}"; do
  if [ -x "$path" ]; then
    BROWSER_BIN="$path"
    break
  fi
done

if [ -z "$BROWSER_BIN" ]; then
  echo "Error: Glass Browser binary not found."
  echo ""
  echo "Searched in:"
  for path in "${BINARY_PATHS[@]}"; do
    echo "  $path"
  done
  echo ""
  echo "Build first with: ./glass-browser/scripts/build-mac.sh"
  exit 1
fi

# ---------- Glass Browser Flags ----------
GLASS_FLAGS=(
  # Glass UI features
  --glass-theme
  --glass-ntp
  --glass-default-bing
  --glass-vertical-tabs
  --glass-claude

  # ungoogled-chromium recommended flags
  --custom-ntp="chrome://glass-newtab"
  --bookmark-bar-ntp=never
  --hide-extensions-menu
  --remove-tabsearch-button
  --tab-hover-cards=none
  --hide-tab-close-buttons
  --remove-grab-handle
  --show-avatar-button=never
  --disable-sharing-hub
  --scroll-tabs=never

  # Privacy flags
  --disable-background-networking
  --disable-breakpad
  --disable-component-update
  --disable-default-apps
  --disable-domain-reliability
  --disable-sync
  --no-pings
  --no-default-browser-check
  --no-first-run

  # Performance
  --enable-gpu-rasterization
  --enable-zero-copy
  --ignore-gpu-blocklist

  # Dark mode
  --force-dark-mode
  --enable-features=WebUIDarkMode
)

echo "Starting Glass Browser..."
echo "  Binary: $BROWSER_BIN"
echo "  Flags: ${#GLASS_FLAGS[@]} Glass + $# user flags"
echo ""

# Launch with Glass flags + any user-provided flags
exec "$BROWSER_BIN" "${GLASS_FLAGS[@]}" "$@"
