import api from "@/services/api";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

// Interfaces matching Spotify API response structure
export interface CurrentTrack {
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  item?: CurrentTrack;
  progress_ms: number;
  duration_ms: number;
  shuffle_state: boolean;
  repeat_state: string;
}

interface PlaybackContextType {
  playbackState: PlaybackState | null;
  currentProgressMs: number;
  isLoading: boolean;
  refreshPlaybackState: () => Promise<void>;
  togglePlay: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  toggleShuffle: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, signOut } = useAuth();
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [currentProgressMs, setCurrentProgressMs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPlaybackState = useCallback(async () => {
    if (!isAuthenticated) {
      setPlaybackState(null);
      setCurrentProgressMs(0);
      return;
    }

    try {
      const data = await api.getCurrentlyPlaying();
      
      if (!data || data.item === undefined) {
        setPlaybackState(null);
        setCurrentProgressMs(0);
        return;
      }

      // Map Spotify's snake_case to our camelCase interface
      const mappedState: PlaybackState = {
        isPlaying: data.is_playing,
        item: data.item,
        progress_ms: data.progress_ms,
        duration_ms: data.item?.duration_ms || 0,
        shuffle_state: data.shuffle_state,
        repeat_state: data.repeat_state,
      };

      setPlaybackState(mappedState);
      setCurrentProgressMs(mappedState.progress_ms);
    } catch (error: any) {
      console.error("Failed to fetch playback state:", error);

      if (error?.message === "Session expired") {
        await signOut();
      }
      
      setPlaybackState(null);
      setCurrentProgressMs(0);
    }
  }, [isAuthenticated, signOut]);

  // Predictive progress update every 100ms for smoothness
  useEffect(() => {
    if (!playbackState?.isPlaying) return;

    const interval = setInterval(() => {
      setCurrentProgressMs((prev) => {
        const next = prev + 1000;
        const duration = playbackState?.duration_ms || Infinity;
        return next > duration ? prev : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playbackState?.isPlaying, playbackState?.duration_ms, playbackState?.item?.name]);

  const togglePlay = useCallback(async () => {
    if (!playbackState) return;
    
    try {
      if (playbackState.isPlaying) {
        await api.pause();
      } else {
        await api.play();
      }
      // Optimistically update or just refresh
      await fetchPlaybackState();
    } catch (error) {
      console.error("Toggle play failed", error);
    }
  }, [playbackState, fetchPlaybackState]);

  const skipNext = useCallback(async () => {
    try {
      await api.next();
      await fetchPlaybackState();
    } catch (error) {
      console.error("Skip next failed", error);
    }
  }, [fetchPlaybackState]);

  const skipPrevious = useCallback(async () => {
    try {
      await api.previous();
      await fetchPlaybackState();
    } catch (error) {
      console.error("Skip previous failed", error);
    }
  }, [fetchPlaybackState]);

  const toggleShuffle = useCallback(async () => {
    if (!playbackState) return;
    try {
      await api.setShuffle(!playbackState.shuffle_state);
      await fetchPlaybackState();
    } catch (error) {
      console.error("Toggle shuffle failed", error);
    }
  }, [playbackState, fetchPlaybackState]);

  const toggleRepeat = useCallback(async () => {
    if (!playbackState) return;
    try {
      const modes: ('track' | 'context' | 'off')[] = ['off', 'context', 'track'];
      const currentIndex = modes.indexOf(playbackState.repeat_state as any);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      await api.setRepeat(nextMode);
      await fetchPlaybackState();
    } catch (error) {
      console.error("Toggle repeat failed", error);
    }
  }, [playbackState, fetchPlaybackState]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch immediately
      setIsLoading(true);
      fetchPlaybackState().finally(() => setIsLoading(false));

      // Poll for updates every 5 seconds
      const interval = setInterval(fetchPlaybackState, 5000);
      return () => clearInterval(interval);
    } else {
      setPlaybackState(null);
    }
  }, [isAuthenticated, fetchPlaybackState]);

  return (
    <PlaybackContext.Provider
      value={{
        playbackState,
        currentProgressMs,
        isLoading,
        refreshPlaybackState: fetchPlaybackState,
        togglePlay,
        skipNext,
        skipPrevious,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (context === undefined) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }

  return context;
}
