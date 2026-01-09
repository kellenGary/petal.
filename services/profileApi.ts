import api, { User} from "./api";

class ProfileApiService {
  // Profile endpoints
  async getProfile(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/profile');
    return await response.json();
  }

  async getAppProfile(): Promise<User> {
    const response = await api.makeAuthenticatedRequest('/api/profile/app');
    return await response.json();
  }

  async updateAppProfile(payload: Partial<Pick<User, 'displayName' | 'handle' | 'bio'>>): Promise<User> {
    const response = await api.makeAuthenticatedRequest('/api/profile/app', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return await response.json();
  }

  async getProfileStats(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/profile/stats');
    return await response.json();
  }    
}

export default new ProfileApiService();