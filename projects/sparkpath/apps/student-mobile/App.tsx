/**
 * SparkPath Student Mobile App
 * 
 * 9-18 岁贯穿式 AI 个人学习伙伴
 * 学生端应用入口
 */

import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import { getStageColors } from '@sparkpath/design-system';
import { AppNavigator } from './src/navigation/AppNavigator';

/**
 * 学生端主应用组件
 * 
 * 功能:
 * - 三阶段界面风格自动适配
 * - 底部 Tab 导航
 * - 安全区域适配
 */
const App: React.FC = () => {
  // TODO: 从 Learner Model 获取学生阶段
  // 当前默认使用初中阶段
  const stage = 'middle';
  const colors = getStageColors(stage);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={stage === 'high' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      <NavigationContainer>
        <AppNavigator stage={stage} />
      </NavigationContainer>
    </SafeAreaView>
  );
};

// ============================================================================
// 样式
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
