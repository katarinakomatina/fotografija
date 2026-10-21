import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Data } from './core/data';
import { I18n } from './core/i18n';
import { Lightbox } from './shared/lightbox';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Lightbox],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(Data);
  protected readonly menuOpen = signal(false);
  protected readonly isAdmin = signal(false);
  protected readonly year = new Date().getFullYear();

  constructor() {
    this.data.load();
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.menuOpen.set(false);
        this.isAdmin.set((e as NavigationEnd).urlAfterRedirects.startsWith('/admin'));
      });
  }

  setLang(l: 'sr' | 'en'): void {
    this.i18n.lang.set(l);
  }
}
