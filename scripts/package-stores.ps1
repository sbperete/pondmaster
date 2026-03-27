# PondMaster — Package for Stores
Write-Host "Building Store Packages via PWABuilder..." -ForegroundColor Cyan
$liveUrl = "https://sbperete.github.io/pondmaster/"

npm install -g @pwabuilder/cli 2>$null
pwabuilder build --url $liveUrl --outputDirectory platforms/pwa-builder

Write-Host ""
Write-Host "Packages ready in platforms/pwa-builder/" -ForegroundColor Green
Write-Host ""
Write-Host "SUBMISSION STEPS:" -ForegroundColor Cyan
Write-Host "  Microsoft Store: partner.microsoft.com/dashboard"
Write-Host "    Upload: platforms/pwa-builder/windows/*.msixbundle"
Write-Host "  Google Play:     play.google.com/console"
Write-Host "    Upload: platforms/pwa-builder/android/*.aab"
Write-Host "  Amazon:          developer.amazon.com"
Write-Host "    Upload: platforms/pwa-builder/android/*.apk"
Write-Host "  Samsung:         Email pwasupport@samsung.com with URL: $liveUrl"
Write-Host "  Huawei:          developer.huawei.com"
Write-Host "    Upload APK from Android build"
Write-Host "  AppSumo:         sell.appsumo.com"
Write-Host "    Use: platforms/appsumo/listing/description.md"
