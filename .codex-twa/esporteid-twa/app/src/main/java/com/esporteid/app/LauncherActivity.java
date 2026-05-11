/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.esporteid.app;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private static final int REQUEST_POST_NOTIFICATIONS = 7001;
    private static final String PREFS = "esporteid_native";
    private static final String KEY_PERMISSION_ASKED = "notification_permission_asked";
    private static final String KEY_LAST_TOKEN_OPENED = "last_fcm_token_opened";

    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FcmTokenBridge.refreshToken(this, this::openWithFreshToken);
        requestNotificationPermissionIfNeeded();
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        String token = FcmTokenBridge.getToken(this);
        if (token != null && !token.isEmpty() && uri.getQueryParameter("eid_fcm_token") == null) {
            uri = uri.buildUpon().appendQueryParameter("eid_fcm_token", token).build();
            rememberOpenedToken(token);
        }

        return uri;
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (prefs.getBoolean(KEY_PERMISSION_ASKED, false)) return;
        prefs.edit().putBoolean(KEY_PERMISSION_ASKED, true).apply();
        ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                REQUEST_POST_NOTIFICATIONS
        );
    }

    private void openWithFreshToken(String token) {
        if (token == null || token.isEmpty()) return;
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String lastToken = prefs.getString(KEY_LAST_TOKEN_OPENED, "");
        if (token.equals(lastToken)) return;
        rememberOpenedToken(token);

        Uri uri = Uri.parse("https://esporteid.com.br/")
                .buildUpon()
                .appendQueryParameter("eid_fcm_token", token)
                .appendQueryParameter("eid_app", "android")
                .build();
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.setPackage(getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
    }

    private void rememberOpenedToken(String token) {
        getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString(KEY_LAST_TOKEN_OPENED, token)
                .apply();
    }
}
