# Production Workflows

This directory contains the only n8n workflow exports allowed for production
publication.

## Canonical Files

- `workflow-jurema-main.final-hardened.json`
- `workflow-jurema-consultar-imoveis.final-hardened.json`
- `workflow-jurema-enviar-contrato.final-hardened.json`

## Required Runtime Environment

The Ju main workflow expects these n8n environment variables:

- `YZI_RUNTIME_API_URL`
- `YZI_RUNTIME_INTERNAL_KEY`

The Runtime Gateway endpoint is:

```text
POST ${YZI_RUNTIME_API_URL}/api/runtime/ju/state
```

The workflow sends:

- `x-runtime-key`
- `x-correlation-id`

## Production Guardrail

If a workflow is not in this directory, it is not canonical production material.
