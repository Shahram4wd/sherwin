/**
 * Sherwin Universe — Voice AI Assistant
 *
 * Generic voice-enabled assistant that works with any mini-app.
 * Uses Web Speech API for voice I/O and calls a Django backend
 * for LLM-powered responses.
 *
 * Features:
 *   - Voice input via SpeechRecognition
 *   - Voice output via SpeechSynthesis
 *   - Text fallback for unsupported browsers
 *   - Receives mini-app context via getStateFn callback
 *   - Chat history maintained in-session
 */

export class VoiceAssistant {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.container     The mini-app container to attach UI to
   * @param {string}      opts.appSlug       Mini-app identifier for backend context
   * @param {string}      opts.apiUrl        Django endpoint URL
   * @param {Function}    opts.getStateFn    Returns current app state object
   * @param {string}      opts.csrfToken     Django CSRF token
   */
  constructor(opts) {
    this.container = opts.container;
    this.appSlug = opts.appSlug;
    this.apiUrl = opts.apiUrl;
    this.getStateFn = opts.getStateFn || (() => ({}));
    this.csrfToken = opts.csrfToken || this._getCsrfFromCookie();
    this.messages = [];
    this.isOpen = false;
    this.isListening = false;
    this.isSpeaking = false;

    this._initSpeech();
    this._buildUI();
  }

  _getCsrfFromCookie() {
    const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  /* ---- Speech API setup ----------------------------------------- */

  _initSpeech() {
    // Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this._onVoiceInput(transcript);
      };
      this.recognition.onerror = () => {
        this._stopListening();
      };
      this.recognition.onend = () => {
        this._stopListening();
      };
    }

    // Speech Synthesis
    this.synth = window.speechSynthesis || null;
  }

  /* ---- UI ------------------------------------------------------- */

  _buildUI() {
    // Floating button
    this.fab = document.createElement('button');
    this.fab.className = 'miniapp-ai-fab';
    this.fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 18.5A2.5 2.5 0 0 1 9.5 16V8a2.5 2.5 0 0 1 5 0v8a2.5 2.5 0 0 1-2.5 2.5Z"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
        <line x1="12" y1="22" x2="12" y2="18.5"/>
      </svg>
      Ask AI Assistant
    `;
    this.fab.addEventListener('click', () => this.toggle());
    this.container.appendChild(this.fab);

    // Chat panel
    this.panel = document.createElement('div');
    this.panel.className = 'miniapp-ai-panel';
    this.panel.style.display = 'none';
    this.panel.innerHTML = `
      <div class="miniapp-ai-header">
        <span>🧠 AI Lab Assistant</span>
        <button class="miniapp-ai-close">&times;</button>
      </div>
      <div class="miniapp-ai-messages"></div>
      <div class="miniapp-ai-input-row">
        <button class="miniapp-ai-voice-btn" title="Hold to speak">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 18.5A2.5 2.5 0 0 1 9.5 16V8a2.5 2.5 0 0 1 5 0v8a2.5 2.5 0 0 1-2.5 2.5Z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
          </svg>
        </button>
        <input class="miniapp-ai-input" type="text" placeholder="Ask about this simulation...">
        <button class="miniapp-ai-send-btn" title="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    `;
    this.container.appendChild(this.panel);

    // Wire events
    this.panel.querySelector('.miniapp-ai-close').addEventListener('click', () => this.close());
    this.msgContainer = this.panel.querySelector('.miniapp-ai-messages');
    this.input = this.panel.querySelector('.miniapp-ai-input');
    this.voiceBtn = this.panel.querySelector('.miniapp-ai-voice-btn');
    this.sendBtn = this.panel.querySelector('.miniapp-ai-send-btn');

    this.sendBtn.addEventListener('click', () => this._sendText());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._sendText();
    });

    // Voice button: click to toggle
    this.voiceBtn.addEventListener('click', () => {
      if (this.isListening) this._stopListening();
      else this._startListening();
    });

    // Welcome message
    this._addMessage('assistant', "Hi! I'm your AI lab assistant. Ask me anything about this simulation — what the nucleus is doing, what decay means, or how to interact. You can type or tap the mic to talk!");
  }

  /* ---- Open / Close --------------------------------------------- */

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.panel.style.display = 'flex';
    this.fab.style.display = 'none';
    this.input.focus();
  }

  close() {
    this.isOpen = false;
    this.panel.style.display = 'none';
    this.fab.style.display = 'flex';
    this._stopListening();
    if (this.synth) this.synth.cancel();
  }

  /* ---- Voice I/O ------------------------------------------------ */

  _startListening() {
    if (!this.recognition) {
      this._addMessage('assistant', "Sorry, your browser doesn't support voice input. Please type instead.");
      return;
    }
    this.isListening = true;
    this.voiceBtn.classList.add('recording');
    this.recognition.start();
  }

  _stopListening() {
    this.isListening = false;
    this.voiceBtn.classList.remove('recording');
    try { this.recognition?.stop(); } catch { /* already stopped */ }
  }

  _onVoiceInput(transcript) {
    this._stopListening();
    this.input.value = transcript;
    this._sendText();
  }

  _speak(text) {
    if (!this.synth) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    // Prefer a natural-sounding voice
    const voices = this.synth.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
                   || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    this.synth.speak(utterance);
  }

  /* ---- Message handling ----------------------------------------- */

  _addMessage(role, text) {
    this.messages.push({ role, content: text });
    const div = document.createElement('div');
    div.className = `miniapp-ai-msg miniapp-ai-msg--${role}`;
    div.textContent = text;
    this.msgContainer.appendChild(div);
    this.msgContainer.scrollTop = this.msgContainer.scrollHeight;
    return div;
  }

  async _sendText() {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';

    this._addMessage('user', text);
    const thinkingEl = this._addMessage('assistant', '...');
    thinkingEl.classList.add('miniapp-ai-msg--thinking');

    try {
      const state = this.getStateFn();
      const resp = await fetch(this.apiUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(this.csrfToken ? { 'X-CSRFToken': this.csrfToken } : {}),
        },
        body: JSON.stringify({
          message: text,
          app_slug: this.appSlug,
          app_state: state,
          history: this.messages.slice(-10), // last 10 messages for context
        }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const reply = data.reply || "I'm not sure how to answer that. Try asking about the nucleus or decay!";

      thinkingEl.textContent = reply;
      thinkingEl.classList.remove('miniapp-ai-msg--thinking');
      this.messages[this.messages.length - 1].content = reply;

      // Speak the response
      this._speak(reply);
    } catch {
      thinkingEl.textContent = "Sorry, I couldn't reach the AI service. Please try again.";
      thinkingEl.classList.remove('miniapp-ai-msg--thinking');
    }
  }
}
