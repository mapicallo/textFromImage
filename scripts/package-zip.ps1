$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$outDir = Join-Path $root 'release'
$version = '0.1.0'

if (-not (Test-Path $dist)) {
  Write-Error 'Run npm run build first'
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$zipName = "TextFromImage-$version-chrome-edge-store.zip"
$zipPath = Join-Path $outDir $zipName

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zipPath -Force
Write-Host "OK: $zipPath"

$iconSrc = Join-Path $root 'public\icons\icon-128.png'
$iconOut = Join-Path $outDir 'chrome-web-store-icon-128x128.png'
if (Test-Path $iconSrc) {
  Copy-Item -Path $iconSrc -Destination $iconOut -Force
  Write-Host "OK: $iconOut"
}
