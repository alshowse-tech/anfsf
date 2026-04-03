/**
 * 平台图标组件
 * 根据平台显示对应的图标和样式
 */

import React from 'react';

export type PlatformType = 
  | 'douyin' 
  | 'xiaohongshu' 
  | 'bilibili' 
  | 'kuaishou' 
  | 'wechat_channels' 
  | 'unknown';

interface PlatformIconProps {
  platform: PlatformType | string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

// 平台配置
const PLATFORM_CONFIG: Record<PlatformType, {
  icon: string;
  name: string;
  color: string;
  bgColor: string;
}> = {
  douyin: {
    icon: '🎵',
    name: '抖音',
    color: '#000000',
    bgColor: '#FE2C55',
  },
  xiaohongshu: {
    icon: '📕',
    name: '小红书',
    color: '#FFFFFF',
    bgColor: '#FF2442',
  },
  bilibili: {
    icon: '📺',
    name: 'B 站',
    color: '#FFFFFF',
    bgColor: '#00A1D6',
  },
  kuaishou: {
    icon: '📹',
    name: '快手',
    color: '#FFFFFF',
    bgColor: '#FF4906',
  },
  wechat_channels: {
    icon: '💬',
    name: '视频号',
    color: '#FFFFFF',
    bgColor: '#07C160',
  },
  unknown: {
    icon: '🔗',
    name: '链接',
    color: '#666666',
    bgColor: '#E5E7EB',
  },
};

/**
 * 获取平台配置
 */
function getPlatformConfig(platform: string): typeof PLATFORM_CONFIG['unknown'] {
  const config = PLATFORM_CONFIG[platform as PlatformType];
  return config || PLATFORM_CONFIG.unknown;
}

/**
 * 获取尺寸对应的类名
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'w-6 h-6 text-sm';
    case 'lg':
      return 'w-12 h-12 text-2xl';
    default:
      return 'w-8 h-8 text-lg';
  }
}

/**
 * 平台图标组件
 */
export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 'md',
  showName = false,
  className = '',
}) => {
  const config = getPlatformConfig(platform);
  const sizeClasses = getSizeClasses(size);

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      title={config.name}
    >
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center`}
        style={{ 
          backgroundColor: config.bgColor,
          color: config.color,
        }}
      >
        {config.icon}
      </div>
      {showName && (
        <span className="text-sm font-medium text-gray-700">
          {config.name}
        </span>
      )}
    </div>
  );
};

/**
 * 平台图标（仅图标，无背景）
 */
export const PlatformIconSimple: React.FC<PlatformIconProps> = ({
  platform,
  size = 'md',
  className = '',
}) => {
  const config = getPlatformConfig(platform);
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={`${sizeClasses} ${className}`}
      title={config.name}
    >
      <span className="text-xl">{config.icon}</span>
    </div>
  );
};

export default PlatformIcon;
