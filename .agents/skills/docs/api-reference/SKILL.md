---
name: api-reference
description: API reference documentation standards mandating concrete request/response JSON schemas, authentication headers, RFC 7807 error status codes, and copy-pasteable curl examples.
---

# API Reference Documentation Standards

The `api-reference` skill establishes the specification and documentation requirements for all public and internal HTTP endpoints in SupportGeniusAI. Every endpoint must be documented with complete schemas, authentication prerequisites, rate limit tiers, error matrices, and executable `curl` commands.

---

## 1. Mandatory Endpoint Documentation Structure

Every API route reference document must follow this exact 6-part structure:

1. **Endpoint Overview**: HTTP method, URI path, brief description, and privilege level.
2. **Request Headers & Authentication**: Required tokens, cookies, content types.
3. **Query Parameters / Request Body Schema**: Explicit JSON contracts with types, constraints, and descriptions.
4. **Successful Response (2xx)**: HTTP status code, response headers, and full JSON payload.
5. **Error Matrix (4xx / 5xx)**: Complete RFC 7807 schemas for all foreseeable error states.
6. **Executable `curl` Example**: Copy-pasteable shell command with piped `jq` output formatting.

---

## 2. Canonical Production Endpoint Specification Example

### `POST /api/v1/tickets/:id/responses`
Generates or appends an AI-assisted or agent-authored response to an existing customer support ticket.

#### Security & Headers
| Header Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | Yes | Bearer token: `Bearer sg_live_<token>` or authenticated session cookie. |
| `Content-Type` | String | Yes | Must be `application/json`. |
| `X-Idempotency-Key`| String | No | UUID v4 to prevent duplicate response dispatches on network retries. |

#### URL Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique ticket identifier matching regex `^tick_[a-zA-Z0-9]{12}$`. |

#### Request Body Schema (`application/json`)
```json
{
  "content": "Thank you for contacting SupportGeniusAI. We have resolved the billing discrepancy on invoice #1042.",
  "status": "resolved",
  "visibility": "public",
  "aiGenerated": false,
  "confidenceScore": 0.99
}
```

| Field Name | Type | Required | Validation Constraints |
| :--- | :--- | :--- | :--- |
| `content` | string | Yes | Min 5 chars, max 10,000 chars. Sanitized HTML/Markdown. |
| `status` | string | Yes | One of `["open", "pending", "resolved", "closed"]`. |
| `visibility` | string | Yes | One of `["public", "internal_note"]`. |
| `aiGenerated` | boolean | Yes | Boolean flag indicating whether text was produced by copilot. |
| `confidenceScore`| number | No | Float between `0.0` and `1.0`. |

#### Response: `201 Created`
```json
{
  "data": {
    "responseId": "resp_883019284012",
    "ticketId": "tick_a9f82b71c019",
    "author": {
      "id": "usr_991823",
      "name": "Sarah Connor",
      "role": "agent"
    },
    "content": "Thank you for contacting SupportGeniusAI. We have resolved the billing discrepancy on invoice #1042.",
    "status": "resolved",
    "visibility": "public",
    "createdAt": "2026-10-15T20:30:00.000Z"
  }
}
```

---

## 3. Comprehensive Error Matrix (RFC 7807)

All non-success status codes must be documented with explicit RFC 7807 payload structures:

### HTTP 400 Bad Request / 422 Unprocessable Entity
Returned when request syntax is invalid or fails schema constraints.
```json
{
  "type": "https://supportgenius.ai/errors/validation-failed",
  "title": "Unprocessable Request Entity",
  "status": 422,
  "detail": "Request body failed validation schema.",
  "instance": "/api/v1/tickets/tick_a9f82b71c019/responses",
  "invalidParams": [
    {
      "name": "content",
      "reason": "String must contain at least 5 character(s)",
      "code": "too_small"
    }
  ]
}
```

### HTTP 401 Unauthorized
Returned when authentication credentials are missing or invalid.
```json
{
  "type": "https://supportgenius.ai/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "The provided Bearer token is expired or revoked.",
  "instance": "/api/v1/tickets/tick_a9f82b71c019/responses"
}
```

### HTTP 403 Forbidden
Returned when authenticated user lacks sufficient role privileges.
```json
{
  "type": "https://supportgenius.ai/errors/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "Role 'viewer' cannot dispatch public ticket responses.",
  "instance": "/api/v1/tickets/tick_a9f82b71c019/responses"
}
```

### HTTP 404 Not Found
Returned when the requested resource identifier does not exist.
```json
{
  "type": "https://supportgenius.ai/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Ticket 'tick_a9f82b71c019' does not exist.",
  "instance": "/api/v1/tickets/tick_a9f82b71c019/responses"
}
```

### HTTP 429 Too Many Requests
Returned when client exceeds rate limit quotas.
```json
{
  "type": "https://supportgenius.ai/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded your quota of 120 requests per minute. Retry after 28 seconds.",
  "instance": "/api/v1/tickets/tick_a9f82b71c019/responses"
}
```

---

## 4. Copy-Pasteable Executable `curl` Example

Every endpoint reference must supply a verified, copy-pasteable `curl` snippet that developers can run in their terminals:

```bash
curl -X POST "https://api.supportgenius.ai/api/v1/tickets/tick_a9f82b71c019/responses" \
  -H "Authorization: Bearer sg_live_7a8f9b0c1d2e3f4" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" \
  -d '{
    "content": "Thank you for contacting SupportGeniusAI. We have resolved the billing discrepancy on invoice #1042.",
    "status": "resolved",
    "visibility": "public",
    "aiGenerated": false,
    "confidenceScore": 0.99
  }' | jq .
```

---

## 5. API Reference Verification Checklist

- [ ] HTTP Method, URL template, and required auth tokens are explicitly stated.
- [ ] Complete request body JSON example with field-by-field validation constraints.
- [ ] Full 2xx JSON response payload documented.
- [ ] RFC 7807 Problem Details schemas provided for 400, 401, 403, 404, 422, and 429.
- [ ] Executable `curl` snippet included with headers and piped `jq` formatting.
