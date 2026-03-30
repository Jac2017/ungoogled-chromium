@echo off
:: ============================================================
:: DARK VERTICAL TABS - NASA WORM EDITION
:: Windows Desktop Installation Script
:: ============================================================

echo.
echo   ============================================
echo     DARK VERTICAL TABS - NASA WORM EDITION
echo     Windows Desktop Installer
echo   ============================================
echo.

:: Check if Chrome/Chromium is in a standard location
set "CHROME_PATH="
if exist "%ProgramFiles%\Chromium\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles%\Chromium\Application\chrome.exe"
)
if exist "%ProgramFiles(x86)%\Chromium\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles(x86)%\Chromium\Application\chrome.exe"
)
if exist "%LocalAppData%\Chromium\Application\chrome.exe" (
    set "CHROME_PATH=%LocalAppData%\Chromium\Application\chrome.exe"
)

if defined CHROME_PATH (
    echo   Found Chromium at: %CHROME_PATH%
) else (
    echo   Chromium not found in standard locations.
    echo   Please enter the path to your chromium.exe:
    set /p CHROME_PATH=
)

echo.
echo   Extension directory: %~dp0
echo.
echo   To install the Dark Vertical Tabs extension:
echo.
echo   1. Open Chromium/ungoogled-chromium
echo   2. Navigate to chrome://extensions
echo   3. Enable "Developer mode" (toggle in top right)
echo   4. Click "Load unpacked"
echo   5. Select this folder: %~dp0
echo   6. Click the extension icon in toolbar to open side panel
echo.
echo   OPTIONAL - Hide native tab strip:
echo   7. Navigate to chrome://flags
echo   8. Search for "vertical-tabs-only"
echo   9. Enable the flag and restart the browser
echo.
echo   Or launch with flags directly:
echo   "%CHROME_PATH%" --vertical-tabs-only --load-extension="%~dp0"
echo.

:: Create a desktop shortcut
set "SHORTCUT=%USERPROFILE%\Desktop\Ungoogled Chromium - Vertical Tabs.lnk"
echo   Creating desktop shortcut...

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%CHROME_PATH%'; $s.Arguments = '--vertical-tabs-only --load-extension=\"%~dp0\"'; $s.Description = 'Ungoogled Chromium with Dark Vertical Tabs'; $s.Save()" 2>nul

if exist "%SHORTCUT%" (
    echo   Desktop shortcut created successfully!
) else (
    echo   Could not create shortcut. Please create one manually.
)

echo.
echo   ============================================
echo     Installation complete!
echo   ============================================
echo.
pause
