# N8N Workflow Canon

This folder is organized by operational status. Production publication must use
only files under `n8n/production`.

## Production Canon

- `production/workflow-jurema-main.final-hardened.json`
  - Official Ju WhatsApp entrypoint.
  - Lightweight hot-path: Evolution -> n8n -> Redis/Supabase context -> tools -> GPT-4.1 -> governance -> Evolution.
  - Does not call Agno.
  - Does not require Runtime Gateway in the mandatory WhatsApp hot-path.
  - Preserves tool revalidation, URL integrity, property cards, persistence, and WhatsApp delivery.

- `production/workflow-jurema-consultar-imoveis.final-hardened.json`
  - Official property-search subworkflow/tool.
  - Canonical replacement for the ID-named `0udn6N4YelE6F2Ws` export.

- `production/workflow-jurema-enviar-contrato.final-hardened.json`
  - Official contract-sending workflow.
  - Canonical replacement for the loose `Jurema | Enviar Contrato v3` export.

## Archive

- `archive/snapshots`
  - Raw exports and full lists used only for forensic comparison or rollback
    reconstruction.

- `archive/pre-runtime`
  - Intermediate hardening artifacts and ID-named duplicates.
  - These are not production publication targets.

- `archive/legacy`
  - Older contract and historical workflow exports.
  - These are not canonical runtime workflows.

- `archive/experiments`
  - Reserved for non-production experiments.

## Publication Rule

Only `scripts/publish-jurema-operational-hardening.js` should publish the Ju
production workflows, and it must read from `n8n/production`.

Do not publish:

- ID-named exports such as `workflow-cj4V6DW0Qy6el0PM.*`.
- Snapshots.
- Intermediate `hardened` files.
- Historical exports from `archive/legacy`.

## Known Legacy Residue

The canonical main workflow is lightweight-hot-path, but it still contains legacy
nodes/strings inherited from the original organic workflow, including Redis,
PAM/Cafe references, Airtable references, and vector-store wiring.

These are classified as technical debt in the workflow body. They must not be
used as evidence that those systems are part of the new runtime architecture.
Future cleanup should remove or isolate them without changing the current
production behavior.
