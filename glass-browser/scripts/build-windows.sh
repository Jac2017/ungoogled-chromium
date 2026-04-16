#!/bin/bash
# ==========================================================================
# Glass Browser — Windows Build Script
#
# Builds Glass Browser for Windows (x64).
# This script is intended to be run in a Windows build environment
# (MSYS2, Git Bash, or WSL with cross-compilation).
#
# Prerequisites:
#   - Windows 10/11 64-bit
#   - Visual Studio 2022 with C++ desktop workload
#   - Windows 10/11 SDK (10.0.22621.0+)
#   - Python 3.9+
#   - ~100GB free disk space
#   - ~16GB RAM (32GB recommended)
#
# Usage:
#   ./glass-browser/scripts/build-windows.sh [--debug]
#
# Output:
#   out/Glass/glass-browser.exe
# ==========================================================================

set -euo pipefail

# ---------- Configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
GLASS_DIR="$ROOT_DIR/glass-browser"
BUILD_DIR="$ROOT_DIR/build"
SRC_DIR="$BUILD_DIR/src"
OUT_DIR="$SRC_DIR/out/Glass"

TARGET_CPU="x64"
IS_DEBUG=false

# ---------- Parse Arguments ----------
while [[ $# -gt 0 ]]; do
  case $1 in
    --debug)
      IS_DEBUG=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--debug]"
      echo ""
      echo "Options:"
      echo "  --debug  Build with debug symbols and assertions."
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================"
echo "  Glass Browser — Windows Build"
echo "  Architecture: $TARGET_CPU"
echo "  Debug: $IS_DEBUG"
echo "========================================"
echo ""

# ---------- Verify Windows Build Environment ----------
echo "[0/8] Verifying build environment..."

# Check for Visual Studio
if [ -z "${VSINSTALLDIR:-}" ] && [ ! -d "/c/Program Files/Microsoft Visual Studio/2022" ] && [ ! -d "/c/Program Files (x86)/Microsoft Visual Studio/2022" ]; then
  echo "  WARNING: Visual Studio 2022 not detected."
  echo "  Please install Visual Studio 2022 with C++ desktop workload."
  echo "  Continuing anyway — build may fail at compilation step."
fi

# Check for Windows SDK
if [ ! -d "/c/Program Files (x86)/Windows Kits/10" ]; then
  echo "  WARNING: Windows SDK not detected."
  echo "  Please install Windows 10/11 SDK."
fi

echo "  Environment check complete."

# ---------- Step 1: Download Chromium Source ----------
echo "[1/8] Downloading Chromium source..."
if [ ! -d "$BUILD_DIR" ]; then
  mkdir -p "$BUILD_DIR"
fi

cd "$ROOT_DIR"
CHROMIUM_VERSION=$(cat chromium_version.txt)
echo "  Chromium version: $CHROMIUM_VERSION"

if [ ! -d "$SRC_DIR" ]; then
  python3 utils/downloads.py retrieve -c "$BUILD_DIR/cache" -i downloads.ini
  python3 utils/downloads.py unpack -c "$BUILD_DIR/cache" -i downloads.ini "$BUILD_DIR"
  echo "  Source downloaded and unpacked."
else
  echo "  Source already exists, skipping download."
fi

# ---------- Step 2: Prune Binaries ----------
echo "[2/8] Pruning pre-built binaries..."
python3 utils/prune_binaries.py "$SRC_DIR" pruning.list
echo "  Binary pruning complete."

# ---------- Step 3: Apply ungoogled-chromium Patches ----------
echo "[3/8] Applying ungoogled-chromium patches..."
python3 utils/patches.py apply "$SRC_DIR" patches
echo "  Base patches applied."

# ---------- Step 4: Apply Glass Browser Patches ----------
echo "[4/8] Applying Glass Browser patches..."
GLASS_PATCHES=(
  "$GLASS_DIR/patches/glass-branding.patch"
  "$GLASS_DIR/patches/glass-dark-theme.patch"
  "$GLASS_DIR/patches/glass-vertical-tabs.patch"
  "$GLASS_DIR/patches/glass-ntp-and-defaults.patch"
  "$GLASS_DIR/patches/glass-honey-extension.patch"
)

