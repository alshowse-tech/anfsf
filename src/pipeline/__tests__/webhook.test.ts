import { describe, it, expect, beforeEach } from "@jest/globals";
import { registerWebhook, listWebhooks, removeWebhook, clearWebhooks } from "../webhook";

describe("WebhookRegistry", () => {
  beforeEach(() => { clearWebhooks(); });

  it("registers a webhook", () => {
    const wh = registerWebhook("https://example.com/hook", ["ticket.created"]);
    expect(wh.url).toBe("https://example.com/hook");
    expect(wh.events).toContain("ticket.created");
    expect(wh.id).toBeTruthy();
  });

  it("lists webhooks", () => {
    registerWebhook("https://a.com", ["ticket.created"]);
    registerWebhook("https://b.com", ["ticket.updated"]);
    expect(listWebhooks().length).toBe(2);
  });

  it("removes a webhook", () => {
    const wh = registerWebhook("https://x.com", []);
    expect(removeWebhook(wh.id)).toBe(true);
    expect(listWebhooks().length).toBe(0);
    expect(removeWebhook("nonexistent")).toBe(false);
  });
});