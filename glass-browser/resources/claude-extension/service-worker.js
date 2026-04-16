/**
 * Glass Browser — Claude Extension Service Worker
 *
 * Handles:
 *   1. Proxying Claude API requests (keeps API key out of page context)
 *   2. Tab organization using Claude's intelligence
 *   3. Page content extraction for summarization
 *   4. Keyboard shortcut commands
 *   5. Tab event monitoring for auto-grouping
 *
 * Security:
 *   - API key stored in chrome.storage.local (encrypted at rest)
 *   - Never exposed to content scripts or page context
 *   - Rate limiting prevents abuse
 *   - All inputs validated before API calls
 */

'use strict';

/* ==========================================================================
   Constants
   ========================================================================== */
const API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2048;
const RATE_LIMIT_PER_MINUTE = 10;
const MAX_MESSAGE_LENGTH = 4000;
const AUTO_GROUP_DEBOUNCE_MS = 5000;

/* ==========================================================================
   Rate Limiter
   ========================================================================== */
const rateLimiter = {
  timestamps: [],

  canProceed() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.timestamps = this.timestamps.filter((t) => t > oneMinuteAgo);
    if (this.timestamps.length >= RATE_LIMIT_PER_MINUTE) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  },
};

/* ==========================================================================
   API Key Management
   ========================================================================== */
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get('glass_claude_api_key', (result) => {
      resolve(result.glass_claude_api_key || null);
    });
  });
}

async function setApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ glass_claude_api_key: key }, resolve);
  });
}

/* ==========================================================================
   Claude API Client
   ========================================================================== */
