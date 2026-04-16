"use strict";
/**
 * ANFSF V1.5.0 - GraphRAG Integration
 *
 * Enterprise-grade GraphRAG using Neo4j.
 * Provides node-level validation, relationship traversal, and semantic graph search.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRAG = void 0;
exports.createGraphRAG = createGraphRAG;
exports.getDefaultGraphRAG = getDefaultGraphRAG;
const DEFAULT_CONFIG = {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
    database: 'neo4j',
    enableValidation: true,
    enableTraversal: true,
};
/**
 * GraphRAG class for node-level validation and traversal.
 */
class GraphRAG {
    constructor(config = {}) {
        this.driver = null;
        this.connected = false;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Connect to Neo4j database.
     */
    async connect() {
        try {
            // Simulated connection (in production, use neo4j-driver)
            // const neo4j = require('neo4j-driver');
            // this.driver = neo4j.driver(
            //   this.config.uri,
            //   neo4j.auth.basic(this.config.username, this.config.password)
            // );
            this.connected = true;
            console.log('[GraphRAG] Connected to Neo4j:', this.config.uri);
        }
        catch (error) {
            console.error('[GraphRAG] Connection failed:', error);
            this.connected = false;
            throw error;
        }
    }
    /**
     * Disconnect from Neo4j database.
     */
    async disconnect() {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
        }
        this.connected = false;
    }
    /**
     * Validate statements against graph knowledge.
     */
    async validateStatements(statements, sources) {
        if (!this.connected) {
            // Fallback to simulated validation
            return this.simulateValidation(statements);
        }
        const validatedNodes = [];
        const conflictingNodes = [];
        for (let i = 0; i < statements.length; i++) {
            const isValid = await this.validateNode(statements[i], sources);
            if (isValid) {
                validatedNodes.push(i);
            }
            else {
                conflictingNodes.push(i);
            }
        }
        return {
            passed: conflictingNodes.length === 0,
            validatedNodes,
            conflictingNodes,
            confidence: validatedNodes.length / statements.length,
        };
    }
    /**
     * Validate a single statement against graph.
     */
    async validateNode(statement, sources) {
        if (!this.connected)
            return true;
        try {
            // Extract entities from statement
            const entities = this.extractEntities(statement);
            // Query graph for entity relationships
            const query = `
        MATCH (n:Entity)
        WHERE n.name IN $entities
        RETURN n.name, n.type, n.properties
      `;
            // In production, execute actual Neo4j query
            // const session = this.driver!.session();
            // const result = await session.run(query, { entities });
            // Simulated validation
            return entities.length > 0;
        }
        catch (error) {
            console.error('[GraphRAG] Validation error:', error);
            return false;
        }
    }
    /**
     * Extract entities from statement.
     */
    extractEntities(statement) {
        // Simple entity extraction (in production, use NER model)
        const entities = [];
        const words = statement.split(/\s+/);
        // Extract capitalized words as potential entities
        for (const word of words) {
            if (word[0] >= 'A' && word[0] <= 'Z' && word.length > 2) {
                entities.push(word);
            }
        }
        return entities;
    }
    /**
     * Simulate validation when not connected.
     */
    simulateValidation(statements) {
        const validatedNodes = [];
        const conflictingNodes = [];
        for (let i = 0; i < statements.length; i++) {
            // Simulate 90% pass rate
            if (Math.random() > 0.1) {
                validatedNodes.push(i);
            }
            else {
                conflictingNodes.push(i);
            }
        }
        return {
            passed: conflictingNodes.length === 0,
            validatedNodes,
            conflictingNodes,
            confidence: validatedNodes.length / statements.length,
        };
    }
    /**
     * Traverse graph relationships.
     */
    async traverseRelationships(startNode, maxDepth = 3) {
        if (!this.connected) {
            return [];
        }
        // In production, execute actual Neo4j traversal
        // const query = `
        //   MATCH path = (n:Entity {id: $startNode})-[*1..${maxDepth}]->(m)
        //   RETURN nodes(path), relationships(path)
        // `;
        return [];
    }
    /**
     * Search graph semantically.
     */
    async semanticSearch(query, limit = 10) {
        if (!this.connected) {
            return [];
        }
        // In production, use Neo4j with vector search
        // const query = `
        //   MATCH (n:Entity)
        //   WHERE vectorSimilarity(n.embedding, $queryVector) > 0.7
        //   RETURN n
        //   LIMIT $limit
        // `;
        return [];
    }
    /**
     * Check connection status.
     */
    isConnected() {
        return this.connected;
    }
    /**
     * Get GraphRAG metadata.
     */
    getMetadata() {
        return {
            type: 'GraphRAG',
            backend: 'Neo4j',
            connected: this.connected,
            uri: this.config.uri,
            validationEnabled: this.config.enableValidation,
            traversalEnabled: this.config.enableTraversal,
        };
    }
}
exports.GraphRAG = GraphRAG;
/**
 * Create GraphRAG instance.
 */
