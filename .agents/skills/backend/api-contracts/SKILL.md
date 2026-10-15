---
name: api-contracts
description: Strict runtime schema validation using Zod for all query params, payloads, and webhook events, paired with RFC 7807 structured error formatting.
---

# API Contracts & RFC 7807 Error Standards

The `api-contracts` skill establishes the boundary validation and serialization contracts for all HTTP routes, remote procedure calls, and asynchronous webhooks in SupportGeniusAI. No untyped or unvalidated data may cross system boundaries.

---

## 1. Strict Runtime Schema Validation with Zod

Every incoming request parameter (`body`, `query`, `params`) and external webhook event must be parsed and sanitized against strict Zod schemas before reaching business logic controllers.

### Universal Request Validation Middleware Factory

```javascript
import { z } from 'zod';

export function validateRequest(schemas) {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Transform Zod issues into structured RFC 7807 Invalid Parameters
        const invalidParams = error.issues.map((issue) => ({
          name: issue.path.join('.'),
          reason: issue.message,
          code: issue.code,
        }));

        return res.status(422).json({
          type: 'https://supportgenius.ai/errors/validation-failed',
          title: 'Unprocessable Request Entity',
          status: 422,
          detail: 'One or more request parameters failed contract validation.',
          instance: req.originalUrl,
          invalidParams,
        });
      }
      next(error);
    }
  };
}
```

---

## 2. Production RFC 7807 Problem Details Standard

All non-2xx responses across the SupportGeniusAI platform must strictly adhere to **RFC 7807 (Problem Details for HTTP APIs)**. Generic error responses like `{ "error": "Something went wrong" }` are prohibited.

### RFC 7807 JSON Schema Representation

```json
{
  "type": "https://supportgenius.ai/errors/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Customer ticket with ID 'tick_983172' does not exist or has been archived.",
  "instance": "/api/v1/tickets/tick_983172",
  "invalidParams": []
}
```

### Problem Details Error Factory Utility

```javascript
export class ProblemError extends Error {
  constructor({ type, title, status, detail, instance, invalidParams = [] }) {
    super(detail);
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    this.invalidParams = invalidParams;
  }

  toJSON() {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: this.instance,
      invalidParams: this.invalidParams,
    };
  }
}

export function notFoundError(instance, message = 'Requested resource was not found.') {
  return new ProblemError({
    type: 'https://supportgenius.ai/errors/not-found',
    title: 'Resource Not Found',
    status: 404,
    detail: message,
    instance,
  });
}
```

---

## 3. Webhook Contract Verification Pattern

Webhooks originating from payment processors (Stripe) or communication channels (Slack, Twilio) must be cryptographically verified and validated with Zod.

```javascript
import crypto from 'crypto';
import { z } from 'zod';

export const StripeWebhookPayloadSchema = z.object({
  id: z.string(),
  type: z.enum(['customer.subscription.created', 'customer.subscription.deleted', 'invoice.payment_succeeded']),
  created: z.number(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});

export function verifyWebhookSignature(req, secret, headerName = 'stripe-signature') {
  const signature = req.headers[headerName];
  if (!signature) {
    throw new ProblemError({
      type: 'https://supportgenius.ai/errors/unauthorized',
      title: 'Missing Webhook Signature',
      status: 401,
      detail: `Required header '${headerName}' was not provided.`,
      instance: req.originalUrl,
    });
  }

  // Cryptographic constant-time comparison
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(req.rawBody).digest('hex');
  
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isMatch) {
    throw new ProblemError({
      type: 'https://supportgenius.ai/errors/forbidden',
      title: 'Invalid Webhook Signature',
      status: 403,
      detail: 'Webhook signature verification failed.',
      instance: req.originalUrl,
    });
  }
}
```

---

## 4. API Contract Enforcement Checklist

- [ ] Every API endpoint has dedicated Zod schemas for `params`, `query`, and `body`.
- [ ] No `any` or untyped input reaches service layer functions.
- [ ] Controller validation failures return HTTP 422 with RFC 7807 `invalidParams`.
- [ ] External webhooks implement HMAC constant-time verification on raw body buffers.
- [ ] Outgoing successful responses strictly reflect documented JSON contracts.
