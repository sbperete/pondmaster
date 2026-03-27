# PondMaster — Build Script
Write-Host "PondMaster Build" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

Write-Host "Generating icons..." -ForegroundColor Yellow
node scripts/generate-icons.js
if ($LASTEXITCODE -ne 0) { Write-Host "Icon generation failed!" -ForegroundColor Red; exit 1 }
Write-Host "  Icons generated" -ForegroundColor Green

Write-Host "Validating files..." -ForegroundColor Yellow
node scripts/validate.js
if ($LASTEXITCODE -ne 0) { Write-Host "Validation failed!" -ForegroundColor Red; exit 1 }
Write-Host "  Validation passed" -ForegroundColor Green

Write-Host ""
Write-Host "Build complete — docs/ folder is ready to deploy" -ForegroundColor Green
