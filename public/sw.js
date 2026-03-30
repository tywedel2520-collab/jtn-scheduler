/**
 * Minimal service worker — enables “Add to Home Screen” / install prompts on many browsers
 * without caching dynamic pages (login, API, etc.). Always network-first.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
