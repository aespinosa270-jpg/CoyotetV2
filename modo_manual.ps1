# modo_manual.ps1 - Coyote Textil
# Prende/apaga el MODO MANUAL (apaga respuestas automaticas del bot).
# Lee UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN del .env(.local).
# Uso:
#   .\modo_manual.ps1 on       -> activa modo manual (bot deja de responder)
#   .\modo_manual.ps1 off      -> desactiva (bot vuelve a responder)
#   .\modo_manual.ps1 status   -> muestra el estado actual
param([Parameter(Mandatory=$true)][ValidateSet("on","off","status")][string]$action)
$ErrorActionPreference = "Stop"
$KEY = "v2:modo_manual"

function Get-EnvVar([string]$name) {
  foreach ($f in @(".env.local", ".env")) {
    if (Test-Path -LiteralPath $f) {
      foreach ($line in Get-Content -LiteralPath $f) {
        if ($line -match "^\s*$([regex]::Escape($name))\s*=\s*(.+?)\s*$") {
          return $matches[1].Trim().Trim('"').Trim("'")
        }
      }
    }
  }
  return $null
}
$url   = Get-EnvVar "UPSTASH_REDIS_REST_URL"
$token = Get-EnvVar "UPSTASH_REDIS_REST_TOKEN"
if (-not $url -or -not $token) {
  Write-Host "ERROR: no encontre UPSTASH_REDIS_REST_URL / TOKEN en .env(.local)" -ForegroundColor Red
  exit 1
}
$headers = @{ Authorization = "Bearer $token" }
function Invoke-Upstash([string]$cmdPath) {
  return (Invoke-RestMethod -Uri "$url/$cmdPath" -Headers $headers -Method Post).result
}
switch ($action) {
  "on" {
    Invoke-Upstash "set/$KEY/1" | Out-Null
    Write-Host "MODO MANUAL ACTIVADO. El bot NO responde. Atiende desde el inbox." -ForegroundColor Yellow
  }
  "off" {
    Invoke-Upstash "del/$KEY" | Out-Null
    Write-Host "MODO MANUAL DESACTIVADO. El bot vuelve a responder automaticamente." -ForegroundColor Green
  }
  "status" {
    $v = Invoke-Upstash "get/$KEY"
    if ($v -eq "1") { Write-Host "Estado: MODO MANUAL ACTIVO (bot apagado)" -ForegroundColor Yellow }
    else            { Write-Host "Estado: Bot respondiendo normal (modo manual OFF)" -ForegroundColor Green }
  }
}