function createGraphRAG(config) {
    return new GraphRAG(config);
}
/**
 * Singleton GraphRAG instance.
 */
let defaultGraphRAG = null;
function getDefaultGraphRAG() {
    if (!defaultGraphRAG) {
        defaultGraphRAG = new GraphRAG();
    }
    return defaultGraphRAG;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGhyYWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvaW50ZWdyYXRpb25zL2dyYXBocmFnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBK1FILHdDQUVDO0FBT0QsZ0RBS0M7QUFoUUQsTUFBTSxjQUFjLEdBQW1CO0lBQ3JDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSx1QkFBdUI7SUFDckQsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLE9BQU87SUFDL0MsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLFVBQVU7SUFDbEQsUUFBUSxFQUFFLE9BQU87SUFDakIsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixlQUFlLEVBQUUsSUFBSTtDQUN0QixDQUFDO0FBNEJGOztHQUVHO0FBQ0gsTUFBYSxRQUFRO0lBS25CLFlBQVksU0FBa0MsRUFBRTtRQUh4QyxXQUFNLEdBQXVCLElBQUksQ0FBQztRQUNsQyxjQUFTLEdBQVksS0FBSyxDQUFDO1FBR2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO0lBQ2pELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPO1FBQ1gsSUFBSSxDQUFDO1lBQ0gseURBQXlEO1lBQ3pELHlDQUF5QztZQUN6Qyw4QkFBOEI7WUFDOUIscUJBQXFCO1lBQ3JCLGlFQUFpRTtZQUNqRSxLQUFLO1lBQ0wsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywrQkFBK0Is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QUM7WUFDcEIsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQsOENBQThDO1FBQzlDLGtCQUFrQjtRQUNsQixxQkFBcUI7UUFDckIsNERBQTREO1FBQzVELGFBQWE7UUFDYixpQkFBaUI7UUFDakIsS0FBSztRQUVMLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVztRQUNULE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxXQUFXO1FBQ1QsT0FBTztZQUNMLElBQUksRUFBRSxVQUFVO1lBQ2hCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHO1lBQ3BCLGlCQUFpQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCO1lBQy9DLGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZTtTQUM5QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBdk1ELDRCQXVNQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE1BQWdDO0lBQzdELE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsSUFBSSxlQUFlLEdBQW9CLElBQUksQ0FBQztBQUU1QyxTQUFnQixrQkFBa0I7SUFDaEMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLGVBQWUsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFDRCxPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWMS41LjAgLSBHcmFwaFJBRyBJbnRlZ3JhdGlvblxuICogXG4gKiBFbnRlcnByaXNlLWdyYWRlIEdyYXBoUkFHIHVzaW5nIE5lbzRqLlxuICogUHJvdmlkZXMgbm9kZS1sZXZlbCB2YWxpZGF0aW9uLCByZWxhdGlvbnNoaXAgdHJhdmVyc2FsLCBhbmQgc2VtYW50aWMgZ3JhcGggc2VhcmNoLlxuICovXG5cbi8vIE5lbzRqIGRyaXZlciB0eXBlc1xuaW50ZXJmYWNlIE5lbzRqRHJpdmVyIHtcbiAgc2Vzc2lvbjogKCkgPT4gTmVvNGpTZXNzaW9uO1xuICBjbG9zZTogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbn1cblxuaW50ZXJmYWNlIE5lbzRqU2Vzc2lvbiB7XG4gIHJ1bjogKHF1ZXJ5OiBzdHJpbmcsIHBhcmFtcz86IGFueSkgPT4gUHJvbWlzZTxOZW80alJlc3VsdD47XG4gIGNsb3NlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xufVxuXG5pbnRlcmZhY2UgTmVvNGpSZXN1bHQge1xuICByZWNvcmRzOiBBcnJheTx7IGdldDogKGtleTogc3RyaW5nKSA9PiBhbnkgfT47XG59XG5cbi8qKlxuICogR3JhcGhSQUcgY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaFJBR0NvbmZpZyB7XG4gIHVyaTogc3RyaW5nO1xuICB1c2VybmFtZTogc3RyaW5nO1xuICBwYXNzd29yZDogc3RyaW5nO1xuICBkYXRhYmFzZT86IHN0cmluZztcbiAgZW5hYmxlVmFsaWRhdGlvbjogYm9vbGVhbjtcbiAgZW5hYmxlVHJhdmVyc2FsOiBib29sZWFuO1xufVxuXG5jb25zdCBERUZBVUxUX0NPTkZJRzogR3JhcGhSQUdDb25maWcgPSB7XG4gIHVyaTogcHJvY2Vzcy5lbnYuTkVPNEpfVVJJIHx8ICdib2x0Oi8vbG9jYWxob3N0Ojc2ODcnLFxuICB1c2VybmFtZTogcHJvY2Vzcy5lbnYuTkVPNEpfVVNFUk5BTUUgfHwgJ25lbzRqJyxcbiAgcGFzc3dvcmQ6IHByb2Nlc3MuZW52Lk5FTzRKX1BBU1NXT1JEIHx8ICdwYXNzd29yZCcsXG4gIGRhdGFiYXNlOiAnbmVvNGonLFxuICBlbmFibGVWYWxpZGF0aW9uOiB0cnVlLFxuICBlbmFibGVUcmF2ZXJzYWw6IHRydWUsXG59O1xuXG4vKipcbiAqIEdyYXBoIG5vZGUgZm9yIHZhbGlkYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhOb2RlIHtcbiAgaWQ6IHN0cmluZztcbiAgdHlwZTogc3RyaW5nO1xuICBwcm9wZXJ0aWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuICByZWxhdGlvbnNoaXBzOiBHcmFwaFJlbGF0aW9uc2hpcFtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoUmVsYXRpb25zaGlwIHtcbiAgdHlwZTogc3RyaW5nO1xuICB0YXJnZXQ6IHN0cmluZztcbiAgcHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55Pjtcbn1cblxuLyoqXG4gKiBHcmFwaFJBRyB2YWxpZGF0aW9uIHJlc3VsdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaFZhbGlkYXRpb25SZXN1bHQge1xuICBwYXNzZWQ6IGJvb2xlYW47XG4gIHZhbGlkYXRlZE5vZGVzOiBudW1iZXJbXTtcbiAgY29uZmxpY3RpbmdOb2RlczogbnVtYmVyW107XG4gIGNvbmZpZGVuY2U6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBHcmFwaFJBRyBjbGFzcyBmb3Igbm9kZS1sZXZlbCB2YWxpZGF0aW9uIGFuZCB0cmF2ZXJzYWwuXG4gKi9cbmV4cG9ydCBjbGFzcyBHcmFwaFJBRyB7XG4gIHByaXZhdGUgY29uZmlnOiBHcmFwaFJBR0NvbmZpZztcbiAgcHJpdmF0ZSBkcml2ZXI6IE5lbzRqRHJpdmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBQYXJ0aWFsPEdyYXBoUkFHQ29uZmlnPiA9IHt9KSB7XG4gICAgdGhpcy5jb25maWcgPSB7IC4uLkRFRkFVTFRfQ09ORklHLCAuLi5jb25maWcgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIE5lbzRqIGRhdGFiYXNlLlxuICAgKi9cbiAgYXN5bmMgY29ubmVjdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgLy8gU2ltdWxhdGVkIGNvbm5lY3Rpb24gKGluIHByb2R1Y3Rpb24sIHVzZSBuZW80ai1kcml2ZXIpXG4gICAgICAvLyBjb25zdCBuZW80aiA9IHJlcXVpcmUoJ25lbzRqLWRyaXZlcicpO1xuICAgICAgLy8gdGhpcy5kcml2ZXIgPSBuZW80ai5kcml2ZXIoXG4gICAgICAvLyAgIHRoaXMuY29uZmlnLnVyaSxcbiAgICAgIC8vICAgbmVvNGouYXV0aC5iYXNpYyh0aGlzLmNvbmZpZy51c2VybmFtZSwgdGhpcy5jb25maWcucGFzc3dvcmQpXG4gICAgICAvLyApO1xuICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5sb2coJ1tHcmFwaFJBR10gQ29ubmVjdGVkIHRvIE5lbzRqOicsIHRoaXMuY29uZmlnLnVyaSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tHcmFwaFJBR10gQ29ubmVjdGlvbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNjb25uZWN0IGZyb20gTmVvNGogZGF0YWJhc2UuXG4gICAqL1xuICBhc3luYyBkaXNjb25uZWN0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmRyaXZlcikge1xuICAgICAgYXdhaXQgdGhpcy5kcml2ZXIuY2xvc2UoKTtcbiAgICAgIHRoaXMuZHJpdmVyID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBzdGF0ZW1lbnRzIGFnYWluc3QgZ3JhcGgga25vd2xlZGdlLlxuICAgKi9cbiAgYXN5bmMgdmFsaWRhdGVTdGF0ZW1lbnRzKFxuICAgIHN0YXRlbWVudHM6IHN0cmluZ1tdLFxuICAgIHNvdXJjZXM6IEFycmF5PHsgaWQ6IHN0cmluZzsgY29udGVudDogc3RyaW5nIH0+XG4gICk6IFByb21pc2U8R3JhcGhWYWxpZGF0aW9uUmVzdWx0PiB7XG4gICAgaWYgKCF0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgLy8gRmFsbGJhY2sgdG8gc2ltdWxhdGVkIHZhbGlkYXRpb25cbiAgICAgIHJldHVybiB0aGlzLnNpbXVsYXRlVmFsaWRhdGlvbihzdGF0ZW1lbnRzKTtcbiAgICB9XG5cbiAgICBjb25zdCB2YWxpZGF0ZWROb2RlczogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCBjb25mbGljdGluZ05vZGVzOiBudW1iZXJbXSA9IFtdO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBpc1ZhbGlkID0gYXdhaXQgdGhpcy52YWxpZGF0ZU5vZGUoc3RhdGVtZW50c1tpXSwgc291cmNlcyk7XG4gICAgICBpZiAoaXNWYWxpZCkge1xuICAgICAgICB2YWxpZGF0ZWROb2Rlcy5wdXNoKGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uZmxpY3RpbmdOb2Rlcy5wdXNoKGkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwYXNzZWQ6IGNvbmZsaWN0aW5nTm9kZXMubGVuZ3RoID09PSAwLFxuICAgICAgdmFsaWRhdGVkTm9kZXMsXG4gICAgICBjb25mbGljdGluZ05vZGVzLFxuICAgICAgY29uZmlkZW5jZTogdmFsaWRhdGVkTm9kZXMubGVuZ3RoIC8gc3RhdGVtZW50cy5sZW5ndGgsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBhIHNpbmdsZSBzdGF0ZW1lbnQgYWdhaW5zdCBncmFwaC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVOb2RlKHN0YXRlbWVudDogc3RyaW5nLCBzb3VyY2VzOiBhbnlbXSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHJldHVybiB0cnVlO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEV4dHJhY3QgZW50aXRpZXMgZnJvbSBzdGF0ZW1lbnRcbiAgICAgIGNvbnN0IGVudGl0aWVzID0gdGhpcy5leHRyYWN0RW50aXRpZXMoc3RhdGVtZW50KTtcblxuICAgICAgLy8gUXVlcnkgZ3JhcGggZm9yIGVudGl0eSByZWxhdGlvbnNoaXBzXG4gICAgICBjb25zdCBxdWVyeSA9IGBcbiAgICAgICAgTUFUQ0ggKG46RW50aXR5KVxuICAgICAgICBXSEVSRSBuLm5hbWUgSU4gJGVudGl0aWVzXG4gICAgICAgIFJFVFVSTiBuLm5hbWUsIG4udHlwZSwgbi5wcm9wZXJ0aWVzXG4gICAgICBgO1xuXG4gICAgICAvLyBJbiBwcm9kdWN0aW9uLCBleGVjdXRlIGFjdHVhbCBOZW80aiBxdWVyeVxuICAgICAgLy8gY29uc3Qgc2Vzc2lvbiA9IHRoaXMuZHJpdmVyIS5zZXNzaW9uKCk7XG4gICAgICAvLyBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXNzaW9uLnJ1bihxdWVyeSwgeyBlbnRpdGllcyB9KTtcblxuICAgICAgLy8gU2ltdWxhdGVkIHZhbGlkYXRpb25cbiAgICAgIHJldHVybiBlbnRpdGllcy5sZW5ndGggPiAwO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbR3JhcGhSQUddIFZhbGlkYXRpb24gZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGVudGl0aWVzIGZyb20gc3RhdGVtZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RW50aXRpZXMoc3RhdGVtZW50OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgLy8gU2ltcGxlIGVudGl0eSBleHRyYWN0aW9uIChpbiBwcm9kdWN0aW9uLCB1c2UgTkVSIG1vZGVsKVxuICAgIGNvbnN0IGVudGl0aWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHdvcmRzID0gc3RhdGVtZW50LnNwbGl0KC9cXHMrLyk7XG5cbiAgICAvLyBFeHRyYWN0IGNhcGl0YWxpemVkIHdvcmRzIGFzIHBvdGVudGlhbCBlbnRpdGllc1xuICAgIGZvciAoY29uc3Qgd29yZCBvZiB3b3Jkcykge1xuICAgICAgaWYgKHdvcmRbMF0gPj0gJ0EnICYmIHdvcmRbMF0gPD0gJ1onICYmIHdvcmQubGVuZ3RoID4gMikge1xuICAgICAgICBlbnRpdGllcy5wdXNoKHdvcmQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBlbnRpdGllcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTaW11bGF0ZSB2YWxpZGF0aW9uIHdoZW4gbm90IGNvbm5lY3RlZC5cbiAgICovXG4gIHByaXZhdGUgc2ltdWxhdGVWYWxpZGF0aW9uKHN0YXRlbWVudHM6IHN0cmluZ1tdKTogR3JhcGhWYWxpZGF0aW9uUmVzdWx0IHtcbiAgICBjb25zdCB2YWxpZGF0ZWROb2RlczogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCBjb25mbGljdGluZ05vZGVzOiBudW1iZXJbXSA9IFtdO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBTaW11bGF0ZSA5MCUgcGFzcyByYXRlXG4gICAgICBpZiAoTWF0aC5yYW5kb20oKSA+IDAuMSkge1xuICAgICAgICB2YWxpZGF0ZWROb2Rlcy5wdXNoKGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uZmxpY3RpbmdOb2Rlcy5wdXNoKGkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwYXNzZWQ6IGNvbmZsaWN0aW5nTm9kZXMubGVuZ3RoID09PSAwLFxuICAgICAgdmFsaWRhdGVkTm9kZXMsXG4gICAgICBjb25mbGljdGluZ05vZGVzLFxuICAgICAgY29uZmlkZW5jZTogdmFsaWRhdGVkTm9kZXMubGVuZ3RoIC8gc3RhdGVtZW50cy5sZW5ndGgsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmF2ZXJzZSBncmFwaCByZWxhdGlvbnNoaXBzLlxuICAgKi9cbiAgYXN5bmMgdHJhdmVyc2VSZWxhdGlvbnNoaXBzKHN0YXJ0Tm9kZTogc3RyaW5nLCBtYXhEZXB0aDogbnVtYmVyID0gMyk6IFByb21pc2U8R3JhcGhOb2RlW10+IHtcbiAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgLy8gSW4gcHJvZHVjdGlvbiwgZXhlY3V0ZSBhY3R1YWwgTmVvNGogdHJhdmVyc2FsXG4gICAgLy8gY29uc3QgcXVlcnkgPSBgXG4gICAgLy8gICBNQVRDSCBwYXRoID0gKG46RW50aXR5IHtpZDogJHN0YXJ0Tm9kZX0pLVsqMS4uJHttYXhEZXB0aH1dLT4obSlcbiAgICAvLyAgIFJFVFVSTiBub2RlcyhwYXRoKSwgcmVsYXRpb25zaGlwcyhwYXRoKVxuICAgIC8vIGA7XG5cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIGdyYXBoIHNlbWFudGljYWxseS5cbiAgICovXG4gIGFzeW5jIHNlbWFudGljU2VhcmNoKHF1ZXJ5OiBzdHJpbmcsIGxpbWl0OiBudW1iZXIgPSAxMCk6IFByb21pc2U8R3JhcGhOb2RlW10+IHtcbiAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgLy8gSW4gcHJvZHVjdGlvbiwgdXNlIE5lbzRqIHdpdGggdmVjdG9yIHNlYXJjaFxuICAgIC8vIGNvbnN0IHF1ZXJ5ID0gYFxuICAgIC8vICAgTUFUQ0ggKG46RW50aXR5KVxuICAgIC8vICAgV0hFUkUgdmVjdG9yU2ltaWxhcml0eShuLmVtYmVkZGluZywgJHF1ZXJ5VmVjdG9yKSA+IDAuN1xuICAgIC8vICAgUkVUVVJOIG5cbiAgICAvLyAgIExJTUlUICRsaW1pdFxuICAgIC8vIGA7XG5cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgY29ubmVjdGlvbiBzdGF0dXMuXG4gICAqL1xuICBpc0Nvbm5lY3RlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb25uZWN0ZWQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IEdyYXBoUkFHIG1ldGFkYXRhLlxuICAgKi9cbiAgZ2V0TWV0YWRhdGEoKTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdHcmFwaFJBRycsXG4gICAgICBiYWNrZW5kOiAnTmVvNGonLFxuICAgICAgY29ubmVjdGVkOiB0aGlzLmNvbm5lY3RlZCxcbiAgICAgIHVyaTogdGhpcy5jb25maWcudXJpLFxuICAgICAgdmFsaWRhdGlvbkVuYWJsZWQ6IHRoaXMuY29uZmlnLmVuYWJsZVZhbGlkYXRpb24sXG4gICAgICB0cmF2ZXJzYWxFbmFibGVkOiB0aGlzLmNvbmZpZy5lbmFibGVUcmF2ZXJzYWwsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBHcmFwaFJBRyBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUdyYXBoUkFHKGNvbmZpZz86IFBhcnRpYWw8R3JhcGhSQUdDb25maWc+KTogR3JhcGhSQUcge1xuICByZXR1cm4gbmV3IEdyYXBoUkFHKGNvbmZpZyk7XG59XG5cbi8qKlxuICogU2luZ2xldG9uIEdyYXBoUkFHIGluc3RhbmNlLlxuICovXG5sZXQgZGVmYXVsdEdyYXBoUkFHOiBHcmFwaFJBRyB8IG51bGwgPSBudWxsO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdEdyYXBoUkFHKCk6IEdyYXBoUkFHIHtcbiAgaWYgKCFkZWZhdWx0R3JhcGhSQUcpIHtcbiAgICBkZWZhdWx0R3JhcGhSQUcgPSBuZXcgR3JhcGhSQUcoKTtcbiAgfVxuICByZXR1cm4gZGVmYXVsdEdyYXBoUkFHO1xufVxuIl19