const translations: Record<string, string> = {
  // StageTabs — navigation
  "Home": "首页",
  "Requirements": "需求",
  "Development": "开发",
  "Verification": "验证",
  "Testing": "测试",
  "Release": "发布",
  "Evolution": "进化",

  // HomeDashboard
  "Projects": "项目",
  "No projects yet": "暂无项目",
  "Create your first project to start the pipeline": "创建您的第一个项目以启动流水线",
  "Create Project": "创建项目",
  "+ New Project": "+ 新建项目",
  "System Health": "系统健康",
  "Pipeline Runs": "流水线运行",
  "Active Stages": "活跃阶段",

  // PRDForm / Pipeline
  "Run Pipeline": "运行流水线",
  "Submitting...": "提交中...",
  "Pipeline Complete": "流水线完成",
  "View Output": "查看输出",

  // DevWorkspaceV2
  "Verification Feedback": "验证反馈",
  "Fix Records": "修复记录",
  "Tickets": "工单",
  "No fix records for this project": "该项目无修复记录",
  "No tickets for this project": "该项目无工单",
  "Fix Done": "修复完成",
  "Confirm": "确认",
  "Enter Project ID": "输入项目ID",
  "Load": "加载",
  "Refresh": "刷新",

  // VerifyPanel
  "Verification Summary": "验证摘要",
  "Confirmed Fixes": "已确认修复",
  "Pending Fixes": "待处理修复",
  "State Actions": "状态操作",
  "Verify Passed → Stage 3": "验证通过 → 第3阶段",
  "Enter Testing": "进入测试",
  "Back to Dev": "返回开发",
  "No fixes found": "未找到修复",
  "State updated to ": "状态已更新至 ",

  // ReleaseGate
  "Release Gate — 3-Layer Check": "发布门禁 — 三层检查",
  "System Check": "系统检查",
  "All compile/contract/verification checks passed": "所有编译/契约/验证检查已通过",
  "PM Confirmation": "PM确认",
  "PM has reviewed and approved": "PM已审核并批准",
  "Role Confirmation": "角色确认",
  "All team roles have confirmed readiness": "所有团队角色已确认就绪",
  "Release Project": "发布项目",
  "Complete all checks to release": "完成所有检查以发布",
  "Archive": "归档",

  // EvolutionPanel
  "System Overview": "系统概览",
  "Bottleneck Analysis": "瓶颈分析",
  "Stage Metrics": "阶段指标",
  "runs": "次运行",
  "No metrics available yet. Run some pipelines first.": "暂无指标数据，请先运行流水线。",

  // SettingsModal
  "Settings": "设置",
  "Gitea Config": "Gitea配置",
  "Members": "成员",

  // GiteaConfig
  "Gitea Configuration": "Gitea配置",
  "URL": "地址",
  "API Token": "API令牌",
  "Repository Owner": "仓库所有者",
  "Save": "保存",
  "Saved": "已保存",

  // MemberManager
  "Member Management": "成员管理",
  "Tenant": "租户",
  "No members": "暂无成员",
  "Member added": "成员已添加",
  "User ID": "用户ID",
  "Role": "角色",
  "Remove": "移除",
  "Add": "添加",
  "View all": "查看全部",
  "CLI": "命令行",
  "Audit Log": "审计日志",
};

let currentLang: "en" | "zh" = (typeof localStorage !== "undefined" ? (localStorage.getItem("anfsf_lang") as "en" | "zh" || "zh") : "zh");

export function setLang(lang: "en" | "zh") {
    currentLang = lang;
    if (typeof localStorage !== "undefined") localStorage.setItem("anfsf_lang", lang);
}

export function getLang(): "en" | "zh" {
  return currentLang;
}

export function t(en: string): string {
  if (currentLang === "en") return en;
  const zh = translations[en];
  return zh ? `${en} / ${zh}` : en;
}
