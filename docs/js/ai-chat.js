// PondMaster — AI Chat Module
// Supports: OpenAI (gpt-4o-mini), Claude (claude-sonnet-4-20250514), DeepSeek, Gemini
// BYOK: user provides their own API key, stored encoded in Supabase

(function() {
  'use strict';

  class AIChat {
    constructor() {
      this._pondId = null;
      this._lotId = null;
      this._messages = []; // {role: 'user'|'assistant', content: string}
      this._provider = 'claude';
      this._container = null; // DOM element for chat messages
      this._inputEl = null;
      this._sending = false;

      this.EMERGENCY_KEYWORDS = [
        'gasp', 'gasping', 'dying', 'dead fish', 'mass mortality',
        'emergency', 'urgent', 'all dead', 'floating', 'surface',
        'oxygen', 'suffocating', 'belly up', 'not eating', 'swimming erratic'
      ];
    }

    // ------------------------------------------------------------------
    // INIT — attach to DOM elements
    // ------------------------------------------------------------------
    init(pondId) {
      this._pondId = pondId;
      this._container = document.getElementById('chat-messages');
      this._inputEl = document.getElementById('chat-input');

      // Set provider from localStorage
      const saved = localStorage.getItem('pm_ai_provider');
      if (saved) this._provider = saved;

      // Provider selector
      document.querySelectorAll('[data-provider]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._provider = btn.dataset.provider;
          localStorage.setItem('pm_ai_provider', this._provider);
          document.querySelectorAll('[data-provider]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Activate saved provider button
      document.querySelector(`[data-provider="${this._provider}"]`)?.classList.add('active');

      // Load conversation history
      this._loadHistory();

      // Send button
      document.getElementById('btn-send-chat')?.addEventListener('click', () => this._handleSend());

      // Enter key (Ctrl+Enter for newline)
      this._inputEl?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleSend(); }
      });

      // Quick prompts
      document.querySelectorAll('[data-prompt]').forEach(chip => {
        chip.addEventListener('click', () => {
          if (this._inputEl) this._inputEl.value = chip.dataset.prompt;
          this._handleSend();
        });
      });

      // Voice input
      document.getElementById('btn-voice-chat')?.addEventListener('click', () => this._startVoice());

      // Check API key
      this._checkApiKey();
    }

    // ------------------------------------------------------------------
    // API KEY MANAGEMENT
    // ------------------------------------------------------------------
    _checkApiKey() {
      const key = this._getApiKey();
      const warningEl = document.getElementById('no-api-key-msg');
      const inputEl = document.getElementById('chat-input');
      const sendBtn = document.getElementById('btn-send-chat');
      if (!key) {
        if (warningEl) warningEl.style.display = 'block';
        if (inputEl) inputEl.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
      } else {
        if (warningEl) warningEl.style.display = 'none';
        if (inputEl) inputEl.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
      }
    }

    _getApiKey() {
      const stored = localStorage.getItem(`pm_ai_key_${this._provider}`);
      if (!stored) return null;
      return this._decodeKey(stored);
    }

    // Simple XOR encoding (not encryption — just prevents casual viewing)
    _encodeKey(key, salt = 'pondmaster') {
      let encoded = '';
      for (let i = 0; i < key.length; i++) {
        encoded += String.fromCharCode(key.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
      }
      return btoa(encoded);
    }

    _decodeKey(encoded) {
      try {
        const salt = 'pondmaster';
        const decoded = atob(encoded);
        let key = '';
        for (let i = 0; i < decoded.length; i++) {
          key += String.fromCharCode(decoded.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
        }
        return key;
      } catch (e) { return null; }
    }

    storeApiKey(provider, rawKey) {
      localStorage.setItem(`pm_ai_key_${provider}`, this._encodeKey(rawKey));
      this._checkApiKey();
    }

    // ------------------------------------------------------------------
    // BUILD SYSTEM PROMPT
    // ------------------------------------------------------------------
    async buildSystemPrompt(pondData, lotData, recentLogs, openHealthEvents) {
      const daysInPond = lotData?.stocking_date
        ? Math.floor((Date.now() - new Date(lotData.stocking_date)) / (24 * 60 * 60 * 1000))
        : null;
      const weeksInPond = daysInPond ? Math.floor(daysInPond / 7) : null;
      const phase = weeksInPond !== null && window.PondGrowth
        ? window.PondGrowth.getGrowthPhase(weeksInPond)
        : null;
      const estWeight = lotData && window.PondGrowth
        ? window.PondGrowth.estimateCurrentWeight(lotData.stocking_date, new Date())
        : null;
      const totalMortality = recentLogs?.reduce((s,l) => s + (l.mortality_count||0), 0) || 0;
      const survivalRate = lotData ? (((lotData.fingerlings_stocked - totalMortality) / lotData.fingerlings_stocked) * 100).toFixed(1) : null;
      const weeklyFeed = recentLogs?.slice(0,7).reduce((s,l) => s + (l.feed_amount_kg||0), 0) || 0;
      const lastLog = recentLogs?.[0];

      return `You are PondMaster AI, an expert tilapia aquaculture advisor specialising in pond farming in Southern and Central Africa, particularly Malawi, Zambia, and Zimbabwe.

Your expertise:
- Monosex Nile tilapia (O. niloticus) and Chambo (O. shiranus, O. karongae) pond farming
- Earthen and plastic-lined pond management (black LDPE/HDPE liner)
- Feed management and FCR optimisation
- Disease diagnosis: Ich, Columnaris, Aeromonas, O2 depletion, Trichodina, nutritional deficiency, predators, theft
- Water quality with aeration: DO must stay above 4mg/L. CRITICAL window: 5am–7am
- Stocking: 8 fish/m³ with aeration for first cycle
- Harvest timing (monosex Nile, commercial feed + aeration): Month 5=480g, Month 6=600g, Month 7=700g
- Fingerling sources: LUANAR Bunda Campus Lilongwe, Mwekera Research Station Kitwe Zambia, AquaSpecialists Zimbabwe Harare
- Economics: MWK (~1780 per USD), ZMW, USD conversions. Market price: ~MWK 15,000/kg

CURRENT POND CONTEXT:
POND: ${pondData?.pond_name || 'Unknown'} | ${pondData?.length_m||'?'}×${pondData?.width_m||'?'}×${pondData?.depth_m||'?'}m | ${pondData?.volume_m3?.toFixed(0)||'?'} m³
LINER: ${pondData?.liner_type || 'Not specified'} | AERATION: ${pondData?.aeration_type || 'Not specified'}
LOT: ${lotData?.lot_number || '1'} | SPECIES: ${lotData?.species || 'Not specified'} | TYPE: ${lotData?.stock_type || 'Not specified'}
STOCKED: ${lotData?.fingerlings_stocked?.toLocaleString() || '—'} | DATE: ${lotData?.stocking_date || '—'}
DAYS IN POND: ${daysInPond !== null ? daysInPond : '—'} | PHASE: ${phase?.phase || '—'}
EST WEIGHT: ${estWeight ? Math.round(estWeight)+'g' : '—'} | SURVIVAL: ${survivalRate ? survivalRate+'%' : '—'}
MORTALITY SO FAR: ${totalMortality} fish
FEED THIS WEEK: ${weeklyFeed.toFixed(1)} kg
LAST LOG: ${lastLog?.log_date || 'None'}${lastLog ? ` | Temp: ${lastLog.water_temp_c||'?'}°C | DO: ${lastLog.do_level||'?'}mg/L | pH: ${lastLog.ph_level||'?'}` : ''}
OPEN HEALTH ISSUES: ${openHealthEvents?.length ? openHealthEvents.map(e => e.event_type+' ('+e.severity+')').join(', ') : 'None'}

RESPONSE RULES:
1. Always give specific quantities, dosages, and timelines
2. EMERGENCY detected: Lead with "IMMEDIATE ACTIONS:" numbered list FIRST, then explanation
3. Reference MWK pricing and SADC suppliers when relevant
4. Worker schedules: simple, morning/evening format, include Chichewa translation
5. Short paragraphs and bullet points (mobile reading)
6. Proactively flag risks in pond data if relevant`;
    }

    // ------------------------------------------------------------------
    // DETECT EMERGENCY
    // ------------------------------------------------------------------
    detectEmergency(message) {
      const lower = message.toLowerCase();
      return this.EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
    }

    // ------------------------------------------------------------------
    // SEND MESSAGE TO PROVIDER
    // ------------------------------------------------------------------
    async sendMessage(provider, apiKey, messages, systemPrompt) {
      const providerConfigs = {
        openai: {
          url: 'https://api.openai.com/v1/chat/completions',
          buildBody: () => ({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            max_tokens: 1000,
          }),
          buildHeaders: () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }),
          extractText: (data) => data.choices?.[0]?.message?.content || '',
        },
        claude: {
          url: 'https://api.anthropic.com/v1/messages',
          buildBody: () => ({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages,
          }),
          buildHeaders: () => ({ 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }),
          extractText: (data) => data.content?.[0]?.text || '',
        },
        deepseek: {
          url: 'https://api.deepseek.com/v1/chat/completions',
          buildBody: () => ({
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            max_tokens: 1000,
          }),
          buildHeaders: () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }),
          extractText: (data) => data.choices?.[0]?.message?.content || '',
        },
        gemini: {
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          buildBody: () => ({
            contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            systemInstruction: { parts: [{ text: systemPrompt }] },
          }),
          buildHeaders: () => ({ 'Content-Type': 'application/json' }),
          extractText: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        },
      };

      const config = providerConfigs[provider];
      if (!config) throw new Error(`Unknown provider: ${provider}`);

      const res = await fetch(config.url, {
        method: 'POST',
        headers: config.buildHeaders(),
        body: JSON.stringify(config.buildBody()),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || err?.message || `HTTP ${res.status}`;
        throw new Error(`${provider} API error: ${msg}`);
      }

      const data = await res.json();
      return config.extractText(data);
    }

    // ------------------------------------------------------------------
    // RENDER MARKDOWN (simple subset)
    // ------------------------------------------------------------------
    renderMarkdown(text) {
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^\* (.*$)/gm, '<li>$1</li>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    }

    // ------------------------------------------------------------------
    // HANDLE SEND
    // ------------------------------------------------------------------
    async _handleSend() {
      if (this._sending || !this._inputEl) return;
      const text = this._inputEl.value.trim();
      if (!text) return;

      const apiKey = this._getApiKey();
      if (!apiKey) {
        window.PondApp?.showToast('Add your API key in Settings first', 'warning');
        return;
      }

      this._inputEl.value = '';
      this._sending = true;
      document.getElementById('btn-send-chat').disabled = true;

      this._appendMessage('user', text);
      this._messages.push({ role: 'user', content: text });

      const typingEl = this._showTyping();

      try {
        // Load context
        const [pondData, lotData, recentLogs, openHealth] = await Promise.all([
          window.PondDB?.getPond(this._pondId),
          window.PondDB?.getActiveLot(this._pondId),
          window.PondDB?.getLogs(this._pondId, 7),
          window.PondDB?.getOpenEvents(this._pondId),
        ]);

        const systemPrompt = await this.buildSystemPrompt(pondData, lotData, recentLogs, openHealth);
        const response = await this.sendMessage(this._provider, apiKey, this._messages, systemPrompt);

        typingEl?.remove();
        this._appendMessage('assistant', response);
        this._messages.push({ role: 'assistant', content: response });

        // Save to Supabase
        const userId = (await window.supabaseClient?.auth.getUser())?.data?.user?.id;
        if (userId && window.PondDB) {
          window.PondDB.saveConversation(this._pondId, this._lotId, userId, this._messages, this._provider, text.slice(0,100));
        }

      } catch (err) {
        typingEl?.remove();
        this._appendMessage('assistant', `⚠️ Error: ${err.message}`);
      } finally {
        this._sending = false;
        document.getElementById('btn-send-chat').disabled = false;
        // 2-second cooldown per spec
        setTimeout(() => { document.getElementById('btn-send-chat').disabled = false; }, 2000);
      }
    }

    _appendMessage(role, content) {
      if (!this._container) return;
      const div = document.createElement('div');
      div.className = `chat-bubble chat-${role}`;
      div.innerHTML = role === 'assistant' ? this.renderMarkdown(content) : content.replace(/</g,'&lt;');
      this._container.appendChild(div);
      this._container.scrollTop = this._container.scrollHeight;
    }

    _showTyping() {
      if (!this._container) return null;
      const div = document.createElement('div');
      div.className = 'chat-bubble chat-assistant chat-typing';
      div.innerHTML = '<span></span><span></span><span></span>';
      this._container.appendChild(div);
      this._container.scrollTop = this._container.scrollHeight;
      return div;
    }

    async _loadHistory() {
      try {
        const lot = await window.PondDB?.getActiveLot(this._pondId);
        this._lotId = lot?.id;
        const conv = await window.PondDB?.getConversation(this._pondId, this._lotId);
        if (conv?.messages_json?.length) {
          this._messages = conv.messages_json;
          this._messages.forEach(m => this._appendMessage(m.role, m.content));
        }
      } catch (e) { /* no history yet */ }
    }

    clearConversation() {
      this._messages = [];
      if (this._container) this._container.innerHTML = '';
    }

    _startVoice() {
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        window.PondApp?.showToast('Voice input not supported on this browser', 'warning');
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.onresult = e => {
        if (this._inputEl) this._inputEl.value = e.results[0][0].transcript;
      };
      recognition.start();
    }

    // Test API key connection
    async testConnection(provider, rawKey) {
      const testMessages = [{ role: 'user', content: 'Reply with just "OK"' }];
      const testPrompt = 'You are a test assistant. Reply with just "OK".';
      try {
        const response = await this.sendMessage(provider, rawKey, testMessages, testPrompt);
        return { success: true, response };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  }

  window.PondAI = new AIChat();

})();
