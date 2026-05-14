package com.esporteid.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(EidCalendarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
