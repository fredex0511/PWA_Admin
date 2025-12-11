// Service Worker dedicado para notificaciones push en segundo plano
console.log('[Push SW] Service Worker para notificaciones push cargado');

// Escuchar eventos push incluso cuando la app está cerrada
self.addEventListener('push', (event) => {
  console.log('[Push SW] Evento push recibido:', event);

  if (!event.data) {
    console.warn('[Push SW] Push sin datos');
    return;
  }

  let notificationData = {};
  let title = 'Nueva notificación';
  let body = 'Tienes un nuevo mensaje';

  try {
    const data = event.data.json();
    console.log('[Push SW] Payload JSON:', data);

    // Extraer título y cuerpo
    if (data.notification) {
      title = data.notification.title || title;
      body = data.notification.body || body;
      notificationData = data.notification.data || data.data || {};
    } else if (data.data) {
      title = data.data.title || title;
      body = data.data.body || body;
      notificationData = data.data;
    }
  } catch (error) {
    console.error('[Push SW] Error parseando JSON:', error);
    // Si no es JSON válido, intentar procesar como texto
    try {
      const data = event.data.text();
      body = data;
    } catch (e) {
      body = 'Mensaje recibido';
    }
  }

  const notificationOptions = {
    body,
    icon: '/assets/icon/favicon.png',
    badge: '/assets/icon/favicon.png',
    tag: 'walksafe-notification-' + Date.now(),
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: notificationData,
    timestamp: Date.now(),
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  console.log('[Push SW] Mostrando notificación:', { title, ...notificationOptions });

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
      .then(() => {
        console.log('[Push SW] Notificación mostrada correctamente');
      })
      .catch((error) => {
        console.error('[Push SW] Error mostrando notificación:', error);
      })
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[Push SW] Click en notificación:', event);

  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';
  const action = event.action;

  if (action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar una ventana ya abierta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' || client.url.includes(url)) {
            console.log('[Push SW] Enfocando ventana existente');
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        console.log('[Push SW] Abriendo nueva ventana con URL:', url);
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Manejar cierres de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('[Push SW] Notificación cerrada:', event);
});

// Instalación y activación
self.addEventListener('install', (event) => {
  console.log('[Push SW] Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Push SW] Service Worker activado');
  event.waitUntil(clients.claim());
});
