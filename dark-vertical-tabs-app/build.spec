# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for Dark Vertical Tabs — NASA Worm Edition
#
# Build with:  pyinstaller build.spec
# Output:      dist/DarkVerticalTabs.exe

import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect all PySide6 WebEngine data files (Chromium resources, etc.)
datas = collect_data_files('PySide6', includes=['**/*.pak', '**/*.dat', '**/*.bin'])

a = Analysis(
    ['browser.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'PySide6.QtWebEngineWidgets',
        'PySide6.QtWebEngineCore',
        'PySide6.QtNetwork',
    ] + collect_submodules('PySide6.QtWebEngineCore'),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='DarkVerticalTabs',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,           # No console window — pure GUI
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
