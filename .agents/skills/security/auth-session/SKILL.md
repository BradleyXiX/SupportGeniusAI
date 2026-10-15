---
name: auth-session
description: Enterprise authentication, session lifecycle, and authorization standards enforcing industry-standard cryptography, HttpOnly cookies, RBAC, and rate limiting.
---

# Authentication, Session Lifecycle & RBAC Standards

The `auth-session` skill establishes the cryptographic and architectural requirements for identity, session lifecycle management, and access control across SupportGeniusAI. Authenticated sessions represent high-value targets; compromise allows unauthorized access to customer records and AI assistants.

---

## 1. Absolute Prohibition of Custom Cryptography & DIY Tokens

Agents must **never** author custom encryption algorithms, homebrewed hash functions, or makeshift token encoders.

### Cryptographic Standards
1. **Password Hashing**: Mandate `argon2id` (or `bcrypt` with work factor ≥ 12 when argon2 is unavailable).
   - Time cost: 3 iterations
   - Memory cost: 64 MB (65536 KiB)
   - Parallelism: 4 threads
2. **Token Signatures & Verification**:
   - Use audited libraries (`jose` or `jsonwebtoken`).
   - Mandate asymmetric keys (EdDSA / ES256) or hardened HMAC-SHA256 (`HS256`) with secrets ≥ 256 bits (32 bytes).
   - Reject unverified algorithms (`alg: "none"` must throw an unrecoverable validation error).

---

## 2. Hardened Session Cookies

Tokens must never be stored in browser `localStorage` or `sessionStorage` due to susceptibility to XSS exfiltration. All authentication tokens and session identifiers must be transported via **HttpOnly cookies**.

### Production Cookie Configuration

```javascript
export const SESSION_COOKIE_NAME = '__Host-supportgenius_session';

export const sessionCookieOptions = {
  httpOnly: true, // Prevents JavaScript document.cookie access
  secure: process.env.NODE_ENV === 'production', // Transmitted exclusively over HTTPS
  sameSite: 'strict', // Blocks cross-site request forgery (CSRF)
  path: '/', // Scoped to entire domain
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions);
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    ...sessionCookieOptions,
    maxAge: 0,
  });
}
```

---

## 3. Role-Based Access Control (RBAC) Middleware

SupportGeniusAI enforces a strict, fail-closed RBAC hierarchy:
- `owner`: Full organization and billing control.
- `admin`: Knowledge base, team member, and prompt management.
- `agent`: Live ticket response, customer interaction, triage.
- `viewer`: Read-only telemetry and ticket review.

### Fail-Closed RBAC Middleware Factory

```javascript
export const Roles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  AGENT: 'agent',
  VIEWER: 'viewer',
};

const RoleHierarchy = {
  [Roles.OWNER]: [Roles.OWNER, Roles.ADMIN, Roles.AGENT, Roles.VIEWER],
  [Roles.ADMIN]: [Roles.ADMIN, Roles.AGENT, Roles.VIEWER],
  [Roles.AGENT]: [Roles.AGENT, Roles.VIEWER],
  [Roles.VIEWER]: [Roles.VIEWER],
};

export function requireRole(minimumRequiredRole) {
  return (req, res, next) => {
    const user = req.user;

    // Fail-Closed: Deny if unauthenticated
    if (!user || !user.role) {
      return res.status(401).json({
        type: 'https://supportgenius.ai/errors/unauthorized',
        title: 'Authentication Required',
        status: 401,
        detail: 'A valid authenticated session is required to access this resource.',
      });
    }

    const permittedRoles = RoleHierarchy[user.role] || [];

    // Verify privilege against role hierarchy
    if (!permittedRoles.includes(minimumRequiredRole)) {
      return res.status(403).json({
        type: 'https://supportgenius.ai/errors/forbidden',
        title: 'Insufficient Permissions',
        status: 403,
        detail: `This operation requires '${minimumRequiredRole}' privilege level. Your role is '${user.role}'.`,
      });
    }

    next();
  };
}
```

---

## 4. Brute-Force Rate Limiting on Sensitive Endpoints

Authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password`) must be shielded against credential stuffing and dictionary attacks.

### Multi-Tier Rate Limiting Configuration

```javascript
import rateLimit from 'express-rate-limit';

// Strict limiter for authentication attempts
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5, // Limit each IP to 5 failed attempts per window
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed logins
  message: {
    type: 'https://supportgenius.ai/errors/rate-limit-exceeded',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Too many failed login attempts from this IP. Please try again after 15 minutes.',
  },
});

// General API limiter for authenticated requests
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## 5. Security & Session Checklist

- [ ] Password verification utilizes `argon2id` or `bcrypt` with work factor ≥ 12.
- [ ] No tokens are written to `localStorage` or `sessionStorage`.
- [ ] Session cookies include `HttpOnly`, `Secure`, and `SameSite=Strict`.
- [ ] All protected routes are wrapped in `requireRole()` middleware.
- [ ] Authentication endpoints are protected by `authRateLimiter`.
- [ ] Unauthenticated or unauthorized responses format strictly as RFC 7807 Problem Details.
