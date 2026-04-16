"use strict";
/**
 * UI Component Synthesizer Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ui_component_synthesizer_1 = require("../ui-component-synthesizer");
describe('UIComponentSynthesizer', () => {
    let synthesizer;
    beforeEach(() => {
        synthesizer = (0, ui_component_synthesizer_1.createComponentSynthesizer)(ui_component_synthesizer_1.DEFAULT_UI_CONFIG);
    });
    describe('synthesize', () => {
        it('should generate button component from requirement', async () => {
            const requirement = {
                id: 'req-1',
                description: 'A primary button for form submission',
                priority: 'high',
                acceptanceCriteria: [],
            };
            const result = await synthesizer.synthesize(requirement);
            expect(result.componentName).toBe('Button');
            expect(result.code).toContain('export');
            expect(result.a11yScore).toBeGreaterThanOrEqual(0);
            expect(result.a11yScore).toBeLessThanOrEqual(100);
        });
        it('should generate component with correct framework', async () => {
            const requirement = {
                id: 'req-2',
                description: 'Input field for user email',
                priority: 'medium',
                acceptanceCriteria: [],
            };
            const reactConfig = { framework: 'react', uiLibrary: 'antd', styling: 'tailwind' };
            const vueConfig = { framework: 'vue', uiLibrary: 'raw', styling: 'css-modules' };
            const reactSynth = (0, ui_component_synthesizer_1.createComponentSynthesizer)(reactConfig);
            const vueSynth = (0, ui_component_synthesizer_1.createComponentSynthesizer)(vueConfig);
            const reactResult = await reactSynth.synthesize(requirement);
            const vueResult = await vueSynth.synthesize(requirement);
            expect(reactResult.code).toContain('import React');
            expect(vueResult.code).toContain('<template>');
        });
        it('should include dependencies in result', async () => {
            const requirement = {
                id: 'req-3',
                description: 'Card component for displaying content',
                priority: 'low',
                acceptanceCriteria: [],
            };
            const result = await synthesizer.synthesize(requirement);
            expect(result.dependencies).toContain('react');
            expect(result.dependencies).toContain('antd');
        });
    });
    describe('validateComponent', () => {
        it('should validate valid component', async () => {
            const validCode = `export default function Component() { return <div />; }`;
            const result = await synthesizer.validateComponent(validCode);
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
            expect(result.score).toBeGreaterThan(50);
        });
        it('should detect missing export', async () => {
            const invalidCode = `function Component() { return <div />; }`;
            const result = await synthesizer.validateComponent(invalidCode);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Component must be exported');
        });
        it('should warn about missing accessibility', async () => {
            const code = `export default function Component() { return <div />; }`;
            const result = await synthesizer.validateComponent(code);
            expect(result.warnings.some(w => w.includes('ARIA'))).toBe(true);
        });
    });
    describe('optimizeComponent', () => {
        it('should add React.memo optimization', async () => {
            const code = `export default function Component() { return <div />; }`;
            const result = await synthesizer.optimizeComponent(code);
            expect(result.optimizedCode).toContain('React.memo');
            expect(result.improvements.length).toBeGreaterThan(0);
            expect(result.performanceGain).toBeGreaterThan(0);
        });
        it('should add useMemo for effects', async () => {
            const code = `import React from 'react';
export default function Component() {
  useEffect(() => {}, []);
  return <div />;
}`;
            const result = await synthesizer.optimizeComponent(code);
            expect(result.optimizedCode).toContain('useMemo');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50LXN5bnRoZXNpemVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvdWkvX190ZXN0c19fL3VpLWNvbXBvbmVudC1zeW50aGVzaXplci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7QUFFSCwwRUFBb0g7QUFFcEgsUUFBUSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUN0QyxJQUFJLFdBQW1DLENBQUM7SUFFeEMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLFdBQVcsR0FBRyxJQUFBLHFEQUEwQixFQUFDLDRDQUFpQixDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUMxQixFQUFFLENBQUMsbURBQW1ELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDakUsTUFBTSxXQUFXLEdBQUc7Z0JBQ2xCLEVBQUUsRUFBRSxPQUFPO2dCQUNYLFdBQVcsRUFBRSxzQ0FBc0M7Z0JBQ25ELFFBQVEsRUFBRSxNQUFlO2dCQUN6QixrQkFBa0IsRUFBRSxFQUFFO2FBQ3ZCLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFekQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRCxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FB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QUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVJIENvbXBvbmVudCBTeW50aGVzaXplciBUZXN0c1xuICovXG5cbmltcG9ydCB7IFVJQ29tcG9uZW50U3ludGhlc2l6ZXIsIGNyZWF0ZUNvbXBvbmVudFN5bnRoZXNpemVyLCBERUZBVUxUX1VJX0NPTkZJRyB9IGZyb20gJy4uL3VpLWNvbXBvbmVudC1zeW50aGVzaXplcic7XG5cbmRlc2NyaWJlKCdVSUNvbXBvbmVudFN5bnRoZXNpemVyJywgKCkgPT4ge1xuICBsZXQgc3ludGhlc2l6ZXI6IFVJQ29tcG9uZW50U3ludGhlc2l6ZXI7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgc3ludGhlc2l6ZXIgPSBjcmVhdGVDb21wb25lbnRTeW50aGVzaXplcihERUZBVUxUX1VJX0NPTkZJRyk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdzeW50aGVzaXplJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZ2VuZXJhdGUgYnV0dG9uIGNvbXBvbmVudCBmcm9tIHJlcXVpcmVtZW50JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVxdWlyZW1lbnQgPSB7XG4gICAgICAgIGlkOiAncmVxLTEnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0EgcHJpbWFyeSBidXR0b24gZm9yIGZvcm0gc3VibWlzc2lvbicsXG4gICAgICAgIHByaW9yaXR5OiAnaGlnaCcgYXMgY29uc3QsXG4gICAgICAgIGFjY2VwdGFuY2VDcml0ZXJpYTogW10sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzeW50aGVzaXplci5zeW50aGVzaXplKHJlcXVpcmVtZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5jb21wb25lbnROYW1lKS50b0JlKCdCdXR0b24nKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuY29kZSkudG9Db250YWluKCdleHBvcnQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuYTExeVNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDApO1xuICAgICAgZXhwZWN0KHJlc3VsdC5hMTF5U2NvcmUpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMTAwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZ2VuZXJhdGUgY29tcG9uZW50IHdpdGggY29ycmVjdCBmcmFtZXdvcmsnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXF1aXJlbWVudCA9IHtcbiAgICAgICAgaWQ6ICdyZXEtMicsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnSW5wdXQgZmllbGQgZm9yIHVzZXIgZW1haWwnLFxuICAgICAgICBwcmlvcml0eTogJ21lZGl1bScgYXMgY29uc3QsXG4gICAgICAgIGFjY2VwdGFuY2VDcml0ZXJpYTogW10sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZWFjdENvbmZpZyA9IHsgZnJhbWV3b3JrOiAncmVhY3QnIGFzIGNvbnN0LCB1aUxpYnJhcnk6ICdhbnRkJyBhcyBjb25zdCwgc3R5bGluZzogJ3RhaWx3aW5kJyBhcyBjb25zdCB9O1xuICAgICAgY29uc3QgdnVlQ29uZmlnID0geyBmcmFtZXdvcms6ICd2dWUnIGFzIGNvbnN0LCB1aUxpYnJhcnk6ICdyYXcnIGFzIGNvbnN0LCBzdHlsaW5nOiAnY3NzLW1vZHVsZXMnIGFzIGNvbnN0IH07XG5cbiAgICAgIGNvbnN0IHJlYWN0U3ludGggPSBjcmVhdGVDb21wb25lbnRTeW50aGVzaXplcihyZWFjdENvbmZpZyk7XG4gICAgICBjb25zdCB2dWVTeW50aCA9IGNyZWF0ZUNvbXBvbmVudFN5bnRoZXNpemVyKHZ1ZUNvbmZpZyk7XG5cbiAgICAgIGNvbnN0IHJlYWN0UmVzdWx0ID0gYXdhaXQgcmVhY3RTeW50aC5zeW50aGVzaXplKHJlcXVpcmVtZW50KTtcbiAgICAgIGNvbnN0IHZ1ZVJlc3VsdCA9IGF3YWl0IHZ1ZVN5bnRoLnN5bnRoZXNpemUocmVxdWlyZW1lbnQpO1xuXG4gICAgICBleHBlY3QocmVhY3RSZXN1bHQuY29kZSkudG9Db250YWluKCdpbXBvcnQgUmVhY3QnKTtcbiAgICAgIGV4cGVjdCh2dWVSZXN1bHQuY29kZSkudG9Db250YWluKCc8dGVtcGxhdGU+Jyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGluY2x1ZGUgZGVwZW5kZW5jaWVzIGluIHJlc3VsdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVpcmVtZW50ID0ge1xuICAgICAgICBpZDogJ3JlcS0zJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdDYXJkIGNvbXBvbmVudCBmb3IgZGlzcGxheWluZyBjb250ZW50JyxcbiAgICAgICAgcHJpb3JpdHk6ICdsb3cnIGFzIGNvbnN0LFxuICAgICAgICBhY2NlcHRhbmNlQ3JpdGVyaWE6IFtdLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc3ludGhlc2l6ZXIuc3ludGhlc2l6ZShyZXF1aXJlbWVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuZGVwZW5kZW5jaWVzKS50b0NvbnRhaW4oJ3JlYWN0Jyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlcGVuZGVuY2llcykudG9Db250YWluKCdhbnRkJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd2YWxpZGF0ZUNvbXBvbmVudCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIHZhbGlkIGNvbXBvbmVudCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHZhbGlkQ29kZSA9IGBleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDb21wb25lbnQoKSB7IHJldHVybiA8ZGl2IC8+OyB9YDtcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc3ludGhlc2l6ZXIudmFsaWRhdGVDb21wb25lbnQodmFsaWRDb2RlKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC52YWxpZCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzLmxlbmd0aCkudG9CZSgwKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbig1MCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRldGVjdCBtaXNzaW5nIGV4cG9ydCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGludmFsaWRDb2RlID0gYGZ1bmN0aW9uIENvbXBvbmVudCgpIHsgcmV0dXJuIDxkaXYgLz47IH1gO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzeW50aGVzaXplci52YWxpZGF0ZUNvbXBvbmVudChpbnZhbGlkQ29kZSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQudmFsaWQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvQ29udGFpbignQ29tcG9uZW50IG11c3QgYmUgZXhwb3J0ZWQnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgd2FybiBhYm91dCBtaXNzaW5nIGFjY2Vzc2liaWxpdHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb2RlID0gYGV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIENvbXBvbmVudCgpIHsgcmV0dXJuIDxkaXYgLz47IH1gO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzeW50aGVzaXplci52YWxpZGF0ZUNvbXBvbmVudChjb2RlKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC53YXJuaW5ncy5zb21lKHcgPT4gdy5pbmNsdWRlcygnQVJJQScpKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ29wdGltaXplQ29tcG9uZW50JywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgYWRkIFJlYWN0Lm1lbW8gb3B0aW1pemF0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29kZSA9IGBleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDb21wb25lbnQoKSB7IHJldHVybiA8ZGl2IC8+OyB9YDtcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc3ludGhlc2l6ZXIub3B0aW1pemVDb21wb25lbnQoY29kZSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQub3B0aW1pemVkQ29kZSkudG9Db250YWluKCdSZWFjdC5tZW1vJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmltcHJvdmVtZW50cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucGVyZm9ybWFuY2VHYWluKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGFkZCB1c2VNZW1vIGZvciBlZmZlY3RzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29kZSA9IGBpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQ29tcG9uZW50KCkge1xuICB1c2VFZmZlY3QoKCkgPT4ge30sIFtdKTtcbiAgcmV0dXJuIDxkaXYgLz47XG59YDtcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc3ludGhlc2l6ZXIub3B0aW1pemVDb21wb25lbnQoY29kZSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQub3B0aW1pemVkQ29kZSkudG9Db250YWluKCd1c2VNZW1vJyk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG4iXX0=