"use client";

import { useEffect } from "react";

/**
 * Registers the app shell service worker in production only so dev / HMR are unaffected.
 */
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore — PWA still works as a normal site */
    });
  }, []);

  return null;
}
