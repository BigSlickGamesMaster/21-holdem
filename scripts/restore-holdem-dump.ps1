param(
    [Parameter(Mandatory = $true)]
    [string]$DumpPath,

    [string]$DatabaseName = "holdem",

    [switch]$StartAdminStack
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $workspaceRoot

$resolvedDumpPath = (Resolve-Path $DumpPath).Path
$dumpItem = Get-Item $resolvedDumpPath

Write-Host "Starting local Mongo and Redis containers..."
docker compose up -d mongodb redis | Out-Host

Write-Host "Waiting for MongoDB to accept connections..."
for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
        $pingResult = docker compose exec -T mongodb mongosh --quiet --eval "db.runCommand({ ping: 1 }).ok" 2>$null
        if (("$pingResult").Trim() -eq "1") {
            break
        }
    } catch {}

    if ($attempt -eq 30) {
        throw "MongoDB did not become ready in time."
    }

    Start-Sleep -Seconds 2
}

Write-Host "Dropping local database '$DatabaseName' before restore..."
docker compose exec -T mongodb mongosh --quiet $DatabaseName --eval "db.dropDatabase()" | Out-Host

$networkName = "bigslickgames_default"

if ($dumpItem.PSIsContainer) {
    $mountedPath = "/dump"
    $dbSubdirectory = Join-Path $resolvedDumpPath $DatabaseName
    if (Test-Path $dbSubdirectory) {
        $restoreTarget = "/dump/$DatabaseName"
    } else {
        $restoreTarget = $mountedPath
    }

    Write-Host "Restoring dump directory '$resolvedDumpPath' into local MongoDB..."
    docker run --rm `
        --network $networkName `
        -v "${resolvedDumpPath}:${mountedPath}:ro" `
        mongo:7 `
        mongorestore --host mongodb --drop --db $DatabaseName $restoreTarget | Out-Host
} else {
    $dumpDirectory = Split-Path -Parent $resolvedDumpPath
    $dumpFileName = Split-Path -Leaf $resolvedDumpPath
    $mountedPath = "/dump"

    Write-Host "Restoring archive '$resolvedDumpPath' into local MongoDB..."
    docker run --rm `
        --network $networkName `
        -v "${dumpDirectory}:${mountedPath}:ro" `
        mongo:7 `
        mongorestore --host mongodb --drop --archive="$mountedPath/$dumpFileName" --gzip | Out-Host
}

if ($StartAdminStack) {
    Write-Host "Starting admin stack against restored local data..."
    docker compose up -d admin-backend admin-frontend | Out-Host
}

Write-Host "Restore complete."
Write-Host "Admin frontend: http://localhost:3001"
Write-Host "Game frontend: http://localhost:3100"
