import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  status: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Org {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  org: Org | null;
  role: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, orgName?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedToken) {
      setToken(storedToken);
      // Verify token is still valid by fetching user info
      fetchCurrentUser(storedToken).catch(() => {
        // If token is invalid, try to refresh
        if (storedRefreshToken) {
          refreshTokenInternal(storedRefreshToken).catch(() => {
            // If refresh fails, clear everything
            clearAuth();
          });
        } else {
          clearAuth();
        }
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const data = await response.json();
    setUser(data.user);
    setOrg(data.org);
    setRole(data.role);
    setIsLoading(false);
  };

  const refreshTokenInternal = async (refreshTok: string) => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTok }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    setToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);

    // Fetch user info with new token
    await fetchCurrentUser(data.token);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    // Check if user needs to select an org (multiple orgs)
    if (data.organizations && !data.token) {
      throw new Error('Multiple organizations - selection not yet implemented');
    }

    // Store tokens
    setToken(data.token);
    setUser(data.user);
    setOrg(data.org);
    setRole(data.role || 'member');
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
  };

  const signup = async (email: string, password: string, orgName?: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, orgName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();

    // Store tokens
    setToken(data.token);
    setUser(data.user);
    setOrg(data.org);
    setRole('owner'); // First user is always owner
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
  };

  const logout = () => {
    clearAuth();
    // Optionally call server logout endpoint
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(() => {
        // Ignore errors on logout
      });
    }
  };

  const refreshToken = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      await refreshTokenInternal(storedRefreshToken);
    }
  };

  const clearAuth = () => {
    setUser(null);
    setOrg(null);
    setRole(null);
    setToken(null);
    setIsLoading(false);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        org,
        role,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
