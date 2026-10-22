// Despesas Flat 5 — service worker
//
// Estratégia: "rede primeiro".
// - Com internet: busca sempre a versão mais recente do GitHub e atualiza a cópia guardada.
// - Sem internet: usa a última cópia guardada, para o app abrir offline.
// Assim, cada nova versão publicada chega aos telemóveis sozinha,
// sem precisar de mudar nada neste ficheiro.
//
// Os dados (meses, despesas) NÃO ficam aqui: estão na base de dados do navegador
// e não são afetados por este ficheiro.

const CACHE_NAME = "orcamento-flat-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Instala e guarda os ficheiros base; ativa já, sem esperar o app ser fechado.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Apaga caches de versões anteriores (ex.: "orcamento-flat-v1") e assume o controlo.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // não mexe em pedidos a outros sites

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // "no-cache" obriga a confirmar com o servidor se há versão nova.
      const fresh = await fetch(req, { cache: "no-cache" });
      if (fresh && fresh.ok) {
        // Página (com ou sem ?v=...) é guardada como index.html; o resto pelo próprio endereço.
        const key = req.mode === "navigate" ? "./index.html" : req;
        cache.put(key, fresh.clone());
      }
      return fresh;
    } catch (err) {
      // Sem internet: usa a cópia guardada.
      const cached = await cache.match(req, { ignoreSearch: true })
        || (req.mode === "navigate" ? await cache.match("./index.html") : undefined);
      if (cached) return cached;
      throw err;
    }
  })());
});
