# Security Policy — Governance Layer

**Version**: 1.0 | **Framework**: OWASP Top 10 | **Verbindlichkeit**: BLOCKING

## GELTUNGSBEREICH

Alle Produkte, alle Code-Generierungen, alle Deployments. Security Violations sind **immer blocking** — kein Deployment mit offenen Critical/High Findings.

---

## OWASP TOP 10 — PFLICHT-CHECKS

### A01: Broken Access Control
**Anforderungen:**
- Alle Routen/Funktionen mit expliziter Autorisierungsprüfung
- Principle of Least Privilege: nur nötige Berechtigungen
- Keine direkten Objekt-Referenzen ohne Autorisierungsprüfung
- Client-Side Access Control ist KEIN Schutz (immer server-seitig validieren)

**Für Frontend-Apps:**
- Sensible Daten NIEMALS nur via CSS verstecken
- Admin-Funktionen per Feature-Flag + Role-Check schützen

### A02: Cryptographic Failures
**Anforderungen:**
- HTTPS überall (kein HTTP in Production)
- Keine sensiblen Daten im LocalStorage ohne Verschlüsselung
- Keine Passwörter/Tokens in Logs, URLs, Error-Messages
- Starke Passwort-Hashing Algorithmen (bcrypt, argon2) wenn Backend vorhanden

**Verboten:**
```javascript
// VERBOTEN
localStorage.setItem('auth_token', token);        // Unverschlüsselt
console.log('User token:', user.authToken);        // In Logs
fetch(`/api?token=${secretToken}`);                // In URL
```

### A03: Injection (XSS, SQL, Command)
**XSS Prevention — PFLICHT:**
```javascript
// IMMER: DOM-API statt innerHTML
element.textContent = userInput;          // SICHER
element.appendChild(document.createTextNode(userInput));  // SICHER

// NIEMALS mit User-Input:
element.innerHTML = userInput;            // GEFÄHRLICH
document.write(userInput);               // GEFÄHRLICH

// Template Literals mit User-Input:
element.innerHTML = `<b>${userInput}</b>`;  // GEFÄHRLICH
```

**Content Security Policy (PFLICHT-Header):**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self';
  font-src 'self';
  object-src 'none';
  frame-ancestors 'none';
```

**Input Validation:**
```javascript
// PFLICHT für alle User-Inputs
function validateAmount(input) {
  const num = parseFloat(input);
  if (isNaN(num) || num < 0 || num > 999999.99) {
    throw new Error('Ungültiger Betrag');
  }
  return Math.round(num * 100) / 100; // Auf 2 Dezimalstellen runden
}

function validateDate(input) {
  const date = new Date(input);
  if (isNaN(date.getTime())) throw new Error('Ungültiges Datum');
  return date.toISOString().split('T')[0];
}

function sanitizeString(str, maxLength = 500) {
  return String(str).trim().slice(0, maxLength)
    .replace(/[<>]/g, ''); // Minimale Sanitization
}
```

### A04: Insecure Design
**Threat Model für jedes Produkt:**
- Welche Daten sind sensitiv? (definiert in config.yaml)
- Wer greift zu? (Personas inkl. Hacker Hans)
- Was ist der Worst Case? (Datenverlust, Datenschutz, Reputationsschaden)

**Für ExpenseTracker:**
- Finanzdaten = sensitiv (Kategorie: CONFIDENTIAL)
- Beleg-Fotos = sensitiv (persönliche Ausgaben sichtbar)
- Export-Daten = hochsensitiv (Steuerrelevant)

### A05: Security Misconfiguration
**Pflicht-Checks:**
- Keine Default-Credentials
- Error-Messages: keine Stack Traces in Production
- Keine unnötigen Features/APIs aktiviert
- Security-Headers immer gesetzt

**Pflicht Security-Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### A06: Vulnerable Components
**Dependency Management:**
- Wöchentlicher Dependency-Scan (automatisiert)
- CVE CRITICAL → Auto-Update innerhalb 24h (FULL AUTONOMY)
- CVE HIGH → Update innerhalb 72h (BATCH APPROVAL)
- CVE MEDIUM → Next Sprint
- Keine Abhängigkeiten von unmaintained Packages (>1 Jahr ohne Update)

### A07: Identification & Authentication Failures
**Session Management (wenn relevant):**
- Session Timeout: 30 min Inaktivität
- Secure + HttpOnly Cookies
- CSRF-Token für State-Mutating Operations

### A08: Software & Data Integrity
**Für externe Ressourcen:**
- Subresource Integrity (SRI) für CDN-Ressourcen
- Verifizierung von File-Uploads (MIME-Type + Content-Check)

**File Upload Security (PFLICHT für Beleg-Fotos):**
```javascript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFileUpload(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Dateityp nicht erlaubt: ${file.type}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Datei zu groß (max. 10MB)');
  }
  return true;
}
```

### A09: Security Logging & Monitoring
**Logging-Anforderungen:**
```javascript
// Was geloggt werden MUSS:
// - Failed login attempts
// - Access control failures
// - Input validation failures
// - Security exceptions

// Was NIEMALS geloggt werden darf:
// - Passwörter
// - Session Tokens
// - Vollständige Kreditkartennummern
// - Persönliche Finanzdaten
```

### A10: Server-Side Request Forgery (SSRF)
- Keine User-gesteuerten URLs für Server-Requests
- Whitelist für externe Services

---

## DATENSCHUTZ (DSGVO/GDPR)

### Für ExpenseTracker (Pflicht)
```yaml
data_categories:
  financial_data:
    classification: CONFIDENTIAL
    retention: 10_years  # Steuerrechtlich
    encryption: required
    export: user_controlled

  receipt_images:
    classification: PERSONAL
    retention: user_controlled
    location: local_only  # Kein Cloud-Upload ohne explizite Zustimmung

  usage_analytics:
    classification: ANONYMOUS
    collection: opt_in_only
```

**Pflicht-Features:**
- Daten-Export (DSGVO Art. 20): User kann alle Daten exportieren
- Recht auf Löschung (DSGVO Art. 17): Vollständige Datenlöschung möglich
- Privacy by Design: Minimale Datenerhebung

---

## SECURITY REVIEW PROZESS

### Automatisch (jeder Build)
1. Dependency-Vulnerability-Scan
2. XSS-Pattern-Scan im generierten Code
3. Sensitive-Data-Leak-Scan (Passwörter, Tokens in Code)
4. CSP-Header-Check
5. HTTPS-Check

### Manuell (Security Challenger Agent)
- Simuliert Hacker Hans Persona
- Tests: XSS, CSRF, Injection, File Upload Bypass, Auth Bypass
- Output: Security Report mit Severity-Ratings

### Severity-Ratings
| Severity | Action | Timeline |
|----------|--------|----------|
| CRITICAL | Sofort stoppen, nicht deployen | Sofort |
| HIGH | Fix vor Deployment (blocking) | <24h |
| MEDIUM | Fix im nächsten Sprint | <1 Woche |
| LOW | Backlog | <1 Monat |
| INFO | Dokumentieren | Nach Bedarf |

---

## INCIDENT RESPONSE

```
1. Erkennung → Sofort in state/system-state.yaml dokumentieren
2. Eindämmung → Auto-Rollback wenn möglich
3. Analyse → Root Cause Analysis
4. Behebung → Fix + Test + Gate
5. Post-Mortem → Lessons Learned dokumentieren
```

**HUMAN REQUIRED bei:**
- Data Breach (Nutzerdaten betroffen)
- CRITICAL CVE in Production
- Authentication Bypass entdeckt
- Compliance-Verletzung (DSGVO)
