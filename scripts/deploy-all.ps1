# PondMaster — Deploy All
param([string]$message = "chore: deploy update")

Write-Host "Deploying PondMaster..." -ForegroundColor Cyan

git add .
git commit -m $message
git push origin main
Write-Host "  GitHub Pages deploying via Actions" -ForegroundColor Green

# Try Cloudflare
$cfToken = $env:CLOUDFLARE_API_TOKEN
if (!$cfToken) {
  $envFile = "C:\Users\YOGA\projects\mandarin-master\.env"
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Select-String "CLOUDFLARE_API_TOKEN"
    if ($line) { $cfToken = $line.Line.Split("=",2)[1].Trim() }
  }
}

if ($cfToken) {
  $env:CLOUDFLARE_API_TOKEN = $cfToken
  npx wrangler pages deploy docs --project-name=pondmaster
  Write-Host "  Cloudflare deployed" -ForegroundColor Green
} else {
  Write-Host "  Set CLOUDFLARE_API_TOKEN to deploy to Cloudflare" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "GitHub Pages: https://sbperete.github.io/pondmaster/" -ForegroundColor White
Write-Host "Cloudflare:   https://pondmaster.pages.dev" -ForegroundColor White
