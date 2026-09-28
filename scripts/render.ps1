param([string]$QuartoPath = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $QuartoPath) {
  $installedQuarto = Get-Command quarto -ErrorAction SilentlyContinue
  if ($installedQuarto) { $QuartoPath = $installedQuarto.Source }
  else { $QuartoPath = 'C:\Program Files\RStudio\resources\app\bin\quarto\bin\quarto.exe' }
}
if (-not (Test-Path -LiteralPath $QuartoPath)) { throw 'Quarto was not found. Supply -QuartoPath with the installed executable path.' }
# Only remove generated output within this project; stale template pages must not ship.
$outputPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'docs'))
if ($outputPath -ne ($projectRoot + '\docs')) { throw 'Unexpected output path.' }
if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath -Recurse -Force }
Push-Location $projectRoot
try {
  & $QuartoPath render
  if ($LASTEXITCODE -ne 0) { throw 'Quarto render failed.' }
} finally { Pop-Location }
