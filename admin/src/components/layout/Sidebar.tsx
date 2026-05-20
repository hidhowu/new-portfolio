import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, FolderKanban, FileText,
  Clock, Wrench, Settings, Image, User, LogOut
} from 'lucide-react';
import { post } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/services', icon: Briefcase, label: 'Services' },
  { to: '/admin/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/admin/blog', icon: FileText, label: 'Blog' },
  { to: '/admin/experience', icon: Clock, label: 'Experience' },
  { to: '/admin/skills', icon: Wrench, label: 'Skills' },
  { to: '/admin/site', icon: Settings, label: 'Site' },
  { to: '/admin/media', icon: Image, label: 'Media' },
  { to: '/admin/account', icon: User, label: 'Account' },
];

export function Sidebar() {
  const { logout } = useAuth();
  const nav = useNavigate();

  async function handleLogout() {
    await post('/api/admin/auth/logout').catch(() => {});
    logout();
    nav('/admin/login');
  }

  return (
    <aside className="w-60 bg-white border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 px-6 flex items-center border-b border-border">
        <span className="font-bold text-[15px] tracking-tight">Josh Studios <span className="text-primary font-semibold">CMS</span></span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:bg-gray-50 hover:text-text'
              }`
            }
          >
            <link.icon size={17} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-text-muted hover:bg-gray-50 hover:text-text transition-colors w-full"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
