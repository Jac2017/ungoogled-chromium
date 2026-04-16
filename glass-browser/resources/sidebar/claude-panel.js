/**
 * Glass Browser — Claude AI Panel Controller
 *
 * Provides:
 *   - Chat interface with Claude (Anthropic API integration)
 *   - Automatic tab organization into topic-based groups
 *   - Page summarization
 *   - Tab comparison (e.g., product comparison across tabs)
 *   - Deep research mode
 *
 * Security:
 *   - API keys stored in chrome.storage.local, never exposed to page context
 *   - All DOM insertions use textContent or sanitized HTML
 *   - Messages are sandboxed within the side panel context
 *   - No eval() or Function() constructors
 */

'use strict';

/* ==========================================================================
   Utilities
   ========================================================================== */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

/* ==========================================================================
   Claude Panel Controller
   ========================================================================== */
const ClaudePanelController = {
  messages: [],
  isOpen: false,
  isTyping: false,

  init() {
    this.setupToggle();
    this.setupInput();
    this.setupQuickActions();
    this.setupOrganize();
  },

  /* ---------- Panel Toggle ---------- */

  setupToggle() {
    const panel = document.getElementById('claude-panel');
    const closeBtn = document.getElementById('claude-close-btn');

    closeBtn.addEventListener('click', () => this.close());

    // Listen for toggle event from vertical tabs sidebar
    window.addEventListener('glass:toggle-claude-panel', () => {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    });

    // Keyboard shortcut: Cmd/Ctrl + Shift + C
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        if (this.isOpen) this.close();
        else this.open();
      }
    });
  },

  open() {
    const panel = document.getElementById('claude-panel');
    panel.classList.remove('hidden');
    this.isOpen = true;
    document.getElementById('claude-input').focus();
  },

  close() {
    const panel = document.getElementById('claude-panel');
    panel.classList.add('hidden');
    this.isOpen = false;
  },

  /* ---------- Message Input ---------- */

  setupInput() {
    const input = document.getElementById('claude-input');
    const sendBtn = document.getElementById('claude-send-btn');

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Send on Enter (Shift+Enter for newline)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    sendBtn.addEventListener('click', () => this.sendMessage());
  },

  sendMessage() {
    const input = document.getElementById('claude-input');
    const text = input.value.trim();
    if (!text || this.isTyping) return;

    // Add user message
    this.addMessage('user', text);
    input.value = '';
    input.style.height = 'auto';

    // Process with Claude
    this.processMessage(text);
  },

  addMessage(role, content) {
    const messagesContainer = document.getElementById('claude-messages');

    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';

    if (role === 'assistant') {
      // Parse simple markdown-like formatting
      contentEl.innerHTML = this.formatResponse(content);
    } else {
      const p = document.createElement('p');
      p.textContent = content;
      contentEl.appendChild(p);
    }

    messageEl.appendChild(contentEl);
    messagesContainer.appendChild(messageEl);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    this.messages.push({ role, content });
  },

  formatResponse(text) {
    // Simple markdown-to-HTML for assistant responses
    // Security: we control this content (it comes from our API), but still escape
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/^- (.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  },

  showTyping() {
    this.isTyping = true;
    const messagesContainer = document.getElementById('claude-messages');

    const indicator = document.createElement('div');
    indicator.className = 'message assistant';
    indicator.id = 'typing-indicator';

    const dots = document.createElement('div');
    dots.className = 'typing-indicator';
    dots.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

    indicator.appendChild(dots);
    messagesContainer.appendChild(indicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  hideTyping() {
    this.isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  },

  /* ---------- Message Processing ---------- */

  async processMessage(text) {
    this.showTyping();

    // Simulate API call delay
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const lowerText = text.toLowerCase();
    let response;

    if (lowerText.includes('organize') || lowerText.includes('group') || lowerText.includes('sort tabs')) {
      response = this.handleOrganizeRequest();
    } else if (lowerText.includes('summarize') || lowerText.includes('summary')) {
      response = this.handleSummarizeRequest();
    } else if (lowerText.includes('compare')) {
      response = this.handleCompareRequest();
    } else if (lowerText.includes('research') || lowerText.includes('find') || lowerText.includes('search')) {
      response = this.handleResearchRequest(text);
    } else {
      response = this.handleGeneralQuery(text);
    }

    this.hideTyping();
    this.addMessage('assistant', response);
  },

  handleOrganizeRequest() {
    // Show tab organization preview
    this.showTabOrganizationPreview();
    return "I've analyzed your open tabs and organized them into topic groups. You can see the suggested organization below. Click **Apply** to reorganize your tabs, or **Dismiss** to keep the current arrangement.";
  },

  handleSummarizeRequest() {
    return "**Page Summary**\n\nI've analyzed the current tab's content. Here are the key points:\n\n- The page discusses the latest developments in browser technology\n- Key topics include performance optimization and privacy features\n- There are 3 main sections covering architecture, security, and user experience\n\nWould you like me to go deeper into any of these topics?";
  },

  handleCompareRequest() {
    return "**Tab Comparison**\n\nI found 3 tabs that appear to be comparing similar items:\n\n- **Nike Pegasus 43** — $129.99 — 4.5 stars — Lightweight daily trainer\n- **ASICS Gel Kayano 32** — $159.99 — 4.7 stars — Stability support\n- **Runner's World Best Of** — Comprehensive review of 15 shoes\n\nThe ASICS Gel Kayano offers the best stability support, while the Nike Pegasus is better for speed work. Would you like a detailed feature-by-feature comparison?";
  },

  handleResearchRequest(query) {
    return `**Research Results**\n\nBased on your query, I've gathered information from your open tabs and browsing context:\n\n- Found 5 relevant sources across your tabs\n- Key findings align with your recent browsing patterns\n- I can compile a detailed summary if needed\n\nWould you like me to create a research brief on this topic?`;
  },

  handleGeneralQuery(text) {
    return `I understand you're asking about "${sanitizeText(text)}". Let me help with that.\n\nBased on your current browsing context, here's what I can tell you:\n\n- I can see you have tabs related to several topics\n- I can provide more specific help if you use one of the quick actions above\n- Feel free to ask me anything about your browsing session\n\nWhat would you like to explore further?`;
  },

  /* ---------- Quick Actions ---------- */

  setupQuickActions() {
    document.querySelectorAll('.quick-action-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const action = chip.dataset.action;
        switch (action) {
          case 'organize':
            this.addMessage('user', 'Organize my tabs into groups');
            this.processMessage('organize tabs');
            break;
          case 'summarize':
            this.addMessage('user', 'Summarize the current page');
            this.processMessage('summarize this page');
            break;
          case 'compare':
            this.addMessage('user', 'Compare items across my tabs');
            this.processMessage('compare tabs');
            break;
          case 'research':
            this.addMessage('user', 'Research this topic deeper');
            this.processMessage('deep research');
            break;
        }
      });
    });
  },

  /* ---------- Tab Organization ---------- */

  setupOrganize() {
    const organizeBtn = document.getElementById('claude-organize-btn');
    const applyBtn = document.getElementById('tab-preview-apply');
    const dismissBtn = document.getElementById('tab-preview-dismiss');

    organizeBtn.addEventListener('click', () => {
      this.showTabOrganizationPreview();
    });

    applyBtn.addEventListener('click', () => {
      this.applyTabOrganization();
    });

    dismissBtn.addEventListener('click', () => {
      document.getElementById('claude-tab-preview').style.display = 'none';
    });
  },

  showTabOrganizationPreview() {
    const preview = document.getElementById('claude-tab-preview');
    const groupsContainer = document.getElementById('tab-preview-groups');
    groupsContainer.innerHTML = '';

    // Simulated Claude-organized groups
    const suggestedGroups = [
      {
        name: 'Las Vegas Trip Planning',
        color: '#64D2FF',
        tabs: ['Best Hotels in Las Vegas 2026', 'Las Vegas Show Tickets', 'Flights to Las Vegas'],
      },
      {
        name: 'Chromium News',
        color: '#30D158',
        tabs: ['Chromium Blog - Latest Updates', 'ungoogled-chromium - GitHub'],
      },
      {
        name: 'Running Shoes Shopping',
        color: '#FF9F0A',
        tabs: ['Nike Pegasus 43 Review', 'Best Running Shoes 2026', 'ASICS Gel Kayano 32 - Amazon'],
      },
      {
        name: 'Entertainment',
        color: '#BF5AF2',
        tabs: ['YouTube - Home', 'Reddit - r/programming'],
      },
    ];

    suggestedGroups.forEach((group) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'preview-group';

      const nameEl = document.createElement('div');
      nameEl.className = 'preview-group-name';

      const dot = document.createElement('span');
      dot.className = 'preview-group-dot';
      dot.style.background = group.color;

      nameEl.appendChild(dot);
      nameEl.appendChild(document.createTextNode(group.name));
      groupEl.appendChild(nameEl);

      group.tabs.forEach((tabTitle) => {
        const tabEl = document.createElement('div');
        tabEl.className = 'preview-tab';
        tabEl.textContent = tabTitle;
        groupEl.appendChild(tabEl);
      });

      groupsContainer.appendChild(groupEl);
    });

    preview.style.display = 'block';
  },

  applyTabOrganization() {
    // In production: use chrome.tabs and chrome.tabGroups APIs to apply
    // the Claude-suggested organization
    document.getElementById('claude-tab-preview').style.display = 'none';

    // Dispatch event to vertical tabs controller
    window.dispatchEvent(new CustomEvent('glass:apply-tab-groups', {
      detail: {
        groups: [
          { name: 'Las Vegas Trip Planning', color: '#64D2FF' },
          { name: 'Chromium News', color: '#30D158' },
          { name: 'Running Shoes Shopping', color: '#FF9F0A' },
          { name: 'Entertainment', color: '#BF5AF2' },
        ],
      },
    }));

    this.addMessage('assistant', 'Done! I\'ve organized your tabs into 4 groups:\n\n- **Las Vegas Trip Planning** (3 tabs)\n- **Chromium News** (2 tabs)\n- **Running Shoes Shopping** (3 tabs)\n- **Entertainment** (2 tabs)\n\nYou can see the groups in your sidebar. Feel free to drag tabs between groups or ask me to re-organize anytime.');
  },

  /**
   * Production API Integration
   *
   * In a production build, this method calls the Anthropic API:
   *
   *   const response = await fetch('https://api.anthropic.com/v1/messages', {
   *     method: 'POST',
   *     headers: {
   *       'Content-Type': 'application/json',
   *       'x-api-key': apiKey,
   *       'anthropic-version': '2023-06-01',
   *     },
   *     body: JSON.stringify({
   *       model: 'claude-sonnet-4-20250514',
   *       max_tokens: 1024,
   *       system: 'You are Claude, an AI assistant integrated into Glass Browser...',
   *       messages: this.messages,
   *     }),
   *   });
   *
   * The API key is stored securely in chrome.storage.local and retrieved
   * via the background service worker, never exposed to page context.
   */
};

/* ==========================================================================
   Initialize
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  ClaudePanelController.init();
});
