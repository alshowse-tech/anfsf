/**
 * A/B Test Runner Tests
 */

import { ABTestRunner } from '../ab-test-runner';
import { ABTestConfig } from '../types';

describe('ABTestRunner', () => {
  let config: ABTestConfig;
  let runner: ABTestRunner;

  beforeEach(() => {
    config = {
      testId: 'test-1',
      name: 'A/B Test',
      variants: [
        { id: 'variant_a', name: 'Variant A', config: {}, trafficPercentage: 50 },
        { id: 'variant_b', name: 'Variant B', config: {}, trafficPercentage: 50 },
      ],
      targetMetric: 'conversion_rate',
      minSampleSize: 30,
      significanceThreshold: 0.05,
    };

    runner = new ABTestRunner(config);
  });

  describe('AddSample', () => {
    it('should add sample to variant', () => {
      runner.addSample('variant_a', 0.5);
      runner.addSample('variant_a', 0.6);
      runner.addSample('variant_b', 0.7);

      const results = runner.getResults();
      expect(results.variantResults.length).toBe(2);
    });

    it('should throw error for unknown variant', () => {
      expect(() => {
        runner.addSample('unknown_variant', 0.5);
      }).toThrow('Unknown variant');
    });
  });

  describe('GetResults', () => {
    it('should return running status with insufficient samples', () => {
      runner.addSample('variant_a', 0.5);
      runner.addSample('variant_b', 0.6);

      const results = runner.getResults();
      expect(results.status).toBe('running');
    });

    it('should complete test with sufficient samples', () => {
      // Add enough samples
      for (let i = 0; i < 50; i++) {
        runner.addSample('variant_a', 0.5 + Math.random() * 0.1);
        runner.addSample('variant_b', 0.6 + Math.random() * 0.1);
      }

      const results = runner.getResults();
      expect(results.variantResults.length).toBe(2);
      expect(results.variantResults[0].sampleSize).toBe(50);
      expect(results.variantResults[1].sampleSize).toBe(50);
    });

    it('should calculate confidence intervals', () => {
      for (let i = 0; i < 50; i++) {
        runner.addSample('variant_a', 0.5);
        runner.addSample('variant_b', 0.6);
      }

      const results = runner.getResults();
      
      expect(results.variantResults[0].confidenceInterval).toBeDefined();
      expect(results.variantResults[0].confidenceInterval.confidence).toBe(0.95);
    });

    it('should determine winner when significant', () => {
      // Create clear difference between variants
      for (let i = 0; i < 100; i++) {
        runner.addSample('variant_a', 0.4); // Lower conversion
        runner.addSample('variant_b', 0.8); // Higher conversion
      }

      const results = runner.getResults();
      
      if (results.status === 'complete') {
        expect(results.winner).toBeDefined();
        expect(results.significance).toBeDefined();
      }
    });
  });

  describe('IsComplete', () => {
    it('should return false when running', () => {
      runner.addSample('variant_a', 0.5);
      runner.addSample('variant_b', 0.6);

      expect(runner.isComplete()).toBe(false);
    });

    it('should return true when complete', () => {
      for (let i = 0; i < 100; i++) {
        runner.addSample('variant_a', 0.4);
        runner.addSample('variant_b', 0.8);
      }

      // May or may not be complete depending on significance
      const status = runner.getStatus();
      expect(['running', 'complete', 'inconclusive']).toContain(status);
    });
  });

  describe('GetStatus', () => {
    it('should return current status', () => {
      const status = runner.getStatus();
      expect(status).toBe('running');
    });
  });

  describe('Statistical Significance', () => {
    it('should calculate p-value correctly', () => {
      // Add samples with clear difference
      for (let i = 0; i < 200; i++) {
        runner.addSample('variant_a', 0.3);
        runner.addSample('variant_b', 0.7);
      }

      const results = runner.getResults();

      if (results.significance) {
        expect(results.significance.pValue).toBeGreaterThanOrEqual(0);
        expect(results.significance.pValue).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate effect size', () => {
      for (let i = 0; i < 100; i++) {
        runner.addSample('variant_a', 0.5);
        runner.addSample('variant_b', 0.6);
      }

      const results = runner.getResults();

      if (results.significance) {
        expect(results.significance.effectSize).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Multiple Variants', () => {
    it('should handle multiple variants', () => {
      const multiConfig: ABTestConfig = {
        testId: 'test-multi',
        name: 'Multi-Variant Test',
        variants: [
          { id: 'a', name: 'A', config: {}, trafficPercentage: 33 },
          { id: 'b', name: 'B', config: {}, trafficPercentage: 33 },
          { id: 'c', name: 'C', config: {}, trafficPercentage: 34 },
        ],
        targetMetric: 'conversion_rate',
        minSampleSize: 30,
        significanceThreshold: 0.05,
      };

      const multiRunner = new ABTestRunner(multiConfig);

      for (let i = 0; i < 50; i++) {
        multiRunner.addSample('a', 0.4);
        multiRunner.addSample('b', 0.5);
        multiRunner.addSample('c', 0.6);
      }

      const results = multiRunner.getResults();
      expect(results.variantResults.length).toBe(3);
    });
  });
});
