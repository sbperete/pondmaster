// PondMaster — Theme Manager
// Handles dark/light/system theme with persistence and Supabase sync

(function () {
  'use strict';

  class ThemeManager {
    constructor() {
      this.STORAGE_KEY = 'pondmaster_theme';
      this.VALID_THEMES = ['light', 'dark', 'system'];
      this._init();
    }

    /**
     * Returns the OS/browser preferred color scheme.
     * @returns {'dark'|'light'}
     */
    getSystemTheme() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /**
     * Returns the user's saved preference from localStorage.
     * Defaults to 'system' if nothing is stored.
     * @returns {'light'|'dark'|'system'}
     */
    getSavedTheme() {
      return localStorage.getItem(this.STORAGE_KEY) || 'system';
    }

    /**
     * Resolves the effective (applied) theme, resolving 'system' to 'light' or 'dark'.
     * @returns {'light'|'dark'}
     */
    getEffectiveTheme() {
      const saved = this.getSavedTheme();
      return saved === 'system' ? this.getSystemTheme() : saved;
    }

    /**
     * Applies a resolved theme ('light' or 'dark') to the document and updates
     * all toggle buttons on the page. Also notifies ChartManager if present.
     * @param {'light'|'dark'} theme
     */
    applyTheme(theme) {
      // Apply to root element — CSS custom properties switch via [data-theme]
      document.documentElement.setAttribute('data-theme', theme);

      // Update all toggle buttons on the page
      document.querySelectorAll('.theme-toggle').forEach(function (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        btn.setAttribute(
          'aria-label',
          theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        );
      });

      // Notify Chart.js manager if it is loaded
      if (window.PondCharts && typeof window.PondCharts.themeUpdateAll === 'function') {
        window.PondCharts.themeUpdateAll();
      }
    }

    /**
     * Saves the user's theme preference and applies it.
     * @param {'light'|'dark'|'system'} preference
     */
    setTheme(preference) {
      if (!this.VALID_THEMES.includes(preference)) {
        console.warn('[PondTheme] Invalid theme preference:', preference);
        return;
      }
      localStorage.setItem(this.STORAGE_KEY, preference);
      this.applyTheme(this.getEffectiveTheme());
    }

    /**
     * Toggles between light and dark (ignores 'system', sets an explicit value).
     */
    toggle() {
      var current = this.getEffectiveTheme();
      this.setTheme(current === 'dark' ? 'light' : 'dark');
    }

    /**
     * Persists the theme preference to the user's Supabase profile row.
     * Silently no-ops if supabaseClient or userId are not available.
     * @param {string} userId  — Supabase auth user UUID
     * @param {'light'|'dark'|'system'} theme
     */
    syncToSupabase(userId, theme) {
      if (!window.supabaseClient || !userId) return;

      window.supabaseClient
        .from('pm_users')
        .update({ theme_preference: theme })
        .eq('id', userId)
        .then(function (result) {
          if (result.error) {
            console.warn('[PondTheme] Failed to sync theme:', result.error.message);
          }
        });
    }

    /**
     * Loads and applies the stored (or system) theme on first paint,
     * and registers a listener for OS-level theme changes.
     * @private
     */
    _init() {
      // Apply theme immediately on load — before page renders — to avoid flash of wrong theme.
      this.applyTheme(this.getEffectiveTheme());

      // Watch for OS theme changes and re-apply only if the user preference is 'system'.
      var self = this;
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', function () {
          if (self.getSavedTheme() === 'system') {
            self.applyTheme(self.getSystemTheme());
          }
        });

      // Wire up any .theme-toggle buttons that already exist in the DOM at load time.
      // (Buttons injected later will be updated via applyTheme.)
      document.querySelectorAll('.theme-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.toggle();
        });
      });
    }
  }

  // Expose singleton globally
  window.PondTheme = new ThemeManager();

})();
