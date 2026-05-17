# Guia 100% Mastigado: publicar o EsporteID no iPhone com push funcionando

Este guia é o caminho completo, do começo ao fim, para você publicar o **EsporteID** na App Store com o **push do iPhone funcionando**.

Ele já está preenchido com seus dados:

- **Nome do app:** `EsporteID`
- **Bundle ID iOS:** `com.esporteid.app`
- **Site:** `https://esporteid.com.br`
- **Support URL:** `https://esporteid.com.br/suporte`
- **Privacy Policy URL:** `https://esporteid.com.br/privacidade`

---

## LEIA ISSO ANTES DE TUDO

Você **não precisa comprar um Mac**.

Mas para o push do iPhone funcionar de verdade, você vai precisar de:

1. uma conta Apple Developer
2. um projeto Firebase
3. um **Mac remoto** ou alguém com Mac
4. um iPhone real para teste

Sem Mac físico próprio: **ok**.  
Sem macOS nenhum: **não dá para fechar o push iPhone de verdade**.

---

# PARTE 1 — O que já foi preparado no seu projeto

Seu projeto já ficou com a base pronta para o iPhone entrar no mesmo fluxo de push do Android.

Hoje já está feito no código:

- suporte público criado
- privacidade pública criada
- termos públicos criados
- app iOS ajustado para **iPhone only**
- app iOS ajustado para **portrait only**
- backend preparado para aceitar token nativo do iPhone
- dispatcher preparado para mandar payload iOS via FCM
- AppDelegate preparado para usar Firebase Messaging quando o Firebase for conectado
- UI do push pronta para reaparecer no iPhone

Ou seja: o que falta agora é a parte de **Apple + Firebase + Xcode + teste real**.

---

# PARTE 2 — O que você precisa ter

## PASSO 1 — Conta Apple Developer

Você precisa assinar o **Apple Developer Program**.

Sem isso, você não publica nem testa push real no iPhone.

## PASSO 2 — Conta App Store Connect

Você também precisa entrar no **App Store Connect**.

É lá que o app será criado, testado no TestFlight e depois publicado.

## PASSO 3 — Firebase

Você precisa do **projeto Firebase** que já está sendo usado no Android.

O ideal é usar o mesmo projeto Firebase do Android para também configurar o iPhone.

## PASSO 4 — Mac remoto

Como você não tem Mac, o caminho mais fácil é usar:

- Mac remoto alugado por algumas horas
- ou alguém com Mac para fazer essa etapa final

A forma mais simples para você é o **Mac remoto**.

## PASSO 5 — iPhone real

Você vai precisar de um **iPhone real** para testar o push.

Simulador não resolve o push de verdade.

---

# PARTE 3 — Dados oficiais que você vai usar em tudo

Use estes dados sempre:

- **App Name:** `EsporteID`
- **Bundle ID:** `com.esporteid.app`
- **Website:** `https://esporteid.com.br`
- **Support URL:** `https://esporteid.com.br/suporte`
- **Privacy Policy URL:** `https://esporteid.com.br/privacidade`

---

# PARTE 4 — Publicar o site antes do app

Antes de mexer no iPhone, publique o site com tudo certo.

Abra no navegador e confirme que estas páginas funcionam:

1. `https://esporteid.com.br/suporte`
2. `https://esporteid.com.br/privacidade`
3. `https://esporteid.com.br/termos`

Se qualquer uma não abrir, pare e corrija antes de continuar.

---

# PARTE 5 — Criar o app no App Store Connect

No App Store Connect:

1. criar um novo app
2. nome: `EsporteID`
3. plataforma: `iOS`
4. idioma principal: `Português (Brasil)`
5. Bundle ID: `com.esporteid.app`

Se o Bundle ID ainda não existir na Apple, crie no portal Apple Developer.

---

# PARTE 6 — Preparar o Firebase para o iPhone

## PASSO 1 — Abrir o projeto Firebase

Entre no Firebase Console e abra o projeto que hoje já atende o Android.

## PASSO 2 — Adicionar app iOS

Dentro do Firebase:

