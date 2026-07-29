param(
    [switch]$OpenFirewall
)

$ErrorActionPreference = 'Stop'

function Get-LanIp {
    try {
        $cfg = Get-NetIPConfiguration |
            Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.IPv4Address -ne $null } |
            Select-Object -First 1
        if ($cfg -and $cfg.IPv4Address) {
            return $cfg.IPv4Address.IPAddress
        }
    } catch {
    }
    return '127.0.0.1'
}

function Start-DevTerminal {
    param(
        [Parameter(Mandatory = $true)][string]$WorkDir,
        [Parameter(Mandatory = $true)][string]$Command
    )

    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location '$WorkDir'; $Command"
    ) -PassThru
}

function Ensure-FirewallRules {
    param(
        [Parameter(Mandatory = $true)][int[]]$Ports
    )

    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )

    if (-not $isAdmin) {
        Write-Host 'No hay permisos de administrador para crear reglas de firewall.' -ForegroundColor Yellow
        Write-Host 'Ejecuta este script como Administrador con -OpenFirewall para abrir puertos en perfil privado.' -ForegroundColor Yellow
        return
    }

    foreach ($port in $Ports) {
        $ruleName = "GoShopping DEV TCP $port"
        $exists = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if (-not $exists) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private | Out-Null
        }
    }

    Write-Host 'Reglas de firewall aplicadas para perfil privado.' -ForegroundColor Green
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$stateFile = Join-Path $root '.dev-lan-state.json'
$lanIp = Get-LanIp
$hostName = $env:COMPUTERNAME

$corsOrigins = @(
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    ("http://{0}:3003" -f $hostName),
    ("http://{0}:3004" -f $hostName),
    ("http://{0}:3005" -f $hostName),
    ("http://{0}:3003" -f $lanIp),
    ("http://{0}:3004" -f $lanIp),
    ("http://{0}:3005" -f $lanIp)
) -join ','

if ($OpenFirewall) {
    Ensure-FirewallRules -Ports @(3000, 3001, 3002, 3003, 3004, 3005, 5434, 6379, 9324, 9325, 4566)
}

Write-Host 'Levantando infraestructura Docker...' -ForegroundColor Cyan
Push-Location $root
$env:CORS_ORIGINS = $corsOrigins
docker compose -f docker/docker-compose.yml up -d --build
$composeExit = $LASTEXITCODE
Pop-Location

if ($composeExit -ne 0) {
    throw 'No se pudo levantar Docker Compose. Verifica que Docker Desktop (daemon) este corriendo.'
}

Write-Host 'Iniciando servicios de aplicacion en nuevas ventanas...' -ForegroundColor Cyan

$coreCommand = '$env:PORT=''3000''; $env:DB_HOST=''127.0.0.1''; $env:DB_PORT=''5434''; $env:DB_USER=''goshopping''; $env:DB_PASSWORD=''localdev123''; $env:DB_NAME=''goshopping''; $env:DB_SSL_MODE=''disable''; $env:JWT_SECRET=''dev-jwt-secret''; $env:APP_ENV=''development''; $env:CORS_ORIGINS=''*''; go run cmd/server/main.go'

$superadminCommand = ('$env:NEXT_PUBLIC_API_URL=''http://{0}:3000''; npm run dev' -f $lanIp)
$adminCommand = ('$env:NEXT_PUBLIC_API_URL=''http://{0}:3000''; npm run dev' -f $lanIp)
$storefrontCommand = ('$env:NEXT_PUBLIC_API_URL=''http://{0}:3000''; npm run dev' -f $lanIp)

$coreProc = Start-DevTerminal -WorkDir (Join-Path $root 'apps/core') -Command $coreCommand
$integrationsProc = Start-DevTerminal -WorkDir (Join-Path $root 'apps/integrations') -Command '$env:PORT=''3001''; npm run start:dev'
$superadminProc = Start-DevTerminal -WorkDir (Join-Path $root 'apps/superadmin') -Command $superadminCommand
$adminProc = Start-DevTerminal -WorkDir (Join-Path $root 'apps/admin') -Command $adminCommand
$storefrontProc = Start-DevTerminal -WorkDir (Join-Path $root 'apps/storefront') -Command $storefrontCommand

$state = [ordered]@{
    startedAt = (Get-Date).ToString('o')
    lanIp = $lanIp
    terminals = @(
        [ordered]@{ name = 'core'; pid = $coreProc.Id; workdir = 'apps/core' },
        [ordered]@{ name = 'integrations'; pid = $integrationsProc.Id; workdir = 'apps/integrations' },
        [ordered]@{ name = 'superadmin'; pid = $superadminProc.Id; workdir = 'apps/superadmin' },
        [ordered]@{ name = 'admin'; pid = $adminProc.Id; workdir = 'apps/admin' },
        [ordered]@{ name = 'storefront'; pid = $storefrontProc.Id; workdir = 'apps/storefront' }
    )
}

$state | ConvertTo-Json -Depth 5 | Set-Content -Path $stateFile -Encoding utf8

Write-Host ''
Write-Host 'Stack iniciado. URLs locales:' -ForegroundColor Green
Write-Host '  Core:         http://localhost:3000/health'
Write-Host '  Integrations: http://localhost:3001/health'
Write-Host '  AI Engine:    http://localhost:3002/health'
Write-Host '  Superadmin:   http://localhost:3003'
Write-Host '  Admin:        http://localhost:3004'
Write-Host '  Storefront:   http://localhost:3005'

Write-Host ''
Write-Host "URLs LAN para QA:"
Write-Host ("  Core:         http://{0}:3000/health" -f $lanIp)
Write-Host ("  Integrations: http://{0}:3001/health" -f $lanIp)
Write-Host ("  AI Engine:    http://{0}:3002/health" -f $lanIp)
Write-Host ("  Superadmin:   http://{0}:3003" -f $lanIp)
Write-Host ("  Admin:        http://{0}:3004" -f $lanIp)
Write-Host ("  Storefront:   http://{0}:3005" -f $lanIp)

Write-Host ''
Write-Host 'Si QA no puede entrar, verifica que ambos equipos esten en la misma red y vuelve a correr con -OpenFirewall en PowerShell administrador.' -ForegroundColor Yellow