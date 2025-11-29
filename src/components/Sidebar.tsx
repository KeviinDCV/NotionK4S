import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  FileText,
  Video,
  Users,
  Settings,
  LogOut,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { NotificationsDropdown } from './NotificationsDropdown';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/notes', icon: ClipboardList, label: 'Gestión' },
  { to: '/calendar', icon: Calendar, label: 'Calendario' },
  { to: '/meetings', icon: Video, label: 'Reuniones' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/notepad', icon: FileText, label: 'Notepad' },
  { to: '/team', icon: Users, label: 'Equipo' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#181825] border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <img src="/Logo.svg" alt="Kor4Soft" className="h-8" />
          <div>
            <h1 className="text-lg font-bold text-blue-400">Kor4Soft Notes</h1>
            <p className="text-xs text-gray-500">Sistema de seguimiento</p>
          </div>
        </div>
      </div>

      {/* User info + Notifications */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <NotificationsDropdown />
        </div>
      </div>

      {/* Quick action */}
      <div className="p-4">
        <NavLink
          to="/notes/new"
          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Nueva Nota
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#1e1e2e]'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-gray-700">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1e1e2e] transition-colors"
        >
          <Settings size={20} />
          <span>Configuración</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-[#1e1e2e] transition-colors w-full"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
