# Guia 100% Mastigado: publicar o EsporteID no iPhone (App Store)

Este guia já está preenchido com seus dados:

- **Nome do app:** `EsporteID`
- **Bundle ID iOS:** `com.esporteid.app`
- **Site:** `https://esporteid.com.br`
- **Support URL:** `https://esporteid.com.br/suporte`
- **Privacy Policy URL:** `https://esporteid.com.br/privacidade`

---

## O que já ficou pronto no projeto

O projeto já está preparado com o básico certo para a primeira publicação iOS:

- página pública de suporte
- política de privacidade pública
- termos públicos
- app iOS simplificado para **iPhone only**
- app iOS simplificado para **modo retrato**
- push nativo do iPhone escondido nesta primeira versão

Isso reduz o risco de rejeição da Apple.

---

## PASSO 1 — O que você precisa ter antes de tudo

### 1.1 Conta Apple Developer
Você precisa assinar o **Apple Developer Program**.

Sem isso, você **não consegue publicar**.

### 1.2 Conta App Store Connect
Você também precisa entrar no **App Store Connect** e criar o app lá.

---

## PASSO 2 — Dados oficiais que você vai usar

Use sempre estes mesmos dados:

- **App Name:** `EsporteID`
- **Bundle ID:** `com.esporteid.app`
- **Website:** `https://esporteid.com.br`
- **Support URL:** `https://esporteid.com.br/suporte`
- **Privacy Policy URL:** `https://esporteid.com.br/privacidade`

---

## PASSO 3 — Publicar o site antes do app

Antes de mexer no iPhone, publique o site com as páginas novas.

Confirme no navegador que estas URLs abrem:

1. `https://esporteid.com.br/suporte`
2. `https://esporteid.com.br/privacidade`
3. `https://esporteid.com.br/termos`

Se alguma não abrir, pare e corrija primeiro.

---

## PASSO 4 — Como publicar sem ter Mac

Você tem 3 caminhos:

### Opção A — mais fácil para leigo
**Alugar um Mac remoto por algumas horas**

Esse é o caminho mais simples.

Você vai usar o Mac remoto só para:

1. abrir o projeto no Xcode
2. configurar assinatura
3. gerar build
4. enviar para TestFlight
5. publicar na App Store

### Opção B — pedir para alguém com Mac fazer só a etapa final
Pode ser um freelancer, amigo ou parceiro técnico.

### Opção C — automação/CI
É bom no longo prazo, mas para sua primeira publicação não é o caminho mais simples.

**Minha recomendação:** use a **Opção A**.

---

## PASSO 5 — Criar o app no App Store Connect

No App Store Connect:

1. clique para criar um novo app
2. nome: `EsporteID`
3. plataforma: `iOS`
4. idioma principal: `Português (Brasil)`
5. Bundle ID: `com.esporteid.app`

Se o Bundle ID não existir ainda na Apple, crie no portal de identificadores da Apple Developer.

---

## PASSO 6 — Abrir o projeto iOS no Mac remoto

No Mac remoto, com o projeto aberto, rode:

```bash
npm install
npm run cap:sync:ios
npm run cap:open:ios
```

Isso vai abrir o projeto no Xcode.

---

## PASSO 7 — O que conferir no Xcode

Quando abrir no Xcode, confira estas coisas:

### 7.1 Signing
Em **Signing & Capabilities**:

- selecione sua conta/team Apple
- deixe o signing automático

### 7.2 Nome e identificador
Confirme:

- nome do app: `EsporteID`
- bundle id: `com.esporteid.app`

### 7.3 Escopo da primeira versão
Confirme que a primeira versão está simples:

- **iPhone only**
- **portrait only**

Isso foi feito para facilitar a aprovação.

---

## PASSO 8 — Gerar um build para teste

Você não deve publicar direto sem testar.

Primeiro, mande para **TestFlight**.

### Testes mínimos no iPhone real
Teste isto:

- abrir o app
- login
- cadastro
- abrir suporte
- abrir termos
- abrir privacidade
- editar perfil
- foto de perfil / câmera / galeria
- localização
- compartilhamento

### Importante
Nesta primeira versão do iPhone:

- **não conte com push nativo iOS**
- ele foi escondido de propósito para não travar a publicação

---

## PASSO 9 — Preencher a ficha da App Store

Você vai precisar preencher:

- nome do app
- descrição
- categoria
- classificação etária
- screenshots de iPhone
- Support URL
- Privacy Policy URL

### URLs que você vai colar
- **Support URL:** `https://esporteid.com.br/suporte`
- **Privacy Policy URL:** `https://esporteid.com.br/privacidade`

---

## PASSO 10 — Texto simples para App Review Notes

Você pode colar algo assim:

> O app EsporteID permite cadastro, perfil esportivo, acompanhamento de partidas, ranking, torneios e suporte ao usuário.
> Suporte público: https://esporteid.com.br/suporte
> Política de privacidade: https://esporteid.com.br/privacidade
> Exclusão de conta e pedidos LGPD ficam disponíveis para usuários autenticados em “Seus dados (LGPD)”.
> A versão inicial do iPhone não utiliza push nativo iOS.

Se a Apple pedir acesso à conta, você deve informar:

- login de teste
- senha de teste

---

## PASSO 11 — Fluxo mais seguro de publicação

Faça assim:

1. publicar o site
2. abrir no Mac remoto
3. configurar assinatura
4. mandar para TestFlight
5. testar no iPhone
6. corrigir o que aparecer
7. enviar para App Review
8. publicar

---

## PASSO 12 — Checklist final (copiar e marcar)

- [ ] Conta Apple Developer ativa
- [ ] App criado no App Store Connect
- [ ] Support URL funcionando
- [ ] Privacy Policy URL funcionando
- [ ] Projeto iOS abre no Xcode
- [ ] Signing configurado
- [ ] Build enviado para TestFlight
- [ ] Testado em iPhone real
- [ ] Screenshots da App Store prontas
- [ ] Review Notes preenchidas
- [ ] Login de teste separado, se necessário
- [ ] Enviado para revisão

---

## PASSO 13 — O que ficou fora desta primeira versão

Para simplificar sua publicação, esta primeira versão ficou sem:

- push nativo iPhone
- iPad
- modo paisagem

Isso não é defeito. Foi uma escolha para facilitar sua aprovação inicial.

---

## PASSO 14 — Se der erro, o que fazer

### Erro de assinatura
Normalmente significa:

- conta Apple não conectada direito
- team não selecionado
- certificado/provisioning não resolvido

### Erro ao enviar build
Normalmente significa:

- versão/build repetido
- problema de assinatura
- Xcode antigo

### Rejeição por falta de suporte
Verifique se esta URL abre publicamente:

- `https://esporteid.com.br/suporte`

### Rejeição por privacidade
Verifique se esta URL abre publicamente:

- `https://esporteid.com.br/privacidade`

---

## PASSO 15 — Caminho recomendado para você

Se eu fosse resumir o melhor caminho para você, seria este:

1. publicar o site com `/suporte`
2. contratar/usar um Mac remoto por algumas horas
3. abrir o projeto no Xcode
4. fazer signing
5. enviar para TestFlight
6. testar no iPhone
7. publicar na App Store

---

## Resumo em uma frase

Você **não precisa comprar um Mac**: o jeito mais fácil é usar um **Mac remoto por algumas horas**, enviar primeiro para **TestFlight**, testar e só depois publicar.
