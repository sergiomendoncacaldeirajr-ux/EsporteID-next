package com.esporteid.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
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
import android.widget.TextView;

public class LauncherActivity extends Activity {
    private static final String HOME_URL = "https://esporteid.com.br/";
    private static final String TRUSTED_HOST = "esporteid.com.br";
    private static final String TRUSTED_WWW_HOST = "www.esporteid.com.br";
    private static final String APP_VERSION = "7.0.3";
    private static final int REQUEST_POST_NOTIFICATIONS = 7001;
    private static final int REQUEST_LOCATION = 7002;
    private static final int REQUEST_FILE_CHOOSER = 7003;
    private static final String PREFS = "esporteid_native";
    private static final String KEY_PERMISSION_ASKED = "notification_permission_asked";

    private FrameLayout rootLayout;
    private WebView webView;
    private WebView fullscreenWebView;
    private FrameLayout fullscreenContainer;
    private View customFullscreenView;
    private WebChromeClient.CustomViewCallback customViewCallback;
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
        if (customFullscreenView != null) {
            closeFullscreenOverlay();
            return;
        }
        if (fullscreenWebView != null) {
            if (fullscreenWebView.canGoBack()) {
                fullscreenWebView.goBack();
            } else {
                closeFullscreenOverlay();
            }
            return;
        }
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
    protected void onDestroy() {
        closeFullscreenOverlay();
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
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
        rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.parseColor("#0B0F14"));

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
        rootLayout.addView(webView);
        rootLayout.addView(splashLogo);
        setContentView(rootLayout);
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

    private boolean isTrustedUri(Uri uri) {
        String host = uri.getHost();
        return TRUSTED_HOST.equalsIgnoreCase(host) || TRUSTED_WWW_HOST.equalsIgnoreCase(host);
    }

    private boolean isTrustedEsporteIdPage() {
        if (webView == null || webView.getUrl() == null) return false;
        Uri uri = Uri.parse(webView.getUrl());
        return isTrustedUri(uri);
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

    private void showFullscreenWebView(String url) {
        closeFullscreenOverlay();
        fullscreenContainer = new FrameLayout(this);
        fullscreenContainer.setBackgroundColor(Color.parseColor("#0B0F14"));
        fullscreenContainer.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        fullscreenWebView = new WebView(this);
        fullscreenWebView.setBackgroundColor(Color.parseColor("#0B0F14"));
        fullscreenWebView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        configureSecondaryWebView(fullscreenWebView);
        fullscreenContainer.addView(fullscreenWebView);
        fullscreenContainer.addView(createFullscreenControls(
                () -> {
                    if (fullscreenWebView != null && fullscreenWebView.canGoBack()) fullscreenWebView.goBack();
                    else closeFullscreenOverlay();
                },
                this::closeFullscreenOverlay
        ));
        rootLayout.addView(fullscreenContainer);
        setImmersiveMode(true);
        fullscreenWebView.loadUrl(url);
    }

    private void showCustomFullscreenView(View view, WebChromeClient.CustomViewCallback callback) {
        closeFullscreenOverlay();
        customFullscreenView = view;
        customViewCallback = callback;
        fullscreenContainer = new FrameLayout(this);
        fullscreenContainer.setBackgroundColor(Color.BLACK);
        fullscreenContainer.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        fullscreenContainer.addView(view, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        fullscreenContainer.addView(createFullscreenControls(this::closeFullscreenOverlay, this::closeFullscreenOverlay));
        rootLayout.addView(fullscreenContainer);
        webView.setVisibility(View.INVISIBLE);
        setImmersiveMode(true);
    }

    private View createFullscreenControls(Runnable onBack, Runnable onClose) {
        FrameLayout controls = new FrameLayout(this);
        controls.setClickable(false);
        controls.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        TextView back = createControlButton("<");
        FrameLayout.LayoutParams backParams = new FrameLayout.LayoutParams(dp(44), dp(44));
        backParams.gravity = Gravity.TOP | Gravity.START;
        backParams.setMargins(dp(14), dp(22), 0, 0);
        back.setLayoutParams(backParams);
        back.setOnClickListener((v) -> onBack.run());

        TextView close = createControlButton("X");
        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(dp(44), dp(44));
        closeParams.gravity = Gravity.TOP | Gravity.END;
        closeParams.setMargins(0, dp(22), dp(14), 0);
        close.setLayoutParams(closeParams);
        close.setOnClickListener((v) -> onClose.run());

        controls.addView(back);
        controls.addView(close);
        return controls;
    }

    private TextView createControlButton(String text) {
        TextView button = new TextView(this);
        button.setText(text);
        button.setTextColor(Color.WHITE);
        button.setTextSize(20);
        button.setGravity(Gravity.CENTER);
        button.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        button.setClickable(true);
        GradientDrawable background = new GradientDrawable();
        background.setShape(GradientDrawable.OVAL);
        background.setColor(Color.parseColor("#CC0B0F14"));
        background.setStroke(dp(1), Color.parseColor("#663B82F6"));
        button.setBackground(background);
        return button;
    }

    private void configureSecondaryWebView(WebView target) {
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(target, true);
        }
        WebSettings settings = target.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setUserAgentString(settings.getUserAgentString() + " EsporteIDAndroidApp/" + APP_VERSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }
        target.setWebViewClient(new WebViewClient());
        target.setWebChromeClient(new WebChromeClient());
    }

    private void closeFullscreenOverlay() {
        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }
        customFullscreenView = null;
        if (fullscreenWebView != null) {
            fullscreenWebView.stopLoading();
            fullscreenWebView.destroy();
            fullscreenWebView = null;
        }
        if (fullscreenContainer != null) {
            rootLayout.removeView(fullscreenContainer);
            fullscreenContainer = null;
        }
        if (webView != null) webView.setVisibility(View.VISIBLE);
        setImmersiveMode(false);
    }

    private void setImmersiveMode(boolean enabled) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller == null) return;
            if (enabled) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            } else {
                controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
            return;
        }
        int flags = enabled
                ? View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                : View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    private class EsporteIdWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isHttpUrl(uri)) {
                if (isTrustedUri(uri)) return false;
                showFullscreenWebView(uri.toString());
                return true;
            }
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
        public void onShowCustomView(View view, CustomViewCallback callback) {
            showCustomFullscreenView(view, callback);
        }

        @Override
        public void onHideCustomView() {
            closeFullscreenOverlay();
        }

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
