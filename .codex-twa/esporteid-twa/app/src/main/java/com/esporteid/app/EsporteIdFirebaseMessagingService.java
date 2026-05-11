package com.esporteid.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class EsporteIdFirebaseMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "esporteid_alerts";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        FcmTokenBridge.saveToken(this, token);
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        ensureNotificationChannel();

        String title = "EsporteID";
        String body = "Voce tem uma nova notificacao.";
        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) title = message.getNotification().getTitle();
            if (message.getNotification().getBody() != null) body = message.getNotification().getBody();
        }
        if (message.getData().containsKey("title")) title = message.getData().get("title");
        if (message.getData().containsKey("body")) body = message.getData().get("body");

        String url = message.getData().containsKey("url") ? message.getData().get("url") : "/comunidade#notificacoes";
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://esporteid.com.br" + url));
        intent.setPackage(getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setColor(Color.parseColor("#2563EB"))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Alertas EsporteID",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Notificacoes importantes do EsporteID");
        manager.createNotificationChannel(channel);
    }
}
