/**
 * Mock Context for Testing
 *
 * @module asf-v4/test-utils/mock-context
 */
export declare function createMockContext(): {
    logger: Console;
    mempalace: {
        createWing: (name: string, graph: any) => Promise<{
            name: string;
            graph: any;
        }>;
    };
};
