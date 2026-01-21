@echo off
echo Testing ESCS Build...
echo.

echo 1. Cleaning old builds...
if exist out rmdir /s /q out

echo 2. Building...
call npm run build

echo.
echo 3. Testing the built app...
echo    Look for these files:
echo    - out\make\zip.win32.x64\ESCS-Portable-win32-x64.zip
echo.
echo 4. Extract and test logout/delete functionality.
echo.
echo IMPORTANT: Data will be saved to:
echo    %APPDATA%\escs-data\
echo.
pause