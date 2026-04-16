/**
 * SparkPath Design System - Animations
 * 
 * Apple 风格动画规范
 * 流畅 (60fps) · 细腻 · 自然
 */

import type { Stage } from './colors';

/**
 * 动画时长
 */
export const durations = {
  instant: 0,
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 400,
  modal: 500,
};

/**
 * 缓动函数
 */
export const easings = {
  // 默认缓动 (Apple 风格)
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // 进入动画
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // 弹性动画 (小学阶段专用)
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  springGentle: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  
  // 专业动画 (高中阶段专用)
  professional: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  quick: 'cubic-bezier(0.55, 0, 0.45, 1)',
};

/**
 * 阶段适配动画配置
 */
export const stageAnimations: Record<Stage, {
  durationScale: number;
  springEnabled: boolean;
  defaultEasing: string;
  buttonFeedback: 'scale' | 'opacity' | 'color';
}> = {
  // 小学：弹性动画，活泼有趣
  elementary: {
    durationScale: 1.2,
    springEnabled: true,
    defaultEasing: easings.spring,
    buttonFeedback: 'scale',
  },
  
  // 初中：流畅过渡
  middle: {
    durationScale: 1.0,
    springEnabled: false,
    defaultEasing: easings.easeOut,
    buttonFeedback: 'opacity',
  },
  
  // 高中：快速响应，专业感
  high: {
    durationScale: 0.8,
    springEnabled: false,
    defaultEasing: easings.professional,
    buttonFeedback: 'color',
  },
};

/**
 * 页面过渡动画
 */
export const pageTransitions = {
  // 推入动画 (Push)
  push: {
    enter: {
      from: { transform: 'translateX(100%)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 },
      duration: durations.slow,
      easing: easings.easeOut,
    },
    exit: {
      from: { transform: 'translateX(0)', opacity: 1 },
      to: { transform: 'translateX(-100%)', opacity: 0 },
      duration: durations.slow,
      easing: easings.easeIn,
    },
  },
  
  // 淡入动画 (Fade)
  fade: {
    enter: {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: durations.normal,
      easing: easings.easeOut,
    },
    exit: {
      from: { opacity: 1 },
      to: { opacity: 0 },
      duration: durations.normal,
      easing: easings.easeIn,
    },
  },
  
  // 缩放动画 (Zoom)
  zoom: {
    enter: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
      duration: durations.slow,
      easing: easings.easeOut,
    },
    exit: {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.95)', opacity: 0 },
      duration: durations.slow,
      easing: easings.easeIn,
    },
  },
  
  // 底部弹出 (Sheet)
  sheet: {
    enter: {
      from: { transform: 'translateY(100%)' },
      to: { transform: 'translateY(0)' },
      duration: durations.modal,
      easing: easings.easeOut,
    },
    exit: {
      from: { transform: 'translateY(0)' },
      to: { transform: 'translateY(100%)' },
      duration: durations.modal,
      easing: easings.easeIn,
    },
  },
};

/**
 * 按钮交互动画
 */
export const buttonAnimations = {
  // 按压反馈
  press: {
    elementary: {
      scale: 1.05,
      duration: durations.fast,
      easing: easings.spring,
    },
    middle: {
      scale: 0.98,
      opacity: 0.9,
      duration: durations.normal,
      easing: easings.easeOut,
    },
    high: {
      backgroundColor: 'primaryDark',
      duration: durations.fast,
      easing: easings.professional,
    },
  },
  
  // 加载动画
  loading: {
    rotate: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
      duration: durations.slow,
      easing: 'linear',
      iterations: Infinity,
    },
  },
};

/**
 * 卡片交互动画
 */
export const cardAnimations = {
  // 悬停/按压
  hover: {
    elementary: {
      scale: 1.02,
      shadow: '0 12px 32px rgba(255, 107, 107, 0.3)',
      duration: durations.normal,
    },
    middle: {
      scale: 1.01,
      shadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
      duration: durations.normal,
    },
    high: {
      backgroundColor: 'surfaceElevated',
      duration: durations.fast,
    },
  },
};

/**
 * 进度条动画
 */
export const progressAnimations = {
  // 填充动画
  fill: {
    duration: durations.slower,
    easing: easings.easeInOut,
  },
  
  // 脉冲动画 (加载中)
  pulse: {
    opacity: {
      from: 0.6,
      to: 1,
      duration: durations.slow,
      easing: easings.easeInOut,
      iterations: Infinity,
      direction: 'alternate',
    },
  },
  
  // TTS 逐词高亮
  highlight: {
    backgroundColor: {
      duration: durations.fast,
      easing: easings.easeOut,
    },
    scroll: {
      behavior: 'smooth',
    },
  },
};

/**
 * 骨架屏动画
 */
export const skeletonAnimations = {
  shimmer: {
    backgroundPosition: {
      from: '-200% 0',
      to: '200% 0',
      duration: durations.slower,
      easing: easings.easeInOut,
      iterations: Infinity,
    },
  },
};

/**
 * 获取阶段适配动画
 */
export function getStageAnimation(stage: Stage, animation: keyof typeof pageTransitions) {
  const baseAnimation = pageTransitions[animation];
  const stageConfig = stageAnimations[stage];
  
  return {
    ...baseAnimation,
    enter: {
      ...baseAnimation.enter,
      duration: Math.round(baseAnimation.enter.duration * stageConfig.durationScale),
      easing: stageConfig.defaultEasing,
    },
    exit: {
      ...baseAnimation.exit,
      duration: Math.round(baseAnimation.exit.duration * stageConfig.durationScale),
      easing: stageConfig.defaultEasing,
    },
  };
}

/**
 * 生成 CSS 动画样式
 */
export function createAnimationStyle(
  animation: {
    from: Record<string, string | number>;
    to: Record<string, string | number>;
    duration: number;
    easing: string;
  }
) {
  return {
    animation: `custom-animation ${animation.duration}ms ${animation.easing}`,
    '@keyframes custom-animation': {
      from: animation.from,
      to: animation.to,
    },
  };
}

export type AnimationDuration = keyof typeof durations;
export type AnimationEasing = keyof typeof easings;
export type PageTransition = keyof typeof pageTransitions;

export default {
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
};
