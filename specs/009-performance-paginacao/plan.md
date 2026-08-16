# Plan: 009-performance-paginacao
**Base**: main @ 8b7711f

## Abordagem
1. **Paginação (US1)**: padrão único nas 4 páginas (Server Components):
   - `limit = Math.min(Number(searchParams.limit) || 50, 1000)` (múltiplos de 50)
   - `const [rows, total] = await Promise.all([findMany({take: limit+1, ...}), count({where})])`
   - `hasMore = rows.length > limit` (corta o extra); UI: "Mostrando X de TOTAL"
   - Botão = <Link href com searchParams atuais + limit+50, scroll={false}>
2. **Selects enxutos (US2)**: revisar includes de pessoas/[id] e cartoes/[id];
   trocar por select dos campos usados (sem mudar dados exibidos).
3. **Lazy**: next/dynamic p/ invoice-import-dialog e import-form (ssr:false não
   é preciso; basta dynamic import padrão) nos pontos de uso.
4. **Índice**: @@index([ownerId, date]) em Transaction; migração via db:migrate.

## Gates
check + suíte + build verdes; revisao-forte limpa; PLANO M9 marcado.
