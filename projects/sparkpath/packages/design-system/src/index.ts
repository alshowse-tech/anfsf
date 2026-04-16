/**
 * SparkPath Design System
 * 
 * Apple 风格设计系统
 * 简洁 · 优雅 · 无 AI 味
 * 
 * 支持三阶段适配:
 * - 小学 (9-12 岁): 明亮卡通 · 游戏化
 * - 初中 (13-15 岁): 简洁现代 · 对话式
 * - 高中 (16-18 岁): 深色专业 · 目标导向
 */

// ============================================================================
// 基础配置
// ============================================================================

export {
  colors,
  elementary,
  middle,
  high,
  commonColors,
  getStageColors,
  type Stage,
  type ColorKey,
  type Colors,
} from './colors';

export {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  paragraphSpacings,
  stageTypography,
  textStyles,
  getStageTextStyle,
  createFontStyle,
  type TextStyle,
  type TextStyleKey,
} from './typography';

export {
  spacing,
  stageSpacing,
  spacingPresets,
  getStageSpacing,
  getMinTouchTarget,
  getComponentPadding,
  getSectionGap,
  getPageMargin,
  getCardPadding,
  type SpacingKey,
  type Spacing,
} from './spacing';

export {
  durations,
  easings,
  stageAnimations,
  pageTransitions,
  buttonAnimations,
  cardAnimations,
  progressAnimations,
  skeletonAnimations,
  getStageAnimation,
  createAnimationStyle,
  type AnimationDuration,
  type AnimationEasing,
  type PageTransition,
} from './animations';

// ============================================================================
// 组件
// ============================================================================

export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './components/Button/Button';

// ============================================================================
// Hooks (待实现)
// ============================================================================

// export { useStageStyle } from './hooks/useStageStyle';
// export { useAnimation } from './hooks/useAnimation';

// ============================================================================
// 工具函数
// ============================================================================

// export { stageConfig } from './utils/stageConfig';
// export { themeBuilder } from './utils/themeBuilder';

// ============================================================================
// 默认导出
// ============================================================================

export default {
  // 基础配置
  colors: {
    elementary,
    middle,
    high,
    common: commonColors,
  },
  typography: {
    fontFamilies,
    fontSizes,
    fontWeights,
    lineHeights,
    textStyles,
    getStageTextStyle,
  },
  spacing: {
    spacing,
    stageSpacing,
    spacingPresets,
    getStageSpacing,
  },
  animations: {
    durations,
    easings,
    pageTransitions,
    getStageAnimation,
  },
  
  // 组件
  Button,
  
  // 辅助函数
  getStageColors,
  createFontStyle,
  getMinTouchTarget,
};
