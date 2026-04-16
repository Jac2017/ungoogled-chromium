@echo off
REM ==========================================================================
REM Glass Browser — Windows Launcher
REM
REM Launches Glass Browser with all Glass UI features enabled.
REM
REM Usage:
REM   glass-browser\scripts\launch-windows.bat [additional-chrome-flags...]
REM
REM Examples:
REM   launch-windows.bat
REM   launch-windows.bat --incognito
REM ==========================================================================

setlocal enabledelayedexpansion

REM ---------- Find Binary ----------
set "BROWSER_BIN="

REM Check build output
if exist "%~dp0..\..\build\src\out\Glass\chrome.exe" (
    set "BROWSER_BIN=%~dp0..\..\build\src\out\Glass\chrome.exe"
    goto :found
)

if exist "%~dp0..\..\out\Glass\chrome.exe" (
    set "BROWSER_BIN=%~dp0..\..\out\Glass\chrome.exe"
    goto :found
)

REM Check Program Files
if exist "%ProgramFiles%\Glass Browser\glass-browser.exe" (
    set "BROWSER_BIN=%ProgramFiles%\Glass Browser\glass-browser.exe"
    goto :found
)

if exist "%LocalAppData%\Glass Browser\Application\chrome.exe" (
    set "BROWSER_BIN=%LocalAppData%\Glass Browser\Application\chrome.exe"
    goto :found
)

echo Error: Glass Browser binary not found.
echo.
echo Build first with: glass-browser\scripts\build-windows.sh
echo.
exit /b 1

:found

echo Starting Glass Browser...
echo   Binary: %BROWSER_BIN%
echo.

REM ---------- Launch ----------
start "" "%BROWSER_BIN%" ^
  --glass-theme ^
  --glass-ntp ^
  --glass-default-bing ^
  --glass-vertical-tabs ^
  --glass-claude ^
  --custom-ntp="chrome://glass-newtab" ^
  --bookmark-bar-ntp=never ^
  --hide-extensions-menu ^
  --remove-tabsearch-button ^
  --tab-hover-cards=none ^
  --hide-tab-close-buttons ^
  --remove-grab-handle ^
  --show-avatar-button=never ^
  --disable-sharing-hub ^
  --scroll-tabs=never ^
  --disable-background-networking ^
  --disable-breakpad ^
  --disable-component-update ^
  --disable-default-apps ^
  --disable-domain-reliability ^
  --disable-sync ^
  --no-pings ^
  --no-default-browser-check ^
  --no-first-run ^
  --enable-gpu-rasterization ^
  --enable-zero-copy ^
  --ignore-gpu-blocklist ^
  --force-dark-mode ^
  --enable-features=WebUIDarkMode ^
  %*
