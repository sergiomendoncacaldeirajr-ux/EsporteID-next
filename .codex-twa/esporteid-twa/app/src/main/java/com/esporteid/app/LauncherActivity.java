package com.esporteid.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;

public class LauncherActivity extends Activity {
    private static final String HOME_URL = "https://esporteid.com.br/";
    private static final String TRUSTED_HOST = "esporteid.com.br";
    private static final String TRUSTED_WWW_HOST = "www.esporteid.com.br";
    private static final String APP_VERSION = "7.0.2";
    private static final int REQUEST_POST_NOTIFICATIONS = 7001;
    private static final int REQUEST_LOCATION = 7002;
    private static final int REQUEST_FILE_CHOOSER = 7003;
    private static final String PREFS = "esporteid_native";
    private static final String KEY_PERMISSION_ASKED = "notification_permission_asked";

    private WebView webView;
    private ImageView splashLogo;
    private String pendingGeolocationOrigin;
    private GeolocationPermissions.Callback pendingGeolocationCallback;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWindow();
        EsporteIdFirebaseMessagingService.ensureNotificationChannel(this);
        createWebView();
        requestNotificationPermissionIfNeeded();
        FcmTokenBridge.refreshToken(this, this::registerTokenInWebSession);
        loadInitialUrl(getIntent());

        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadInitialUrl(intent);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_FILE_CHOOSER || filePathCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                result = new Uri[count];
                for (int i = 0; i < count; i += 1) {
                    result[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                result = new Uri[] { data.getData() };
            }
        }
        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_LOCATION || pendingGeolocationCallback == null) return;
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        pendingGeolocationCallback.invoke(pendingGeolocationOrigin, granted, false);
        pendingGeolocationOrigin = null;
        pendingGeolocationCallback = null;
    }

    private void configureWindow() {
        Window window = getWindow();
        window.setStatusBarColor(Color.parseColor("#0B0F14"));
        window.setNavigationBarColor(Color.BLACK);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.getAttributes().layoutInDisplayCutoutMode =
                    android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }

    private void createWebView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0B0F14"));

        webView = new WebView(this);
        webView.setAlpha(0f);
        webView.setBackgroundColor(Color.parseColor("#0B0F14"));
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        splashLogo = new ImageView(this);
        splashLogo.setImageResource(R.drawable.splash);
        splashLogo.setAdjustViewBounds(true);
        splashLogo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(dp(180), dp(180));
        logoParams.gravity = Gravity.CENTER;
        splashLogo.setLayoutParams(logoParams);

        configureWebViewSettings();
        root.addView(webView);
        root.addView(splashLogo);
        setContentView(root);
    }

    private void configureWebViewSettings() {
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " EsporteIDAndroidApp/" + APP_VERSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        webView.setWebViewClient(new EsporteIdWebViewClient());
        webView.setWebChromeClient(new EsporteIdWebChromeClient());
    }

    private void loadInitialUrl(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        String url = data != null && isHttpUrl(data) ? data.toString() : HOME_URL;
        webView.loadUrl(url);
    }

    private boolean isHttpUrl(Uri uri) {
        String scheme = uri.getScheme();
        return "https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme);
    }

    private boolean isTrustedEsporteIdPage() {
        if (webView == null || webView.getUrl() == null) return false;
        Uri uri = Uri.parse(webView.getUrl());
        String host = uri.getHost();
        return TRUSTED_HOST.equalsIgnoreCase(host) || TRUSTED_WWW_HOST.equalsIgnoreCase(host);
    }

    private void registerTokenInWebSession(String token) {
        if (token == null || token.trim().isEmpty()) return;
        if (webView == null) return;
        runOnUiThread(() -> {
            if (!isTrustedEsporteIdPage()) return;
            String safeToken = jsString(token.trim());
            String safeDevice = jsString("Android/App WebView");
            String safeVersion = jsString(APP_VERSION);
            String script =
                    "(function(){try{localStorage.setItem('eid_android_fcm_token'," + safeToken + ");" +
                    "var active=localStorage.getItem('eid_android_fcm_opt_out')!=='1';" +
                    "return fetch('/api/push/fcm/register',{method:'POST',credentials:'include'," +
                    "headers:{'Content-Type':'application/json'},body:JSON.stringify({token:" + safeToken +
                    ",device:" + safeDevice + ",appVersion:" + safeVersion + ",active:active})})" +
                    ".then(function(r){return r.ok?'ok':'http:'+r.status;}).catch(function(){return 'error';});" +
                    "}catch(e){return Promise.resolve('error');}})();";
            webView.evaluateJavascript(script, null);
        });
    }

    private String jsString(String value) {
        return "'" + value
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r") + "'";
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (prefs.getBoolean(KEY_PERMISSION_ASKED, false)) return;
        prefs.edit().putBoolean(KEY_PERMISSION_ASKED, true).apply();
        requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, REQUEST_POST_NOTIFICATIONS);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private class EsporteIdWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isHttpUrl(uri)) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
                return true;
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            CookieManager.getInstance().flush();
            String token = FcmTokenBridge.getToken(LauncherActivity.this);
            registerTokenInWebSession(token);
            webView.animate().alpha(1f).setDuration(180).start();
            if (splashLogo != null && splashLogo.getVisibility() == View.VISIBLE) {
                splashLogo.animate().alpha(0f).setDuration(160).withEndAction(() -> splashLogo.setVisibility(View.GONE)).start();
            }
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            super.onReceivedHttpError(view, request, errorResponse);
        }
    }

    private class EsporteIdWebChromeClient extends WebChromeClient {
        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                    checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                    checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                callback.invoke(origin, true, false);
                return;
            }
            pendingGeolocationOrigin = origin;
            pendingGeolocationCallback = callback;
            requestPermissions(new String[] { Manifest.permission.ACCESS_FINE_LOCATION }, REQUEST_LOCATION);
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (LauncherActivity.this.filePathCallback != null) {
                LauncherActivity.this.filePathCallback.onReceiveValue(null);
            }
            LauncherActivity.this.filePathCallback = filePathCallback;
            Intent intent = fileChooserParams.createIntent();
            try {
                startActivityForResult(intent, REQUEST_FILE_CHOOSER);
            } catch (ActivityNotFoundException e) {
                LauncherActivity.this.filePathCallback = null;
                return false;
            }
            return true;
        }
    }
}
