// PondMaster — Demo Data (no Supabase, localStorage only)
// Three ponds at different stages: Week 8, Week 16, Week 24

window.DEMO_MODE = true;

window.DEMO_DATA = {
  user: {
    id: 'demo-user',
    email: 'demo@pondmaster.app',
    name: 'Demo Farmer',
    farm_name: 'Mbwadzulu Demonstration Farm',
    location: 'Lilongwe, Malawi',
    tour_complete: true,
    theme_preference: 'system',
    language_preference: 'en',
    pond_limit: 3,
  },

  ponds: [
    {
      id: 'demo-pond-a',
      user_id: 'demo-user',
      pond_name: 'Pond A',
      pond_number: 1,
      length_m: 30, width_m: 30, depth_m: 1.5,
      volume_m3: 1350,
      liner_type: 'Black LDPE',
      water_source: 'Borehole',
      aeration_type: 'Paddle wheel',
      status: 'active',
      worker_token: 'demo-token-pond-a',
      worker_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-pond-b',
      user_id: 'demo-user',
      pond_name: 'Pond B',
      pond_number: 2,
      length_m: 30, width_m: 30, depth_m: 1.5,
      volume_m3: 1350,
      liner_type: 'Black HDPE',
      water_source: 'Borehole',
      aeration_type: 'Air pump',
      status: 'active',
      worker_token: null, worker_token_expires_at: null,
      created_at: new Date(Date.now() - 112 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-pond-c',
      user_id: 'demo-user',
      pond_name: 'Pond C',
      pond_number: 3,
      length_m: 30, width_m: 30, depth_m: 1.5,
      volume_m3: 1350,
      liner_type: 'Black LDPE',
      water_source: 'River',
      aeration_type: 'Multiple',
      status: 'active',
      worker_token: null, worker_token_expires_at: null,
      created_at: new Date(Date.now() - 168 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],

  lots: {
    'demo-pond-a': [{
      id: 'demo-lot-a', pond_id: 'demo-pond-a', lot_number: 1,
      species: 'Nile Tilapia', stock_type: 'Monosex male',
      fingerlings_stocked: 10800,
      stocking_date: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      target_harvest_date: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      harvest_month_target: 6,
      fingerling_source: 'LUANAR Bunda Campus',
      fingerling_cost_mwk: 540000,
      status: 'active',
    }],
    'demo-pond-b': [{
      id: 'demo-lot-b', pond_id: 'demo-pond-b', lot_number: 1,
      species: 'Nile Tilapia', stock_type: 'Monosex male',
      fingerlings_stocked: 10800,
      stocking_date: new Date(Date.now() - 112 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      target_harvest_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      harvest_month_target: 6,
      fingerling_source: 'LUANAR Bunda Campus',
      fingerling_cost_mwk: 540000,
      status: 'active',
    }],
    'demo-pond-c': [{
      id: 'demo-lot-c', pond_id: 'demo-pond-c', lot_number: 1,
      species: 'Nile Tilapia', stock_type: 'Monosex male',
      fingerlings_stocked: 10800,
      stocking_date: new Date(Date.now() - 168 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      target_harvest_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      harvest_month_target: 7,
      fingerling_source: 'Mwekera Research Station, Kitwe',
      fingerling_cost_mwk: 540000,
      status: 'active',
    }],
  },

  healthEvents: {
    'demo-pond-b': [
      {
        id: 'demo-health-1', pond_id: 'demo-pond-b', lot_id: 'demo-lot-b',
        event_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        event_type: 'Disease', symptoms: 'White spots visible on fins and body of several fish',
        severity: 'HIGH', treatment_applied: 'Salt bath 5g/L for 30 mins, raised aeration',
        outcome: 'Resolved after 5 days treatment', resolved_date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ],
    'demo-pond-c': [
      {
        id: 'demo-health-2', pond_id: 'demo-pond-c', lot_id: 'demo-lot-c',
        event_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        event_type: 'Water quality', symptoms: 'Fish gasping near surface at 6am, DO reading 2.1 mg/L',
        severity: 'CRITICAL', treatment_applied: 'Emergency aeration — ran all aerators at max. Water exchange 20%.',
        outcome: null, resolved_date: null,
      },
    ],
  },
};

// Generate 12 weeks of daily logs for each pond
(function generateLogs() {
  window.DEMO_DATA.logs = {};

  const ponds = [
    { id: 'demo-pond-a', lotId: 'demo-lot-a', weeksBack: 8,  stocked: 10800 },
    { id: 'demo-pond-b', lotId: 'demo-lot-b', weeksBack: 16, stocked: 10800 },
    { id: 'demo-pond-c', lotId: 'demo-lot-c', weeksBack: 24, stocked: 10800 },
  ];

  ponds.forEach(p => {
    const logs = [];
    for (let d = p.weeksBack * 7; d >= 0; d -= 2) {
      const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
      const weeksIn = (p.weeksBack * 7 - d) / 7;
      const estWeight = window.PondGrowth ? window.PondGrowth.interpolateGrowthCurve(weeksIn) : 100;
      const biomass = (estWeight * p.stocked) / 1000;
      const phase = window.PondGrowth ? window.PondGrowth.getGrowthPhase(weeksIn) : { feedingRatePct: 3, feedType: 'Grower Pellets' };
      const feedKg = +((biomass * phase.feedingRatePct / 100)).toFixed(1);
      const mortality = d % 14 === 0 ? Math.floor(Math.random() * 5) : 0;
      const isWeighDay = Math.floor(weeksIn) % 1 === 0 && d % 7 === 0;

      logs.push({
        id: `demo-log-${p.id}-${d}`,
        pond_id: p.id, lot_id: p.lotId,
        log_date: date.toISOString().split('T')[0],
        feed_type: phase.feedType,
        feed_amount_kg: feedKg,
        feed_cost_mwk: +(feedKg * 1500).toFixed(0),
        water_temp_c: +(26 + Math.random() * 3).toFixed(1),
        do_level: +(5.5 + Math.random() * 2).toFixed(1),
        ph_level: +(7.2 + Math.random() * 0.6).toFixed(1),
        fish_sampled: isWeighDay ? 10 : null,
        avg_weight_g: isWeighDay ? Math.round(estWeight * (0.95 + Math.random() * 0.1)) : null,
        mortality_count: mortality,
        notes: '',
        logged_by: 'Demo Farmer',
        synced_offline: false,
      });
    }
    window.DEMO_DATA.logs[p.id] = logs.sort((a, b) => b.log_date.localeCompare(a.log_date));
  });
})();
