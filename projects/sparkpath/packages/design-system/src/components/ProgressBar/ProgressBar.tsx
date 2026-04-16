/**
 * SparkPath Design System - ProgressBar Component
 * 
 * Apple 风格进度条组件，支持三阶段样式适配
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';

import { getStageColors, type Stage } from '../../colors';
import { getStageTextStyle } from '../../typography';
import { getStageSpacing } from '../../spacing';

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error';
export type ProgressBarSize = 'small' | 'medium' | 'large';
export type ProgressBarShape = 'rounded' | 'square';

export interface ProgressBarProps {
  /** 进度值 (0-100) */
  progress: number;
  
  /** 阶段适配 */
  stage?: Stage;
  
  /** 进度条变体 */
  variant?: ProgressBarVariant;
  
  /** 进度条尺寸 */
  size?: ProgressBarSize;
  
  /** 进度条形状 */
  shape?: ProgressBarShape;
  
  /** 显示百分比文字 */
  showLabel?: boolean;
  
  /** 显示条纹动画 */
  animated?: boolean;
  
  /** 自定义样式 */
  style?: ViewStyle;
  
  /** 最小值 (默认 0) */
  min?: number;
  
  /** 最大值 (默认 100) */
  max?: number;
}

/**
 * ProgressBar 组件
 * 
 * 三阶段设计特征:
 * - 小学：粗进度条 · 彩色 · 圆角
 * - 初中：中等进度条 · 标准色 · 圆角
 * - 高中：细进度条 · 深色 · 小圆角
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  stage = 'middle',
  variant = 'default',
  size = 'medium',
  shape = 'rounded',
  showLabel = true,
  animated = false,
  style,
  min = 0,
  max = 100,
}) => {
  const stageColors = getStageColors(stage);
  const borderRadius = getBorderRadius(stage, shape);
  const height = getHeight(size, stage);
  
  // 计算实际进度百分比
  const normalizedProgress = Math.min(
    max,
    Math.max(min, progress)
  );
  const percentage = ((normalizedProgress - min) / (max - min)) * 100;
  
  // 获取进度条颜色
  const fillColor = getFillColor(stageColors, variant);
  const backgroundColor = stageColors.border;
  
  // 获取文字样式
  const labelStyle = getStageTextStyle(stage, 'labelSmall');
  
  return (
    <View style={[styles.container, style]}>
      {/* 进度条轨道 */}
      <View
        style={[
          styles.track,
          {
            backgroundColor,
            height,
            borderRadius,
          },
        ]}
      >
        {/* 进度条填充 */}
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: fillColor,
              height,
              borderRadius: shape === 'rounded' ? borderRadius : 0,
              borderTopRightRadius: shape === 'rounded' && percentage < 100 ? 0 : borderRadius,
              borderBottomRightRadius: shape === 'rounded' && percentage < 100 ? 0 : borderRadius,
            },
            animated && styles.animatedFill,
          ]}
        />
      </View>
      
      {/* 百分比文字 */}
      {showLabel && (
        <Text style={[labelStyle, styles.label, { color: stageColors.textSecondary }]}>
          {percentage.toFixed(0)}%
        </Text>
      )}
    </View>
  );
};

// ============================================================================
// 样式辅助函数
// ============================================================================

function getBorderRadius(stage: Stage, shape: ProgressBarShape): number {
  if (shape === 'square') {
    return 0;
  }
  
  return {
    elementary: 8,
    middle: 6,
    high: 4,
  }[stage];
}

function getHeight(size: ProgressBarSize, stage: Stage): number {
  const baseHeight = {
    small: 4,
    medium: 8,
    large: 12,
  }[size];
  
  const stageMultiplier = {
    elementary: 1.25,
    middle: 1.0,
    high: 0.9,
  }[stage];
  
  return Math.round(baseHeight * stageMultiplier);
}

function getFillColor(
  stageColors: ReturnType<typeof getStageColors>,
  variant: ProgressBarVariant
): string {
  switch (variant) {
    case 'success':
      return stageColors.success;
    case 'warning':
      return stageColors.warning;
    case 'error':
      return stageColors.error;
    default:
      return stageColors.primary;
  }
}

// ============================================================================
// 样式表
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    transitionProperty: 'width',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    transitionDuration: '300ms',
  },
  animatedFill: {
    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
    backgroundSize: '40px 40px',
  },
  label: {
    marginLeft: 12,
    minWidth: 40,
    textAlign: 'right',
  },
});

export default ProgressBar;
