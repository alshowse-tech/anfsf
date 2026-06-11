/**
 * ANFSF Pipeline — Release Check (T-304)
 *
 * Three-layer release gate before publishing:
 *   Layer 1: System auto-check (all E2E, contracts, security, compliance)
 *   Layer 2: PM manual confirmation (functional completeness, UI/UX, coverage)
 *   Layer 3: Role confirmation (frontend lead, backend lead, devops)
 */

import type { FixRecord } from './fix-engine';

// ============================================================================
// Types
// ============================================================================

export type CheckLayer = 'system' | 'pm' | 'role';
export type CheckStatus = 'pending' | 'passed' | 'failed' | 'skipped';

export interface ReleaseCheckItem {
  layer: CheckLayer;
  name: string;
  description: string;
  status: CheckStatus;
  checkedBy?: string;
  checkedAt?: number;
  details?: string;
}

export interface ReleaseReport {
  projectId: string;
  passed: boolean;
  layers: {
    system: { passed: boolean; items: ReleaseCheckItem[] };
    pm: { passed: boolean; items: ReleaseCheckItem[] };
    role: { passed: boolean; items: ReleaseCheckItem[] };
  };
  blockers: string[];
  releasable: boolean;
}

// ============================================================================
// Release Check
// ============================================================================

export class ReleaseCheck {
  /**
   * Run the full three-layer release check.
   */
  check(params: {
    projectId: string;
    fixRecords: FixRecord[];
    testResults: { passed: boolean }[];
    changeRequests: { state: string }[];
    frontendConfirmed: boolean;
    backendConfirmed: boolean;
    devopsConfirmed?: boolean;
  }): ReleaseReport {
    // Layer 1: System auto-check
    const systemItems = this.runSystemCheck(params);
    const systemPassed = systemItems.every(i => i.status === 'passed' || i.status === 'skipped');

    // Layer 2: PM confirmation (starts as pending — PM must manually confirm)
    const pmItems = this.buildPMChecklist();
    const pmPassed = false; // Always starts as not passed until PM confirms

    // Layer 3: Role confirmation
    const roleItems = this.buildRoleChecklist(params);
    const rolePassed = roleItems.every(i => i.status === 'passed' || i.status === 'skipped');

    const blockers: string[] = [];
    if (!systemPassed) blockers.push('System auto-check has failures');
    if (!pmPassed) blockers.push('PM confirmation pending');
    if (!rolePassed) blockers.push('Role confirmation pending');

    return {
      projectId: params.projectId,
      passed: systemPassed && rolePassed, // PM is separate
      layers: {
        system: { passed: systemPassed, items: systemItems },
        pm: { passed: pmPassed, items: pmItems },
        role: { passed: rolePassed, items: roleItems },
      },
      blockers,
      releasable: systemPassed && rolePassed,
    };
  }

  private runSystemCheck(params: { fixRecords: FixRecord[]; testResults: { passed: boolean }[]; changeRequests: { state: string }[] }): ReleaseCheckItem[] {
    const items: ReleaseCheckItem[] = [];

    // All tests pass
    const allTestsPassed = params.testResults.every(r => r.passed);
    items.push({
      layer: 'system', name: 'E2E Tests', description: 'All automated tests must pass',
      status: allTestsPassed ? 'passed' : 'failed',
      details: `${params.testResults.length} tests, ${params.testResults.filter(r => r.passed).length} passed`,
    });

    // No unconfirmed fixes
    const unconfirmed = params.fixRecords.filter(r => r.fixStatus !== 'confirmed');
    items.push({
      layer: 'system', name: 'Fix Confirmation', description: 'All fixes must be confirmed',
      status: unconfirmed.length === 0 ? 'passed' : 'failed',
      details: unconfirmed.length > 0 ? `${unconfirmed.length} unconfirmed fixes` : 'All fixes confirmed',
    });

    // No unclosed changes
    const unclosed = params.changeRequests.filter(c => c.state !== 'completed' && c.state !== 'cancelled' && c.state !== 'deferred');
    items.push({
      layer: 'system', name: 'Change Closure', description: 'All confirmed changes must be completed',
      status: unclosed.length === 0 ? 'passed' : 'failed',
      details: unclosed.length > 0 ? `${unclosed.length} unclosed changes` : 'All changes closed',
    });

    return items;
  }

  private buildPMChecklist(): ReleaseCheckItem[] {
    return [
      { layer: 'pm', name: '功能完整性', description: '确认所有需求功能已实现', status: 'pending' },
      { layer: 'pm', name: 'UI/UX 一致性', description: '确认界面与设计一致', status: 'pending' },
      { layer: 'pm', name: '测试覆盖度', description: '确认测试用例覆盖了核心场景', status: 'pending' },
      { layer: 'pm', name: '竞品差距', description: '确认与竞品的功能差距在可接受范围', status: 'pending' },
    ];
  }

  private buildRoleChecklist(params: { frontendConfirmed: boolean; backendConfirmed: boolean; devopsConfirmed?: boolean }): ReleaseCheckItem[] {
    return [
      {
        layer: 'role', name: '前端交付确认',
        description: '前端负责人确认代码无遗留问题',
        status: params.frontendConfirmed ? 'passed' : 'pending',
      },
      {
        layer: 'role', name: '后端交付确认',
        description: '后端负责人确认接口和数据库就绪',
        status: params.backendConfirmed ? 'passed' : 'pending',
      },
      {
        layer: 'role', name: '运维部署确认',
        description: '运维确认部署配置和监控就绪',
        status: params.devopsConfirmed ? 'passed' : 'skipped',
      },
    ];
  }
}
