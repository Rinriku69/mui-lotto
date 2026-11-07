import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { TitleStrategy, provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { SeoTitleStrategy } from './shared/seo-title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    // withViewTransitions: tab switches cross-fade via the browser's View Transitions API
    // (no-op in browsers without it)
    provideRouter(routes, withViewTransitions()),
    // replaces the router's default title-only strategy: also sets description / canonical / robots
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
  ],
};
