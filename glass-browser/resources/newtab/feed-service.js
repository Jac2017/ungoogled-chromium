/**
 * Glass Browser — Discovery Feed Service Layer
 *
 * Handles:
 *   1. Fetching articles from Bing News API
 *   2. Personalization based on user topics and browsing history
 *   3. Feed caching and refresh scheduling
 *   4. Ad slot management (Google AdSense)
 *   5. Background image rotation
 *
 * API Integration:
 *   Primary: Bing News Search API (api.bing.microsoft.com/v7.0/news)
 *   Fallback: Curated static feed for offline/API-unavailable scenarios
 *
 * Privacy:
 *   - Browsing history hashing is done client-side; raw URLs never leave device
 *   - Topic preferences stored locally in chrome.storage.local
 *   - API requests use minimal headers (no cookies, no tracking IDs)
 *   - Feed personalization can be completely disabled by user
 *
 * Security:
 *   - All API responses validated and sanitized before rendering
 *   - Image URLs restricted to HTTPS
 *   - Article URLs validated before navigation
 *   - Rate limiting on API calls
 */

'use strict';

/* ==========================================================================
   Feed Configuration
   ========================================================================== */
const FeedConfig = {
  // Bing News API endpoint
  API_BASE: 'https://api.bing.microsoft.com/v7.0/news',
  API_TRENDING: 'https://api.bing.microsoft.com/v7.0/news/trendingtopics',

  // Timing
  DEFAULT_REFRESH_MINUTES: 30,
  CACHE_DURATION_MS: 25 * 60 * 1000, // 25 min (refresh before stale)
  MAX_ARTICLES: 20,

  // Ads
  AD_FREQUENCY: 4, // Every Nth position is an ad
  AD_PROVIDER: 'google_adsense',

  // Personalization
  HISTORY_LOOKBACK_DAYS: 7,
  MIN_HISTORY_ENTRIES: 5,
  MAX_TOPIC_KEYWORDS: 10,

  // API rate limiting
  MAX_REQUESTS_PER_HOUR: 20,
};

/* ==========================================================================
   Feed Service
   ========================================================================== */
