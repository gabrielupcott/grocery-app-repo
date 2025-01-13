import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URLS } from '@/constants/constants';
import { router } from 'expo-router';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  userName: string | null;
  userType: number | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userType, setUserType] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUserId = await SecureStore.getItemAsync('user_id');
      const storedUserName = await SecureStore.getItemAsync('userName');

      if (storedToken && storedUserId && storedUserName) {
        setToken(storedToken);
        setUserId(storedUserId);
        setUserName(storedUserName);
        setIsAuthenticated(true);

        // Fetch user type
        const responseUserType = await axios.get(
          `${API_URLS.GET_USER_TYPE}/${storedUserName}`,
          { headers: { Authorization: `Bearer ${storedToken}` } }
        );
        setUserType(responseUserType.data.user_type);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(
        API_URLS.LOGIN,
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const newToken = response.data.access_token;
      await SecureStore.setItemAsync('token', newToken);
      await SecureStore.setItemAsync('userName', username);

      const response2 = await axios.get(`${API_URLS.GET_USERID_BY_EMAIL}?email=${username}`);
      const user_id = response2.data.user_id;
      await SecureStore.setItemAsync('user_id', user_id);

      // get user type
      const responseUserType = await axios.get(`${API_URLS.GET_USER_TYPE}/${username}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      
      setUserType(responseUserType.data.user_type);
      setToken(newToken);
      setUserId(user_id);
      setUserName(username);
      setIsAuthenticated(true);

      router.replace('/(tabs)');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user_id');
      await SecureStore.deleteItemAsync('userName');
      
      setToken(null);
      setUserId(null);
      setUserName(null);
      setIsAuthenticated(false);
      setUserType(null);

      router.replace('/Login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        userId,
        userName,
        userType,
        login,
        logout,
        loading
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