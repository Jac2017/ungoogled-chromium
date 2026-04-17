/* Glass Browser — New Tab Page
   Built against: REQUIREMENTS.md + STYLE-GUIDE.md
   ────────────────────────────────────────────── */
'use strict';

/* ═══════════════════════════════════════════════
   SECURITY HELPERS  (REQ-SEC-1, SEC-2)
   ═══════════════════════════════════════════════ */
const esc = (s) => {
  if (typeof s !== 'string') return '';
  const d = document.createElement('span');
  d.textContent = s;
  return d.innerHTML;
};
const safeUrl = (u) => {
  try { const p = new URL(u); return /^https?:$/.test(p.protocol) ? p.href : '#'; }
  catch { return '#'; }
};

/* ═══════════════════════════════════════════════
   STORAGE  (REQ-BM-9, REQ-FEED-14)
   ═══════════════════════════════════════════════ */
const S = {
  get(k, d = null) {
    try {
      if (globalThis.chrome?.storage?.local)
        return new Promise(r => chrome.storage.local.get('g_' + k, o => r(o['g_' + k] ?? d)));
      const v = localStorage.getItem('g_' + k);
      return Promise.resolve(v ? JSON.parse(v) : d);
    } catch { return Promise.resolve(d); }
  },
  set(k, v) {
    try {
      if (globalThis.chrome?.storage?.local)
        return new Promise(r => chrome.storage.local.set({ ['g_' + k]: v }, r));
      localStorage.setItem('g_' + k, JSON.stringify(v));
    } catch {}
    return Promise.resolve();
  }
};

/* ═══════════════════════════════════════════════
   BOOKMARK DATA  (REQ-BM-4, REQ-BM-5, STYLE §1.6)
   Brand gradient for each icon background
   ═══════════════════════════════════════════════ */
const DEFAULT_BM = [
  { n:'Bing',      u:'https://www.bing.com',          g:'linear-gradient(135deg,#00897B,#00ACC1)' },
  { n:'YouTube',   u:'https://www.youtube.com',       g:'linear-gradient(135deg,#E53935,#FF1744)' },
  { n:'Gmail',     u:'https://mail.google.com',       g:'linear-gradient(135deg,#E64A19,#FF5722)' },
  { n:'Reddit',    u:'https://www.reddit.com',        g:'linear-gradient(135deg,#FF5722,#FF9100)' },
  { n:'GitHub',    u:'https://github.com',            g:'linear-gradient(135deg,#424242,#6D4C9F)' },
  { n:'Wikipedia', u:'https://www.wikipedia.org',     g:'linear-gradient(135deg,#546E7A,#78909C)' },
  { n:'Twitter',   u:'https://twitter.com',           g:'linear-gradient(135deg,#1565C0,#1E88E5)' },
  { n:'Amazon',    u:'https://www.amazon.com',        g:'linear-gradient(135deg,#FF8F00,#FFB300)' },
  { n:'Netflix',   u:'https://www.netflix.com',       g:'linear-gradient(135deg,#B71C1C,#E53935)' },
  { n:'LinkedIn',  u:'https://www.linkedin.com',      g:'linear-gradient(135deg,#0277BD,#0288D1)' },
  { n:'Maps',      u:'https://maps.google.com',       g:'linear-gradient(135deg,#2E7D32,#43A047)' },
  { n:'News',      u:'https://news.bing.com',         g:'linear-gradient(135deg,#0D47A1,#1565C0)' },
  { n:'Spotify',   u:'https://open.spotify.com',      g:'linear-gradient(135deg,#1B5E20,#2E7D32)' },
  { n:'Translate', u:'https://translate.google.com',  g:'linear-gradient(135deg,#283593,#3F51B5)' },
];

/* ═══════════════════════════════════════════════
   BACKGROUND MANAGER  (REQ-BG-1→6, STYLE §8.1)
   Gradient is always visible. Photo is an optional
   enhancement that loads on top.
   ═══════════════════════════════════════════════ */
