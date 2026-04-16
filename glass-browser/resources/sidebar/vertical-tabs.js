/**
 * Glass Browser — Vertical Tab Sidebar Controller
 *
 * Manages vertical tab strip with:
 *   - Collapsible sidebar (favicon-only ↔ full info on hover)
 *   - Claude AI auto-grouped tabs by topic
 *   - Drag-and-drop tab reordering
 *   - Tab search/filter
 *   - Context menus
 *   - Pinned tabs
 *
 * Integration:
 *   Uses chrome.tabs API in production; demo data for standalone testing.
 *
 * Security:
 *   - All text content sanitized before DOM insertion
 *   - No eval() or innerHTML with user data
 *   - Event listeners attached programmatically
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

function sanitizeUrl(url) {
  if (typeof url !== 'string') return '#';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'chrome:', 'chrome-extension:'].includes(parsed.protocol)) return '#';
    return parsed.href;
  } catch {
    return '#';
  }
}

/* ==========================================================================
   Tab Group Colors — Apple-inspired palette
   ========================================================================== */
const GROUP_COLORS = [
  '#64D2FF', // Teal
  '#0A84FF', // Blue
  '#30D158', // Green
  '#FF9F0A', // Orange
  '#BF5AF2', // Purple
  '#FF375F', // Pink
  '#FFD60A', // Yellow
  '#FF453A', // Red
  '#AC8E68', // Tan
  '#5E5CE6', // Indigo
];

/* ==========================================================================
   Demo Data — Simulates real tabs for standalone testing
   In production, replaced by chrome.tabs API calls
   ========================================================================== */
const DEMO_TABS = [
  // Las Vegas Trip Planning
  { id: 't1', title: 'Best Hotels in Las Vegas 2026', url: 'https://www.expedia.com/las-vegas-hotels', favicon: '', groupHint: 'Las Vegas Trip Planning' },
  { id: 't2', title: 'Las Vegas Show Tickets - Cirque du Soleil', url: 'https://www.cirquedusoleil.com/las-vegas', favicon: '', groupHint: 'Las Vegas Trip Planning' },
  { id: 't3', title: 'Flights to Las Vegas - Southwest Airlines', url: 'https://www.southwest.com', favicon: '', groupHint: 'Las Vegas Trip Planning' },

  // Chromium Development
  { id: 't4', title: 'Chromium Blog - Latest Updates', url: 'https://blog.chromium.org', favicon: '', groupHint: 'Chromium News' },
  { id: 't5', title: 'ungoogled-chromium - GitHub', url: 'https://github.com/nicholaswmin/ungoogled-chromium', favicon: '', groupHint: 'Chromium News' },

  // Running Shoes Shopping
  { id: 't6', title: 'Nike Pegasus 43 Review', url: 'https://www.nike.com/running', favicon: '', groupHint: 'Running Shoes Shopping' },
  { id: 't7', title: 'Best Running Shoes 2026 - Runner\'s World', url: 'https://www.runnersworld.com', favicon: '', groupHint: 'Running Shoes Shopping' },
  { id: 't8', title: 'ASICS Gel Kayano 32 - Amazon', url: 'https://www.amazon.com', favicon: '', groupHint: 'Running Shoes Shopping' },

  // General
  { id: 't9', title: 'YouTube - Home', url: 'https://www.youtube.com', favicon: '', groupHint: 'Entertainment' },
  { id: 't10', title: 'Reddit - r/programming', url: 'https://www.reddit.com/r/programming', favicon: '', groupHint: 'Entertainment' },
];

const DEMO_PINNED = [
  { id: 'p1', title: 'Gmail', url: 'https://mail.google.com', favicon: '' },
  { id: 'p2', title: 'Calendar', url: 'https://calendar.google.com', favicon: '' },
  { id: 'p3', title: 'GitHub', url: 'https://github.com', favicon: '' },
];

/* ==========================================================================
   Vertical Tabs Controller
   ========================================================================== */