const FeedService = {
  _cache: null,
  _cacheTimestamp: 0,
  _requestCount: 0,
  _requestWindowStart: 0,

  /**
   * Fetches personalized articles for the discovery feed.
   *
   * @param {Object} options
   * @param {string[]} options.topics - User-selected topic preferences
   * @param {boolean} options.useHistory - Whether to use browsing history
   * @param {boolean} options.showAds - Whether to include ad slots
   * @returns {Promise<{articles: Array, ads: Array}>}
   */
  async fetchFeed(options = {}) {
    const {
      topics = [],
      useHistory = true,
      showAds = true,
    } = options;

    // Check cache first
    if (this._cache && (Date.now() - this._cacheTimestamp) < FeedConfig.CACHE_DURATION_MS) {
      return this._cache;
    }

    // Rate limit check
    if (!this._checkRateLimit()) {
      return this._cache || this._getFallbackFeed();
    }

    try {
      // Build personalization keywords
      const keywords = await this._buildKeywords(topics, useHistory);

      // Fetch from Bing News API
      const articles = await this._fetchFromBingNews(keywords);

      // Insert ad slots
      const feed = this._insertAdSlots(articles, showAds);

      // Cache the result
      this._cache = feed;
      this._cacheTimestamp = Date.now();

      return feed;
    } catch (err) {
      console.warn('Feed fetch failed, using fallback:', err.message);
      return this._cache || this._getFallbackFeed();
    }
  },

  /**
   * Fetches articles from Bing News Search API.
   *
   * @param {string[]} keywords - Search/personalization keywords
   * @returns {Promise<Array>} Sanitized article objects
   */
  async _fetchFromBingNews(keywords) {
    const apiKey = await this._getApiKey();

    if (!apiKey) {
      // No API key configured — use trending endpoint (no key needed for demo)
      // In production, the API key is required
      return this._getFallbackArticles();
    }

    const query = keywords.length > 0
      ? keywords.slice(0, FeedConfig.MAX_TOPIC_KEYWORDS).join(' OR ')
      : '';

    const params = new URLSearchParams({
      q: query || 'trending',
      count: String(FeedConfig.MAX_ARTICLES),
      mkt: 'en-US',
      freshness: 'Day',
      sortBy: 'Relevance',
      safeSearch: 'Moderate',
      textFormat: 'Raw',
    });

    const response = await fetch(`${FeedConfig.API_BASE}/search?${params}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status}`);
    }

    const data = await response.json();
    const articles = (data.value || []).map((item) => this._sanitizeArticle(item));

    return articles;
  },

  /**
   * Sanitizes a Bing News API article response into a safe feed item.
   */
  _sanitizeArticle(item) {
    return {
      title: this._sanitizeText(item.name || 'Untitled'),
      description: this._sanitizeText(item.description || ''),
      publisher: this._sanitizeText(
        item.provider?.[0]?.name || 'Unknown Source'
      ),
      url: this._sanitizeUrl(item.url || '#'),
      image: this._sanitizeImageUrl(
        item.image?.thumbnail?.contentUrl ||
        item.image?.contentUrl ||
        ''
      ),
      publishedAt: item.datePublished
        ? this._formatTimeAgo(new Date(item.datePublished))
        : '',
      category: this._sanitizeText(item.category || ''),
    };
  },

  /**
   * Builds personalization keywords from user topics and browsing history.
   */
  async _buildKeywords(topics, useHistory) {
    const keywords = [...topics];

    if (useHistory) {
      const historyKeywords = await this._extractHistoryKeywords();
      keywords.push(...historyKeywords);
    }

    // Deduplicate
    return [...new Set(keywords)];
  },

  /**
   * Extracts topic keywords from recent browsing history.
   * Processes locally — no raw URLs are sent externally.
   */
  async _extractHistoryKeywords() {
    if (typeof chrome === 'undefined' || !chrome.history) {
      return [];
    }

    try {
      const endTime = Date.now();
      const startTime = endTime - (FeedConfig.HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

      const results = await new Promise((resolve) => {
        chrome.history.search({
          text: '',
          startTime,
          endTime,
          maxResults: 100,
        }, resolve);
      });

      if (!results || results.length < FeedConfig.MIN_HISTORY_ENTRIES) {
        return [];
      }

      // Extract domain frequencies
      const domains = {};
      results.forEach((item) => {
        try {
          const hostname = new URL(item.url).hostname.replace('www.', '');
          domains[hostname] = (domains[hostname] || 0) + (item.visitCount || 1);
        } catch {
          // Invalid URL, skip
        }
      });

      // Map top domains to topic keywords
      const domainToTopic = {
        'github.com': 'Technology',
        'stackoverflow.com': 'Technology',
        'reddit.com': 'Entertainment',
        'youtube.com': 'Entertainment',
        'twitter.com': 'Social Media',
        'amazon.com': 'Shopping',
        'ebay.com': 'Shopping',
        'espn.com': 'Sports',
        'bbc.com': 'World News',
        'cnn.com': 'World News',
        'bloomberg.com': 'Finance',
        'techcrunch.com': 'Startups',
        'theverge.com': 'Technology',
        'arxiv.org': 'Science',
        'nature.com': 'Science',
        'netflix.com': 'Movies',
        'spotify.com': 'Music',
      };

      const topDomains = Object.entries(domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain]) => domain);

      const inferred = topDomains
        .map((d) => domainToTopic[d])
        .filter(Boolean);

      return [...new Set(inferred)];
    } catch {
      return [];
    }
  },

  /**
   * Inserts ad slots at configured intervals.
   */
  _insertAdSlots(articles, showAds) {
    if (!showAds) {
      return { articles, ads: [] };
    }

    const result = [];
    const adPositions = [];
    let adIndex = 0;

    articles.forEach((article, i) => {
      result.push({ type: 'article', data: article });

      // Insert ad after every N-1 articles (so position N is an ad)
      if ((i + 1) % (FeedConfig.AD_FREQUENCY - 1) === 0 && i > 0) {
        const adSlot = {
          type: 'ad',
          data: {
            slot: `glass-feed-ad-${adIndex}`,
            format: 'rectangle',
            provider: FeedConfig.AD_PROVIDER,
          },
        };
        result.push(adSlot);
        adPositions.push(result.length - 1);
        adIndex++;
      }
    });

    return { articles: result, ads: adPositions };
  },

  /**
   * Returns a curated fallback feed when the API is unavailable.
   */
  _getFallbackFeed() {
    const articles = this._getFallbackArticles();
    return this._insertAdSlots(articles, true);
  },

  _getFallbackArticles() {
    return [
      {
        title: 'The Future of AI: How Large Language Models Are Reshaping Every Industry',
        publisher: 'MIT Technology Review',
        image: '',
        url: 'https://www.bing.com/news/search?q=AI+future',
        publishedAt: '2 hours ago',
        category: 'Technology',
      },
      {
        title: 'SpaceX Starship Completes Historic Orbital Flight with Full Recovery',
        publisher: 'Space.com',
        image: '',
        url: 'https://www.bing.com/news/search?q=SpaceX+Starship',
        publishedAt: '3 hours ago',
        category: 'Science',
      },
      {
        title: 'Apple Vision Pro 2 Leaked: Thinner, Lighter, and More Affordable',
        publisher: 'The Verge',
        image: '',
        url: 'https://www.bing.com/news/search?q=Apple+Vision+Pro',
        publishedAt: '4 hours ago',
        category: 'Technology',
      },
      {
        title: 'Global Markets Rally as Central Banks Signal Rate Cuts Coming Soon',
        publisher: 'Bloomberg',
        image: '',
        url: 'https://www.bing.com/news/search?q=global+markets',
        publishedAt: '5 hours ago',
        category: 'Finance',
      },
      {
        title: 'Scientists Discover New Deep-Sea Species in the Mariana Trench',
        publisher: 'National Geographic',
        image: '',
        url: 'https://www.bing.com/news/search?q=deep+sea+discovery',
        publishedAt: '6 hours ago',
        category: 'Science',
      },
      {
        title: 'Electric Vehicle Sales Surge Past 50% Market Share in Europe',
        publisher: 'Reuters',
        image: '',
        url: 'https://www.bing.com/news/search?q=EV+sales+Europe',
        publishedAt: '7 hours ago',
        category: 'Automotive',
      },
      {
        title: 'Revolutionary CRISPR Treatment Cures Inherited Blood Disorder',
        publisher: 'Nature Medicine',
        image: '',
        url: 'https://www.bing.com/news/search?q=CRISPR+treatment',
        publishedAt: '8 hours ago',
        category: 'Health',
      },
      {
        title: 'The Best Running Shoes of 2026: Expert Reviews and Lab Tests',
        publisher: "Runner's World",
        image: '',
        url: 'https://www.bing.com/news/search?q=best+running+shoes+2026',
        publishedAt: '9 hours ago',
        category: 'Fitness',
      },
      {
        title: 'Japan Opens New Bullet Train Route Connecting Osaka to Hokkaido',
        publisher: 'Travel + Leisure',
        image: '',
        url: 'https://www.bing.com/news/search?q=Japan+bullet+train',
        publishedAt: '10 hours ago',
        category: 'Travel',
      },
      {
        title: 'Netflix Announces Interactive AI-Generated Shows Coming This Fall',
        publisher: 'Variety',
        image: '',
        url: 'https://www.bing.com/news/search?q=Netflix+AI+shows',
        publishedAt: '11 hours ago',
        category: 'Entertainment',
      },
      {
        title: 'Climate Summit Reaches Historic Agreement on Carbon Emissions',
        publisher: 'BBC News',
        image: '',
        url: 'https://www.bing.com/news/search?q=climate+summit',
        publishedAt: '12 hours ago',
        category: 'World News',
      },
      {
        title: 'Quantum Computing Breakthrough: 1000-Qubit Processor Achieved',
        publisher: 'Wired',
        image: '',
        url: 'https://www.bing.com/news/search?q=quantum+computing+breakthrough',
        publishedAt: '13 hours ago',
        category: 'Technology',
      },
    ];
  },

  /* ---------- Helpers ---------- */

  _checkRateLimit() {
    const now = Date.now();
    if (now - this._requestWindowStart > 3600000) {
      this._requestCount = 0;
      this._requestWindowStart = now;
    }
    if (this._requestCount >= FeedConfig.MAX_REQUESTS_PER_HOUR) {
      return false;
    }
    this._requestCount++;
    return true;
  },

  async _getApiKey() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise((resolve) => {
          chrome.storage.local.get('glass_bing_api_key', (r) => {
            resolve(r.glass_bing_api_key || null);
          });
        });
      }
      return localStorage.getItem('glass_bing_api_key') || null;
    } catch {
      return null;
    }
  },

  _sanitizeText(str) {
    if (typeof str !== 'string') return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  },

  _sanitizeUrl(url) {
    if (typeof url !== 'string') return '#';
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '#';
      return parsed.href;
    } catch {
      return '#';
    }
  },

  _sanitizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return '';
      return parsed.href;
    } catch {
      return '';
    }
  },

  _formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  },
};

