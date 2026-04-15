@echo off
echo === Memoria deploy ===
cd /d E:\memoria
call install_face_api.bat
node setup_files.js
del setup_files.js 2>nul
del install_face_api.bat 2>nul
git add .
git commit -m "fix: group creation RLS, OTP email bright, face grouping UI, R2-only storage"
git push
echo === Done! Check Vercel for build ===
pause
