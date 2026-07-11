"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const PwaCtx = createContext({ canInstall: false, promptInstall: () => {}, isStandalone: false });

export function PwaProvider({ children }) {
  const [deferred, setDeferred] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    try {
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);
    } catch (e) {}
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) {}
    setDeferred(null);
  }, [deferred]);

  return <PwaCtx.Provider value={{ canInstall: !!deferred, promptInstall, isStandalone }}>{children}</PwaCtx.Provider>;
}

export function usePwa() {
  return useContext(PwaCtx);
}
