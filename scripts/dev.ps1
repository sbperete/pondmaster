# PondMaster — Dev Server
Write-Host "PondMaster Dev Server" -ForegroundColor Cyan
Write-Host "Open: http://localhost:8080" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""
npx http-server docs -p 8080 -c-1 --cors -o
