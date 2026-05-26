$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pkg = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$ver = $pkg.version
$dist = Join-Path $root 'dist'
$outDir = Join-Path $root 'release'
$zip = Join-Path $outDir "TextFromImage-$ver-chrome-edge-store.zip"
$zipAlias = Join-Path $outDir "TextFromImage-$ver.zip"

if (-not (Test-Path $dist)) {
  Write-Error 'dist/ not found. Run: npm run build'
}
if (-not (Test-Path (Join-Path $dist 'manifest.json'))) {
  Write-Error 'dist/manifest.json missing. Run: npm run build'
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $zipAlias) { Remove-Item $zipAlias -Force }

Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zip -Force
Copy-Item -Path $zip -Destination $zipAlias -Force
Write-Host "OK: $zip"
Write-Host "OK: $zipAlias"

$iconSrc = Join-Path $root 'public\icons\icon-128.png'
$iconOut = Join-Path $outDir 'chrome-web-store-icon-128x128.png'
if (Test-Path $iconSrc) {
  Copy-Item -Path $iconSrc -Destination $iconOut -Force
  Write-Host "OK: $iconOut"
}

$tilesDir = Join-Path $root 'store-assets\cws-ready'
$tileSmall = Join-Path $tilesDir 'tile-small-440x280.png'
$tileMarq = Join-Path $tilesDir 'tile-marquee-1400x560.png'
if (Test-Path $tileSmall) {
  Copy-Item -Path $tileSmall -Destination (Join-Path $outDir 'chrome-web-store-tile-small-440x280.png') -Force
  Write-Host 'OK: copied small tile to release\'
}
if (Test-Path $tileMarq) {
  Copy-Item -Path $tileMarq -Destination (Join-Path $outDir 'chrome-web-store-marquee-1400x560.png') -Force
  Write-Host 'OK: copied marquee tile to release\'
}

$screens = Get-ChildItem -Path $tilesDir -Filter '*-cws-1280x800.png' -ErrorAction SilentlyContinue
$i = 1
foreach ($s in $screens) {
  $dest = Join-Path $outDir ("chrome-web-store-screenshot-{0}.png" -f $i)
  Copy-Item -Path $s.FullName -Destination $dest -Force
  Write-Host "OK: $dest"
  $i++
}

$sizeMb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Package size: ${sizeMb} MB (Tesseract models included)"
