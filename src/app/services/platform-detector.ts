import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PlatformDetectorService {
  constructor(private platform: Platform) {}

  /**
   * Detects if the app is running on a mobile device
   */
  isMobile(): boolean {
    return this.platform.is('mobile');
  }

  /**
   * Detects if the app is running on Android
   */
  isAndroid(): boolean {
    return this.platform.is('android');
  }

  /**
   * Detects if the app is running on iOS
   */
  isIOS(): boolean {
    return this.platform.is('ios');
  }

  /**
   * Detects if the app is running on web/desktop
   */
  isWeb(): boolean {
    return this.platform.is('desktop');
  }

  /**
   * Detects if the app is running as hybrid (Cordova/Capacitor)
   */
  isHybrid(): boolean {
    return this.platform.is('hybrid');
  }

  /**
   * Get the current platform(s)
   */
  getPlatforms(): string[] {
    return this.platform.platforms();
  }
}
