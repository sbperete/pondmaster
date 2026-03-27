// PondMaster — Guided Tour Engine (11 steps, zero external libraries)

(function () {
  'use strict';

  const TOUR_STEPS = [
    {
      id: 'welcome',
      fullScreen: true,
      icon: '🐟',
      title: 'Welcome to PondMaster!',
      body: 'This quick tour takes 2 minutes and shows you everything you need to start managing your ponds like a pro. You can skip anytime and restart from Settings.',
      buttons: ['skip', 'start'],
    },
    {
      id: 'summary-cards',
      target: '#summary-cards',
      title: 'Your Farm at a Glance',
      body: 'These cards show your most important numbers: total fish stocked, days to harvest, this week\'s feed cost, and projected revenue. They update automatically as you log data.',
    },
    {
      id: 'pond-cards',
      target: '#pond-cards-grid, #pond-empty-state',
      title: 'Your Pond Cards',
      body: 'Each card is one pond. Tap to open full details: feed logs, health events, growth charts, and AI chat. Swipe left on a card to quickly log today\'s feed.',
    },
    {
      id: 'add-pond',
      target: '#fab-add-pond',
      pulse: true,
      title: 'Start Here — Add Your First Pond',
      body: 'Tap this button to add your first pond. Enter the size, depth, liner type, and water source. This takes about 2 minutes.',
    },
    {
      id: 'alerts',
      target: '#alerts-feed',
      title: 'Health Alerts',
      body: 'Urgent issues — sick fish, low oxygen, high mortality — appear here in red. Check every morning before feeding.',
    },
    {
      id: 'pond-tabs',
      target: '.tab-bar',
      title: 'Five Tabs, Everything You Need',
      body: 'Daily Log, Health, Feed Schedule, Financials, AI Chat. You will use Daily Log every single day.',
    },
    {
      id: 'daily-log',
      target: '#tab-log',
      title: 'Log Every Day — 60 Seconds',
      body: 'Record feed amount, dead fish, water temperature, and a weekly fish weight sample. This powers your growth chart and profit forecast automatically.',
    },
    {
      id: 'feed-schedule',
      target: '#tab-feed',
      title: 'Your Workers Daily Guide',
      body: 'Auto-generates feeding schedule based on fish size and growth phase. Share link with workers — they do not need an account to view it.',
    },
    {
      id: 'ai-chat',
      target: '#tab-chat',
      title: 'Expert Advisor — 24/7',
      body: 'Ask anything about your pond: disease symptoms, feed amounts, slow growth, water problems. Add your API key in Settings. It knows your pond data.',
    },
    {
      id: 'calendar',
      target: '.bottom-nav a[href*="calendar"]',
      title: 'Never Miss a Key Date',
      body: 'Feeding phase changes, weighing days, water changes, and harvest dates auto-populate here. Check every Sunday to plan your week.',
    },
    {
      id: 'complete',
      fullScreen: true,
      icon: '🎉',
      title: 'You Are Ready!',
      body: 'Add your first pond to get started. If you get stuck, open AI Chat in any pond — it knows exactly what to do. Good luck with your harvest!',
      buttons: ['add-pond', 'dashboard'],
    },
  ];

  class TourManager {
    constructor() {
      this._step = 0;
      this._active = false;
      this._overlay = null;
      this._tooltip = null;
      this.STORAGE_KEY = 'pondmaster_tour_step';
      this.COMPLETE_KEY = 'pondmaster_tour_complete';
    }

    init() {
      this._buildOverlay();
      // Check if should auto-start
      const params = new URLSearchParams(window.location.search);
      if (params.get('tour') === 'true' && !this._isComplete()) {
        setTimeout(() => this.start(), 800);
      }
      // Keyboard nav
      document.addEventListener('keydown', (e) => {
        if (!this._active) return;
        if (e.key === 'Escape') this.skip();
        if (e.key === 'ArrowRight' || e.key === 'Enter') this.next();
        if (e.key === 'ArrowLeft') this.back();
      });
    }

    _isComplete() {
      return localStorage.getItem(this.COMPLETE_KEY) === 'true';
    }

    _buildOverlay() {
      if (document.getElementById('tour-overlay')) return;
      const overlay = document.createElement('div');
      overlay.id = 'tour-overlay';
      overlay.className = 'tour-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;pointer-events:none;display:none';
      document.body.appendChild(overlay);
      this._overlay = overlay;
    }

    start() {
      // Resume from saved step or start from 0
      const saved = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0');
      this._step = saved;
      this._active = true;
      if (this._overlay) this._overlay.style.display = 'block';
      this.goToStep(this._step);
    }

    next() {
      if (!this._active) return;
      if (this._step >= TOUR_STEPS.length - 1) { this.complete(); return; }
      this._step++;
      localStorage.setItem(this.STORAGE_KEY, this._step);
      this.goToStep(this._step);
    }

    back() {
      if (!this._active || this._step <= 0) return;
      this._step--;
      localStorage.setItem(this.STORAGE_KEY, this._step);
      this.goToStep(this._step);
    }

    skip() {
      this._active = false;
      this._hideTooltip();
      this._clearSpotlight();
      if (this._overlay) this._overlay.style.display = 'none';
    }

    complete() {
      localStorage.setItem(this.COMPLETE_KEY, 'true');
      localStorage.removeItem(this.STORAGE_KEY);
      this.skip();
      // Sync to Supabase if logged in
      window.supabaseClient?.auth.getUser().then(({ data }) => {
        if (data?.user && window.PondDB) window.PondDB.markTourComplete(data.user.id);
      });
    }

    goToStep(n) {
      this._clearSpotlight();
      this._hideTooltip();
      const step = TOUR_STEPS[n];
      if (!step) return;

      if (step.fullScreen) {
        this._showFullScreen(step, n);
        return;
      }

      // Find target element
      const targetEl = step.target ? document.querySelector(step.target) : null;
      if (step.pulse && targetEl) {
        targetEl.classList.add('tour-pulse');
      }
      this._showSpotlight(targetEl);
      this._showTooltip(step, n, targetEl);
    }

    _showSpotlight(el) {
      if (!el || !this._overlay) return;
      const rect = el.getBoundingClientRect();
      const pad = 8;
      const spotlight = document.createElement('div');
      spotlight.className = 'tour-spotlight';
      spotlight.style.cssText = `
        position:fixed;
        left:${rect.left - pad}px;
        top:${rect.top - pad}px;
        width:${rect.width + pad * 2}px;
        height:${rect.height + pad * 2}px;
        border-radius:8px;
        box-shadow:0 0 0 9999px rgba(0,0,0,0.65);
        pointer-events:none;
        transition:all 250ms ease;
        z-index:10001;
      `;
      this._overlay.appendChild(spotlight);
    }

    _showTooltip(step, stepIndex, targetEl) {
      const tooltip = document.createElement('div');
      tooltip.className = 'tour-tooltip';
      tooltip.style.cssText = `
        position:fixed;
        z-index:10002;
        background:var(--bg-card,#1C2128);
        color:var(--text-primary,#E6EDF3);
        border:1px solid var(--border,#30363D);
        border-radius:12px;
        padding:20px;
        width:min(320px,90vw);
        box-shadow:0 8px 32px rgba(0,0,0,0.4);
        pointer-events:all;
      `;

      // Progress dots
      const dots = TOUR_STEPS.filter(s => !s.fullScreen).map((_, i) => {
        const idx = TOUR_STEPS.indexOf(TOUR_STEPS.filter(s => !s.fullScreen)[i]);
        return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${idx === stepIndex ? 'var(--accent-blue,#58A6FF)' : 'var(--border,#30363D)'};margin:0 3px"></span>`;
      }).join('');

      tooltip.innerHTML = `
        <div style="margin-bottom:10px">${dots}</div>
        <div style="font-weight:700;font-size:15px;margin-bottom:8px">${step.title}</div>
        <div style="font-size:14px;line-height:1.5;color:var(--text-secondary,#8B949E);margin-bottom:16px">${step.body}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <button onclick="window.PondTour.skip()" style="background:none;border:none;color:var(--text-muted);font-size:13px;cursor:pointer;padding:0">Skip tour</button>
          <div style="display:flex;gap:8px">
            ${stepIndex > 0 ? '<button onclick="window.PondTour.back()" style="height:36px;padding:0 14px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-primary);font-size:13px;cursor:pointer">Back</button>' : ''}
            <button onclick="window.PondTour.next()" style="height:36px;padding:0 16px;border-radius:6px;border:none;background:var(--accent-green,#3FB950);color:white;font-size:13px;font-weight:600;cursor:pointer">${stepIndex === TOUR_STEPS.length - 2 ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      `;

      // Position tooltip: prefer below target, flip if near edge
      document.body.appendChild(tooltip);
      const tRect = tooltip.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;

      let top, left;
      if (targetEl) {
        const elRect = targetEl.getBoundingClientRect();
        const spaceBelow = vh - elRect.bottom;
        top = spaceBelow > tRect.height + 20
          ? elRect.bottom + 12
          : elRect.top - tRect.height - 12;
        left = Math.min(Math.max(elRect.left, 12), vw - tRect.width - 12);
        // Mobile: always below or near bottom
        if (vw < 768) {
          top = Math.min(top, vh - tRect.height - 16);
          left = (vw - Math.min(320, vw - 24)) / 2;
        }
      } else {
        top = (vh - tRect.height) / 2;
        left = (vw - tRect.width) / 2;
      }

      tooltip.style.top = Math.max(8, top) + 'px';
      tooltip.style.left = Math.max(8, left) + 'px';
      this._tooltip = tooltip;
    }

    _showFullScreen(step, stepIndex) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position:fixed;inset:0;z-index:10002;
        background:var(--bg-primary,#0D1117);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:32px 24px;text-align:center;pointer-events:all;
      `;

      const isLast = stepIndex === TOUR_STEPS.length - 1;
      modal.innerHTML = `
        <div style="font-size:64px;margin-bottom:16px">${step.icon}</div>
        <h2 style="font-size:24px;font-weight:700;color:var(--text-primary,#E6EDF3);margin-bottom:12px">${step.title}</h2>
        <p style="font-size:16px;line-height:1.6;color:var(--text-secondary,#8B949E);max-width:400px;margin-bottom:32px">${step.body}</p>
        ${isLast ? `
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
            <button onclick="window.PondTour.complete();document.getElementById('fab-add-pond')?.click()" style="height:48px;padding:0 24px;border-radius:8px;border:none;background:var(--accent-green,#3FB950);color:white;font-size:16px;font-weight:600;cursor:pointer">Add My First Pond</button>
            <button onclick="window.PondTour.complete()" style="height:48px;padding:0 24px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-primary);font-size:16px;cursor:pointer">Go to Dashboard</button>
          </div>
        ` : `
          <div style="display:flex;gap:12px">
            <button onclick="window.PondTour.skip()" style="height:48px;padding:0 20px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-primary);font-size:15px;cursor:pointer">Skip Tour</button>
            <button onclick="window.PondTour.next()" style="height:48px;padding:0 24px;border-radius:8px;border:none;background:var(--accent-green,#3FB950);color:white;font-size:16px;font-weight:600;cursor:pointer">Let's Go</button>
          </div>
        `}
      `;

      if (this._overlay) {
        this._overlay.style.pointerEvents = 'all';
        this._overlay.appendChild(modal);
      }
      this._tooltip = modal;
    }

    _hideTooltip() {
      if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }
      // Remove any directly appended tooltip
      document.querySelectorAll('.tour-tooltip').forEach(el => el.remove());
    }

    _clearSpotlight() {
      if (this._overlay) {
        this._overlay.innerHTML = '';
        this._overlay.style.pointerEvents = 'none';
      }
      document.querySelectorAll('.tour-pulse').forEach(el => el.classList.remove('tour-pulse'));
    }
  }

  const tour = new TourManager();
  window.PondTour = tour;

  document.addEventListener('DOMContentLoaded', () => tour.init());

})();
