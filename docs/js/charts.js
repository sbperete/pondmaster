// PondMaster — Chart Manager
// Theme-aware Chart.js wrappers. Loaded lazily only on pages with canvas elements.

(function () {
  'use strict';

  class ChartManager {
    constructor() {
      this._charts = {}; // canvasId → Chart instance
    }

    // Read CSS variables for current theme
    getChartTheme() {
      const style = getComputedStyle(document.documentElement);
      return {
        textColor:   style.getPropertyValue('--text-secondary').trim()  || '#8B949E',
        mutedColor:  style.getPropertyValue('--text-muted').trim()       || '#6E7681',
        gridColor:   style.getPropertyValue('--chart-grid').trim()       || 'rgba(255,255,255,0.05)',
        green:       style.getPropertyValue('--accent-green').trim()     || '#3FB950',
        blue:        style.getPropertyValue('--accent-blue').trim()      || '#58A6FF',
        orange:      style.getPropertyValue('--accent-orange').trim()    || '#F0883E',
        red:         style.getPropertyValue('--alert-red').trim()        || '#F85149',
        yellow:      style.getPropertyValue('--alert-yellow').trim()     || '#D29922',
        cardBg:      style.getPropertyValue('--bg-card').trim()          || '#1C2128',
      };
    }

    _destroyIfExists(canvasId) {
      if (this._charts[canvasId]) {
        this._charts[canvasId].destroy();
        delete this._charts[canvasId];
      }
    }

    // Growth chart: actual sampled weights + projected curve + harvest target line
    growthChart(canvasId, loggedWeights, stockingDate, harvestTargetG = 600) {
      if (typeof Chart === 'undefined') return;
      this._destroyIfExists(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const theme = this.getChartTheme();

      // Build projected curve from stocking date to +32 weeks
      const projectedLabels = [];
      const projectedData = [];
      if (stockingDate && window.PondGrowth) {
        for (let w = 0; w <= 32; w += 2) {
          const date = new Date(new Date(stockingDate).getTime() + w * 7 * 24 * 60 * 60 * 1000);
          projectedLabels.push(date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
          projectedData.push(Math.round(window.PondGrowth.interpolateGrowthCurve(w)));
        }
      }

      // Actual weighed samples
      const actualLabels = (loggedWeights || []).map(l => l.log_date);
      const actualData = (loggedWeights || []).map(l => l.avg_weight_g);

      const labels = projectedLabels.length ? projectedLabels : actualLabels;

      this._charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Projected (curve)',
              data: projectedData,
              borderColor: theme.blue,
              backgroundColor: 'transparent',
              borderDash: [6, 3],
              pointRadius: 0,
              tension: 0.3,
            },
            {
              label: 'Actual weight (g)',
              data: actualData.length ? actualData : [],
              borderColor: theme.green,
              backgroundColor: theme.green + '33',
              pointBackgroundColor: theme.green,
              pointRadius: 5,
              tension: 0.2,
            },
            {
              label: `Harvest target (${harvestTargetG}g)`,
              data: labels.map(() => harvestTargetG),
              borderColor: theme.orange,
              backgroundColor: 'transparent',
              borderDash: [4, 4],
              pointRadius: 0,
            },
          ],
        },
        options: this._lineOptions(theme, 'Weight (g)'),
      });
    }

    // Mortality bar chart — colour-coded by mortality rate
    mortalityChart(canvasId, weeklyLogs, totalStocked) {
      if (typeof Chart === 'undefined') return;
      this._destroyIfExists(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const theme = this.getChartTheme();
      const labels = (weeklyLogs || []).map(l => l.week_label || l.log_date);
      const mortPct = (weeklyLogs || []).map(l => {
        if (!totalStocked) return 0;
        return +((l.mortality_count / totalStocked) * 100).toFixed(2);
      });
      const colors = mortPct.map(p => p > 5 ? theme.red : p > 2 ? theme.yellow : theme.green);

      this._charts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Mortality rate (%)',
            data: mortPct,
            backgroundColor: colors,
            borderRadius: 4,
          }],
        },
        options: this._barOptions(theme, 'Mortality %'),
      });
    }

    // Financial chart — costs vs projected revenue per harvest window
    financialChart(canvasId, costs, revenues) {
      if (typeof Chart === 'undefined') return;
      this._destroyIfExists(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const theme = this.getChartTheme();

      this._charts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: revenues.map(r => r.label),
          datasets: [
            {
              label: 'Total Cost (MWK)',
              data: costs.map(c => c.value),
              backgroundColor: theme.red + 'BB',
              borderRadius: 4,
            },
            {
              label: 'Projected Revenue (MWK)',
              data: revenues.map(r => r.value),
              backgroundColor: theme.green + 'BB',
              borderRadius: 4,
            },
          ],
        },
        options: this._barOptions(theme, 'MWK'),
      });
    }

    // FCR trend line
    fcrChart(canvasId, weeklyData) {
      if (typeof Chart === 'undefined') return;
      this._destroyIfExists(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const theme = this.getChartTheme();
      const labels = (weeklyData || []).map(d => d.label);
      const fcrs = (weeklyData || []).map(d => d.fcr);
      const target = labels.map(() => 1.8);

      this._charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'FCR',
              data: fcrs,
              borderColor: theme.blue,
              backgroundColor: theme.blue + '22',
              tension: 0.3,
              pointRadius: 4,
            },
            {
              label: 'Target FCR (1.8)',
              data: target,
              borderColor: theme.green,
              borderDash: [5, 5],
              pointRadius: 0,
            },
          ],
        },
        options: this._lineOptions(theme, 'FCR'),
      });
    }

    // Re-render all charts when theme switches
    themeUpdateAll() {
      Object.keys(this._charts).forEach(id => {
        const chart = this._charts[id];
        if (!chart) return;
        const theme = this.getChartTheme();
        if (chart.options.scales?.y) {
          chart.options.scales.y.grid.color = theme.gridColor;
          chart.options.scales.y.ticks.color = theme.textColor;
        }
        if (chart.options.scales?.x) {
          chart.options.scales.x.grid.color = theme.gridColor;
          chart.options.scales.x.ticks.color = theme.textColor;
        }
        if (chart.options.plugins?.legend?.labels) {
          chart.options.plugins.legend.labels.color = theme.textColor;
        }
        chart.update();
      });
    }

    // Shared line chart options
    _lineOptions(theme, yLabel) {
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: theme.textColor, font: { size: 12 } } },
          tooltip: { backgroundColor: theme.cardBg, titleColor: theme.textColor, bodyColor: theme.mutedColor },
        },
        scales: {
          x: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor, maxTicksLimit: 8 } },
          y: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor }, title: { display: !!yLabel, text: yLabel, color: theme.mutedColor } },
        },
      };
    }

    // Shared bar chart options
    _barOptions(theme, yLabel) {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: theme.textColor, font: { size: 12 } } },
          tooltip: { backgroundColor: theme.cardBg, titleColor: theme.textColor, bodyColor: theme.mutedColor },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textColor } },
          y: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor }, title: { display: !!yLabel, text: yLabel, color: theme.mutedColor } },
        },
      };
    }
  }

  window.PondCharts = new ChartManager();

  // Re-render on resize
  window.addEventListener('resize', () => {
    Object.values(window.PondCharts._charts).forEach(c => c && c.resize());
  });

})();
