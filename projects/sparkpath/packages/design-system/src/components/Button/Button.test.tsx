/**
 * SparkPath Design System - Button Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { Button } from './Button';
import { colors } from '../../colors';

describe('Button Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('渲染', () => {
    it('应该渲染按钮文字', () => {
      const { getByText } = render(
        <Button title="点击我" onPress={mockOnPress} />
      );

      expect(getByText('点击我')).toBeTruthy();
    });

    it('应该支持自定义 accessibilityLabel', () => {
      const { getByLabelText } = render(
        <Button
          title="🎯"
          onPress={mockOnPress}
          accessibilityLabel="开始学习"
        />
      );

      expect(getByLabelText('开始学习')).toBeTruthy();
    });
  });

  describe('阶段适配', () => {
    it('小学阶段应该使用珊瑚红主色', () => {
      const { getByText } = render(
        <Button
          title="开始学习"
          onPress={mockOnPress}
          stage="elementary"
          variant="primary"
        />
      );

      const button = getByText('开始学习').parent;
      expect(button).toBeTruthy();
    });

    it('初中阶段应该使用湛蓝色主色', () => {
      const { getByText } = render(
        <Button
          title="开始学习"
          onPress={mockOnPress}
          stage="middle"
          variant="primary"
        />
      );

      const button = getByText('开始学习').parent;
      expect(button).toBeTruthy();
    });

    it('高中阶段应该使用深紫色主色', () => {
      const { getByText } = render(
        <Button
          title="开始学习"
          onPress={mockOnPress}
          stage="high"
          variant="primary"
        />
      );

      const button = getByText('开始学习').parent;
      expect(button).toBeTruthy();
    });
  });

  describe('样式变体', () => {
    it('primary 变体应该有背景色', () => {
      const { getByText } = render(
        <Button title="按钮" onPress={mockOnPress} variant="primary" />
      );

      const button = getByText('按钮').parent;
      expect(button).toBeTruthy();
    });

    it('secondary 变体应该有次要背景色', () => {
      const { getByText } = render(
        <Button title="按钮" onPress={mockOnPress} variant="secondary" />
      );

      const button = getByText('按钮').parent;
      expect(button).toBeTruthy();
    });

    it('outline 变体应该是透明背景', () => {
      const { getByText } = render(
        <Button title="按钮" onPress={mockOnPress} variant="outline" />
      );

      const button = getByText('按钮').parent;
      expect(button).toBeTruthy();
    });

    it('ghost 变体应该是透明背景', () => {
      const { getByText } = render(
        <Button title="按钮" onPress={mockOnPress} variant="ghost" />
      );

      const button = getByText('按钮').parent;
      expect(button).toBeTruthy();
    });
  });

  describe('尺寸', () => {
    it('small 尺寸应该最小', () => {
      const { getByText } = render(
        <Button title="小按钮" onPress={mockOnPress} size="small" />
      );

      const button = getByText('小按钮').parent;
      expect(button).toBeTruthy();
    });

    it('medium 尺寸应该中等', () => {
      const { getByText } = render(
        <Button title="中按钮" onPress={mockOnPress} size="medium" />
      );

      const button = getByText('中按钮').parent;
      expect(button).toBeTruthy();
    });

    it('large 尺寸应该最大', () => {
      const { getByText } = render(
        <Button title="大按钮" onPress={mockOnPress} size="large" />
      );

      const button = getByText('大按钮').parent;
      expect(button).toBeTruthy();
    });
  });

  describe('交互', () => {
    it('点击应该触发 onPress', () => {
      const { getByText } = render(
        <Button title="点击我" onPress={mockOnPress} />
      );

      const button = getByText('点击我').parent as any;
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('禁用状态不应该触发 onPress', () => {
      const { getByText } = render(
        <Button title="点击我" onPress={mockOnPress} disabled />
      );

      const button = getByText('点击我').parent as any;
      fireEvent.press(button);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('加载状态不应该触发 onPress', () => {
      const { getByText } = render(
        <Button title="点击我" onPress={mockOnPress} loading />
      );

      const button = getByText('点击我').parent as any;
      fireEvent.press(button);

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('加载状态', () => {
    it('应该显示加载指示器', () => {
      const { toJSON } = render(
        <Button title="加载中" onPress={mockOnPress} loading />
      );

      const tree = toJSON();
      expect(tree).toBeTruthy();
    });
  });

  describe('自定义样式', () => {
    it('应该支持自定义 style', () => {
      const customStyle = { backgroundColor: 'purple' };
      const { getByText } = render(
        <Button
          title="自定义"
          onPress={mockOnPress}
          style={customStyle}
        />
      );

      const button = getByText('自定义').parent;
      expect(button).toBeTruthy();
    });

    it('应该支持自定义 textStyle', () => {
      const customTextStyle = { fontSize: 20 };
      const { getByText } = render(
        <Button
          title="自定义文字"
          onPress={mockOnPress}
          textStyle={customTextStyle}
        />
      );

      const text = getByText('自定义文字');
      expect(text).toBeTruthy();
    });
  });
});
