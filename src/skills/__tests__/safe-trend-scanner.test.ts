/**
 * Tests for Safe Trend Scanner
 */

import { SafeTrendScanner, createSafeTrendScanner } from '../safe-trend-scanner';

describe('SafeTrendScanner', () => {
  it('should create instance with default config', () => {
    const scanner = new SafeTrendScanner();
    expect(scanner).toBeDefined();
  });

  it('should create instance via factory function', () => {
    const scanner = createSafeTrendScanner({ apiKey: 'test' });
    expect(scanner).toBeDefined();
  });

  it('should accept custom sources', () => {
    const scanner = new SafeTrendScanner({
      sources: [{ id: 'custom', type: 'github-release', url: 'https://api.github.com/repos/test/test/releases' }],
    });
    expect(scanner).toBeDefined();
  });

  it('should return scan result even without API key', async () => {
    const scanner = new SafeTrendScanner({
      apiKey: '',
      timeoutMs: 3000,
    });
    const result = await scanner.scan();
    expect(result).toHaveProperty('scannedAt');
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('sourcesChecked');
    expect(result).toHaveProperty('sourcesFailed');
    expect(result).toHaveProperty('duration');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should use custom timeout', async () => {
    const scanner = new SafeTrendScanner({
      apiKey: '',
      timeoutMs: 100,
    });
    const result = await scanner.scan();
    // Should complete quickly since no API key means immediate fallback
    expect(result.duration).toBeLessThan(5000);
  });
});
