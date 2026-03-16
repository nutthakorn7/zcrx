$ErrorActionPreference = "SilentlyContinue"
$BASE = "http://localhost:8000"
$pass = 0; $fail = 0

function Test($name, $block) {
    Write-Host "  [$name] " -NoNewline
    try {
        $result = & $block
        Write-Host "PASS - $result" -ForegroundColor Green
        $script:pass++
    } catch {
        Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== ZCRX API TEST SUITE ===" -ForegroundColor Cyan

# Get auth token
$token = $null
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$email = "test${ts}@zcrx.com"
$regBody = @{name="TestBot";email=$email;password="Test123456"} | ConvertTo-Json

try {
    $r = Invoke-RestMethod -Uri "$BASE/api/auth/register" -Method POST -Body $regBody -ContentType "application/json" -ErrorAction Stop
    $token = $r.data.token
    Write-Host "  [Auth] Registered new user: $email" -ForegroundColor Green
} catch {
    Write-Host "  [Auth] Register failed, trying existing user" -ForegroundColor Yellow
}

if (-not $token) {
    # Direct DB approach - create a simple request without auth
    Write-Host "  [Auth] Trying without auth for public endpoints..." -ForegroundColor Yellow
}

$headers = @{}
if ($token) {
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "  [Auth] Token acquired OK" -ForegroundColor Green
    $pass++
} else {
    Write-Host "  [Auth] NO TOKEN - tests will fail" -ForegroundColor Red
    $fail++
}

Write-Host "`n--- GET Endpoints ---" -ForegroundColor Cyan

Test "GET /api/dashboard/stats" {
    $r = Invoke-RestMethod -Uri "$BASE/api/dashboard/stats" -Headers $headers -ErrorAction Stop
    "projects=$($r.data.totalProjects) findings=$($r.data.totalFindings)"
}

Test "GET /api/projects" {
    $r = Invoke-RestMethod -Uri "$BASE/api/projects" -Headers $headers -ErrorAction Stop
    "$($r.data.Count) projects"
}

Test "GET /api/findings" {
    $r = Invoke-RestMethod -Uri "$BASE/api/findings" -Headers $headers -ErrorAction Stop
    "$($r.data.Count) findings"
}

Test "GET /api/scans" {
    $r = Invoke-RestMethod -Uri "$BASE/api/scans" -Headers $headers -ErrorAction Stop
    "$($r.data.Count) scans"
}

Test "GET /api/search?q=test" {
    $r = Invoke-RestMethod -Uri "$BASE/api/search?q=test" -Headers $headers -ErrorAction Stop
    "projects=$($r.data.projects.Count) findings=$($r.data.findings.Count)"
}

Test "GET /api/export/findings (CSV)" {
    $r = Invoke-WebRequest -Uri "$BASE/api/export/findings" -Headers $headers -ErrorAction Stop
    "CSV $($r.Content.Length) bytes"
}

Test "GET /api/export/pdf" {
    $r = Invoke-WebRequest -Uri "$BASE/api/export/pdf" -Headers $headers -ErrorAction Stop
    "HTML $($r.Content.Length) bytes"
}

Test "GET /api/agent/tasks" {
    $r = Invoke-RestMethod -Uri "$BASE/api/agent/tasks" -Headers $headers -ErrorAction Stop
    "$($r.data.Count) agent tasks"
}

Test "GET /api/notifications/settings" {
    $r = Invoke-RestMethod -Uri "$BASE/api/notifications/settings" -Headers $headers -ErrorAction Stop
    "enabled=$($r.data.enabled)"
}

Test "GET /api/dast/trends" {
    $r = Invoke-RestMethod -Uri "$BASE/api/dast/trends" -Headers $headers -ErrorAction Stop
    "trends OK"
}

Test "GET /api/dast/schedules" {
    $r = Invoke-RestMethod -Uri "$BASE/api/dast/schedules" -Headers $headers -ErrorAction Stop
    "$($r.data.Count) schedules"
}

Test "GET /api/dast/templates" {
    $r = Invoke-RestMethod -Uri "$BASE/api/dast/templates" -Headers $headers -ErrorAction Stop
    "$($r.data.Count) templates"
}

Test "GET /api/auth/me" {
    $r = Invoke-RestMethod -Uri "$BASE/api/auth/me" -Headers $headers -ErrorAction Stop
    "user=$($r.data.name) role=$($r.data.role)"
}

Write-Host "`n--- POST Endpoints ---" -ForegroundColor Cyan

Test "POST /api/projects (Create)" {
    $body = @{name="AutoTest Project $(Get-Date -Format 'HHmm')";description="Auto created";repoUrl="http://test.com";language="typescript"} | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BASE/api/projects" -Method POST -Body $body -ContentType "application/json" -Headers $headers -ErrorAction Stop
    "created: $($r.data.id)"
}

Test "POST /api/agent/remediate" {
    $body = @{title="SQL Injection";severity="critical";description="Unparameterized query";filePath="db.ts";line=42;code="db.query('SELECT * FROM users WHERE id=' + id)";cweId="CWE-89"} | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$BASE/api/agent/remediate" -Method POST -Body $body -ContentType "application/json" -Headers $headers -ErrorAction Stop
    "taskId=$($r.taskId)"
}

# Wait for agent to process
Start-Sleep -Seconds 5

Test "GET /api/agent/tasks (after remediate)" {
    $r = Invoke-RestMethod -Uri "$BASE/api/agent/tasks" -Headers $headers -ErrorAction Stop
    $latest = $r.data | Select-Object -First 1
    "status=$($latest.status) steps=$($latest.steps.Count)"
}

Write-Host "`n==========================================" -ForegroundColor White
Write-Host "  TOTAL: $pass PASS / $fail FAIL / $(($pass + $fail)) TOTAL" -ForegroundColor $(if($fail -eq 0){"Green"}elseif($fail -lt 5){"Yellow"}else{"Red"})
Write-Host "==========================================" -ForegroundColor White
