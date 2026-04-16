/**
 * SparkPath Design System - Button Component
 * 
 * Apple 风格按钮组件，支持三阶段样式适配
 * 小学 (9-12 岁) / 初中 (13-15 岁) / 高中 (16-18 岁)
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';

import { colors, getStageColors, type Stage } from '../../colors';
import { getStageTextStyle, type TextStyleKey } from '../../typography';
import { getStageSpacing, getMinTouchTarget } from '../../spacing';
import { getStageAnimation, easings } from '../../animations';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  /** 按钮文字 */
  title: string;
  
  /** 点击事件 */
  onPress: () => void;
  
  /** 按钮样式变体 */
  variant?: ButtonVariant;
  
  /** 按钮尺寸 */
  size?: ButtonSize;
  
  /** 阶段适配 (自动根据用户年龄选择) */
  stage?: Stage;
  
  /** 禁用状态 */
  disabled?: boolean;
  
  /** 加载状态 */
  loading?: boolean;
  
  /** 图标 (可选) */
  icon?: React.ReactNode;
  
  /** 自定义样式 */
  style?: ViewStyle;
  
  /** 自定义文字样式 */
  textStyle?: TextStyle;
  
  /** 辅助功能标签 */
  accessibilityLabel?: string;
}

/**
 * Button 组件
 * 
 * 三阶段设计特征:
 * - 小学：大圆角 (20px) · 彩色阴影 · 弹性按压动画
 * - 初中：中圆角 (12px) · 轻微阴影 · 淡入淡出反馈
 * - 高中：小圆角 (8px) · 扁平化 · 颜色变化反馈
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  stage = 'middle',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const stageColors = getStageColors(stage);
  const spacing = getStageSpacing(stage, 4);
  const minTouchTarget = getMinTouchTarget(stage);
  
  // 获取按钮基础样式
  const baseStyle = getButtonBaseStyle(stage, variant, size);
  
  // 获取文字样式
  const textBaseStyle = getTextStyle(stage, size);
  
  // 按压动画
  const pressAnimation = getStageAnimation(stage, 'fade');
  
  // 计算实际样式
  const buttonStyle: ViewStyle = {
    ...baseStyle.container,
    backgroundColor: getButtonBackgroundColor(stageColors, variant, disabled),
    borderColor: variant === 'outline' ? stageColors.primary : 'transparent',
    borderWidth: variant === 'outline' ? 2 : 0,
    minHeight: minTouchTarget,
    opacity: disabled ? 0.5 : 1,
  };
  
  const buttonTextStyle: TextStyle = {
    ...textBaseStyle,
    color: getButtonTextColor(stageColors, variant, disabled),
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={getActiveOpacity(stage)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled, busy: loading }}
      style={[buttonStyle, style]}
    >
      {loading ? (
        <ActivityIndicator
          color={buttonTextStyle.color}
          size="small"
        />
      ) : (
        <>
          {icon && (
            <Text style={[buttonTextStyle, styles.icon]}>
              {icon}
            </Text>
          )}
          <Text style={[buttonTextStyle, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// 样式辅助函数
// ============================================================================

function getButtonBaseStyle(
  stage: Stage,
  variant: ButtonVariant,
  size: ButtonSize
) {
  const spacing = getStageSpacing(stage, 4);
  const cardPadding = { elementary: 20, middle: 16, high: 12 }[stage];
  const borderRadius = { elementary: 20, middle: 12, high: 8 }[stage];
  
  const sizeConfig = {
    small: {
      horizontalPadding: cardPadding * 0.75,
      verticalPadding: cardPadding * 0.5,
    },
    medium: {
      horizontalPadding: cardPadding,
      verticalPadding: cardPadding * 0.75,
    },
    large: {
      horizontalPadding: cardPadding * 1.25,
      verticalPadding: cardPadding,
    },
  };
  
  const { horizontalPadding, verticalPadding } = sizeConfig[size];
  
  return {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: horizontalPadding,
      paddingVertical: verticalPadding,
      borderRadius,
      shadowColor: stage === 'elementary' ? colors.elementary.shadowColor : '#000000',
      shadowOffset: { width: 0, height: stage === 'elementary' ? 4 : 2 },
      shadowOpacity: stage === 'elementary' ? 0.3 : 0.08,
      shadowRadius: stage === 'elementary' ? 12 : 4,
      elevation: stage === 'elementary' ? 8 : 2,
    },
  };
}

function getTextStyle(stage: Stage, size: ButtonSize) {
  const textStyleKey: TextStyleKey = size === 'small' ? 'buttonSmall' : 'button';
  return getStageTextStyle(stage, textStyleKey);
}

function getButtonBackgroundColor(
  stageColors: ReturnType<typeof getStageColors>,
  variant: ButtonVariant,
  disabled: boolean
): string {
  if (disabled) {
    return stageColors.textLight;
  }
  
  switch (variant) {
    case 'primary':
      return stageColors.primary;
    case 'secondary':
      return stageColors.secondary;
    case 'outline':
    case 'ghost':
      return 'transparent';
    default:
      return stageColors.primary;
  }
}

function getButtonTextColor(
  stageColors: ReturnType<typeof getStageColors>,
  variant: ButtonVariant,
  disabled: boolean
): string {
  if (disabled) {
    return stageColors.surface;
  }
  
  switch (variant) {
    case 'outline':
    case 'ghost':
      return stageColors.primary;
    default:
      return stageColors.surface;
  }
}

function getActiveOpacity(stage: Stage): number {
  switch (stage) {
    case 'elementary':
      return 0.85;
    case 'middle':
      return 0.9;
    case 'high':
      return 1.0;
    default:
      return 0.9;
  }
}

// ============================================================================
// 样式表
// ============================================================================

const styles = StyleSheet.create({
  icon: {
    marginRight: 8,
  },
});

export default Button;
