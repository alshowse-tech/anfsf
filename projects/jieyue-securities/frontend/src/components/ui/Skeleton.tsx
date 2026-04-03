/**
 * Skeleton 骨架屏组件
 * 捷阅证券 UI 组件库 - 基于 ANFSF V1.5.0
 */

import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className = '',
}) => {
  const baseStyles = `
    bg-gray-200 dark:bg-gray-700
    ${animation === 'pulse' ? 'animate-pulse' : 'animate-shimmer'}
  `;

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
};

// ============================================================================
// 预设骨架屏组件
// ============================================================================

export const SkeletonText: React.FC<{
  lines?: number;
  width?: string;
  className?: string;
}> = ({ lines = 1, width = '100%', className = '' }) => {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height="1rem"
          width={i === lines - 1 ? `${parseInt(width) * 0.6}%` : width}
          className="mb-2"
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-start space-x-4">
        <Skeleton variant="rectangular" width={48} height={48} className="flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height="1rem" />
          <Skeleton variant="text" width="100%" height="0.875rem" />
          <Skeleton variant="text" width="80%" height="0.875rem" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" height="1rem" />
            <Skeleton variant="text" width="60%" height="0.875rem" />
          </div>
          <Skeleton variant="text" width="20%" height="1rem" />
        </div>
      ))}
    </div>
  );
};

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizes = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 },
  };

  return (
    <Skeleton
      variant="circular"
      width={sizes[size].width}
      height={sizes[size].height}
      className={className}
    />
  );
};

export default Skeleton;
