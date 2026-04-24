/** Caminhos públicos das variações oficiais da marca (artes exportadas). */

/** Pré-dashboard: ícone E + palavra ESPORTEID (logo completa — legado / outros usos). */
export const EID_LOGO_FULL_SRC = "/brand/logo-full.png";
export const EID_LOGO_FULL_WIDTH = 1024;
export const EID_LOGO_FULL_HEIGHT = 1024;

/** Marca E multiesportes com fundo transparente — auth, onboarding, landing. */
export const EID_LOGO_AUTH_MARK_SRC = "/brand/logo-auth-mark.png";
export const EID_LOGO_AUTH_MARK_WIDTH = 1024;
export const EID_LOGO_AUTH_MARK_HEIGHT = 1024;

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
 * Fundo do canvas do app no tema escuro — **igual** a `--eid-bg` em `globals.css` (:root).
 * `background_color` do manifest / overscroll; a barra do sistema usa `--eid-system-ui-chrome` / `EID_APP_CHROME_THEME_COLOR`.
 *
 * `--eid-brand-ink` (#0b1d2e) continua só para gradientes/marca, não para o fundo principal.
 */
export const EID_APP_CANVAS_BG_DARK = "#0b0f14";

/**
 * Tom do header no escuro (~`color-mix` 58% card / 42% bg em `globals.css`) — mesmo eixo visual do topbar.
 * Manifest / viewport SSR usam isso para a barra do sistema bater com o chrome, não com o canvas da página.
 */
export const EID_SYSTEM_UI_THEME_COLOR_DARK = "#121821";

/** Splash / `background_color` do manifest = canvas real do app. */
export const EID_PWA_BACKGROUND = EID_APP_CANVAS_BG_DARK;

/** Meta `theme-color` inicial (layout) + `theme_color` do manifest — alinhado a `--eid-system-ui-chrome`. */
export const EID_APP_CHROME_THEME_COLOR = EID_SYSTEM_UI_THEME_COLOR_DARK;

/** Tema claro: topo do shell costuma ser branco (`--eid-system-ui-chrome`). */
export const EID_SYSTEM_UI_THEME_COLOR_LIGHT = "#ffffff";
