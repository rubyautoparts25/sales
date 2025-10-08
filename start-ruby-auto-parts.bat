@echo off
echo Starting Ruby Auto Parts System...
echo.

REM Refresh PATH to include Node.js
set PATH=%PATH%;C:\Program Files\nodejs

REM Navigate to the project directory
cd /d "%~dp0"

REM Check if Node.js is available
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found in PATH
    echo Please make sure Node.js is installed
    pause
    exit /b 1
)

REM Check if npm is available
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found in PATH
    echo Please make sure npm is installed
    pause
    exit /b 1
)

echo Node.js version:
node -v
echo npm version:
npm -v
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Start the development server
echo Starting development server...
echo Your Ruby Auto Parts system will be available at: http://localhost:5173
echo Press Ctrl+C to stop the server
echo.
npm run dev

pause

