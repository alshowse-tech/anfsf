/**
 * ANFSF Integrations — LLM Client
 *
 * Shared HTTP LLM client with retry, circuit breaker, timeout, and
 * token/cost tracking. Replaces bare fetch() calls across the codebase.
 *
 * Phase 3: Extended with tool-use (function calling) support.
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
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Tool call ID — set when role === 'tool' (function result) */
  tool_call_id?: string;
  /** Tool calls made by the assistant — set when role === 'assistant' and the LLM requested tool calls */
  tool_calls?: ToolCall[];
}

/** Simplified tool definition sent to the LLM (function-calling schema) */
export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        items?: { type: string };
      }>;
      required: string[];
    };
  };
}

/** A tool call made by the LLM */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string — parsed by caller
  };
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number;
  /** Available tools for function calling (Phase 3) */
  tools?: LLMToolDefinition[];
  /** Tool choice strategy */
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
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
  /** Tool calls made by the LLM (Phase 3) */
  tool_calls?: ToolCall[];
  /** Why the LLM stopped: 'stop' (natural), 'tool_calls' (wants to call tools), 'length' (token limit) */
  finish_reason?: 'stop' | 'tool_calls' | 'length';
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
  /**
   * Optional budget guard. Called before each chat() request with the
   * estimated token count. Return false to reject the call (budget exhausted).
   * Also accepts the request context string for per-operation decisions.
   */
  budgetGuard?: (estimatedTokens: number, model: string, context: string) => { allowed: boolean; reason?: string };
}

// ============================================================================
// Pricing (per 1K tokens, approximate for common models)
// SINGLE SOURCE OF TRUTH — also imported by token-budget.ts
// ============================================================================

export interface ModelPricingEntry {
  /** Cost per 1000 prompt (input) tokens */
  promptPer1k: number;
  /** Cost per 1000 completion (output) tokens */
  completionPer1k: number;
  /** ISO 4217 currency code */
  currency: string;
}

export const MODEL_PRICING: Record<string, ModelPricingEntry> = {
  // DashScope (Qwen) — priced in CNY
  'qwen3.5-plus':    { promptPer1k: 0.001,  completionPer1k: 0.004,  currency: 'CNY' },
  'qwen3.5-turbo':   { promptPer1k: 0.0003, completionPer1k: 0.0012, currency: 'CNY' },
  'qwen-max':        { promptPer1k: 0.005,  completionPer1k: 0.02,   currency: 'CNY' },
  'qwen-plus':       { promptPer1k: 0.0008, completionPer1k: 0.002,  currency: 'CNY' },
  'qwen-turbo':      { promptPer1k: 0.0003, completionPer1k: 0.0006, currency: 'CNY' },
  // DeepSeek — priced in USD
  'deepseek-chat':     { promptPer1k: 0.00014, completionPer1k: 0.00028, currency: 'USD' },
  'deepseek-reasoner': { promptPer1k: 0.001,   completionPer1k: 0.004,   currency: 'USD' },
  'deepseek-v4':       { promptPer1k: 0.00014, completionPer1k: 0.00028, currency: 'USD' },
  'deepseek-v4-pro':   { promptPer1k: 0.000435,completionPer1k: 0.00087, currency: 'USD' },
  'deepseek-r1':       { promptPer1k: 0.00055, completionPer1k: 0.00219, currency: 'USD' },
  // Generic fallbacks
  'flash':        { promptPer1k: 0.0001, completionPer1k: 0.0002, currency: 'USD' },
  'pro':          { promptPer1k: 0.001,  completionPer1k: 0.002,  currency: 'USD' },
  'default':      { promptPer1k: 0.001,  completionPer1k: 0.004,  currency: 'USD' },
};

/**
 * Convert MODEL_PRICING to the shape expected by token-budget.ts.
 */
export function getBudgetModelPricing(): Record<string, { inputPer1K: number; outputPer1K: number; currency: string }> {
  const result: Record<string, { inputPer1K: number; outputPer1K: number; currency: string }> = {};
  for (const [model, entry] of Object.entries(MODEL_PRICING)) {
    result[model] = {
      inputPer1K: entry.promptPer1k,
      outputPer1K: entry.completionPer1k,
      currency: entry.currency,
    };
  }
  return result;
}

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

const DEFAULT_CONFIG: Omit<Required<LLMClientConfig>, 'budgetGuard'> = {
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
  private config: Required<Omit<LLMClientConfig, 'budgetGuard'>> & Pick<LLMClientConfig, 'budgetGuard'>;
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
    const mergedConfig = { ...DEFAULT_CONFIG, ...resolvedConfig };
    // Defensive trim on URL and model (env vars may have trailing spaces)
    mergedConfig.baseUrl = mergedConfig.baseUrl.trim();
    mergedConfig.defaultModel = mergedConfig.defaultModel.trim();
    this.config = mergedConfig;
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

    // Budget guard check — reject before any network call
    if (this.config.budgetGuard) {
      const guardResult = this.config.budgetGuard(
        request.max_tokens ?? 4096,
        model,
        (request as any)._budgetContext ?? 'llm-call',
      );
      if (!guardResult.allowed) {
        return {
          ok: false,
          status: 0,
          content: '',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          error: `Budget exhausted: ${guardResult.reason || 'token limit reached'}`,
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

    // Budget guard check — same as chat()
    if (this.config.budgetGuard) {
      const guardResult = this.config.budgetGuard(4096, targetModel, 'vision');
      if (!guardResult.allowed) {
        return {
          ok: false,
          status: 0,
          content: '',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          error: `Budget exhausted: ${guardResult.reason || 'token limit reached'}`,
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
      currency: pricing.currency,
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
          ...(request.tools && request.tools.length > 0 ? { tools: request.tools } : {}),
          ...(request.tool_choice ? { tool_choice: request.tool_choice } : {}),
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
        choices: Array<{ message: { content: string; tool_calls?: ToolCall[] }; finish_reason?: string }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const message = data.choices?.[0]?.message;
      const content = message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const finishReason = data.choices?.[0]?.finish_reason as LLMResponse['finish_reason'];

      return {
        ok: true,
        status: response.status,
        content,
        usage,
        tool_calls: message?.tool_calls,
        finish_reason: finishReason,
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
