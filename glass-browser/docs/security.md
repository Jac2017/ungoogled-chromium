# Glass Browser — Security Documentation

## Security Principles

Glass Browser inherits Chromium's industry-leading security architecture and
extends it with additional privacy features from ungoogled-chromium. Security,
stability, and utility are paramount design constraints.

### 1. Defense in Depth

```
Layer 1: Network          — TLS, HSTS, Certificate Transparency
Layer 2: Process Sandbox  — Site isolation, renderer sandboxing
Layer 3: Permissions      — Extension manifest v3, origin-based
Layer 4: Content Security — CSP, XSS prevention, input sanitization
Layer 5: Privacy          — No Google telemetry, domain substitution
Layer 6: User Control     — Configurable features, removable extensions
```

### 2. Threat Model

| Threat                          | Mitigation                                    |
|---------------------------------|-----------------------------------------------|
| XSS in NTP/sidebar             | DOM API (textContent), no innerHTML with data |
| Malicious extension             | Manifest V3, Chrome Web Store review          |
| API key exposure (Claude)       | chrome.storage.local, background SW proxy     |
| Man-in-the-middle               | TLS 1.3, HSTS preload, cert pinning          |
| Tracking / fingerprinting       | ungoogled-chromium privacy patches            |
| Renderer exploit                | Chromium sandbox, site isolation               |
| Malicious ad content            | CSP headers, sandboxed iframes                |
| Feed content injection          | Server-side sanitization + client escaping     |

## Code Security Practices

### Input Sanitization

All user-generated and external content is sanitized before DOM insertion:

```javascript
// Text sanitization — used for all dynamic text content
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// URL validation — used for all navigation targets
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
```

### Content Security Policy

The New Tab Page and sidebar panels enforce strict CSP:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https: data:;
  connect-src 'self' https://api.bing.microsoft.com https://api.anthropic.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
```

Key restrictions:
- **No `eval()`** — All JavaScript is static, no dynamic code execution
- **No inline scripts** — All event handlers attached programmatically
- **No `innerHTML` with user data** — Only `textContent` or sanitized content
- **No external scripts** — All JS bundled locally
- **Restricted image sources** — Only HTTPS and data URIs

### Claude API Security

```
┌────────────────────┐     ┌─────────────────────┐
│  Claude Panel      │     │  Background Service  │
│  (WebView)         │────▶│  Worker              │
│                    │     │                      │
│  - No API key      │     │  - Holds API key     │
│  - Sends messages  │     │  - Validates input   │
│  - Receives text   │     │  - Rate limits       │
│                    │     │  - Proxies to API    │
└────────────────────┘     └──────────┬───────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │  Anthropic API       │
                           │  (api.anthropic.com) │
                           │                      │
                           │  TLS 1.3, API key    │
                           │  in header           │
                           └─────────────────────┘
```

**API Key Storage:**
- Stored in `chrome.storage.local` (encrypted at rest by Chromium)
- Never exposed to page context or console
- Never included in sync data
- User enters key in Settings; it goes directly to storage

**Request Validation:**
- Message content is validated before sending
- Rate limiting: max 10 requests/minute
- Max message length: 4000 characters
- Response content is escaped before display

### Extension Security

**Honey (Bundled):**
- Installed from Chrome Web Store with signature verification
- Updates through Chrome's CRX update mechanism
- User can disable or remove at any time
- Runs under standard extension permissions (no special access)
- Manifest V3 compliant

**Extension Policy:**
- No silent extension installations
- No force-installed extensions (user can always remove)
- Manifest V2 support maintained for compatibility (via ungoogled-chromium patch)
- Extension permissions displayed clearly during installation

### Privacy

Glass Browser inherits all ungoogled-chromium privacy features:

- **No Google telemetry** — All Google services removed
- **No Safe Browsing calls** — `safe_browsing_mode = 0`
- **No crash reporting** — Disabled at build time
- **No Google API keys** — Empty strings
- **Domain substitution** — Google domains replaced with non-routable addresses
- **No extension auto-update from Google** — Updates are explicit

**Additional Glass privacy measures:**
- Feed data is fetched via Bing News API (no Google dependency)
- Browsing history for feed personalization stays local
- No user profile data sent to external services
- Claude API calls are opt-in and contain only user-initiated content

### Data Storage

| Data                    | Storage Location       | Encryption | Sync |
|-------------------------|------------------------|------------|------|
| Bookmarks               | chrome.storage.local   | At rest    | No   |
| Feed topics             | chrome.storage.local   | At rest    | No   |
| Feed refresh interval   | chrome.storage.local   | At rest    | No   |
| Claude API key          | chrome.storage.local   | At rest    | No   |
| Claude conversation     | In-memory only         | N/A        | No   |
| Tab groups              | In-memory + tabs API   | N/A        | No   |
| Background image index  | localStorage           | No         | No   |

## Build Security

### Reproducible Builds
- All source code is deterministically patched
- Binary pruning removes pre-built executables
- Build flags disable telemetry at compile time
- Domain substitution prevents accidental Google requests

### Supply Chain
- Chromium source verified by hash
- ungoogled-chromium patches reviewed by maintainers
- Glass patches are open source and auditable
- Honey installed from official Chrome Web Store
- No third-party build tools or closed-source dependencies

## Vulnerability Response

If you discover a security vulnerability in Glass Browser:

1. **Chromium core issues:** Report to Chromium's security team
   (this is upstream and affects all Chromium-based browsers)
2. **Glass-specific issues:** Report via GitHub Security Advisory
3. **ungoogled-chromium issues:** Report to the ungoogled-chromium project

Do not disclose vulnerabilities publicly until a fix is available.
