import { API_URL } from '@/constants/auth';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PlaylistItem from '@/components/playlist-item';
import SongItem from '@/components/song-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TabType = 'history' | 'playlists' | 'liked';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const JWT = useAuth().jwtToken;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [profileData, setProfileData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [playlistsData, setPlaylistsData] = useState(null);
  const [likedSongsData, setLikedSongsData] = useState(null);
  const [loading , setLoading] = useState(false);

  const colors = Colors[isDark ? 'dark' : 'light'];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      );
    }

    switch (activeTab) {
      case 'history':
        return (
          <View style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Recently Played</ThemedText>
            {historyData?.items?.map((item, index) => (
              <SongItem
                key={`${item.track.id}-${index}`}
                id={item.track.id}
                title={item.track.name}
                artist={item.track.artists.map(artist => artist.name).join(', ')}
                cover={item.track.album.images[0]?.url || ''}
                link={item.track.external_urls.spotify}
              />
            ))}
          </View>
        );
      case 'playlists':
        return (
          <View style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Your Playlists</ThemedText>
            {playlistsData?.items
              ?.filter((playlist) => playlist.owner.id === profileData?.id)
              .map((playlist) => (
                <PlaylistItem
                  key={playlist.id}
                  id={playlist.id}
                  name={playlist.name}
                  songCount={playlist.tracks.total}
                  cover={playlist.images[0]?.url || ''}
                  link={`/playlist/${playlist.id}`}
                />
              ))}
          </View>
        );
      case 'liked':
        return (
          <View style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Liked Songs</ThemedText>
            {likedSongsData?.items?.map((item, index) => (
              <SongItem
                key={`${item.track.id}-${index}`}
                id={item.track.id}
                title={item.track.name}
                artist={item.track.artists.map(artist => artist.name).join(', ')}
                cover={item.track.album.images[0]?.url || ''}
                link={item.track.external_urls.spotify}
              />
            ))}
          </View>
        );
    }
  };

  // Fetch profile data only when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchProfileData = async () => {
        if (!JWT) return;
        
        try {
          const response = await fetch(`${API_URL}/api/profile`, {
            headers: {
              Authorization: `Bearer ${JWT}`,
            },
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Profile fetch error:', response.status, errorText);
            return;
          }
          
          const data = await response.json();
          console.log('Profile data:', data);
          setProfileData(data);
        } catch (error) {
          console.error('Failed to fetch profile:', error);
        }
      };
      
      fetchProfileData();
    }, [JWT])
  );

  const fetchHistory = async () => {
    if (!JWT) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/spotify/recently-played`, {
        headers: {
          Authorization: `Bearer ${JWT}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('History fetch error:', response.status, errorText);
        return;
      }

      const data = await response.json();
      setHistoryData(data);
    } catch (error) {
      console.error('Failed to fetch listening history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    if (!JWT) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/spotify/playlists`, {
        headers: {
          Authorization: `Bearer ${JWT}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Playlists fetch error:', response.status, errorText);
        return;
      }

      const data = await response.json();
      console.log('Playlists data:', data);
      setPlaylistsData(data);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLikedSongs = async () => {
    if (!JWT) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/spotify/liked-songs`, {
        headers: {
          Authorization: `Bearer ${JWT}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Liked songs fetch error:', response.status, errorText);
        return;
      }

      const data = await response.json();
      console.log('Liked songs data:', data);
      setLikedSongsData(data);
    } catch (error) {
      console.error('Failed to fetch liked songs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switch(activeTab) {
      case 'history':
        fetchHistory();
        break;
      case 'playlists':
        fetchPlaylists();
        break;
      case 'liked':
        fetchLikedSongs();
        break;
    }
  }, [activeTab, JWT]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          {/* Settings Button */}
          <View style={styles.headerActions}>
            <View style={styles.spacer} />
            <Pressable style={styles.settingsButton}>
              <MaterialIcons name="settings" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Profile Picture */}
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileData ? profileData.images[0].url : '' }}
              style={styles.profileImage}
            />
          </View>

          {/* Name & Username */}
          <ThemedText style={styles.profileName} lightColor="#fff" darkColor="#fff">
            {profileData ? profileData.display_name : 'Unknown'}
          </ThemedText>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <Pressable style={styles.statItem}>
              <ThemedText style={styles.statNumber} lightColor="#fff" darkColor="#fff">
                {formatNumber(0)}
              </ThemedText>
              <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
                Followers
              </ThemedText>
            </Pressable>
            <Pressable style={styles.statItem}>
              <ThemedText style={styles.statNumber} lightColor="#fff" darkColor="#fff">
                {formatNumber(0)}
              </ThemedText>
              <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
                Following
              </ThemedText>
            </Pressable>
            <Pressable style={styles.statItem}>
              <ThemedText style={styles.statNumber} lightColor="#fff" darkColor="#fff">
                {formatNumber(0)}
              </ThemedText>
              <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
                Unique Songs
              </ThemedText>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
          <Pressable
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'history' && styles.activeTabText,
              ]}
            >
              History
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
            onPress={() => setActiveTab('playlists')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'playlists' && styles.activeTabText,
              ]}
            >
              Playlists
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
            onPress={() => setActiveTab('liked')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'liked' && styles.activeTabText,
              ]}
            >
              Liked
            </ThemedText>
          </Pressable>
        </View>

        {/* Content Section */}
        <ThemedView style={styles.contentContainer}>
          {renderContent()}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  spacer: {
    width: 40,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
    marginBottom: 4,
    color: "black",
  },
  username: {
    fontSize: 14,
    marginBottom: 20,
    color: "black"
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
    color: "black"
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    color: "black"
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1DB954',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1DB954',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    minHeight: 400,
  },
  contentSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
