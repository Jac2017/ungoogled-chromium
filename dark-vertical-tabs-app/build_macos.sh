#!/bin/bash
# ============================================================
# Dark Vertical Tabs — NASA Worm Edition
# macOS .dmg Build Script
# ============================================================
#
# Prerequisites:
#   brew install python3   (or use system Python 3.9+)
#   pip3 install PySide6 pyinstaller
#
# Output: dist/DarkVerticalTabs.dmg
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "  ============================================="
echo "   DARK VERTICAL TABS — NASA WORM EDITION"
echo "   macOS Build"
echo "  ============================================="
echo ""

# Check dependencies
if ! command -v python3 &>/dev/null; then
    echo "  [ERROR] python3 not found. Install with: brew install python3"
    exit 1
fi

# Install dependencies if missing
python3 -c "import PySide6" 2>/dev/null || {
    echo "  Installing PySide6..."
    pip3 install PySide6
}

python3 -c "import PyInstaller" 2>/dev/null || {
    echo "  Installing pyinstaller..."
    pip3 install pyinstaller
}

echo "  Starting build..."
python3 build_macos.py

echo ""
echo "  Done! Look in dist/ for your .dmg file."
echo ""
