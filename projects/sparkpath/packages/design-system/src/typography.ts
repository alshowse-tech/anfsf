/**
 * SparkPath Design System - Typography
 * 
 * Apple 风格字体系统
 * 英文：SF Pro Display
 * 中文：苹方 (PingFang SC)
 */

import type { Stage } from './colors';

/**
 * 字体家族
 */
export const fontFamilies = {
  // 英文字体 (Apple 系统字体)
  en: 'SF Pro Display',
  
  // 中文字体 (Apple 系统字体)
  zh: 'PingFang SC',
  
  // 备用字体
  fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  
  // 代码字体
  mono: 'SF Mono, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

/**
 * 字体大小 (基于 Apple 设计指南)
 */
export const fontSizes = {
  // 小字号 (辅助文字)
  xs: 11,
  sm: 13,
  
  // 正文字号
  base: 15,
  md: 17,    // 默认正文
  
  // 标题字号
  lg: 20,    // 小标题
  xl: 22,    // 中标题
  '2xl': 28, // 大标题
  '3xl': 34, // 超大标题
  
  // 展示字号
  '4xl': 48,
  '5xl': 64,
};

/**
 * 字重
 */
export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  heavy: 800,
};

/**
 * 行高
 */
export const lineHeights = {
  tight: 1.2,
  base: 1.4,
  relaxed: 1.6,
  loose: 1.8,
};

/**
 * 字间距
 */
export const letterSpacings = {
  tighter: -0.5,
  tight: -0.25,
  base: 0,
  wide: 0.25,
  wider: 0.5,
};

/**
 * 段落间距
 */
export const paragraphSpacings = {
  xs: 4,
  sm: 8,
  base: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

/**
 * 阶段适配字体配置
 */
export const stageTypography: Record<Stage, {
  baseSize: number;
  scaleRatio: number;
  lineHeight: number;
}> = {
  // 小学：大字体，高可读性
  elementary: {
    baseSize: 18,
    scaleRatio: 1.25,
    lineHeight: 1.6,
  },
  
  // 初中：标准字体
  middle: {
    baseSize: 17,
    scaleRatio: 1.2,
    lineHeight: 1.5,
  },
  
  // 高中：紧凑字体，信息密度高
  high: {
    baseSize: 16,
    scaleRatio: 1.15,
    lineHeight: 1.4,
  },
};

/**
 * 文本样式预设
 */
export const textStyles = {
  // 正文
  body: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.base,
    letterSpacing: letterSpacings.base,
  },
  
  bodySmall: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.base,
    letterSpacing: letterSpacings.base,
  },
  
  // 标题
  heading1: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  
  heading2: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.base,
  },
  
  heading3: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.base,
    letterSpacing: letterSpacings.base,
  },
  
  heading4: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.base,
    letterSpacing: letterSpacings.base,
  },
  
  // 按钮文字
  button: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.wide,
  },
  
  buttonSmall: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.wide,
  },
  
  // 标签
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.base,
    letterSpacing: letterSpacings.wide,
  },
  
  labelSmall: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.base,
    letterSpacing: letterSpacings.wider,
  },
  
  // 代码
  code: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.base,
    fontFamily: fontFamilies.mono,
  },
};

/**
 * 获取阶段适配文本样式
 */
export function getStageTextStyle(stage: Stage, style: keyof typeof textStyles) {
  const baseStyle = textStyles[style];
  const stageConfig = stageTypography[stage];
  
  return {
    ...baseStyle,
    fontSize: Math.round(baseStyle.fontSize * (stageConfig.baseSize / 17)),
    lineHeight: stageConfig.lineHeight,
    fontFamily: `${fontFamilies.zh}, ${fontFamilies.en}, ${fontFamilies.fallback}`,
  };
}

/**
 * 生成完整字体样式
 */
export function createFontStyle(
  stage: Stage,
  options: {
    size?: number;
    weight?: keyof typeof fontWeights;
    lineHeight?: number;
    letterSpacing?: number;
  } = {}
) {
  const stageConfig = stageTypography[stage];
  
  return {
    fontSize: options.size ?? stageConfig.baseSize,
    fontWeight: fontWeights[options.weight ?? 'regular'],
    lineHeight: options.lineHeight ?? stageConfig.lineHeight,
    letterSpacing: options.letterSpacing ?? 0,
    fontFamily: `${fontFamilies.zh}, ${fontFamilies.en}, ${fontFamilies.fallback}`,
  };
}

export type TextStyle = typeof textStyles[keyof typeof textStyles];
export type TextStyleKey = keyof typeof textStyles;

export default {
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
};
