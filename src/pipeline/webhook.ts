import * as crypto from 'crypto';
/**
 * ANFSF Pipeline 鈥?Webhook Registry (宸ュ崟澶栭儴瀵规帴)
 *
 * Allows external systems to register for ticket event notifications.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  createdAt: number;
}

const _webhooks: WebhookRegistration[] = [];
const WEBHOOK_STORAGE = path.resolve('.anfsf/webhooks.json');

function saveWebhooks(): void {
  try {
    const dir = path.dirname(WEBHOOK_STORAGE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WEBHOOK_STORAGE, JSON.stringify(_webhooks, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[WebhookRegistry] Failed to save webhooks:', e);
  }
}

function loadWebhooks(): void {
  try {
    if (fs.existsSync(WEBHOOK_STORAGE)) {
      const data: WebhookRegistration[] = JSON.parse(fs.readFileSync(WEBHOOK_STORAGE, 'utf-8'));
      _webhooks.length = 0;
      _webhooks.push(...data);
    }
  } catch (e) {
    console.warn('[WebhookRegistry] Failed to load webhooks:', e);
  }
}

// Initialize on module load
loadWebhooks();

export function registerWebhook(url: string, events: string[]): WebhookRegistration {
  if (!url.startsWith("https://")) {
    throw new Error("Webhook URL must use HTTPS");
  }
  const id = "wh_" + crypto.randomUUID().slice(0, 8) + "_" + Date.now();
  const wh: WebhookRegistration = { id, url, events, createdAt: Date.now() };
  _webhooks.push(wh);
  saveWebhooks();
  return wh;
}

export function listWebhooks(): WebhookRegistration[] {
  return _webhooks.slice();
}

export function removeWebhook(id: string): boolean {
  const idx = _webhooks.findIndex(w => w.id === id);
  if (idx < 0) return false;
  _webhooks.splice(idx, 1);
  saveWebhooks();
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

