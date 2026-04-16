"use strict";
/**
 * ANFSF V1.5.0 - Policy Guard Skill Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const policy_guard_skill_1 = require("../policy-guard-skill");
(0, globals_1.describe)('PolicyGuardSkill Tests', () => {
    let skill;
    (0, globals_1.beforeEach)(() => {
        skill = (0, policy_guard_skill_1.createPolicyGuardSkill)();
    });
    (0, globals_1.describe)('execute', () => {
        (0, globals_1.it)('should pass clean code', async () => {
            const cleanCode = `
        function calculateSum(a: number, b: number): number {
          return a + b;
        }
        
        export { calculateSum };
      `;
            const result = await skill.execute({ code: cleanCode });
            (0, globals_1.expect)(result.passed).toBe(true);
            (0, globals_1.expect)(result.score).toBeGreaterThanOrEqual(0.90);
            (0, globals_1.expect)(result.violations.length).toBe(0);
        });
        (0, globals_1.it)('should fail on eval usage', async () => {
            const code = `
        function processInput(input) {
          eval(input);
        }
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.violations).toContainEqual(globals_1.expect.objectContaining({
                type: 'security',
                severity: 'critical',
                message: globals_1.expect.stringContaining('eval'),
            }));
        });
        (0, globals_1.it)('should fail on new Function usage', async () => {
            const code = `
        const fn = new Function('a', 'b', 'return a + b');
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.violations).toContainEqual(globals_1.expect.objectContaining({
                type: 'security',
                severity: 'critical',
            }));
        });
        (0, globals_1.it)('should fail on hardcoded password', async () => {
            const code = `
        const password = "supersecret123";
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.violations).toContainEqual(globals_1.expect.objectContaining({
                type: 'compliance',
                severity: 'critical',
                message: globals_1.expect.stringContaining('password'),
            }));
        });
        (0, globals_1.it)('should fail on hardcoded API key', async () => {
            const code = `
        const api_key = "sk-1234567890abcdef";
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.violations).toContainEqual(globals_1.expect.objectContaining({
                type: 'compliance',
                severity: 'critical',
            }));
        });
        (0, globals_1.it)('should detect multiple owners conflict', async () => {
            const code = `
        // Owner: Alice
        // Owner: Bob
        function test() {}
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.violations).toContainEqual(globals_1.expect.objectContaining({
                type: 'ownership',
                severity: 'minor',
                message: globals_1.expect.stringContaining('Multiple owners'),
            }));
        });
        (0, globals_1.it)('should handle exec usage', async () => {
            const code = `
        const { exec } = require('child_process');
        exec('ls -la');
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.violations).toContainEqual(globals_1.expect.objectContaining({
                type: 'security',
                severity: 'major',
            }));
        });
        (0, globals_1.it)('should calculate score correctly', async () => {
            const code = 'function test() { return 42; }';
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.score).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.score).toBeLessThanOrEqual(1);
        });
        (0, globals_1.it)('should fail on critical violations', async () => {
            const code = `
        eval(userInput);
        const password = "secret";
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.violations.filter(v => v.severity === 'critical').length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('checkSecurityPatterns', () => {
        (0, globals_1.it)('should detect all security patterns', async () => {
            const code = `
        eval(code);
        new Function('return this');
        exec('command');
        execSync('command');
        spawn('command');
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.violations.filter(v => v.type === 'security').length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('checkCompliancePatterns', () => {
        (0, globals_1.it)('should detect all compliance patterns', async () => {
            const code = `
        const password = "pass123";
        const api_key = "key123";
        const secret = "secret123";
        const token = "token123";
      `;
            const result = await skill.execute({ code });
            (0, globals_1.expect)(result.violations.filter(v => v.type === 'compliance').length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('getMetadata', () => {
        (0, globals_1.it)('should return skill metadata', () => {
            const metadata = skill.getMetadata();
            (0, globals_1.expect)(metadata.name).toBe('policy-guard');
            (0, globals_1.expect)(metadata.version).toBe('1.0.0');
            (0, globals_1.expect)(metadata.securityPatterns).toBeGreaterThan(0);
            (0, globals_1.expect)(metadata.compliancePatterns).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5LWd1YXJkLXNraWxsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvc2tpbGxzL19fdGVzdHNfXy9wb2xpY3ktZ3VhcmQtc2tpbGwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7O0FBRUgsMkNBQWlFO0FBQ2pFLDhEQUFpRjtBQUVqRixJQUFBLGtCQUFRLEVBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLElBQUksS0FBdUIsQ0FBQztJQUU1QixJQUFBLG9CQUFVLEVBQUMsR0FBRyxFQUFFO1FBQ2QsS0FBSyxHQUFHLElBQUEsMkNBQXNCLEdBQUUsQ0FBQztJQUNuQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsa0JBQVEsRUFBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLElBQUEsWUFBRSxFQUFDLHdCQUF3QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RDLE1BQU0sU0FBUyxHQUFHOzs7Ozs7T0FNakIsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBRXhELElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEQsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBQSxZQUFFLEVBQUMsMkJBQTJCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDekMsTUFBTSxJQUFJLEdBQUc7Ozs7T0FJWixDQUFDO1lB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QUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxrQkFBUSxFQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDM0IsSUFBQSxZQUFFLEVBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1lBQ3RDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUVyQyxJQUFBLGdCQUFNLEVBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUMzQyxJQUFBLGdCQUFNLEVBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2QyxJQUFBLGdCQUFNLEVBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JELElBQUEsZ0JBQU0sRUFBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWMS41LjAgLSBQb2xpY3kgR3VhcmQgU2tpbGwgVGVzdHNcbiAqL1xuXG5pbXBvcnQgeyBkZXNjcmliZSwgaXQsIGV4cGVjdCwgYmVmb3JlRWFjaCB9IGZyb20gJ0BqZXN0L2dsb2JhbHMnO1xuaW1wb3J0IHsgUG9saWN5R3VhcmRTa2lsbCwgY3JlYXRlUG9saWN5R3VhcmRTa2lsbCB9IGZyb20gJy4uL3BvbGljeS1ndWFyZC1za2lsbCc7XG5cbmRlc2NyaWJlKCdQb2xpY3lHdWFyZFNraWxsIFRlc3RzJywgKCkgPT4ge1xuICBsZXQgc2tpbGw6IFBvbGljeUd1YXJkU2tpbGw7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgc2tpbGwgPSBjcmVhdGVQb2xpY3lHdWFyZFNraWxsKCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdleGVjdXRlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgcGFzcyBjbGVhbiBjb2RlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY2xlYW5Db2RlID0gYFxuICAgICAgICBmdW5jdGlvbiBjYWxjdWxhdGVTdW0oYTogbnVtYmVyLCBiOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICAgIHJldHVybiBhICsgYjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZXhwb3J0IHsgY2FsY3VsYXRlU3VtIH07XG4gICAgICBgO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBza2lsbC5leGVjdXRlKHsgY29kZTogY2xlYW5Db2RlIH0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnBhc3NlZCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMC45MCk7XG4gICAgICBleHBlY3QocmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoKS50b0JlKDApO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBmYWlsIG9uIGV2YWwgdXNhZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb2RlID0gYFxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzSW5wdXQoaW5wdXQpIHtcbiAgICAgICAgICBldmFsKGlucHV0KTtcbiAgICAgICAgfVxuICAgICAgYDtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2tpbGwuZXhlY3V0ZSh7IGNvZGUgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQucGFzc2VkKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudmlvbGF0aW9ucykudG9Db250YWluRXF1YWwoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICB0eXBlOiAnc2VjdXJpdHknLFxuICAgICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgICAgbWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ2V2YWwnKSxcbiAgICAgIH0pKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZmFpbCBvbiBuZXcgRnVuY3Rpb24gdXNhZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb2RlID0gYFxuICAgICAgICBjb25zdCBmbiA9IG5ldyBGdW5jdGlvbignYScsICdiJywgJ3JldHVybiBhICsgYicpO1xuICAgICAgYDtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2tpbGwuZXhlY3V0ZSh7IGNvZGUgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQucGFzc2VkKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudmlvbGF0aW9ucykudG9Db250YWluRXF1YWwoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICB0eXBlOiAnc2VjdXJpdHknLFxuICAgICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgIH0pKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZmFpbCBvbiBoYXJkY29kZWQgcGFzc3dvcmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb2RlID0gYFxuICAgICAgICBjb25zdCBwYXNzd29yZCA9IFwic3VwZXJzZWNyZXQxMjNcIjtcbiAgICAgIGA7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNraWxsLmV4ZWN1dGUoeyBjb2RlIH0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnBhc3NlZCkudG9CZShmYWxzZSk7XG4gICAgICBleHBlY3QocmVzdWx0LnZpb2xhdGlvbnMpLnRvQ29udGFpbkVxdWFsKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgdHlwZTogJ2NvbXBsaWFuY2UnLFxuICAgICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgICAgbWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ3Bhc3N3b3JkJyksXG4gICAgICB9KSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGZhaWwgb24gaGFyZGNvZGVkIEFQSSBrZXknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb2RlID0gYFxuICAgICAgICBjb25zdCBhcGlfa2V5ID0gXCJzay0xMjM0NTY3ODkwYWJjZGVmXCI7XG4gICAgICBgO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBza2lsbC5leGVjdXRlKHsgY29kZSB9KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5wYXNzZWQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHJlc3VsdC52aW9sYXRpb25zKS50b0NvbnRhaW5FcXVhbChleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgIHR5cGU6ICdjb21wbGlhbmNlJyxcbiAgICAgICAgc2V2ZXJpdHk6ICdjcml0aWNhbCcsXG4gICAgICB9KSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRldGVjdCBtdWx0aXBsZSBvd25lcnMgY29uZmxpY3QnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb2RlID0gYFxuICAgICAgICAvLyBPd25lcjogQWxpY2VcbiAgICAgICAgLy8gT3duZXI6IEJvYlxuICAgICAgICBmdW5jdGlvbiB0ZXN0KCkge31cbiAgICAgIGA7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNraWxsLmV4ZWN1dGUoeyBjb2RlIH0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnZpb2xhdGlvbnMpLnRvQ29udGFpbkVxdWFsKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgdHlwZTogJ293bmVyc2hpcCcsXG4gICAgICAgIHNldmVyaXR5OiAnbWlub3InLFxuICAgICAgICBtZXNzYWdlOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnTXVsdGlwbGUgb3duZXJzJyksXG4gICAgICB9KSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBleGVjIHVzYWdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29kZSA9IGBcbiAgICAgICAgY29uc3QgeyBleGVjIH0gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4gICAgICAgIGV4ZWMoJ2xzIC1sYScpO1xuICAgICAgYDtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2tpbGwuZXhlY3V0ZSh7IGNvZGUgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQudmlvbGF0aW9ucykudG9Db250YWluRXF1YWwoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICB0eXBlOiAnc2VjdXJpdHknLFxuICAgICAgICBzZXZlcml0eTogJ21ham9yJyxcbiAgICAgIH0pKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIHNjb3JlIGNvcnJlY3RseScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvZGUgPSAnZnVuY3Rpb24gdGVzdCgpIHsgcmV0dXJuIDQyOyB9JztcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNraWxsLmV4ZWN1dGUoeyBjb2RlIH0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDApO1xuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUxlc3NUaGFuT3JFcXVhbCgxKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZmFpbCBvbiBjcml0aWNhbCB2aW9sYXRpb25zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29kZSA9IGBcbiAgICAgICAgZXZhbCh1c2VySW5wdXQpO1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9IFwic2VjcmV0XCI7XG4gICAgICBgO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBza2lsbC5leGVjdXRlKHsgY29kZSB9KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5wYXNzZWQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHJlc3VsdC52aW9sYXRpb25zLmZpbHRlcih2ID0+IHYuc2V2ZXJpdHkgPT09ICdjcml0aWNhbCcpLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY2hlY2tTZWN1cml0eVBhdHRlcm5zJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZGV0ZWN0IGFsbCBzZWN1cml0eSBwYXR0ZXJucycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvZGUgPSBgXG4gICAgICAgIGV2YWwoY29kZSk7XG4gICAgICAgIG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMnKTtcbiAgICAgICAgZXhlYygnY29tbWFuZCcpO1xuICAgICAgICBleGVjU3luYygnY29tbWFuZCcpO1xuICAgICAgICBzcGF3bignY29tbWFuZCcpO1xuICAgICAgYDtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2tpbGwuZXhlY3V0ZSh7IGNvZGUgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQudmlvbGF0aW9ucy5maWx0ZXIodiA9PiB2LnR5cGUgPT09ICdzZWN1cml0eScpLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY2hlY2tDb21wbGlhbmNlUGF0dGVybnMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBkZXRlY3QgYWxsIGNvbXBsaWFuY2UgcGF0dGVybnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb2RlID0gYFxuICAgICAgICBjb25zdCBwYXNzd29yZCA9IFwicGFzczEyM1wiO1xuICAgICAgICBjb25zdCBhcGlfa2V5ID0gXCJrZXkxMjNcIjtcbiAgICAgICAgY29uc3Qgc2VjcmV0ID0gXCJzZWNyZXQxMjNcIjtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBcInRva2VuMTIzXCI7XG4gICAgICBgO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBza2lsbC5leGVjdXRlKHsgY29kZSB9KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC52aW9sYXRpb25zLmZpbHRlcih2ID0+IHYudHlwZSA9PT0gJ2NvbXBsaWFuY2UnKS5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldE1ldGFkYXRhJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgcmV0dXJuIHNraWxsIG1ldGFkYXRhJywgKCkgPT4ge1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSBza2lsbC5nZXRNZXRhZGF0YSgpO1xuXG4gICAgICBleHBlY3QobWV0YWRhdGEubmFtZSkudG9CZSgncG9saWN5LWd1YXJkJyk7XG4gICAgICBleHBlY3QobWV0YWRhdGEudmVyc2lvbikudG9CZSgnMS4wLjAnKTtcbiAgICAgIGV4cGVjdChtZXRhZGF0YS5zZWN1cml0eVBhdHRlcm5zKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgICBleHBlY3QobWV0YWRhdGEuY29tcGxpYW5jZVBhdHRlcm5zKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG4iXX0=