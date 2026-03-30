/* ============================================================
   DARK VERTICAL TABS — NASA WORM EDITION
   Tab management logic for the vertical sidebar
   ============================================================ */

const tabList = document.getElementById('tab-list');
const tabSearch = document.getElementById('tab-search');
const newTabBtn = document.getElementById('new-tab-btn');
const tabCount = document.getElementById('tab-count');

// State
let allTabs = [];
let draggedTabId = null;

// ---- Favicon URL helper ----
function getFaviconUrl(tab) {
  if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
    return tab.favIconUrl;
  }
  // Use chrome's built-in favicon service as fallback
  try {
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', tab.url || '');
    url.searchParams.set('size', '32');
    return url.toString();
  } catch {
    return null;
  }
}

// ---- Extract domain initial for fallback ----
function getDomainInitial(tab) {
  try {
    const url = new URL(tab.url);
    return url.hostname.charAt(0).toUpperCase();
  } catch {
    return tab.title ? tab.title.charAt(0).toUpperCase() : '?';
  }
}

// ---- Extract short domain ----
function getShortDomain(tab) {
  try {
    const url = new URL(tab.url);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// ---- Create tab element ----
function createTabElement(tab) {
  const el = document.createElement('div');
  el.className = 'tab-item';
  el.dataset.tabId = tab.id;
  el.draggable = true;

  if (tab.active) el.classList.add('active');
  if (tab.pinned) el.classList.add('pinned');
  if (tab.audible) el.classList.add('audible');
  if (tab.status === 'loading') el.classList.add('loading');

  // Favicon container
  const faviconContainer = document.createElement('div');
  faviconContainer.className = 'tab-favicon-container';

  const faviconRing = document.createElement('div');
  faviconRing.className = 'tab-favicon-ring';

  const faviconUrl = getFaviconUrl(tab);
  if (faviconUrl) {
    const img = document.createElement('img');
    img.className = 'tab-favicon';
    img.src = faviconUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => {
      img.replaceWith(createFallbackIcon(tab));
    };
    faviconRing.appendChild(img);
  } else {
    faviconRing.appendChild(createFallbackIcon(tab));
  }

  faviconContainer.appendChild(faviconRing);
  el.appendChild(faviconContainer);

  // Tab info (shown on hover)
  const info = document.createElement('div');
  info.className = 'tab-info';

  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tab.title || 'New Tab';

  const url = document.createElement('div');
  url.className = 'tab-url';
  url.textContent = getShortDomain(tab);

  info.appendChild(title);
  info.appendChild(url);
  el.appendChild(info);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.textContent = '\u00D7';
  closeBtn.title = 'Close tab';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.tabs.remove(tab.id);
  });
  el.appendChild(closeBtn);

  // Click to activate
  el.addEventListener('click', () => {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  });

  // Right-click context menu
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, tab);
  });

  // Drag and drop
  el.addEventListener('dragstart', (e) => {
    draggedTabId = tab.id;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    draggedTabId = null;
    document.querySelectorAll('.drag-over').forEach(
      el => el.classList.remove('drag-over')
    );
  });

  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over');
  });

  el.addEventListener('dragleave', () => {
    el.classList.remove('drag-over');
  });

  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');
    if (draggedTabId !== null && draggedTabId !== tab.id) {
      chrome.tabs.move(draggedTabId, { index: tab.index });
    }
  });

  // Middle-click to close
  el.addEventListener('auxclick', (e) => {
    if (e.button === 1) {
      e.preventDefault();
      chrome.tabs.remove(tab.id);
    }
  });

  return el;
}

// ---- Create fallback favicon icon ----
function createFallbackIcon(tab) {
  const fallback = document.createElement('div');
  fallback.className = 'tab-favicon-fallback';
  fallback.textContent = getDomainInitial(tab);
  return fallback;
}

