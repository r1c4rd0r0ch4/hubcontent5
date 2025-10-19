import React from 'react';
import { LogOut, LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  activeNavItemId: string;
  onNavItemClick: (id: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, navItems, activeNavItemId, onNavItemClick }) => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text flex">
      {/* Sidebar */}
      <aside className="w-72 bg-surface shadow-2xl p-6 flex flex-col rounded-r-2xl animate-slide-in-left">
        <div className="text-3xl font-extrabold text-primary mb-10 tracking-wide">
          HubContent <span className="text-secondary">Admin</span>
        </div>
        <nav className="flex-1">
          <ul>
            {navItems.map((item) => (
              <li key={item.id} className="mb-3">
                <button
                  onClick={() => onNavItemClick(item.id)}
                  className={`
                    flex items-center w-full p-4 rounded-lg text-left transition-all duration-300 ease-in-out
                    ${activeNavItemId === item.id
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 transform scale-105'
                      : 'text-textSecondary hover:bg-surface/70 hover:text-text'
                    }
                  `}
                >
                  <item.icon className="w-6 h-6 mr-4" />
                  <span className="font-semibold text-lg">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto pt-6 border-t border-border">
          <button
            onClick={signOut}
            className="flex items-center w-full p-4 rounded-lg text-left text-textSecondary hover:bg-error/20 hover:text-error transition-colors duration-300 ease-in-out group"
          >
            <LogOut className="w-6 h-6 mr-4 group-hover:rotate-6 transition-transform" />
            <span className="font-semibold text-lg">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 animate-fade-in">
        <div className="bg-surface rounded-xl shadow-2xl p-8 border border-border min-h-[calc(100vh-80px)]">
          {children}
        </div>
      </main>
    </div>
  );
};