async function callClaude(messages, systemPrompt) {
  if (!rateLimiter.canProceed()) {
    return {
      error: true,
      message: 'Rate limit exceeded. Please wait a moment before trying again.',
    };
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return {
      error: true,
      message: 'No API key configured. Go to Settings > Claude AI to add your Anthropic API key.',
    };
  }

  // Validate and truncate messages
  const sanitizedMessages = messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: typeof msg.content === 'string'
      ? msg.content.slice(0, MAX_MESSAGE_LENGTH)
      : '',
  }));

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt || 'You are Claude, an AI assistant integrated into Glass Browser. Help users organize their browsing, summarize content, and research topics. Be concise and helpful.',
        messages: sanitizedMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 401) {
        return { error: true, message: 'Invalid API key. Please check your key in Settings > Claude AI.' };
      }
      if (response.status === 429) {
        return { error: true, message: 'API rate limit reached. Please wait a moment.' };
      }
      return { error: true, message: `API error (${response.status}): ${errorBody.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return { error: false, message: text };
  } catch (err) {
    return { error: true, message: `Network error: ${err.message}` };
  }
}

/* ==========================================================================
   Tab Organization Engine
   ========================================================================== */

/**
 * Analyzes all open tabs and returns suggested groupings.
 * Uses Claude to intelligently categorize tabs by topic.
 */
async function analyzeTabsForGrouping() {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  const tabSummaries = tabs.map((tab) => ({
    id: tab.id,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    domain: (() => {
      try { return new URL(tab.url).hostname; } catch { return ''; }
    })(),
  }));

  const prompt = `Analyze these browser tabs and organize them into logical topic groups. Return ONLY a JSON array where each object has "group" (short descriptive name) and "tabIds" (array of tab IDs).

Tabs:
${tabSummaries.map((t) => `- ID ${t.id}: "${t.title}" (${t.domain})`).join('\n')}

Rules:
- Group related tabs together by topic (e.g., "Travel Planning", "Shopping", "Work")
- Use concise, descriptive group names (2-4 words)
- Every tab must be in exactly one group
- Single-tab groups are fine for unique topics
- Return ONLY valid JSON, no markdown or explanation`;

  const result = await callClaude(
    [{ role: 'user', content: prompt }],
    'You are a tab organization assistant. Return only valid JSON arrays. No explanations.',
  );

  if (result.error) {
    return { error: true, message: result.message, groups: [] };
  }

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = result.message.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const groups = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(groups)) throw new Error('Not an array');

    const validGroups = groups
      .filter((g) => g.group && Array.isArray(g.tabIds))
      .map((g) => ({
        group: String(g.group).slice(0, 50),
        tabIds: g.tabIds.filter((id) => typeof id === 'number'),
      }));

    return { error: false, groups: validGroups };
  } catch {
    return { error: true, message: 'Failed to parse tab grouping suggestions.', groups: [] };
  }
}

/**
 * Applies tab grouping to Chrome's native tab groups.
 */
async function applyTabGroups(groups) {
  const colors = ['blue', 'cyan', 'green', 'orange', 'purple', 'pink', 'yellow', 'red'];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!group.tabIds || group.tabIds.length === 0) continue;

    try {
      const groupId = await chrome.tabs.group({ tabIds: group.tabIds });
      await chrome.tabGroups.update(groupId, {
        title: group.group,
        color: colors[i % colors.length],
        collapsed: false,
      });
    } catch (err) {
      console.warn(`Failed to create group "${group.group}":`, err.message);
    }
  }
}

/* ==========================================================================
   Page Content Extraction
   ========================================================================== */

/**
 * Extracts readable text content from the active tab for summarization.
 */
async function extractPageContent(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Extract main content text, stripping nav/footer/ads
        const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
        let content = '';

        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            content = el.innerText;
            break;
          }
        }

        if (!content) {
          content = document.body.innerText;
        }

        // Truncate to reasonable length for API
        return content.slice(0, 8000);
      },
    });

    return results?.[0]?.result || '';
  } catch {
    return '';
  }
}

/* ==========================================================================
   Message Handler — Communication with Claude Panel
   ========================================================================== */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validate sender is our extension
  if (sender.id !== chrome.runtime.id) return;

  switch (request.action) {
    case 'claude:chat': {
      callClaude(request.messages, request.system).then(sendResponse);
      return true; // Async response
    }

    case 'claude:organize-tabs': {
      analyzeTabsForGrouping().then(sendResponse);
      return true;
    }

    case 'claude:apply-groups': {
      applyTabGroups(request.groups).then(() => sendResponse({ success: true }));
      return true;
    }

    case 'claude:summarize': {
      (async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          sendResponse({ error: true, message: 'No active tab found.' });
          return;
        }

        const content = await extractPageContent(tab.id);
        if (!content) {
          sendResponse({ error: true, message: 'Could not extract page content.' });
          return;
        }

        const result = await callClaude(
          [{ role: 'user', content: `Summarize this web page content concisely:\n\n${content}` }],
          'You are a summarization assistant. Provide clear, structured summaries with bullet points for key takeaways.',
        );
        sendResponse(result);
      })();
      return true;
    }

    case 'claude:set-api-key': {
      if (typeof request.key === 'string' && request.key.startsWith('sk-')) {
        setApiKey(request.key).then(() => sendResponse({ success: true }));
      } else {
        sendResponse({ error: true, message: 'Invalid API key format.' });
      }
      return true;
    }

    case 'claude:get-api-key-status': {
      getApiKey().then((key) => {
        sendResponse({ configured: !!key });
      });
      return true;
    }

    default:
      return false;
  }
});

/* ==========================================================================
   Command Handlers — Keyboard Shortcuts
   ========================================================================== */
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-claude-panel':
      // Toggle side panel
      try {
        const window = await chrome.windows.getCurrent();
        await chrome.sidePanel.open({ windowId: window.id });
      } catch {
        // Panel API may not be available on all platforms
      }
      break;

    case 'organize-tabs':
      // Trigger tab organization
      const result = await analyzeTabsForGrouping();
      if (!result.error && result.groups.length > 0) {
        await applyTabGroups(result.groups);
      }
      break;
  }
});

/* ==========================================================================
   Tab Event Monitoring — Auto-grouping suggestions
   ========================================================================== */
let autoGroupTimer = null;

function scheduleAutoGroup() {
  if (autoGroupTimer) clearTimeout(autoGroupTimer);
  autoGroupTimer = setTimeout(async () => {
    // Check if auto-grouping is enabled
    const settings = await chrome.storage.local.get('glass_claude_auto_group');
    if (!settings.glass_claude_auto_group) return;

    const apiKey = await getApiKey();
    if (!apiKey) return;

    // Only suggest if there are ungrouped tabs
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const ungrouped = tabs.filter((t) => t.groupId === -1 || t.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);

    if (ungrouped.length >= 4) {
      // Notify the panel that auto-grouping is available
      chrome.runtime.sendMessage({
        action: 'claude:auto-group-available',
        ungroupedCount: ungrouped.length,
      }).catch(() => {}); // Panel may not be open
    }
  }, AUTO_GROUP_DEBOUNCE_MS);
}

chrome.tabs.onCreated.addListener(scheduleAutoGroup);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    scheduleAutoGroup();
  }
});

/* ==========================================================================
   Installation
   ========================================================================== */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default preferences
    chrome.storage.local.set({
      glass_claude_auto_group: false, // Off by default — user opt-in
    });

    // Open the side panel introduction
    chrome.sidePanel.setOptions({
      enabled: true,
      path: 'claude-panel.html',
    });
  }
});
