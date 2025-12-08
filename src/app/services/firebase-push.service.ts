import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebasePushService {
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private currentToken: string | null = null;

  constructor() {
    console.log('[FirebasePush] 🔧 Servicio inicializado');
  }

  /**
   * Inicializa Firebase
   */
  async initializeFirebase(): Promise<boolean> {
    try {
      console.log('[FirebasePush] 🚀 Iniciando Firebase...');
      
      // Verificar si el navegador soporta Service Workers
      if (!('serviceWorker' in navigator)) {
        console.error('[FirebasePush] ❌ Service Workers no soportados');
        return false;
      }

      // Verificar si FCM está soportado
      const messagingSupported = await isSupported();
      if (!messagingSupported) {
        console.error('[FirebasePush] ❌ Firebase Messaging no soportado en este navegador');
        return false;
      }

      // Inicializar Firebase App
      this.app = initializeApp(environment.firebaseConfig);
      console.log('[FirebasePush] ✅ Firebase App inicializada');

      // Inicializar Firebase Messaging
      this.messaging = getMessaging(this.app);
      console.log('[FirebasePush] ✅ Firebase Messaging inicializado');

      return true;
    } catch (error: any) {
      console.error('[FirebasePush] ❌ Error inicializando Firebase:', error);
      console.error('[FirebasePush] Error detalles:', {
        name: error?.name,
        message: error?.message,
        code: error?.code
      });
      return false;
    }
  }

  /**
   * Registra el Service Worker de Firebase
   */
  async registerServiceWorker(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator)) {
        console.error('[FirebasePush] ❌ Service Workers no disponibles');
        return false;
      }

      console.log('[FirebasePush] 📝 Registrando Service Worker...');

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });

      console.log('[FirebasePush] ✅ Service Worker registrado:', {
        scope: registration.scope,
        active: registration.active?.state,
        waiting: registration.waiting?.state,
        installing: registration.installing?.state
      });

      // Esperar a que el SW esté activo
      await navigator.serviceWorker.ready;
      console.log('[FirebasePush] ✅ Service Worker listo');

      return true;
    } catch (error: any) {
      console.error('[FirebasePush] ❌ Error registrando Service Worker:', error);
      return false;
    }
  }

  /**
   * Solicita permiso de notificaciones y obtiene el token FCM
   */
  async requestPermissionAndToken(): Promise<string | null> {
    try {
      console.log('[FirebasePush] 🔔 Solicitando permiso de notificaciones...');

      // Verificar soporte de Notifications
      if (!('Notification' in window)) {
        console.error('[FirebasePush] ❌ API de Notificaciones no soportada');
        return null;
      }

      // Verificar si ya hay permiso
      if (Notification.permission === 'denied') {
        console.error('[FirebasePush] ❌ Permiso de notificaciones DENEGADO por el usuario');
        console.error('[FirebasePush] 💡 El usuario debe habilitar notificaciones manualmente en la configuración del navegador');
        return null;
      }

      // Solicitar permiso
      const permission = await Notification.requestPermission();
      console.log('[FirebasePush] 📋 Permiso de notificaciones:', permission);

      if (permission !== 'granted') {
        console.warn('[FirebasePush] ⚠️ Permiso de notificaciones no concedido');
        return null;
      }

      console.log('[FirebasePush] ✅ Permiso de notificaciones CONCEDIDO');

      // Obtener token FCM
      return await this.getToken();
    } catch (error: any) {
      console.error('[FirebasePush] ❌ Error solicitando permiso:', error);
      return null;
    }
  }

  /**
   * Obtiene el token FCM
   */
  async getToken(): Promise<string | null> {
    try {
      if (!this.messaging) {
        console.error('[FirebasePush] ❌ Firebase Messaging no inicializado');
        return null;
      }

      console.log('[FirebasePush] 🔑 Obteniendo token FCM...');
      console.log('[FirebasePush] 📍 VAPID Key:', environment.firebaseConfig.vapidKey?.substring(0, 20) + '...');

      const token = await getToken(this.messaging, {
        vapidKey: environment.firebaseConfig.vapidKey,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });

      if (token) {
        this.currentToken = token;
        console.log('[FirebasePush] ✅ Token FCM obtenido exitosamente!');
        console.log('[FirebasePush] 🔑 Token COMPLETO:', token);
        console.log('[FirebasePush] 📋 Token (primeros 50 chars):', token.substring(0, 50) + '...');
        console.log('[FirebasePush] 📤 Guarda este token en tu backend para enviar notificaciones');
        localStorage.setItem('fcm_token', token);
        
        
        return token;
      } else {
        console.error('[FirebasePush] ❌ No se pudo obtener el token FCM');
        return null;
      }
    } catch (error: any) {
      console.error('[FirebasePush] ❌ Error obteniendo token FCM:', error);
      console.error('[FirebasePush] Error detalles:', {
        name: error?.name,
        message: error?.message,
        code: error?.code
      });

      // Diagnóstico adicional
      this.diagnosticError(error);
      
      return null;
    }
  }

  /**
   * Diagnóstico de errores
   */
  private diagnosticError(error: any): void {
    console.group('[FirebasePush] 🔍 DIAGNÓSTICO DE ERROR');
    
    if (error?.name === 'AbortError' || error?.message?.includes('Registration failed')) {
      console.error('❌ ERROR: AbortError - Registration failed');
      console.error('');
      console.error('📋 POSIBLES CAUSAS:');
      console.error('1. ⛔ Extensiones del navegador bloqueando FCM (AdBlock, Privacy Badger, etc)');
      console.error('2. 🔒 Firewall corporativo o VPN bloqueando conexiones a Firebase');
      console.error('3. 🌐 Problemas de conectividad de red');
      console.error('4. ⚙️  Service Worker no registrado correctamente');
      console.error('5. 🔧 Configuración incorrecta de Firebase en la consola');
      console.error('');
      console.error('🔧 SOLUCIONES:');
      console.error('✅ Desactiva TODAS las extensiones del navegador');
      console.error('✅ Prueba en modo incógnito/privado');
      console.error('✅ Desactiva VPN/Proxy temporalmente');
      console.error('✅ Verifica que el Service Worker esté activo (DevTools > Application > Service Workers)');
      console.error('✅ Verifica la configuración de Firebase Cloud Messaging en Firebase Console');
      console.error('✅ Asegúrate de que Cloud Messaging API esté habilitada en Google Cloud Console');
    } else if (error?.name === 'NotAllowedError') {
      console.error('❌ ERROR: NotAllowedError');
      console.error('El usuario denegó los permisos o el navegador bloqueó la solicitud');
    } else if (error?.code === 'messaging/permission-blocked') {
      console.error('❌ ERROR: Permisos bloqueados');
      console.error('El usuario debe habilitar notificaciones en la configuración del navegador');
    } else {
      console.error('❌ ERROR DESCONOCIDO:', error);
    }

    console.groupEnd();
  }

  /**
   * Escucha mensajes en primer plano
   */
  listenToMessages(): void {
    if (!this.messaging) {
      console.error('[FirebasePush] ❌ No se puede escuchar mensajes: Firebase Messaging no inicializado');
      return;
    }

    console.log('[FirebasePush] 👂 Escuchando mensajes en primer plano...');

    onMessage(this.messaging, (payload) => {
      console.log('[FirebasePush] 📬 Mensaje recibido en primer plano:', payload);
      console.log('[FirebasePush] 📋 Payload completo:', JSON.stringify(payload, null, 2));

      // Mostrar notificación del sistema
      if (payload.notification) {
        this.showNotification(
          payload.notification.title || 'Nueva notificación',
          payload.notification.body || '',
          payload.notification.icon,
          payload.data
        );
      } else if (payload.data) {
        // Si solo hay data sin notification, crear una notificación personalizada
        this.showNotification(
          payload.data['title'] || 'Nueva notificación',
          payload.data['body'] || 'Tienes un nuevo mensaje',
          payload.data['icon'],
          payload.data
        );
      }

      // Mostrar también una notificación visual en la UI (opcional)
      this.showInAppNotification(payload);
    });
  }

  /**
   * Muestra una notificación del sistema
   */
  private showNotification(title: string, body: string, icon?: string, data?: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        console.log('[FirebasePush] 🔔 Mostrando notificación del sistema:', { title, body });

        const notification = new Notification(title, {
          body,
          icon: icon || '/assets/icon/favicon.png',
          badge: '/assets/icon/favicon.png',
          tag: 'firebase-push-' + Date.now(),
          requireInteraction: false,
          data: data
        });

        notification.onclick = (event) => {
          console.log('[FirebasePush] 🖱️ Click en notificación:', event);
          window.focus();
          notification.close();

          // Si hay URL en los datos, navegar a ella
          if (data?.url) {
            window.location.href = data.url;
          }
        };

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
          notification.close();
        }, 5000);

      } catch (error) {
        console.error('[FirebasePush] ❌ Error mostrando notificación:', error);
      }
    } else {
      console.warn('[FirebasePush] ⚠️ No se puede mostrar notificación: permisos no concedidos');
    }
  }

  /**
   * Muestra una notificación visual dentro de la aplicación
   */
  private showInAppNotification(payload: any): void {
    try {
      console.log('[FirebasePush] 📱 Mostrando notificación in-app');

      // Crear elemento de notificación
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 350px;
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const title = payload.notification?.title || payload.data?.title || 'Notificación';
      const body = payload.notification?.body || payload.data?.body || '';
      const icon = payload.notification?.icon || payload.data?.icon || '/assets/icon/favicon.png';

      notification.innerHTML = `
        <style>
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(400px);
              opacity: 0;
            }
          }
        </style>
        <div style="display: flex; gap: 12px; align-items: start;">
          <img src="${icon}" style="width: 48px; height: 48px; border-radius: 8px; flex-shrink: 0;" onerror="this.style.display='none'">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 16px; color: #1a1a1a; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 14px; color: #666; line-height: 1.4;">${body}</div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #999; cursor: pointer; font-size: 20px; padding: 0; width: 24px; height: 24px; flex-shrink: 0;">×</button>
        </div>
      `;

      // Click para cerrar
      notification.onclick = (e) => {
        if ((e.target as HTMLElement).tagName !== 'BUTTON') {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => notification.remove(), 300);
          
          // Si hay URL, navegar
          if (payload.data?.url) {
            window.location.href = payload.data.url;
          }
        }
      };

      document.body.appendChild(notification);

      // Auto-remover después de 5 segundos
      setTimeout(() => {
        if (notification.parentElement) {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => notification.remove(), 300);
        }
      }, 5000);

    } catch (error) {
      console.error('[FirebasePush] ❌ Error mostrando notificación in-app:', error);
    }
  }

  /**
   * Envía el token FCM al backend
   */
   async sendTokenToBackend(token: string): Promise<void> {
    try {
      console.log('[FirebasePush] 📤 Enviando token FCM al backend...');
      
      const userString = localStorage.getItem('walksafe_user');
      const user = userString ? JSON.parse(userString) : null;
      
      if (!user || !user.id) {
        console.error('[FirebasePush] ❌ Usuario no encontrado en localStorage');
        console.warn('[FirebasePush] 💡 El usuario debe estar autenticado para registrar el token');
        return;
      }
      
      // Endpoint para guardar el token FCM
      const apiUrl = `${environment.api}users/${user.id}/fcm-token`;
      
      const payload = {
        fcmToken: token,
        deviceType: 'web',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      console.log('[FirebasePush] 📋 Payload a enviar:', payload);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('walksafe_token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      
      if (response.ok) {
        console.log('[FirebasePush] ✅ Token enviado al backend correctamente');
        console.log('[FirebasePush] Respuesta:', responseData);
        localStorage.setItem('fcm_token', token);
      } else {
        console.warn('[FirebasePush] ⚠️ Error al enviar token al backend:', response.status);
        console.warn('[FirebasePush] Respuesta:', responseData);
        console.warn('[FirebasePush] 💡 Verifica que tu endpoint esté configurado en:', apiUrl);
        console.warn('[FirebasePush] 💡 Endpoint esperado: POST /api/v1/users/:id/fcm-token');
      }
    } catch (error) {
      console.error('[FirebasePush] ❌ Error enviando token al backend:', error);
      console.error('[FirebasePush] 💡 Asegúrate de que:');
      console.error('[FirebasePush]   - El backend está corriendo');
      console.error('[FirebasePush]   - El endpoint está disponible');
      console.error('[FirebasePush]   - El CORS está configurado correctamente');
    }
  }

  /**
   * Obtiene el token actual
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Imprime el token completo en consola para copiar
   */
  printFullToken(): void {
    if (this.currentToken) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('📋 TOKEN FCM COMPLETO (Copia esto para tu backend):');
      console.log('═══════════════════════════════════════════════════════');
      console.log(this.currentToken);
      console.log('═══════════════════════════════════════════════════════');
      console.log('💾 También guardado en localStorage como: fcm_token');
    } else {
      console.warn('⚠️ No hay token disponible');
    }
  }

  /**
   * Información de diagnóstico
   */
  getDiagnostics(): any {
    return {
      firebaseInitialized: !!this.app,
      messagingInitialized: !!this.messaging,
      hasToken: !!this.currentToken,
      tokenPreview: this.currentToken?.substring(0, 30) + '...',
      tokenFull: this.currentToken,
      notificationPermission: ('Notification' in window) ? Notification.permission : 'not-supported',
      serviceWorkerSupported: 'serviceWorker' in navigator,
      notificationSupported: 'Notification' in window,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Test: Envía una notificación de prueba local
   */
  async testLocalNotification(): Promise<void> {
    console.log('[FirebasePush] 🧪 Enviando notificación de prueba local...');
    
    if (Notification.permission !== 'granted') {
      console.error('[FirebasePush] ❌ Permisos no concedidos');
      return;
    }

    const testPayload = {
      notification: {
        title: '🧪 Prueba Local',
        body: 'Esta es una notificación de prueba generada localmente',
        icon: '/assets/icon/favicon.png'
      },
      data: {
        test: true,
        timestamp: Date.now()
      }
    };

    // Simular recepción de mensaje
    this.showNotification(
      testPayload.notification.title,
      testPayload.notification.body,
      testPayload.notification.icon,
      testPayload.data
    );

    this.showInAppNotification(testPayload);

    console.log('[FirebasePush] ✅ Notificación de prueba enviada');
  }

  /**
   * Instrucciones para enviar notificaciones desde el backend
   */
  printBackendInstructions(): void {
    console.log('═══════════════════════════════════════════════════════');
    console.log('📚 CÓMO ENVIAR NOTIFICACIONES DESDE EL BACKEND');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('1️⃣ OBTÉN EL TOKEN FCM DEL USUARIO:');
    console.log('   Token:', this.currentToken);
    console.log('');
    console.log('2️⃣ CONFIGURACIÓN EN FIREBASE CONSOLE:');
    console.log('   - Ve a: https://console.firebase.google.com');
    console.log('   - Proyecto: web-pwa-c25b2');
    console.log('   - Cloud Messaging > Habilitar API');
    console.log('   - Configuración del proyecto > Cuentas de servicio');
    console.log('   - Generar nueva clave privada (JSON)');
    console.log('');
    console.log('3️⃣ ENDPOINT DE TU BACKEND:');
    console.log('   POST ' + environment.api + 'notifications/send');
    console.log('');
    console.log('4️⃣ EJEMPLO DE REQUEST DESDE BACKEND (Node.js):');
    console.log(`
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const message = {
  notification: {
    title: 'Título',
    body: 'Mensaje'
  },
  data: {
    url: '/dashboard',
    customData: 'valor'
  },
  token: '${this.currentToken}'
};

admin.messaging().send(message)
  .then((response) => {
    console.log('Notificación enviada:', response);
  })
  .catch((error) => {
    console.log('Error:', error);
  });
    `);
    console.log('');
    console.log('5️⃣ VERIFICAR EN EL BACKEND:');
    console.log('   ✅ Firebase Admin SDK instalado');
    console.log('   ✅ Service Account Key configurado');
    console.log('   ✅ Cloud Messaging API habilitada');
    console.log('   ✅ Token del usuario guardado en BD');
    console.log('');
    console.log('6️⃣ DEBUGGING:');
    console.log('   - Verifica logs del backend');
    console.log('   - Revisa respuesta de Firebase Admin SDK');
    console.log('   - Comprueba que el token sea válido');
    console.log('   - Verifica que Cloud Messaging esté activo');
    console.log('═══════════════════════════════════════════════════════');
  }

  /**
   * Inicialización completa
   */
  async initialize(): Promise<boolean> {
    console.log('[FirebasePush] ═══════════════════════════════════════');
    console.log('[FirebasePush] 🚀 INICIANDO CONFIGURACIÓN COMPLETA');
    console.log('[FirebasePush] ═══════════════════════════════════════');

    // Paso 1: Inicializar Firebase
    const firebaseInit = await this.initializeFirebase();
    if (!firebaseInit) {
      console.error('[FirebasePush] ❌ Falló la inicialización de Firebase');
      return false;
    }

    // Paso 2: Registrar Service Worker
    const swRegistered = await this.registerServiceWorker();
    if (!swRegistered) {
      console.error('[FirebasePush] ❌ Falló el registro del Service Worker');
      return false;
    }

    // Paso 3: Solicitar permiso y obtener token
    const token = await this.requestPermissionAndToken();
    if (!token) {
      console.error('[FirebasePush] ❌ No se pudo obtener el token FCM');
      console.log('[FirebasePush] ═══════════════════════════════════════');
      console.log('[FirebasePush] 📊 DIAGNÓSTICO FINAL:');
      console.log(this.getDiagnostics());
      console.log('[FirebasePush] ═══════════════════════════════════════');
      return false;
    }

    // Paso 4: Escuchar mensajes
    this.listenToMessages();

    console.log('[FirebasePush] ═══════════════════════════════════════');
    console.log('[FirebasePush] ✅ CONFIGURACIÓN COMPLETA EXITOSA');
    console.log('[FirebasePush] 📊 DIAGNÓSTICO:');
    console.log(this.getDiagnostics());
    console.log('[FirebasePush] ═══════════════════════════════════════');
    console.log('');
    console.log('[FirebasePush] 💡 COMANDOS ÚTILES EN CONSOLA:');
    console.log('[FirebasePush] - Ver token completo: window.firebasePush.printFullToken()');
    console.log('[FirebasePush] - Ver instrucciones backend: window.firebasePush.printBackendInstructions()');
    console.log('[FirebasePush] - Test notificación local: window.firebasePush.testLocalNotification()');
    console.log('[FirebasePush] - Ver diagnóstico: window.firebasePush.getDiagnostics()');
    console.log('');

    // Exponer servicio globalmente para debugging
    (window as any).firebasePush = this;

    return true;
  }
}
