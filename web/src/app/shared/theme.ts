import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

/** localStorage key; index.html reads the same key before Angular boots. */
export const THEME_KEY = 'theme';

/** Page colour per theme, for <meta name="theme-color"> (mobile browser chrome). Mirrors --color-page. */
const PAGE_COLOR: Record<Theme, string> = { dark: '#0d0e10', light: '#f3f0e8' };

/**
 * Current colour theme. The look itself is pure CSS: styles.css overrides the --color-* tokens
 * under :root[data-theme='light'], so this service only has to set that one attribute.
 *
 * Priority: the user's explicit choice (localStorage) > the OS setting (prefers-color-scheme).
 * Until the user picks, OS changes are followed live.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly media = this.doc.defaultView?.matchMedia('(prefers-color-scheme: light)');

  readonly theme = signal<Theme>(this.stored() ?? (this.media?.matches ? 'light' : 'dark'));

  constructor() {
    // Callback passed to addEventListener: runs every time the OS theme flips.
    this.media?.addEventListener('change', (e) => {
      if (!this.stored()) this.theme.set(e.matches ? 'light' : 'dark');
    });

    // effect(): re-runs whenever theme() changes and mirrors it into the DOM.
    effect(() => {
      const t = this.theme();
      this.doc.documentElement.dataset['theme'] = t;
      this.doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAGE_COLOR[t]);
    });
  }

  /** Explicit choice from the toggle: remembered across visits. */
  set(t: Theme) {
    this.theme.set(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // storage blocked (private mode etc.): the choice still applies for this visit
    }
  }

  private stored(): Theme | null {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch {
      return null;
    }
  }
}
