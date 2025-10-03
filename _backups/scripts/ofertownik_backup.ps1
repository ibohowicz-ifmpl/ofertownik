Param(
    [string]$ProjectPath = "C:\Projekty\ofertownik",
    [string]$BackupRoot  = "C:\Projekty\ofertownik\_backups"
)
# === Ofertownik quick snapshot (files + env) ===
$stamp   = Get-Date -Format "yyyyMMdd-HHmmss"
$destDir = Join-Path $BackupRoot "ofertownik-$stamp"
$zipPath = "$destDir.zip"

New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

# What to include (relative to $ProjectPath)
$include = @(
  "package.json","pnpm-lock.yaml","yarn.lock","package-lock.json",
  "tsconfig.json","next.config.*","postcss.config.*","tailwind.config.*",
  ".eslint*",".prettier*",".nvmrc",".node-version",
  ".env",".env.local",".env.development",".env.production",".env.test",".env.*.local",
  "src","prisma","public","scripts","lib","config"
)

# What to exclude
$excludePatterns = @("node_modules","\.(next|git|turbo|vercel)$",".idea",".vscode","dist","coverage")

# Stage filtered files to temp directory before zipping
$staging = Join-Path $BackupRoot ("_staging_" + $stamp)
New-Item -ItemType Directory -Path $staging -Force | Out-Null

function Should-Exclude($fullPath, $root, $patterns) {
    $rel = $fullPath.Substring($root.Length).TrimStart('\','/')
    foreach ($p in $patterns) {
        if ($rel -match $p) { return $true }
    }
    return $false
}

foreach ($pat in $include) {
    $glob = Join-Path $ProjectPath $pat
    $items = Get-ChildItem -Path $glob -Force -Recurse -ErrorAction SilentlyContinue
    foreach ($item in $items) {
        if (Should-Exclude $item.FullName $ProjectPath $excludePatterns) { continue }
        $rel = $item.FullName.Substring($ProjectPath.Length).TrimStart('\','/')
        $target = Join-Path $staging $rel
        New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
        Copy-Item $item.FullName -Destination $target -Force
    }
}

# Create ZIP
Add-Type -AssemblyName 'System.IO.Compression.FileSystem'
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $zipPath)

# Cleanup staging
Remove-Item $staging -Recurse -Force

Write-Host "Backup created: $zipPath"

# === OPTIONAL: quick Git snapshot (commit + tag) ===
$gitDir = Join-Path $ProjectPath ".git"
if (Test-Path $gitDir) {
    Push-Location $ProjectPath
    git add -A | Out-Null
    git commit -m ("Backup snapshot " + $stamp) | Out-Null
    git tag ("backup-" + $stamp) | Out-Null
    Pop-Location
    Write-Host ("Git commit and tag created: backup-" + $stamp)
}

# === OPTIONAL: DB dump (PostgreSQL/Neon) — fill and uncomment ===
# $env:PGPASSWORD="***"
# & "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" `
#   -h <host> -U <user> -d <database> -F c `
#   -f (Join-Path $BackupRoot ("db-" + $stamp + ".dump"))
