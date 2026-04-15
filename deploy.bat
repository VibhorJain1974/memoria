@echo off
echo === Memoria deploy ===
cd /d E:\memoria
git add .
git commit -m "fix: upload route void async, r2.ts R2-only, FaceGrouping CDN, sharing blocks UI"
git push
echo === Done — check Vercel ===
pause
