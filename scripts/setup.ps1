# PondMaster — Setup Script
Write-Host "PondMaster Setup" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

$deps = @{
  "git"  = "Git.Git"
  "node" = "OpenJS.NodeJS.LTS"
  "gh"   = "GitHub.cli"
}

foreach ($cmd in $deps.Keys) {
  if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "Installing $cmd..." -ForegroundColor Yellow
    winget install $deps[$cmd] --silent
  } else {
    Write-Host "  OK $cmd" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install

if (!(Test-Path "config.js")) {
  $mandarin = "C:\Users\YOGA\projects\mandarin-master\config.js"
  if (Test-Path $mandarin) {
    Copy-Item $mandarin "config.js"
    Write-Host "  Copied Supabase config from Mandarin Master" -ForegroundColor Green
    Write-Host "  Verify keys in config.js are correct for PondMaster" -ForegroundColor Yellow
  } else {
    Copy-Item "config.example.js" "config.js"
    Write-Host "  Add Supabase keys to config.js manually" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "Generating icons..." -ForegroundColor Yellow
npm run generate-icons

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Run: npm run dev" -ForegroundColor White