1. adicionar novo app
2. escolher **iOS**
3. informar bundle id:
   - `com.esporteid.app`
4. nome do app:
   - `EsporteID`

## PASSO 3 — Baixar arquivo iOS do Firebase

Depois de criar o app iOS, o Firebase vai oferecer um arquivo chamado:

- `GoogleService-Info.plist`

Baixe esse arquivo.

**Guarde com carinho.**

Você vai usar no Xcode.

---

# PARTE 7 — Preparar o Apple Push Notifications (APNs)

## PASSO 1 — Abrir Apple Developer

Entre em Apple Developer.

## PASSO 2 — Abrir o App ID

Abra o App ID do bundle:

- `com.esporteid.app`

## PASSO 3 — Ativar Push Notifications

Marque/habilite:

- **Push Notifications**

## PASSO 4 — Criar chave APNs

Você vai criar uma chave do tipo APNs.

Normalmente ela gera um arquivo:

- `.p8`

Quando gerar, guarde estes dados:

- **Key ID**
- **Team ID**
- arquivo `.p8`
- Bundle ID `com.esporteid.app`

---

# PARTE 8 — Ligar a chave APNs no Firebase

Volte ao Firebase Console.

Entre na área de **Cloud Messaging** do app iOS.

Envie a chave APNs `.p8` e preencha:

- **Key ID**
- **Team ID**
- **Bundle ID** = `com.esporteid.app`

Sem isso, o Firebase não consegue entregar push no iPhone.

---

# PARTE 9 — Abrir o projeto no Mac remoto

No Mac remoto, com o projeto baixado, rode:

```bash
npm install
npm run cap:sync:ios
npm run cap:open:ios
```

Isso vai abrir o projeto iOS no Xcode.

---

# PARTE 10 — O que fazer no Xcode

## PASSO 1 — Adicionar o GoogleService-Info.plist

No Xcode:

1. arraste o arquivo `GoogleService-Info.plist` para dentro do app iOS
2. confirme que ele entrou no target do app

## PASSO 2 — Conferir Signing & Capabilities

Em **Signing & Capabilities**:

- selecionar sua conta Apple
- deixar signing automático
- confirmar que o target está usando seu team

## PASSO 3 — Confirmar Push Notifications

Ainda no Xcode, confirme que existe a capability:

- **Push Notifications**

## PASSO 4 — Conferir entitlements

O projeto já foi preparado para usar entitlements.

Você só precisa confirmar se o Xcode reconheceu corretamente.

## PASSO 5 — Adicionar Firebase iOS SDK

No app iOS, você precisa garantir que estes pacotes estejam disponíveis:

- `FirebaseCore`
- `FirebaseMessaging`

Sem isso, o iPhone não gera o token FCM corretamente.

## PASSO 6 — Conferir o bundle

Confirme:

- bundle id = `com.esporteid.app`
- nome = `EsporteID`

---

# PARTE 11 — Gerar o primeiro build

Você não deve publicar direto.

Primeiro mande para **TestFlight**.

Isso permite testar tudo sem publicar para o público final.

---

# PARTE 12 — Testar o push no iPhone real

Agora vem a parte mais importante.

## PASSO 1 — Instalar no iPhone

Instale o build do TestFlight no iPhone real.

## PASSO 2 — Abrir o app e logar

Faça login normalmente.

## PASSO 3 — Ativar o push

Dentro do app:

- ative as notificações push
- aceite a permissão do iPhone

## PASSO 4 — Testar o recebimento

Você precisa verificar se:

1. a permissão foi aceita
2. o iPhone recebeu token
3. o token foi salvo no backend
4. o push chegou
5. tocar na notificação abre a tela certa

## PASSO 5 — Testes mínimos

Teste estas situações:

- app aberto
- app em segundo plano
- app fechado
- tocar na notificação
- desativar o push
- ativar de novo

Se possível, teste com o mesmo usuário em:

- Android
- iPhone

Assim você confirma que os dois funcionam sem conflito.

---

# PARTE 13 — O que testar no app além do push

Antes de publicar, teste também:

