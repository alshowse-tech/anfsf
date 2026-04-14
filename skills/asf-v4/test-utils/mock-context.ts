/**
 * Mock Context for Testing
 * 
 * @module asf-v4/test-utils/mock-context
 */

export function createMockContext() {
  return {
    logger: console,
    mempalace: {
      createWing: async (name: string, graph: any) => {
        console.log(`Mock: Created wing ${name}`);
        return { name, graph };
      }
    },
    // Add other mock context properties as needed
  };
}