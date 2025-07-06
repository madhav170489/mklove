@echo off
title MK Love Games - Deployment Helper

echo 🎮 MK Love Games - GitHub Pages Deployment
echo ==========================================
echo.

echo 📁 Files in this project:
dir /b

echo.
echo 🚀 Steps to deploy to GitHub Pages:
echo 1. Create a new repository on GitHub
echo 2. Upload all files from this folder to the repository
echo 3. Go to repository Settings ^> Pages
echo 4. Select "Deploy from a branch"
echo 5. Choose "main" branch and "/ (root)" folder
echo 6. Click Save
echo.
echo 📱 Your website will be live at:
echo https://yourusername.github.io/repositoryname
echo.
echo 🌐 How to play together online:
echo • Each player opens the website on their device
echo • One creates a room, shares the Room ID
echo • Other joins with the Room ID
echo • Enjoy real-time multiplayer gaming!
echo.
echo 💡 Mobile tip: Install as PWA for app-like experience!
echo.

where git >nul 2>nul
if %errorlevel% == 0 (
    echo 🔧 Git commands for deployment:
    echo git init
    echo git add .
    echo git commit -m "Initial commit - MK Love Games"
    echo git remote add origin https://github.com/yourusername/yourrepo.git
    echo git push -u origin main
    echo.
)

echo Press any key to close...
pause >nul
