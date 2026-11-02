import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, EmailNotification } from '../types.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateStudentProfile: (profile: any) => Promise<{ success: boolean; error?: string }>;
  uploadResume: (resume: { filename: string; fileType: string; fileSize: number; dataBase64: string }) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  notifications: EmailNotification[];
  refreshNotifications: () => Promise<void>;
  smtpConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('skillbridge_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('skillbridge_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('skillbridge_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to restore user session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    const currentToken = localStorage.getItem('skillbridge_token');
    if (!currentToken) {
      setNotifications([]);
      return;
    }

    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setSmtpConfigured(Boolean(data.smtpConfigured));
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user) {
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user, refreshNotifications]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }

      localStorage.setItem('skillbridge_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await refreshNotifications();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login.' };
    }
  };

  const register = async (payload: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      localStorage.setItem('skillbridge_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await refreshNotifications();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration.' };
    }
  };

  const logout = async () => {
    const currentToken = localStorage.getItem('skillbridge_token');
    if (currentToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    localStorage.removeItem('skillbridge_token');
    setToken(null);
    setUser(null);
    setNotifications([]);
  };

  const updateStudentProfile = async (profileUpdates: any) => {
    const currentToken = localStorage.getItem('skillbridge_token');
    if (!currentToken) return { success: false, error: 'Not logged in.' };

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(profileUpdates),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Profile update failed.' };

      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const uploadResume = async (resumeData: {
    filename: string;
    fileType: string;
    fileSize: number;
    dataBase64: string;
  }) => {
    const currentToken = localStorage.getItem('skillbridge_token');
    if (!currentToken) return { success: false, error: 'Not logged in.' };

    try {
      const res = await fetch('/api/student/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(resumeData),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Resume upload failed.' };

      await refreshUser();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateStudentProfile,
        uploadResume,
        refreshUser,
        notifications,
        refreshNotifications,
        smtpConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
