# Builda tutti i 10 mini-tool per Windows e raccoglie gli installer in dist-installers/
# Uso (da PowerShell):  .\scripts\build-all-windows.ps1
#
# Prerequisiti:
# - Rust (cargo, rustc) installato e nel PATH
# - Visual Studio 2022 con "Desktop development with C++" workload
# - pnpm install eseguito una volta
#
# Tempo stimato: ~30 min la prima volta (compila ~400 crate Tauri),
# ~5-10 min le volte successive grazie alla cache di Cargo.

$ErrorActionPreference = "Stop"
$env:VITE_BYPASS_LICENSE = "1"

$apps = @(
  "estrattore-fatture",
  "validatore-anagrafiche",
  "pulitore-anagrafiche",
  "generatore-documenti",
  "pdf-toolkit-pro",
  "scadenziario-fiscale",
  "riconciliazione-bancaria",
  "excel-auditor",
  "catalogo-generator",
  "ai-aziendale-locale"
)

# Cartella di output unica
$outDir = Join-Path $PSScriptRoot "..\dist-installers"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$startTime = Get-Date
$results = @()

foreach ($app in $apps) {
  $appStart = Get-Date
  Write-Host ""
  Write-Host "════════════════════════════════════════════════════════════════"
  Write-Host "  Building: $app"
  Write-Host "════════════════════════════════════════════════════════════════"

  $exitCode = 0
  try {
    pnpm --filter "@mini-tools/$app" tauri:build
    if ($LASTEXITCODE -ne 0) { $exitCode = $LASTEXITCODE; throw "tauri:build exit $LASTEXITCODE" }
  } catch {
    $exitCode = 1
    Write-Host "  ✗ FAILED: $_" -ForegroundColor Red
  }

  $elapsed = (Get-Date) - $appStart
  if ($exitCode -eq 0) {
    # Copia gli output bundle in dist-installers
    $bundleDir = "apps\$app\src-tauri\target\release\bundle"
    if (Test-Path $bundleDir) {
      $found = @()
      Get-ChildItem -Recurse -Path $bundleDir -Include *.msi, *.exe -File |
        Where-Object { $_.FullName -match "(msi|nsis)" } |
        ForEach-Object {
          $dest = Join-Path $outDir $_.Name
          Copy-Item $_.FullName $dest -Force
          $found += $_.Name
        }
      Write-Host "  ✓ DONE in $($elapsed.ToString('mm\:ss')) — $($found -join ', ')" -ForegroundColor Green
      $results += [pscustomobject]@{ App = $app; Status = "OK"; Time = $elapsed.ToString('mm\:ss'); Files = $found -join ', ' }
    } else {
      Write-Host "  ⚠ Build ok ma bundle dir non trovata: $bundleDir" -ForegroundColor Yellow
      $results += [pscustomobject]@{ App = $app; Status = "NO_BUNDLE"; Time = $elapsed.ToString('mm\:ss'); Files = "" }
    }
  } else {
    $results += [pscustomobject]@{ App = $app; Status = "FAIL"; Time = $elapsed.ToString('mm\:ss'); Files = "" }
  }
}

$total = (Get-Date) - $startTime

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════"
Write-Host "  RIEPILOGO BUILD"
Write-Host "════════════════════════════════════════════════════════════════"
$results | Format-Table -AutoSize
Write-Host ""
Write-Host "Tempo totale: $($total.ToString('hh\:mm\:ss'))"
Write-Host "Installer raccolti in: $((Resolve-Path $outDir).Path)"
Write-Host ""
Get-ChildItem $outDir | Format-Table Name, @{Name="Size MB"; Expression={[math]::Round($_.Length/1MB, 1)}}, LastWriteTime -AutoSize
