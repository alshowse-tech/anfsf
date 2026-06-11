/**
 * Why-What-How Reasoner Tests
 */

import { WhyWhatHowReasoner, ReasoningResult } from '../why-what-how-reasoner';
import { LLMClient } from '../../integrations/llm-client';

describe('WhyWhatHowReasoner', () => {
  let llm: LLMClient;
  let reasoner: WhyWhatHowReasoner;

  beforeEach(() => {
    llm = new LLMClient({ apiKey: 'sk-test-fake' });
    reasoner = new WhyWhatHowReasoner({ llmClient: llm, model: 'qwen3.5-plus' });
  });

  describe('initialization', () => {
    it('should create a reasoner with default config', () => {
      expect(reasoner).toBeDefined();
    });

    it('should accept custom config', () => {
      const custom = new WhyWhatHowReasoner({
        llmClient: llm,
        model: 'deepseek-chat',
      });
      expect(custom).toBeDefined();
    });
  });

  describe('reason', () => {
    it('should return a reasoning result for valid PRD text', async () => {
      const prdText = 'Build a todo app with categories, due dates, and notifications.';
      const result = await reasoner.reason(prdText);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    }, 30000);

    it('should handle empty PRD text', async () => {
      const result = await reasoner.reason('');
      expect(result).toBeDefined();
    }, 30000);

    it('should handle very long PRD text', async () => {
      const longText = 'Feature: '.repeat(1000);
      const result = await reasoner.reason(longText);
      expect(result).toBeDefined();
    }, 30000);
  });

  describe('error handling', () => {
    it('should handle LLM client errors gracefully', async () => {
      const badLlm = new LLMClient({ apiKey: '' }); // no key
      const badReasoner = new WhyWhatHowReasoner({ llmClient: badLlm });
      const result = await badReasoner.reason('Test PRD');
      // Should still return a result, even if the LLM call fails
      expect(result).toBeDefined();
    }, 30000);
  });
});
