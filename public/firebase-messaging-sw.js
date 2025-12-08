// Firebase Cloud Messaging Service Worker
// Este archivo maneja las notificaciones push en segundo plano

// Importar Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase
firebase.initializeApp({
  apiKey: "AIzaSyB_J6iu9ne0LJyUyx1T2H3lOVmya4W1sso",
  authDomain: "web-pwa-c25b2.firebaseapp.com",
  projectId: "web-pwa-c25b2",
  storageBucket: "web-pwa-c25b2.firebasestorage.app",
  messagingSenderId: "688252569820",
  appId: "1:688252569820:web:d3e954bfbca19e51140c19"
});

// Obtener instancia de Firebase Messaging
const messaging = firebase.messaging();

console.log('[SW] 🔧 Firebase Messaging Service Worker cargado');

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] ═══════════════════════════════════════════════════════');
  console.log('[SW] 📬 MENSAJE RECIBIDO EN SEGUNDO PLANO');
  console.log('[SW] ═══════════════════════════════════════════════════════');
  console.log('[SW] Payload completo:', JSON.stringify(payload, null, 2));
  console.log('[SW] Notification:', payload.notification);
  console.log('[SW] Data:', payload.data);
  console.log('[SW] ═══════════════════════════════════════════════════════');

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Nueva notificación';
  const notificationBody = payload.notification?.body || payload.data?.body || '';
  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || payload.data?.icon || '/assets/icon/favicon.png',
    badge: '/assets/icon/favicon.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    tag: 'firebase-notification-' + Date.now(),
    requireInteraction: false,
    timestamp: Date.now()
  };

  console.log('[SW] 🔔 Mostrando notificación:', notificationTitle);

  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('[SW] ✅ Notificación mostrada correctamente');
    })
    .catch((error) => {
      console.error('[SW] ❌ Error mostrando notificación:', error);
    });
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🖱️ Click en notificación:', event);

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Log de instalación
self.addEventListener('install', (event) => {
  console.log('[SW] ⚙️ Service Worker instalado');
  self.skipWaiting();
});

// Log de activación
self.addEventListener('activate', (event) => {
  console.log('[SW] ✅ Service Worker activado');
  event.waitUntil(clients.claim());
});
