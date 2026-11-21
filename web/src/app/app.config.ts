import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { providePayrollApi } from './core/payroll-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash URLs (#/employees) so page refreshes also work on GitHub Pages.
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    providePayrollApi(),
  ],
};
