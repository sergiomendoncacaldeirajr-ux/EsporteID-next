# EsporteID Android com Capacitor

Este projeto agora tambem gera Android via Capacitor, usando a mesma base web publicada em `https://esporteid.com.br`.

## Build atual

- Application ID: `com.esporteid.app`
- Version name: `7.0.11`
- Version code: `21`
- Arquivo gerado: `C:\apps\esporteid-7.0.11-v21-capacitor-share-camera.aab`

## Assinatura

O build release usa `android/keystore.properties`, que fica ignorado pelo Git.

O arquivo local aponta para a keystore antiga do Android/TWA:

```properties
storeFile=../.codex-twa/esporteid-twa/esporteid-upload.keystore
keyAlias=esporteid
```

Nao commit as senhas nem a keystore.

## Gerar novo AAB

No Windows atual, use o Java 21 embutido no Android Studio:

```powershell
cd C:\xampp\htdocs\esporteid-next\android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat bundleRelease
```

Saida padrao:

```text
android\app\build\outputs\bundle\release\app-release.aab
```
