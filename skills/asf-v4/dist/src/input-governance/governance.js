"use strict";
/**
 * AI Native Full-Stack Software Factory
 * Layer 3: Input Governance Layer (输入治理层)
 *
 * @version 1.0.0
 * @date 2026-03-29
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputGovernanceEngine = void 0;
/**
 * Input Governance Engine
 */
class InputGovernanceEngine {
    /**
     * 一致性检查 (PRD/Design/API)
     */
    checkConsistency(prd, design, api) {
        const issues = [];
        // 检查 PRD 与 Design 一致性
        if (!this.checkPRDDesignConsistency(prd, design)) {
            issues.push({
                type: 'prd-design',
                severity: 'critical',
                description: 'PRD and Design are inconsistent',
                suggestion: 'Review and align PRD with Design',
            });
        }
        // 检查 Design 与 API 一致性
        if (!this.checkDesignAPIConsistency(design, api)) {
            issues.push({
                type: 'design-api',
                severity: 'critical',
                description: 'Design and API are inconsistent',
                suggestion: 'Review and align Design with API',
            });
        }
        return {
            consistent: issues.length === 0,
            issues,
        };
    }
    /**
     * 完整性检查 (状态/API/约束)
     */
    checkCompleteness(prd) {
        const missing = [];
        let totalItems = 0;
        let completeItems = 0;
        // 检查状态完整性
        if (!prd.features || prd.features.length === 0) {
            missing.push({
                category: 'state',
                item: 'features',
                impact: 'Cannot proceed without features',
            });
        }
        else {
            totalItems += prd.features.length;
            completeItems += prd.features.filter(f => f.status === 'approved').length;
        }
        // 检查 API 完整性
        if (!prd.backendSpecs || prd.backendSpecs.length === 0 || !prd.backendSpecs[0]?.api) {
            missing.push({
                category: 'api',
                item: 'API specifications',
                impact: 'Cannot generate backend without API specs',
            });
        }
        // 检查约束完整性
        if (!prd.constraints || prd.constraints.length === 0) {
            missing.push({
                category: 'constraint',
                item: 'constraints',
                impact: 'May lead to technical debt',
            });
        }
        const completionRate = totalItems > 0 ? (completeItems / totalItems) * 100 : 0;
        return {
            complete: missing.length === 0,
            missing,
            completionRate,
        };
    }
    /**
     * 模糊需求识别
     */
    detectAmbiguities(prd) {
        const items = [];
        const ambiguousWords = [
            'maybe', 'possibly', 'might', 'could', 'should',
            'fast', 'slow', 'large', 'small', 'user-friendly',
            'etc', 'and so on', 'approximately',
        ];
        // 检查 feature 描述
        prd.features.forEach(feature => {
            ambiguousWords.forEach(word => {
                if (feature.description.toLowerCase().includes(word)) {
                    items.push({
                        location: `features/${feature.id}`,
                        text: feature.description,
                        ambiguity: `Contains ambiguous word: "${word}"`,
                        suggestion: 'Use specific, measurable terms',
                    });
                }
            });
        });
        return {
            ambiguous: items.length > 0,
            items,
        };
    }
    /**
     * 冲突解决
     */
    resolveConflicts(prd) {
        const conflicts = [];
        const resolutions = [];
        // 检测需求冲突
        conflicts.push(...this.detectRequirementConflicts(prd));
        // 检测设计冲突
        // conflicts.push(...this.detectDesignConflicts(design));
        // 解决冲突
        conflicts.forEach(conflict => {
            const resolution = this.generateResolution(conflict);
            if (resolution) {
                resolutions.push(resolution);
            }
        });
        return {
            resolved: resolutions.length === conflicts.length,
            conflicts,
            resolutions,
        };
    }
    /**
     * 检测需求冲突
     */
    detectRequirementConflicts(prd) {
        const conflicts = [];
        // 检查约束冲突
        if (prd.constraints) {
            for (let i = 0; i < prd.constraints.length; i++) {
                for (let j = i + 1; j < prd.constraints.length; j++) {
                    if (this.areConstraintsConflicting(prd.constraints[i], prd.constraints[j])) {
                        conflicts.push({
                            id: `conflict-${i}-${j}`,
                            type: 'constraint',
                            description: `Constraint ${prd.constraints[i].id} conflicts with ${prd.constraints[j].id}`,
                            severity: 'critical',
                        });
                    }
                }
            }
        }
        return conflicts;
    }
    /**
     * 检查约束是否冲突
     */
    areConstraintsConflicting(c1, c2) {
        // TODO: 实现冲突检测逻辑
        return false;
    }
    /**
     * 生成解决方案
     */
    generateResolution(conflict) {
        // TODO: 实现冲突解决逻辑
        return {
            conflictId: conflict.id,
            resolution: 'Manual review required',
            impact: 'May require PRD update',
        };
    }
    /**
     * 检查 PRD 与 Design 一致性
     */
    checkPRDDesignConsistency(prd, design) {
        // TODO: 实现一致性检查
        return true;
    }
    /**
     * 检查 Design 与 API 一致性
     */
    checkDesignAPIConsistency(design, api) {
        // TODO: 实现一致性检查
        return true;
    }
}
exports.InputGovernanceEngine = InputGovernanceEngine;
exports.default = InputGovernanceEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ292ZXJuYW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9pbnB1dC1nb3Zlcm5hbmNlL2dvdmVybmFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBdUVIOztHQUVHO0FBQ0gsTUFBYSxxQkFBcUI7SUFDaEM7O09BRUc7SUFDSCxnQkFBZ0IsQ0FBQyxHQUFnQixFQUFFLE1BQVcsRUFBRSxHQUFRO1FBQ3RELE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUM7UUFFdEMsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakQsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDVixJQUFJLEVBQUUsWUFBWTtnQkFDbEIsUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLFdBQVcsRUFBRSxpQ0FBaUM7Z0JBQzlDLFVBQVUsRUFBRSxrQ0FBa0M7YUFDL0MsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELHNCQUFzQjtRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ1YsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixXQUFXLEVBQUUsaUNBQWlDO2dCQUM5QyxVQUFVLEVBQUUsa0NBQWtDO2FBQy9DLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUMvQixNQUFNO1NBQ1AsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQixDQUFDLEdBQWdCO1FBQ2hDLE1BQU0sT0FBTyxHQUFrQixFQUFFLENBQUM7UUFDbEMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FB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R0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQzNFLFNBQVMsQ0FBQyxJQUFJLENBQUM7NEJBQ2IsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTs0QkFDeEIsSUFBSSxFQUFFLFlBQVk7NEJBQ2xCLFdBQVcsRUFBRSxjQUFjLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7NEJBQzFGLFFBQVEsRUFBRSxVQUFVO3lCQUNyQixDQUFDLENBQUM7b0JBQ0wsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQ7O09BRUc7SUFDSyx5QkFBeUIsQ0FBQyxFQUFPLEVBQUUsRUFBTztRQUNoRCxpQkFBaUI7UUFDakIsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQ7O09BRUc7SUFDSyxrQkFBa0IsQ0FBQyxRQUFrQjtRQUMzQyxpQkFBaUI7UUFDakIsT0FBTztZQUNMLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBRTtZQUN2QixVQUFVLEVBQUUsd0JBQXdCO1lBQ3BDLE1BQU0sRUFBRSx3QkFBd0I7U0FDakMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNLLHlCQUF5QixDQUFDLEdBQWdCLEVBQUUsTUFBVztRQUM3RCxnQkFBZ0I7UUFDaEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQ7O09BRUc7SUFDSyx5QkFBeUIsQ0FBQyxNQUFXLEVBQUUsR0FBUTtRQUNyRCxnQkFBZ0I7UUFDaEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUF2TUQsc0RBdU1DO0FBRUQsa0JBQWUscUJBQXFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFJIE5hdGl2ZSBGdWxsLVN0YWNrIFNvZnR3YXJlIEZhY3RvcnlcbiAqIExheWVyIDM6IElucHV0IEdvdmVybmFuY2UgTGF5ZXIgKOi+k+WFpeayu+eQhuWxgilcbiAqIFxuICogQHZlcnNpb24gMS4wLjBcbiAqIEBkYXRlIDIwMjYtMDMtMjlcbiAqL1xuXG5pbXBvcnQgeyBBSU5hdGl2ZVBSRCB9IGZyb20gJy4uL3ByZC9wcmQtcGFyc2VyJztcblxuLyoqXG4gKiDkuIDoh7TmgKfmo4Dmn6Xnu5PmnpxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25zaXN0ZW5jeVJlcG9ydCB7XG4gIGNvbnNpc3RlbnQ6IGJvb2xlYW47XG4gIGlzc3VlczogQ29uc2lzdGVuY3lJc3N1ZVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnNpc3RlbmN5SXNzdWUge1xuICB0eXBlOiAncHJkLWRlc2lnbicgfCAnZGVzaWduLWFwaScgfCAnYXBpLWltcGxlbWVudGF0aW9uJztcbiAgc2V2ZXJpdHk6ICdjcml0aWNhbCcgfCAnd2FybmluZycgfCAnaW5mbyc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIHN1Z2dlc3Rpb246IHN0cmluZztcbn1cblxuLyoqXG4gKiDlrozmlbTmgKfmo4Dmn6Xnu5PmnpxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21wbGV0ZW5lc3NSZXBvcnQge1xuICBjb21wbGV0ZTogYm9vbGVhbjtcbiAgbWlzc2luZzogTWlzc2luZ0l0ZW1bXTtcbiAgY29tcGxldGlvblJhdGU6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNaXNzaW5nSXRlbSB7XG4gIGNhdGVnb3J5OiAnc3RhdGUnIHwgJ2FwaScgfCAnY29uc3RyYWludCc7XG4gIGl0ZW06IHN0cmluZztcbiAgaW1wYWN0OiBzdHJpbmc7XG59XG5cbi8qKlxuICog5qih57OK5oCn5qOA5rWL57uT5p6cXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQW1iaWd1aXR5UmVwb3J0IHtcbiAgYW1iaWd1b3VzOiBib29sZWFuO1xuICBpdGVtczogQW1iaWd1b3VzSXRlbVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFtYmlndW91c0l0ZW0ge1xuICBsb2NhdGlvbjogc3RyaW5nO1xuICB0ZXh0OiBzdHJpbmc7XG4gIGFtYmlndWl0eTogc3RyaW5nO1xuICBzdWdnZXN0aW9uOiBzdHJpbmc7XG59XG5cbi8qKlxuICog5Yay56qB6Kej5Yaz57uT5p6cXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmxpY3RSZXNvbHV0aW9uIHtcbiAgcmVzb2x2ZWQ6IGJvb2xlYW47XG4gIGNvbmZsaWN0czogQ29uZmxpY3RbXTtcbiAgcmVzb2x1dGlvbnM6IFJlc29sdXRpb25bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25mbGljdCB7XG4gIGlkOiBzdHJpbmc7XG4gIHR5cGU6ICdyZXF1aXJlbWVudCcgfCAnZGVzaWduJyB8ICdjb25zdHJhaW50JztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgc2V2ZXJpdHk6ICdjcml0aWNhbCcgfCAnbWFqb3InIHwgJ21pbm9yJztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHV0aW9uIHtcbiAgY29uZmxpY3RJZDogc3RyaW5nO1xuICByZXNvbHV0aW9uOiBzdHJpbmc7XG4gIGltcGFjdDogc3RyaW5nO1xufVxuXG4vKipcbiAqIElucHV0IEdvdmVybmFuY2UgRW5naW5lXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnB1dEdvdmVybmFuY2VFbmdpbmUge1xuICAvKipcbiAgICog5LiA6Ie05oCn5qOA5p+lIChQUkQvRGVzaWduL0FQSSlcbiAgICovXG4gIGNoZWNrQ29uc2lzdGVuY3kocHJkOiBBSU5hdGl2ZVBSRCwgZGVzaWduOiBhbnksIGFwaTogYW55KTogQ29uc2lzdGVuY3lSZXBvcnQge1xuICAgIGNvbnN0IGlzc3VlczogQ29uc2lzdGVuY3lJc3N1ZVtdID0gW107XG5cbiAgICAvLyDmo4Dmn6UgUFJEIOS4jiBEZXNpZ24g5LiA6Ie05oCnXG4gICAgaWYgKCF0aGlzLmNoZWNrUFJERGVzaWduQ29uc2lzdGVuY3kocHJkLCBkZXNpZ24pKSB7XG4gICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdwcmQtZGVzaWduJyxcbiAgICAgICAgc2V2ZXJpdHk6ICdjcml0aWNhbCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUFJEIGFuZCBEZXNpZ24gYXJlIGluY29uc2lzdGVudCcsXG4gICAgICAgIHN1Z2dlc3Rpb246ICdSZXZpZXcgYW5kIGFsaWduIFBSRCB3aXRoIERlc2lnbicsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDmo4Dmn6UgRGVzaWduIOS4jiBBUEkg5LiA6Ie05oCnXG4gICAgaWYgKCF0aGlzLmNoZWNrRGVzaWduQVBJQ29uc2lzdGVuY3koZGVzaWduLCBhcGkpKSB7XG4gICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkZXNpZ24tYXBpJyxcbiAgICAgICAgc2V2ZXJpdHk6ICdjcml0aWNhbCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRGVzaWduIGFuZCBBUEkgYXJlIGluY29uc2lzdGVudCcsXG4gICAgICAgIHN1Z2dlc3Rpb246ICdSZXZpZXcgYW5kIGFsaWduIERlc2lnbiB3aXRoIEFQSScsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29uc2lzdGVudDogaXNzdWVzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGlzc3VlcyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOWujOaVtOaAp+ajgOafpSAo54q25oCBL0FQSS/nuqbmnZ8pXG4gICAqL1xuICBjaGVja0NvbXBsZXRlbmVzcyhwcmQ6IEFJTmF0aXZlUFJEKTogQ29tcGxldGVuZXNzUmVwb3J0IHtcbiAgICBjb25zdCBtaXNzaW5nOiBNaXNzaW5nSXRlbVtdID0gW107XG4gICAgbGV0IHRvdGFsSXRlbXMgPSAwO1xuICAgIGxldCBjb21wbGV0ZUl0ZW1zID0gMDtcblxuICAgIC8vIOajgOafpeeKtuaAgeWujOaVtOaAp1xuICAgIGlmICghcHJkLmZlYXR1cmVzIHx8IHByZC5mZWF0dXJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIG1pc3NpbmcucHVzaCh7XG4gICAgICAgIGNhdGVnb3J5OiAnc3RhdGUnLFxuICAgICAgICBpdGVtOiAnZmVhdHVyZXMnLFxuICAgICAgICBpbXBhY3Q6ICdDYW5ub3QgcHJvY2VlZCB3aXRob3V0IGZlYXR1cmVzJyxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0b3RhbEl0ZW1zICs9IHByZC5mZWF0dXJlcy5sZW5ndGg7XG4gICAgICBjb21wbGV0ZUl0ZW1zICs9IHByZC5mZWF0dXJlcy5maWx0ZXIoZiA9PiBmLnN0YXR1cyA9PT0gJ2FwcHJvdmVkJykubGVuZ3RoO1xuICAgIH1cblxuICAgIC8vIOajgOafpSBBUEkg5a6M5pW05oCnXG4gICAgaWYgKCFwcmQuYmFja2VuZFNwZWNzIHx8IHByZC5iYWNrZW5kU3BlY3MubGVuZ3RoID09PSAwIHx8ICFwcmQuYmFja2VuZFNwZWNzWzBdPy5hcGkpIHtcbiAgICAgIG1pc3NpbmcucHVzaCh7XG4gICAgICAgIGNhdGVnb3J5OiAnYXBpJyxcbiAgICAgICAgaXRlbTogJ0FQSSBzcGVjaWZpY2F0aW9ucycsXG4gICAgICAgIGltcGFjdDogJ0Nhbm5vdCBnZW5lcmF0ZSBiYWNrZW5kIHdpdGhvdXQgQVBJIHNwZWNzJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIOajgOafpee6puadn+WujOaVtOaAp1xuICAgIGlmICghcHJkLmNvbnN0cmFpbnRzIHx8IHByZC5jb25zdHJhaW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIG1pc3NpbmcucHVzaCh7XG4gICAgICAgIGNhdGVnb3J5OiAnY29uc3RyYWludCcsXG4gICAgICAgIGl0ZW06ICdjb25zdHJhaW50cycsXG4gICAgICAgIGltcGFjdDogJ01heSBsZWFkIHRvIHRlY2huaWNhbCBkZWJ0JyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBsZXRpb25SYXRlID0gdG90YWxJdGVtcyA+IDAgPyAoY29tcGxldGVJdGVtcyAvIHRvdGFsSXRlbXMpICogMTAwIDogMDtcblxuICAgIHJldHVybiB7XG4gICAgICBjb21wbGV0ZTogbWlzc2luZy5sZW5ndGggPT09IDAsXG4gICAgICBtaXNzaW5nLFxuICAgICAgY29tcGxldGlvblJhdGUsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmqKHns4rpnIDmsYLor4bliKtcbiAgICovXG4gIGRldGVjdEFtYmlndWl0aWVzKHByZDogQUlOYXRpdmVQUkQpOiBBbWJpZ3VpdHlSZXBvcnQge1xuICAgIGNvbnN0IGl0ZW1zOiBBbWJpZ3VvdXNJdGVtW10gPSBbXTtcbiAgICBjb25zdCBhbWJpZ3VvdXNXb3JkcyA9IFtcbiAgICAgICdtYXliZScsICdwb3NzaWJseScsICdtaWdodCcsICdjb3VsZCcsICdzaG91bGQnLFxuICAgICAgJ2Zhc3QnLCAnc2xvdycsICdsYXJnZScsICdzbWFsbCcsICd1c2VyLWZyaWVuZGx5JyxcbiAgICAgICdldGMnLCAnYW5kIHNvIG9uJywgJ2FwcHJveGltYXRlbHknLFxuICAgIF07XG5cbiAgICAvLyDmo4Dmn6UgZmVhdHVyZSDmj4/ov7BcbiAgICBwcmQuZmVhdHVyZXMuZm9yRWFjaChmZWF0dXJlID0+IHtcbiAgICAgIGFtYmlndW91c1dvcmRzLmZvckVhY2god29yZCA9PiB7XG4gICAgICAgIGlmIChmZWF0dXJlLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMod29yZCkpIHtcbiAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgIGxvY2F0aW9uOiBgZmVhdHVyZXMvJHtmZWF0dXJlLmlkfWAsXG4gICAgICAgICAgICB0ZXh0OiBmZWF0dXJlLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgYW1iaWd1aXR5OiBgQ29udGFpbnMgYW1iaWd1b3VzIHdvcmQ6IFwiJHt3b3JkfVwiYCxcbiAgICAgICAgICAgIHN1Z2dlc3Rpb246ICdVc2Ugc3BlY2lmaWMsIG1lYXN1cmFibGUgdGVybXMnLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbWJpZ3VvdXM6IGl0ZW1zLmxlbmd0aCA+IDAsXG4gICAgICBpdGVtcyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOWGsueqgeino+WGs1xuICAgKi9cbiAgcmVzb2x2ZUNvbmZsaWN0cyhwcmQ6IEFJTmF0aXZlUFJEKTogQ29uZmxpY3RSZXNvbHV0aW9uIHtcbiAgICBjb25zdCBjb25mbGljdHM6IENvbmZsaWN0W10gPSBbXTtcbiAgICBjb25zdCByZXNvbHV0aW9uczogUmVzb2x1dGlvbltdID0gW107XG5cbiAgICAvLyDmo4DmtYvpnIDmsYLlhrLnqoFcbiAgICBjb25mbGljdHMucHVzaCguLi50aGlzLmRldGVjdFJlcXVpcmVtZW50Q29uZmxpY3RzKHByZCkpO1xuXG4gICAgLy8g5qOA5rWL6K6+6K6h5Yay56qBXG4gICAgLy8gY29uZmxpY3RzLnB1c2goLi4udGhpcy5kZXRlY3REZXNpZ25Db25mbGljdHMoZGVzaWduKSk7XG5cbiAgICAvLyDop6PlhrPlhrLnqoFcbiAgICBjb25mbGljdHMuZm9yRWFjaChjb25mbGljdCA9PiB7XG4gICAgICBjb25zdCByZXNvbHV0aW9uID0gdGhpcy5nZW5lcmF0ZVJlc29sdXRpb24oY29uZmxpY3QpO1xuICAgICAgaWYgKHJlc29sdXRpb24pIHtcbiAgICAgICAgcmVzb2x1dGlvbnMucHVzaChyZXNvbHV0aW9uKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICByZXNvbHZlZDogcmVzb2x1dGlvbnMubGVuZ3RoID09PSBjb25mbGljdHMubGVuZ3RoLFxuICAgICAgY29uZmxpY3RzLFxuICAgICAgcmVzb2x1dGlvbnMsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmo4DmtYvpnIDmsYLlhrLnqoFcbiAgICovXG4gIHByaXZhdGUgZGV0ZWN0UmVxdWlyZW1lbnRDb25mbGljdHMocHJkOiBBSU5hdGl2ZVBSRCk6IENvbmZsaWN0W10ge1xuICAgIGNvbnN0IGNvbmZsaWN0czogQ29uZmxpY3RbXSA9IFtdO1xuXG4gICAgLy8g5qOA5p+l57qm5p2f5Yay56qBXG4gICAgaWYgKHByZC5jb25zdHJhaW50cykge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcmQuY29uc3RyYWludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgcHJkLmNvbnN0cmFpbnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgaWYgKHRoaXMuYXJlQ29uc3RyYWludHNDb25mbGljdGluZyhwcmQuY29uc3RyYWludHNbaV0sIHByZC5jb25zdHJhaW50c1tqXSkpIHtcbiAgICAgICAgICAgIGNvbmZsaWN0cy5wdXNoKHtcbiAgICAgICAgICAgICAgaWQ6IGBjb25mbGljdC0ke2l9LSR7an1gLFxuICAgICAgICAgICAgICB0eXBlOiAnY29uc3RyYWludCcsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgQ29uc3RyYWludCAke3ByZC5jb25zdHJhaW50c1tpXS5pZH0gY29uZmxpY3RzIHdpdGggJHtwcmQuY29uc3RyYWludHNbal0uaWR9YCxcbiAgICAgICAgICAgICAgc2V2ZXJpdHk6ICdjcml0aWNhbCcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29uZmxpY3RzO1xuICB9XG5cbiAgLyoqXG4gICAqIOajgOafpee6puadn+aYr+WQpuWGsueqgVxuICAgKi9cbiAgcHJpdmF0ZSBhcmVDb25zdHJhaW50c0NvbmZsaWN0aW5nKGMxOiBhbnksIGMyOiBhbnkpOiBib29sZWFuIHtcbiAgICAvLyBUT0RPOiDlrp7njrDlhrLnqoHmo4DmtYvpgLvovpFcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICog55Sf5oiQ6Kej5Yaz5pa55qGIXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlUmVzb2x1dGlvbihjb25mbGljdDogQ29uZmxpY3QpOiBSZXNvbHV0aW9uIHwgbnVsbCB7XG4gICAgLy8gVE9ETzog5a6e546w5Yay56qB6Kej5Yaz6YC76L6RXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbmZsaWN0SWQ6IGNvbmZsaWN0LmlkLFxuICAgICAgcmVzb2x1dGlvbjogJ01hbnVhbCByZXZpZXcgcmVxdWlyZWQnLFxuICAgICAgaW1wYWN0OiAnTWF5IHJlcXVpcmUgUFJEIHVwZGF0ZScsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmo4Dmn6UgUFJEIOS4jiBEZXNpZ24g5LiA6Ie05oCnXG4gICAqL1xuICBwcml2YXRlIGNoZWNrUFJERGVzaWduQ29uc2lzdGVuY3kocHJkOiBBSU5hdGl2ZVBSRCwgZGVzaWduOiBhbnkpOiBib29sZWFuIHtcbiAgICAvLyBUT0RPOiDlrp7njrDkuIDoh7TmgKfmo4Dmn6VcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmo4Dmn6UgRGVzaWduIOS4jiBBUEkg5LiA6Ie05oCnXG4gICAqL1xuICBwcml2YXRlIGNoZWNrRGVzaWduQVBJQ29uc2lzdGVuY3koZGVzaWduOiBhbnksIGFwaTogYW55KTogYm9vbGVhbiB7XG4gICAgLy8gVE9ETzog5a6e546w5LiA6Ie05oCn5qOA5p+lXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSW5wdXRHb3Zlcm5hbmNlRW5naW5lO1xuIl19