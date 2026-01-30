import { Platform } from "react-native";

// Allow overriding the API host for real devices via EXPO_PUBLIC_API_URL.
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__
    ? Platform.OS === "ios"
      ? "http://localhost:5164"
      : "http://10.0.2.2:5164"
    : "https://your-production-api.com");

export interface User {
  id: number;
  spotifyId: string;
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  email: string | null;
  profileImageUrl: string | null;
  hasCompletedProfile: boolean;
}

export interface AuthResponse {
  token: string;
  isNewUser: boolean;
  user: User;
}

class ApiService {
  private token: string | null = null;
  private onUnauthorized?: () => void;
  private isHandlingUnauthorized = false;

  setAuthToken(token: string | null) {
    this.token = token;
    // Reset the unauthorized handling flag when a new token is set
    this.isHandlingUnauthorized = false;
  }

  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  async login(): Promise<string> {
    return `${API_URL}/api/auth/login`;
  }

  async handleAuthCallback(code: string, state: string): Promise<AuthResponse> {
    const response = await fetch(
      `${API_URL}/api/auth/callback?code=${code}&state=${state}`,
    );

    if (!response.ok) {
      throw new Error("Authentication failed");
    }

    const data: AuthResponse = await response.json();
    return data;
  }

  // For public/unauthenticated endpoints
  async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
      },
    });
    return response;
  }

  async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    if (!this.token) {
      // If we are already handling an unauthorized state, don't throw an error that might clutter logs
      // just return a dummy response or throw a specific error that can be ignored
      if (this.isHandlingUnauthorized) {
        return new Response(
          JSON.stringify({ error: "Authentication expired" }),
          {
            status: 401,
            statusText: "Unauthorized",
          },
        ) as unknown as Response;
      }
      throw new Error("Not authenticated");
    }

    // If we're already handling a 401, don't make more requests
    if (this.isHandlingUnauthorized) {
      return new Response(JSON.stringify({ error: "Authentication expired" }), {
        status: 401,
        statusText: "Unauthorized",
      }) as unknown as Response;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });

    // If unauthorized, clear token and trigger handler ONLY ONCE
    if (response.status === 401) {
      if (!this.isHandlingUnauthorized) {
        this.isHandlingUnauthorized = true;
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
      }
    }

    return response;
  }
}

export default new ApiService();
