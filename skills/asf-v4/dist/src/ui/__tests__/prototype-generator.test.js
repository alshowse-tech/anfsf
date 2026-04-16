"use strict";
/**
 * Prototype Generator Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const prototype_generator_1 = require("../prototype-generator");
describe('PrototypeGenerator', () => {
    let generator;
    beforeEach(() => {
        generator = (0, prototype_generator_1.createPrototypeGenerator)();
    });
    describe('generate', () => {
        it('should generate prototype from PRD', async () => {
            const prd = {
                id: 'prd-1',
                title: 'Test Product',
                description: 'A test product',
                features: [],
                userFlows: [
                    {
                        id: 'flow-1',
                        name: 'Login',
                        steps: [
                            { id: 'step-1', action: 'Navigate to login', nextStep: 'step-2' },
                            { id: 'step-2', action: 'Submit credentials' },
                        ],
                        entryPoint: 'step-1',
                    },
                ],
                uiRequirements: [],
                constraints: [],
            };
            const prototype = await generator.generate(prd);
            expect(prototype.id).toContain('prototype-prd-1');
            expect(prototype.pages.length).toBeGreaterThan(0);
            expect(prototype.flows.length).toBeGreaterThan(0);
            expect(prototype.designTokens).toBeDefined();
            expect(prototype.previewUrl).toBeDefined();
            expect(prototype.shareUrl).toBeDefined();
        });
        it('should generate multiple pages for multiple flows', async () => {
            const prd = {
                id: 'prd-2',
                title: 'Multi-Flow Product',
                description: 'Product with multiple flows',
                features: [],
                userFlows: [
                    {
                        id: 'flow-1',
                        name: 'Login',
                        steps: [{ id: 'step-1', action: 'Login' }],
                        entryPoint: 'step-1',
                    },
                    {
                        id: 'flow-2',
                        name: 'Dashboard',
                        steps: [{ id: 'step-1', action: 'View dashboard' }],
                        entryPoint: 'step-1',
                    },
                ],
                uiRequirements: [],
                constraints: [],
            };
            const prototype = await generator.generate(prd);
            expect(prototype.pages.length).toBeGreaterThanOrEqual(2);
        });
        it('should cache generated prototype', async () => {
            const prd = {
                id: 'prd-3',
                title: 'Cached Product',
                description: 'Product for caching test',
                features: [],
                userFlows: [{
                        id: 'flow-1',
                        name: 'Test',
                        steps: [{ id: 'step-1', action: 'Test' }],
                        entryPoint: 'step-1',
                    }],
                uiRequirements: [],
                constraints: [],
            };
            const prototype1 = await generator.generate(prd);
            const prototype2 = await generator.generate(prd);
            expect(prototype1.id).toBe(prototype2.id);
        });
    });
    describe('exportToFigma', () => {
        it('should export prototype to Figma', async () => {
            const prd = {
                id: 'prd-4',
                title: 'Figma Export Test',
                description: 'Test',
                features: [],
                userFlows: [{
                        id: 'flow-1',
                        name: 'Test',
                        steps: [{ id: 'step-1', action: 'Test' }],
                        entryPoint: 'step-1',
                    }],
                uiRequirements: [],
                constraints: [],
            };
            const prototype = await generator.generate(prd);
            const result = await generator.exportToFigma(prototype);
            expect(result.success).toBe(true);
            expect(result.figmaFileId).toBeDefined();
            expect(result.figmaUrl).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });
    });
    describe('exportToCode', () => {
        it('should export prototype to code', async () => {
            const prd = {
                id: 'prd-5',
                title: 'Code Export Test',
                description: 'Test',
                features: [],
                userFlows: [{
                        id: 'flow-1',
                        name: 'Test',
                        steps: [{ id: 'step-1', action: 'Test' }],
                        entryPoint: 'step-1',
                    }],
                uiRequirements: [],
                constraints: [],
            };
            const prototype = await generator.generate(prd);
            const result = await generator.exportToCode(prototype, {
                outputDir: './output',
                format: 'esm',
                typescript: true,
                includeTests: true,
                includeStories: true,
            });
            expect(result.success).toBe(true);
            expect(result.files.length).toBeGreaterThan(0);
            expect(result.summary.totalFiles).toBe(result.files.length);
            expect(result.summary.totalLines).toBeGreaterThan(0);
        });
        it('should generate test files when includeTests is true', async () => {
            const prd = {
                id: 'prd-6',
                title: 'Test Export',
                description: 'Test',
                features: [],
                userFlows: [{
                        id: 'flow-1',
                        name: 'Test',
                        steps: [{ id: 'step-1', action: 'Test' }],
                        entryPoint: 'step-1',
                    }],
                uiRequirements: [],
                constraints: [],
            };
            const prototype = await generator.generate(prd);
            const resultWithTests = await generator.exportToCode(prototype, {
                outputDir: './output',
                format: 'esm',
                typescript: true,
                includeTests: true,
                includeStories: false,
            });
            const resultWithoutTests = await generator.exportToCode(prototype, {
                outputDir: './output',
                format: 'esm',
                typescript: true,
                includeTests: false,
                includeStories: false,
            });
            expect(resultWithTests.summary.tests).toBeGreaterThan(0);
            expect(resultWithoutTests.summary.tests).toBe(0);
        });
        it('should generate story files when includeStories is true', async () => {
            const prd = {
                id: 'prd-7',
                title: 'Story Export',
                description: 'Test',
                features: [],
                userFlows: [{
                        id: 'flow-1',
                        name: 'Test',
                        steps: [{ id: 'step-1', action: 'Test' }],
                        entryPoint: 'step-1',
                    }],
                uiRequirements: [],
                constraints: [],
            };
            const prototype = await generator.generate(prd);
            const resultWithStories = await generator.exportToCode(prototype, {
                outputDir: './output',
                format: 'esm',
                typescript: true,
                includeTests: false,
                includeStories: true,
            });
            expect(resultWithStories.summary.stories).toBeGreaterThan(0);
        });
    });
    describe('collectFeedback', () => {
        it('should collect feedback for prototype', async () => {
            const prd = {
                id: 'prd-8',
                title: 'Feedback Test',
                description: 'Test',
                features: [],
                userFlows: [{
                        id: 'flow-1',
                        name: 'Test',
                        steps: [{ id: 'step-1', action: 'Test' }],
                        entryPoint: 'step-1',
                    }],
                uiRequirements: [],
                constraints: [],
            };
            const prototype = await generator.generate(prd);
            const feedback = await generator.collectFeedback(prototype);
            expect(feedback.length).toBeGreaterThan(0);
            expect(feedback[0].rating).toBeGreaterThanOrEqual(1);
            expect(feedback[0].rating).toBeLessThanOrEqual(5);
        });
    });
});
describe('generatePrototypeSummary', () => {
    it('should generate prototype summary', async () => {
        const generator = (0, prototype_generator_1.createPrototypeGenerator)();
        const prd = {
            id: 'prd-9',
            title: 'Summary Test',
            description: 'Test',
            features: [],
            userFlows: [{
                    id: 'flow-1',
                    name: 'Test Flow',
                    steps: [{ id: 'step-1', action: 'Test' }],
                    entryPoint: 'step-1',
                }],
            uiRequirements: [],
            constraints: [],
        };
        const prototype = await generator.generate(prd);
        const summary = (0, prototype_generator_1.generatePrototypeSummary)(prototype);
        expect(summary).toContain('Prototype Summary');
        expect(summary).toContain(prototype.id);
        expect(summary).toContain(prototype.previewUrl);
    });
});
describe('validatePrototype', () => {
    it('should validate complete prototype', async () => {
        const generator = (0, prototype_generator_1.createPrototypeGenerator)();
        const prd = {
            id: 'prd-10',
            title: 'Validation Test',
            description: 'Test',
            features: [],
            userFlows: [{
                    id: 'flow-1',
                    name: 'Test',
                    steps: [{ id: 'step-1', action: 'Test' }],
                    entryPoint: 'step-1',
                }],
            uiRequirements: [],
            constraints: [],
        };
        const prototype = await generator.generate(prd);
        const result = (0, prototype_generator_1.validatePrototype)(prototype);
        expect(result.valid).toBe(true);
        expect(result.issues.length).toBe(0);
    });
    it('should detect incomplete prototype', () => {
        const incompletePrototype = {
            id: 'prototype-incomplete',
            pages: [],
            flows: [],
            designTokens: {
                colors: { primary: {}, secondary: {}, neutral: {}, semantic: {} },
                typography: { fontFamily: '', fontFamilyMono: '', fontSize: {}, fontWeight: {}, lineHeight: {} },
                spacing: {},
                shadows: {},
                radii: {},
            },
            previewUrl: '',
            shareUrl: '',
        };
        const result = (0, prototype_generator_1.validatePrototype)(incompletePrototype);
        expect(result.valid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdG90eXBlLWdlbmVyYXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3VpL19fdGVzdHNfXy9wcm90b3R5cGUtZ2VuZXJhdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQUVILGdFQUFtSTtBQUVuSSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLElBQUksU0FBNkIsQ0FBQztJQUVsQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsU0FBUyxHQUFHLElBQUEsOENBQXdCLEdBQUUsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLEVBQUUsQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNsRCxNQUFNLEdBQUcsR0FBRztnQkFDVixFQUFFLEVBQUUsT0FBTztnQkFDWCxLQUFLLEVBQUUsY0FBYztnQkFDckIsV0FBVyxFQUFFLGdCQUFnQjtnQkFDN0IsUUFBUSxFQUFFLEVBQUU7Z0JBQ1osU0FBUyxFQUFFO29CQUNUO3dCQUNFLEVBQUUsRUFBRSxRQUFRO3dCQUNaLElBQUksRUFBRSxPQUFPO3dCQUNiLEtBQUssRUFBRTs0QkFDTCxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7NEJBQ2pFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUU7eUJBQy9DO3dCQUNELFVBQVUsRUFBRSxRQUFRO3FCQUNyQjtpQkFDRjtnQkFDRCxjQUFjLEVBQUUsRUFBRTtnQkFDbEIsV0FBVyxFQUFFLEVBQUU7YUFDaEIsQ0FBQztZQUVGLE1BQU0sU0FBUyxHQUFHLE1BQU0sU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVoRCxNQUFNLENBQUMs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QUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFByb3RvdHlwZSBHZW5lcmF0b3IgVGVzdHNcbiAqL1xuXG5pbXBvcnQgeyBQcm90b3R5cGVHZW5lcmF0b3IsIGNyZWF0ZVByb3RvdHlwZUdlbmVyYXRvciwgZ2VuZXJhdGVQcm90b3R5cGVTdW1tYXJ5LCB2YWxpZGF0ZVByb3RvdHlwZSB9IGZyb20gJy4uL3Byb3RvdHlwZS1nZW5lcmF0b3InO1xuXG5kZXNjcmliZSgnUHJvdG90eXBlR2VuZXJhdG9yJywgKCkgPT4ge1xuICBsZXQgZ2VuZXJhdG9yOiBQcm90b3R5cGVHZW5lcmF0b3I7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgZ2VuZXJhdG9yID0gY3JlYXRlUHJvdG90eXBlR2VuZXJhdG9yKCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZW5lcmF0ZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGdlbmVyYXRlIHByb3RvdHlwZSBmcm9tIFBSRCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHByZCA9IHtcbiAgICAgICAgaWQ6ICdwcmQtMScsXG4gICAgICAgIHRpdGxlOiAnVGVzdCBQcm9kdWN0JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdBIHRlc3QgcHJvZHVjdCcsXG4gICAgICAgIGZlYXR1cmVzOiBbXSxcbiAgICAgICAgdXNlckZsb3dzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdmbG93LTEnLFxuICAgICAgICAgICAgbmFtZTogJ0xvZ2luJyxcbiAgICAgICAgICAgIHN0ZXBzOiBbXG4gICAgICAgICAgICAgIHsgaWQ6ICdzdGVwLTEnLCBhY3Rpb246ICdOYXZpZ2F0ZSB0byBsb2dpbicsIG5leHRTdGVwOiAnc3RlcC0yJyB9LFxuICAgICAgICAgICAgICB7IGlkOiAnc3RlcC0yJywgYWN0aW9uOiAnU3VibWl0IGNyZWRlbnRpYWxzJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGVudHJ5UG9pbnQ6ICdzdGVwLTEnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIHVpUmVxdWlyZW1lbnRzOiBbXSxcbiAgICAgICAgY29uc3RyYWludHM6IFtdLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcHJvdG90eXBlID0gYXdhaXQgZ2VuZXJhdG9yLmdlbmVyYXRlKHByZCk7XG5cbiAgICAgIGV4cGVjdChwcm90b3R5cGUuaWQpLnRvQ29udGFpbigncHJvdG90eXBlLXByZC0xJyk7XG4gICAgICBleHBlY3QocHJvdG90eXBlLnBhZ2VzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgICAgZXhwZWN0KHByb3RvdHlwZS5mbG93cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICAgIGV4cGVjdChwcm90b3R5cGUuZGVzaWduVG9rZW5zKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHByb3RvdHlwZS5wcmV2aWV3VXJsKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHByb3RvdHlwZS5zaGFyZVVybCkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZ2VuZXJhdGUgbXVsdGlwbGUgcGFnZXMgZm9yIG11bHRpcGxlIGZsb3dzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcHJkID0ge1xuICAgICAgICBpZDogJ3ByZC0yJyxcbiAgICAgICAgdGl0bGU6ICdNdWx0aS1GbG93IFByb2R1Y3QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Qgd2l0aCBtdWx0aXBsZSBmbG93cycsXG4gICAgICAgIGZlYXR1cmVzOiBbXSxcbiAgICAgICAgdXNlckZsb3dzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdmbG93LTEnLFxuICAgICAgICAgICAgbmFtZTogJ0xvZ2luJyxcbiAgICAgICAgICAgIHN0ZXBzOiBbeyBpZDogJ3N0ZXAtMScsIGFjdGlvbjogJ0xvZ2luJyB9XSxcbiAgICAgICAgICAgIGVudHJ5UG9pbnQ6ICdzdGVwLTEnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdmbG93LTInLFxuICAgICAgICAgICAgbmFtZTogJ0Rhc2hib2FyZCcsXG4gICAgICAgICAgICBzdGVwczogW3sgaWQ6ICdzdGVwLTEnLCBhY3Rpb246ICdWaWV3IGRhc2hib2FyZCcgfV0sXG4gICAgICAgICAgICBlbnRyeVBvaW50OiAnc3RlcC0xJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICB1aVJlcXVpcmVtZW50czogW10sXG4gICAgICAgIGNvbnN0cmFpbnRzOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHByb3RvdHlwZSA9IGF3YWl0IGdlbmVyYXRvci5nZW5lcmF0ZShwcmQpO1xuXG4gICAgICBleHBlY3QocHJvdG90eXBlLnBhZ2VzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgyKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY2FjaGUgZ2VuZXJhdGVkIHByb3RvdHlwZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHByZCA9IHtcbiAgICAgICAgaWQ6ICdwcmQtMycsXG4gICAgICAgIHRpdGxlOiAnQ2FjaGVkIFByb2R1Y3QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3QgZm9yIGNhY2hpbmcgdGVzdCcsXG4gICAgICAgIGZlYXR1cmVzOiBbXSxcbiAgICAgICAgdXNlckZsb3dzOiBbe1xuICAgICAgICAgIGlkOiAnZmxvdy0xJyxcbiAgICAgICAgICBuYW1lOiAnVGVzdCcsXG4gICAgICAgICAgc3RlcHM6IFt7IGlkOiAnc3RlcC0xJywgYWN0aW9uOiAnVGVzdCcgfV0sXG4gICAgICAgICAgZW50cnlQb2ludDogJ3N0ZXAtMScsXG4gICAgICAgIH1dLFxuICAgICAgICB1aVJlcXVpcmVtZW50czogW10sXG4gICAgICAgIGNvbnN0cmFpbnRzOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHByb3RvdHlwZTEgPSBhd2FpdCBnZW5lcmF0b3IuZ2VuZXJhdGUocHJkKTtcbiAgICAgIGNvbnN0IHByb3RvdHlwZTIgPSBhd2FpdCBnZW5lcmF0b3IuZ2VuZXJhdGUocHJkKTtcblxuICAgICAgZXhwZWN0KHByb3RvdHlwZTEuaWQpLnRvQmUocHJvdG90eXBlMi5pZCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdleHBvcnRUb0ZpZ21hJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZXhwb3J0IHByb3RvdHlwZSB0byBGaWdtYScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHByZCA9IHtcbiAgICAgICAgaWQ6ICdwcmQtNCcsXG4gICAgICAgIHRpdGxlOiAnRmlnbWEgRXhwb3J0IFRlc3QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Rlc3QnLFxuICAgICAgICBmZWF0dXJlczogW10sXG4gICAgICAgIHVzZXJGbG93czogW3tcbiAgICAgICAgICBpZDogJ2Zsb3ctMScsXG4gICAgICAgICAgbmFtZTogJ1Rlc3QnLFxuICAgICAgICAgIHN0ZXBzOiBbeyBpZDogJ3N0ZXAtMScsIGFjdGlvbjogJ1Rlc3QnIH1dLFxuICAgICAgICAgIGVudHJ5UG9pbnQ6ICdzdGVwLTEnLFxuICAgICAgICB9XSxcbiAgICAgICAgdWlSZXF1aXJlbWVudHM6IFtdLFxuICAgICAgICBjb25zdHJhaW50czogW10sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwcm90b3R5cGUgPSBhd2FpdCBnZW5lcmF0b3IuZ2VuZXJhdGUocHJkKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdlbmVyYXRvci5leHBvcnRUb0ZpZ21hKHByb3RvdHlwZSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZmlnbWFGaWxlSWQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QocmVzdWx0LmZpZ21hVXJsKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5jb21wb25lbnRzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZXhwb3J0VG9Db2RlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZXhwb3J0IHByb3RvdHlwZSB0byBjb2RlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcHJkID0ge1xuICAgICAgICBpZDogJ3ByZC01JyxcbiAgICAgICAgdGl0bGU6ICdDb2RlIEV4cG9ydCBUZXN0JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdUZXN0JyxcbiAgICAgICAgZmVhdHVyZXM6IFtdLFxuICAgICAgICB1c2VyRmxvd3M6IFt7XG4gICAgICAgICAgaWQ6ICdmbG93LTEnLFxuICAgICAgICAgIG5hbWU6ICdUZXN0JyxcbiAgICAgICAgICBzdGVwczogW3sgaWQ6ICdzdGVwLTEnLCBhY3Rpb246ICdUZXN0JyB9XSxcbiAgICAgICAgICBlbnRyeVBvaW50OiAnc3RlcC0xJyxcbiAgICAgICAgfV0sXG4gICAgICAgIHVpUmVxdWlyZW1lbnRzOiBbXSxcbiAgICAgICAgY29uc3RyYWludHM6IFtdLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcHJvdG90eXBlID0gYXdhaXQgZ2VuZXJhdG9yLmdlbmVyYXRlKHByZCk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZW5lcmF0b3IuZXhwb3J0VG9Db2RlKHByb3RvdHlwZSwge1xuICAgICAgICBvdXRwdXREaXI6ICcuL291dHB1dCcsXG4gICAgICAgIGZvcm1hdDogJ2VzbScsXG4gICAgICAgIHR5cGVzY3JpcHQ6IHRydWUsXG4gICAgICAgIGluY2x1ZGVUZXN0czogdHJ1ZSxcbiAgICAgICAgaW5jbHVkZVN0b3JpZXM6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5maWxlcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuc3VtbWFyeS50b3RhbEZpbGVzKS50b0JlKHJlc3VsdC5maWxlcy5sZW5ndGgpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5zdW1tYXJ5LnRvdGFsTGluZXMpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZ2VuZXJhdGUgdGVzdCBmaWxlcyB3aGVuIGluY2x1ZGVUZXN0cyBpcyB0cnVlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcHJkID0ge1xuICAgICAgICBpZDogJ3ByZC02JyxcbiAgICAgICAgdGl0bGU6ICdUZXN0IEV4cG9ydCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGVzdCcsXG4gICAgICAgIGZlYXR1cmVzOiBbXSxcbiAgICAgICAgdXNlckZsb3dzOiBbe1xuICAgICAgICAgIGlkOiAnZmxvdy0xJyxcbiAgICAgICAgICBuYW1lOiAnVGVzdCcsXG4gICAgICAgICAgc3RlcHM6IFt7IGlkOiAnc3RlcC0xJywgYWN0aW9uOiAnVGVzdCcgfV0sXG4gICAgICAgICAgZW50cnlQb2ludDogJ3N0ZXAtMScsXG4gICAgICAgIH1dLFxuICAgICAgICB1aVJlcXVpcmVtZW50czogW10sXG4gICAgICAgIGNvbnN0cmFpbnRzOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHByb3RvdHlwZSA9IGF3YWl0IGdlbmVyYXRvci5nZW5lcmF0ZShwcmQpO1xuICAgICAgY29uc3QgcmVzdWx0V2l0aFRlc3RzID0gYXdhaXQgZ2VuZXJhdG9yLmV4cG9ydFRvQ29kZShwcm90b3R5cGUsIHtcbiAgICAgICAgb3V0cHV0RGlyOiAnLi9vdXRwdXQnLFxuICAgICAgICBmb3JtYXQ6ICdlc20nLFxuICAgICAgICB0eXBlc2NyaXB0OiB0cnVlLFxuICAgICAgICBpbmNsdWRlVGVzdHM6IHRydWUsXG4gICAgICAgIGluY2x1ZGVTdG9yaWVzOiBmYWxzZSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHRXaXRob3V0VGVzdHMgPSBhd2FpdCBnZW5lcmF0b3IuZXhwb3J0VG9Db2RlKHByb3RvdHlwZSwge1xuICAgICAgICBvdXRwdXREaXI6ICcuL291dHB1dCcsXG4gICAgICAgIGZvcm1hdDogJ2VzbScsXG4gICAgICAgIHR5cGVzY3JpcHQ6IHRydWUsXG4gICAgICAgIGluY2x1ZGVUZXN0czogZmFsc2UsXG4gICAgICAgIGluY2x1ZGVTdG9yaWVzOiBmYWxzZSxcbiAgICAgIH0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0V2l0aFRlc3RzLnN1bW1hcnkudGVzdHMpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICAgIGV4cGVjdChyZXN1bHRXaXRob3V0VGVzdHMuc3VtbWFyeS50ZXN0cykudG9CZSgwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZ2VuZXJhdGUgc3RvcnkgZmlsZXMgd2hlbiBpbmNsdWRlU3RvcmllcyBpcyB0cnVlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcHJkID0ge1xuICAgICAgICBpZDogJ3ByZC03JyxcbiAgICAgICAgdGl0bGU6ICdTdG9yeSBFeHBvcnQnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Rlc3QnLFxuICAgICAgICBmZWF0dXJlczogW10sXG4gICAgICAgIHVzZXJGbG93czogW3tcbiAgICAgICAgICBpZDogJ2Zsb3ctMScsXG4gICAgICAgICAgbmFtZTogJ1Rlc3QnLFxuICAgICAgICAgIHN0ZXBzOiBbeyBpZDogJ3N0ZXAtMScsIGFjdGlvbjogJ1Rlc3QnIH1dLFxuICAgICAgICAgIGVudHJ5UG9pbnQ6ICdzdGVwLTEnLFxuICAgICAgICB9XSxcbiAgICAgICAgdWlSZXF1aXJlbWVudHM6IFtdLFxuICAgICAgICBjb25zdHJhaW50czogW10sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwcm90b3R5cGUgPSBhd2FpdCBnZW5lcmF0b3IuZ2VuZXJhdGUocHJkKTtcbiAgICAgIGNvbnN0IHJlc3VsdFdpdGhTdG9yaWVzID0gYXdhaXQgZ2VuZXJhdG9yLmV4cG9ydFRvQ29kZShwcm90b3R5cGUsIHtcbiAgICAgICAgb3V0cHV0RGlyOiAnLi9vdXRwdXQnLFxuICAgICAgICBmb3JtYXQ6ICdlc20nLFxuICAgICAgICB0eXBlc2NyaXB0OiB0cnVlLFxuICAgICAgICBpbmNsdWRlVGVzdHM6IGZhbHNlLFxuICAgICAgICBpbmNsdWRlU3RvcmllczogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0V2l0aFN0b3JpZXMuc3VtbWFyeS5zdG9yaWVzKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdjb2xsZWN0RmVlZGJhY2snLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjb2xsZWN0IGZlZWRiYWNrIGZvciBwcm90b3R5cGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBwcmQgPSB7XG4gICAgICAgIGlkOiAncHJkLTgnLFxuICAgICAgICB0aXRsZTogJ0ZlZWRiYWNrIFRlc3QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Rlc3QnLFxuICAgICAgICBmZWF0dXJlczogW10sXG4gICAgICAgIHVzZXJGbG93czogW3tcbiAgICAgICAgICBpZDogJ2Zsb3ctMScsXG4gICAgICAgICAgbmFtZTogJ1Rlc3QnLFxuICAgICAgICAgIHN0ZXBzOiBbeyBpZDogJ3N0ZXAtMScsIGFjdGlvbjogJ1Rlc3QnIH1dLFxuICAgICAgICAgIGVudHJ5UG9pbnQ6ICdzdGVwLTEnLFxuICAgICAgICB9XSxcbiAgICAgICAgdWlSZXF1aXJlbWVudHM6IFtdLFxuICAgICAgICBjb25zdHJhaW50czogW10sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwcm90b3R5cGUgPSBhd2FpdCBnZW5lcmF0b3IuZ2VuZXJhdGUocHJkKTtcbiAgICAgIGNvbnN0IGZlZWRiYWNrID0gYXdhaXQgZ2VuZXJhdG9yLmNvbGxlY3RGZWVkYmFjayhwcm90b3R5cGUpO1xuXG4gICAgICBleHBlY3QoZmVlZGJhY2subGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgICBleHBlY3QoZmVlZGJhY2tbMF0ucmF0aW5nKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDEpO1xuICAgICAgZXhwZWN0KGZlZWRiYWNrWzBdLnJhdGluZykudG9CZUxlc3NUaGFuT3JFcXVhbCg1KTtcbiAgICB9KTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ2dlbmVyYXRlUHJvdG90eXBlU3VtbWFyeScsICgpID0+IHtcbiAgaXQoJ3Nob3VsZCBnZW5lcmF0ZSBwcm90b3R5cGUgc3VtbWFyeScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBnZW5lcmF0b3IgPSBjcmVhdGVQcm90b3R5cGVHZW5lcmF0b3IoKTtcbiAgICBjb25zdCBwcmQgPSB7XG4gICAgICBpZDogJ3ByZC05JyxcbiAgICAgIHRpdGxlOiAnU3VtbWFyeSBUZXN0JyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGVzdCcsXG4gICAgICBmZWF0dXJlczogW10sXG4gICAgICB1c2VyRmxvd3M6IFt7XG4gICAgICAgIGlkOiAnZmxvdy0xJyxcbiAgICAgICAgbmFtZTogJ1Rlc3QgRmxvdycsXG4gICAgICAgIHN0ZXBzOiBbeyBpZDogJ3N0ZXAtMScsIGFjdGlvbjogJ1Rlc3QnIH1dLFxuICAgICAgICBlbnRyeVBvaW50OiAnc3RlcC0xJyxcbiAgICAgIH1dLFxuICAgICAgdWlSZXF1aXJlbWVudHM6IFtdLFxuICAgICAgY29uc3RyYWludHM6IFtdLFxuICAgIH07XG5cbiAgICBjb25zdCBwcm90b3R5cGUgPSBhd2FpdCBnZW5lcmF0b3IuZ2VuZXJhdGUocHJkKTtcbiAgICBjb25zdCBzdW1tYXJ5ID0gZ2VuZXJhdGVQcm90b3R5cGVTdW1tYXJ5KHByb3RvdHlwZSk7XG5cbiAgICBleHBlY3Qoc3VtbWFyeSkudG9Db250YWluKCdQcm90b3R5cGUgU3VtbWFyeScpO1xuICAgIGV4cGVjdChzdW1tYXJ5KS50b0NvbnRhaW4ocHJvdG90eXBlLmlkKTtcbiAgICBleHBlY3Qoc3VtbWFyeSkudG9Db250YWluKHByb3RvdHlwZS5wcmV2aWV3VXJsKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3ZhbGlkYXRlUHJvdG90eXBlJywgKCkgPT4ge1xuICBpdCgnc2hvdWxkIHZhbGlkYXRlIGNvbXBsZXRlIHByb3RvdHlwZScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBnZW5lcmF0b3IgPSBjcmVhdGVQcm90b3R5cGVHZW5lcmF0b3IoKTtcbiAgICBjb25zdCBwcmQgPSB7XG4gICAgICBpZDogJ3ByZC0xMCcsXG4gICAgICB0aXRsZTogJ1ZhbGlkYXRpb24gVGVzdCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ1Rlc3QnLFxuICAgICAgZmVhdHVyZXM6IFtdLFxuICAgICAgdXNlckZsb3dzOiBbe1xuICAgICAgICBpZDogJ2Zsb3ctMScsXG4gICAgICAgIG5hbWU6ICdUZXN0JyxcbiAgICAgICAgc3RlcHM6IFt7IGlkOiAnc3RlcC0xJywgYWN0aW9uOiAnVGVzdCcgfV0sXG4gICAgICAgIGVudHJ5UG9pbnQ6ICdzdGVwLTEnLFxuICAgICAgfV0sXG4gICAgICB1aVJlcXVpcmVtZW50czogW10sXG4gICAgICBjb25zdHJhaW50czogW10sXG4gICAgfTtcblxuICAgIGNvbnN0IHByb3RvdHlwZSA9IGF3YWl0IGdlbmVyYXRvci5nZW5lcmF0ZShwcmQpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlUHJvdG90eXBlKHByb3RvdHlwZSk7XG5cbiAgICBleHBlY3QocmVzdWx0LnZhbGlkKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdChyZXN1bHQuaXNzdWVzLmxlbmd0aCkudG9CZSgwKTtcbiAgfSk7XG5cbiAgaXQoJ3Nob3VsZCBkZXRlY3QgaW5jb21wbGV0ZSBwcm90b3R5cGUnLCAoKSA9PiB7XG4gICAgY29uc3QgaW5jb21wbGV0ZVByb3RvdHlwZSA9IHtcbiAgICAgIGlkOiAncHJvdG90eXBlLWluY29tcGxldGUnLFxuICAgICAgcGFnZXM6IFtdLFxuICAgICAgZmxvd3M6IFtdLFxuICAgICAgZGVzaWduVG9rZW5zOiB7XG4gICAgICAgIGNvbG9yczogeyBwcmltYXJ5OiB7fSwgc2Vjb25kYXJ5OiB7fSwgbmV1dHJhbDoge30sIHNlbWFudGljOiB7fSB9LFxuICAgICAgICB0eXBvZ3JhcGh5OiB7IGZvbnRGYW1pbHk6ICcnLCBmb250RmFtaWx5TW9ubzogJycsIGZvbnRTaXplOiB7fSwgZm9udFdlaWdodDoge30sIGxpbmVIZWlnaHQ6IHt9IH0sXG4gICAgICAgIHNwYWNpbmc6IHt9LFxuICAgICAgICBzaGFkb3dzOiB7fSxcbiAgICAgICAgcmFkaWk6IHt9LFxuICAgICAgfSxcbiAgICAgIHByZXZpZXdVcmw6ICcnLFxuICAgICAgc2hhcmVVcmw6ICcnLFxuICAgIH07XG5cbiAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZVByb3RvdHlwZShpbmNvbXBsZXRlUHJvdG90eXBlIGFzIGFueSk7XG5cbiAgICBleHBlY3QocmVzdWx0LnZhbGlkKS50b0JlKGZhbHNlKTtcbiAgICBleHBlY3QocmVzdWx0Lmlzc3Vlcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgfSk7XG59KTtcbiJdfQ==