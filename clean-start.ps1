#!/usr/bin/env pwsh
# clean-start.ps1 — Starts Next.js dev server (pass -ClearCache to wipe build cache)

param(
    [switch]$ClearCache = $false
)

if ($ClearCache) {
    Write-Host "`n🧹 Cleaning Next.js build cache (-ClearCache specified)..." -ForegroundColor Cyan

    if (Test-Path "frontend\.next") {
        Remove-Item -Recurse -Force "frontend\.next"
        Write-Host "  ✅ Removed frontend\.next" -ForegroundColor Green
    }

    if (Test-Path "frontend\node_modules\.cache") {
        Remove-Item -Recurse -Force "frontend\node_modules\.cache"
        Write-Host "  ✅ Removed frontend\node_modules\.cache" -ForegroundColor Green
    }
} else {
    Write-Host "`n⚡ Fast Dev Start: Preserving Next.js cache (use .\clean-start.ps1 -ClearCache to force wipe)" -ForegroundColor DarkGray
}

Write-Host "`n🚀 Starting Next.js dev server..." -ForegroundColor Cyan
Write-Host "   (Do a hard reload in browser with Ctrl+Shift+R after it's ready)`n" -ForegroundColor DarkGray

Set-Location -Path "frontend"
npm run dev

