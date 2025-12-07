import React from 'react';
import { NavLink } from 'react-router-dom';
import { RoutePath } from '../types';
import { 
  Zap, 
  Video, 
  Image as ImageIcon, 
  MessageSquare, 
  Activity,
  Menu,
  X
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const navItems = [
    { label: 'Overview', path: RoutePath.HOME, icon: <Activity size={20} /> },
    { label: 'Live Audio', path: RoutePath.LIVE, icon: <Zap size={20} /> },
    { label: 'Veo Video', path: RoutePath.VIDEO, icon: <Video size={20} /> },
    { label: 'Image Studio', path: RoutePath.IMAGE, icon: <ImageIcon size={20} /> },
    { label: 'Assistant', path: RoutePath.ASSISTANT, icon: <MessageSquare size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Omni-Studio
          </h1>
          <p className="text-xs text-slate-500 mt-1">Powered by Gemini</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 text-center">
             v1.0.0 • Google GenAI SDK
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
         <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Omni-Studio
          </h1>
          <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="text-white">
            {isMobileOpen ? <X /> : <Menu />}
          </button>
      </div>

      {/* Mobile Nav Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950 pt-20 px-6">
           <nav className="space-y-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-4 rounded-xl text-lg ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