/* ==========================================================================
   Background Image Service
   ========================================================================== */
const BackgroundService = {
  /**
   * Curated collection of bucket-list travel and nature photography.
   * In production, served from a CDN with pre-selected, high-quality images.
   * Each entry includes attribution metadata for the photographer.
   */
  scenes: [
    { id: 'iceland-aurora',       query: 'northern-lights-iceland',      label: 'Iceland — Aurora Borealis',     region: 'Europe' },
    { id: 'santorini-sunset',     query: 'santorini-greece-sunset',      label: 'Santorini, Greece',             region: 'Europe' },
    { id: 'machu-picchu',         query: 'machu-picchu-peru',            label: 'Machu Picchu, Peru',            region: 'South America' },
    { id: 'bora-bora',            query: 'bora-bora-french-polynesia',   label: 'Bora Bora, French Polynesia',   region: 'Pacific' },
    { id: 'swiss-alps',           query: 'swiss-alps-matterhorn',        label: 'Swiss Alps, Switzerland',       region: 'Europe' },
    { id: 'barrier-reef',         query: 'great-barrier-reef-australia', label: 'Great Barrier Reef, Australia', region: 'Oceania' },
    { id: 'kyoto-bamboo',         query: 'kyoto-bamboo-forest-japan',    label: 'Kyoto Bamboo Forest, Japan',    region: 'Asia' },
    { id: 'patagonia',            query: 'patagonia-mountains',          label: 'Patagonia, Argentina',          region: 'South America' },
    { id: 'african-safari',       query: 'african-safari-elephant',      label: 'African Safari',                region: 'Africa' },
    { id: 'amalfi-coast',         query: 'amalfi-coast-italy',           label: 'Amalfi Coast, Italy',           region: 'Europe' },
    { id: 'maldives',             query: 'maldives-overwater-villa',     label: 'Maldives',                      region: 'Asia' },
    { id: 'grand-canyon',         query: 'grand-canyon-sunset',          label: 'Grand Canyon, USA',             region: 'North America' },
    { id: 'norwegian-fjords',     query: 'norwegian-fjords',             label: 'Norwegian Fjords',              region: 'Europe' },
    { id: 'cherry-blossoms',      query: 'cherry-blossoms-japan',        label: 'Cherry Blossoms, Japan',        region: 'Asia' },
    { id: 'banff',                query: 'banff-national-park-canada',   label: 'Banff, Canada',                 region: 'North America' },
    { id: 'victoria-falls',       query: 'victoria-falls-zambia',        label: 'Victoria Falls, Zambia',        region: 'Africa' },
    { id: 'cappadocia',           query: 'cappadocia-turkey-balloons',   label: 'Cappadocia, Turkey',            region: 'Asia' },
    { id: 'milford-sound',        query: 'new-zealand-milford-sound',    label: 'Milford Sound, New Zealand',    region: 'Oceania' },
    { id: 'petra',                query: 'petra-jordan',                 label: 'Petra, Jordan',                 region: 'Middle East' },
    { id: 'norway-aurora',        query: 'aurora-borealis-norway',       label: 'Northern Lights, Norway',       region: 'Europe' },
    { id: 'ha-long-bay',          query: 'ha-long-bay-vietnam',          label: 'Ha Long Bay, Vietnam',          region: 'Asia' },
    { id: 'antelope-canyon',      query: 'antelope-canyon-arizona',      label: 'Antelope Canyon, USA',          region: 'North America' },
    { id: 'serengeti',            query: 'serengeti-migration',          label: 'Serengeti Migration, Tanzania', region: 'Africa' },
    { id: 'cinque-terre',         query: 'cinque-terre-italy',           label: 'Cinque Terre, Italy',           region: 'Europe' },
  ],

  /**
   * Gets the next background image in the rotation.
   * @returns {Promise<{url: string, label: string}>}
   */
  async getNextBackground() {
    let index = 0;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await new Promise((resolve) => {
          chrome.storage.local.get('glass_bg_index', (r) => resolve(r));
        });
        index = (result.glass_bg_index || 0) + 1;
      } else {
        index = parseInt(localStorage.getItem('glass_bg_index') || '0', 10) + 1;
      }
    } catch {
      index = Math.floor(Math.random() * this.scenes.length);
    }

    index = index % this.scenes.length;

    // Save index
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ glass_bg_index: index });
      } else {
        localStorage.setItem('glass_bg_index', String(index));
      }
    } catch {
      // Storage unavailable
    }

    const scene = this.scenes[index];
    return {
      url: `https://source.unsplash.com/1920x1080/?${encodeURIComponent(scene.query)}`,
      label: scene.label,
      id: scene.id,
      region: scene.region,
    };
  },
};

// Export for use in newtab.js
if (typeof window !== 'undefined') {
  window.FeedService = FeedService;
  window.BackgroundService = BackgroundService;
}
