#!/usr/bin/env python3
"""
build_macos.py — Build Dark Vertical Tabs as a macOS .app bundle + .dmg

Usage:
    python3 build_macos.py

Requirements:
    pip3 install PySide6 pyinstaller

Produces:
    dist/DarkVerticalTabs.app    (macOS application bundle)
    dist/DarkVerticalTabs.dmg    (disk image for distribution)
"""

import os
import sys
import subprocess
import shutil
import tempfile
import plistlib

APP_NAME = "DarkVerticalTabs"
DISPLAY_NAME = "Dark Vertical Tabs"
BUNDLE_ID = "app.darkverticaltabs.browser"
VERSION = "1.0.0"
ICON_NAME = "AppIcon"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(SCRIPT_DIR, "dist")
BUILD_DIR = os.path.join(SCRIPT_DIR, "build")
APP_PATH = os.path.join(DIST_DIR, f"{APP_NAME}.app")
DMG_PATH = os.path.join(DIST_DIR, f"{APP_NAME}.dmg")


def generate_icns():
    """Generate a .icns icon file with the NASA worm red circle logo."""
    try:
        from PySide6.QtCore import QSize
        from PySide6.QtGui import QImage, QPainter, QColor, QBrush, QPen
    except ImportError:
        print("  [skip] PySide6 not available for icon generation")
        return None

    icns_dir = os.path.join(BUILD_DIR, f"{ICON_NAME}.iconset")
    os.makedirs(icns_dir, exist_ok=True)

    sizes = [16, 32, 64, 128, 256, 512]

    for size in sizes:
        for scale in (1, 2):
            px = size * scale
            img = QImage(px, px, QImage.Format.Format_ARGB32_Premultiplied)
            img.fill(QColor(0, 0, 0, 0))

            p = QPainter(img)
            p.setRenderHint(QPainter.RenderHint.Antialiasing)

            cx, cy = px / 2, px / 2

            # Outer dark circle
            p.setPen(QPen(QColor(0x18, 0x20, 0x40), px * 0.06))
            p.setBrush(QBrush(QColor(0x0B, 0x0E, 0x17)))
            r = px * 0.44
            p.drawEllipse(int(cx - r), int(cy - r), int(r * 2), int(r * 2))

            # Inner NASA worm red circle
            p.setPen(QPen(QColor(0, 0, 0, 0)))
            p.setBrush(QBrush(QColor(0xFC, 0x3D, 0x21)))
            r2 = px * 0.30
            p.drawEllipse(int(cx - r2), int(cy - r2), int(r2 * 2), int(r2 * 2))

            # White inner ring detail
            p.setPen(QPen(QColor(255, 255, 255, 100), max(1, px * 0.03)))
            p.setBrush(QBrush(QColor(0, 0, 0, 0)))
            r3 = px * 0.20
            p.drawEllipse(int(cx - r3), int(cy - r3), int(r3 * 2), int(r3 * 2))

            p.end()

            if scale == 1:
                fname = f"icon_{size}x{size}.png"
            else:
                fname = f"icon_{size}x{size}@2x.png"
            img.save(os.path.join(icns_dir, fname))

    # Convert iconset to icns using macOS iconutil
    icns_path = os.path.join(BUILD_DIR, f"{ICON_NAME}.icns")
    result = subprocess.run(
        ["iconutil", "-c", "icns", icns_dir, "-o", icns_path],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  [warn] iconutil failed: {result.stderr}")
        # Fallback: use the 256px PNG directly
        png_fallback = os.path.join(icns_dir, "icon_256x256.png")
        if os.path.exists(png_fallback):
            shutil.copy2(png_fallback, icns_path)
        else:
            return None
    return icns_path


def run_pyinstaller(icns_path):
    """Run PyInstaller to create the .app bundle."""
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--windowed",              # .app bundle, no terminal
        "--name", APP_NAME,
        "--noconfirm",
        "--clean",
    ]
    if icns_path and os.path.exists(icns_path):
        cmd += ["--icon", icns_path]

    # Add PySide6 WebEngine hidden imports
    cmd += [
        "--hidden-import", "PySide6.QtWebEngineWidgets",
        "--hidden-import", "PySide6.QtWebEngineCore",
        "--hidden-import", "PySide6.QtNetwork",
        "--hidden-import", "PySide6.QtPositioning",
    ]

    cmd.append(os.path.join(SCRIPT_DIR, "browser.py"))

    print(f"  Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=SCRIPT_DIR)
    if result.returncode != 0:
        print("  [ERROR] PyInstaller failed!")
        sys.exit(1)


def patch_info_plist():
    """Update the Info.plist with proper macOS metadata."""
    plist_path = os.path.join(APP_PATH, "Contents", "Info.plist")
    if not os.path.exists(plist_path):
        print(f"  [warn] Info.plist not found at {plist_path}")
        return

    with open(plist_path, "rb") as f:
        plist = plistlib.load(f)

    plist.update({
        "CFBundleDisplayName": DISPLAY_NAME,
        "CFBundleName": DISPLAY_NAME,
        "CFBundleIdentifier": BUNDLE_ID,
        "CFBundleShortVersionString": VERSION,
        "CFBundleVersion": VERSION,
        "NSAppTransportSecurity": {"NSAllowsArbitraryLoads": True},
        "NSHighResolutionCapable": True,
        "LSMinimumSystemVersion": "11.0",
        "NSSupportsAutomaticGraphicsSwitching": True,
        "CFBundleDocumentTypes": [{
            "CFBundleTypeName": "HTML Document",
            "CFBundleTypeRole": "Viewer",
            "LSItemContentTypes": ["public.html"],
        }],
    })

    with open(plist_path, "wb") as f:
        plistlib.dump(plist, f)

    print("  Info.plist updated with macOS metadata")


def create_dmg():
    """Create a .dmg disk image with the .app and Applications symlink."""
    if os.path.exists(DMG_PATH):
        os.remove(DMG_PATH)

    if not os.path.exists(APP_PATH):
        print("  [ERROR] .app bundle not found!")
        sys.exit(1)

    # Create a temporary directory for DMG contents
    with tempfile.TemporaryDirectory() as staging:
        # Copy .app into staging
        staged_app = os.path.join(staging, f"{APP_NAME}.app")
        shutil.copytree(APP_PATH, staged_app)

        # Create Applications symlink for drag-to-install
        os.symlink("/Applications", os.path.join(staging, "Applications"))

        # Create a background instructions file
        readme = os.path.join(staging, ".README.txt")
        with open(readme, "w") as f:
            f.write("Drag Dark Vertical Tabs to Applications to install.\n")

        # Build DMG using hdiutil
        dmg_title = f"{DISPLAY_NAME} — NASA Worm Edition"
        result = subprocess.run([
            "hdiutil", "create",
            "-volname", dmg_title,
            "-srcfolder", staging,
            "-ov",                 # overwrite
            "-format", "UDZO",     # compressed
            "-imagekey", "zlib-level=9",
            DMG_PATH,
        ], capture_output=True, text=True)

        if result.returncode != 0:
            print(f"  [ERROR] hdiutil failed: {result.stderr}")
            # Fallback: create uncompressed DMG
            result2 = subprocess.run([
                "hdiutil", "create",
                "-volname", dmg_title,
                "-srcfolder", staging,
                "-ov",
                "-format", "UDRW",
                DMG_PATH,
            ], capture_output=True, text=True)
            if result2.returncode != 0:
                print(f"  [ERROR] DMG creation failed completely: {result2.stderr}")
                print("  The .app bundle is still available at:", APP_PATH)
                return False

    print(f"  DMG created: {DMG_PATH}")
    return True


def main():
    print()
    print("  =============================================")
    print("   DARK VERTICAL TABS — NASA WORM EDITION")
    print("   macOS Build (.app + .dmg)")
    print("  =============================================")
    print()

    if sys.platform != "darwin":
        print("  [!] This script must be run on macOS.")
        print("      Cross-building macOS .app bundles is not supported.")
        print()
        print("  To build on macOS:")
        print("    1. Copy this directory to your Mac")
        print("    2. pip3 install PySide6 pyinstaller")
        print("    3. python3 build_macos.py")
        print()
        sys.exit(1)

    os.makedirs(BUILD_DIR, exist_ok=True)
    os.makedirs(DIST_DIR, exist_ok=True)

    print("  [1/4] Generating app icon (.icns)...")
    icns_path = generate_icns()
    if icns_path:
        print(f"         Icon: {icns_path}")
    else:
        print("         Using default icon")

    print("  [2/4] Building .app bundle with PyInstaller...")
    run_pyinstaller(icns_path)

    print("  [3/4] Patching Info.plist...")
    patch_info_plist()

    print("  [4/4] Creating .dmg disk image...")
    success = create_dmg()

    print()
    print("  =============================================")
    if success:
        print(f"   Build complete!")
        print(f"   .app: {APP_PATH}")
        print(f"   .dmg: {DMG_PATH}")
    else:
        print(f"   .app bundle built (DMG creation failed)")
        print(f"   .app: {APP_PATH}")
    print("  =============================================")
    print()
    print("  To install: open the .dmg and drag to Applications")
    print()


if __name__ == "__main__":
    main()