// ---- Render all tabs ----
function renderTabs(tabs) {
  const searchTerm = tabSearch.value.toLowerCase().trim();

  let filtered = tabs;
  if (searchTerm) {
    filtered = tabs.filter(tab =>
      (tab.title || '').toLowerCase().includes(searchTerm) ||
      (tab.url || '').toLowerCase().includes(searchTerm)
    );
  }

  // Group: pinned first, then by tab groups, then regular
  const pinned = filtered.filter(t => t.pinned);
  const regular = filtered.filter(t => !t.pinned);

  tabList.innerHTML = '';

  // Render pinned tabs
  if (pinned.length > 0) {
    pinned.forEach(tab => tabList.appendChild(createTabElement(tab)));
    if (regular.length > 0) {
      const sep = document.createElement('div');
      sep.style.height = '1px';
      sep.style.background = 'var(--border-subtle)';
      sep.style.margin = '6px 12px';
      tabList.appendChild(sep);
    }
  }

  // Render regular tabs (grouped if applicable)
  const groups = new Map();
  regular.forEach(tab => {
    const groupId = tab.groupId ?? -1;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(tab);
  });

  // Ungrouped first, then groups
  const ungrouped = groups.get(-1) || [];
  ungrouped.forEach(tab => tabList.appendChild(createTabElement(tab)));

  groups.forEach((tabs, groupId) => {
    if (groupId === -1) return;
    // Try to get group info
    try {
      chrome.tabGroups.get(groupId, (group) => {
        if (chrome.runtime.lastError) return;
        const header = document.createElement('div');
        header.className = 'tab-group-header';
        const dot = document.createElement('div');
        dot.className = 'tab-group-dot';
        dot.style.background = getGroupColor(group.color);
        const name = document.createElement('div');
        name.className = 'tab-group-name';
        name.textContent = group.title || 'GROUP';
        header.appendChild(dot);
        header.appendChild(name);
        // Insert before the first tab of this group
        const firstTabEl = tabList.querySelector(
          `[data-tab-id="${tabs[0].id}"]`
        );
        if (firstTabEl) tabList.insertBefore(header, firstTabEl);
      });
    } catch {}

    tabs.forEach(tab => tabList.appendChild(createTabElement(tab)));
  });

  // Update count
  tabCount.textContent = `${tabs.length} TAB${tabs.length !== 1 ? 'S' : ''}`;
}

// ---- Tab group color mapping ----
function getGroupColor(color) {
  const colors = {
    grey: '#8890A8',
    blue: '#6EA8FE',
    cyan: '#6EDCD9',
    green: '#77DD77',
    yellow: '#FFD700',
    orange: '#FFB347',
    red: '#FC3D21',
    pink: '#FF6B9D',
    purple: '#C084FC',
  };
  return colors[color] || colors.grey;
}

// ---- Context Menu ----
function showContextMenu(event, tab) {
  removeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;

  const items = [
    {
      label: tab.pinned ? 'Unpin Tab' : 'Pin Tab',
      action: () => chrome.tabs.update(tab.id, { pinned: !tab.pinned })
    },
    {
      label: tab.mutedInfo?.muted ? 'Unmute Tab' : 'Mute Tab',
      action: () => chrome.tabs.update(tab.id, {
        muted: !tab.mutedInfo?.muted
      })
    },
    { separator: true },
    {
      label: 'Duplicate Tab',
      action: () => chrome.tabs.duplicate(tab.id)
    },
    {
      label: 'Reload Tab',
      action: () => chrome.tabs.reload(tab.id)
    },
    { separator: true },
    {
      label: 'Close Tab',
      action: () => chrome.tabs.remove(tab.id)
    },
    {
      label: 'Close Other Tabs',
      action: () => {
        chrome.tabs.query(
          { currentWindow: true },
          (tabs) => {
            tabs.filter(t => t.id !== tab.id && !t.pinned)
              .forEach(t => chrome.tabs.remove(t.id));
          }
        );
      }
    }
  ];

  items.forEach(item => {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.className = 'context-menu-separator';
      menu.appendChild(sep);
    } else {
      const el = document.createElement('div');
      el.className = 'context-menu-item';
      el.textContent = item.label;
      el.addEventListener('click', () => {
        item.action();
        removeContextMenu();
      });
      menu.appendChild(el);
    }
  });

  document.body.appendChild(menu);

  // Adjust position if menu overflows
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 8}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 8}px`;
  }

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', removeContextMenu, { once: true });
  }, 0);
}

function removeContextMenu() {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

// ---- Load & refresh tabs ----
async function loadTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  allTabs = tabs;
  renderTabs(tabs);
}

// ---- Event listeners ----

// Tab events
chrome.tabs.onCreated.addListener(loadTabs);
chrome.tabs.onRemoved.addListener(loadTabs);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Only reload on meaningful changes
  if (changeInfo.status || changeInfo.title || changeInfo.favIconUrl ||
      changeInfo.pinned !== undefined || changeInfo.audible !== undefined ||
      changeInfo.mutedInfo) {
    loadTabs();
  }
});
chrome.tabs.onActivated.addListener(loadTabs);
chrome.tabs.onMoved.addListener(loadTabs);
chrome.tabs.onAttached.addListener(loadTabs);
chrome.tabs.onDetached.addListener(loadTabs);

// Search filter
tabSearch.addEventListener('input', () => {
  renderTabs(allTabs);
});

// Keyboard shortcut: Escape to clear search
tabSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    tabSearch.value = '';
    renderTabs(allTabs);
    tabSearch.blur();
  }
});

// New tab button
newTabBtn.addEventListener('click', () => {
  chrome.tabs.create({});
});

// ---- Initial load ----
loadTabs();
