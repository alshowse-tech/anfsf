// [generated]
import React from 'react';
import { NavLink } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-6">
          <h1 className="text-xl font-bold">固定资产投资计划管理系统</h1>
          <div className="flex gap-4 items-center">
            <NavLink to="/" className="hover:underline">
              首页
            </NavLink>
            <NavLink to="/plans" className="hover:underline">
              年度计划
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
