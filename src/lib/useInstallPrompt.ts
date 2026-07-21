"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneNow(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Surfaces whether the app can be installed to the home screen, and how:
 * a native prompt on Android/desktop Chrome, or manual Share-sheet steps on
 * iOS Safari (which has no install API at all). Installed apps are much more
 * likely to get the browser's persistent-storage grant, so downloaded models
 * stop getting silently evicted.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsStandalone(isStandaloneNow());
      setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    });

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsStandalone(true);
    setDeferredPrompt(null);
  }

  return {
    isStandalone,
    isIOS,
    canPromptNatively: !!deferredPrompt,
    canInstall: !isStandalone && (!!deferredPrompt || isIOS),
    promptInstall,
  };
}
