// PondMaster — Tilapia Growth Model & Feed Calculator
// Based on monosex Nile tilapia (O. niloticus) commercial pond farming
// Verified weights: Month 5=480g, Month 6=600g, Month 7=700g
// Defaults: 8 fish/m³ stocking density, commercial feed with aeration

(function() {
  'use strict';

  // Growth curve: week → average weight in grams (monosex Nile, commercial feed, aeration)
  const GROWTH_CURVE = [
    { week: 0,  avgWeight: 5   },  // fingerling
    { week: 2,  avgWeight: 15  },
    { week: 4,  avgWeight: 50  },
    { week: 6,  avgWeight: 85  },
    { week: 8,  avgWeight: 120 },
    { week: 10, avgWeight: 165 },
    { week: 12, avgWeight: 220 },
    { week: 14, avgWeight: 280 },
    { week: 16, avgWeight: 350 },
    { week: 18, avgWeight: 415 },
    { week: 20, avgWeight: 480 },  // Month 5 harvest
    { week: 24, avgWeight: 600 },  // Month 6 harvest
    { week: 28, avgWeight: 700 },  // Month 7 harvest
    { week: 32, avgWeight: 780 },
  ];

  // Growth phases with feeding parameters
  const GROWTH_PHASES = [
    {
      phase: 'NURSERY',
      weekStart: 0, weekEnd: 4,
      feedType: 'Starter Crumbles',
      pelletSize: '<1mm',
      feedingRatePct: 5,
      mealsPerDay: 3,
      phaseAlert: 'Watch for uneaten feed — overfeeding causes water quality problems',
      weekRange: 'Weeks 1–4',
    },
    {
      phase: 'JUVENILE',
      weekStart: 4, weekEnd: 8,
      feedType: 'Juvenile 1',
      pelletSize: '1mm',
      feedingRatePct: 4,
      mealsPerDay: 3,
      phaseAlert: 'Check DO at dawn (5am–7am) — oxygen lowest before sunrise',
      weekRange: 'Weeks 5–8',
    },
    {
      phase: 'GROWER',
      weekStart: 8, weekEnd: 16,
      feedType: 'Juvenile 2 / Grower Pellets',
      pelletSize: '2mm',
      feedingRatePct: 3,
      mealsPerDay: 2,
      phaseAlert: 'Run aerators 10pm–7am minimum. Monitor weekly growth sample.',
      weekRange: 'Weeks 9–16',
    },
    {
      phase: 'PRE-HARVEST',
      weekStart: 16, weekEnd: 24,
      feedType: 'Grower Pellets',
      pelletSize: '3mm',
      feedingRatePct: 2,
      mealsPerDay: 2,
      phaseAlert: 'Weigh 10 fish weekly. Plan harvest logistics and buyer contact.',
      weekRange: 'Weeks 17–24',
    },
    {
      phase: 'FINISHING',
      weekStart: 24, weekEnd: 32,
      feedType: 'Grower Pellets',
      pelletSize: '3mm',
      feedingRatePct: 1.5,
      mealsPerDay: 1,
      phaseAlert: 'Confirm harvest date with buyer. Consider withholding feed 24h before harvest.',
      weekRange: 'Weeks 25–32',
    },
  ];

  // Chichewa translations for worker card
  const CHICHEWA = {
    morning: 'Mmawa',
    evening: 'Madzulo',
    feed: 'Chakudya cha nsomba',
    deadFish: 'Nsomba zakufa',
    removeDeadFish: 'Chotsani nsomba zakufa ndi kuziwerenga',
    water: 'Madzi',
    emergency: 'Yitanani pogwira mfukufuku',
    harvest: 'Kukolola',
    feedingTime: 'Nthawi yokudyetsa',
    watchFor: 'Chindikiro',
    gaspingAtSurface: 'Kukamwa mpweya pamwamba pa madzi',
    spreadEvenly: 'Sasani mofananamo pa dzinje lonse',
    recordInApp: 'Lemba mu app',
    todaysDate: 'Lero',
    weeklyWeighDay: 'Tsiku la kuyesa nsomba',
    yourPonds: 'Makalamba anu',
    singleMealDay: 'Kudyetsa kamodzi — mmawa chabe',
  };

  // ------------------------------------------------------------------
  // estimateCurrentWeight(stockingDate, currentDate, lastSampledWeight)
  // Returns estimated average fish weight in grams
  // ------------------------------------------------------------------
  function estimateCurrentWeight(stockingDate, currentDate, lastSampledWeight = null) {
    if (!stockingDate) return null;
    const stocking = new Date(stockingDate);
    const now = new Date(currentDate);
    const weeksInPond = Math.max(0, (now - stocking) / (7 * 24 * 60 * 60 * 1000));

    // If we have a recent sample (within 7 days), use linear projection from that point
    if (lastSampledWeight && lastSampledWeight.avg_weight_g && lastSampledWeight.log_date) {
      const sampleDate = new Date(lastSampledWeight.log_date);
      const daysSinceSample = (now - sampleDate) / (24 * 60 * 60 * 1000);
      if (daysSinceSample <= 7) {
        // Daily growth rate from curve at that point
        const sampleWeek = (sampleDate - stocking) / (7 * 24 * 60 * 60 * 1000);
        const projectedAtSample = interpolateGrowthCurve(sampleWeek);
        const projectedNow = interpolateGrowthCurve(weeksInPond);
        const curveGrowthSinceDay = projectedNow - projectedAtSample;
        return Math.max(lastSampledWeight.avg_weight_g + curveGrowthSinceDay, lastSampledWeight.avg_weight_g);
      }
    }

    return interpolateGrowthCurve(weeksInPond);
  }

  function interpolateGrowthCurve(weeks) {
    if (weeks <= 0) return GROWTH_CURVE[0].avgWeight;
    for (let i = 0; i < GROWTH_CURVE.length - 1; i++) {
      const a = GROWTH_CURVE[i];
      const b = GROWTH_CURVE[i + 1];
      if (weeks >= a.week && weeks <= b.week) {
        const t = (weeks - a.week) / (b.week - a.week);
        return a.avgWeight + t * (b.avgWeight - a.avgWeight);
      }
    }
    return GROWTH_CURVE[GROWTH_CURVE.length - 1].avgWeight;
  }

  // ------------------------------------------------------------------
  // getGrowthPhase(weeksInPond) → phase object
  // ------------------------------------------------------------------
  function getGrowthPhase(weeksInPond) {
    for (const p of GROWTH_PHASES) {
      if (weeksInPond >= p.weekStart && weeksInPond < p.weekEnd) return p;
    }
    return GROWTH_PHASES[GROWTH_PHASES.length - 1]; // finishing/beyond
  }

  // ------------------------------------------------------------------
  // estimateBiomass(estWeight_g, stockedCount, mortalityCount) → kg
  // ------------------------------------------------------------------
  function estimateBiomass(estWeight_g, stockedCount, mortalityCount) {
    if (!estWeight_g || !stockedCount) return 0;
    const aliveCount = Math.max(0, stockedCount - (mortalityCount || 0));
    return (estWeight_g * aliveCount) / 1000;
  }

  // ------------------------------------------------------------------
  // calculateFeedToday(biomass_kg, phase) → feed plan object
  // ------------------------------------------------------------------
  function calculateFeedToday(biomass_kg, phase) {
    if (!biomass_kg || !phase) return null;
    const totalKg = Math.max(0, (biomass_kg * phase.feedingRatePct) / 100);
    const perMeal = totalKg / phase.mealsPerDay;
    const morningKg = phase.mealsPerDay >= 2 ? +(totalKg * 0.5).toFixed(2) : +totalKg.toFixed(2);
    const eveningKg = phase.mealsPerDay >= 2 ? +(totalKg * 0.5).toFixed(2) : 0;

    return {
      totalKg: +totalKg.toFixed(2),
      perMeal: +perMeal.toFixed(2),
      morningKg,
      eveningKg,
      feedType: phase.feedType,
      pelletSize: phase.pelletSize,
      mealsPerDay: phase.mealsPerDay,
      phaseAlert: phase.phaseAlert,
      isSingleMealDay: phase.mealsPerDay === 1,
      feedingRatePct: phase.feedingRatePct,
    };
  }

  // ------------------------------------------------------------------
  // projectHarvestRevenue
  // ------------------------------------------------------------------
  function projectHarvestRevenue(stockingDate, stockedCount, totalMortality, pricePerKg_MWK) {
    const price = pricePerKg_MWK || 15000;
    const alive = stockedCount - (totalMortality || 0);
    const survivalRate = alive / stockedCount;

    const harvestWeights = { at5months: 480, at6months: 600, at7months: 700 };
    const result = {};

    for (const [key, weightG] of Object.entries(harvestWeights)) {
      const biomassKg = (alive * weightG) / 1000;
      const grossRevenue = biomassKg * price;
      // Feed cost estimate: ~1.8 FCR × biomass gained × estimated feed price MWK 1,500/kg
      const biomassGainedKg = biomassKg - (alive * 5 / 1000); // from 5g fingerlings
      const feedCostEst = biomassGainedKg * 1.8 * 1500;
      const netProfit = grossRevenue - feedCostEst;
      result[key] = {
        biomassKg: +biomassKg.toFixed(1),
        grossRevenue: +grossRevenue.toFixed(0),
        feedCostEst: +feedCostEst.toFixed(0),
        netProfit: +netProfit.toFixed(0),
        survivalRate: +(survivalRate * 100).toFixed(1),
      };
    }
    return result;
  }

  // ------------------------------------------------------------------
  // FCR, formatMWK, convertCurrency
  // ------------------------------------------------------------------
  function FCR(totalFeedKg, biomassGainedKg) {
    if (!biomassGainedKg || biomassGainedKg <= 0) return null;
    return +(totalFeedKg / biomassGainedKg).toFixed(2);
  }

  function formatMWK(amount) {
    if (!amount && amount !== 0) return '—';
    return 'MWK ' + Math.round(amount).toLocaleString();
  }

  function convertCurrency(mwk, toCurrency) {
    if (!mwk) return 0;
    if (toCurrency === 'USD') return +(mwk / 1780).toFixed(2);
    if (toCurrency === 'ZMW') return +(mwk / 100).toFixed(2);
    return mwk;
  }

  // ------------------------------------------------------------------
  // isWeighDay: returns true if today is a weekly weigh day
  // ------------------------------------------------------------------
  function isWeighDay(stockingDate) {
    if (!stockingDate) return false;
    const daysSinceStocking = Math.floor((Date.now() - new Date(stockingDate)) / (24 * 60 * 60 * 1000));
    return daysSinceStocking % 7 === 0;
  }

  // ------------------------------------------------------------------
  // EXPOSE PUBLIC API
  // ------------------------------------------------------------------
  window.PondGrowth = {
    GROWTH_CURVE,
    GROWTH_PHASES,
    CHICHEWA,
    estimateCurrentWeight,
    getGrowthPhase,
    estimateBiomass,
    calculateFeedToday,
    projectHarvestRevenue,
    FCR,
    formatMWK,
    convertCurrency,
    isWeighDay,
    interpolateGrowthCurve,
  };

})();
