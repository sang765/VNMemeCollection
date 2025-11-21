@echo off
echo Checking Git installation...
echo.

REM Check if git is installed and working
git --version
if %errorlevel% neq 0 (
    echo.
    echo Git is not installed or not in PATH
    echo Please install Git first: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo.
echo Git is installed successfully!
echo.
echo Current configuration:
git config user.name
git config user.email

if "%user.name%"=="" (
    echo.
    echo Warning: Git user name is not configured
    echo Run: git config --global user.name "Your Name"
)

if "%user.email%"=="" (
    echo Warning: Git user email is not configured
    echo Run: git config --global user.email "your.email@example.com"
)

echo.
echo Ready to create empty commit!
echo You can now run: setup_git_and_empty_commit.bat
pause