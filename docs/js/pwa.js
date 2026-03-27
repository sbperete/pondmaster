// PondMaster — PWA Manager
// Handles: SW registration, install banner, push permission, online/offline

(function () {
  'use strict';

  class PWAManager {
    constructor() {
      this._deferredPrompt = null;
      this._VISIT_KEY = 'pm_visit_count';
      this._INSTALLED_KEY = 'pm_installed';
      this._init();
    }

    _init() {
      // Track visit count
      const visits = parseInt(localStorage.getItem(this._VISIT_KEY) || '0') + 1;
      localStorage.setItem(this._VISIT_KEY, visits.toString());

      // Capture install prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this._deferredPrompt = e;
        // Show banner after 2nd visit, if not already installed
        if (visits >= 2 && !localStorage.getItem(this._INSTALLED_KEY)) {
          this.showInstallBanner();
        }
      });

      // App installed
      window.addEventListener('appinstalled', () => {
        localStorage.setItem(this._INSTALLED_KEY, '1');
        this.hideInstallBanner();
        this._deferredPrompt = null;
        if (window.PondApp) window.PondApp.showToast('PondMaster installed!', 'success');
      });

      // Wire install banner buttons after DOM ready
      document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('btn-install-pwa')?.addEventListener('click', () => this.promptInstall());
        document.getElementById('btn-dismiss-install')?.addEventListener('click', () => {
          this.hideInstallBanner();
          localStorage.setItem(this._INSTALLED_KEY, 'dismissed');
        });
      });
    }

    showInstallBanner() {
      const banner = document.getElementById('install-banner');
      if (banner) banner.style.display = 'flex';
    }

    hideInstallBanner() {
      const banner = document.getElementById('install-banner');
      if (banner) banner.style.display = 'none';
    }

    async promptInstall() {
      if (!this._deferredPrompt) return;
      this._deferredPrompt.prompt();
      const { outcome } = await this._deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem(this._INSTALLED_KEY, '1');
      }
      this._deferredPrompt = null;
      this.hideInstallBanner();
    }

    async requestPushPermission() {
      if (!('Notification' in window)) {
        if (window.PondApp) window.PondApp.showToast('Push notifications not supported on this device', 'warning');
        return false;
      }
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        if (window.PondApp) window.PondApp.showToast('Notifications enabled', 'success');
        return true;
      }
      return false;
    }

    getPushPermissionStatus() {
      if (!('Notification' in window)) return 'unsupported';
      return Notification.permission; // 'default' | 'granted' | 'denied'
    }
  }

  window.PondPWA = new PWAManager();

})();
