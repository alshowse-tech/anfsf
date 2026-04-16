"use strict";
/**
 * L14 Simulation Layer - Auto Decision Engine
 *
 * Automatically decides simulation level based on project risk profile.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDecisionEngine = void 0;
class AutoDecisionEngine {
    /**
     * Compute risk score from profile
     */
    computeRiskScore(profile) {
        return (profile.domainRisk * 0.35 +
            profile.scaleRisk * 0.25 +
            profile.dataRisk * 0.25 +
            profile.complianceRisk * 0.15);
    }
    /**
     * Decide simulation level based on risk score
     */
    decideSimulationLevel(riskScore) {
        if (riskScore < 0.3) {
            return {
                level: 0,
                description: '跳过模拟',
                enabledModules: [],
            };
        }
        else if (riskScore < 0.6) {
            return {
                level: 1,
                description: '轻量模拟',
                enabledModules: ['user-behavior'],
            };
        }
        else if (riskScore < 0.8) {
            return {
                level: 2,
                description: '完整模拟',
                enabledModules: ['user-behavior', 'load'],
            };
        }
        else {
            return {
                level: 3,
                description: '强化模拟',
                enabledModules: ['user-behavior', 'load', 'exception', 'boundary'],
            };
        }
    }
    /**
     * Extract risk profile from PRD
     */
    extractRiskProfile(prd) {
        // Domain risk
        const domain = prd.domain?.toLowerCase() || '';
        const domainRisk = domain.includes('金融') || domain.includes('证券') || domain.includes('医疗') ? 0.9 :
            domain.includes('电商') || domain.includes('教育') ? 0.5 :
                0.2;
        // Scale risk (based on expected users)
        const expectedUsers = prd.expectedUsers || 0;
        const scaleRisk = expectedUsers > 1000000 ? 0.9 :
            expectedUsers > 100000 ? 0.6 :
                expectedUsers > 10000 ? 0.3 :
                    0.1;
        // Data risk
        const handlesPII = prd.handlesPII || false;
        const handlesFinancial = prd.handlesFinancial || false;
        const dataRisk = handlesFinancial ? 0.9 :
            handlesPII ? 0.7 :
                0.2;
        // Compliance risk
        const compliance = prd.compliance || [];
        const complianceRisk = compliance.some((c) => /证券|金融|医疗|HIPAA|GDPR/.test(c)) ? 0.9 :
            compliance.length > 0 ? 0.5 :
                0.1;
        return {
            domainRisk,
            scaleRisk,
            dataRisk,
            complianceRisk,
        };
    }
    /**
     * Main entry: decide simulation level from PRD
     */
    decide(prd) {
        const profile = this.extractRiskProfile(prd);
        const riskScore = this.computeRiskScore(profile);
        return this.decideSimulationLevel(riskScore);
    }
}
exports.AutoDecisionEngine = AutoDecisionEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1kZWNpc2lvbi1lbmdpbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvc2ltdWxhdGlvbi9hdXRvLWRlY2lzaW9uLWVuZ2luZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBZUgsTUFBYSxrQkFBa0I7SUFDN0I7O09BRUc7SUFDSCxnQkFBZ0IsQ0FBQyxPQUEyQjtRQUMxQyxPQUFPLENBQ0wsT0FBTyxDQUFDLFVBQVUsR0FBRyxJQUFJO1lBQ3pCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSTtZQUN4QixPQUFPLENBQUMsUUFBUSxHQUFHLElBQUk7WUFDdkIsT0FBTyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQzlCLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxxQkFBcUIsQ0FBQyxTQUFpQjtRQUNyQyxJQUFJLFNBQVMsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNwQixPQUFPO2dCQUNMLEtBQUssRUFBRSxDQUFDO2dCQUNSLFdBQVcsRUFBRSxNQUFNO2dCQUNuQixjQUFjLEVBQUUsRUFBRTthQUNuQixDQUFDO1FBQ0osQ0FBQzthQUFNLElBQUksU0FBUyxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQzNCLE9BQU87Z0JBQ0wsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLGNBQWMsRUFBRSxDQUFDLGVBQWUsQ0FBQzthQUNsQyxDQUFDO1FBQ0osQ0FBQzthQUFNLElBQUksU0FBUyxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQzNCLE9BQU87Z0JBQ0wsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLGNBQWMsRUFBRSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUM7YUFDMUMsQ0FBQztRQUNKLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTztnQkFDTCxLQUFLLEVBQUUsQ0FBQztnQkFDUixXQUFXLEVBQUUsTUFBTTtnQkFDbkIsY0FBYyxFQUFFLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDO2FBQ25FLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsa0JBQWtCLENBQUMsR0FBUTtRQUN6QixjQUFjO1FBQ2QsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDL0MsTUFBTSxVQUFVLEdBQ2QsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQy9FLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RELEdBQUcsQ0FBQztRQUVOLHVDQUF1QztRQUN2QyxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQztRQUM3QyxNQUFNLFNBQVMsR0FDYixhQUFhLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQixhQUFhLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDOUIsYUFBYSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzdCLEdBQUcsQ0FBQztRQUVOLFlBQVk7UUFDWixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQztRQUMzQyxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSxLQUFLLENBQUM7UUFDdkQsTUFBTSxRQUFRLEdBQ1osZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2xCLEdBQUcsQ0FBQztRQUVOLGtCQUFrQjtRQUNsQixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQztRQUN4QyxNQUFNLGNBQWMsR0FDbEIsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDN0IsR0FBRyxDQUFDO1FBRU4sT0FBTztZQUNMLFVBQVU7WUFDVixTQUFTO1lBQ1QsUUFBUTtZQUNSLGNBQWM7U0FDZixDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLEdBQVE7UUFDYixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRjtBQTlGRCxnREE4RkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEwxNCBTaW11bGF0aW9uIExheWVyIC0gQXV0byBEZWNpc2lvbiBFbmdpbmVcbiAqIFxuICogQXV0b21hdGljYWxseSBkZWNpZGVzIHNpbXVsYXRpb24gbGV2ZWwgYmFzZWQgb24gcHJvamVjdCByaXNrIHByb2ZpbGUuXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0Umlza1Byb2ZpbGUge1xuICBkb21haW5SaXNrOiBudW1iZXI7ICAgICAgLy8g5Lia5Yqh5Z+f6aOO6ZmpICgwLTEpOiDph5Hono0v5Yy755aXPemrmO+8jOW3peWFty/lqLHkuZA95L2OXG4gIHNjYWxlUmlzazogbnVtYmVyOyAgICAgICAvLyDop4TmqKHpo47pmakgKDAtMSk6IOeUqOaIt+inhOaooemihOacn1xuICBkYXRhUmlzazogbnVtYmVyOyAgICAgICAgLy8g5pWw5o2u5pWP5oSf5oCnICgwLTEpOiBQSUkv6YeR6J6N5pWw5o2uPemrmFxuICBjb21wbGlhbmNlUmlzazogbnVtYmVyOyAgLy8g5ZCI6KeE6KaB5rGCICgwLTEpOiDor4HliLgv5Yy755aX5rOV6KeEPemrmFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNpbXVsYXRpb25MZXZlbCB7XG4gIGxldmVsOiAwIHwgMSB8IDIgfCAzO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBlbmFibGVkTW9kdWxlczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBjbGFzcyBBdXRvRGVjaXNpb25FbmdpbmUge1xuICAvKipcbiAgICogQ29tcHV0ZSByaXNrIHNjb3JlIGZyb20gcHJvZmlsZVxuICAgKi9cbiAgY29tcHV0ZVJpc2tTY29yZShwcm9maWxlOiBQcm9qZWN0Umlza1Byb2ZpbGUpOiBudW1iZXIge1xuICAgIHJldHVybiAoXG4gICAgICBwcm9maWxlLmRvbWFpblJpc2sgKiAwLjM1ICtcbiAgICAgIHByb2ZpbGUuc2NhbGVSaXNrICogMC4yNSArXG4gICAgICBwcm9maWxlLmRhdGFSaXNrICogMC4yNSArXG4gICAgICBwcm9maWxlLmNvbXBsaWFuY2VSaXNrICogMC4xNVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogRGVjaWRlIHNpbXVsYXRpb24gbGV2ZWwgYmFzZWQgb24gcmlzayBzY29yZVxuICAgKi9cbiAgZGVjaWRlU2ltdWxhdGlvbkxldmVsKHJpc2tTY29yZTogbnVtYmVyKTogU2ltdWxhdGlvbkxldmVsIHtcbiAgICBpZiAocmlza1Njb3JlIDwgMC4zKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZXZlbDogMCxcbiAgICAgICAgZGVzY3JpcHRpb246ICfot7Pov4fmqKHmi58nLFxuICAgICAgICBlbmFibGVkTW9kdWxlczogW10sXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAocmlza1Njb3JlIDwgMC42KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZXZlbDogMSxcbiAgICAgICAgZGVzY3JpcHRpb246ICfovbvph4/mqKHmi58nLFxuICAgICAgICBlbmFibGVkTW9kdWxlczogWyd1c2VyLWJlaGF2aW9yJ10sXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAocmlza1Njb3JlIDwgMC44KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZXZlbDogMixcbiAgICAgICAgZGVzY3JpcHRpb246ICflrozmlbTmqKHmi58nLFxuICAgICAgICBlbmFibGVkTW9kdWxlczogWyd1c2VyLWJlaGF2aW9yJywgJ2xvYWQnXSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxldmVsOiAzLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ+W8uuWMluaooeaLnycsXG4gICAgICAgIGVuYWJsZWRNb2R1bGVzOiBbJ3VzZXItYmVoYXZpb3InLCAnbG9hZCcsICdleGNlcHRpb24nLCAnYm91bmRhcnknXSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgcmlzayBwcm9maWxlIGZyb20gUFJEXG4gICAqL1xuICBleHRyYWN0Umlza1Byb2ZpbGUocHJkOiBhbnkpOiBQcm9qZWN0Umlza1Byb2ZpbGUge1xuICAgIC8vIERvbWFpbiByaXNrXG4gICAgY29uc3QgZG9tYWluID0gcHJkLmRvbWFpbj8udG9Mb3dlckNhc2UoKSB8fCAnJztcbiAgICBjb25zdCBkb21haW5SaXNrID0gXG4gICAgICBkb21haW4uaW5jbHVkZXMoJ+mHkeiejScpIHx8IGRvbWFpbi5pbmNsdWRlcygn6K+B5Yi4JykgfHwgZG9tYWluLmluY2x1ZGVzKCfljLvnlpcnKSA/IDAuOSA6XG4gICAgICBkb21haW4uaW5jbHVkZXMoJ+eUteWVhicpIHx8IGRvbWFpbi5pbmNsdWRlcygn5pWZ6IKyJykgPyAwLjUgOlxuICAgICAgMC4yO1xuXG4gICAgLy8gU2NhbGUgcmlzayAoYmFzZWQgb24gZXhwZWN0ZWQgdXNlcnMpXG4gICAgY29uc3QgZXhwZWN0ZWRVc2VycyA9IHByZC5leHBlY3RlZFVzZXJzIHx8IDA7XG4gICAgY29uc3Qgc2NhbGVSaXNrID0gXG4gICAgICBleHBlY3RlZFVzZXJzID4gMTAwMDAwMCA/IDAuOSA6XG4gICAgICBleHBlY3RlZFVzZXJzID4gMTAwMDAwID8gMC42IDpcbiAgICAgIGV4cGVjdGVkVXNlcnMgPiAxMDAwMCA/IDAuMyA6XG4gICAgICAwLjE7XG5cbiAgICAvLyBEYXRhIHJpc2tcbiAgICBjb25zdCBoYW5kbGVzUElJID0gcHJkLmhhbmRsZXNQSUkgfHwgZmFsc2U7XG4gICAgY29uc3QgaGFuZGxlc0ZpbmFuY2lhbCA9IHByZC5oYW5kbGVzRmluYW5jaWFsIHx8IGZhbHNlO1xuICAgIGNvbnN0IGRhdGFSaXNrID0gXG4gICAgICBoYW5kbGVzRmluYW5jaWFsID8gMC45IDpcbiAgICAgIGhhbmRsZXNQSUkgPyAwLjcgOlxuICAgICAgMC4yO1xuXG4gICAgLy8gQ29tcGxpYW5jZSByaXNrXG4gICAgY29uc3QgY29tcGxpYW5jZSA9IHByZC5jb21wbGlhbmNlIHx8IFtdO1xuICAgIGNvbnN0IGNvbXBsaWFuY2VSaXNrID0gXG4gICAgICBjb21wbGlhbmNlLnNvbWUoKGM6IHN0cmluZykgPT4gL+ivgeWIuHzph5Hono185Yy755aXfEhJUEFBfEdEUFIvLnRlc3QoYykpID8gMC45IDpcbiAgICAgIGNvbXBsaWFuY2UubGVuZ3RoID4gMCA/IDAuNSA6XG4gICAgICAwLjE7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluUmlzayxcbiAgICAgIHNjYWxlUmlzayxcbiAgICAgIGRhdGFSaXNrLFxuICAgICAgY29tcGxpYW5jZVJpc2ssXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYWluIGVudHJ5OiBkZWNpZGUgc2ltdWxhdGlvbiBsZXZlbCBmcm9tIFBSRFxuICAgKi9cbiAgZGVjaWRlKHByZDogYW55KTogU2ltdWxhdGlvbkxldmVsIHtcbiAgICBjb25zdCBwcm9maWxlID0gdGhpcy5leHRyYWN0Umlza1Byb2ZpbGUocHJkKTtcbiAgICBjb25zdCByaXNrU2NvcmUgPSB0aGlzLmNvbXB1dGVSaXNrU2NvcmUocHJvZmlsZSk7XG4gICAgcmV0dXJuIHRoaXMuZGVjaWRlU2ltdWxhdGlvbkxldmVsKHJpc2tTY29yZSk7XG4gIH1cbn1cbiJdfQ==