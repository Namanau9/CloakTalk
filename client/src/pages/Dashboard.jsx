import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, socket } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    if (!socket) return;

    socket.on('users:online', ({ userIds }) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on('user:online', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on('user:offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // Request online users
    socket.emit('users:online:request');

    return () => {
      socket.off('users:online');
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [socket]);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data.users);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await api.searchUsers(query);
      setSearchResults(data.users);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const startChat = (userId) => {
    navigate(`/chat/${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const displayUsers = searchQuery.length >= 2 ? searchResults : users;

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar title="CloakTalk" />

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full">
        {/* Sidebar */}
        <div className="lg:w-80 border-r border-dark-700/50 flex flex-col h-full">
          {/* Search */}
          <div className="p-4 border-b border-dark-700/50">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="glass-input w-full pl-10 pr-4"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {displayUsers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-dark-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className="text-dark-400 text-sm">
                  {searchQuery ? 'No users found' : 'No other users yet'}
                </p>
                <p className="text-dark-500 text-xs mt-1">
                  {searchQuery ? 'Try a different search term' : 'Share the app to invite others!'}
                </p>
              </div>
            ) : (
              displayUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChat(u.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-800/50 transition-colors border-b border-dark-800/30 group"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-300">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-dark-900 ${
                        onlineUsers.has(u.id) ? 'bg-green-500' : 'bg-dark-500'
                      }`}
                    ></div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-dark-100 truncate group-hover:text-white transition-colors">
                      {u.name}
                    </p>
                    <p className="text-xs text-dark-500 truncate">
                      {u.email}
                    </p>
                  </div>

                  {/* Online indicator */}
                  <div className="flex-shrink-0">
                    <span className={`text-xs ${onlineUsers.has(u.id) ? 'text-green-400' : 'text-dark-500'}`}>
                      {onlineUsers.has(u.id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Welcome Screen */}
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="text-center max-w-md px-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 border border-primary-500/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-dark-200 mb-2">Welcome to CloakTalk</h3>
            <p className="text-dark-400 text-sm leading-relaxed">
              Select a user from the sidebar to start an end-to-end encrypted conversation.
              Your messages are encrypted on your device and can only be read by your recipient.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-dark-500">
              <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>End-to-end encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
