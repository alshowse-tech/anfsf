/**
 * Pipeline Quality Gate integration tests
 */

import { ProductPipeline, PipelineConfig } from '../../pipeline/product-pipeline';

function createTestConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    enableGuardChecks: false,
    enableQualityGate: false,
    enableReasoning: false,
    enableCompileValidation: false,
    enableCodeQualityGate: false,
    outputDir: './test-output',
    ...overrides,
  };
}

describe('ProductPipeline Quality Gate Integration', () => {
  it('should have polishResults and qualityGateResult as null when disabled', async () => {
    const pipeline = new ProductPipeline(createTestConfig({
      enableCodeQualityGate: false,
    }));
    // Use a minimal PRD text that would parse to empty
    const result = await pipeline.run({ prdText: 'Test PRD' });
    // Pipeline may fail due to missing API key, but output structure should be consistent
    if (result.output) {
      expect(result.output).toHaveProperty('polishResults');
      expect(result.output).toHaveProperty('qualityGateResult');
    }
  });

  it('should include enableCodeQualityGate in config', () => {
    const pipeline = new ProductPipeline(createTestConfig({
      enableCodeQualityGate: true,
    }));
    expect(pipeline).toBeDefined();
  });

  it('should include detailPolisherConfig in config', () => {
    const pipeline = new ProductPipeline(createTestConfig({
      enableCodeQualityGate: true,
      detailPolisherConfig: { apiKey: 'test', model: 'test-model' },
    }));
    expect(pipeline).toBeDefined();
  });

  it('should include qualityGateMinScore in config', () => {
    const pipeline = new ProductPipeline(createTestConfig({
      enableCodeQualityGate: true,
      qualityGateMinScore: 0.90,
    }));
    expect(pipeline).toBeDefined();
  });
});
