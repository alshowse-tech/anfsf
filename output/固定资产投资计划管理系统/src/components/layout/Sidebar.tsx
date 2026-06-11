// [generated]
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navigation = [
  { name: '项目立项', href: '/projects' },
  { name: '工程设计', href: '/design' },
  { name: '子项管理', href: '/sub-projects' },
  { name: '施工进度', href: '/progress' },
  { name: '设备到货', href: '/equipment' },
  { name: '资金拨付', href: '/payment' },
  { name: '竣工结算', href: '/settlement' },
  { name: '报表监控', href: '/reports' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="mt-5 px-2">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
              pathname === item.href
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
