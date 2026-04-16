/**
 * SparkPath Design System - Badge Component
 * 
 * Apple 风格徽章组件，用于成就系统
 * 支持三阶段样式适配
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

import { getStageColors, type Stage } from '../../colors';
import { getStageTextStyle } from '../../typography';
import { getStageSpacing } from '../../spacing';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  /** 徽章图标 */
  icon: string;
  
  /** 徽章标题 */
  title: string;
  
  /** 徽章描述 (可选) */
  description?: string;
  
  /** 阶段适配 */
  stage?: Stage;
  
  /** 徽章等级 */
  tier?: BadgeTier;
  
  /** 徽章尺寸 */
  size?: BadgeSize;
  
  /** 已解锁状态 */
  unlocked?: boolean;
  
  /** 自定义样式 */
  style?: ViewStyle;
}

/**
 * Badge 组件
 * 
 * 三阶段设计特征:
 * - 小学：大图标 · 鲜艳色彩 · 活泼阴影
 * - 初中：中图标 · 标准色彩 · 轻微阴影
 * - 高中：小图标 · 专业质感 · 扁平化
 */
export const Badge: React.FC<BadgeProps> = ({
  icon,
  title,
  description,
  stage = 'middle',
  tier = 'bronze',
  size = 'medium',
  unlocked = true,
  style,
}) => {
  const stageColors = getStageColors(stage);
  const borderRadius = { elementary: 20, middle: 12, high: 8 }[stage];
  const spacing = getStageSpacing(stage, 4);
  
  // 获取徽章颜色
  const tierColors = getTierColors(stageColors, tier, unlocked);
  
  // 获取文字样式
  const titleStyle = getStageTextStyle(stage, size === 'large' ? 'heading4' : 'label');
  const descriptionStyle = getStageTextStyle(stage, 'bodySmall');
  
  // 计算图标大小
  const iconSize = getIconSize(size, stage);
  
  // 计算容器样式
  const containerStyle: ViewStyle = {
    ...getBaseContainerStyle(stage, size),
    backgroundColor: tierColors.background,
    borderColor: tierColors.border,
    borderWidth: unlocked ? 2 : 1,
    borderRadius,
    padding: spacing,
    opacity: unlocked ? 1 : 0.5,
  };
  
  return (
    <View style={[containerStyle, style]}>
      {/* 图标区域 */}
      <View
        style={[
          styles.iconContainer,
          {
            width: iconSize,
            height: iconSize,
            backgroundColor: tierColors.iconBackground,
            borderRadius: iconSize / 2,
          },
        ]}
      >
        <Text style={[styles.icon, { fontSize: iconSize * 0.6 }]}>
          {icon}
        </Text>
      </View>
      
      {/* 文字区域 */}
      <View style={styles.textContainer}>
        <Text style={[titleStyle, styles.title, { color: tierColors.text }]}>
          {title}
        </Text>
        {description && (
          <Text
            style={[
              descriptionStyle,
              styles.description,
              { color: stageColors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {description}
          </Text>
        )}
      </View>
      
      {/* 未解锁标记 */}
      {!unlocked && (
        <View style={styles.lockedOverlay}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// 样式辅助函数
// ============================================================================

function getTierColors(
  stageColors: ReturnType<typeof getStageColors>,
  tier: BadgeTier,
  unlocked: boolean
) {
  const tierColorMap = {
    bronze: {
      primary: '#CD7F32',
      light: '#E8A87C',
      dark: '#8B4513',
    },
    silver: {
      primary: '#C0C0C0',
      light: '#E8E8E8',
      dark: '#808080',
    },
    gold: {
      primary: '#FFD700',
      light: '#FFF4B8',
      dark: '#B8860B',
    },
    diamond: {
      primary: '#B9F2FF',
      light: '#E0F8FF',
      dark: '#5FB8D6',
    },
  };
  
  const tierColors = tierColorMap[tier];
  
  if (!unlocked) {
    return {
      background: stageColors.background,
      border: stageColors.border,
      iconBackground: stageColors.border,
      text: stageColors.textLight,
    };
  }
  
  return {
    background: stageColors.surface,
    border: tierColors.primary,
    iconBackground: tierColors.light,
    text: stageColors.text,
  };
}

function getBaseContainerStyle(stage: Stage, size: BadgeSize) {
  const spacing = getStageSpacing(stage, 4);
  
  const sizeConfig = {
    small: {
      minWidth: 120,
      flexDirection: 'row' as const,
    },
    medium: {
      minWidth: 160,
      flexDirection: 'row' as const,
    },
    large: {
      minWidth: 200,
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
    },
  };
  
  const shadowConfig = {
    elementary: {
      shadowColor: '#FF6B6B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
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
    ...sizeConfig[size],
    ...shadowConfig[stage],
  };
}

function getIconSize(size: BadgeSize, stage: Stage): number {
  const baseSize = {
    small: 40,
    medium: 56,
    large: 80,
  }[size];
  
  const stageMultiplier = {
    elementary: 1.15,
    middle: 1.0,
    high: 0.9,
  }[stage];
  
  return Math.round(baseSize * stageMultiplier);
}

// ============================================================================
// 样式表
// ============================================================================

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  description: {
    opacity: 0.8,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  lockIcon: {
    fontSize: 32,
  },
});

export default Badge;
