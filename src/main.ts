import { bootstrapApplication } from '@angular/platform-browser';
import { inject as injectAnalytics } from '@vercel/analytics';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// Vercel Web Analytics: page views (works on the live site only; on localhost it just logs).
// Admin pages are never counted.
injectAnalytics({
  beforeSend: (event) => (event.url.includes('/admin') ? null : event),
});
