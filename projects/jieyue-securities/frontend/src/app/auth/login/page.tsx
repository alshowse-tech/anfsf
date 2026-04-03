import React from 'react';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">捷阅证券信息助手</h1>
          <p className="mt-2 text-sm text-gray-600">专业的证券信息服务</p>
        </div>
        
        <h2 className="mt-8 text-center text-2xl font-bold text-gray-900">
          登录您的账户
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <LoginForm />
        </div>

        {/* 额外信息 */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>保护您的账户安全，请勿与他人共享登录信息</p>
          <p className="mt-1">© 2024 捷阅证券信息助手。All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
