# Tool Contracts

Contratos operacionais obrigatorios.

`consultar_imoveis`:

- fonte unica de URLs de imoveis
- modelo nunca pode reconstruir slugs
- cards enviados devem preservar URL exata retornada pela tool
- reenvio, link quebrado, "qual era aquele imovel" e referencias ao ultimo imovel exigem nova chamada da tool
- links antigos em memoria textual nao podem ser reutilizados como fonte operacional

`conhecimento_estrategico_Ju`:

- somente para duvidas consultivas e contexto institucional
- nao substitui `consultar_imoveis`
- nao inventa disponibilidade, preco ou URL

`setar_lead_quente`:

- somente quando houver sinal real de visita, corretor, ligacao ou avancar
