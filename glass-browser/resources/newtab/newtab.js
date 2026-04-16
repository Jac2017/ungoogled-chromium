/**
 * Glass Browser — New Tab Page
 *
 * Architecture:
 *   - BackgroundManager:  Rotates bucket-list travel/nature images
 *   - SearchController:   Handles Bing search input
 *   - BookmarkController: Renders and manages glass-style bookmark tiles
 *   - FeedController:     Discovery feed with personalization, ads, and auto-refresh
 *   - SettingsController: Manages feed preferences and topic selection
 *   - StorageManager:     Persistence layer using chrome.storage or localStorage
 *
 * Security notes:
 *   - All user-generated content is sanitized before DOM insertion
 *   - External URLs are validated before navigation
 *   - No inline event handlers — all listeners attached programmatically
 *   - CSP-compatible: no eval(), no inline scripts
 */

'use strict';

/* ==========================================================================
   Storage Manager
   ========================================================================== */
const StorageManager = {
  _prefix: 'glass_',

  get(key, fallback = null) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get(this._prefix + key, (result) => {
            resolve(result[this._prefix + key] ?? fallback);
          });
        });
      }
      const raw = localStorage.getItem(this._prefix + key);
      return Promise.resolve(raw ? JSON.parse(raw) : fallback);
    } catch {
      return Promise.resolve(fallback);
    }
  },

  set(key, value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [this._prefix + key]: value }, resolve);
        });
      }
      localStorage.setItem(this._prefix + key, JSON.stringify(value));
      return Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  },
};

/* ==========================================================================
   Text Sanitizer — prevent XSS in dynamic content
   ========================================================================== */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') return '#';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '#';
    return parsed.href;
  } catch {
    return '#';
  }
}

/* ==========================================================================
   Background Manager — Bucket-list travel & nature imagery
   ========================================================================== */
const BackgroundManager = {
  // Curated collection of royalty-free travel/nature image keywords
  // In production, these would be served from a CDN with pre-selected images
  scenes: [
    { query: 'northern-lights-iceland',      credit: 'Iceland Aurora Borealis' },
    { query: 'santorini-greece-sunset',       credit: 'Santorini, Greece' },
    { query: 'machu-picchu-peru',             credit: 'Machu Picchu, Peru' },
    { query: 'bora-bora-french-polynesia',    credit: 'Bora Bora, French Polynesia' },
    { query: 'swiss-alps-matterhorn',         credit: 'Swiss Alps' },
    { query: 'great-barrier-reef-australia',  credit: 'Great Barrier Reef, Australia' },
    { query: 'kyoto-bamboo-forest-japan',     credit: 'Kyoto, Japan' },
    { query: 'patagonia-mountains',           credit: 'Patagonia, Argentina' },
    { query: 'african-safari-elephant',       credit: 'African Safari' },
    { query: 'amalfi-coast-italy',            credit: 'Amalfi Coast, Italy' },
    { query: 'maldives-overwater-villa',      credit: 'Maldives' },
    { query: 'grand-canyon-sunset',           credit: 'Grand Canyon, USA' },
    { query: 'norwegian-fjords',              credit: 'Norwegian Fjords' },
    { query: 'cherry-blossoms-japan',         credit: 'Cherry Blossoms, Japan' },
    { query: 'banff-national-park-canada',    credit: 'Banff, Canada' },
    { query: 'victoria-falls-zambia',         credit: 'Victoria Falls' },
    { query: 'cappadocia-turkey-balloons',    credit: 'Cappadocia, Turkey' },
    { query: 'new-zealand-milford-sound',     credit: 'Milford Sound, New Zealand' },
    { query: 'petra-jordan',                  credit: 'Petra, Jordan' },
    { query: 'aurora-borealis-norway',        credit: 'Northern Lights, Norway' },
  ],

  async init() {
    const bgImage = document.getElementById('bg-image');
    const lastIndex = await StorageManager.get('bg_index', -1);
    const nextIndex = (lastIndex + 1) % this.scenes.length;

    const scene = this.scenes[nextIndex];

    // Use Unsplash source for high-quality travel/nature photos
    // In production, replace with a curated CDN endpoint
    const imageUrl = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(scene.query)}`;

    bgImage.alt = scene.credit;
    bgImage.src = imageUrl;
    bgImage.addEventListener('load', () => bgImage.classList.add('loaded'));
    bgImage.addEventListener('error', () => {
      // Fallback: use a CSS gradient if image fails to load
      document.getElementById('background-layer').style.background =
        'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)';
      bgImage.style.display = 'none';
    });

    await StorageManager.set('bg_index', nextIndex);
  },
};

/* ==========================================================================
   Search Controller — Bing-powered search
   ========================================================================== */
const SearchController = {
  init() {
    const input = document.getElementById('search-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        const query = encodeURIComponent(input.value.trim());
        window.location.href = `https://www.bing.com/search?q=${query}`;
      }
    });

    // Focus search on any keypress when not in an input
    document.addEventListener('keydown', (e) => {
      if (
        e.target === input ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.metaKey || e.ctrlKey || e.altKey
      ) return;

      if (e.key.length === 1) {
        input.focus();
      }
    });
  },
};

