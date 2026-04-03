/**
 * Toast 通知组件
 * 捷阅证券 UI 组件库 - 基于 ANFSF V1.5.0
 */

import React, { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
  action?: React.ReactNode;
}

const typeStyles = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-500',
    text: 'text-green-800 dark:text-green-200',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    text: 'text-red-800 dark:text-red-200',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500',
    text: 'text-yellow-800 dark:text-yellow-200',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
  },
};

const icons = {
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'info',
  duration = 5000,
  onClose,
  action,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const style = typeStyles[type];

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  return (
    <div
      className={`
        flex items-center p-4 mb-3 rounded-lg border shadow-lg
        ${style.bg} ${style.border}
        animate-slide-in
        ${isExiting ? 'animate-fade-out' : ''}
        min-w-[300px] max-w-md
      `.trim()}
      role="alert"
    >
      <div className={`flex-shrink-0 ${style.icon}`}>
        {icons[type]}
      </div>
      
      <div className="ml-3 flex-1">
        <p className={`text-sm font-medium ${style.text}`}>
          {message}
        </p>
      </div>
      
      {action && (
        <div className="ml-4 flex-shrink-0">
          {action}
        </div>
      )}
      
      <button
        onClick={handleClose}
        className="ml-4 flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
        aria-label="关闭"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ============================================================================
// Toast Container 和 Hook
// ============================================================================

export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  action?: React.ReactNode;
}

export interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

// 简单的 Toast 管理器 (实际项目中建议使用 Context)
let toastId = 0;
const toastCallbacks = new Map<string, (id: string) => void>();

export const addToast = (toast: Omit<ToastMessage, 'id'>): string => {
  const id = `toast-${++toastId}`;
  // 这里应该触发 Context 更新，简化处理
  console.log('Toast added:', id, toast);
  return id;
};

export const removeToast = (id: string) => {
  toastCallbacks.get(id)?.(id);
  toastCallbacks.delete(id);
};

export const toast = {
  success: (message: string, duration?: number) => 
    addToast({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => 
    addToast({ message, type: 'error', duration }),
  warning: (message: string, duration?: number) => 
    addToast({ message, type: 'warning', duration }),
  info: (message: string, duration?: number) => 
    addToast({ message, type: 'info', duration }),
};

export default Toast;
