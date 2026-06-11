/**
 * ANFSF Integrations — LLM Client
 *
 * Shared HTTP LLM client with retry, circuit breaker, timeout, and
 * token/cost tracking. Replaces bare fetch() calls across the codebase.
 */

// ============================================================================
// Multimodal Types
// ============================================================================

export type LLMContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface LLMMessageMultimodal {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentPart[];
}

// ============================================================================
// Types
// ============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number;
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LLMResponse {
  ok: boolean;
  status: number;
  content: string;
  usage: LLMUsage;
  error?: string;
}

export interface CostEstimate {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  currency: string;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

export interface LLMClientConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  maxRetries?: number;
  retryBackoffMs?: number;
  timeoutMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
}

// ============================================================================
// Pricing (per 1K tokens, approximate for common models)
// ============================================================================

const MODEL_PRICING: Record<string, { promptPer1k: number; completionPer1k: number }> = {
  // DashScope (Qwen)
  'qwen3.5-plus': { promptPer1k: 0.001, completionPer1k: 0.004 },
  'qwen3.5-turbo': { promptPer1k: 0.0003, completionPer1k: 0.0012 },
  'qwen-max': { promptPer1k: 0.005, completionPer1k: 0.02 },
  // DeepSeek
  'deepseek-chat': { promptPer1k: 0.0005, completionPer1k: 0.002 },
  'deepseek-reasoner': { promptPer1k: 0.001, completionPer1k: 0.004 },
  'deepseek-v4': { promptPer1k: 0.00014, completionPer1k: 0.00028 },
  'deepseek-v4-pro': { promptPer1k: 0.000435, completionPer1k: 0.00087 },
  'deepseek-r1': { promptPer1k: 0.00055, completionPer1k: 0.00219 },
  'default': { promptPer1k: 0.001, completionPer1k: 0.004 },
};

// Provider base URLs
const PROVIDER_BASE_URLS: Record<string, string> = {
  'dashscope': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'deepseek': 'https://api.deepseek.com/v1',
};

/**
 * Detect provider from API key prefix and return appropriate base URL.
 */
function detectProviderBaseUrl(apiKey: string): string | null {
  if (apiKey.startsWith('sk-ds-') || apiKey.startsWith('sk-deepseek-')) {
    return PROVIDER_BASE_URLS['deepseek'];
  }
  if (apiKey.startsWith('sk-')) {
    // Default to DashScope for generic sk- keys (historical default)
    return PROVIDER_BASE_URLS['dashscope'];
  }
  return null;
}

const DEFAULT_CONFIG: Required<LLMClientConfig> = {
  apiKey: '',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  defaultModel: 'qwen3.5-plus',
  maxRetries: 3,
  retryBackoffMs: 1000,
  timeoutMs: 60000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 30000,
};

// ============================================================================
// LLMClient
// ============================================================================

export class LLMClient {
  private config: Required<LLMClientConfig>;
  private circuit: CircuitBreakerState;
  private totalTokens: LLMUsage;
  private totalCost: { prompt: number; completion: number };

  constructor(config: Partial<LLMClientConfig> = {}) {
    // Auto-detect provider base URL from API key if not explicitly set
    const autoBaseUrl = config.apiKey ? detectProviderBaseUrl(config.apiKey) : null;
    const resolvedConfig: Partial<LLMClientConfig> = {
      ...config,
      baseUrl: (config.baseUrl || autoBaseUrl || DEFAULT_CONFIG.baseUrl).trim(),
    };
    this.config = { ...DEFAULT_CONFIG, ...resolvedConfig };
    // Defensive trim on URL and model (env vars may have trailing spaces)
    this.config.baseUrl = this.config.baseUrl.trim();
    this.config.defaultModel = this.config.defaultModel.trim();
    this.circuit = { failures: 0, lastFailure: 0, state: 'closed' };
    this.totalTokens = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    this.totalCost = { prompt: 0, completion: 0 };
  }

  /**
   * Make an LLM API call with retry, circuit breaker, and timeout.
   */
  async chat(request: Partial<LLMRequest>): Promise<LLMResponse> {
    const model = request.model || this.config.defaultModel;

    if (!this.config.apiKey) {
      return {
        ok: false,
        status: 0,
        content: '',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        error: 'No API key configured',
      };
    }

    // Circuit breaker check
    if (this.circuit.state === 'open') {
      if (Date.now() - this.circuit.lastFailure > this.config.circuitBreakerResetMs) {
        this.circuit.state = 'half-open';
      } else {
        return {
          ok: false,
          status: 0,
          content: '',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          error: 'Circuit breaker is open — API is temporarily unavailable',
        };
      }
    }

    let lastError = '';
    const maxAttempts = this.config.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delay = this.config.retryBackoffMs * Math.pow(2, attempt - 1);
        const jitter = delay * (0.5 + Math.random() * 0.5); // 50-100% of base delay
        await this.sleep(jitter);
      }

      const result = await this.doChatRequest(model, request, request.timeoutMs);

      if (result.ok) {
        this.onSuccess(result);
        return result;
      }

      lastError = result.error || `HTTP ${result.status}`;

      // Don't retry timeouts (status 0) — retrying a timeout won't make the server faster
      if (result.status === 0) {
        return result;
      }

      // Don't retry 4xx errors (except 429 rate limit)
      if (result.status >= 400 && result.status < 500 && result.status !== 429) {
        return result;
      }

