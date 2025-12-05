/**
 * Dashboard Page
 *
 * Main dashboard with sidebar navigation and content area
 */

import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/userStore';
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Briefcase,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const { profile } = useUserStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Overview', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Job Search', path: '/jobs', icon: <Briefcase className="h-5 w-5" /> },
    { label: 'CVs', path: '/dashboard/cvs', icon: <FileText className="h-5 w-5" /> },
    { label: 'Optimizations', path: '/dashboard/optimizations', icon: <Sparkles className="h-5 w-5" /> },
    { label: 'Applications', path: '/dashboard/applications', icon: <Briefcase className="h-5 w-5" /> },
    { label: 'Analytics', path: '/dashboard/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  ];

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">TalentNode</h1>
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActiveRoute(item.path)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Settings */}
          <div className="border-t border-gray-200 p-4">
            <Link
              to="/profile/settings"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Page Title (Hidden on Mobile) */}
          <div className="hidden lg:block">
            <h2 className="text-xl font-semibold text-gray-900">
              {navItems.find((item) => isActiveRoute(item.path))?.label || 'Dashboard'}
            </h2>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                {user?.email?.charAt(0).toUpperCase() || profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile/edit" className="cursor-pointer">
                  Edit Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile/settings" className="cursor-pointer">
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                }}
                className="cursor-pointer text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
