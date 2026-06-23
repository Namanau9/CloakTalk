import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Navbar({ title }) {
  const { user, lock, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="h-16 border-b border-dark-700/50 bg-dark-900/50 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="font-semibold text-dark-100 text-lg">{title || 'CloakTalk'}</h1>
      </div>

      {/* Right: User Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-dark-700/50 transition-colors"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full ring-2 ring-dark-600"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-300">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm text-dark-300 hidden sm:block">{user?.name}</span>
          <svg
            className={`w-4 h-4 text-dark-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-56 glass-card rounded-xl border border-dark-700/50 shadow-2xl py-2 animate-scale-in">
            <div className="px-4 py-3 border-b border-dark-700/50">
              <p className="text-sm font-medium text-dark-100">{user?.name}</p>
              <p className="text-xs text-dark-400 truncate">{user?.email}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => {
                  lock();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark-200 hover:bg-dark-700/50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Lock Session
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-dark-700/50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
