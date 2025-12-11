import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface SubscriptionPayload {
  subscription: PushSubscription;
  device: string;
  userAgent: string;
}

@Injectable({ providedIn: 'root' })
export class WebPushService {
  private initialized = false;
  private pushSWRegistered = false;

  constructor(private readonly swPush: SwPush) {}

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    // Registrar el SW dedicado para push notifications en segundo plano
    await this.registerPushServiceWorker();

    if (!this.swPush.isEnabled) {
      console.warn('[WebPush] Service   worker push no habilitado (probablemente en desarrollo)');
      return false;
    }

    if (!environment.webpushPublicKey) {
      console.error('[WebPush] Falta configurar webpushPublicKey en environments');
      return false;
    }

    try {
      const subscription = await this.ensureSubscription();
      if (!subscription) {
        console.warn('[WebPush] No se pudo obtener la suscripción de push');
        return false;
      }

      await this.sendSubscriptionToBackend(subscription);

      this.listenToMessages();
      this.listenToClicks();

      this.initialized = true;
      console.log('[WebPush] Inicializado correctamente');
      return true;
    } catch (error) {
      console.error('[WebPush] Error inicializando push:', error);
      return false;
    }
  }

  private async ensureSubscription(): Promise<PushSubscription | null> {
    const current = await this.getCurrentSubscription();
    if (current) return current;

    try {
      return await this.swPush.requestSubscription({
        serverPublicKey: environment.webpushPublicKey
      });
    } catch (error) {
      console.error('[WebPush] Error solicitando suscripción:', error);
      return null;
    }
  }

  private async getCurrentSubscription(): Promise<PushSubscription | null> {
    try {
      return await firstValueFrom(this.swPush.subscription);
    } catch (error) {
      console.error('[WebPush] Error obteniendo suscripción actual:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      const sub = await this.getCurrentSubscription();
      if (!sub) return true;
      await sub.unsubscribe();
      console.log('[WebPush] Suscripción cancelada');
      return true;
    } catch (error) {
      console.error('[WebPush] Error cancelando suscripción:', error);
      return false;
    }
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    if (!environment.webpushSubscribeEndpoint) {
      console.warn('[WebPush] webpushSubscribeEndpoint no configurado; se omite envío a backend');
      return;
    }

    const payload: SubscriptionPayload = {
      subscription,
      device: 'web',
      userAgent: navigator.userAgent
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('walksafe_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(environment.webpushSubscribeEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('[WebPush] Error enviando suscripción:', response.status, response.statusText);
    } else {
      console.log('[WebPush] Suscripción registrada en backend');
    }
  }

  private listenToMessages(): void {
    this.swPush.messages.subscribe((msg) => {
      console.log('[WebPush] Mensaje recibido:', msg);
      this.showInAppNotification(msg as any);
    });
  }

  private listenToClicks(): void {
    this.swPush.notificationClicks.subscribe((event) => {
      const url = event.notification?.data?.url;
      if (url) {
        window.open(url, '_blank');
      }
    });
  }

  private showInAppNotification(payload: any): void {
    try {
      const title = payload?.title || payload?.notification?.title || 'Notificación';
      const body = payload?.body || payload?.notification?.body || '';
      const data = payload?.data || payload?.notification?.data || {};

      const card = document.createElement('div');
      card.style.cssText = [
        'position: fixed',
        'right: 16px',
        'top: 16px',
        'max-width: 360px',
        'background: #0f172a',
        'color: #e2e8f0',
        'border-radius: 14px',
        'padding: 14px 16px',
        'box-shadow: 0 10px 30px rgba(0,0,0,0.35)',
        'z-index: 12000',
        'display: flex',
        'gap: 12px',
        'cursor: pointer',
        'border: 1px solid rgba(99,102,241,0.35)',
        'backdrop-filter: blur(6px)',
        'animation: wp-slide-in 240ms ease-out'
      ].join(';');

      const accent = document.createElement('div');
      accent.style.cssText = 'width: 6px; border-radius: 10px; background: linear-gradient(180deg,#6366f1,#22d3ee);';

      const content = document.createElement('div');
      content.style.cssText = 'flex: 1; min-width: 0;';
      const t = document.createElement('div');
      t.style.cssText = 'font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #c7d2fe;';
      t.textContent = title;
      const b = document.createElement('div');
      b.style.cssText = 'font-size: 14px; line-height: 1.4; color: #e2e8f0;';
      b.textContent = body;
      content.appendChild(t);
      content.appendChild(b);

      const close = document.createElement('button');
      close.textContent = '×';
      close.setAttribute('aria-label', 'Cerrar notificación');
      close.style.cssText = [
        'background: transparent',
        'border: none',
        'color: #94a3b8',
        'font-size: 18px',
        'cursor: pointer',
        'padding: 0',
        'margin-left: 6px'
      ].join(';');

      close.onclick = (e) => {
        e.stopPropagation();
        card.remove();
      };

      const targetUrl = data?.url || (data?.incidentId ? `/incident/${data.incidentId}` : null);

      card.onclick = () => {
        if (targetUrl) {
          window.open(targetUrl, '_blank');
        }
        card.remove();
      };

      card.appendChild(accent);
      card.appendChild(content);
      card.appendChild(close);

      const style = document.createElement('style');
      style.textContent = `@keyframes wp-slide-in { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
      document.head.appendChild(style);

      document.body.appendChild(card);

      setTimeout(() => {
        card.style.transition = 'opacity 180ms ease';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 200);
      }, 6000);
    } catch (error) {
      console.error('[WebPush] Error mostrando notificación in-app:', error);
    }
  }

  private async registerPushServiceWorker(): Promise<void> {
    if (this.pushSWRegistered || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/push-notification-sw.js', {
        scope: '/'
      });
      this.pushSWRegistered = true;
      console.log('[WebPush] Service Worker para push notifications registrado');
    } catch (error) {
      console.error('[WebPush] Error registrando SW para push:', error);
    }
  }
}
