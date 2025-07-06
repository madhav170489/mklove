#!/bin/bash

# MK Love Games - GitHub Pages Deployment Script
# Run this script to deploy your gaming website to GitHub Pages

echo "🎮 MK Love Games - Deployment Helper"
echo "====================================="

echo "📁 Current files in the project:"
ls -la

echo ""
echo "🚀 To deploy to GitHub Pages:"
echo "1. Create a new repository on GitHub"
echo "2. Upload all these files to the repository"
echo "3. Go to repository Settings > Pages"
echo "4. Select 'Deploy from a branch'"
echo "5. Choose 'main' branch and '/ (root)' folder"
echo "6. Click Save"
echo ""
echo "📱 Your website will be available at:"
echo "https://yourusername.github.io/repositoryname"
echo ""
echo "🌐 For multiplayer gaming:"
echo "• Each player opens the website on their own device"
echo "• One player creates a room and shares the Room ID"
echo "• The other player joins using the Room ID"
echo "• Enjoy real-time gaming together!"
echo ""
echo "💡 Tip: Add this as a bookmark or install as PWA on mobile!"

# Check if git is available
if command -v git &> /dev/null; then
    echo ""
    echo "🔧 Git commands to deploy:"
    echo "git init"
    echo "git add ."
    echo "git commit -m 'Initial commit - MK Love Games'"
    echo "git remote add origin https://github.com/yourusername/yourrepository.git"
    echo "git push -u origin main"
fi
