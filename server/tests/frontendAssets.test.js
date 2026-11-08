import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index.js";

describe("Frontend Document Routes & CSP Headers", () => {
  it("serves GET /console/ as text/html with CSP header", async () => {
    const res = await request(app).get("/console/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(res.headers["content-security-policy"]).toContain("script-src-attr 'none'");
  });

  it("serves root-absolute static assets /styles.css and /app.js", async () => {
    const cssRes = await request(app).get("/styles.css");
    expect(cssRes.status).toBe(200);
    expect(cssRes.headers["content-type"]).toMatch(/text\/css/);

    const jsRes = await request(app).get("/app.js");
    expect(jsRes.status).toBe(200);
    expect(jsRes.headers["content-type"]).toMatch(/javascript/);
  });
});

