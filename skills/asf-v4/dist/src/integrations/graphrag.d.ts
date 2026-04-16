/**
 * ANFSF V1.5.0 - GraphRAG Integration
 *
 * Enterprise-grade GraphRAG using Neo4j.
 * Provides node-level validation, relationship traversal, and semantic graph search.
 */
/**
 * GraphRAG configuration.
 */
export interface GraphRAGConfig {
    uri: string;
    username: string;
    password: string;
    database?: string;
    enableValidation: boolean;
    enableTraversal: boolean;
}
/**
 * Graph node for validation.
 */
export interface GraphNode {
    id: string;
    type: string;
    properties: Record<string, any>;
    relationships: GraphRelationship[];
}
export interface GraphRelationship {
    type: string;
    target: string;
    properties: Record<string, any>;
}
/**
 * GraphRAG validation result.
 */
export interface GraphValidationResult {
    passed: boolean;
    validatedNodes: number[];
    conflictingNodes: number[];
    confidence: number;
}
/**
 * GraphRAG class for node-level validation and traversal.
 */
export declare class GraphRAG {
    private config;
    private driver;
    private connected;
    constructor(config?: Partial<GraphRAGConfig>);
    /**
     * Connect to Neo4j database.
     */
    connect(): Promise<void>;
    /**
     * Disconnect from Neo4j database.
     */
    disconnect(): Promise<void>;
    /**
     * Validate statements against graph knowledge.
     */
    validateStatements(statements: string[], sources: Array<{
        id: string;
        content: string;
    }>): Promise<GraphValidationResult>;
    /**
     * Validate a single statement against graph.
     */
    private validateNode;
    /**
     * Extract entities from statement.
     */
    private extractEntities;
    /**
     * Simulate validation when not connected.
     */
    private simulateValidation;
    /**
     * Traverse graph relationships.
     */
    traverseRelationships(startNode: string, maxDepth?: number): Promise<GraphNode[]>;
    /**
     * Search graph semantically.
     */
    semanticSearch(query: string, limit?: number): Promise<GraphNode[]>;
    /**
     * Check connection status.
     */
    isConnected(): boolean;
    /**
     * Get GraphRAG metadata.
     */
    getMetadata(): Record<string, any>;
}
/**
 * Create GraphRAG instance.
 */
export declare function createGraphRAG(config?: Partial<GraphRAGConfig>): GraphRAG;
export declare function getDefaultGraphRAG(): GraphRAG;
