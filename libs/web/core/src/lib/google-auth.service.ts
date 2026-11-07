import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { APP_CONFIG } from './config.tokens';

interface GoogleCredentialResponse {
  readonly credential: string;
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  width?: number;
  logo_alignment?: 'left' | 'center';
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  prompt(momentListener?: (notification: unknown) => void): void;
}

interface WindowWithGoogle extends Window {
  google?: {
    accounts?: {
      id?: GoogleAccountsId;
    };
  };
}

/**
 * Encapsulates Google Identity Services (GIS) Sign-In and One Tap.
 * Components never touch the GIS script directly. Strictly guarded by `isPlatformBrowser`.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(APP_CONFIG);
  private scriptPromise: Promise<void> | null = null;

  async initializeButton(
    container: HTMLElement,
    onCredential: (idToken: string) => void,
    options?: GoogleButtonOptions,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.config.googleClientId) {
      return;
    }
    await this.loadScript();
    const win = this.document.defaultView as WindowWithGoogle | null;
    const gis = win?.google?.accounts?.id;
    if (!gis) return;

    gis.initialize({
      client_id: this.config.googleClientId,
      callback: (res) => {
        if (res.credential) {
          onCredential(res.credential);
        }
      },
    });

    gis.renderButton(container, {
      theme: 'outline',
      size: 'large',
      type: 'icon',
      shape: 'circle',
      ...options,
    });
  }

  promptOneTap(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const win = this.document.defaultView as WindowWithGoogle | null;
    win?.google?.accounts?.id?.prompt();
  }

  private loadScript(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }
    if (this.scriptPromise) {
      return this.scriptPromise;
    }
    this.scriptPromise = new Promise<void>((resolve) => {
      const existing = this.document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      if (existing) {
        resolve();
        return;
      }
      const script = this.document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      this.document.head.appendChild(script);
    });
    return this.scriptPromise;
  }
}
