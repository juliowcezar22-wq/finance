# Go-Live — Nummiq

Checklist executável para colocar o Nummiq em produção (Vercel + Supabase
Prod). Ordem importa. Cada item tem **como fazer** e **como saber que deu
certo**. Ambientes e credenciais: `docs/AMBIENTES.md`.

> Estado do código: features 001–011 mergeadas em `main`; 132 testes verdes,
> `npm run check` e `next build` verdes.

---

## 1. Pré-deploy (você, no painel)

| # | Item | Como | Pronto quando |
|---|------|------|---------------|
| 1.1 | **Backup/PITR do Nummiq Prod** | Supabase → Database → Backups (ou snapshot manual) | Existe restore point de hoje |
| 1.2 | **`SESSION_SECRET`** na Vercel (Production) | ≥ 32 chars: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` | Variável salva |
| 1.3 | **`CRON_SECRET`** na Vercel | mesmo gerador | Variável salva (o cron injeta como Bearer) |
| 1.4 | **`SECRETS_KEY`** na Vercel | mesmo gerador — cifra apiKeys no banco | Variável salva |
| 1.5 | **`POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING`** | do projeto **Nummiq Prod** | Apontam para o ref de prod (não dev) |
| 1.6 | **`ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD`** | só para o seed inicial; senha forte (≥ 8) | Salvas (o seed recusa sem `ADMIN_PASSWORD`) |

> ⚠️ Sem `SESSION_SECRET` o app **não sobe** (proposital — feature 001).

## 2. Deploy

| # | Item | Como | Pronto quando |
|---|------|------|---------------|
| 2.1 | Push da `main` | já feito — a Vercel builda e roda `prisma migrate deploy` | Build verde no painel |
| 2.2 | Migrations aplicadas | log do build mostra as migrations | Sem erro de migration |
| 2.3 | App responde | abrir a URL de produção | Tela de login carrega |

## 3. Pós-deploy (uma vez)

| # | Item | Como | Pronto quando |
|---|------|------|---------------|
| 3.1 | **RLS hardening** | SQL Editor do Nummiq Prod → colar `prisma/security/rls-hardening.sql` → Run | Rodou sem erro (é idempotente) |
| 3.2 | **Seed do admin** | rodar o seed com as envs de prod (uma vez) | Login do admin funciona |
| 3.3 | **Recompute de parcelas** | `npm run db:recompute-installments` (dry-run) e depois `-- --apply` **apontando para prod** apenas se houver parcelamentos manuais legados | Relatório "0 parcela(s) a ajustar" ou ajuste aplicado com backup |
| 3.4 | **Client-Token do WhatsApp** | painel do gateway (Z-API) → configurar o mesmo valor salvo em `/whatsapp` | POST sem token → 401 |
| 3.5 | **Cron de lembretes** | Vercel → Settings → Cron Jobs (já declarado em `vercel.json`) | Job listado; execução manual retorna 200 |
| 3.6 | **Uptime monitor** | apontar UptimeRobot (ou similar) para `/api/health` | Monitor verde |

## 4. Smoke test (5 minutos, em produção)

1. **Login** com o admin → cai no dashboard.
2. **Criar despesa** (R$ 100, pix, hoje) → toast "Despesa salva" → aparece na lista.
3. **Dashboard** → o valor entrou no total de despesas do mês.
4. **Excluir** a despesa → dialog de confirmação com o nome → toast "Despesa excluída".
5. **Logout** → volta ao login; colar a URL do dashboard não entra (sessão revogada).
6. `/api/health` → `{"ok":true,"db":"up"}`.

Se os 6 passarem, **está no ar**. O roteiro completo de validação (incluindo
conferência de números) está em `docs/TESTES-PRODUCAO.md`.

## 5. Rollback

| Cenário | Ação |
|---|---|
| Build/deploy quebrado | Vercel → Deployments → "Promote to Production" no deploy anterior |
| Migration ruim | Restaurar o PITR/snapshot do item 1.1 (as migrations desta fase são aditivas, exceto a 002 que alterou tipos) |
| Segredo errado | Corrigir a env → Redeploy (não precisa rebuild de código) |

## 6. Primeiros dias

- Acompanhar os logs (Vercel → Logs): eventos JSON `webhook.*`, `ai.*`, `csp.violation`.
- Com dados de CSP suficientes, promover a CSP de `report-only` para enforce
  (`next.config.mjs`).
- Plugar Sentry quando quiser (código já preparado: logger + `global-error`).
