# test-mcp-endpoint.ps1 — valida o endpoint MCP do WordPress sem alterar conteudo
#
# Uso: ./scripts/test-mcp-endpoint.ps1
#
# Pre-requisito:
#   Copy-Item .env.mcp.example .env.mcp
#   Editar .env.mcp e preencher WP_APP_PASSWORD com o token real
#
# Este script realiza APENAS operacoes de leitura (GET/discovery).
# Nenhum post, pagina ou conteudo sera criado, editado ou apagado.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir "..\.env.mcp"

if (-not (Test-Path $envFile)) {
    Write-Error "$envFile nao encontrado. Copie .env.mcp.example para .env.mcp e preencha WP_APP_PASSWORD."
    exit 1
}

# Carregar variaveis do .env.mcp
Get-Content $envFile | Where-Object { $_ -match "^\s*([A-Z_]+)\s*=\s*(.+)$" } | ForEach-Object {
    if ($_ -match "^\s*([A-Z_]+)\s*=\s*(.+)$") {
        $varName = $matches[1]
        $varValue = $matches[2].Trim().Trim('"').Trim("'")
        Set-Variable -Name $varName -Value $varValue -Scope Script
    }
}

if (-not $WP_URL -or -not $WP_USER -or -not $WP_APP_PASSWORD) {
    Write-Error "WP_URL, WP_USER e WP_APP_PASSWORD sao obrigatorias em .env.mcp"
    exit 1
}

# Remover espacos visuais do Application Password
$cleanPwd = $WP_APP_PASSWORD -replace '\s', ''
$pair = "$WP_USER`:$cleanPwd"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($pair)
$base64 = [Convert]::ToBase64String($bytes)
$authHeaders = @{ Authorization = "Basic $base64" }

# ---------------------------------------------------------------------------
Write-Host "=== 1. Verificar namespace mcp/v1 (sem autenticacao, GET publico) ===" -ForegroundColor Cyan
try {
    $rootResp = Invoke-RestMethod -Uri "$WP_URL/wp-json/" -Method Get -ErrorAction Stop
    if ($rootResp.namespaces -contains "mcp/v1") {
        Write-Host "OK: namespace mcp/v1 presente" -ForegroundColor Green
    } else {
        Write-Error "FALHA: namespace mcp/v1 nao encontrado em $WP_URL/wp-json/`nVerifique se o plugin esta ativo e re-salve os permalinks."
        exit 1
    }
} catch {
    Write-Error "FALHA ao acessar $WP_URL/wp-json/: $($_.Exception.Message)"
    exit 1
}

Write-Host ""

# ---------------------------------------------------------------------------
Write-Host "=== 2. GET /wp-json/mcp/v1/ (autenticado — discovery) ===" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri "$WP_URL/wp-json/mcp/v1/" -Method Get -Headers $authHeaders -ErrorAction Stop
    Write-Host "HTTP $($resp.StatusCode)"
    $preview = $resp.Content.Substring(0, [Math]::Min(500, $resp.Content.Length))
    Write-Host "Resposta (primeiros 500 chars):"
    Write-Host $preview
    Write-Host "OK: endpoint MCP autenticado respondeu 200" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    Write-Error "FALHA: esperado 200, recebido $statusCode`n$($_.Exception.Message)"
    exit 1
}

Write-Host ""

# ---------------------------------------------------------------------------
Write-Host "=== 3. GET /wp-json/mcp/v1/ (SEM autenticacao — esperado 401 ou 403) ===" -ForegroundColor Cyan
try {
    $respNoAuth = Invoke-WebRequest -Uri "$WP_URL/wp-json/mcp/v1/" -Method Get -ErrorAction Stop
    Write-Warning "AVISO: endpoint respondeu $($respNoAuth.StatusCode) sem autenticacao. Verifique a configuracao de seguranca do plugin."
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 401 -or $code -eq 403) {
        Write-Host "OK: endpoint protegido (HTTP $code)" -ForegroundColor Green
    } else {
        Write-Warning "Codigo inesperado sem autenticacao: $code"
    }
}

Write-Host ""
Write-Host "=== Validacao concluida (somente leitura — nenhum conteudo foi alterado) ===" -ForegroundColor Cyan
