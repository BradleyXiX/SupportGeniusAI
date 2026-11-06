/**
 * Public service capabilities definition
 * Exposes operating mode, disabled actions flag, and session requirement.
 * Contains no secrets, tokens, or private endpoint URLs.
 */

export function getCapabilities(mode = process.env.APP_MODE || "support") {
  const normalizedMode = mode === "demo" ? "demo" : "support";
  return {
    mode: normalizedMode,
    actionsEnabled: false,
    sessionRequired: true
  };
}

