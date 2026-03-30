DARK VERTICAL TABS - NASA WORM EDITION
=======================================

A standalone dark-themed browser with vertical tab sidebar featuring
circular favicon indicators that expand on hover to reveal tab names.
Uses 1980s NASA worm logotype-inspired typography.

BUILD — WINDOWS (.exe)
  1. Install Python 3.9+ from python.org
  2. pip install PySide6 pyinstaller
  3. Run build.bat
  4. Output: dist\DarkVerticalTabs.exe

BUILD — macOS (.dmg)
  1. Install Python 3.9+ (brew install python3)
  2. pip3 install PySide6 pyinstaller
  3. Run: ./build_macos.sh   (or: python3 build_macos.py)
  4. Output: dist/DarkVerticalTabs.dmg
  5. Open .dmg, drag to Applications

KEYBOARD SHORTCUTS
  Cmd/Ctrl+T          New tab
  Cmd/Ctrl+W          Close current tab
  Cmd/Ctrl+L          Focus URL bar
  Cmd/Ctrl+R          Reload page
  Ctrl+Tab            Next tab
  Ctrl+Shift+Tab      Previous tab
  Enter               Navigate (in URL bar)

MOUSE CONTROLS
  Hover sidebar       Expand to show tab names
  Click tab           Switch to that tab
  Middle-click tab    Close tab
  Click X             Close tab (when expanded)
  Click +             New tab

DESIGN
  Theme:  Deep space dark (#0B0E17) with NASA worm red (#FC3D21)
  Font:   Century Gothic (Win) / Futura (Mac) / URW Gothic (Linux)
  Effect: CRT scanline overlay, 250ms ease-out sidebar animation
