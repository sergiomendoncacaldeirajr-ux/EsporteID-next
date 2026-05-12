package com.esporteid.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
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
        ensureNotificationChannel(this);

        String title = "EsporteID";
        String body = "Voce tem uma nova notificacao.";
        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) title = message.getNotification().getTitle();
            if (message.getNotification().getBody() != null) body = message.getNotification().getBody();
        }
        if (message.getData().containsKey("title")) title = message.getData().get("title");
        if (message.getData().containsKey("body")) body = message.getData().get("body");
        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);

        String url = message.getData().containsKey("url") ? message.getData().get("url") : "/comunidade#notificacoes";
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://esporteid.com.br" + url));
        intent.setPackage(getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_small)
                .setLargeIcon(largeIcon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setColor(Color.parseColor("#2563EB"))
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setShowWhen(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.notify((int) System.currentTimeMillis(), builder.build());
    }

    public static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Alertas EsporteID",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Notificacoes importantes do EsporteID");
        channel.enableLights(true);
        channel.setLightColor(Color.parseColor("#2563EB"));
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }
}