- login
- cadastro
- suporte
- termos
- privacidade
- câmera/foto
- galeria
- localização com o app aberto
- compartilhamento

---

# PARTE 14 — O que preencher na App Store

Você vai precisar preencher:

- nome do app
- descrição
- categoria
- classificação etária
- screenshots de iPhone
- Support URL
- Privacy Policy URL

## URLs que você vai colar

- **Support URL:** `https://esporteid.com.br/suporte`
- **Privacy Policy URL:** `https://esporteid.com.br/privacidade`

---

# PARTE 15 — O que escrever em Review Notes

Você pode colar algo assim:

> O app EsporteID permite cadastro, perfil esportivo, acompanhamento de partidas, ranking, torneios e notificações push no iPhone.  
> Suporte público: https://esporteid.com.br/suporte  
> Política de privacidade: https://esporteid.com.br/privacidade  
> Exclusão de conta e pedidos LGPD ficam disponíveis para usuários autenticados em “Seus dados (LGPD)”.

Se a Apple pedir acesso ao app, informe também:

- login de teste
- senha de teste

---

# PARTE 16 — Fluxo certo de publicação

Faça nesta ordem:

1. publicar o site
2. criar app iOS no Firebase
3. baixar `GoogleService-Info.plist`
4. criar chave APNs na Apple
5. subir APNs no Firebase
6. abrir o projeto no Mac remoto
7. adicionar `GoogleService-Info.plist` no Xcode
8. confirmar Signing & Capabilities
9. confirmar Push Notifications
10. gerar build
11. mandar para TestFlight
12. testar no iPhone real
13. corrigir o que aparecer
14. enviar para App Review
15. publicar

---

# PARTE 17 — Checklist final para copiar e marcar

- [ ] Conta Apple Developer ativa
- [ ] App criado no App Store Connect
- [ ] Bundle ID correto: `com.esporteid.app`
- [ ] Support URL funcionando
- [ ] Privacy Policy URL funcionando
- [ ] Projeto Firebase do Android localizado
- [ ] App iOS criado no Firebase
- [ ] `GoogleService-Info.plist` baixado
- [ ] Push Notifications ativado no Apple Developer
- [ ] Chave APNs `.p8` criada
- [ ] Key ID anotado
- [ ] Team ID anotado
- [ ] APNs configurado no Firebase
- [ ] Projeto abriu no Xcode
- [ ] `GoogleService-Info.plist` adicionado ao target iOS
- [ ] Signing configurado
- [ ] Capability Push Notifications confirmada
- [ ] Build enviado para TestFlight
- [ ] Testado em iPhone real
- [ ] Push funcionando com app aberto
- [ ] Push funcionando com app em segundo plano
- [ ] Push funcionando ao tocar na notificação
- [ ] Screenshots prontas
- [ ] Review Notes preenchidas
- [ ] Login de teste separado, se necessário
- [ ] Enviado para revisão

---

# PARTE 18 — Se der erro, o que normalmente significa

## Erro de signing
Normalmente significa:

- conta Apple não conectada direito
- team não selecionado
- provisioning/profile errado

## Erro de push no iPhone
Normalmente significa:

- APNs não foi ligado direito na Apple
- chave `.p8` não foi configurada no Firebase
- `GoogleService-Info.plist` não entrou no target
- Firebase Messaging não foi adicionado corretamente

## Push não chega, mas Android chega
Normalmente significa:

- problema no lado Apple/Firebase do iPhone
- e não no backend Android já existente

---

# PARTE 19 — O resumo mais simples possível

Se eu resumir tudo em uma frase:

> O Android já estava pronto; para o iPhone funcionar com push, você precisa ligar corretamente **Apple + Firebase + Xcode**, testar no **iPhone real** e só depois publicar.

---

# CONCLUSÃO

O projeto já foi preparado para o iPhone entrar no mesmo fluxo de push do Android.  
O que falta agora é a etapa manual de integração no **Firebase**, no **Apple Developer** e no **Xcode/macOS**.

Se você seguir este guia em ordem, consegue chegar até a publicação final sem se perder.
