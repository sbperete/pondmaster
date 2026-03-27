// PondMaster — Core Application Module
// Handles: auth guard, routing, toasts, modals, offline detection, cache TTL, low-data mode

(function() {
  'use strict';

  // ============================================================
  // APP CONFIG
  // ============================================================
  const APP_CONFIG = {
    version: (typeof CONFIG !== 'undefined' && CONFIG.APP_VERSION) || '1.0.0',
    supabaseUrl: (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL) || '',
    cacheTTL: (typeof CONFIG !== 'undefined' && CONFIG.CACHE_TTL_MINUTES) || 15,
    maxPondsFree: (typeof CONFIG !== 'undefined' && CONFIG.MAX_PONDS_FREE) || 3,
    githubBase: (typeof CONFIG !== 'undefined' && CONFIG.GITHUB_PAGES_BASE) || '/pondmaster/',
    lowDataMode: false,
    isOffline: !navigator.onLine,
    currentUser: null,
  };

  // Pages that do NOT require authentication
  const PUBLIC_PAGES = ['index.html', 'auth.html', 'worker-card.html', 'offline.html', '404.html', 'privacy.html', 'demo.html', 'share-target.html', ''];

  // ============================================================
  // TOAST NOTIFICATION SYSTEM
  // ============================================================
  // Creates a toast container if not present
  // showToast(message, type='success', duration=4000)
  // Toasts stack, auto-dismiss, swipe-to-dismiss on mobile
  // Types: 'success', 'error', 'warning'

  function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = 'success', duration = 4000) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');

    const icons = { success: '✓', error: '✕', warning: '⚠' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '•'}</span><span class="toast-msg">${message}</span>`;

    container.appendChild(toast);

    // Auto-dismiss
    const timer = setTimeout(() => dismissToast(toast), duration);

    // Swipe to dismiss
    let startX = 0;
    toast.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    toast.addEventListener('touchend', e => {
      if (Math.abs(e.changedTouches[0].clientX - startX) > 60) {
        clearTimeout(timer);
        dismissToast(toast);
      }
    }, { passive: true });

    toast.addEventListener('click', () => { clearTimeout(timer); dismissToast(toast); });
  }

  function dismissToast(toast) {
    toast.style.animation = 'fadeOut 300ms forwards';
    setTimeout(() => toast.remove(), 300);
  }

  // ============================================================
  // MODAL SYSTEM
  // ============================================================
  // openModal(id) — shows overlay + sheet
  // closeModal(id) — hides
  // Closes on overlay click or Escape key

  function openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('click', function handler(e) {
      if (e.target === overlay) { closeModal(modalId); overlay.removeEventListener('click', handler); }
    });
  }

  function closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ============================================================
  // OFFLINE DETECTION
  // ============================================================
  function updateOnlineStatus() {
    APP_CONFIG.isOffline = !navigator.onLine;
    document.body.classList.toggle('offline', APP_CONFIG.isOffline);
    if (!navigator.onLine) {
      showToast('No internet connection. Changes will sync when back online.', 'warning', 8000);
    } else {
      showToast('Back online. Syncing...', 'success', 3000);
      // Trigger background sync if service worker available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-daily-logs'));
      } else {
        // Fallback: manual sync
        if (window.PondDB && window.PondDB.processSyncQueue) {
          window.PondDB.processSyncQueue();
        }
      }
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // ============================================================
  // LOW DATA MODE DETECTION
  // ============================================================
  function detectConnectionQuality() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const isSlow = connection.effectiveType === '2g' ||
                     connection.effectiveType === 'slow-2g' ||
                     connection.saveData === true;
      if (isSlow) {
        APP_CONFIG.lowDataMode = true;
        console.log('[PondMaster] Low data mode active');
        showToast('Low data mode — saving your data bundle', 'warning', 6000);
      }
    }
  }

  // ============================================================
  // CACHE TTL CHECKER
  // ============================================================
  function isCacheFresh(cacheKey) {
    const ts = localStorage.getItem(`${cacheKey}_ts`);
    if (!ts) return false;
    const age = (Date.now() - parseInt(ts)) / 60000; // minutes
    return age < APP_CONFIG.cacheTTL;
  }

  function setCacheTimestamp(cacheKey) {
    localStorage.setItem(`${cacheKey}_ts`, Date.now().toString());
  }

  function invalidateCache(cacheKey) {
    localStorage.removeItem(`${cacheKey}_ts`);
    localStorage.removeItem(cacheKey);
  }

  // ============================================================
  // AUTH GUARD
  // ============================================================
  async function checkAuth() {
    if (!window.supabaseClient) return null;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    return session ? session.user : null;
  }

  function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || '';
    return filename;
  }

  function requireAuth() {
    const page = getCurrentPage();
    const isPublic = PUBLIC_PAGES.some(p => page === p || page === '');
    if (isPublic) return;

    checkAuth().then(user => {
      if (!user) {
        window.location.href = 'auth.html';
        return;
      }
      APP_CONFIG.currentUser = user;
      // Check for pending invites
      checkPendingInvites(user);
    });
  }

  // ============================================================
  // PENDING INVITE CHECK
  // ============================================================
  async function checkPendingInvites(user) {
    if (!window.supabaseClient || !user.email) return;
    try {
      const { data } = await window.supabaseClient
        .from('pm_pond_invites')
        .select('id, pond_id, role, invited_by')
        .eq('invited_email', user.email)
        .eq('accepted', false)
        .limit(1);

      if (data && data.length > 0) {
        const invite = data[0];
        showToast(`You have a pond sharing invitation. Check your dashboard.`, 'success', 8000);
      }
    } catch (e) {
      // Silent — invite check is non-critical
    }
  }

  // ============================================================
  // LAST SYNCED DISPLAY
  // ============================================================
  function updateSyncDisplay() {
    const ts = localStorage.getItem('pm_last_sync');
    const el = document.getElementById('last-synced');
    if (!el || !ts) return;
    const minutes = Math.round((Date.now() - parseInt(ts)) / 60000);
    if (minutes < 1) el.textContent = 'Synced just now';
    else if (minutes < 60) el.textContent = `Synced ${minutes}m ago`;
    else el.textContent = `Synced ${Math.round(minutes/60)}h ago`;
  }

  // ============================================================
  // AUTH MODULE (PondAuth)
  // ============================================================
  const PondAuth = {
    async signIn(email, password) {
      if (!window.supabaseClient) throw new Error('Database not connected');
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw new Error(PondAuth._friendlyError(error.message));
      return data;
    },

    async signUp(email, password, name, farmName) {
      if (!window.supabaseClient) throw new Error('Database not connected');
      const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
      if (error) throw new Error(PondAuth._friendlyError(error.message));

      if (data.user) {
        // Create user profile
        await window.supabaseClient.from('pm_users').upsert({
          id: data.user.id,
          email,
          name,
          farm_name: farmName,
          tour_complete: false,
          theme_preference: localStorage.getItem('pondmaster_theme') || 'system',
        });
      }
      return data;
    },

    async signOut() {
      if (!window.supabaseClient) return;
      await window.supabaseClient.auth.signOut();
      localStorage.removeItem('pm_current_user');
      window.location.href = 'index.html';
    },

    async resetPassword(email) {
      if (!window.supabaseClient) throw new Error('Database not connected');
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/pondmaster/auth.html?mode=reset'
      });
      if (error) throw new Error(PondAuth._friendlyError(error.message));
    },

    _friendlyError(msg) {
      if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
      if (msg.includes('Email not confirmed')) return 'Please check your email and confirm your account.';
      if (msg.includes('User already registered')) return 'An account with this email already exists. Please sign in.';
      if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
      if (msg.includes('rate limit')) return 'Too many attempts. Please wait a few minutes.';
      return msg;
    }
  };

  // ============================================================
  // SERVICE WORKER REGISTRATION
  // ============================================================
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('[PondMaster] SW registered, scope:', reg.scope);
            // Listen for background sync completion
            navigator.serviceWorker.addEventListener('message', event => {
              if (event.data && event.data.type === 'SYNC_COMPLETE') {
                localStorage.setItem('pm_last_sync', Date.now().toString());
                showToast(`${event.data.count} log(s) synced successfully`, 'success');
                updateSyncDisplay();
              }
            });
          })
          .catch(err => console.warn('[PondMaster] SW registration failed:', err));
      });
    }
  }

  // ============================================================
  // DOM READY INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', function() {
    // Auth guard
    requireAuth();

    // Low data detection
    detectConnectionQuality();

    // Initial offline status
    if (!navigator.onLine) {
      document.body.classList.add('offline');
    }

    // Update sync display
    updateSyncDisplay();
    setInterval(updateSyncDisplay, 60000);

    // Theme toggle buttons
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.PondTheme) window.PondTheme.toggle();
      });
    });

    // Bottom nav active state
    const currentPage = getCurrentPage();
    document.querySelectorAll('.bottom-nav a, .sidebar-nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPage)) {
        link.classList.add('active');
      }
    });

    // Escape key closes modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
          m.classList.remove('active');
          document.body.style.overflow = '';
        });
      }
    });
  });

  // ============================================================
  // EXPOSE PUBLIC API
  // ============================================================
  window.PondApp = {
    config: APP_CONFIG,
    showToast,
    openModal,
    closeModal,
    isCacheFresh,
    setCacheTimestamp,
    invalidateCache,
    updateSyncDisplay,
  };

  window.PondAuth = PondAuth;

  // Register SW on first load
  registerSW();

})();
