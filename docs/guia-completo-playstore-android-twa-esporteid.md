# Guia Completo: Publicar EsporteID na Play Store (Android via TWA)

Este guia foi feito para você seguir **passo a passo**, mesmo sendo leigo.

Objetivo: publicar o `EsporteID` como app Android usando seu projeto web atual (Next.js/PWA), sem reescrever em React Native/Flutter.

---

## 1) O que você já tem pronto no projeto

No seu projeto, já existe base para app Android via PWA/TWA:

- Manifest PWA: `app/manifest.ts`
- Service Worker: `public/sw.js`
- Asset Links (para Android verificar domínio): `app/.well-known/assetlinks.json/route.ts`
- Config de viewport mobile: `app/layout.tsx`

Isso reduz muito o esforço.

---

## 2) Visão geral do processo (resumo)

1. Publicar app web em produção (HTTPS).
2. Criar conta de desenvolvedor no Google Play Console.
3. Gerar app Android TWA com Bubblewrap.
4. Assinar app (keystore) e gerar `.aab`.
5. Subir no Play Console (teste interno).
6. Ajustar se necessário e publicar em produção.

---

## 3) Pré-requisitos (instalar 1 vez)

No seu Windows:

1. **Node.js LTS** (recomendado v20+)
2. **Java JDK 17** (ou 21)
3. **Android Studio** (com SDK e Build Tools)
4. **Git** (opcional, mas recomendado)

### Verificação rápida (PowerShell)

```powershell
node -v
npm -v
java -version
```

Se algum comando falhar, instale antes de continuar.

---

## 4) Preparar produção web (obrigatório)

Seu domínio de produção precisa estar com HTTPS e app funcionando.

Exemplo:
- `https://seu-dominio.com`

### Testes obrigatórios no navegador

Abra e confira:

- `https://seu-dominio.com/manifest.webmanifest`
- `https://seu-dominio.com/sw.js`
- `https://seu-dominio.com/.well-known/assetlinks.json`

Se qualquer URL não abrir, **não avance**.

---

## 5) Variáveis de ambiente para Asset Links (produção)

No ambiente de produção (Vercel/servidor), configure:

- `TWA_ANDROID_PACKAGE_NAME`
- `TWA_SHA256_CERT_FINGERPRINTS`

Exemplo:

```env
TWA_ANDROID_PACKAGE_NAME=com.esporteid.app
TWA_SHA256_CERT_FINGERPRINTS=AA:BB:CC:...:99
```

Observação:
- Se tiver mais de 1 fingerprint, separar por vírgula.
- O projeto também aceita `ANDROID_ASSET_LINKS_JSON` completo (avançado).

---

## 6) Criar chave de assinatura (keystore) — MUITO IMPORTANTE

Faça isso uma vez e guarde com backup.

### 6.1 Criar pasta de segurança local

```powershell
mkdir C:\secure\esporteid-keystore -Force
```

### 6.2 Gerar keystore

```powershell
keytool -genkeypair `
  -v `
  -storetype JKS `
  -keystore C:\secure\esporteid-keystore\esporteid-upload.jks `
  -alias esporteid-upload `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

Anote e guarde:
- caminho do `.jks`
- alias
- senha da keystore
- senha da chave

### 6.3 Obter fingerprint SHA-256

```powershell
keytool -list -v `
  -keystore C:\secure\esporteid-keystore\esporteid-upload.jks `
  -alias esporteid-upload
```

Copie o valor `SHA256:` e use em `TWA_SHA256_CERT_FINGERPRINTS`.

---

## 7) Gerar app Android com Bubblewrap

### 7.1 Instalar Bubblewrap

```powershell
npm i -g @bubblewrap/cli
```

### 7.2 Criar pasta de build Android

```powershell
mkdir C:\apps\esporteid-twa -Force
cd C:\apps\esporteid-twa
```

### 7.3 Inicializar projeto TWA

```powershell
bubblewrap init --manifest https://seu-dominio.com/manifest.webmanifest
```

Quando pedir os dados, use este padrão:

