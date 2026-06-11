// [generated]
import { Outlet, Link, useNavigate } from 'react-router-dom';

const Layout = () => {
  const navigate = useNavigate();

  // TODO: implement user authentication check
  // TODO: implement navigation sidebar with menu items

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  投资计划管理
                </h1>
              </div>
              <div className="ml-10 flex items-center space-x-4">
                <Link to="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  仪表盘
                </Link>
                <Link to="/plans" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  计划列表
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              {/* TODO: implement user menu with logout */}
              <button
                onClick={() => navigate('/login')}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
