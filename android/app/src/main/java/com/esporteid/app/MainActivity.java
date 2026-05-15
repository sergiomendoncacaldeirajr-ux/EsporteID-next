package com.esporteid.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(EidCalendarPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();

        // Desabilita overscroll (pull-to-refresh e glow de borda) no WebView Android
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        // Desabilita barras de scroll nativas do WebView
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
    }
}
