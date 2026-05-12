# EsporteID iOS com Capacitor

Esta pasta prepara o EsporteID para iOS usando a mesma base web publicada em `https://esporteid.com.br`.

O arquivo Android `.aab` nao e convertido para iOS. Ele foi usado apenas como referencia de identidade:

- Nome: `EsporteID`
- Bundle/app id: `com.esporteid.app`
- URL principal: `https://esporteid.com.br`
- Icone base: `public/pwa-icon-source.png`

## Estrutura criada

- `capacitor.config.ts`: configuracao compartilhada Capacitor.
- `capacitor-www/`: fallback local minimo para o app nativo.
- `ios/`: projeto Xcode para iPhone/iPad.
- `android/`: projeto Android Capacitor, caso o Android seja migrado depois da TWA para a mesma base.

## Fluxo no Mac

Requisitos:

- Apple Developer Program ativo.
- macOS com Xcode atual.
- CocoaPods/Swift Package Manager funcionando no Xcode.

Passos:

```bash
npm install
npm run cap:sync:ios
npm run cap:open:ios
```

No Xcode:

1. Abra `ios/App/App.xcworkspace`.
2. Selecione o time da conta Apple Developer em Signing & Capabilities.
3. Confirme o Bundle Identifier `com.esporteid.app`.
4. Ajuste version/build number.
5. Rode em um iPhone real e valide login, cadastro, links, camera/fotos se forem usados e notificacoes se forem ativadas.
6. Gere o Archive em Product > Archive.
7. Envie pelo Organizer para App Store Connect/TestFlight.

## Atencao para revisao da Apple

O app iOS carrega o EsporteID via WKWebView/Capacitor. Para reduzir risco de rejeicao por "Minimum Functionality", mantenha uma experiencia com valor real de app:

- login/cadastro funcionando sem links quebrados;
- politica de privacidade e suporte acessiveis;
- telas bem adaptadas a iPhone;
- permissoes com textos claros quando recursos nativos forem adicionados;
- recursos nativos relevantes quando possivel, como compartilhamento, camera/fotos, notificacoes ou login Apple.