const BG = {
  scenes: [
    'santorini+greece+sunset', 'northern+lights+iceland',
    'machu+picchu+peru+mountains', 'swiss+alps+matterhorn',
    'cappadocia+turkey+balloons', 'banff+national+park+canada',
    'norwegian+fjords+landscape', 'african+safari+elephant+sunset',
    'bora+bora+overwater+villa', 'patagonia+mountains+lake',
    'kyoto+bamboo+forest+japan', 'amalfi+coast+italy+ocean',
  ],
  async init() {
    const idx = ((await S.get('bg_i', -1)) + 1) % this.scenes.length;
    await S.set('bg_i', idx);
    const img = document.getElementById('bg-photo');
    // REQ-BG-2: attempt to load a travel photo
    img.src = `https://source.unsplash.com/1920x1080/?${this.scenes[idx]}`;
    img.onload = () => img.classList.add('show');
    // REQ-BG-6: if it fails the gradient is already visible — do nothing
    img.onerror = () => {};
  }
};

/* ═══════════════════════════════════════════════
   SEARCH  (REQ-SEARCH-1→7)
   ═══════════════════════════════════════════════ */
const Search = {
  init() {
    const inp = document.getElementById('search-input');
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && inp.value.trim())
        location.href = 'https://www.bing.com/search?q=' + encodeURIComponent(inp.value.trim());
    });
    // REQ-SEARCH-6: any key auto-focuses search
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
          e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1) inp.focus();
    });
  }
};

/* ═══════════════════════════════════════════════
   BOOKMARKS  (REQ-BM-1→10)
   ═══════════════════════════════════════════════ */
const Bookmarks = {
  async init() {
    const bm = await S.get('bm', DEFAULT_BM);
    this.render(bm);
    this.editSetup(bm);
  },

  render(list) {
    const grid = document.getElementById('bookmarks-grid');
    grid.innerHTML = '';
    list.forEach(b => {
      const a = document.createElement('a');
      a.className = 'bm-tile';
      a.href = safeUrl(b.u);

      // REQ-BM-3: colored icon container
      const icon = document.createElement('div');
      icon.className = 'bm-icon';
      icon.style.background = b.g || 'linear-gradient(135deg,#37474f,#455a64)';

      const img = document.createElement('img');
      const host = (() => { try { return new URL(safeUrl(b.u)).hostname; } catch { return ''; } })();
      img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => {
        img.remove();
        const letter = document.createElement('span');
        letter.className = 'bm-letter';
        letter.textContent = (b.n || '?')[0];
        icon.appendChild(letter);
      };
      icon.appendChild(img);

      const label = document.createElement('span');
      label.className = 'bm-label';
      label.textContent = b.n;

      a.appendChild(icon);
      a.appendChild(label);
      grid.appendChild(a);
    });
  },

  editSetup(bookmarks) {
    const openBtn = document.getElementById('bm-edit-btn');
    const modal = document.getElementById('bm-modal');
    const closeBtn = document.getElementById('bm-close');
    const saveBtn = document.getElementById('bm-save');
    const addBtn = document.getElementById('bm-add');
    const list = document.getElementById('bm-edit-list');
    let data;

    const renderList = () => {
      list.innerHTML = '';
      data.forEach((b, i) => {
        const row = document.createElement('div');
        row.className = 'bm-edit-row';
        const ni = document.createElement('input');
        ni.value = b.n; ni.placeholder = 'Name';
        ni.oninput = () => { data[i].n = ni.value; };
        const ui = document.createElement('input');
        ui.value = b.u; ui.placeholder = 'https://...';
        ui.oninput = () => { data[i].u = ui.value; };
        const del = document.createElement('button');
        del.className = 'bm-edit-del'; del.textContent = '×';
        del.onclick = () => { data.splice(i, 1); renderList(); };
        row.append(ni, ui, del);
        list.appendChild(row);
      });
    };

    openBtn.onclick = () => {
      data = JSON.parse(JSON.stringify(bookmarks));
      renderList();
      modal.hidden = false;
    };
    closeBtn.onclick = () => modal.hidden = true;
    modal.onclick = e => { if (e.target === modal) modal.hidden = true; };
    addBtn.onclick = () => {
      data.push({ n: '', u: 'https://', g: 'linear-gradient(135deg,#37474f,#455a64)' });
      renderList();
    };
    saveBtn.onclick = async () => {
      const valid = data.filter(b => b.n.trim() && b.u.trim());
      await S.set('bm', valid);
      this.render(valid);
      bookmarks = valid;
      modal.hidden = true;
    };
  }
};

