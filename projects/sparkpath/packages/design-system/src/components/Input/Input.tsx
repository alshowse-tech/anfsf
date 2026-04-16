/**
 * SparkPath Design System - Input Component
 * 
 * Apple 风格输入框组件，支持语音/文本输入
 * 三阶段样式适配
 */

import React, { useState } from 'react';
import {
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  TouchableOpacity,
} from 'react-native';

import { getStageColors, type Stage } from '../../colors';
import { getStageTextStyle } from '../../typography';
import { getStageSpacing, getInputPadding } from '../../spacing';

export type InputVariant = 'text' | 'search' | 'voice';
export type InputSize = 'small' | 'medium' | 'large';

export interface InputProps {
  /** 输入值 */
  value: string;
  
  /** 输入变化回调 */
  onChangeValue: (value: string) => void;
  
  /** 占位符 */
  placeholder?: string;
  
  /** 阶段适配 */
  stage?: Stage;
  
  /** 输入框变体 */
  variant?: InputVariant;
  
  /** 输入框尺寸 */
  size?: InputSize;
  
  /** 标签文字 (可选) */
  label?: string;
  
  /** 错误信息 (可选) */
  error?: string;
  
  /** 禁用状态 */
  disabled?: boolean;
  
  /** 只读状态 */
  readOnly?: boolean;
  
  /** 多行输入 */
  multiline?: boolean;
  
  /** 最大行数 */
  numberOfLines?: number;
  
  /** 安全文本 (密码模式) */
  secureTextEntry?: boolean;
  
  /** 语音输入回调 (variant=voice 时) */
  onVoiceInput?: () => void;
  
  /** 自定义样式 */
  style?: ViewStyle;
  
  /** 辅助功能标签 */
  accessibilityLabel?: string;
}

/**
 * Input 组件
 * 
 * 三阶段设计特征:
 * - 小学：大圆角 · 彩色边框 · 大字体
 * - 初中：中圆角 · 标准边框 · 标准字体
 * - 高中：小圆角 · 深色边框 · 紧凑字体
 */
export const Input: React.FC<InputProps> = ({
  value,
  onChangeValue,
  placeholder,
  stage = 'middle',
  variant = 'text',
  size = 'medium',
  label,
  error,
  disabled = false,
  readOnly = false,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  onVoiceInput,
  style,
  accessibilityLabel,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const stageColors = getStageColors(stage);
  const borderRadius = { elementary: 16, middle: 12, high: 8 }[stage];
  const inputPadding = getInputPadding(stage, variant);
  
  // 获取文字样式
  const labelStyle = getStageTextStyle(stage, 'label');
  const inputStyle = getStageTextStyle(stage, 'body');
  const errorStyle = getStageTextStyle(stage, 'bodySmall');
  
  // 计算输入框样式
  const inputContainerStyle: ViewStyle = {
    ...getBaseContainerStyle(stage, variant, size),
    backgroundColor: disabled ? stageColors.background : stageColors.surface,
    borderColor: getBorderColor(stageColors, variant, error, isFocused),
    borderWidth: 1,
    borderRadius,
    padding: inputPadding.vertical,
    paddingHorizontal: inputPadding.horizontal,
    opacity: disabled ? 0.6 : 1,
  };
  
  const hasVoiceInput = variant === 'voice' && onVoiceInput;
  
  return (
    <View style={[styles.container, style]}>
      {/* 标签 */}
      {label && (
        <Text style={[labelStyle, styles.label]}>
          {label}
        </Text>
      )}
      
      {/* 输入框容器 */}
      <View style={inputContainerStyle}>
        {/* 语音输入按钮 */}
        {hasVoiceInput && (
          <TouchableOpacity
            onPress={onVoiceInput}
            style={styles.voiceButton}
            accessibilityRole="button"
            accessibilityLabel="语音输入"
          >
            <Text style={styles.voiceIcon}>🎤</Text>
          </TouchableOpacity>
        )}
        
        {/* 搜索图标 */}
        {variant === 'search' && (
          <Text style={styles.searchIcon}>🔍</Text>
        )}
        
        {/* 文本输入 */}
        <TextInput
          value={value}
          onChangeText={onChangeValue}
          placeholder={placeholder}
          placeholderTextColor={stageColors.textLight}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={secureTextEntry}
          editable={!disabled && !readOnly}
          style={[
            inputStyle,
            styles.input,
            hasVoiceInput && styles.inputWithVoice,
            variant === 'search' && styles.inputWithSearch,
          ]}
          accessibilityLabel={accessibilityLabel ?? placeholder ?? label}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      
      {/* 错误信息 */}
      {error && (
        <Text style={[errorStyle, styles.error, { color: stageColors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

// ============================================================================
// 样式辅助函数
// ============================================================================

function getBaseContainerStyle(
  stage: Stage,
  variant: InputVariant,
  size: InputSize
) {
  const spacing = getStageSpacing(stage, 4);
  const borderRadius = { elementary: 16, middle: 12, high: 8 }[stage];
  
  const sizeConfig = {
    small: {
      minHeight: 40,
    },
    medium: {
      minHeight: 48,
    },
    large: {
      minHeight: 56,
    },
  };
  
  return {
    minHeight: sizeConfig[size].minHeight,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius,
  };
}

function getBorderColor(
  stageColors: ReturnType<typeof getStageColors>,
  variant: InputVariant,
  error: string | undefined,
  isFocused: boolean
): string {
  if (error) {
    return stageColors.error;
  }
  
  if (isFocused) {
    return stageColors.primary;
  }
  
  return stageColors.border;
}

// ============================================================================
// 样式表
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    flex: 1,
    padding: 0,
  },
  inputWithVoice: {
    marginLeft: 8,
  },
  inputWithSearch: {
    marginLeft: 8,
  },
  voiceButton: {
    padding: 4,
  },
  voiceIcon: {
    fontSize: 20,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
    opacity: 0.5,
  },
  error: {
    marginTop: 4,
  },
});

// ============================================================================
// 工具函数导出
// ============================================================================

export function getInputPadding(
  stage: Stage,
  variant: InputVariant
): { horizontal: number; vertical: number } {
  const basePadding = {
    elementary: { horizontal: 16, vertical: 14 },
    middle: { horizontal: 14, vertical: 12 },
    high: { horizontal: 12, vertical: 10 },
  }[stage];
  
  if (variant === 'search' || variant === 'voice') {
    return {
      ...basePadding,
      horizontal: basePadding.horizontal + 8,
    };
  }
  
  return basePadding;
}

export default Input;
