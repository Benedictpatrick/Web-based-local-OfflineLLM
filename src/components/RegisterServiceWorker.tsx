"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

/** Registers the service worker and, once a new one has installed and is
 *  sitting in "waiting" behind the one already controlling this tab, shows a
 *  small prompt to refresh -- rather than letting the new worker take over
 *  silently (see the SKIP_WAITING comment in public/sw.js for why that's
 *  unsafe mid-session). */
export default function RegisterServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  // Set only by the Refresh button below, right before it asks the waiting
  // worker to take over -- see onControllerChange's comment for why this
  // gate exists.
  const refreshRequestedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }

    const onControllerChange = () => {
      // controllerchange also fires on this page's very first-ever visit:
      // with no prior controller, a freshly installed worker activates and
      // claims the page immediately, and that null-to-controller transition
      // looks identical to a real update taking over. Reloading then would
      // interrupt whatever the user's doing (e.g. an in-flight model
      // download) for no reason, so only reload when the Refresh button
      // below actually asked for this.
      if (!refreshRequestedRef.current) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    function watchInstalling(registration: ServiceWorkerRegistration, installing: ServiceWorker) {
      installing.addEventListener("statechange", () => {
        // A controller already existing means this is an update to a page
        // that's already running, not the very first install.
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          setWaitingWorker(installing);
        }
      });
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // A worker from a previous visit that finished installing but was
        // never applied (the user dismissed the prompt, or reloaded away).
        if (registration.waiting) setWaitingWorker(registration.waiting);
        // An update whose install started as part of registration itself
        // (a known SW lifecycle race) can already be mid-install by the
        // time this .then() runs, in which case its own updatefound event
        // already fired and this code missed it -- catch that here too.
        if (registration.installing) watchInstalling(registration, registration.installing);

        registration.addEventListener("updatefound", () => {
          if (registration.installing) watchInstalling(registration, registration.installing);
        });
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 sm:px-5">
      <div className="glass-panel flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs shadow-lg">
        <p className="text-foreground-muted">A new version of Navo is ready.</p>
        <button
          type="button"
          className="shrink-0 rounded-full bg-accent px-3 py-1.5 font-medium text-accent-foreground transition-opacity hover:opacity-90"
          onClick={() => {
            haptic("tap");
            refreshRequestedRef.current = true;
            waitingWorker.postMessage("SKIP_WAITING");
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
