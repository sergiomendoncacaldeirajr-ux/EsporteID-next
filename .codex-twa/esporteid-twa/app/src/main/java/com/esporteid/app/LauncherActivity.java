package com.esporteid.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.CalendarContract;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import org.json.JSONObject;

public class LauncherActivity extends Activity {
    private static final String HOME_URL = "https://esporteid.com.br/dashboard";
    private static final String TRUSTED_HOST = "esporteid.com.br";
    private static final String TRUSTED_WWW_HOST = "www.esporteid.com.br";
    private static final String APP_VERSION = "7.0.8";
    private static final int REQUEST_POST_NOTIFICATIONS = 7001;
    private static final int REQUEST_LOCATION = 7002;
    private static final int REQUEST_FILE_CHOOSER = 7003;
    private static final String PREFS = "esporteid_native";
    private static final String KEY_PERMISSION_ASKED = "notification_permission_asked";

    private FrameLayout rootLayout;
    private FrameLayout webFrame;
    private SwipeRefreshLayout swipeRefreshLayout;
    private WebView webView;
    private WebView fullscreenWebView;
    private FrameLayout fullscreenContainer;
    private View customFullscreenView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private ImageView splashLogo;
    private FrameLayout errorOverlay;
    private boolean hasLoadedTrustedPage;
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
    protected void onResume() {
        super.onResume();
        dispatchWebEvent("eid:pwa-resume");
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
            if (isHomeUrl(webView.getUrl())) {
                moveTaskToBack(true);
                return;
            }
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

        LinearLayout appShell = new LinearLayout(this);
        appShell.setOrientation(LinearLayout.VERTICAL);
        appShell.setBackgroundColor(Color.parseColor("#0B0F14"));
        appShell.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        webFrame = new FrameLayout(this);
        webFrame.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
        ));

        webView = new WebView(this);
        webView.setAlpha(0f);
        webView.setBackgroundColor(Color.parseColor("#0B0F14"));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        }
        webView.setLayoutParams(new SwipeRefreshLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        swipeRefreshLayout = new SwipeRefreshLayout(this);
        swipeRefreshLayout.setColorSchemeColors(Color.parseColor("#2563EB"), Color.parseColor("#F97316"));
        swipeRefreshLayout.setProgressBackgroundColorSchemeColor(Color.parseColor("#111827"));
        swipeRefreshLayout.setOnRefreshListener(() -> {
            if (webView != null) {
                webView.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                webView.reload();
            }
        });
        swipeRefreshLayout.addView(webView);

        splashLogo = new ImageView(this);
        splashLogo.setImageResource(R.drawable.splash);
        splashLogo.setAdjustViewBounds(true);
        splashLogo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(dp(180), dp(180));
        logoParams.gravity = Gravity.CENTER;
        splashLogo.setLayoutParams(logoParams);

        errorOverlay = createErrorOverlay();
        configureWebViewSettings();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webView.setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> updateSwipeRefreshEnabled());
        }

        webFrame.addView(swipeRefreshLayout);
        webFrame.addView(errorOverlay);
        webFrame.addView(splashLogo);
        appShell.addView(webFrame);
        rootLayout.addView(appShell);
        setContentView(rootLayout);
    }

    private FrameLayout createErrorOverlay() {
        FrameLayout overlay = new FrameLayout(this);
        overlay.setVisibility(View.GONE);
        overlay.setClickable(true);
        overlay.setBackgroundColor(Color.parseColor("#0B0F14"));
        overlay.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(28), dp(28), dp(28), dp(28));
        FrameLayout.LayoutParams panelParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        panelParams.gravity = Gravity.CENTER;
        panel.setLayoutParams(panelParams);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.splash);
        logo.setAdjustViewBounds(true);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(112), dp(112));
        logoParams.gravity = Gravity.CENTER_HORIZONTAL;
        logo.setLayoutParams(logoParams);

        TextView title = new TextView(this);
        title.setText("Nao foi possivel carregar");
        title.setTextColor(Color.WHITE);
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setPadding(0, dp(16), 0, dp(6));

        TextView message = new TextView(this);
        message.setText("Verifique sua conexao e tente novamente.");
        message.setTextColor(Color.parseColor("#B6C2D4"));
        message.setTextSize(14);
        message.setGravity(Gravity.CENTER);
        message.setPadding(dp(18), 0, dp(18), dp(20));

        TextView retry = createRetryButton();
        retry.setOnClickListener((v) -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            hideErrorOverlay();
            if (webView != null) webView.reload();
        });

        panel.addView(logo);
        panel.addView(title);
        panel.addView(message);
        panel.addView(retry);
        overlay.addView(panel);
        return overlay;
    }

    private TextView createRetryButton() {
        TextView button = new TextView(this);
        button.setText("Tentar de novo");
        button.setTextColor(Color.WHITE);
        button.setTextSize(14);
        button.setGravity(Gravity.CENTER);
        button.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        button.setClickable(true);
        GradientDrawable background = new GradientDrawable();
        background.setShape(GradientDrawable.RECTANGLE);
        background.setCornerRadius(dp(18));
        background.setColor(Color.parseColor("#2563EB"));
        background.setStroke(dp(1), Color.parseColor("#4F8CFF"));
        button.setBackground(background);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(174), dp(44));
        params.gravity = Gravity.CENTER_HORIZONTAL;
        button.setLayoutParams(params);
        return button;
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
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " EsporteIDAndroidApp/" + APP_VERSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            settings.setOffscreenPreRaster(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        webView.addJavascriptInterface(new EsporteIdAndroidBridge(), "EsporteIDAndroid");
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

    private boolean isWhatsAppUri(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        return "whatsapp".equals(scheme) ||
                "wa.me".equals(host) ||
                "www.wa.me".equals(host) ||
                "api.whatsapp.com".equals(host) ||
                "web.whatsapp.com".equals(host);
    }

    private boolean isTrustedEsporteIdPage() {
        if (webView == null || webView.getUrl() == null) return false;
        Uri uri = Uri.parse(webView.getUrl());
        return isTrustedUri(uri);
    }

    private boolean isHomeUrl(String url) {
        if (url == null || url.trim().isEmpty()) return true;
        try {
            Uri uri = Uri.parse(url);
            if (!isTrustedUri(uri)) return false;
            String path = uri.getPath();
            if (path == null || path.trim().isEmpty()) path = "/";
            return "/".equals(path) || "/dashboard".equals(path);
        } catch (Exception ignored) {
            return false;
        }
    }

    private void openExternalUrl(String url) {
        if (url == null || url.trim().isEmpty()) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException ignored) {
            /* ignore */
        }
    }

    private String extractWhatsAppPhone(Uri uri) {
        if (uri == null) return "";
        String rawPhone = uri.getQueryParameter("phone");
        String phone = (rawPhone == null ? "" : rawPhone).replaceAll("\\D", "");
        if (!phone.isEmpty()) return phone;
        String rawPath = uri.getPath();
        String path = rawPath == null ? "" : rawPath;
        return path.replaceAll("\\D", "");
    }

    private boolean tryStartWhatsAppIntent(Intent intent) {
        try {
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException ignored) {
            return false;
        }
    }

    private void openWhatsAppUri(Uri uri) {
        String phone = extractWhatsAppPhone(uri);
        Uri nativeUri = phone.isEmpty()
                ? uri
                : Uri.parse("whatsapp://send?phone=" + phone);
        Intent nativeIntent = new Intent(Intent.ACTION_VIEW, nativeUri);
        nativeIntent.setPackage("com.whatsapp");
        if (tryStartWhatsAppIntent(nativeIntent)) return;

        Intent businessIntent = new Intent(Intent.ACTION_VIEW, nativeUri);
        businessIntent.setPackage("com.whatsapp.w4b");
        if (tryStartWhatsAppIntent(businessIntent)) return;

        Uri fallbackUri = phone.isEmpty() ? uri : Uri.parse("https://wa.me/" + phone);
        tryStartWhatsAppIntent(new Intent(Intent.ACTION_VIEW, fallbackUri));
    }

    private void injectNativeAppRuntime(WebView target) {
        if (target == null) return;
        String script =
                "(function(){try{" +
                "document.documentElement.dataset.eidRuntime='android-app';" +
                "document.body.classList.add('eid-native-android-app');" +
                "window.dispatchEvent(new Event('eid:native-app-ready'));" +
                "}catch(e){}})();";
        target.evaluateJavascript(script, null);
    }

    private void updateSwipeRefreshEnabled() {
        if (swipeRefreshLayout == null || webView == null) return;
        swipeRefreshLayout.setEnabled(
                fullscreenContainer == null &&
                webView.getScrollY() <= 0 &&
                shouldEnablePullToRefresh()
        );
    }

    private boolean shouldEnablePullToRefresh() {
        if (webView == null || webView.getUrl() == null) return false;
        try {
            Uri uri = Uri.parse(webView.getUrl());
            if (!isTrustedUri(uri)) return false;
            String path = uri.getPath();
            if (path == null || path.trim().isEmpty()) path = "/";
            return !("/".equals(path) || "/dashboard".equals(path));
        } catch (Exception ignored) {
            return false;
        }
    }

    private void dispatchWebEvent(String eventName) {
        if (webView == null || eventName == null || eventName.trim().isEmpty()) return;
        if (!isTrustedEsporteIdPage()) return;
        String safeEvent = jsString(eventName);
        webView.evaluateJavascript(
                "(function(){try{window.dispatchEvent(new Event(" + safeEvent + "));}catch(e){}})();",
                null
        );
    }

    private class EsporteIdAndroidBridge {
        @JavascriptInterface
        public void addCalendarEvent(String payload) {
            if (payload == null || payload.trim().isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    if (!isTrustedEsporteIdPage()) return;
                    JSONObject json = new JSONObject(payload);
                    String title = json.optString("title", "EsporteID");
                    String location = json.optString("location", "");
                    String description = json.optString("description", "");
                    long startMs = json.optLong("startMs", 0L);
                    long endMs = json.optLong("endMs", 0L);
                    if (startMs <= 0L) return;
                    if (endMs <= startMs) endMs = startMs + (90L * 60L * 1000L);
                    if (webView != null) webView.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);

                    Intent intent = new Intent(Intent.ACTION_INSERT)
                            .setData(CalendarContract.Events.CONTENT_URI)
                            .putExtra(CalendarContract.Events.TITLE, title)
                            .putExtra(CalendarContract.Events.EVENT_LOCATION, location)
                            .putExtra(CalendarContract.Events.DESCRIPTION, description)
                            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, startMs)
                            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endMs)
                            .putExtra(CalendarContract.Events.AVAILABILITY, CalendarContract.Events.AVAILABILITY_BUSY);
                    startActivity(intent);
                } catch (Exception ignored) {
                    /* Calendário nativo indisponível ou payload inválido: ignora sem quebrar o app. */
                }
            });
        }
    }

    private void showErrorOverlay() {
        if (swipeRefreshLayout != null) swipeRefreshLayout.setRefreshing(false);
        if (hasLoadedTrustedPage) return;
        if (errorOverlay == null) return;
        errorOverlay.setAlpha(0f);
        errorOverlay.setVisibility(View.VISIBLE);
        errorOverlay.animate().alpha(1f).setDuration(160).start();
    }

    private void hideErrorOverlay() {
        if (errorOverlay == null || errorOverlay.getVisibility() != View.VISIBLE) return;
        errorOverlay.setVisibility(View.GONE);
    }

    private void startNativeLoading() {
        if (swipeRefreshLayout != null) swipeRefreshLayout.setRefreshing(false);
    }

    private void finishNativeLoading() {
        if (swipeRefreshLayout != null) swipeRefreshLayout.setRefreshing(false);
    }

    private void revealTrustedPage(WebView view, String url) {
        if (view == null || url == null) return;
        Uri uri;
        try {
            uri = Uri.parse(url);
        } catch (Exception ignored) {
            return;
        }
        if (!isTrustedUri(uri)) return;
        hasLoadedTrustedPage = true;
        hideErrorOverlay();
        injectNativeAppRuntime(view);
        if (webView != null && webView.getAlpha() < 1f) {
            webView.animate().alpha(1f).setDuration(140).start();
        }
        if (splashLogo != null && splashLogo.getVisibility() == View.VISIBLE) {
            splashLogo.animate().alpha(0f).setDuration(130).withEndAction(() -> splashLogo.setVisibility(View.GONE)).start();
        }
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
        fullscreenContainer.addView(createFullscreenToolbar(
                "Link externo",
                () -> {
                    if (fullscreenWebView != null && fullscreenWebView.canGoBack()) fullscreenWebView.goBack();
                    else closeFullscreenOverlay();
                },
                () -> {
                    if (fullscreenWebView != null) fullscreenWebView.reload();
                },
                () -> openExternalUrl(fullscreenWebView != null && fullscreenWebView.getUrl() != null ? fullscreenWebView.getUrl() : url),
                this::closeFullscreenOverlay
        ));
        rootLayout.addView(fullscreenContainer);
        setImmersiveMode(true);
        updateSwipeRefreshEnabled();
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
        fullscreenContainer.addView(createFullscreenToolbar(
                "Tela cheia",
                this::closeFullscreenOverlay,
                null,
                null,
                this::closeFullscreenOverlay
        ));
        rootLayout.addView(fullscreenContainer);
        webView.setVisibility(View.INVISIBLE);
        setImmersiveMode(true);
        updateSwipeRefreshEnabled();
    }

    private View createFullscreenToolbar(String title, Runnable onBack, Runnable onRefresh, Runnable onOpenExternal, Runnable onClose) {
        FrameLayout controls = new FrameLayout(this);
        controls.setClickable(false);
        controls.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setClickable(true);
        bar.setPadding(dp(10), dp(8), dp(10), dp(8));
        GradientDrawable background = new GradientDrawable();
        background.setShape(GradientDrawable.RECTANGLE);
        background.setColor(Color.parseColor("#EE0B0F14"));
        background.setStroke(dp(1), Color.parseColor("#263A56"));
        background.setCornerRadius(dp(22));
        bar.setBackground(background);
        FrameLayout.LayoutParams barParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(56)
        );
        barParams.gravity = Gravity.TOP | Gravity.START;
        barParams.setMargins(dp(10), dp(14), dp(10), 0);
        bar.setLayoutParams(barParams);

        TextView back = createToolbarButton("< Voltar");
        back.setOnClickListener((v) -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            onBack.run();
        });
        bar.addView(back);

        TextView label = new TextView(this);
        label.setText(title);
        label.setTextColor(Color.parseColor("#DCE7F7"));
        label.setTextSize(12);
        label.setGravity(Gravity.CENTER);
        label.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        label.setSingleLine(true);
        label.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
        bar.addView(label);

        if (onRefresh != null) {
            TextView refresh = createToolbarButton("Atualizar");
            refresh.setOnClickListener((v) -> {
                v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                onRefresh.run();
            });
            bar.addView(refresh);
        }

        if (onOpenExternal != null) {
            TextView open = createToolbarButton("Abrir");
            open.setOnClickListener((v) -> {
                v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                onOpenExternal.run();
            });
            bar.addView(open);
        }

        TextView close = createToolbarButton("Fechar");
        close.setOnClickListener((v) -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            onClose.run();
        });
        bar.addView(close);

        controls.addView(bar);
        return controls;
    }

    private TextView createToolbarButton(String text) {
        TextView button = new TextView(this);
        button.setText(text);
        button.setTextColor(Color.WHITE);
        button.setTextSize(11);
        button.setGravity(Gravity.CENTER);
        button.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        button.setClickable(true);
        button.setMinWidth(dp(54));
        GradientDrawable background = new GradientDrawable();
        background.setShape(GradientDrawable.RECTANGLE);
        background.setCornerRadius(dp(16));
        background.setColor(Color.parseColor("#263A56"));
        background.setStroke(dp(1), Color.parseColor("#35527A"));
        button.setBackground(background);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                dp(34)
        );
        params.setMargins(dp(3), 0, dp(3), 0);
        button.setLayoutParams(params);
        return button;
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
        back.setOnClickListener((v) -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            onBack.run();
        });

        TextView close = createControlButton("X");
        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(dp(44), dp(44));
        closeParams.gravity = Gravity.TOP | Gravity.END;
        closeParams.setMargins(0, dp(22), dp(14), 0);
        close.setLayoutParams(closeParams);
        close.setOnClickListener((v) -> {
            v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            onClose.run();
        });

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
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " EsporteIDAndroidApp/" + APP_VERSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            settings.setOffscreenPreRaster(true);
        }
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
        updateSwipeRefreshEnabled();
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
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            startNativeLoading();
            hideErrorOverlay();
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isWhatsAppUri(uri)) {
                openWhatsAppUri(uri);
                return true;
            }
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
            if (swipeRefreshLayout != null) swipeRefreshLayout.setRefreshing(false);
            finishNativeLoading();
            revealTrustedPage(view, url);
            updateSwipeRefreshEnabled();
            String token = FcmTokenBridge.getToken(LauncherActivity.this);
            registerTokenInWebSession(token);
        }

        @Override
        public void onPageCommitVisible(WebView view, String url) {
            super.onPageCommitVisible(view, url);
            revealTrustedPage(view, url);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request != null && request.isForMainFrame()) showErrorOverlay();
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            super.onReceivedHttpError(view, request, errorResponse);
            if (request != null && request.isForMainFrame() && errorResponse != null && errorResponse.getStatusCode() >= 500) {
                showErrorOverlay();
            }
        }
    }

    private class EsporteIdWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            super.onProgressChanged(view, newProgress);
        }

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
