package com.pourdecisions.barkeeply;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable back/forward navigation gestures on the WebView
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // Enable DOM storage for better app performance
            settings.setDomStorageEnabled(true);
            // Enable JavaScript (should already be enabled by Capacitor)
            settings.setJavaScriptEnabled(true);
        }
    }
    
    @Override
    public void onBackPressed() {
        // Check if WebView can go back in history
        WebView webView = getBridge().getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
