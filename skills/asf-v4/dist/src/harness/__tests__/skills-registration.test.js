"use strict";
/**
 * ANFSF V1.5.0 - Skills Registration Tests (更新版)
 *
 * Verifies that fusion skills are registered to their corresponding Harnesses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const skills_registration_1 = require("../skills-registration");
(0, globals_1.describe)('Skills Registration Tests', () => {
    (0, globals_1.describe)('getHarnessSkills', () => {
        (0, globals_1.it)('should return skills for each Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.orchestration).toBeDefined();
            (0, globals_1.expect)(skills.evolution).toBeDefined();
            (0, globals_1.expect)(skills.uiux).toBeDefined();
            (0, globals_1.expect)(skills.governance).toBeDefined();
        });
        (0, globals_1.it)('should return correct skills for Orchestration Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.orchestration).toContain('context-compressor');
            (0, globals_1.expect)(skills.orchestration.length).toBe(1);
        });
        (0, globals_1.it)('should return correct skills for Evolution Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.evolution).toContain('memory-consolidation');
            (0, globals_1.expect)(skills.evolution.length).toBe(1);
        });
        (0, globals_1.it)('should return empty skills for UI/UX Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.uiux).toEqual([]);
            (0, globals_1.expect)(skills.uiux.length).toBe(0);
        });
        (0, globals_1.it)('should return correct skills for Governance Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.governance).toContain('hybrid-retriever');
            (0, globals_1.expect)(skills.governance).toContain('citation-tracer');
            (0, globals_1.expect)(skills.governance).toContain('hallucination-guard');
            (0, globals_1.expect)(skills.governance.length).toBe(3);
        });
    });
    (0, globals_1.describe)('verifySkillsRegistration', () => {
        (0, globals_1.it)('should verify total skills count', () => {
            const result = (0, skills_registration_1.verifySkillsRegistration)();
            (0, globals_1.expect)(result.totalSkills).toBe(5);
            (0, globals_1.expect)(result.verified).toBe(true);
        });
        (0, globals_1.it)('should return byHarness breakdown', () => {
            const result = (0, skills_registration_1.verifySkillsRegistration)();
            (0, globals_1.expect)(result.byHarness.orchestration).toEqual(['context-compressor']);
            (0, globals_1.expect)(result.byHarness.evolution).toEqual(['memory-consolidation']);
            (0, globals_1.expect)(result.byHarness.uiux).toEqual([]);
            (0, globals_1.expect)(result.byHarness.governance).toEqual([
                'hybrid-retriever',
                'citation-tracer',
                'hallucination-guard',
            ]);
        });
        (0, globals_1.it)('should verify all skills are registered', () => {
            const result = (0, skills_registration_1.verifySkillsRegistration)();
            (0, globals_1.expect)(result.verified).toBe(true);
        });
    });
    (0, globals_1.describe)('Skills to Harness Mapping', () => {
        (0, globals_1.it)('should map ContextCompressorSkill to Orchestration Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.orchestration).toContain('context-compressor');
        });
        (0, globals_1.it)('should map MemoryConsolidationSkill to Evolution Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.evolution).toContain('memory-consolidation');
        });
        (0, globals_1.it)('should not map any skills to UI/UX Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.uiux).toEqual([]);
        });
        (0, globals_1.it)('should map RAG skills to Governance Harness', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            (0, globals_1.expect)(skills.governance).toContain('hybrid-retriever');
            (0, globals_1.expect)(skills.governance).toContain('citation-tracer');
            (0, globals_1.expect)(skills.governance).toContain('hallucination-guard');
        });
    });
    (0, globals_1.describe)('Registration Summary', () => {
        (0, globals_1.it)('should have correct total count', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            const total = Object.values(skills).reduce((sum, arr) => sum + arr.length, 0);
            (0, globals_1.expect)(total).toBe(5);
        });
        (0, globals_1.it)('should have balanced distribution', () => {
            const skills = (0, skills_registration_1.getHarnessSkills)();
            // Orchestration: 1 skill (context compression)
            (0, globals_1.expect)(skills.orchestration.length).toBe(1);
            // Evolution: 1 skill (memory consolidation)
            (0, globals_1.expect)(skills.evolution.length).toBe(1);
            // UI/UX: 0 skills (pure UI functionality)
            (0, globals_1.expect)(skills.uiux.length).toBe(0);
            // Governance: 3 skills (RAG pipeline)
            (0, globals_1.expect)(skills.governance.length).toBe(3);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzLXJlZ2lzdHJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2hhcm5lc3MvX190ZXN0c19fL3NraWxscy1yZWdpc3RyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7QUFFSCwyQ0FBcUQ7QUFDckQsZ0VBR2dDO0FBRWhDLElBQUEsa0JBQVEsRUFBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsSUFBQSxrQkFBUSxFQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxJQUFBLFlBQUUsRUFBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7WUFDL0MsTUFBTSxNQUFNLEdBQUcsSUFBQSxzQ0FBZ0IsR0FBRSxDQUFDO1lBRWxDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDM0MsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QyxJQUFBLGdCQUFNLEVBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFBLFlBQUUsRUFBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7WUFDaEUsTUFBTSxNQUFNLEdBQUcsSUFBQSxzQ0FBZ0IsR0FBRSxDQUFDO1lBRWxDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDN0QsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlD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QUMsQ0FBQyxDQUFDLENBQUM7WUFFbkMsc0NBQXNDO1lBQ3RDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFORlNGIFYxLjUuMCAtIFNraWxscyBSZWdpc3RyYXRpb24gVGVzdHMgKOabtOaWsOeJiClcbiAqIFxuICogVmVyaWZpZXMgdGhhdCBmdXNpb24gc2tpbGxzIGFyZSByZWdpc3RlcmVkIHRvIHRoZWlyIGNvcnJlc3BvbmRpbmcgSGFybmVzc2VzLlxuICovXG5cbmltcG9ydCB7IGRlc2NyaWJlLCBpdCwgZXhwZWN0IH0gZnJvbSAnQGplc3QvZ2xvYmFscyc7XG5pbXBvcnQge1xuICBnZXRIYXJuZXNzU2tpbGxzLFxuICB2ZXJpZnlTa2lsbHNSZWdpc3RyYXRpb24sXG59IGZyb20gJy4uL3NraWxscy1yZWdpc3RyYXRpb24nO1xuXG5kZXNjcmliZSgnU2tpbGxzIFJlZ2lzdHJhdGlvbiBUZXN0cycsICgpID0+IHtcbiAgZGVzY3JpYmUoJ2dldEhhcm5lc3NTa2lsbHMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gc2tpbGxzIGZvciBlYWNoIEhhcm5lc3MnLCAoKSA9PiB7XG4gICAgICBjb25zdCBza2lsbHMgPSBnZXRIYXJuZXNzU2tpbGxzKCk7XG5cbiAgICAgIGV4cGVjdChza2lsbHMub3JjaGVzdHJhdGlvbikudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChza2lsbHMuZXZvbHV0aW9uKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHNraWxscy51aXV4KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHNraWxscy5nb3Zlcm5hbmNlKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gY29ycmVjdCBza2lsbHMgZm9yIE9yY2hlc3RyYXRpb24gSGFybmVzcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHNraWxscyA9IGdldEhhcm5lc3NTa2lsbHMoKTtcblxuICAgICAgZXhwZWN0KHNraWxscy5vcmNoZXN0cmF0aW9uKS50b0NvbnRhaW4oJ2NvbnRleHQtY29tcHJlc3NvcicpO1xuICAgICAgZXhwZWN0KHNraWxscy5vcmNoZXN0cmF0aW9uLmxlbmd0aCkudG9CZSgxKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGNvcnJlY3Qgc2tpbGxzIGZvciBFdm9sdXRpb24gSGFybmVzcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHNraWxscyA9IGdldEhhcm5lc3NTa2lsbHMoKTtcblxuICAgICAgZXhwZWN0KHNraWxscy5ldm9sdXRpb24pLnRvQ29udGFpbignbWVtb3J5LWNvbnNvbGlkYXRpb24nKTtcbiAgICAgIGV4cGVjdChza2lsbHMuZXZvbHV0aW9uLmxlbmd0aCkudG9CZSgxKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IHNraWxscyBmb3IgVUkvVVggSGFybmVzcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHNraWxscyA9IGdldEhhcm5lc3NTa2lsbHMoKTtcblxuICAgICAgZXhwZWN0KHNraWxscy51aXV4KS50b0VxdWFsKFtdKTtcbiAgICAgIGV4cGVjdChza2lsbHMudWl1eC5sZW5ndGgpLnRvQmUoMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBjb3JyZWN0IHNraWxscyBmb3IgR292ZXJuYW5jZSBIYXJuZXNzJywgKCkgPT4ge1xuICAgICAgY29uc3Qgc2tpbGxzID0gZ2V0SGFybmVzc1NraWxscygpO1xuXG4gICAgICBleHBlY3Qoc2tpbGxzLmdvdmVybmFuY2UpLnRvQ29udGFpbignaHlicmlkLXJldHJpZXZlcicpO1xuICAgICAgZXhwZWN0KHNraWxscy5nb3Zlcm5hbmNlKS50b0NvbnRhaW4oJ2NpdGF0aW9uLXRyYWNlcicpO1xuICAgICAgZXhwZWN0KHNraWxscy5nb3Zlcm5hbmNlKS50b0NvbnRhaW4oJ2hhbGx1Y2luYXRpb24tZ3VhcmQnKTtcbiAgICAgIGV4cGVjdChza2lsbHMuZ292ZXJuYW5jZS5sZW5ndGgpLnRvQmUoMyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd2ZXJpZnlTa2lsbHNSZWdpc3RyYXRpb24nLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCB2ZXJpZnkgdG90YWwgc2tpbGxzIGNvdW50JywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdmVyaWZ5U2tpbGxzUmVnaXN0cmF0aW9uKCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQudG90YWxTa2lsbHMpLnRvQmUoNSk7XG4gICAgICBleHBlY3QocmVzdWx0LnZlcmlmaWVkKS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYnlIYXJuZXNzIGJyZWFrZG93bicsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZlcmlmeVNraWxsc1JlZ2lzdHJhdGlvbigpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmJ5SGFybmVzcy5vcmNoZXN0cmF0aW9uKS50b0VxdWFsKFsnY29udGV4dC1jb21wcmVzc29yJ10pO1xuICAgICAgZXhwZWN0KHJlc3VsdC5ieUhhcm5lc3MuZXZvbHV0aW9uKS50b0VxdWFsKFsnbWVtb3J5LWNvbnNvbGlkYXRpb24nXSk7XG4gICAgICBleHBlY3QocmVzdWx0LmJ5SGFybmVzcy51aXV4KS50b0VxdWFsKFtdKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuYnlIYXJuZXNzLmdvdmVybmFuY2UpLnRvRXF1YWwoW1xuICAgICAgICAnaHlicmlkLXJldHJpZXZlcicsXG4gICAgICAgICdjaXRhdGlvbi10cmFjZXInLFxuICAgICAgICAnaGFsbHVjaW5hdGlvbi1ndWFyZCcsXG4gICAgICBdKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdmVyaWZ5IGFsbCBza2lsbHMgYXJlIHJlZ2lzdGVyZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSB2ZXJpZnlTa2lsbHNSZWdpc3RyYXRpb24oKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC52ZXJpZmllZCkudG9CZSh0cnVlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1NraWxscyB0byBIYXJuZXNzIE1hcHBpbmcnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBtYXAgQ29udGV4dENvbXByZXNzb3JTa2lsbCB0byBPcmNoZXN0cmF0aW9uIEhhcm5lc3MnLCAoKSA9PiB7XG4gICAgICBjb25zdCBza2lsbHMgPSBnZXRIYXJuZXNzU2tpbGxzKCk7XG4gICAgICBleHBlY3Qoc2tpbGxzLm9yY2hlc3RyYXRpb24pLnRvQ29udGFpbignY29udGV4dC1jb21wcmVzc29yJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIG1hcCBNZW1vcnlDb25zb2xpZGF0aW9uU2tpbGwgdG8gRXZvbHV0aW9uIEhhcm5lc3MnLCAoKSA9PiB7XG4gICAgICBjb25zdCBza2lsbHMgPSBnZXRIYXJuZXNzU2tpbGxzKCk7XG4gICAgICBleHBlY3Qoc2tpbGxzLmV2b2x1dGlvbikudG9Db250YWluKCdtZW1vcnktY29uc29saWRhdGlvbicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBub3QgbWFwIGFueSBza2lsbHMgdG8gVUkvVVggSGFybmVzcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHNraWxscyA9IGdldEhhcm5lc3NTa2lsbHMoKTtcbiAgICAgIGV4cGVjdChza2lsbHMudWl1eCkudG9FcXVhbChbXSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIG1hcCBSQUcgc2tpbGxzIHRvIEdvdmVybmFuY2UgSGFybmVzcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHNraWxscyA9IGdldEhhcm5lc3NTa2lsbHMoKTtcbiAgICAgIGV4cGVjdChza2lsbHMuZ292ZXJuYW5jZSkudG9Db250YWluKCdoeWJyaWQtcmV0cmlldmVyJyk7XG4gICAgICBleHBlY3Qoc2tpbGxzLmdvdmVybmFuY2UpLnRvQ29udGFpbignY2l0YXRpb24tdHJhY2VyJyk7XG4gICAgICBleHBlY3Qoc2tpbGxzLmdvdmVybmFuY2UpLnRvQ29udGFpbignaGFsbHVjaW5hdGlvbi1ndWFyZCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUmVnaXN0cmF0aW9uIFN1bW1hcnknLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBoYXZlIGNvcnJlY3QgdG90YWwgY291bnQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBza2lsbHMgPSBnZXRIYXJuZXNzU2tpbGxzKCk7XG4gICAgICBjb25zdCB0b3RhbCA9IE9iamVjdC52YWx1ZXMoc2tpbGxzKS5yZWR1Y2UoKHN1bSwgYXJyKSA9PiBzdW0gKyBhcnIubGVuZ3RoLCAwKTtcbiAgICAgIGV4cGVjdCh0b3RhbCkudG9CZSg1KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGF2ZSBiYWxhbmNlZCBkaXN0cmlidXRpb24nLCAoKSA9PiB7XG4gICAgICBjb25zdCBza2lsbHMgPSBnZXRIYXJuZXNzU2tpbGxzKCk7XG5cbiAgICAgIC8vIE9yY2hlc3RyYXRpb246IDEgc2tpbGwgKGNvbnRleHQgY29tcHJlc3Npb24pXG4gICAgICBleHBlY3Qoc2tpbGxzLm9yY2hlc3RyYXRpb24ubGVuZ3RoKS50b0JlKDEpO1xuXG4gICAgICAvLyBFdm9sdXRpb246IDEgc2tpbGwgKG1lbW9yeSBjb25zb2xpZGF0aW9uKVxuICAgICAgZXhwZWN0KHNraWxscy5ldm9sdXRpb24ubGVuZ3RoKS50b0JlKDEpO1xuXG4gICAgICAvLyBVSS9VWDogMCBza2lsbHMgKHB1cmUgVUkgZnVuY3Rpb25hbGl0eSlcbiAgICAgIGV4cGVjdChza2lsbHMudWl1eC5sZW5ndGgpLnRvQmUoMCk7XG5cbiAgICAgIC8vIEdvdmVybmFuY2U6IDMgc2tpbGxzIChSQUcgcGlwZWxpbmUpXG4gICAgICBleHBlY3Qoc2tpbGxzLmdvdmVybmFuY2UubGVuZ3RoKS50b0JlKDMpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19