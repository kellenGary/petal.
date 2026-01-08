import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";

interface User {
  id: number;
  spotifyId: string;
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  email: string | null;
  profileImageUrl: string | null;
  hasCompletedProfile: boolean;
}

interface AuthContextType {
  user: User | null;
  jwtToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string, userData: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (userData: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load token and user from secure storage on mount
    loadAuthData();
    // Register unauthorized handler to sign out on 401s
    api.setUnauthorizedHandler(() => {
      // Best effort sign-out; ignore errors
      signOut();
    });
  }, []);

  async function loadAuthData() {
    try {
      const token = await SecureStore.getItemAsync("jwt_token");
      const userStr = await SecureStore.getItemAsync("user");

      setJwtToken(token);
      // Sync token to API service
      api.setAuthToken(token);
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error("Failed to load auth data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(token: string, userData: User) {
    try {
      await SecureStore.setItemAsync("jwt_token", token);
      await SecureStore.setItemAsync("user", JSON.stringify(userData));
      setJwtToken(token);
      // Sync token to API service
      api.setAuthToken(token);
      setUser(userData);
    } catch (error) {
      console.error("Failed to save auth data:", error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await SecureStore.deleteItemAsync("jwt_token");
      await SecureStore.deleteItemAsync("user");
      setJwtToken(null);
      // Clear token from API service
      api.setAuthToken(null);
      setUser(null);
    } catch (error) {
      console.error("Failed to delete auth data:", error);
    }
  }

  async function updateUser(userData: User) {
    try {
      await SecureStore.setItemAsync("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to update user data:", error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        jwtToken,
        isLoading,
        isAuthenticated: jwtToken !== null,
        signIn,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
