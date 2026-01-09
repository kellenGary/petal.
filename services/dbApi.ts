import api from '@/services/api';

class DbApiService {
  async getAllUsers(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/db/users');
    return await response.json();
  }
}

export default new DbApiService();