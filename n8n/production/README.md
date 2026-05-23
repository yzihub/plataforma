# Production Workflows

This directory contains the only n8n workflow exports allowed for production
publication.

## Canonical Files

- `workflow-jurema-main.final-hardened.json`
- `workflow-jurema-consultar-imoveis.final-hardened.json`
- `workflow-jurema-enviar-contrato.final-hardened.json`

## Lightweight Hot-Path

The Ju main workflow no longer requires Agno or Runtime Gateway in the
mandatory WhatsApp hot-path.

Operational path:

```text
Evolution -> n8n -> Redis/Supabase context -> tools -> GPT-4.1 -> response -> persistence -> Evolution
```

Runtime Gateway remains available outside this workflow for research, shadow
evaluation, replay, audits, and future advanced flows. It is not a required
dependency for publishing or executing the production Ju WhatsApp workflow.

## Production Guardrail

If a workflow is not in this directory, it is not canonical production material.
