<# 
  Backup aplikacji "ofertownik"
  - Pakuje najważniejsze pliki i katalogi do ZIP (bez node_modules/.next itp.)
  - Zgrywa bazę PostgreSQL przy pomocy pg_dump (format .dump, opcjonalnie .sql)
  - Kopiuje .env.local do backupu
  - (Opcjonalnie) tworzy tag Gita

  Uruchom:
    pwsh -File .\scripts\backup.ps1 [-GitTag] [-AlsoPlainSql] [-BackupName "opis"]
#>

param(
  [switch]$GitTag = $false,
  [switch]$AlsoPlainSql = $false,
  [string]$BackupName = ""
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[i] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[x] $msg" -ForegroundColor Red }

# ─────────────────────────────────────────────────────────────────────────────
# 1) Ustal ścieżki i katalog docelowy
# ─────────────────────────────────────────────────────────────────────────────
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path  # zakładamy: scripts/backup.ps1
Set-Location $repoRoot

$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$baseName = "backup-$stamp"
if ($BackupName -ne "") { $baseName = "$baseName-$BackupName" }

$destDir = Join-Path $repoRoot "backups\$baseName"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Info "Repo: $repoRoot"
Write-Info "Backup dir: $destDir"

# ─────────────────────────────────────────────────────────────────────────────
# 2) Zbierz ścieżki do spakowania (białe listy zamiast wykluczeń)
# ─────────────────────────────────────────────────────────────────────────────
# Dodaj tu rzeczy specyficzne dla Twojego projektu
$includePaths = @(
  "src",
  "prisma",
  "public",
  "scripts",           # twoje skrypty narzędziowe (w tym ten)
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "next.config.js",
  "tailwind.config.js",
  "postcss.config.js",
  ".eslintrc",
  ".eslintrc.cjs",
  ".eslintrc.js",
  ".prettierrc",
  ".prettierrc.js",
  ".npmrc",
  ".nvmrc",
  "README.md"
)

# Jeśli masz katalog z uploadami plików lokalnie (zmień jeśli inny):
$uploadsDir = "uploads"
if (Test-Path $uploadsDir) { $includePaths += $uploadsDir }

# Filtrowanie istniejących pozycji:
$existing = @()
foreach ($p in $includePaths) {
  if (Test-Path $p) { $existing += (Resolve-Path $p).Path }
}

if ($existing.Count -eq 0) {
  Write-Err "Brak plików/katalogów do zarchiwizowania. Przerwano."
  exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# 3) Stwórz ZIP kodu (bez node_modules/.next itp., bo ich po prostu nie dodajemy)
# ─────────────────────────────────────────────────────────────────────────────
$zipPath = Join-Path $destDir "$baseName-code.zip"
Write-Info "Tworzę ZIP kodu: $zipPath"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $existing -DestinationPath $zipPath -CompressionLevel Optimal
Write-Ok "ZIP kodu gotowy."

# ─────────────────────────────────────────────────────────────────────────────
# 4) Skopiuj .env.local (i ewentualnie inne .env*)
# ─────────────────────────────────────────────────────────────────────────────
$envFiles = @(".env", ".env.local", ".env.development", ".env.production") | Where-Object { Test-Path $_ }
foreach ($ef in $envFiles) {
  Copy-Item $ef (Join-Path $destDir (Split-Path $ef -Leaf)) -Force
}
if ($envFiles.Count -gt 0) {
  Write-Ok "Skopiowano pliki środowiskowe: $($envFiles -join ", ")"
} else {
  Write-Warn "Nie znaleziono żadnych plików .env* — pomiń jeśli masz sekrety w zmiennych środowiskowych."
}

# ─────────────────────────────────────────────────────────────────────────────
# 5) Zrzut bazy PostgreSQL (pg_dump)
# ─────────────────────────────────────────────────────────────────────────────
function Get-DatabaseUrl {
  # 1) Zmienna środowiskowa
  if ($env:DATABASE_URL) { return $env:DATABASE_URL }

  # 2) Spróbuj wczytać z .env.local / .env
  $candidateEnvFiles = @(".env.local", ".env") | Where-Object { Test-Path $_ }
  foreach ($f in $candidateEnvFiles) {
    $lines = Get-Content -Raw -Path $f | Select-String -Pattern "^\s*DATABASE_URL\s*="
    if ($lines) {
      $line = $lines[0].ToString()
      $val = $line -replace "^\s*DATABASE_URL\s*=\s*", ""
      # usuń cudzysłowy, jeśli są
      $val = $val.Trim().Trim('"').Trim("'")
      if ($val) { return $val }
    }
  }
  return $null
}

$dbUrl = Get-DatabaseUrl
if ($null -ne $dbUrl) {
  $dumpPath = Join-Path $destDir "$baseName-db.dump"
  Write-Info "Uruchamiam pg_dump (format=custom) → $dumpPath"

  try {
    # Uwaga: wymaga pg_dump w PATH
    & pg_dump --format=custom --no-owner --file="$dumpPath" "$dbUrl" | Out-Null
    Write-Ok "Dump .dump gotowy."
  } catch {
    Write-Err "pg_dump nie powiódł się: $($_.Exception.Message)"
  }

  if ($AlsoPlainSql) {
    $sqlPath = Join-Path $destDir "$baseName-db.sql"
    Write-Info "Dodatkowo generuję SQL dump → $sqlPath"
    try {
      & pg_dump --format=plain --no-owner --file="$sqlPath" "$dbUrl" | Out-Null
      Write-Ok "Dump .sql gotowy."
    } catch {
      Write-Err "pg_dump (plain) nie powiódł się: $($_.Exception.Message)"
    }
  }
} else {
  Write-Warn "Nie znaleziono DATABASE_URL (ani w env, ani w .env/.env.local). Pomijam dump bazy."
}

# ─────────────────────────────────────────────────────────────────────────────
# 6) (Opcjonalnie) tag Gita
# ─────────────────────────────────────────────────────────────────────────────
if ($GitTag) {
  try {
    # sprawdź czy to repo
    & git rev-parse --is-inside-work-tree | Out-Null
    $tag = $baseName
    Write-Info "Tworzę tag Gita: $tag"
    & git add -A
    & git commit -m "backup: $tag" | Out-Null
    & git tag $tag
    Write-Ok "Tag $tag utworzony. (Nie pushuję automatycznie.)"
  } catch {
    Write-Warn "Git nie jest dostępny albo to nie repo. Pomijam tagging. ($($_.Exception.Message))"
  }
}

Write-Host ""
Write-Ok "Backup zakończony."
Write-Info "Folder: $destDir"
if (Test-Path $zipPath) { Write-Info "ZIP: $zipPath" }
