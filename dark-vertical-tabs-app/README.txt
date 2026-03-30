DARK VERTICAL TABS - NASA WORM EDITION
=======================================

A standalone dark-themed browser with vertical tab sidebar featuring
circular favicon indicators that expand on hover to reveal tab names.
Uses 1980s NASA worm logotype-inspired typography.

KEYBOARD SHORTCUTS
  Ctrl+T    New tab
  Ctrl+W    Close current tab
  Ctrl+L    Focus URL bar
  Ctrl+R    Reload page
  Enter     Navigate (in URL bar)

MOUSE CONTROLS
  Hover sidebar     Expand to show tab names
  Click tab         Switch to that tab
  Middle-click tab  Close tab
  Click X           Close tab (when expanded)
  Click +           New tab

BUILDING FROM SOURCE
  1. Install Python 3.9+ from python.org
  2. pip install PySide6 pyinstaller
  3. Run build.bat (Windows) or:
     pyinstaller --onefile --noconsole --name DarkVerticalTabs browser.py

DESIGN
  Theme:  Deep space dark (#0B0E17) with NASA worm red (#FC3D21)
  Font:   Century Gothic / Futura / URW Gothic (worm logotype style)
  Effect: CRT scanline overlay, animated sidebar expansion
