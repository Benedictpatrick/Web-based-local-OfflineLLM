import { useEffect, useState } from "react";

/** Tracks real browser connectivity via the online/offline events. Shared by
 *  anything that needs to disable a network-dependent feature (web search,
 *  MCP tool calls) rather than let it fail loudly when there's no connection. */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
