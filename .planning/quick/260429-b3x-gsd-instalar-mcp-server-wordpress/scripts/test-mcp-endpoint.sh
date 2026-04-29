#!/usr/bin/env bash
# test-mcp-endpoint.sh — valida o endpoint MCP do WordPress sem alterar conteudo
#
# Uso: bash scripts/test-mcp-endpoint.sh
# (ou: chmod +x scripts/test-mcp-endpoint.sh && ./scripts/test-mcp-endpoint.sh)
#
# Pre-requisito:
#   cp .env.mcp.example .env.mcp
#   Editar .env.mcp e preencher WP_APP_PASSWORD com o token real
#
# Este script realiza APENAS operacoes de leitura (GET/discovery).
# Nenhum post, pagina ou conteudo sera criado, editado ou apagado.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.mcp"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERRO: $ENV_FILE nao encontrado." >&2
  echo "Copie .env.mcp.example para .env.mcp e preencha WP_APP_PASSWORD." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${WP_URL:?WP_URL nao definida em .env.mcp}"
: "${WP_USER:?WP_USER nao definida em .env.mcp}"
: "${WP_APP_PASSWORD:?WP_APP_PASSWORD nao definida em .env.mcp}"

# Remover espacos visuais do Application Password (WP gera no formato "xxxx xxxx xxxx")
WP_APP_PASSWORD_CLEAN="${WP_APP_PASSWORD// /}"

echo "=== 1. Verificar namespace mcp/v1 (sem autenticacao, GET publico) ==="
NS_CHECK=$(curl -sS "${WP_URL}/wp-json/" | grep -o '"mcp/v1"' || true)
if [[ -z "$NS_CHECK" ]]; then
  echo "FALHA: namespace mcp/v1 nao encontrado em ${WP_URL}/wp-json/" >&2
  echo "Verifique se o plugin esta ativo. Se necessario, re-salve os permalinks em" >&2
  echo "WP Admin > Configuracoes > Links permanentes." >&2
  exit 1
fi
echo "OK: namespace mcp/v1 presente"
echo

echo "=== 2. GET /wp-json/mcp/v1/ (autenticado — discovery) ==="
HTTP_CODE=$(curl -sS -o /tmp/mcp-discovery.json -w "%{http_code}" \
  -u "${WP_USER}:${WP_APP_PASSWORD_CLEAN}" \
  "${WP_URL}/wp-json/mcp/v1/")
echo "HTTP $HTTP_CODE"
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "Resposta (primeiros 500 chars):"
  head -c 500 /tmp/mcp-discovery.json
  echo
  echo "OK: endpoint MCP autenticado responde 200"
else
  echo "FALHA: esperado 200, recebido $HTTP_CODE" >&2
  echo "Conteudo da resposta:" >&2
  cat /tmp/mcp-discovery.json >&2
  exit 1
fi
echo

echo "=== 3. GET /wp-json/mcp/v1/ (SEM autenticacao — deve retornar 401 ou 403) ==="
HTTP_CODE_NOAUTH=$(curl -sS -o /dev/null -w "%{http_code}" "${WP_URL}/wp-json/mcp/v1/")
echo "HTTP $HTTP_CODE_NOAUTH (esperado: 401 ou 403)"
if [[ "$HTTP_CODE_NOAUTH" == "401" || "$HTTP_CODE_NOAUTH" == "403" ]]; then
  echo "OK: endpoint protegido (nao acessivel sem autenticacao)"
else
  echo "AVISO: endpoint respondeu $HTTP_CODE_NOAUTH sem autenticacao." >&2
  echo "Verifique a configuracao de seguranca do plugin." >&2
fi
echo

echo "=== Validacao concluida (somente leitura — nenhum conteudo foi alterado) ==="