/* ═══════════════════════════════════════════════
   FEED  (REQ-FEED-1→15, STYLE §8.2)
   ═══════════════════════════════════════════════ */

// §8.2 category-specific placeholder gradients
const CAT_GRAD = {
  Technology:    'linear-gradient(135deg,#1a237e,#283593)',
  Science:       'linear-gradient(135deg,#004d40,#00695c)',
  Business:      'linear-gradient(135deg,#1b5e20,#2e7d32)',
  Entertainment: 'linear-gradient(135deg,#4a148c,#6a1b9a)',
  Sports:        'linear-gradient(135deg,#b71c1c,#c62828)',
  Travel:        'linear-gradient(135deg,#01579b,#0277bd)',
  Health:        'linear-gradient(135deg,#00838f,#00acc1)',
  Finance:       'linear-gradient(135deg,#33691e,#558b2f)',
  Automotive:    'linear-gradient(135deg,#263238,#37474f)',
  Fitness:       'linear-gradient(135deg,#e65100,#ef6c00)',
  default:       'linear-gradient(135deg,#37474f,#455a64)',
};

const CAT_ICON = {
  Technology: '💻', Science: '🔬', Business: '📊', Entertainment: '🎬',
  Sports: '⚽', Travel: '✈️', Health: '🩺', Finance: '📈',
  Automotive: '🚗', Fitness: '🏃', default: '📰',
};

const ARTICLES = [
  { t:'The Future of AI: How Large Language Models Are Reshaping Every Industry', p:'MIT Technology Review', c:'Technology', h:'2h ago' },
  { t:'SpaceX Starship Completes Historic Orbital Flight with Full Recovery', p:'Space.com', c:'Science', h:'3h ago' },
  { t:'Apple Vision Pro 2 Leaked: Thinner, Lighter, and More Affordable', p:'The Verge', c:'Technology', h:'4h ago' },
  { t:'Global Markets Rally as Central Banks Signal Rate Cuts Coming Soon', p:'Bloomberg', c:'Finance', h:'5h ago' },
  { t:'Scientists Discover New Deep-Sea Species in the Mariana Trench', p:'National Geographic', c:'Science', h:'6h ago' },
  { t:'Electric Vehicle Sales Surge Past 50% Market Share in Europe', p:'Reuters', c:'Automotive', h:'7h ago' },
  { t:'Revolutionary CRISPR Treatment Cures Inherited Blood Disorder', p:'Nature Medicine', c:'Health', h:'8h ago' },
  { t:'The Best Running Shoes of 2026: Expert Reviews and Lab Tests', p:"Runner's World", c:'Fitness', h:'9h ago' },
  { t:'Japan Opens New Bullet Train Route Connecting Osaka to Hokkaido', p:'Travel + Leisure', c:'Travel', h:'10h ago' },
  { t:'Netflix Announces Interactive AI-Generated Shows Coming This Fall', p:'Variety', c:'Entertainment', h:'11h ago' },
  { t:'Climate Summit Reaches Historic Agreement on Carbon Emissions', p:'BBC News', c:'Science', h:'12h ago' },
  { t:'Quantum Computing Breakthrough: 1000-Qubit Processor Achieved', p:'Wired', c:'Technology', h:'13h ago' },
];

