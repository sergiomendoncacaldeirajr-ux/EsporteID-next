# Guia 100% Mastigado: EsporteID na Play Store (Android)

Este guia já está preenchido com seus dados:

- Domínio: `https://esporteid.com.br`
- Package ID Android: `com.esporteid.app`
- Nome do app: `EsporteID`

---

## Dados oficiais que você vai usar em tudo

- **App Name (loja e Android):** `EsporteID`
- **Package ID:** `com.esporteid.app`
- **Website:** `https://esporteid.com.br`
- **Manifest URL:** `https://esporteid.com.br/manifest.webmanifest`
- **Service Worker URL:** `https://esporteid.com.br/sw.js`
- **Asset Links URL:** `https://esporteid.com.br/.well-known/assetlinks.json`

---

## PASSO 1 — Instalar pré-requisitos no seu Windows (uma vez)

1. Node.js LTS  
2. Java JDK 17+  
3. Android Studio (SDK + Build Tools)  

Validar no PowerShell:

```powershell
node -v
npm -v
java -version
```

Se os 3 comandos responderem, siga.

---

## PASSO 2 — Criar sua chave de assinatura (keystore)

### 2.1 Criar pasta da chave

```powershell
mkdir C:\secure\esporteid-keystore -Force
```

### 2.2 Gerar a chave

```powershell
keytool -genkeypair -v -storetype JKS -keystore C:\secure\esporteid-keystore\esporteid-upload.jks -alias esporteid-upload -keyalg RSA -keysize 2048 -validity 10000
```

> Guarde bem:
> - caminho do arquivo `.jks`
> - alias `esporteid-upload`
> - senha da keystore
> - senha da chave

### 2.3 Pegar SHA-256 (necessário para Asset Links)

```powershell
keytool -list -v -keystore C:\secure\esporteid-keystore\esporteid-upload.jks -alias esporteid-upload
```

Copie o valor completo de `SHA256:`.

---

## PASSO 3 — Configurar variáveis de produção (Vercel/servidor)

No ambiente de produção do `esporteid.com.br`, criar:

```env
TWA_ANDROID_PACKAGE_NAME=com.esporteid.app
TWA_SHA256_CERT_FINGERPRINTS=COLE_AQUI_A_SHA256_DA_SUA_KEYSTORE
```

Depois de salvar as variáveis, faça deploy/redeploy.

---

## PASSO 4 — Testar URLs obrigatórias no navegador

Abra e confirme:

1. `https://esporteid.com.br/manifest.webmanifest`
2. `https://esporteid.com.br/sw.js`
3. `https://esporteid.com.br/.well-known/assetlinks.json`

Se qualquer uma não abrir corretamente, pare e corrija antes de continuar.

---

## PASSO 5 — Gerar app Android com Bubblewrap

### 5.1 Instalar Bubblewrap

```powershell
npm i -g @bubblewrap/cli
```

### 5.2 Criar pasta do projeto Android

```powershell
mkdir C:\apps\esporteid-twa -Force
cd C:\apps\esporteid-twa
```

### 5.3 Inicializar TWA com seu manifest

```powershell
bubblewrap init --manifest https://esporteid.com.br/manifest.webmanifest
```

Use estes valores quando pedir:

- Application Name: `EsporteID`
- Package ID: `com.esporteid.app`
- Host: `esporteid.com.br`
- Launcher Name: `EsporteID`
- Display: `standalone`
- Notifications: `yes`

### 5.4 Configurar assinatura

```powershell
bubblewrap update
```

Informe:
- keystore: `C:\secure\esporteid-keystore\esporteid-upload.jks`
- alias: `esporteid-upload`
- senha keystore
- senha chave

### 5.5 Gerar arquivo para Play Store (.aab)

```powershell
bubblewrap build
```

No fim, você terá o `.aab` para upload.

---

## PASSO 6 — Publicar no Play Console (sem erro)

No [Google Play Console](https://play.google.com/console):

1. Criar app: `EsporteID`
2. Tipo: App
3. Idioma: Português (Brasil)
4. Gratuito/Pago conforme sua estratégia

### 6.1 Enviar versão de teste interno

1. Ir em **Testes > Teste interno**
2. Criar release
3. Subir o `.aab`
4. Salvar e enviar

### 6.2 Completar formulários obrigatórios

- Política de privacidade (URL)
- Segurança de dados
- Classificação etária
- Público-alvo
- Conteúdo do app

---

## PASSO 7 — Checklist final (copiar e marcar)

- [ ] Keystore criada e salva com backup
- [ ] SHA-256 coletada
- [ ] Variáveis de produção configuradas
- [ ] Deploy atualizado
- [ ] URLs manifest/sw/assetlinks abrindo no domínio
- [ ] Bubblewrap init concluído
- [ ] Bubblewrap build gerou `.aab`
- [ ] App criado no Play Console
- [ ] Upload no teste interno
- [ ] Testado em Android real
- [ ] Só depois publicar produção

---

## PASSO 8 — Se der erro, o que fazer

## Erro: domínio não verificado
- conferir `TWA_ANDROID_PACKAGE_NAME` = `com.esporteid.app`
- conferir SHA-256 da keystore usada no build
- redeploy e testar `/.well-known/assetlinks.json`

## Erro: abre no navegador ao invés de app fullscreen
- asset links ainda inválido ou desatualizado
- corrigir variáveis + novo build

---

## Padrão que você vai seguir daqui para frente

Para cada atualização:

1. pacote pequeno
2. lint + build
3. tag base estável
4. teste interno
5. produção

Se quebrar: volta para a base estável.

