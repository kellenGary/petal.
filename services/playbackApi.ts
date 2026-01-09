import api from "./api";

class PlaybackApiService {
  async getCurrentlyPlaying(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/playback/currently-playing');
    return await response.json();
  }

  async getPlayerState(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/playback/player-state');
    return await response.json();
  }

  async play(): Promise<void> {
    await api.makeAuthenticatedRequest('/api/playback/play', { method: 'POST' });
  }

  async playSong(songId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/playback/play?uri=${encodeURIComponent(`spotify:track:${songId}`)}`, { method: 'POST' });
  }

  async pause(): Promise<void> {
    await api.makeAuthenticatedRequest('/api/playback/pause', { method: 'POST' });
  }

  async next(): Promise<void> {
    await api.makeAuthenticatedRequest('/api/playback/next', { method: 'POST' });
  }

  async previous(): Promise<void> {
    await api.makeAuthenticatedRequest('/api/playback/previous', { method: 'POST' });
  }

  async setShuffle(state: boolean): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/playback/shuffle?state=${state}`, { method: 'POST' });
  }

  async setRepeat(state: 'track' | 'context' | 'off'): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/playback/repeat?state=${state}`, { method: 'POST' });
  }    
}

export default new PlaybackApiService();