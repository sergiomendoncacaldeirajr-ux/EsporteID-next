<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## EsporteID — identidade visual (obrigatório em UI)

Fonte de verdade: `app/globals.css` (variáveis CSS e comentário de marca no topo).

- **Azul estrutural** (`--eid-primary-*`, foco em `--eid-primary-500` #2563eb): navegação, ícones de campo, foco, links informativos.
- **Laranja ação** (`--eid-action-*`, foco em `--eid-action-500` #f97316): CTAs, links de conversão (entrar, cadastrar, esqueci senha).
- **Base ink** (`--eid-brand-ink` #0b1d2e): fundo profundo / PWA; coerente com a logo.
- **Tema**: escuro é o padrão (`:root`). Claro: `[data-eid-theme="light"]` no `<html>`, sincronizado com `localStorage` via `components/eid-theme-hydration.tsx` e `applyEidTheme()` nas telas login/cadastro.
- **Texto**: `--eid-fg` (principal), `--eid-text-muted` (secundário). Não usar hex soltos para marca; preferir classes Tailwind mapeadas (`text-eid-fg`, `bg-eid-action-500`, etc.) ou `var(--eid-…)`.
- **WhatsApp**: verde `#25D366` **somente** no ícone do app WhatsApp, nunca como cor primária da marca EsporteID.
- **Telefone internacional**: campo de WhatsApp deve permitir **qualquer país** (`react-phone-number-input` sem lista `countries` restrita).
- **Termos v1.1.0+**: cadastro exige WhatsApp; canal principal de comunicação — texto integral em `/termos` (seção 2.1) e versão em `lib/legal/versions.ts`.