const Feed = {
  topics: [
    'Technology','Science','Business','Entertainment','Sports',
    'Health','Travel','Food','Gaming','Fashion',
    'Politics','World News','Finance','AI & ML','Space',
    'Automotive','Music','Movies','Crypto','Fitness',
  ],
  interval: null,

  async init() {
    this.renderArticles();
    this.setupRefresh();
    this.setupSettings();
    document.getElementById('feed-refresh-btn').onclick = () => this.renderArticles();
  },

  renderArticles() {
    const grid = document.getElementById('feed-grid');
    grid.innerHTML = '';
    // Shuffle for variety
    const arts = [...ARTICLES];
    for (let i = arts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arts[i], arts[j]] = [arts[j], arts[i]];
    }

    arts.forEach((a, idx) => {
      // REQ-FEED-7: ad every 4th position (after 3 articles)
      if (idx > 0 && idx % 3 === 0) grid.appendChild(this.adCard());
      grid.appendChild(this.articleCard(a));
    });
  },

  articleCard(a) {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = 'https://www.bing.com/news/search?q=' + encodeURIComponent(a.t);
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    // §8.2: gradient placeholder with category icon
    const grad = CAT_GRAD[a.c] || CAT_GRAD.default;
    const icon = CAT_ICON[a.c] || CAT_ICON.default;
    const ph = document.createElement('div');
    ph.className = 'card-ph';
    ph.style.background = grad;
    ph.textContent = icon;

    const body = document.createElement('div');
    body.className = 'card-body';

    const pub = document.createElement('span');
    pub.className = 'card-pub';
    pub.textContent = a.p;

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = a.t;

    const time = document.createElement('span');
    time.className = 'card-time';
    time.textContent = a.h;

    body.append(pub, title, time);
    card.append(ph, body);
    return card;
  },

  adCard() {
    const d = document.createElement('div');
    d.className = 'card-ad';
    const label = document.createElement('span');
    label.className = 'card-ad-label';
    label.textContent = 'Sponsored';
    const inner = document.createElement('div');
    inner.className = 'card-ad-inner';
    inner.textContent = 'Advertisement';
    d.append(label, inner);
    return d;
  },

  async setupRefresh() {
    const mins = await S.get('feed_interval', 30);
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.renderArticles(), mins * 60 * 1000);
  },

  setupSettings() {
    const modal = document.getElementById('settings-modal');
    const chips = document.getElementById('topic-chips');

    document.getElementById('feed-settings-btn').onclick = async () => {
      const sel = await S.get('feed_topics', []);
      chips.innerHTML = '';
      this.topics.forEach(t => {
        const c = document.createElement('button');
        c.className = 'chip' + (sel.includes(t) ? ' on' : '');
        c.textContent = t;
        c.onclick = () => c.classList.toggle('on');
        chips.appendChild(c);
      });
      document.getElementById('opt-history').checked = await S.get('feed_history', true);
      document.getElementById('opt-ads').checked = await S.get('feed_ads', true);
      document.getElementById('opt-interval').value = String(await S.get('feed_interval', 30));
      modal.hidden = false;
    };

    document.getElementById('settings-close').onclick = () => modal.hidden = true;
    modal.onclick = e => { if (e.target === modal) modal.hidden = true; };

    document.getElementById('settings-save').onclick = async () => {
      const active = [...chips.querySelectorAll('.chip.on')].map(c => c.textContent);
      await S.set('feed_topics', active);
      await S.set('feed_history', document.getElementById('opt-history').checked);
      await S.set('feed_ads', document.getElementById('opt-ads').checked);
      await S.set('feed_interval', parseInt(document.getElementById('opt-interval').value, 10));
      modal.hidden = true;
      this.renderArticles();
      this.setupRefresh();
    };
  }
};

/* ═══════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  BG.init();
  Search.init();
  Bookmarks.init();
  Feed.init();
});
