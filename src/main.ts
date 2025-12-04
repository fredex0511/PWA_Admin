import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { registerIonicons } from './register-ionicons';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { HttpClientModule } from '@angular/common/http';
import { authInterceptor } from './app/interceptors/auth-interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

registerIonicons();
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      mode: 'md',
      inputShims: true,
      scrollPadding: true,
      scrollAssist: true
    }),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    importProvidersFrom(HttpClientModule),
  ],
});
