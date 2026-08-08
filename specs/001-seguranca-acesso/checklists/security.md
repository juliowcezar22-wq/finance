# Security Requirements Checklist: Hardening de Segurança P0

**Purpose**: Validar a QUALIDADE dos requisitos de segurança da feature 001
(completude, clareza, consistência, mensurabilidade) antes do `implement` —
"unit tests" da escrita dos requisitos de intrusão, não da implementação.
**Created**: 2026-08-08
**Feature**: [spec.md](../spec.md) · [contracts](../contracts/http-e-sessao.md)

## Cobertura de Isolamento / IDOR (US1)

- [ ] CHK001 Os requisitos enumeram TODAS as operações de escrita expostas que precisam de guard, incluindo as duas de fatura (`payInvoice`, `setInvoiceStatus`)? [Completeness, Spec §FR-001]
- [ ] CHK002 O comportamento esperado ao acessar registro de outro dono está especificado como "erro genérico que não revela existência", e não apenas "negar"? [Clarity, Spec §FR-001]
- [ ] CHK003 O requisito de atomicidade da checagem de dono define o que conta como "sem janela" de forma verificável (uma instrução de escrita escopada)? [Measurability, Spec §FR-002]
- [ ] CHK004 O tratamento de registro órfão (`ownerId` nulo) está definido como inacessível a usuário comum, com caminho administrativo de saneamento? [Coverage, Spec §FR-003, Edge Case]
- [ ] CHK005 A decisão "Categoria = catálogo global, escrita só admin" tem requisito de registro documental associado? [Traceability, Spec §FR-004]
- [ ] CHK006 O requisito distingue o caso "sem sessão" (guard/redirect) do caso "sessão de outro usuário" (erro genérico)? [Consistency, Spec §FR-001/§SC-002]

## Sessão e Segredo (US2)

- [ ] CHK007 O requisito de ausência de fallback de segredo cobre explicitamente TODOS os pontos que validam sessão (runtime Node e Edge)? [Completeness, Spec §FR-005]
- [ ] CHK008 O comportamento de boot sem `SESSION_SECRET` está especificado como falha explícita e observável, com critério verificável? [Measurability, Spec §FR-005/§SC-004]
- [ ] CHK009 O mecanismo de revogação (versão de sessão por usuário) e seu escopo (todas as sessões do usuário) estão definidos sem ambiguidade? [Clarity, Spec §FR-006]
- [ ] CHK010 O destino de tokens em formato antigo (sem o campo de versão) após o deploy está especificado? [Edge Case, Spec §FR-006]

## Lockout de Login (US2)

- [ ] CHK011 O gatilho do bloqueio está quantificado (5 falhas / 15 min) e a dimensão do bloqueio (por e-mail; IP só auditoria) está explícita? [Clarity, Spec §FR-007]
- [ ] CHK012 O requisito preserva a não-revelação de existência da conta na mensagem de bloqueio? [Consistency, Spec §FR-007]
- [ ] CHK013 A recuperação do usuário legítimo após a janela está especificada como caminho verificável? [Recovery, Spec §SC-005]
- [ ] CHK014 A durabilidade dos contadores entre instâncias serverless e o comportamento em falha do armazenamento (fail-closed) estão especificados? [Coverage, Spec §FR-007/§FR-013]

## Canal WhatsApp (US3)

- [ ] CHK015 O requisito de autenticação do webhook define o transporte da credencial (header) e a propriedade de comparação (timing-safe)? [Clarity, Spec §FR-008]
- [ ] CHK016 O estado "sem credencial configurada" está especificado como fail-closed distinto de "credencial inválida"? [Completeness, Spec §FR-008/§FR-013]
- [ ] CHK017 A garantia de "nenhum efeito" em requisição não autenticada cobre tanto criação de dados quanto consumo de IA? [Coverage, Spec §FR-008/§SC-006]
- [ ] CHK018 O requisito de autorização de remetente proíbe comparação por sufixo e define a única tolerância aceita (9º dígito BR)? [Clarity, Spec §FR-010]
- [ ] CHK019 A deduplicação por identificador de mensagem tem propriedade mensurável ("exatamente 1 efeito") e comportamento definido para mensagem sem id? [Measurability, Spec §FR-011/§SC-007, Edge Case]
- [ ] CHK020 O requisito dos lembretes exige credencial em header (Bearer) e proíbe explicitamente a credencial em query string? [Consistency, Spec §FR-009]

## Consistência transversal e testabilidade

- [ ] CHK021 Todo requisito funcional (FR-001..013) tem ao menos um critério de sucesso mensurável (SC-001..008) correspondente? [Traceability]
- [ ] CHK022 O requisito de testes automatizados (FR-012) enumera as classes de teste exigidas (intrusão, revogação, lockout, webhook, dedupe)? [Completeness, Spec §FR-012]
- [ ] CHK023 O princípio fail-closed (FR-013) está aplicado a cada controle (isolamento, lockout, webhook, reminders) sem exceção implícita? [Consistency, Spec §FR-013]
- [ ] CHK024 A terminologia é estável entre spec, plan e contracts (ex.: "versão de sessão"/`sessionVersion`, "erro genérico", "timing-safe")? [Consistency]
- [ ] CHK025 As exclusões de escopo (cifragem de segredos, headers HTTP, Float→Decimal) estão declaradas para não gerarem expectativa de cobertura nesta feature? [Boundary, Spec §Assumptions]

## Notes

- Marque `[x]` conforme cada item de qualidade é confirmado na revisão da spec.
- Itens que falharem devem ser corrigidos na spec/plan ANTES do `implement`.
- Este checklist valida a ESCRITA dos requisitos; a matriz de execução da
  intrusão (invocar como usuário B etc.) vive nos testes automatizados
  (`tests/security/`, tasks T005/T011/T012/T019).
