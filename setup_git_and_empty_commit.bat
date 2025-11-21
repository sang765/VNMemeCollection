@echo off
echo Setting up Git repository and creating empty commit...
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Git is not installed or not in PATH
    echo Please install Git first and restart this script
    pause
    exit /b 1
)

REM Navigate to the script directory
cd /d "%~dp0"

REM Initialize git repository
echo Initializing Git repository...
git init

REM Check if repository was initialized
if %errorlevel% neq 0 (
    echo Error: Failed to initialize Git repository
    pause
    exit /b 1
)

REM Configure git if not already configured
git config user.name "VNMemeCollection" 2>nul
git config user.email "vnmemecollection@example.com" 2>nul

REM Create empty commit
echo Creating empty commit...
git commit --allow-empty -m "Empty commit"

REM Check if commit was successful
if %errorlevel% neq 0 (
    echo Error: Failed to create empty commit
    pause
    exit /b 1
)

REM Show commit log
echo.
echo Success! Here are your commits:
git log --oneline

echo.
echo Git repository setup complete!
echo Your empty commit has been created successfully.
pause