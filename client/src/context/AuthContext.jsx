import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';
import {
  generateKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  storeKeys,
  hasStoredKeys,
  isPinSet,
  clearKeys,
  getStoredPublicKey,
} from '../utils/crypto';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [privateKey, setPrivateKey] = useState(null);
  const [socket, setSocket] = useState(null);

  // Initialize: check for existing token
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('cloaktalk_token');
      if (token) {
        try {
          const data = await api.getMe();
          setUser(data.user);
        } catch {
          // Token invalid, clear it
          localStorage.removeItem('cloaktalk_token');
        }
      }
      setLoading(false);

      // Check if PIN is set
      if (isPinSet()) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    };
    init();
  }, []);

  // Connect socket when user is authenticated and unlocked
  useEffect(() => {
    if (user && !isLocked) {
      const token = localStorage.getItem('cloaktalk_token');
      const s = connectSocket(token);
      setSocket(s);

      // Ping every 5 minutes to keep last_seen updated
      const pingInterval = setInterval(() => {
        api.ping().catch(() => {});
      }, 5 * 60 * 1000);

      return () => {
        disconnectSocket();
        clearInterval(pingInterval);
      };
    }
  }, [user, isLocked]);

  const login = useCallback(async (token) => {
    localStorage.setItem('cloaktalk_token', token);
    const data = await api.getMe();
    setUser(data.user);

    // Check if user needs to set up keys
    if (!hasStoredKeys()) {
      return { needsKeySetup: true };
    }
    return { needsKeySetup: false };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cloaktalk_token');
    clearKeys();
    disconnectSocket();
    setUser(null);
    setPrivateKey(null);
    setIsLocked(false);
    setSocket(null);
  }, []);

  const setupKeys = useCallback(async (pin) => {
    try {
      // Generate new key pair
      const { publicKey, privateKey: privKey } = await generateKeyPair();

      // Encrypt private key with PIN
      const encryptedPrivateKey = await encryptPrivateKey(privKey, pin);

      // Store encrypted private key and public key
      storeKeys(encryptedPrivateKey, publicKey);

      // Upload public key to server
      await api.updatePublicKey(publicKey);

      setPrivateKey(privKey);
      setIsLocked(false);
      return { success: true };
    } catch (err) {
      console.error('Key setup failed:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const unlock = useCallback(async (pin) => {
    try {
      const encryptedKey = localStorage.getItem('cloaktalk_encrypted_private_key');
      if (!encryptedKey) {
        return { success: false, error: 'No keys found' };
      }

      const privKey = await decryptPrivateKey(encryptedKey, pin);
      setPrivateKey(privKey);
      setIsLocked(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Wrong PIN' };
    }
  }, []);

  const lock = useCallback(() => {
    setPrivateKey(null);
    setIsLocked(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLocked,
        privateKey,
        socket,
        login,
        logout,
        setupKeys,
        unlock,
        lock,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
