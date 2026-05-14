package com.esporteid.app;

import android.content.Intent;
import android.provider.CalendarContract;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EidCalendar")
public class EidCalendarPlugin extends Plugin {
    @PluginMethod
    public void addEvent(PluginCall call) {
        String title = call.getString("title", "EsporteID");
        String location = call.getString("location", "");
        String description = call.getString("description", "");
        Long startMs = call.getLong("startMs");
        Long endMs = call.getLong("endMs");

        if (startMs == null || startMs <= 0) {
            call.reject("Data inicial invalida.");
            return;
        }
        if (endMs == null || endMs <= startMs) {
            endMs = startMs + 90 * 60 * 1000;
        }

        Intent intent = new Intent(Intent.ACTION_INSERT)
            .setData(CalendarContract.Events.CONTENT_URI)
            .putExtra(CalendarContract.Events.TITLE, title)
            .putExtra(CalendarContract.Events.EVENT_LOCATION, location)
            .putExtra(CalendarContract.Events.DESCRIPTION, description)
            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, startMs)
            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endMs);

        if (intent.resolveActivity(getActivity().getPackageManager()) == null) {
            call.reject("Nenhum app de agenda encontrado neste aparelho.");
            return;
        }

        getActivity().startActivity(intent);
        JSObject result = new JSObject();
        result.put("opened", true);
        call.resolve(result);
    }
}
