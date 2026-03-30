@echo off
:: ============================================================
:: Dark Vertical Tabs — NASA Worm Edition
:: Windows .exe Build Script
:: ============================================================
::
:: Prerequisites:
::   pip install PySide6 pyinstaller
::
:: This produces: dist\DarkVerticalTabs.exe
:: ============================================================

echo.
echo   =============================================
echo    DARK VERTICAL TABS - NASA WORM EDITION
echo    Building Windows .exe ...
echo   =============================================
echo.

pyinstaller ^
    --onefile ^
    --noconsole ^
    --name DarkVerticalTabs ^
    --add-data "README.txt;." ^
    --icon NONE ^
    browser.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo   Build successful!
    echo   Output: dist\DarkVerticalTabs.exe
    echo.
) else (
    echo.
    echo   Build failed. Check the output above for errors.
    echo.
)

pause
