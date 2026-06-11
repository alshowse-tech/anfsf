# 固定资产投资计划管理系统 - 开发任务清单

## 项目概述

本项目是德兴铜矿固定资产投资计划管理系统，覆盖从项目立项、工程设计确认、子项分解、施工管理、设备跟踪、资金拨付、竣工结算到项目核销的全生命周期管理。

## 技术栈

- 前端：React 18 + TypeScript + TailwindCSS
- 后端：Node.js + Express + TypeScript
- 数据库：PostgreSQL（兼容国产数据库达梦/人大金仓）
- 缓存：Redis

## 待实现功能模块

### 一期功能（Must Have - 40项）

#### 模块A：项目立项与台账管理（3项）
- [ ] REQ-PROJ-001：批复数据同步（API + Excel导入）
- [ ] REQ-PROJ-002：项目台账管理（CRUD）
- [ ] REQ-PROJ-003：项目筛选查询

#### 模块B：工程设计确认、子项分解与发包管理（12项）
- [ ] REQ-DES-001：工程设计委托
- [ ] REQ-DES-002：设计/勘测合同管理
- [ ] REQ-DES-003：工程图纸出具与上传
- [ ] REQ-DES-004：设计成果评审
- [ ] REQ-DES-005：子项预算编制
- [ ] REQ-DES-006：预算申报总公司批复
- [ ] REQ-SUB-001：子项分解
- [ ] REQ-SUB-002：建安子项发包
- [ ] REQ-SUB-003：合同预立卷
- [ ] REQ-SUB-004：设备子项对接
- [ ] REQ-SUB-005：设备子项自动创建
- [ ] REQ-SUB-006：子项启动

#### 模块C：建安子项施工管理（3项）
- [ ] REQ-CONS-001：施工进度报量
- [ ] REQ-CONS-001A：现场照片验证
- [ ] REQ-CONS-002：变更与签证管理

#### 模块D：设备子项到货跟踪（3项）
- [ ] REQ-EQ-001：合同信息同步
- [ ] REQ-EQ-002：到货登记
- [ ] REQ-EQ-003：签收确认

#### 模块E：资金拨付管理（6项）
- [ ] REQ-PAY-002：工程部月度资金计划提交
- [ ] REQ-PAY-003：设备部月度资金计划提交
- [ ] REQ-PAY-004：计划部汇总遴选
- [ ] REQ-PAY-005：资金计划多级审批
- [ ] REQ-PAY-006：发票确认
- [ ] REQ-PAY-007：付款完成标记

#### 模块F：竣工结算与审计（9项）
- [ ] REQ-CLOSE-001：子项竣工验收
- [ ] REQ-CLOSE-002：结算启动
- [ ] REQ-CLOSE-003：在线编报与送审
- [ ] REQ-CLOSE-004：多级审核
- [ ] REQ-CLOSE-005：≤50万矿内审计
- [ ] REQ-CLOSE-006：＞50万总公司审计结论获取
- [ ] REQ-CLOSE-007：争议处理
- [ ] REQ-CLOSE-008：结算定案
- [ ] REQ-CLOSE-009：项目核销
- [ ] REQ-CLOSE-010：年度结转

#### 模块H：全流程可视化追踪（4项）
- [ ] REQ-TRACE-001：项目全流程视图
- [ ] REQ-TRACE-002：操作人追踪
- [ ] REQ-TRACE-003：子项进度全景
- [ ] REQ-TRACE-004：资金流追踪

### 二期功能（Should Have - 13项）

#### 模块C补充
- [ ] REQ-CONS-003：甲供材料管理
- [ ] REQ-CONS-004：过程文档管理

#### 模块D补充
- [ ] REQ-EQ-004：设备运行档案

#### 模块E补充
- [ ] REQ-PAY-001：乙方付款申请（辅助）
- [ ] REQ-PAY-008：资金计划与实际对比

#### 模块G：投资报表与监控（7项）
- [ ] REQ-RPT-001：投资总计划编制
- [ ] REQ-RPT-002：全景监控仪表盘
- [ ] REQ-RPT-003：智能预警
- [ ] REQ-RPT-004：领导视图
- [ ] REQ-RPT-005：年度计划报表
- [ ] REQ-RPT-006：月报/年表
- [ ] REQ-RPT-007：项目核销表

#### 模块H补充
- [ ] REQ-TRACE-005：文件归档追踪

## 待确认事项

- [ ] OP-001：总公司固投系统接口规范
- [ ] OP-002：外部设备采购平台对接规范
- [ ] OP-003：50万审计分界线确认
- [ ] OP-004：计划部遴选审批层级
- [ ] OP-005：信创环境选型确认
- [ ] OP-006：移动端集成方式
- [ ] OP-007：历史数据格式
- [ ] OP-008：设计单位系统使用方式
- [ ] OP-009：现场照片存储要求
- [ ] OP-010：年度结转时间节点

## 数据库表结构

共12张核心表（183字段）：
1. t_project_register（16字段）
2. t_sub_project（16字段）
3. t_design_confirmation（22字段）
4. t_contract（11字段）
5. t_progress_report（17字段）
6. t_progress_photo（7字段）
7. t_change_variation（10字段）
8. t_equipment_arrival（15字段）
9. t_payment_application（16字段）
10. t_payment_plan（14字段）
11. t_invoice_payment（15字段）
12. t_settlement（18字段）
13. t_dispute（10字段）
14. t_year_rollover（8字段）
15. t_project_cancel（8字段）

## 开发规范

1. 所有业务逻辑实现处标注 TODO 注释
2. 遵循 RESTful API 设计规范
3. 组件采用函数式编程 + Hooks
4. 状态管理使用 React Context + useReducer
5. 所有接口返回统一格式：{ code, message, data }