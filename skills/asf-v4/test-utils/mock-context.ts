/**
 * Mock Context for Testing
 * 
 * @module asf-v4/test-utils/mock-context
 */

interface MemoryGraph {
  [key: string]: unknown
}

interface MockMempalace {
  createWing: (name: string, graph: MemoryGraph) => Promise<{ name: string; graph: MemoryGraph }>
}

interface MockContext {
  logger: Console
  mempalace: MockMempalace
}

export function createMockContext(): MockContext {
  return {
    logger: console,
    mempalace: {
      createWing: async (name: string, graph: MemoryGraph) => {
        console.log(`Mock: Created wing ${name}`);
        return { name, graph };
      }
    },
    // Add other mock context properties as needed
  };
}