      // 429 — retry with longer backoff
      if (result.status === 429) {
        const retryAfter = 1000 * Math.pow(2, attempt);
        const jitterRetry = retryAfter * (0.5 + Math.random() * 0.5);
        await this.sleep(jitterRetry);
      }
    }

    this.onFailure();
    return {
      ok: false,
      status: 0,
      content: '',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      error: `LLM call failed after ${maxAttempts} attempts: ${lastError}`,
    };
  }

  /**
   * Make a multimodal LLM API call with image support.
   */
  async chatVision(imageDataUri: string, prompt: string, model?: string): Promise<LLMResponse> {
    const targetModel = model || this.config.defaultModel;

    if (!this.config.apiKey) {
      return {
        ok: false,
        status: 0,
        content: '',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        error: 'No API key configured',
      };
    }

    if (this.circuit.state === 'open') {
      if (Date.now() - this.circuit.lastFailure > this.config.circuitBreakerResetMs) {
        this.circuit.state = 'half-open';
      } else {
        return {
          ok: false,
          status: 0,
          content: '',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          error: 'Circuit breaker is open — API is temporarily unavailable',
        };
      }
    }

    const messages: LLMMessageMultimodal[] = [
      { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageDataUri } }] },
    ];

    let lastError = '';
    const maxAttempts = this.config.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delay = this.config.retryBackoffMs * Math.pow(2, attempt - 1);
        const jitter = delay * (0.5 + Math.random() * 0.5); // 50-100% of base delay
        await this.sleep(jitter);
      }

      const result = await this.doMultimodalChatRequest(targetModel, messages);

      if (result.ok) {
        this.onSuccess(result);
        return result;
      }

      lastError = result.error || `HTTP ${result.status}`;

      if (result.status >= 400 && result.status < 500 && result.status !== 429) {
        return result;
      }

      if (result.status === 429) {
        const retryAfter = 1000 * Math.pow(2, attempt);
        const jitterRetry = retryAfter * (0.5 + Math.random() * 0.5);
        await this.sleep(jitterRetry);
      }
    }

    this.onFailure();
    return {
      ok: false,
      status: 0,
      content: '',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      error: `Vision LLM call failed after ${maxAttempts} attempts: ${lastError}`,
    };
  }

  /**
   * Estimate cost for a request based on token usage.
   */
  estimateCost(usage: LLMUsage, model?: string): CostEstimate {
    const pricing = MODEL_PRICING[model || this.config.defaultModel] || MODEL_PRICING['default'];
    return {
      promptCost: (usage.prompt_tokens / 1000) * pricing.promptPer1k,
      completionCost: (usage.completion_tokens / 1000) * pricing.completionPer1k,
      totalCost: ((usage.prompt_tokens / 1000) * pricing.promptPer1k) +
                 ((usage.completion_tokens / 1000) * pricing.completionPer1k),
      currency: 'USD',
    };
  }

  /** Get cumulative token usage across all calls */
  getTotalUsage(): LLMUsage {
    return { ...this.totalTokens };
  }

  /** Get cumulative cost across all calls */
  getTotalCost(): CostEstimate {
    return this.estimateCost(this.totalTokens);
  }

  /** Reset cumulative counters */
  resetCounters(): void {
    this.totalTokens = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    this.totalCost = { prompt: 0, completion: 0 };
  }

  /** Get circuit breaker state */
  getCircuitState(): CircuitBreakerState {
    return { ...this.circuit };
  }

  /** Reset circuit breaker (e.g., after manual intervention) */
  resetCircuit(): void {
    this.circuit = { failures: 0, lastFailure: 0, state: 'closed' };
  }

  // ============================================================================
  // Internal
  // ============================================================================

  private async doChatRequest(model: string, request: Partial<LLMRequest>, timeoutOverride?: number): Promise<LLMResponse> {
    const { signal, cleanup } = this.createTimeout(timeoutOverride);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: request.messages || [],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens,
        }),
        signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          ok: false,
          status: response.status,
          content: '',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          error: `API returned ${response.status}: ${text.slice(0, 200)}`,
        };
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      return {
        ok: true,
        status: response.status,
        content,
        usage,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('signal') || message.includes('aborted')) {
        return {
          ok: false,
          status: 0,
          content: '',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          error: `Request timed out after ${this.config.timeoutMs}ms`,
        };
      }
      return {
        ok: false,
        status: 0,
        content: '',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        error: message,
      };
    } finally {
      cleanup();
    }
  }

  private async doMultimodalChatRequest(model: string, messages: LLMMessageMultimodal[]): Promise<LLMResponse> {
    const { signal, cleanup } = this.createTimeout();

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.1,
        }),
        signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          ok: false,
          status: response.status,
          content: '',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          error: `API returned ${response.status}: ${text.slice(0, 200)}`,
        };
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      return {
        ok: true,
        status: response.status,
        content,
        usage,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('signal') || message.includes('aborted')) {
        return {
          ok: false,
          status: 0,
          content: '',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          error: `Request timed out after ${this.config.timeoutMs}ms`,
        };
      }
      return {
        ok: false,
        status: 0,
        content: '',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        error: message,
      };
    } finally {
      cleanup();
    }
  }

  private createTimeout(timeoutOverride?: number): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutOverride ?? this.config.timeoutMs);
    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timer),
    };
  }

  private onSuccess(response: LLMResponse): void {
    this.totalTokens.prompt_tokens += response.usage.prompt_tokens;
    this.totalTokens.completion_tokens += response.usage.completion_tokens;
    this.totalTokens.total_tokens += response.usage.total_tokens;

    if (this.circuit.state === 'half-open') {
      this.circuit = { failures: 0, lastFailure: 0, state: 'closed' };
    }
  }

  private onFailure(): void {
    this.circuit.failures++;
    this.circuit.lastFailure = Date.now();

    if (this.circuit.failures >= this.config.circuitBreakerThreshold) {
      this.circuit.state = 'open';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createLLMClient(config: Partial<LLMClientConfig> = {}): LLMClient {
  return new LLMClient(config);
}
