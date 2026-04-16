"use strict";
/**
 * Mock Context for Testing
 *
 * @module asf-v4/test-utils/mock-context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockContext = createMockContext;
function createMockContext() {
    return {
        logger: console,
        mempalace: {
            createWing: async (name, graph) => {
                console.log(`Mock: Created wing ${name}`);
                return { name, graph };
            }
        },
        // Add other mock context properties as needed
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay1jb250ZXh0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC11dGlscy9tb2NrLWNvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7O0FBRUgsOENBV0M7QUFYRCxTQUFnQixpQkFBaUI7SUFDL0IsT0FBTztRQUNMLE1BQU0sRUFBRSxPQUFPO1FBQ2YsU0FBUyxFQUFFO1lBQ1QsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFZLEVBQUUsS0FBVSxFQUFFLEVBQUU7Z0JBQzdDLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDekIsQ0FBQztTQUNGO1FBQ0QsOENBQThDO0tBQy9DLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNb2NrIENvbnRleHQgZm9yIFRlc3RpbmdcbiAqIFxuICogQG1vZHVsZSBhc2YtdjQvdGVzdC11dGlscy9tb2NrLWNvbnRleHRcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NvbnRleHQoKSB7XG4gIHJldHVybiB7XG4gICAgbG9nZ2VyOiBjb25zb2xlLFxuICAgIG1lbXBhbGFjZToge1xuICAgICAgY3JlYXRlV2luZzogYXN5bmMgKG5hbWU6IHN0cmluZywgZ3JhcGg6IGFueSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgTW9jazogQ3JlYXRlZCB3aW5nICR7bmFtZX1gKTtcbiAgICAgICAgcmV0dXJuIHsgbmFtZSwgZ3JhcGggfTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIEFkZCBvdGhlciBtb2NrIGNvbnRleHQgcHJvcGVydGllcyBhcyBuZWVkZWRcbiAgfTtcbn0iXX0=