for patch in "${GLASS_PATCHES[@]}"; do
  if [ -f "$patch" ]; then
    echo "  Applying: $(basename "$patch")"
    cd "$SRC_DIR"
    patch -p1 < "$patch" || echo "  Warning: Patch may have already been applied."
    cd "$ROOT_DIR"
  fi
done
echo "  Glass patches applied."

# ---------- Step 5: Copy Glass Resources ----------
echo "[5/8] Installing Glass Browser resources..."
GLASS_RESOURCES_DST="$SRC_DIR/chrome/browser/resources/glass-browser"
mkdir -p "$GLASS_RESOURCES_DST/newtab"
mkdir -p "$GLASS_RESOURCES_DST/sidebar"
mkdir -p "$GLASS_RESOURCES_DST/theme"

cp -r "$GLASS_DIR/resources/newtab/"* "$GLASS_RESOURCES_DST/newtab/"
cp -r "$GLASS_DIR/resources/sidebar/"* "$GLASS_RESOURCES_DST/sidebar/"
cp -r "$GLASS_DIR/resources/theme/"* "$GLASS_RESOURCES_DST/theme/"

echo "  Resources installed."

# ---------- Step 6: Domain Substitution ----------
echo "[6/8] Applying domain substitution..."
python3 utils/domain_substitution.py apply \
  -r domain_regex.list \
  -f domain_substitution.list \
  -c "$BUILD_DIR/domsubcache.tar.gz" \
  "$SRC_DIR"
echo "  Domain substitution complete."

# ---------- Step 7: Generate Build Files ----------
echo "[7/8] Generating build configuration..."
cd "$SRC_DIR"

mkdir -p "$OUT_DIR"

# Merge base flags with Glass-specific flags
cat "$ROOT_DIR/flags.gn" > "$OUT_DIR/args.gn"
echo "" >> "$OUT_DIR/args.gn"
echo "# Glass Browser additions" >> "$OUT_DIR/args.gn"
cat "$GLASS_DIR/config/glass_flags.gn" >> "$OUT_DIR/args.gn"

# Set Windows-specific flags
cat >> "$OUT_DIR/args.gn" <<EOF

# Windows build
target_os = "win"
target_cpu = "$TARGET_CPU"

# Windows-specific settings
is_clang = true
use_lld = true
EOF

if [ "$IS_DEBUG" = true ]; then
  cat >> "$OUT_DIR/args.gn" <<EOF

# Debug overrides
is_debug = true
symbol_level = 2
EOF
fi

# Generate ninja files
python3 tools/gn/bootstrap/bootstrap.py -o "$OUT_DIR/gn.exe" --skip-generate-buildfiles
"$OUT_DIR/gn.exe" gen "$OUT_DIR"
echo "  Build files generated."

# ---------- Step 8: Build ----------
echo "[8/8] Building Glass Browser..."
echo "  This will take a while (2-6 hours depending on hardware)."
echo ""

ninja -C "$OUT_DIR" chrome chromedriver mini_installer

echo ""
echo "========================================"
echo "  Build complete!"
echo "  Output: $OUT_DIR/glass-browser.exe"
echo "  Installer: $OUT_DIR/mini_installer.exe"
echo "========================================"
echo ""
echo "  To run:"
echo "    $OUT_DIR/chrome.exe --glass-theme --glass-ntp --glass-default-bing"
echo ""
echo "  Command-line flags for Glass features:"
echo "    --glass-theme           Enable Glass dark theme"
echo "    --glass-ntp             Enable Glass New Tab Page"
echo "    --glass-default-bing    Set Bing as default search"
echo "    --glass-vertical-tabs   Enable vertical tab sidebar"
echo "    --glass-claude          Enable Claude AI panel"
echo ""
