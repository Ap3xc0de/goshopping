$ErrorActionPreference = 'Continue'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$stateFile = Join-Path $root '.dev-lan-state.json'

function Stop-ByPid {
    param(
        [Parameter(Mandatory = $true)][int]$Pid,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $exists = Get-Process -Id $Pid -ErrorAction SilentlyContinue
    if ($exists) {
        Write-Host ("Deteniendo {0} (PID {1})..." -f $Name, $Pid)
        taskkill /PID $Pid /T /F | Out-Null
    }
}

function Stop-ByPort {
    param(
        [Parameter(Mandatory = $true)][int]$Port
    )

    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        return
    }

    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($ownerPid in $pids) {
        if ($ownerPid -and $ownerPid -gt 0 -and $ownerPid -ne $PID) {
            Write-Host ("Deteniendo proceso en puerto {0} (PID {1})..." -f $Port, $ownerPid)
            taskkill /PID $ownerPid /T /F | Out-Null
        }
    }
}

if (Test-Path $stateFile) {
    try {
        $state = Get-Content $stateFile -Raw | ConvertFrom-Json
        foreach ($t in $state.terminals) {
            Stop-ByPid -Pid ([int]$t.pid) -Name $t.name
        }
    } catch {
        Write-Host 'No se pudo leer el archivo de estado; se aplicara fallback por puertos.' -ForegroundColor Yellow
    }
}

# Fallback para procesos huérfanos
$ports = @(3000, 3001, 3002, 3003, 3004, 3005)
foreach ($port in $ports) {
    Stop-ByPort -Port $port
}

Write-Host 'Deteniendo contenedores Docker del proyecto...' -ForegroundColor Cyan
Push-Location $root
try {
    docker compose -f docker/docker-compose.yml down
} finally {
    Pop-Location
}

if (Test-Path $stateFile) {
    Remove-Item $stateFile -Force
}

Write-Host 'Stack LAN detenido.' -ForegroundColor Green
