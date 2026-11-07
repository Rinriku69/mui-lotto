import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_URL = 'https://muilotto.com';

/** Per-route SEO fields, set in `data` next to the route's `title`. */
export interface SeoData {
  description?: string;
  /** e.g. 'noindex' for the 404 page; omitted = indexable (the tag is removed) */
  robots?: string;
}

/**
 * The router calls a TitleStrategy after every navigation (the default one only sets <title>).
 * Extending it puts title + description + canonical + robots in one place, driven by route config,
 * instead of every page component injecting Meta itself.
 *
 * Only Googlebot sees these runtime changes: link-preview crawlers (LINE, Facebook) don't run JS
 * and read the static tags in index.html.
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title) this.title.setTitle(title);

    const seo = deepestRoute(snapshot.root).data as SeoData;
    if (seo.description) this.meta.updateTag({ name: 'description', content: seo.description });

    if (seo.robots) {
      this.meta.updateTag({ name: 'robots', content: seo.robots });
      this.setCanonical(null); // a noindex page must not claim to be the canonical version of anything
    } else {
      this.meta.removeTag('name="robots"');
      // canonical = the clean URL without ?query/#hash; snapshot.url is the full app URL
      this.setCanonical(SITE_URL + snapshot.url.split(/[?#]/)[0]);
    }
  }

  /** Create, update or remove <link rel="canonical"> (Meta only handles <meta>, so this is manual DOM). */
  private setCanonical(href: string | null) {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = href;
  }
}

/** The page's own data lives on the leaf of the route tree (parents only hold layouts/guards). */
function deepestRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  while (route.firstChild) route = route.firstChild;
  return route;
}
