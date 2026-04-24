/** Caminhos públicos das variações oficiais da marca (artes exportadas). */

/** Pré-dashboard: ícone E + palavra ESPORTEID (logo completa). */
export const EID_LOGO_FULL_SRC = "/brand/logo-full.png";
export const EID_LOGO_FULL_WIDTH = 1024;
export const EID_LOGO_FULL_HEIGHT = 1024;

/** Header / telas internas: somente texto ESPORTEID (sem ícone E). */
export const EID_LOGO_WORDMARK_SRC = "/brand/logo-wordmark.png";
export const EID_LOGO_WORDMARK_WIDTH = 1024;
export const EID_LOGO_WORDMARK_HEIGHT = 512;

/** Logo completo (transparente) — arte opcional / legado. */
export const EID_PWA_SPLASH_LOGO_SRC = "/pwa-splash-logo.png";

/** Mesma arte do ícone do app, com fundo transparente — overlay de abertura PWA. */
export const EID_PWA_SPLASH_MARK_SRC = "/pwa-splash-open-mark.png";

/** Fundo app tema claro — `theme-color` / system UI quando tema claro. */
export const EID_LIGHT_APP_SURFACE = "#f3f6fb";

/** Favicon e ícones compactos: somente letra E. */
export const EID_LOGO_ICON_E_SRC = "/brand/logo-icon-e.png";
export const EID_LOGO_ICON_E_WIDTH = 1024;
export const EID_LOGO_ICON_E_HEIGHT = 1024;

/**
 * Cor “ink” da marca — única fonte para:
 * - splash / `background_color` do manifest PWA
 * - `theme_color` do manifest (Chrome/Android, tela de instalação)
 * - `theme-color` do viewport (aba + PWA)
 * - harmonia visual com iOS em `black-translucent` (área atrás da status bar)
 *
 * Alinhado a `--eid-brand-ink` em `globals.css`.
 */
export const EID_PWA_BACKGROUND = "#0b1d2e";

/** Alias explícito: mesma cor do manifest `theme_color` e da meta `theme-color` do layout. */
export const EID_APP_CHROME_THEME_COLOR = EID_PWA_BACKGROUND;
