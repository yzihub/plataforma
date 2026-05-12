-- Garantias de idempotencia para sincronizacao contrato -> financeiro

CREATE UNIQUE INDEX IF NOT EXISTS idx_comissoes_contract_broker_unique
  ON comissoes(tenant_id, contract_id, broker_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financeiro_contract_categoria_tipo_data_unique
  ON financeiro(tenant_id, contract_id, categoria, tipo, data_evento);
