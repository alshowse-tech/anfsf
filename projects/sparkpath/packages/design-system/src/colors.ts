/**
 * SparkPath Design System - Colors
 * 
 * Apple 风格色彩系统，支持三阶段适配
 * 小学 (9-12 岁) / 初中 (13-15 岁) / 高中 (16-18 岁)
 */

export type Stage = 'elementary' | 'middle' | 'high';

/**
 * 小学阶段色彩 (9-12 岁)
 * 明亮、活泼、友好、游戏化
 */
export const elementary = {
  primary: '#FF6B6B',      // 珊瑚红 - 热情活泼
  primaryLight: '#FF8787',
  primaryDark: '#FA5252',
  
  secondary: '#4ECDC4',    // 青绿 - 清新自然
  secondaryLight: '#63D9D1',
  secondaryDark: '#36B9B0',
  
  accent: '#FFE66D',       // 明黄 - 快乐阳光
  accentLight: '#FFEB8A',
  accentDark: '#FFDE44',
  
  background: '#FFF9F0',   // 暖白 - 温馨舒适
  surface: '#FFFFFF',      // 纯白 - 干净整洁
  surfaceElevated: '#FFFFFF',
  
  text: '#2D3436',         // 深灰 - 清晰可读
  textSecondary: '#636E72',
  textLight: '#B2BEC3',
  
  border: '#FFE0E0',
  borderFocus: '#FF6B6B',
  
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#FDCB6E',
  warningLight: '#FFEAA7',
  error: '#FF7675',
  errorLight: '#FFA07A',
  info: '#74B9FF',
  infoLight: '#A8D8FF',
  
  shadow: 'rgba(255, 107, 107, 0.2)',
  shadowColor: '#FF6B6B',
};

/**
 * 初中阶段色彩 (13-15 岁)
 * 简洁、现代、清爽、对话式
 */
export const middle = {
  primary: '#0984E3',      // 湛蓝 - 理性专业
  primaryLight: '#74B9FF',
  primaryDark: '#0769B5',
  
  secondary: '#00CEC9',    // 青蓝 - 清新活力
  secondaryLight: '#67FDF9',
  secondaryDark: '#00A5A0',
  
  accent: '#FD79A8',       // 粉红 - 青春活力
  accentLight: '#FFA8C5',
  accentDark: '#E85A8A',
  
  background: '#F8F9FA',   // 浅灰 - 中性干净
  surface: '#FFFFFF',      // 纯白
  surfaceElevated: '#FFFFFF',
  
  text: '#2D3436',         // 深灰
  textSecondary: '#636E72',
  textLight: '#B2BEC3',
  
  border: '#E0E0E0',
  borderFocus: '#0984E3',
  
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#FDCB6E',
  warningLight: '#FFEAA7',
  error: '#FF7675',
  errorLight: '#FFA07A',
  info: '#0984E3',
  infoLight: '#74B9FF',
  
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowColor: '#000000',
};

/**
 * 高中阶段色彩 (16-18 岁)
 * 深色、专业、高效、目标导向
 */
export const high = {
  primary: '#6C5CE7',      // 深紫 - 专业高效
  primaryLight: '#A29BFE',
  primaryDark: '#5B4CC4',
  
  secondary: '#A29BFE',    // 淡紫 - 优雅深度
  secondaryLight: '#C8C2FF',
  secondaryDark: '#8A81E8',
  
  accent: '#00CEC9',       // 青蓝 - 重点突出
  accentLight: '#67FDF9',
  accentDark: '#00A5A0',
  
  background: '#1A1A2E',   // 深蓝黑 - 沉浸专注
  surface: '#16213E',      // 深蓝灰
  surfaceElevated: '#1F2B4A',
  
  text: '#FFFFFF',         // 纯白
  textSecondary: '#A0A0A0',
  textLight: '#6C6C6C',
  
  border: '#2D2D44',
  borderFocus: '#6C5CE7',
  
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#FDCB6E',
  warningLight: '#FFEAA7',
  error: '#FF7675',
  errorLight: '#FFA07A',
  info: '#A29BFE',
  infoLight: '#C8C2FF',
  
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowColor: '#000000',
};

/**
 * 色彩映射表
 */
export const colors: Record<Stage, typeof elementary> = {
  elementary,
  middle,
  high,
};

/**
 * 获取阶段色彩
 */
export function getStageColors(stage: Stage): typeof elementary {
  return colors[stage];
}

/**
 * 通用色彩 (跨阶段共享)
 */
export const commonColors = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  skeleton: '#E0E0E0',
  skeletonDark: '#F0F0F0',
};

export type ColorKey = keyof typeof elementary;
export type Colors = typeof elementary;

export default colors;