/* ==========================================================================
   Bookmark Controller
   ========================================================================== */
const BookmarkController = {
  defaultBookmarks: [
    { name: 'Bing',       url: 'https://www.bing.com',           icon: 'B' },
    { name: 'YouTube',    url: 'https://www.youtube.com',        icon: 'Y' },
    { name: 'Gmail',      url: 'https://mail.google.com',        icon: 'G' },
    { name: 'Reddit',     url: 'https://www.reddit.com',         icon: 'R' },
    { name: 'GitHub',     url: 'https://github.com',             icon: 'H' },
    { name: 'Wikipedia',  url: 'https://www.wikipedia.org',      icon: 'W' },
    { name: 'Twitter',    url: 'https://twitter.com',            icon: 'X' },
    { name: 'Amazon',     url: 'https://www.amazon.com',         icon: 'A' },
    { name: 'Netflix',    url: 'https://www.netflix.com',        icon: 'N' },
    { name: 'LinkedIn',   url: 'https://www.linkedin.com',       icon: 'L' },
    { name: 'Maps',       url: 'https://maps.google.com',       icon: 'M' },
    { name: 'News',       url: 'https://news.bing.com',         icon: 'N' },
    { name: 'Spotify',    url: 'https://open.spotify.com',      icon: 'S' },
    { name: 'Translate',  url: 'https://translate.google.com',  icon: 'T' },
  ],

  async init() {
    const bookmarks = await StorageManager.get('bookmarks', this.defaultBookmarks);
    this.render(bookmarks);
    this.setupEditModal(bookmarks);
  },

  render(bookmarks) {
    const grid = document.getElementById('bookmarks-grid');
    grid.innerHTML = '';

    bookmarks.forEach((bm) => {
      const tile = document.createElement('a');
      tile.className = 'bookmark-tile';
      tile.href = sanitizeUrl(bm.url);
      tile.title = sanitizeText(bm.name);

      const faviconWrap = document.createElement('div');
      faviconWrap.className = 'bookmark-favicon';

      // Use Google's favicon service for real favicons
      const img = document.createElement('img');
      const domain = new URL(sanitizeUrl(bm.url)).hostname;
      img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=48`;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => {
        // Fallback: show initial letter
        img.style.display = 'none';
        const letter = document.createElement('span');
        letter.textContent = bm.icon || bm.name.charAt(0).toUpperCase();
        letter.style.cssText = 'font-size:18px;font-weight:600;color:rgba(255,255,255,0.5);';
        faviconWrap.appendChild(letter);
      });
      faviconWrap.appendChild(img);

      const label = document.createElement('span');
      label.className = 'bookmark-label';
      label.textContent = bm.name;

      tile.appendChild(faviconWrap);
      tile.appendChild(label);
      grid.appendChild(tile);
    });
  },

  setupEditModal(bookmarks) {
    const openBtn = document.getElementById('bookmarks-edit-btn');
    const modal = document.getElementById('bookmark-edit-modal');
    const closeBtn = document.getElementById('bookmark-edit-close');
    const saveBtn = document.getElementById('bookmark-edit-save');
    const addBtn = document.getElementById('bookmark-add-btn');
    const list = document.getElementById('bookmark-edit-list');

    let editData = JSON.parse(JSON.stringify(bookmarks));

    const renderEditList = () => {
      list.innerHTML = '';
      editData.forEach((bm, i) => {
        const item = document.createElement('div');
        item.className = 'bookmark-edit-item';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = bm.name;
        nameInput.placeholder = 'Name';
        nameInput.addEventListener('input', () => { editData[i].name = nameInput.value; });

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = bm.url;
        urlInput.placeholder = 'URL';
        urlInput.addEventListener('input', () => { editData[i].url = urlInput.value; });

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        delBtn.addEventListener('click', () => {
          editData.splice(i, 1);
          renderEditList();
        });

        item.appendChild(nameInput);
        item.appendChild(urlInput);
        item.appendChild(delBtn);
        list.appendChild(item);
      });
    };

    openBtn.addEventListener('click', () => {
      editData = JSON.parse(JSON.stringify(bookmarks));
      renderEditList();
      modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    addBtn.addEventListener('click', () => {
      editData.push({ name: '', url: 'https://', icon: '?' });
      renderEditList();
    });

    saveBtn.addEventListener('click', async () => {
      const valid = editData.filter((bm) => bm.name.trim() && bm.url.trim());
      await StorageManager.set('bookmarks', valid);
      this.render(valid);
      modal.style.display = 'none';
    });
  },
};

/* ==========================================================================
   Feed Controller — Discovery feed with personalization & ads
   ========================================================================== */
const FeedController = {
  // Available topics for personalization
  topics: [
    'Technology', 'Science', 'Business', 'Entertainment', 'Sports',
    'Health', 'Travel', 'Food', 'Gaming', 'Fashion',
    'Politics', 'World News', 'Finance', 'AI & Machine Learning',
    'Space', 'Automotive', 'Music', 'Movies', 'Crypto', 'Fitness',
  ],

  // Simulated articles — in production, sourced from a news aggregation API
  // using browsing history signals for personalization
  sampleArticles: [
    {
      title: 'The Future of AI: How Large Language Models Are Reshaping Every Industry',
      publisher: 'MIT Technology Review',
      image: 'https://source.unsplash.com/600x400/?artificial-intelligence',
      url: 'https://www.bing.com/news/search?q=AI+future',
      time: '2 hours ago',
    },
    {
      title: 'SpaceX Starship Completes Historic Orbital Flight with Full Recovery',
      publisher: 'Space.com',
      image: 'https://source.unsplash.com/600x400/?spacex-rocket',
      url: 'https://www.bing.com/news/search?q=SpaceX+Starship',
      time: '3 hours ago',
    },
    {
      title: 'Apple Vision Pro 2 Leaked: Thinner, Lighter, and More Affordable',
      publisher: 'The Verge',
      image: 'https://source.unsplash.com/600x400/?apple-vr-headset',
      url: 'https://www.bing.com/news/search?q=Apple+Vision+Pro',
      time: '4 hours ago',
    },
    {
      title: 'Global Markets Rally as Central Banks Signal Rate Cuts Coming Soon',
      publisher: 'Bloomberg',
      image: 'https://source.unsplash.com/600x400/?stock-market',
      url: 'https://www.bing.com/news/search?q=global+markets',
      time: '5 hours ago',
    },
    {
      title: 'Scientists Discover New Deep-Sea Species in the Mariana Trench',
      publisher: 'National Geographic',
      image: 'https://source.unsplash.com/600x400/?deep-sea-creatures',
      url: 'https://www.bing.com/news/search?q=deep+sea+discovery',
      time: '6 hours ago',
    },
    {
      title: 'Electric Vehicle Sales Surge Past 50% Market Share in Europe',
      publisher: 'Reuters',
      image: 'https://source.unsplash.com/600x400/?electric-car',
      url: 'https://www.bing.com/news/search?q=EV+sales+Europe',
      time: '7 hours ago',
    },
    {
      title: 'Revolutionary CRISPR Treatment Cures Inherited Blood Disorder',
      publisher: 'Nature Medicine',
      image: 'https://source.unsplash.com/600x400/?dna-genetics',
      url: 'https://www.bing.com/news/search?q=CRISPR+treatment',
      time: '8 hours ago',
    },
    {
      title: 'The Best Running Shoes of 2026: Expert Reviews and Lab Tests',
      publisher: "Runner's World",
      image: 'https://source.unsplash.com/600x400/?running-shoes',
      url: 'https://www.bing.com/news/search?q=best+running+shoes+2026',
      time: '9 hours ago',
    },
    {
      title: 'Japan Opens New Bullet Train Route Connecting Osaka to Hokkaido',
      publisher: 'Travel + Leisure',
      image: 'https://source.unsplash.com/600x400/?japan-bullet-train',
      url: 'https://www.bing.com/news/search?q=Japan+bullet+train',
      time: '10 hours ago',
    },
    {
      title: 'Netflix Announces Interactive AI-Generated Shows Coming This Fall',
      publisher: 'Variety',
      image: 'https://source.unsplash.com/600x400/?streaming-tv',
      url: 'https://www.bing.com/news/search?q=Netflix+AI+shows',
      time: '11 hours ago',
    },
    {
      title: 'Climate Summit Reaches Historic Agreement on Carbon Emissions',
      publisher: 'BBC News',
      image: 'https://source.unsplash.com/600x400/?climate-earth',
      url: 'https://www.bing.com/news/search?q=climate+summit',
      time: '12 hours ago',
    },
    {
      title: 'Quantum Computing Breakthrough: 1000-Qubit Processor Achieved',
      publisher: 'Wired',
      image: 'https://source.unsplash.com/600x400/?quantum-computing',
      url: 'https://www.bing.com/news/search?q=quantum+computing+breakthrough',
      time: '13 hours ago',
    },
  ],

  refreshInterval: null,

  async init() {
    await this.loadArticles();
    this.setupRefresh();
    this.setupSettings();

    document.getElementById('feed-refresh-btn').addEventListener('click', () => {
      this.loadArticles();
    });
  },

  async loadArticles() {
    const feedGrid = document.getElementById('feed-grid');
    const feedLoading = document.getElementById('feed-loading');

    feedLoading.style.display = 'flex';
    feedGrid.innerHTML = '';

    // Simulate network delay for realism
    await new Promise((r) => setTimeout(r, 400));

    const userTopics = await StorageManager.get('feed_topics', []);
    let articles = [...this.sampleArticles];

    // Shuffle for variety on each load
    for (let i = articles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [articles[i], articles[j]] = [articles[j], articles[i]];
    }

    // In production: fetch from news API with user topics and browsing history
    // GET /api/feed?topics=Technology,Science&history_hash=<hash>&limit=20

    feedLoading.style.display = 'none';

    articles.forEach((article, index) => {
      // Insert ad card every 4th position (after 3 real articles)
      if (index > 0 && index % 3 === 0) {
        feedGrid.appendChild(this.createAdCard());
      }
      feedGrid.appendChild(this.createArticleCard(article));
    });
  },

  createArticleCard(article) {
    const card = document.createElement('a');
    card.className = 'article-card';
    card.href = sanitizeUrl(article.url);
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const img = document.createElement('img');
    img.className = 'article-image';
    img.src = article.image;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.style.background = 'linear-gradient(135deg, rgba(100,210,255,0.15), rgba(10,132,255,0.1))';
      img.src = '';
    });

    const body = document.createElement('div');
    body.className = 'article-body';

    const publisher = document.createElement('span');
    publisher.className = 'article-publisher';
    publisher.textContent = sanitizeText(article.publisher);

    const headline = document.createElement('h3');
    headline.className = 'article-headline';
    headline.textContent = sanitizeText(article.title);

    const meta = document.createElement('span');
    meta.className = 'article-meta';
    meta.textContent = sanitizeText(article.time);

    body.appendChild(publisher);
    body.appendChild(headline);
    body.appendChild(meta);

    card.appendChild(img);
    card.appendChild(body);

    return card;
  },

  createAdCard() {
    const card = document.createElement('div');
    card.className = 'ad-card';

    const label = document.createElement('span');
    label.className = 'ad-label';
    label.textContent = 'Sponsored';

    const slot = document.createElement('div');
    slot.className = 'ad-slot';

    // In production: insert Google AdSense script
    // <ins class="adsbygoogle" data-ad-client="ca-pub-XXX" data-ad-slot="YYY"></ins>
    const placeholder = document.createElement('div');
    placeholder.className = 'ad-placeholder';
    placeholder.textContent = 'Advertisement';
    slot.appendChild(placeholder);

    card.appendChild(label);
    card.appendChild(slot);

    return card;
  },

  async setupRefresh() {
    const intervalMinutes = await StorageManager.get('feed_refresh_interval', 30);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(
      () => this.loadArticles(),
      intervalMinutes * 60 * 1000,
    );
  },

  setupSettings() {
    const settingsBtn = document.getElementById('feed-settings-btn');
    const modal = document.getElementById('feed-settings-modal');
    const closeBtn = document.getElementById('feed-settings-close');
    const saveBtn = document.getElementById('feed-settings-save');
    const chipsContainer = document.getElementById('topic-chips');

    settingsBtn.addEventListener('click', async () => {
      const selectedTopics = await StorageManager.get('feed_topics', []);
      const useHistory = await StorageManager.get('feed_use_history', true);
      const showAds = await StorageManager.get('feed_show_ads', true);
      const refreshInterval = await StorageManager.get('feed_refresh_interval', 30);

      document.getElementById('history-toggle').checked = useHistory;
      document.getElementById('ads-toggle').checked = showAds;
      document.getElementById('refresh-interval').value = String(refreshInterval);

      chipsContainer.innerHTML = '';
      this.topics.forEach((topic) => {
        const chip = document.createElement('button');
        chip.className = 'topic-chip' + (selectedTopics.includes(topic) ? ' active' : '');
        chip.textContent = topic;
        chip.addEventListener('click', () => chip.classList.toggle('active'));
        chipsContainer.appendChild(chip);
      });

      modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    saveBtn.addEventListener('click', async () => {
      const activeChips = chipsContainer.querySelectorAll('.topic-chip.active');
      const topics = Array.from(activeChips).map((c) => c.textContent);

      await StorageManager.set('feed_topics', topics);
      await StorageManager.set('feed_use_history', document.getElementById('history-toggle').checked);
      await StorageManager.set('feed_show_ads', document.getElementById('ads-toggle').checked);
      await StorageManager.set('feed_refresh_interval',
        parseInt(document.getElementById('refresh-interval').value, 10));

      modal.style.display = 'none';
      this.loadArticles();
      this.setupRefresh();
    });
  },
};

/* ==========================================================================
   Initialize on DOM ready
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  BackgroundManager.init();
  SearchController.init();
  BookmarkController.init();
  FeedController.init();
});
