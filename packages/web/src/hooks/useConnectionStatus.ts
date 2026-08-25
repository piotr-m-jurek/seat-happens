import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const REALTIME_POLL_MS = 5_000;

// The realtime socket only opens once something subscribes to a channel,
// so isConnected() is false by design whenever there's nothing to
// subscribe to yet (e.g. the pre-login screen) — that's not a real
// disconnect, so it shouldn't count against `online`.
function isRealtimeReachable(): boolean {
  return supabase.realtime.getChannels().length === 0 || supabase.realtime.isConnected();
}

// Combines two signals: navigator.onLine (instant, via events — catches
// "no network at all") and supabase.realtime.isConnected() (polled, since
// the realtime client has no push-based "connection changed" event at
// this level — catches realtime specifically being down even if the
// browser still thinks it has a connection). Online only when both agree.
export function useConnectionStatus(): boolean {
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [realtimeConnected, setRealtimeConnected] = useState(isRealtimeReachable());

  useEffect(() => {
    function onOnline() {
      setBrowserOnline(true);
    }
    function onOffline() {
      setBrowserOnline(false);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setRealtimeConnected(isRealtimeReachable());
    }, REALTIME_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return browserOnline && realtimeConnected;
}
