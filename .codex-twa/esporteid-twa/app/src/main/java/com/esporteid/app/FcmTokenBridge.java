package com.esporteid.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.firebase.messaging.FirebaseMessaging;

public final class FcmTokenBridge {
    private static final String PREFS = "esporteid_fcm";
    private static final String KEY_TOKEN = "token";

    private FcmTokenBridge() {}

    public interface TokenCallback {
        void onToken(String token);
    }

    public static String getToken(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return prefs.getString(KEY_TOKEN, "");
    }

    public static void saveToken(Context context, String token) {
        if (token == null || token.trim().isEmpty()) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_TOKEN, token.trim()).apply();
    }

    public static void refreshToken(Context context) {
        refreshToken(context, null);
    }

    public static void refreshToken(Context context, TokenCallback callback) {
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener((token) -> {
            saveToken(context, token);
            if (callback != null && token != null && !token.trim().isEmpty()) {
                callback.onToken(token.trim());
            }
        });
    }
}
