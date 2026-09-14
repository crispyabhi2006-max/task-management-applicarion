import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types.ts';
import { authService } from '../services/api.ts';
import { getSocket, disconnectSocket } from '../services/socket.ts';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tm_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on page load
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('tm_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('tm_user', JSON.stringify(res.data.user));

            // Join user socket room
            const socket = getSocket();
            socket.emit('join_user_room', res.data.user.id);
          } else {
            // Invalid session
            localStorage.removeItem('tm_token');
            localStorage.removeItem('tm_user');
            setUser(null);
            setToken(null);
          }
        } catch (err) {
          // Token expired or invalid
          localStorage.removeItem('tm_token');
          localStorage.removeItem('tm_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authService.login(email, pass);
    if (res.success && res.data) {
      const { user: userData, token: jwtToken } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('tm_token', jwtToken);
      localStorage.setItem('tm_user', JSON.stringify(userData));

      // Connect socket
      const socket = getSocket();
      socket.emit('join_user_room', userData.id);
    } else {
      throw new Error(res.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await authService.register(name, email, pass);
    if (res.success && res.data) {
      const { user: userData, token: jwtToken } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('tm_token', jwtToken);
      localStorage.setItem('tm_user', JSON.stringify(userData));

      const socket = getSocket();
      socket.emit('join_user_room', userData.id);
    } else {
      throw new Error(res.message || 'Registration failed');
    }
  };

  const logout = () => {
    authService.logout().catch(() => {});
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_user');
    setUser(null);
    setToken(null);
    disconnectSocket();
  };

  const refreshUser = async () => {
    try {
      const res = await authService.getMe();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('tm_user', JSON.stringify(res.data.user));
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
