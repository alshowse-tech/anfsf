/**
 * ANFSF Pipeline — Webhook Registry (工单外部对接)
 *
 * Allows external systems to register for ticket event notifications.
 */

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  createdAt: number;
}

const _webhooks: WebhookRegistration[] = [];

export function registerWebhook(url: string, events: string[]): WebhookRegistration {
  const id = "wh_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();
  const wh: WebhookRegistration = { id, url, events, createdAt: Date.now() };
  _webhooks.push(wh);
  return wh;
}

export function listWebhooks(): WebhookRegistration[] {
  return _webhooks.slice();
}

export function removeWebhook(id: string): boolean {
  const idx = _webhooks.findIndex(w => w.id === id);
  if (idx < 0) return false;
  _webhooks.splice(idx, 1);
  return true;
}

export async function notifyWebhooks(event: string, data: unknown): Promise<void> {
  const targets = _webhooks.filter(w => w.events.includes(event));
  await Promise.allSettled(targets.map(async w => {
    try {
      await fetch(w.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, data, timestamp: Date.now() }),
      });
    } catch { /* fire-and-forget: ignore network errors */ }
  }));
}

export function clearWebhooks(): void { _webhooks.length = 0; }