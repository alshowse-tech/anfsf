/**
 * Card 组件
 * 捷阅证券 UI 组件库 - 基于 ANFSF V1.5.0
 */

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  onClick,
}) => {
  const hoverClass = hoverable ? 'hover:shadow-lg cursor-pointer transition-shadow duration-200' : '';
  
  return (
    <div
      className={`
        bg-white rounded-xl shadow-md overflow-hidden
        dark:bg-gray-800
        ${hoverClass}
        ${className}
      `.trim()}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  action,
}) => {
  return (
    <div className={`
      px-6 py-4 border-b border-gray-200 flex justify-between items-center
      dark:border-gray-700
      ${className}
    `.trim()}>
      {children}
      {action && <div>{action}</div>}
    </div>
  );
};

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`
      px-6 py-4 border-t border-gray-200 bg-gray-50
      dark:border-gray-700 dark:bg-gray-900
      ${className}
    `.trim()}>
      {children}
    </div>
  );
};

export default Card;
