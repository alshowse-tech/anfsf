/**
 * SparkPath Design System - Card Component
 * 
 * Apple 风格卡片组件，支持三阶段样式适配
 * 用于学习卡片、成就卡片、统计卡片等
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';

import { getStageColors, type Stage } from '../../colors';
import { getStageTextStyle, type TextStyleKey } from '../../typography';
import { getStageSpacing, getCardPadding } from '../../spacing';

export type CardVariant = 'learning' | 'achievement' | 'stats' | 'default';
export type CardSize = 'small' | 'medium' | 'large';

export interface CardProps {
  /** 卡片标题 */
  title: string;
  
  /** 副标题 (可选) */
  subtitle?: string;
  
  /** 卡片内容 (可选) */
  children?: React.ReactNode;
  
  /** 阶段适配 */
  stage?: Stage;
  
  /** 卡片变体 */
  variant?: CardVariant;
  
  /** 卡片尺寸 */
  size?: CardSize;
  
  /** 点击事件 (可选，有则变为可点击) */
  onPress?: () => void;
  
  /** 进度值 (0-100，用于学习卡片) */
  progress?: number;
  
  /** 图标 (可选) */
  icon?: React.ReactNode;
  
  /** 自定义样式 */
  style?: ViewStyle;
  
  /** 禁用状态 */
  disabled?: boolean;
}

/**
 * Card 组件
 * 
 * 三阶段设计特征:
 * - 小学：彩色边框 · 活泼阴影 · 大圆角
 * - 初中：简洁边框 · 轻微阴影 · 中圆角
 * - 高中：深色边框 · 扁平化 · 小圆角
 */
export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  stage = 'middle',
  variant = 'default',
  size = 'medium',
  onPress,
  progress,
  icon,
  style,
  disabled = false,
}) => {
  const stageColors = getStageColors(stage);
  const cardPadding = getCardPadding(stage);
  const borderRadius = { elementary: 20, middle: 12, high: 8 }[stage];
  
  // 获取卡片基础样式
  const baseStyle = getCardBaseStyle(stage, variant, size);
  
  // 获取文字样式
  const titleStyle = getStageTextStyle(stage, 'heading4');
  const subtitleStyle = getStageTextStyle(stage, 'bodySmall');
  
  // 计算实际样式
  const cardStyle: ViewStyle = {
    ...baseStyle.container,
    backgroundColor: stageColors.surface,
    borderColor: getCardBorderColor(stageColors, variant),
    borderWidth: variant === 'default' ? 0 : 1,
    borderRadius,
    padding: cardPadding,
    opacity: disabled ? 0.6 : 1,
  };
  
  const CardContainer = onPress ? TouchableOpacity : View;
  
  return (
    <CardContainer
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.9}
      style={[cardStyle, style]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
    >
      {/* 头部区域 */}
      <View style={styles.header}>
        {icon && (
          <View style={styles.iconContainer}>
            {icon}
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[titleStyle, styles.title]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[subtitleStyle, styles.subtitle]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {/* 内容区域 */}
      {children && (
        <View style={styles.content}>
          {children}
        </View>
      )}
      
      {/* 进度条 (学习卡片专用) */}
      {progress !== undefined && variant === 'learning' && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: stageColors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor: stageColors.primary,
                },
              ]}
            />
          </View>
          <Text style={[subtitleStyle, styles.progressText]}>
            {progress}%
          </Text>
        </View>
      )}
    </CardContainer>
  );
};

// ============================================================================
// 样式辅助函数
// ============================================================================

function getCardBaseStyle(
  stage: Stage,
  variant: CardVariant,
  size: CardSize
) {
  const spacing = getStageSpacing(stage, 4);
  const borderRadius = { elementary: 20, middle: 12, high: 8 }[stage];
  
  const sizeConfig = {
    small: {
      minHeight: 120,
    },
    medium: {
      minHeight: 160,
    },
    large: {
      minHeight: 200,
    },
  };
  
  const shadowConfig = {
    elementary: {
      shadowColor: '#FF6B6B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    middle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    high: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  };
  
  return {
    container: {
      minHeight: sizeConfig[size].minHeight,
      borderRadius,
      ...shadowConfig[stage],
    },
  };
}

function getCardBorderColor(
  stageColors: ReturnType<typeof getStageColors>,
  variant: CardVariant
): string {
  switch (variant) {
    case 'learning':
      return stageColors.primary;
    case 'achievement':
      return stageColors.accent;
    case 'stats':
      return stageColors.secondary;
    default:
      return 'transparent';
  }
}

// ============================================================================
// 样式表
// ============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    minWidth: 40,
    textAlign: 'right',
  },
});

export default Card;
