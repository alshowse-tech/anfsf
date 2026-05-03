/**
 * L14 Simulation Layer - Load Simulator
 *
 * Simulates concurrent load against services based on IR.
 * Supports ramp-up, steady, and ramp-down phases.
 */

export interface LoadProfile {
  /** Concurrent users to ramp to */
  maxConcurrent: number;
  /** Ramp-up duration in ms */
  rampUpMs: number;
  /** Steady-state duration in ms */
  steadyMs: number;
  /** Ramp-down duration in ms */
  rampDownMs: number;
  /** Requests per second at peak */
  rps: number;
}

export interface ServiceEndpoint {
  id: string;
  path: string;
  method: string;
  /** Base latency in ms */
  baseLatency: number;
}

export interface LoadSimulationResult {
  /** Total requests issued */
  totalRequests: number;
  /** Successful requests */
  successCount: number;
  /** Failed requests */
  failureCount: number;
  /** Average latency across all requests */
  avgLatency: number;
  /** P50 latency */
  p50: number;
  /** P95 latency */
  p95: number;
  /** P99 latency */
  p99: number;
  /** Overall error rate (0-1) */
  errorRate: number;
  /** Throughput (requests/second) */
  throughput: number;
  /** Per-endpoint breakdown */
  perEndpoint: Record<string, {
    requests: number;
    avgLatency: number;
    errorRate: number;
  }>;
  /** Load profile used */
  profile: LoadProfile;
}

export class LoadSimulator {
  private random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  /**
   * Run load simulation against defined endpoints.
   */
  simulate(endpoints: ServiceEndpoint[], profile: LoadProfile): LoadSimulationResult {
    const allLatencies: number[] = [];
    const perEndpoint: LoadSimulationResult['perEndpoint'] = {};
    let totalRequests = 0;
    let successCount = 0;

    // Simulate ramp-up phase
    const rampRequests = Math.floor(profile.rps * (profile.rampUpMs / 1000) * 0.5);
    for (let i = 0; i < rampRequests; i++) {
      const load = i / rampRequests; // 0→1
      const success = this.issueRequest(endpoints, load, perEndpoint, allLatencies);
      totalRequests++;
      if (success) successCount++;
    }

    // Simulate steady state
    const steadyRequests = Math.floor(profile.rps * (profile.steadyMs / 1000));
    for (let i = 0; i < steadyRequests; i++) {
      const success = this.issueRequest(endpoints, 1.0, perEndpoint, allLatencies);
      totalRequests++;
      if (success) successCount++;
    }

    // Simulate ramp-down phase
    const rampDownRequests = Math.floor(profile.rps * (profile.rampDownMs / 1000) * 0.5);
    for (let i = 0; i < rampDownRequests; i++) {
      const load = 1 - i / rampDownRequests; // 1→0
      const success = this.issueRequest(endpoints, load, perEndpoint, allLatencies);
      totalRequests++;
      if (success) successCount++;
    }

    const failureCount = totalRequests - successCount;

    allLatencies.sort((a, b) => a - b);

    const totalDurationMs = profile.rampUpMs + profile.steadyMs + profile.rampDownMs;

    // Compute per-endpoint stats
    for (const [id, data] of Object.entries(perEndpoint)) {
      perEndpoint[id] = {
        requests: data.requests,
        avgLatency: data.requests > 0 ? data.avgLatency / data.requests : 0,
        errorRate: data.requests > 0 ? (data.requests - data.requests) / data.requests : 0,
      };
    }

    return {
      totalRequests,
      successCount,
      failureCount,
      avgLatency: allLatencies.length > 0 ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length : 0,
      p50: this.percentile(allLatencies, 0.5),
      p95: this.percentile(allLatencies, 0.95),
      p99: this.percentile(allLatencies, 0.99),
      errorRate: totalRequests > 0 ? failureCount / totalRequests : 0,
      throughput: totalDurationMs > 0 ? totalRequests / (totalDurationMs / 1000) : 0,
      perEndpoint,
      profile,
    };
  }

  /**
   * Simulate a single request to a random endpoint.
   */
  private issueRequest(
    endpoints: ServiceEndpoint[],
    loadFactor: number,
    perEndpoint: LoadSimulationResult['perEndpoint'],
    allLatencies: number[]
  ): boolean {
    if (endpoints.length === 0) return false;

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    // Latency increases with load (queueing effect)
    const latency = endpoint.baseLatency * (1 + loadFactor * 3 + this.random(-0.2, 0.2));

    // Failure rate increases under load
    const failureRate = 0.005 + loadFactor * 0.03;
    if (Math.random() < failureRate) {
      return false;
    }

    allLatencies.push(latency);

    if (!perEndpoint[endpoint.id]) {
      perEndpoint[endpoint.id] = { requests: 0, avgLatency: 0, errorRate: 0 };
    }
    perEndpoint[endpoint.id].requests++;
    perEndpoint[endpoint.id].avgLatency += latency;

    return true;
  }
}
