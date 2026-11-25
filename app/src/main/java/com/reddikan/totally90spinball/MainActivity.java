package com.reddikan.totally90spinball;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * Fullscreen shell for Totally 90's Pinball.
 * The game runs from bundled assets; controller buttons are forwarded to it
 * as window.__pad(name, down). L1 = left flipper, R2 = right flipper.
 */
public class MainActivity extends Activity {
    private WebView web;
    private boolean l2Axis = false, r2Axis = false;
    private int hatX = 0, hatY = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        web.setFocusable(false);
        web.setFocusableInTouchMode(false);
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/www/index.html");
        hideBars();
    }

    private void hideBars() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    private void send(String name, boolean down) {
        if (web == null) return;
        web.evaluateJavascript("window.__pad&&window.__pad('" + name + "'," + down + ")", null);
    }

    private static String nameFor(int code) {
        switch (code) {
            case KeyEvent.KEYCODE_BUTTON_L1: return "L1";
            case KeyEvent.KEYCODE_BUTTON_R1: return "R1";
            case KeyEvent.KEYCODE_BUTTON_L2: return "L2";
            case KeyEvent.KEYCODE_BUTTON_R2: return "R2";
            case KeyEvent.KEYCODE_BUTTON_A: return "A";
            case KeyEvent.KEYCODE_BUTTON_B: return "B";
            case KeyEvent.KEYCODE_BACK: return "B";
            case KeyEvent.KEYCODE_BUTTON_X: return "A";
            case KeyEvent.KEYCODE_BUTTON_Y: return "A";
            case KeyEvent.KEYCODE_BUTTON_START: return "START";
            case KeyEvent.KEYCODE_BUTTON_SELECT: return "START";
            case KeyEvent.KEYCODE_DPAD_LEFT: return "ArrowLeft";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "ArrowRight";
            case KeyEvent.KEYCODE_DPAD_UP: return "ArrowUp";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "ArrowDown";
            case KeyEvent.KEYCODE_ENTER: return "Enter";
            case KeyEvent.KEYCODE_DPAD_CENTER: return "Enter";
            default: return null;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        String n = nameFor(e.getKeyCode());
        if (n == null) return super.dispatchKeyEvent(e);
        if (e.getRepeatCount() > 0) return true;
        if (e.getAction() == KeyEvent.ACTION_DOWN) send(n, true);
        else if (e.getAction() == KeyEvent.ACTION_UP) send(n, false);
        return true;
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        if ((e.getSource() & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK && e.getAction() == MotionEvent.ACTION_MOVE) {
            float lt = Math.max(e.getAxisValue(MotionEvent.AXIS_LTRIGGER), e.getAxisValue(MotionEvent.AXIS_BRAKE));
            float rt = Math.max(e.getAxisValue(MotionEvent.AXIS_RTRIGGER), e.getAxisValue(MotionEvent.AXIS_GAS));
            boolean l = lt > 0.35f, r = rt > 0.35f;
            if (l != l2Axis) { l2Axis = l; send("L2", l); }
            if (r != r2Axis) { r2Axis = r; send("R2", r); }
            int hx = Math.round(e.getAxisValue(MotionEvent.AXIS_HAT_X));
            int hy = Math.round(e.getAxisValue(MotionEvent.AXIS_HAT_Y));
            if (hx != hatX) { if (hatX != 0) send(hatX < 0 ? "ArrowLeft" : "ArrowRight", false); if (hx != 0) send(hx < 0 ? "ArrowLeft" : "ArrowRight", true); hatX = hx; }
            if (hy != hatY) { if (hatY != 0) send(hatY < 0 ? "ArrowUp" : "ArrowDown", false); if (hy != 0) send(hy < 0 ? "ArrowUp" : "ArrowDown", true); hatY = hy; }
            return true;
        }
        return super.dispatchGenericMotionEvent(e);
    }

    @Override
    protected void onPause() { super.onPause(); if (web != null) { web.evaluateJavascript("window.__pauseGame&&window.__pauseGame()", null); web.onPause(); } }

    @Override
    protected void onResume() { super.onResume(); if (web != null) web.onResume(); hideBars(); }

    private class Bridge {
        @JavascriptInterface
        public void exit() { runOnUiThread(() -> finish()); }
    }
}
