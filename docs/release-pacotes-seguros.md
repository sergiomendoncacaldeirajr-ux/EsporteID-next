# Release por Pacotes (Seguro + Rollback)

Este projeto deve evoluir por **pacotes pequenos**, com validação e rollback rápido.

## Fluxo padrão (obrigatório)

1. Criar branch por pacote:
   - `feat/pacote-YYYYMMDD-nome-curto`
2. Implementar somente 1 objetivo por pacote (ex.: "placar alternativo admin").
3. Validar local:
   - `npm run lint`
   - `npm run build`
4. Abrir PR pequeno com checklist:
   - Impacto esperado
   - Rotas afetadas
   - Migrações
   - Plano de rollback
5. Merge apenas com checks verdes.

## Regra de versão/base

- Toda entrega vira um **marco de base**:
  - Tag recomendada: `base-YYYYMMDD-HHMM-<pacote>`
- Em caso de falha após deploy:
  - Reverter PR no GitHub (preferencial).
  - Se necessário, fazer rollback para última tag base estável.

## Migrações de banco (Supabase)

- Nunca agrupar muitas mudanças críticas numa única migration.
- Em pacote com risco:
  - criar migration de "forward fix" ou "rollback lógico" (sem apagar histórico).
- Sempre testar:
  - estrutura
  - leitura/escrita
  - RLS/políticas

## Segurança por pacote

Cada pacote deve incluir:

- validação de entrada (server-side),
- sanitização de campos de texto,
- revisão de superfícies públicas (rotas, query string),
- lint/build sem erro.

## Convenções de commit (recomendado)

- `feat(security): ...`
- `feat(admin): ...`
- `fix(ios-fullscreen): ...`
- `chore(release): ...`

## Checklist rápido antes de subir

- [ ] Lint ok
- [ ] Build ok
- [ ] Fluxo principal testado ponta a ponta
- [ ] Plano de rollback descrito no PR
- [ ] Tag/base criada após estabilidade
