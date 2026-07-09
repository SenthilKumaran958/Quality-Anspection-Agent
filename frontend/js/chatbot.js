/**
 * chatbot.js — Floating AI Chatbot Widget
 * Injected on all pages via <script src="js/chatbot.js"></script>
 * Requires: api.js (for apiFetch and auth token)
 */

(function () {
  'use strict';

  // ── Conversation state ──────────────────────────────────────────────────────
  let conversationHistory = [];
  let isOpen = false;

  const QUICK_REPLIES = [
    "How many inspections failed?",
    "What does 'Critical' severity mean?",
    "Explain rust vs corrosion",
    "What's the pass rate today?",
    "What are common defect types?"
  ];

  // ── Inject CSS ──────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* ── Chatbot Toggle Button ── */
    #qai-chatbot-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(37,99,235,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #qai-chatbot-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 32px rgba(37,99,235,0.55);
    }
    #qai-chatbot-btn svg { pointer-events: none; }

    /* Badge for unread messages */
    #qai-chatbot-badge {
      position: absolute;
      top: 2px; right: 2px;
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #ef4444;
      font-size: 10px;
      color: #fff;
      display: none;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }

    /* ── Chat Panel ── */
    #qai-chatbot-panel {
      position: fixed;
      bottom: 100px;
      right: 28px;
      width: 380px;
      max-height: 580px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(37,99,235,0.12);
      display: flex;
      flex-direction: column;
      z-index: 9998;
      overflow: hidden;
      transform: translateY(20px) scale(0.95);
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    #qai-chatbot-panel.open {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: all;
    }

    /* Header */
    #qai-chat-header {
      background: linear-gradient(135deg, #0f172a, #1e3a5f);
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    #qai-chat-header .avatar {
      width: 38px; height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    #qai-chat-header .info { flex: 1; min-width: 0; }
    #qai-chat-header .name { color: #fff; font-weight: 700; font-size: 14px; }
    #qai-chat-header .status {
      color: #4ade80; font-size: 11px; display: flex; align-items: center; gap: 4px;
    }
    #qai-chat-header .status::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%; background: #4ade80;
    }
    #qai-chat-close {
      background: rgba(255,255,255,0.1);
      border: none; cursor: pointer;
      width: 30px; height: 30px; border-radius: 50%;
      color: #fff; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    #qai-chat-close:hover { background: rgba(255,255,255,0.2); }

    /* Messages area */
    #qai-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
      min-height: 0;
    }
    #qai-chat-messages::-webkit-scrollbar { width: 4px; }
    #qai-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #qai-chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

    /* Bubbles */
    .qai-msg {
      display: flex;
      gap: 8px;
      animation: qai-fadeIn 0.2s ease;
    }
    @keyframes qai-fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .qai-msg.user { flex-direction: row-reverse; }
    .qai-msg .bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13.5px;
      line-height: 1.55;
      word-break: break-word;
    }
    .qai-msg.user .bubble {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .qai-msg.bot .bubble {
      background: #fff;
      color: #1e293b;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    }
    .qai-msg .bot-avatar {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    /* Typing indicator */
    #qai-typing {
      display: none;
      gap: 8px;
      align-items: center;
    }
    #qai-typing .bot-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      font-size: 13px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #qai-typing .dots {
      background: #fff;
      border-radius: 16px;
      padding: 10px 14px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
      display: flex; gap: 4px; align-items: center;
    }
    #qai-typing .dot {
      width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;
      animation: qai-bounce 1.2s infinite;
    }
    #qai-typing .dot:nth-child(2) { animation-delay: 0.2s; }
    #qai-typing .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes qai-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    /* Quick replies */
    #qai-quick-replies {
      padding: 8px 16px 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .qai-quick-btn {
      padding: 5px 11px;
      border-radius: 100px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #2563eb;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .qai-quick-btn:hover {
      background: #2563eb;
      color: #fff;
      border-color: #2563eb;
    }

    /* Input area */
    #qai-chat-input-area {
      padding: 12px 16px;
      background: #fff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 10px;
      align-items: flex-end;
      flex-shrink: 0;
    }
    #qai-chat-input {
      flex: 1;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13.5px;
      font-family: inherit;
      resize: none;
      outline: none;
      min-height: 42px;
      max-height: 100px;
      line-height: 1.45;
      color: #1e293b;
      transition: border-color 0.2s;
    }
    #qai-chat-input:focus { border-color: #2563eb; }
    #qai-send-btn {
      width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s, opacity 0.15s;
      color: #fff;
    }
    #qai-send-btn:hover { transform: scale(1.08); }
    #qai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    @media (max-width: 480px) {
      #qai-chatbot-panel { width: calc(100vw - 32px); right: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ── Inject HTML ─────────────────────────────────────────────────────────────
  const container = document.createElement('div');
  container.id = 'qai-chatbot-root';
  container.innerHTML = `
    <!-- Toggle Button -->
    <button id="qai-chatbot-btn" title="AI Quality Assistant" aria-label="Open AI Chatbot">
      <span id="qai-chatbot-badge"></span>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <circle cx="9" cy="10" r="1" fill="#fff" stroke="none"/>
        <circle cx="12" cy="10" r="1" fill="#fff" stroke="none"/>
        <circle cx="15" cy="10" r="1" fill="#fff" stroke="none"/>
      </svg>
    </button>

    <!-- Chat Panel -->
    <div id="qai-chatbot-panel" role="dialog" aria-label="AI Quality Assistant Chat">
      <!-- Header -->
      <div id="qai-chat-header">
        <div class="avatar">🔬</div>
        <div class="info">
          <div class="name">Quality AI Assistant</div>
          <div class="status">Online · Powered by Gemini</div>
        </div>
        <button id="qai-chat-close" aria-label="Close chat">✕</button>
      </div>

      <!-- Messages -->
      <div id="qai-chat-messages" role="log" aria-live="polite">
        <div class="qai-msg bot" id="qai-welcome-msg">
          <div class="bot-avatar">🔬</div>
          <div class="bubble">
            👋 Hi! I'm your <strong>Quality AI Assistant</strong>.<br><br>
            Ask me about defects, inspection results, severity levels, or quality control practices. I can also check your <strong>live inspection data</strong>!
          </div>
        </div>
        <div id="qai-typing" class="qai-msg bot">
          <div class="bot-avatar">🔬</div>
          <div class="dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      </div>

      <!-- Quick Replies -->
      <div id="qai-quick-replies"></div>

      <!-- Input -->
      <div id="qai-chat-input-area">
        <textarea
          id="qai-chat-input"
          placeholder="Ask me anything about quality inspection..."
          rows="1"
          aria-label="Chat message input"
        ></textarea>
        <button id="qai-send-btn" aria-label="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const panel        = document.getElementById('qai-chatbot-panel');
  const toggleBtn    = document.getElementById('qai-chatbot-btn');
  const closeBtn     = document.getElementById('qai-chat-close');
  const messagesEl   = document.getElementById('qai-chat-messages');
  const typingEl     = document.getElementById('qai-typing');
  const inputEl      = document.getElementById('qai-chat-input');
  const sendBtn      = document.getElementById('qai-send-btn');
  const quickEl      = document.getElementById('qai-quick-replies');
  const badge        = document.getElementById('qai-chatbot-badge');

  // ── Render quick replies ─────────────────────────────────────────────────────
  QUICK_REPLIES.forEach(text => {
    const btn = document.createElement('button');
    btn.className = 'qai-quick-btn';
    btn.textContent = text;
    btn.onclick = () => sendMessage(text);
    quickEl.appendChild(btn);
  });

  // ── Toggle panel ─────────────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    badge.style.display = 'none';
    setTimeout(() => inputEl.focus(), 300);
    scrollToBottom();
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
  }

  toggleBtn.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);

  // ── Add message bubble ────────────────────────────────────────────────────────
  function addMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `qai-msg ${role === 'user' ? 'user' : 'bot'}`;

    if (role === 'bot') {
      msgDiv.innerHTML = `
        <div class="bot-avatar">🔬</div>
        <div class="bubble">${formatMessage(text)}</div>
      `;
    } else {
      msgDiv.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    }

    // Insert before typing indicator
    messagesEl.insertBefore(msgDiv, typingEl);
    scrollToBottom();

    if (role === 'bot' && !isOpen) {
      badge.style.display = 'flex';
      badge.textContent = '!';
    }
  }

  function formatMessage(text) {
    // Convert markdown-like **bold**, newlines, and bullet points to HTML
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/^- /gm, '• ');
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function setTyping(visible) {
    typingEl.style.display = visible ? 'flex' : 'none';
    sendBtn.disabled = visible;
    if (visible) scrollToBottom();
  }

  // ── Send message ──────────────────────────────────────────────────────────────
  async function sendMessage(text) {
    const message = (text || inputEl.value).trim();
    if (!message) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';
    addMessage('user', message);
    setTyping(true);

    // Store in history
    conversationHistory.push({ role: 'user', content: message });

    try {
      const token = localStorage.getItem('token');
      const url = `${typeof API_BASE !== 'undefined' ? API_BASE : '/api'}/chatbot`;
      console.log('[Chatbot DEBUG] Sending to URL:', url);
      console.log('[Chatbot DEBUG] Token present:', !!token);
      console.log('[Chatbot DEBUG] Message:', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ message, conversationHistory })
      });

      console.log('[Chatbot DEBUG] HTTP Status:', response.status, response.statusText);
      const rawText = await response.text();
      console.log('[Chatbot DEBUG] Raw response body:', rawText);

      let data;
      try { data = JSON.parse(rawText); } catch(e) { data = {}; }

      console.log('[Chatbot DEBUG] Parsed data:', JSON.stringify(data));

      if (!response.ok) {
        if (response.status === 401) {
          setTyping(false);
          addMessage('bot', `⚠️ Your session has expired. Please <a href="/login.html">log in again</a> to use the chatbot.`);
          // Optionally auto-logout:
          // localStorage.removeItem('token');
          // window.location.href = 'login.html';
          return;
        }
        const errDetail = data.message || data.error || rawText || response.statusText;
        setTyping(false);
        addMessage('bot', `⚠️ ERROR — HTTP ${response.status}: ${errDetail}`);
        return;
      }

      const reply = data.reply || `DEBUG: reply field missing. Full response: ${JSON.stringify(data)}`;

      conversationHistory.push({ role: 'assistant', content: reply });
      if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);

      setTyping(false);
      addMessage('bot', reply);

    } catch (err) {
      console.error('[Chatbot] Fetch-level error:', err);
      setTyping(false);
      addMessage('bot', `⚠️ DEBUG NETWORK ERROR: ${err.message}`);
    }

  }

  // ── Input handlers ────────────────────────────────────────────────────────────
  sendBtn.addEventListener('click', () => sendMessage());

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

})();
