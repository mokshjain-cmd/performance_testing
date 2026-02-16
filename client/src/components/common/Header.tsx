import React from 'react';
import { UserCircle, LogIn, PlusCircle, LayoutDashboard } from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (route: string) => void;
}

const Header: React.FC<Props> = ({ isLoggedIn, onLogin, onLogout, onNavigate }) => {
  return (
    <header className="w-full bg-gradient-to-r from-slate-50 to-slate-200 shadow-md px-8 h-16 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <button
          className="bg-white/70 border-none rounded-lg px-4 py-2 font-medium text-base flex items-center gap-2 shadow-sm hover:bg-white/90 transition"
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button
          className="bg-white/70 border-none rounded-lg px-4 py-2 font-medium text-base flex items-center gap-2 shadow-sm hover:bg-white/90 transition"
          onClick={() => onNavigate('create-session')}
        >
          <PlusCircle size={20} /> Create Session
        </button>
      </div>
      <div className="flex items-center gap-6">
        {!isLoggedIn ? (
          <button
            className="bg-white/70 border-none rounded-lg px-4 py-2 font-medium text-base flex items-center gap-2 shadow-sm hover:bg-white/90 transition"
            onClick={onLogin}
          >
            <LogIn size={20} /> Login / Sign Up
          </button>
        ) : (
          <button
            className="bg-white/70 border-none rounded-lg px-4 py-2 font-medium text-base flex items-center gap-2 shadow-sm hover:bg-white/90 transition"
            onClick={onLogout}
          >
            <UserCircle size={24} className="text-sky-400" />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
