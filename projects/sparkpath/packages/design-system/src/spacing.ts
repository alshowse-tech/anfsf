/**
 * SparkPath Design System - Spacing
 * 
 * Apple 风格间距系统
 * 基于 4px 网格，支持阶段适配
 */

import type { Stage } from './colors';

/**
 * 基础间距单位 (4px 网格)
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

/**
 * 阶段适配间距配置
 */
export const stageSpacing: Record<Stage, {
  scaleRatio: number;
  minTouchTarget: number;
  componentPadding: number;
  sectionGap: number;
}> = {
  // 小学：大间距，易于点击
  elementary: {
    scaleRatio: 1.25,
    minTouchTarget: 56,  // 最小点击区域
    componentPadding: 20,
    sectionGap: 32,
  },
  
  // 初中：标准间距
  middle: {
    scaleRatio: 1.0,
    minTouchTarget: 44,
    componentPadding: 16,
    sectionGap: 24,
  },
  
  // 高中：紧凑间距，信息密度高
  high: {
    scaleRatio: 0.9,
    minTouchTarget: 40,
    componentPadding: 12,
    sectionGap: 20,
  },
};

/**
 * 常用间距组合
 */
export const spacingPresets = {
  // 页面边距
  pageMargin: {
    elementary: 24,
    middle: 20,
    high: 16,
  },
  
  // 卡片内边距
  cardPadding: {
    elementary: 20,
    middle: 16,
    high: 12,
  },
  
  // 按钮内边距
  buttonPadding: {
    horizontal: {
      elementary: 24,
      middle: 20,
      high: 16,
    },
    vertical: {
      elementary: 16,
      middle: 12,
      high: 10,
    },
  },
  
  // 输入框内边距
  inputPadding: {
    horizontal: {
      elementary: 16,
      middle: 14,
      high: 12,
    },
    vertical: {
      elementary: 14,
      middle: 12,
      high: 10,
    },
  },
  
  // 图标间距
  iconGap: {
    elementary: 12,
    middle: 8,
    high: 6,
  },
  
  // 列表项间距
  listItemGap: {
    elementary: 16,
    middle: 12,
    high: 8,
  },
};

/**
 * 获取阶段适配间距
 */
export function getStageSpacing(stage: Stage, key: keyof typeof spacing): number {
  const baseSpacing = spacing[key];
  const stageConfig = stageSpacing[stage];
  return Math.round(baseSpacing * stageConfig.scaleRatio);
}

/**
 * 获取最小点击目标尺寸
 */
export function getMinTouchTarget(stage: Stage): number {
  return stageSpacing[stage].minTouchTarget;
}

/**
 * 获取组件内边距
 */
export function getComponentPadding(stage: Stage): number {
  return stageSpacing[stage].componentPadding;
}

/**
 * 获取区域间距
 */
export function getSectionGap(stage: Stage): number {
  return stageSpacing[stage].sectionGap;
}

/**
 * 获取页面边距
 */
export function getPageMargin(stage: Stage): number {
  return spacingPresets.pageMargin[stage];
}

/**
 * 获取卡片内边距
 */
export function getCardPadding(stage: Stage): number {
  return spacingPresets.cardPadding[stage];
}

export type SpacingKey = keyof typeof spacing;
export type Spacing = typeof spacing;

export default {
  spacing,
  stageSpacing,
  spacingPresets,
  getStageSpacing,
  getMinTouchTarget,
  getComponentPadding,
  getSectionGap,
  getPageMargin,
  getCardPadding,
};
