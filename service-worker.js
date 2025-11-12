// Nombre único para el caché de esta versión
const CACHE_NAME = 'prestamos-app-cache-v1';

// Lista de archivos para guardar en caché
// IMPORTANTE: Corregido para usar 'index.html'
const urlsToCache = [
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  './icono-192.png',
  './icono-512.png'
];

// Evento de Instalación: Se dispara cuando el SW se registra
self.addEventListener('install', event => {
  // Espera hasta que el caché esté abierto y todos los archivos estén guardados
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        // Agrega todos los archivos de la lista al caché
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Forza al nuevo service worker a activarse inmediatamente
        return self.skipWaiting();
      })
  );
});

// Evento de Activación: Se dispara después de la instalación
self.addEventListener('activate', event => {
  event.waitUntil(
    // Limpia cachés antiguos que no coincidan con el CACHE_NAME actual
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Toma control de la página inmediatamente
      return self.clients.claim();
    })
  );
});

// Evento Fetch: Se dispara cada vez que la página pide un recurso (CSS, JS, imagen, etc.)
self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') {
      return;
  }
  
  event.respondWith(
    // 1. Intenta encontrar el recurso en el caché
    caches.match(event.request)
      .then(response => {
        // Si lo encuentra en el caché, lo devuelve
        if (response) {
          return response;
        }

        // 2. Si no, intenta buscarlo en la red (internet)
        return fetch(event.request).then(
          response => {
            // Si la respuesta no es válida o no es del tipo 'basic' (ej. de un CDN),
            // simplemente la devuelve sin intentar cachearla.
            if (!response || response.status !== 200 || (response.type !== 'basic' && !response.type !== 'cors')) {
              return response;
            }
            
            // Evitar cachear extensiones del navegador
            if(event.request.url.startsWith('chrome-extension://')) {
                return response;
            }

            // Clona la respuesta para poder guardarla y devolverla
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Guarda la nueva respuesta en el caché para la próxima vez
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
