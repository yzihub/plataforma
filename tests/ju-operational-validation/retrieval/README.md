# Retrieval

Contratos de retrieval.

Usar vector search apenas quando:

- duvida consultiva sobre bairro ou mercado
- follow-up precisa memoria semantica
- Redis hot memory nao resolve
- conhecimento institucional e necessario

Nao usar retrieval para:

- cumprimento
- confirmacao simples
- busca transacional de imovel
- dados ja presentes no Redis ou Supabase operacional

