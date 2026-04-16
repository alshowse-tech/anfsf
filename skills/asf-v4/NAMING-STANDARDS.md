# ANFSF 命名规范 v2.0

## 类命名 (Class Naming)
- **PascalCase**: `SecuritySandbox`, `ConstitutionValidator`
- **后缀**: 
  - `Engine`: 引擎类 (`BrandStyleTransferEngine`)
  - `Manager`: 管理器类 (`ConfigManager`)
  - `Orchestrator`: 编排器类 (`ComfyUIWorkflowOrchestrator`)
  - `Validator`: 验证器类 (`ConstitutionValidator`)
  - `Monitor`: 监控器类 (`SandboxMonitor`)

## 函数命名 (Function Naming)
- **camelCase**: `createSecuritySandbox`, `computeRoleCost`
- **前缀**:
  - `create*`: 工厂函数 (`createSecuritySandbox`)
  - `compute*`: 计算函数 (`computeRoleCost`)
  - `validate*`: 验证函数 (`validateProofs`)
  - `generate*`: 生成函数 (`generateOwnershipProof`)
  - `check*`: 检查函数 (`checkFileAccess`)

## 变量命名 (Variable Naming)
- **camelCase**: `sandboxConfig`, `memoryLimitMB`
- **常量**: **UPPER_SNAKE_CASE**: `DEFAULT_SANDBOX_CONFIG`

## 接口命名 (Interface Naming)
- **PascalCase**: `SandboxConfig`, `SafetyBoundary`
- **后缀**: `Config`, `Context`, `Result`

## 文件命名 (File Naming)
- **kebab-case**: `security-sandbox.ts`, `constitution-validator.ts`
- **测试文件**: `*.test.ts`

## 当前问题
1. 文件命名不一致: `sandbox.ts` vs `requirement-refiner-skill.ts`
2. 部分类缺少后缀: `DynamicRouter` 应该为 `DynamicRouterEngine` 或 `DynamicRouterOrchestrator`
3. 部分函数命名不一致: 需要统一前缀

## 统一计划
1. 重命名文件为 kebab-case
2. 为类添加适当后缀
3. 统一函数前缀
4. 更新所有导入引用