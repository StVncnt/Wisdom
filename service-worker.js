const CACHE_NAME = 'wisdom-v1';
const OFFLINE_URL = '/';

// Файлы для кэширования
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэширование файлов');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Установлен');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Ошибка установки:', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Удаление старого кэша:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Активирован');
        return self.clients.claim();
      })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к внешним ресурсам, которые не поддерживают CORS
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com') &&
      !event.request.url.includes('fonts.gstatic.com') &&
      !event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Возвращаем из кэша
          return cachedResponse;
        }

        // Делаем сетевой запрос
        return fetch(event.request)
          .then((response) => {
            // Проверяем валидность ответа
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонируем ответ для кэширования
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // При ошибке сети возвращаем офлайн-страницу
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Обработка push-уведомлений (для будущего использования)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Новая мудрость ждёт вас',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="24" fill="%2309090b"/><text x="96" y="125" font-size="100" text-anchor="middle" fill="%23d97706">☯</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="12" fill="%23d97706"/></svg>',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Мудрость Древних', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
