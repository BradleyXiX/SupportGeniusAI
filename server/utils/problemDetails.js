/**
 * RFC 7807 Problem Details for HTTP APIs
 * Standardized error structure for SupportGeniusAI
 */

export class ProblemError extends Error {
  constructor({
    type = "https://supportgenius.ai/errors/internal-server-error",
    title = "Internal Server Error",
    status = 500,
    detail = "An unexpected error occurred while processing the request.",
    instance = "",
    invalidParams = [],
    code = undefined,
    correlationId = undefined
  }) {
    super(detail);
    this.name = "ProblemError";
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    this.invalidParams = invalidParams;
    this.code = code;
    this.correlationId = correlationId;
  }

  toJSON() {
    const payload = {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: this.instance
    };
    if (this.code) {
      payload.code = this.code;
    }
    if (this.correlationId) {
      payload.correlationId = this.correlationId;
    }
    if (this.invalidParams && this.invalidParams.length > 0) {
      payload.invalidParams = this.invalidParams;
    }
    return payload;
  }
}

export function validationError(instance, invalidParams, message = "One or more request parameters failed contract validation.") {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/validation-failed",
    title: "Unprocessable Request Entity",
    status: 422,
    detail: message,
    instance,
    invalidParams
  });
}

export function badRequest(instance, message = "Malformed or invalid request.") {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/bad-request",
    title: "Bad Request",
    status: 400,
    detail: message,
    instance
  });
}

export function notFound(instance, message = "Requested resource was not found.") {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/not-found",
    title: "Resource Not Found",
    status: 404,
    detail: message,
    instance
  });
}

export function rateLimitError(instance, message = "You have exceeded the rate limit. Please try again later.") {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/rate-limit-exceeded",
    title: "Too Many Requests",
    status: 429,
    detail: message,
    instance
  });
}

export function gatewayError(instance, message = "Upstream AI provider is temporarily unavailable.", correlationId = undefined) {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/bad-gateway",
    title: "Gateway Unavailable",
    status: 502,
    detail: message,
    instance,
    code: "PROVIDER_UNAVAILABLE",
    correlationId
  });
}

export function providerTimeoutError(instance, message = "Upstream provider timed out.", correlationId = undefined) {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/provider-timeout",
    title: "Gateway Timeout",
    status: 504,
    detail: message,
    instance,
    code: "PROVIDER_TIMEOUT",
    correlationId
  });
}

export function providerUnavailableError(instance, message = "Upstream provider is temporarily unavailable.", correlationId = undefined) {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/provider-unavailable",
    title: "Gateway Unavailable",
    status: 502,
    detail: message,
    instance,
    code: "PROVIDER_UNAVAILABLE",
    correlationId
  });
}

export function payloadTooLargeError(instance, message = "Request payload exceeds allowed limit.") {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/payload-too-large",
    title: "Payload Too Large",
    status: 413,
    detail: message,
    instance
  });
}
