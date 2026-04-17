#!/bin/bash
# ==========================================================================
# Glass Browser — macOS Build Script
#
# Builds Glass Browser for macOS (Apple Silicon and Intel).
# Extends ungoogled-chromium's build pipeline with Glass-specific patches
# and resources.
#
# Prerequisites:
#   - macOS 13+ (Ventura or later)
#   - Xcode 15+ with command-line tools
#   - Python 3.9+
#   - ~100GB free disk space
#   - ~16GB RAM (32GB recommended)
#
# Usage:
#   ./glass-browser/scripts/build-mac.sh [--arch arm64|x64] [--debug]
#
# Output:
#   out/Glass/Glass Browser.app
# ==========================================================================

set -euo pipefail

# ---------- Configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
GLASS_DIR="$ROOT_DIR/glass-browser"
BUILD_DIR="$ROOT_DIR/build"
SRC_DIR="$BUILD_DIR/src"
OUT_DIR="$SRC_DIR/out/Glass"

# Default architecture: detect current machine
DEFAULT_ARCH="$(uname -m)"
if [ "$DEFAULT_ARCH" = "arm64" ]; then
  TARGET_CPU="arm64"
else
  TARGET_CPU="x64"
fi

IS_DEBUG=false

# ---------- Parse Arguments ----------
while [[ $# -gt 0 ]]; do
  case $1 in
    --arch)
      TARGET_CPU="$2"
      shift 2
      ;;
    --debug)
      IS_DEBUG=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--arch arm64|x64] [--debug]"
      echo ""
      echo "Options:"
      echo "  --arch   Target architecture (arm64 or x64). Default: current machine."
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
echo "  Glass Browser — macOS Build"
echo "  Architecture: $TARGET_CPU"
echo "  Debug: $IS_DEBUG"
echo "========================================"
echo ""

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
  "$GLASS_DIR/patches/glass-webui-handler.patch"        # WebUI handler for chrome://glass-* pages
  "$GLASS_DIR/patches/glass-resources-integration.patch" # Integrates .grdp into browser_resources.grd
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
mkdir -p "$GLASS_RESOURCES_DST/settings"

cp -r "$GLASS_DIR/resources/newtab/"* "$GLASS_RESOURCES_DST/newtab/"
cp -r "$GLASS_DIR/resources/sidebar/"* "$GLASS_RESOURCES_DST/sidebar/"
cp -r "$GLASS_DIR/resources/theme/"* "$GLASS_RESOURCES_DST/theme/"
cp -r "$GLASS_DIR/resources/settings/"* "$GLASS_RESOURCES_DST/settings/" 2>/dev/null || true

# Copy the GRDP resource definition file into the resource tree
cp "$GLASS_DIR/patches/glass-resources.grdp" "$GLASS_RESOURCES_DST/"

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

# Set platform-specific flags
cat >> "$OUT_DIR/args.gn" <<EOF

# macOS build
target_os = "mac"
target_cpu = "$TARGET_CPU"
EOF

if [ "$IS_DEBUG" = true ]; then
  cat >> "$OUT_DIR/args.gn" <<EOF

# Debug overrides
is_debug = true
symbol_level = 2
EOF
fi

# Generate ninja files
tools/gn/bootstrap/bootstrap.py -o "$OUT_DIR/gn" --skip-generate-buildfiles
"$OUT_DIR/gn" gen "$OUT_DIR"
echo "  Build files generated."

# ---------- Step 8: Build ----------
echo "[8/8] Building Glass Browser..."
echo "  This will take a while (1-4 hours depending on hardware)."
echo ""

ninja -C "$OUT_DIR" chrome chromedriver

echo ""
echo "========================================"
echo "  Build complete!"
echo "  Output: $OUT_DIR/Glass Browser.app"
echo "========================================"
echo ""
echo "  To run:"
echo "    open '$OUT_DIR/Glass Browser.app' --args --glass-theme --glass-ntp --glass-default-bing"
echo ""
echo "  Command-line flags for Glass features:"
echo "    --glass-theme           Enable Glass dark theme"
echo "    --glass-ntp             Enable Glass New Tab Page"
echo "    --glass-default-bing    Set Bing as default search"
echo "    --glass-vertical-tabs   Enable vertical tab sidebar"
echo "    --glass-claude          Enable Claude AI panel"
echo ""
