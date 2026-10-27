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
    invalidParams = []
  }) {
    super(detail);
    this.name = "ProblemError";
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    this.invalidParams = invalidParams;
  }

  toJSON() {
    const payload = {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: this.instance
    };
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

export function gatewayError(instance, message = "Upstream AI provider is temporarily unavailable.") {
  return new ProblemError({
    type: "https://supportgenius.ai/errors/bad-gateway",
    title: "Gateway Unavailable",
    status: 502,
    detail: message,
    instance
  });
}
