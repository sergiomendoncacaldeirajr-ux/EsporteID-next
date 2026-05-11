# Correção Android/TWA para Push e Permissões

Este projeto contém o Next/PWA, mas não contém o projeto Android que gera o `.aab` da Play Store.

O painel já mostra `Android/App · success`, então o servidor e o FCM aceitaram o envio. Se depois do deploy do `sw.js` com recibo o status não virar `shown`, o service worker do Android não está conseguindo exibir a notificação. Em TWA isso é corrigido no pacote Android.

## Alterações obrigatórias no projeto Android

No app Android `com.esporteid.app`, confirme estes itens antes de gerar novo `.aab`.

### 1. Dependência android-browser-helper

No `app/build.gradle`:

```gradle
dependencies {
    implementation "com.google.androidbrowserhelper:androidbrowserhelper:2.6.2"
}
```

Se o projeto Bubblewrap já tiver uma versão mais nova, mantenha a mais nova.

### 2. Permissões no AndroidManifest.xml

Antes de `<application>`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

`POST_NOTIFICATIONS` é obrigatório no Android 13+.

### 3. Service de delegação TWA

Dentro de `<application>`:

```xml
<service
    android:name=".DelegationService"
    android:enabled="true"
    android:exported="true">
    <intent-filter>
        <action android:name="android.support.customtabs.trusted.TRUSTED_WEB_ACTIVITY_SERVICE" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
    <meta-data
        android:name="android.support.customtabs.trusted.SMALL_ICON"
        android:resource="@drawable/ic_notification" />
</service>

<activity
    android:name="com.google.androidbrowserhelper.trusted.NotificationPermissionRequestActivity"
    android:exported="false" />
```

`@drawable/ic_notification` precisa ser um ícone pequeno monocromático. Não use a logo colorida.

### 4. Classe DelegationService

Crie `app/src/main/java/.../DelegationService.java` no mesmo package do app:

```java
package com.esporteid.app;

public class DelegationService extends com.google.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();
        registerExtraCommandHandler(
            new com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler()
        );
    }
}
```

Se o projeto usa Kotlin:

```kotlin
package com.esporteid.app

class DelegationService : com.google.androidbrowserhelper.trusted.DelegationService() {
    override fun onCreate() {
        super.onCreate()
        registerExtraCommandHandler(
            com.google.androidbrowserhelper.locationdelegation.LocationDelegationExtraCommandHandler()
        )
    }
}
```

### 5. Gerar e publicar novo AAB

```powershell
bubblewrap update
bubblewrap build
```

Publique o `.aab` novo na Play Console.

Depois de instalar a atualização no Android:

1. Abra Configurações do Android > Apps > EsporteID > Notificações.
2. Deixe notificações permitidas.
3. Abra o EsporteID uma vez.
4. Dispare o teste no admin.

Resultado esperado no painel:

```text
Android/App · shown
```

Se aparecer apenas:

```text
Android/App · success
```

o FCM aceitou, mas o app Android ainda não delegou/exibiu a notificação.
