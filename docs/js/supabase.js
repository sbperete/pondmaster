// =============================================================
// PondMaster — Supabase Client & Database Module
// Shared Supabase project with Mandarin Master (pm_ prefix)
// =============================================================
// SECURITY: anon key is safe to expose — access controlled by RLS policies
// =============================================================

(function () {
  'use strict';

  // --- Initialize Client ---
  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    console.error('[PondMaster] Supabase SDK not loaded. CDN script must be in <head> BEFORE this file.');
    window.supabaseClient = null;
    window.PondDB = null;
    return;
  }

  // Read credentials from global CONFIG (config.js loaded before this file)
  const SUPABASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL) || '';
  const SUPABASE_ANON_KEY = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_ANON_KEY) || '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[PondMaster] config.js not loaded or missing SUPABASE_URL / SUPABASE_ANON_KEY');
    window.supabaseClient = null;
    window.PondDB = null;
    return;
  }

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.supabaseClient = client;
  console.log('[PondMaster] Supabase client initialized');

  // =============================================================
  // CACHE HELPERS
  // =============================================================
  const CACHE_TTL = (typeof CONFIG !== 'undefined' && CONFIG.CACHE_TTL_MINUTES) || 15;

  function cacheSet(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(key + '_ts', Date.now().toString());
    } catch (e) { /* storage full — skip cache */ }
  }

  function cacheGet(key) {
    const ts = localStorage.getItem(key + '_ts');
    if (!ts) return null;
    const age = (Date.now() - parseInt(ts)) / 60000;
    if (age > CACHE_TTL) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function cacheInvalidate(key) {
    localStorage.removeItem(key);
    localStorage.removeItem(key + '_ts');
  }

  // =============================================================
  // INDEXEDDB — OFFLINE QUEUE
  // =============================================================
  const DB_NAME = 'pondmaster_offline';
  const DB_VERSION = 1;
  let idb = null;

  function openIDB() {
    return new Promise((resolve, reject) => {
      if (idb) { resolve(idb); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('offline_logs')) {
          db.createObjectStore('offline_logs', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = e => { idb = e.target.result; resolve(idb); };
      req.onerror = () => reject(req.error);
    });
  }

  async function queueOfflineLog(logData) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_logs', 'readwrite');
      tx.objectStore('offline_logs').add({ ...logData, queued_at: new Date().toISOString() });
      tx.oncomplete = () => {
        const count = parseInt(localStorage.getItem('pm_offline_queue_count') || '0') + 1;
        localStorage.setItem('pm_offline_queue_count', count.toString());
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getOfflineQueue() {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_logs', 'readonly');
      const req = tx.objectStore('offline_logs').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function clearQueueItem(id) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_logs', 'readwrite');
      tx.objectStore('offline_logs').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function processSyncQueue() {
    if (!navigator.onLine) return;
    const queue = await getOfflineQueue();
    if (!queue.length) return;

    let synced = 0;
    for (const item of queue) {
      try {
        const { id, queued_at, ...logData } = item;
        const { error } = await client.from('pm_daily_logs').insert(logData);
        if (!error) {
          await clearQueueItem(id);
          synced++;
        }
      } catch (e) { /* keep in queue, retry next time */ }
    }

    if (synced > 0) {
      const remaining = queue.length - synced;
      localStorage.setItem('pm_offline_queue_count', remaining.toString());
      localStorage.setItem('pm_last_sync', Date.now().toString());
      // Notify UI
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SYNC_COMPLETE', count: synced });
      }
    }
    return synced;
  }

  // =============================================================
  // pm_users
  // =============================================================
  async function getProfile(userId) {
    const cacheKey = `pm_user_${userId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const { data, error } = await client
      .from('pm_users')
      .select('id, email, name, farm_name, location, subscription_tier, ai_provider, ai_api_key_encoded, tour_complete, theme_preference, language_preference, pond_limit, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    cacheSet(cacheKey, data);
    return data;
  }

  async function updateProfile(userId, updates) {
    const { data, error } = await client
      .from('pm_users')
      .update(updates)
      .eq('id', userId)
      .select('id, name, farm_name, location, theme_preference, language_preference')
      .single();
    if (error) throw error;
    cacheInvalidate(`pm_user_${userId}`);
    return data;
  }

  async function markTourComplete(userId) {
    await client.from('pm_users').update({ tour_complete: true }).eq('id', userId);
    cacheInvalidate(`pm_user_${userId}`);
  }

  // =============================================================
  // pm_ponds
  // =============================================================
  async function getPonds(userId) {
    const cacheKey = `pm_ponds_${userId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const { data, error } = await client
      .from('pm_ponds')
      .select('id, pond_name, pond_number, status, length_m, width_m, depth_m, volume_m3, liner_type, water_source, aeration_type, worker_token, worker_token_expires_at, created_at')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: true });

    if (error) throw error;
    cacheSet(cacheKey, data);
    return data;
  }

  async function getPond(pondId) {
    const { data, error } = await client
      .from('pm_ponds')
      .select('id, user_id, pond_name, pond_number, status, length_m, width_m, depth_m, volume_m3, liner_type, water_source, aeration_type, worker_token, worker_token_expires_at, created_at')
      .eq('id', pondId)
      .single();
    if (error) throw error;
    return data;
  }

  async function createPond(userId, pondData) {
    // Check pond limit
    const { data: existing } = await client
      .from('pm_ponds')
      .select('id')
      .eq('user_id', userId)
      .neq('status', 'archived')
      .neq('status', 'deleted');

    const profile = await getProfile(userId);
    const limit = profile?.pond_limit || 3;
    if (existing && existing.length >= limit) {
      throw new Error(`Free tier limit: ${limit} ponds. Archive completed ponds to add more.`);
    }

    const { data, error } = await client
      .from('pm_ponds')
      .insert({ ...pondData, user_id: userId })
      .select('id, pond_name, pond_number, status, length_m, width_m, depth_m, volume_m3')
      .single();
    if (error) throw error;
    cacheInvalidate(`pm_ponds_${userId}`);
    return data;
  }

  async function updatePond(pondId, userId, updates) {
    const { data, error } = await client
      .from('pm_ponds')
      .update(updates)
      .eq('id', pondId)
      .select('id, pond_name, status')
      .single();
    if (error) throw error;
    cacheInvalidate(`pm_ponds_${userId}`);
    return data;
  }

  async function archivePond(pondId, userId) {
    return updatePond(pondId, userId, { status: 'archived' });
  }

  async function clonePond(pondId, userId, newName) {
    const source = await getPond(pondId);
    const { id, created_at, worker_token, worker_token_expires_at, ...settings } = source;
    return createPond(userId, {
      ...settings,
      pond_name: newName || `Copy of ${source.pond_name}`,
      status: 'active',
      worker_token: null,
      worker_token_expires_at: null
    });
  }

  async function generateWorkerToken(pondId) {
    const token = 'wt_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client
      .from('pm_ponds')
      .update({ worker_token: token, worker_token_expires_at: expires })
      .eq('id', pondId)
      .select('worker_token, worker_token_expires_at')
      .single();
    if (error) throw error;
    return data;
  }

  async function validateWorkerToken(token) {
    const { data, error } = await client
      .from('pm_ponds')
      .select('id, pond_name, pond_number, length_m, width_m, depth_m, volume_m3, worker_token_expires_at')
      .eq('worker_token', token)
      .single();
    if (error || !data) return null;
    if (new Date(data.worker_token_expires_at) < new Date()) return null;
    return data;
  }

  async function revokeWorkerToken(pondId) {
    await client
      .from('pm_ponds')
      .update({ worker_token: null, worker_token_expires_at: null })
      .eq('id', pondId);
  }

  // =============================================================
  // pm_pond_lots
  // =============================================================
  async function getLots(pondId) {
    const { data, error } = await client
      .from('pm_pond_lots')
      .select('id, pond_id, lot_number, species, stock_type, fingerlings_stocked, stocking_date, target_harvest_date, harvest_month_target, fingerling_source, fingerling_cost_mwk, status, created_at')
      .eq('pond_id', pondId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function getActiveLot(pondId) {
    const { data, error } = await client
      .from('pm_pond_lots')
      .select('id, pond_id, lot_number, species, stock_type, fingerlings_stocked, stocking_date, target_harvest_date, harvest_month_target, status')
      .eq('pond_id', pondId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function createLot(lotData) {
    const { data, error } = await client
      .from('pm_pond_lots')
      .insert(lotData)
      .select('id, pond_id, lot_number, species, fingerlings_stocked, stocking_date, status')
      .single();
    if (error) throw error;
    return data;
  }

  async function closeLot(lotId) {
    const { data, error } = await client
      .from('pm_pond_lots')
      .update({ status: 'harvested' })
      .eq('id', lotId)
      .select('id, status')
      .single();
    if (error) throw error;
    return data;
  }

  // =============================================================
  // pm_daily_logs
  // =============================================================
  async function getLogs(pondId, limit = 30) {
    const cacheKey = `pm_logs_${pondId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const { data, error } = await client
      .from('pm_daily_logs')
      .select('id, log_date, feed_type, feed_amount_kg, feed_cost_mwk, water_temp_c, do_level, ph_level, fish_sampled, avg_weight_g, mortality_count, notes, logged_by, synced_offline')
      .eq('pond_id', pondId)
      .order('log_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    cacheSet(cacheKey, data);
    return data;
  }

  async function createLog(logData) {
    if (!navigator.onLine) {
      await queueOfflineLog(logData);
      return { offline: true };
    }

    const { data, error } = await client
      .from('pm_daily_logs')
      .insert(logData)
      .select('id, log_date, feed_amount_kg, mortality_count')
      .single();
    if (error) throw error;
    cacheInvalidate(`pm_logs_${logData.pond_id}`);
    localStorage.setItem('pm_last_sync', Date.now().toString());
    return data;
  }

  async function getWeeklyFeedTotal(pondId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data, error } = await client
      .from('pm_daily_logs')
      .select('feed_amount_kg, feed_cost_mwk')
      .eq('pond_id', pondId)
      .gte('log_date', sevenDaysAgo);
    if (error) return { feed_kg: 0, cost_mwk: 0 };
    const feed_kg = data.reduce((s, r) => s + (r.feed_amount_kg || 0), 0);
    const cost_mwk = data.reduce((s, r) => s + (r.feed_cost_mwk || 0), 0);
    return { feed_kg, cost_mwk };
  }

  async function getLatestWeight(pondId) {
    const { data } = await client
      .from('pm_daily_logs')
      .select('avg_weight_g, log_date')
      .eq('pond_id', pondId)
      .not('avg_weight_g', 'is', null)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }

  // =============================================================
  // pm_health_events
  // =============================================================
  async function getOpenEvents(pondId) {
    const { data, error } = await client
      .from('pm_health_events')
      .select('id, event_date, event_type, symptoms, severity, treatment_applied, outcome')
      .eq('pond_id', pondId)
      .is('resolved_date', null)
      .order('event_date', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  }

  async function getAllEvents(pondId, limit = 20) {
    const { data, error } = await client
      .from('pm_health_events')
      .select('id, event_date, event_type, symptoms, severity, treatment_applied, outcome, resolved_date')
      .eq('pond_id', pondId)
      .order('event_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  async function createHealthEvent(eventData) {
    const { data, error } = await client
      .from('pm_health_events')
      .insert(eventData)
      .select('id, event_date, event_type, severity')
      .single();
    if (error) throw error;
    return data;
  }

  async function resolveHealthEvent(eventId, outcome) {
    const { data, error } = await client
      .from('pm_health_events')
      .update({ resolved_date: new Date().toISOString().split('T')[0], outcome })
      .eq('id', eventId)
      .select('id, resolved_date')
      .single();
    if (error) throw error;
    return data;
  }

  // =============================================================
  // pm_harvests
  // =============================================================
  async function createHarvest(harvestData) {
    const { data, error } = await client
      .from('pm_harvests')
      .insert(harvestData)
      .select('id, harvest_date, fish_harvested, total_biomass_kg, gross_revenue_mwk')
      .single();
    if (error) throw error;
    return data;
  }

  async function getHarvests(pondId) {
    const { data, error } = await client
      .from('pm_harvests')
      .select('id, harvest_date, fish_harvested, avg_weight_kg, total_biomass_kg, price_per_kg_mwk, gross_revenue_mwk, buyer_name, notes')
      .eq('pond_id', pondId)
      .order('harvest_date', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  }

  // =============================================================
  // pm_ai_conversations
  // =============================================================
  async function getConversation(pondId, lotId) {
    const { data } = await client
      .from('pm_ai_conversations')
      .select('id, messages_json, provider, topic, updated_at')
      .eq('pond_id', pondId)
      .eq('lot_id', lotId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }

  async function saveConversation(pondId, lotId, userId, messages, provider, topic) {
    const existing = await getConversation(pondId, lotId);
    if (existing) {
      await client
        .from('pm_ai_conversations')
        .update({ messages_json: messages, provider, topic, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await client
        .from('pm_ai_conversations')
        .insert({ pond_id: pondId, lot_id: lotId, user_id: userId, messages_json: messages, provider, topic });
    }
  }

  async function listConversations(pondId, limit = 5) {
    const { data } = await client
      .from('pm_ai_conversations')
      .select('id, topic, provider, updated_at')
      .eq('pond_id', pondId)
      .order('updated_at', { ascending: false })
      .limit(limit);
    return data || [];
  }

  // =============================================================
  // pm_pond_invites + pm_pond_members
  // =============================================================
  async function createInvite(pondId, invitedBy, email, role = 'viewer') {
    const { data, error } = await client
      .from('pm_pond_invites')
      .insert({ pond_id: pondId, invited_by: invitedBy, invited_email: email, role })
      .select('id, invited_email, role')
      .single();
    if (error) throw error;
    return data;
  }

  async function getPendingInvites(userEmail) {
    const { data } = await client
      .from('pm_pond_invites')
      .select('id, pond_id, role, invited_by, created_at')
      .eq('invited_email', userEmail)
      .eq('accepted', false)
      .limit(10);
    return data || [];
  }

  async function acceptInvite(inviteId, userId, pondId, role) {
    await client
      .from('pm_pond_invites')
      .update({ accepted: true, accepted_at: new Date().toISOString() })
      .eq('id', inviteId);
    const { error } = await client
      .from('pm_pond_members')
      .upsert({ pond_id: pondId, user_id: userId, role });
    if (error) throw error;
  }

  async function revokeInvite(inviteId) {
    await client.from('pm_pond_invites').delete().eq('id', inviteId);
  }

  async function getMembers(pondId) {
    const { data } = await client
      .from('pm_pond_members')
      .select('id, user_id, role, joined_at')
      .eq('pond_id', pondId)
      .order('joined_at', { ascending: true });
    return data || [];
  }

  async function removeMember(pondId, userId) {
    await client
      .from('pm_pond_members')
      .delete()
      .eq('pond_id', pondId)
      .eq('user_id', userId);
  }

  async function updateMemberRole(pondId, userId, newRole) {
    await client
      .from('pm_pond_members')
      .update({ role: newRole })
      .eq('pond_id', pondId)
      .eq('user_id', userId);
  }

  async function getUserPondRole(pondId, userId) {
    const { data } = await client
      .from('pm_pond_members')
      .select('role')
      .eq('pond_id', pondId)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.role || null;
  }

  // =============================================================
  // EXPOSE PUBLIC API
  // =============================================================
  window.PondDB = {
    // Users
    getProfile, updateProfile, markTourComplete,
    // Ponds
    getPonds, getPond, createPond, updatePond, archivePond, clonePond,
    generateWorkerToken, validateWorkerToken, revokeWorkerToken,
    // Lots
    getLots, getActiveLot, createLot, closeLot,
    // Daily Logs
    getLogs, createLog, getWeeklyFeedTotal, getLatestWeight,
    // Health
    getOpenEvents, getAllEvents, createHealthEvent, resolveHealthEvent,
    // Harvests
    createHarvest, getHarvests,
    // AI
    getConversation, saveConversation, listConversations,
    // Cooperative
    createInvite, getPendingInvites, acceptInvite, revokeInvite,
    getMembers, removeMember, updateMemberRole, getUserPondRole,
    // Offline
    queueOfflineLog, getOfflineQueue, processSyncQueue,
    // Cache
    cacheSet, cacheGet, cacheInvalidate,
  };

})();