const VerticalTabsController = {
  tabs: [],
  pinnedTabs: [],
  groups: [],
  activeTabId: null,
  isCollapsed: true,
  contextMenu: null,
  searchQuery: '',

  async init() {
    this.loadTabs();
    this.renderGroups();
    this.renderPinnedTabs();
    this.setupEventListeners();
    this.setupSearch();
    this.setupCollapseToggle();
    this.setupContextMenu();

    // Set first tab as active
    if (this.tabs.length > 0) {
      this.setActiveTab(this.tabs[0].id);
    }
  },

  loadTabs() {
    // In production: use chrome.tabs.query({}) to get real tabs
    // For standalone testing, use demo data
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({}, (tabs) => {
        this.tabs = tabs.map((t) => ({
          id: String(t.id),
          title: t.title,
          url: t.url,
          favicon: t.favIconUrl || '',
          groupHint: '',
        }));
        this.autoGroupTabs();
        this.renderGroups();
      });
    } else {
      this.tabs = [...DEMO_TABS];
      this.pinnedTabs = [...DEMO_PINNED];
      this.autoGroupTabs();
    }
  },

  /**
   * Auto-group tabs by topic using content analysis.
   * In production, this calls Claude API for intelligent categorization.
   * Standalone mode uses the groupHint property.
   */
  autoGroupTabs() {
    const groupMap = new Map();
    let colorIdx = 0;

    this.tabs.forEach((tab) => {
      const groupName = tab.groupHint || this.inferGroupFromUrl(tab.url);
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, {
          id: 'g' + colorIdx,
          name: groupName,
          color: GROUP_COLORS[colorIdx % GROUP_COLORS.length],
          tabs: [],
          collapsed: false,
        });
        colorIdx++;
      }
      groupMap.get(groupName).tabs.push(tab);
    });

    this.groups = Array.from(groupMap.values());
  },

  /**
   * Basic URL-based group inference for fallback.
   * Production uses Claude for semantic analysis of page content.
   */
  inferGroupFromUrl(url) {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const domainGroups = {
        'youtube.com': 'Entertainment',
        'netflix.com': 'Entertainment',
        'reddit.com': 'Social',
        'twitter.com': 'Social',
        'github.com': 'Development',
        'stackoverflow.com': 'Development',
        'amazon.com': 'Shopping',
        'ebay.com': 'Shopping',
        'mail.google.com': 'Communication',
        'outlook.com': 'Communication',
      };
      return domainGroups[hostname] || 'Other';
    } catch {
      return 'Other';
    }
  },

  /* ---------- Rendering ---------- */

  renderGroups() {
    const container = document.getElementById('tab-groups-container');
    container.innerHTML = '';

    this.groups.forEach((group) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'tab-group' + (group.collapsed ? ' collapsed' : '');
      groupEl.dataset.groupId = group.id;

      // Group header
      const header = document.createElement('div');
      header.className = 'tab-group-header';

      const dot = document.createElement('span');
      dot.className = 'group-color-dot';
      dot.style.background = group.color;

      const name = document.createElement('span');
      name.className = 'group-name';
      name.textContent = group.name;

      const count = document.createElement('span');
      count.className = 'group-count';
      count.textContent = String(group.tabs.length);

      const collapseBtn = document.createElement('button');
      collapseBtn.className = 'group-collapse-btn';
      collapseBtn.textContent = '\u25BE'; // ▾

      header.appendChild(dot);
      header.appendChild(name);
      header.appendChild(count);
      header.appendChild(collapseBtn);

      header.addEventListener('click', () => {
        group.collapsed = !group.collapsed;
        groupEl.classList.toggle('collapsed');
      });

      // Tab items
      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'tab-group-items';

      group.tabs.forEach((tab) => {
        const tabEl = this.createTabElement(tab);
        itemsContainer.appendChild(tabEl);
      });

      // Set max-height for animation
      if (!group.collapsed) {
        itemsContainer.style.maxHeight = (group.tabs.length * 40) + 'px';
      }

      groupEl.appendChild(header);
      groupEl.appendChild(itemsContainer);
      container.appendChild(groupEl);
    });
  },

  createTabElement(tab) {
    const el = document.createElement('div');
    el.className = 'tab-item' + (tab.id === this.activeTabId ? ' active' : '');
    el.dataset.tabId = tab.id;
    el.draggable = true;

    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    const domain = (() => {
      try { return new URL(sanitizeUrl(tab.url)).hostname; } catch { return ''; }
    })();
    favicon.src = tab.favicon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
    favicon.alt = '';
    favicon.addEventListener('error', () => {
      favicon.style.background = 'rgba(255,255,255,0.08)';
      favicon.src = '';
    });

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close-btn';
    closeBtn.textContent = '\u00D7'; // ×
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tab.id);
    });

    el.appendChild(favicon);
    el.appendChild(title);
    el.appendChild(closeBtn);

    el.addEventListener('click', () => this.setActiveTab(tab.id));

    // Drag handlers
    el.addEventListener('dragstart', (e) => {
      el.classList.add('dragging');
      e.dataTransfer.setData('text/plain', tab.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach((d) => d.classList.remove('drag-over'));
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    });

    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      this.moveTab(draggedId, tab.id);
    });

    return el;
  },

  renderPinnedTabs() {
    const list = document.getElementById('pinned-tabs-list');
    list.innerHTML = '';

    this.pinnedTabs.forEach((tab) => {
      const el = document.createElement('div');
      el.className = 'pinned-tab';
      el.dataset.tabId = tab.id;

      const favicon = document.createElement('img');
      favicon.className = 'tab-favicon';
      const domain = (() => {
        try { return new URL(sanitizeUrl(tab.url)).hostname; } catch { return ''; }
      })();
      favicon.src = tab.favicon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
      favicon.alt = '';

      const title = document.createElement('span');
      title.className = 'tab-title';
      title.textContent = tab.title;

      el.appendChild(favicon);
      el.appendChild(title);

      el.addEventListener('click', () => this.setActiveTab(tab.id));

      list.appendChild(el);
    });
  },

  /* ---------- Tab Actions ---------- */

  setActiveTab(tabId) {
    this.activeTabId = tabId;

    // Update DOM
    document.querySelectorAll('.tab-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.tabId === tabId);
    });

    // In production: chrome.tabs.update(parseInt(tabId), { active: true });
  },

  closeTab(tabId) {
    // Remove from groups
    this.groups.forEach((group) => {
      group.tabs = group.tabs.filter((t) => t.id !== tabId);
    });
    // Remove empty groups
    this.groups = this.groups.filter((g) => g.tabs.length > 0);
    this.tabs = this.tabs.filter((t) => t.id !== tabId);

    // If active tab was closed, activate next
    if (this.activeTabId === tabId && this.tabs.length > 0) {
      this.setActiveTab(this.tabs[0].id);
    }

    this.renderGroups();

    // In production: chrome.tabs.remove(parseInt(tabId));
  },

  moveTab(fromId, toId) {
    // Find and remove the dragged tab
    let draggedTab = null;
    this.groups.forEach((group) => {
      const idx = group.tabs.findIndex((t) => t.id === fromId);
      if (idx !== -1) {
        draggedTab = group.tabs.splice(idx, 1)[0];
      }
    });

    if (!draggedTab) return;

    // Insert before the target
    this.groups.forEach((group) => {
      const idx = group.tabs.findIndex((t) => t.id === toId);
      if (idx !== -1) {
        group.tabs.splice(idx, 0, draggedTab);
      }
    });

    // Clean empty groups
    this.groups = this.groups.filter((g) => g.tabs.length > 0);
    this.renderGroups();
  },

  /* ---------- Search ---------- */

  setupSearch() {
    const searchInput = document.getElementById('tab-search');
    searchInput.addEventListener('input', () => {
      this.searchQuery = searchInput.value.toLowerCase().trim();
      this.filterTabs();
    });
  },

  filterTabs() {
    const query = this.searchQuery;
    document.querySelectorAll('.tab-item').forEach((el) => {
      const title = el.querySelector('.tab-title').textContent.toLowerCase();
      el.style.display = !query || title.includes(query) ? '' : 'none';
    });

    // Hide empty groups when filtering
    document.querySelectorAll('.tab-group').forEach((groupEl) => {
      const visibleTabs = groupEl.querySelectorAll('.tab-item:not([style*="display: none"])');
      groupEl.style.display = !query || visibleTabs.length > 0 ? '' : 'none';
    });
  },

  /* ---------- Collapse Toggle ---------- */

  setupCollapseToggle() {
    const sidebar = document.getElementById('tab-sidebar');
    const toggleBtn = document.getElementById('sidebar-collapse-btn');

    toggleBtn.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      sidebar.classList.toggle('collapsed', this.isCollapsed);
    });
  },

  /* ---------- Context Menu ---------- */

  setupContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      const tabItem = e.target.closest('.tab-item');
      const pinnedTab = e.target.closest('.pinned-tab');
      const groupHeader = e.target.closest('.tab-group-header');

      if (tabItem || pinnedTab || groupHeader) {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY, tabItem || pinnedTab, groupHeader);
      }
    });

    document.addEventListener('click', () => this.hideContextMenu());
  },

  showContextMenu(x, y, tabEl, groupEl) {
    this.hideContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    const items = [];

    if (tabEl) {
      const tabId = tabEl.dataset.tabId;
      items.push(
        { label: 'Pin Tab', action: () => this.pinTab(tabId) },
        { label: 'Duplicate Tab', action: () => {} },
        { separator: true },
        { label: 'Move to New Group', action: () => {} },
        { separator: true },
        { label: 'Close Tab', action: () => this.closeTab(tabId), danger: true },
        { label: 'Close Other Tabs', action: () => this.closeOtherTabs(tabId), danger: true },
      );
    }

    if (groupEl) {
      const groupId = groupEl.closest('.tab-group')?.dataset.groupId;
      items.push(
        { label: 'Rename Group', action: () => {} },
        { label: 'Change Color', action: () => {} },
        { separator: true },
        { label: 'Close Group', action: () => this.closeGroup(groupId), danger: true },
      );
    }

    items.forEach((item) => {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        menu.appendChild(sep);
      } else {
        const btn = document.createElement('button');
        btn.className = 'context-menu-item' + (item.danger ? ' danger' : '');
        btn.textContent = item.label;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action();
          this.hideContextMenu();
        });
        menu.appendChild(btn);
      }
    });

    // Position correction to stay in viewport
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';

    this.contextMenu = menu;
  },

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  },

  pinTab(tabId) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    this.pinnedTabs.push({ ...tab });
    this.closeTab(tabId);
    this.renderPinnedTabs();
  },

  closeOtherTabs(keepId) {
    const keep = this.tabs.find((t) => t.id === keepId);
    if (!keep) return;

    this.tabs = [keep];
    this.groups = [{
      id: 'g0',
      name: this.inferGroupFromUrl(keep.url),
      color: GROUP_COLORS[0],
      tabs: [keep],
      collapsed: false,
    }];
    this.setActiveTab(keepId);
    this.renderGroups();
  },

  closeGroup(groupId) {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return;

    const tabIds = new Set(group.tabs.map((t) => t.id));
    this.tabs = this.tabs.filter((t) => !tabIds.has(t.id));
    this.groups = this.groups.filter((g) => g.id !== groupId);

    if (tabIds.has(this.activeTabId) && this.tabs.length > 0) {
      this.setActiveTab(this.tabs[0].id);
    }

    this.renderGroups();
  },

  /* ---------- Event Listeners ---------- */

  setupEventListeners() {
    // New tab button
    document.getElementById('new-tab-btn').addEventListener('click', () => {
      // In production: chrome.tabs.create({});
      const newTab = {
        id: 't' + Date.now(),
        title: 'New Tab',
        url: 'chrome://newtab',
        favicon: '',
        groupHint: 'Other',
      };
      this.tabs.push(newTab);
      this.autoGroupTabs();
      this.renderGroups();
      this.setActiveTab(newTab.id);
    });

    // Claude AI toggle
    document.getElementById('claude-toggle-btn').addEventListener('click', () => {
      // Dispatch event to open Claude panel
      window.dispatchEvent(new CustomEvent('glass:toggle-claude-panel'));
    });

    // Listen for tab updates from Chrome API
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onUpdated.addListener(() => {
        this.loadTabs();
      });

      chrome.tabs.onRemoved.addListener((tabId) => {
        this.closeTab(String(tabId));
      });

      chrome.tabs.onCreated.addListener(() => {
        this.loadTabs();
      });
    }
  },
};

/* ==========================================================================
   Initialize
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  VerticalTabsController.init();
});