- Application name: `EsporteID`
- Package ID: `com.esporteid.app`
- Host: `seu-dominio.com`
- Launcher name: `EsporteID`
- Display mode: `standalone`
- Theme color: mesma do app
- Navigation color: mesma do app
- Enable notifications: `yes`

### 7.4 Configurar assinatura no projeto TWA

```powershell
bubblewrap update
```

No arquivo de config do bubblewrap (gerado na pasta), informe:
- caminho do keystore
- alias
- senhas

### 7.5 Gerar Android App Bundle

```powershell
bubblewrap build
```

Resultado esperado: arquivo `.aab`.

---

## 8) Publicar no Google Play Console (passo a passo)

## 8.1 Criar aplicativo

No [Google Play Console](https://play.google.com/console):

1. Criar app
2. Nome: `EsporteID`
3. Idioma padrão: Português (Brasil)
4. Tipo: App
5. Gratuito/Pago: conforme sua estratégia

## 8.2 Completar ficha da loja

Preencher:
- Título do app
- Descrição curta
- Descrição completa
- Categoria
- E-mail de suporte
- Política de privacidade (URL pública)

## 8.3 Upload da versão

1. Vá em **Testes > Teste interno**
2. Criar nova versão
3. Upload do `.aab`
4. Salvar e enviar para revisão interna

## 8.4 Configurações obrigatórias antes de produção

- Segurança de dados
- Classificação etária
- Público-alvo
- Permissões declaradas
- Países de distribuição

---

## 9) Checklist pronto para você seguir

Use esta ordem:

- [ ] Domínio de produção online (HTTPS)
- [ ] `manifest.webmanifest` acessível
- [ ] `sw.js` acessível
- [ ] `/.well-known/assetlinks.json` acessível
- [ ] Keystore criada e salva com backup
- [ ] SHA-256 configurado nas variáveis de produção
- [ ] `bubblewrap init` concluído
- [ ] `bubblewrap build` gerou `.aab`
- [ ] App criado no Play Console
- [ ] Upload no teste interno
- [ ] Testado em Android real
- [ ] Só então liberar produção

---

## 10) Teste interno obrigatório (não pule)

Antes de publicar geral, valide no celular Android:

- Login e cadastro
- Fluxo desafio
- Fluxo locais/reserva
- Push notifications
- Navegação em telas fullscreen
- Performance no 4G

Se algo quebrar, corrija e gere novo `.aab`.

---

## 11) Problemas comuns e solução

## A) `assetlinks.json` vazio

Causa:
- variáveis `TWA_ANDROID_PACKAGE_NAME` e `TWA_SHA256_CERT_FINGERPRINTS` não configuradas.

Solução:
- configurar variáveis em produção e redeploy.

## B) Play Console rejeita por “domínio não verificado”

Causa:
- fingerprint errada ou package diferente.

Solução:
- confirmar package id e SHA-256 da keystore usada no build.

## C) App abre no navegador e não fullscreen

Causa:
- TWA sem verificação correta.

Solução:
- corrigir asset links e gerar novo build.

---

## 12) Segurança e versionamento (recomendação oficial para você)

Publicar sempre por pacote:

1. pacote pequeno de mudança
2. `npm run lint` + `npm run build`
3. tag de base estável
4. release em teste interno
5. produção

Se quebrar:
- reverte para última base estável.

Você já tem um documento interno disso em:
- `docs/release-pacotes-seguros.md`

---

## 13) Como transformar este guia em PDF

Método mais simples:

1. Abra este arquivo no VS Code/Cursor.
2. Use preview Markdown.
3. `Ctrl + P` > Imprimir.
4. Escolha **Salvar como PDF**.

Nome sugerido:
- `Guia-PlayStore-EsporteID-v1.pdf`

---

## 14) Próxima ação imediata (agora)

Comece por aqui, nesta ordem exata:

1. Me diga seu domínio final de produção.
2. Eu te devolvo os comandos já com esse domínio preenchido.
3. Você roda os comandos e me manda qualquer erro.
4. Eu vou te guiando até subir o teste interno com sucesso.

